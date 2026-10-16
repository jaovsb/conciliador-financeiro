import Papa from 'papaparse';
import { isValidIsoDate, parseAmountToCents } from './format';
import type { FinancialRecord, ImportError, ParseResult } from './types';

export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_RECORDS = 2000;
export const EXPECTED_HEADER = ['id', 'descricao', 'data', 'valor'] as const;
const MAX_REPORTED_ERRORS = 50;

function fileError(fileName: string, message: string): ParseResult {
  return { ok: false, errors: [{ fileName, line: null, message }] };
}

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

export function parseRecordsCsv(text: string, fileName: string): ParseResult {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    return fileError(fileName, 'O arquivo excede o limite de 1 MB.');
  }

  const content = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const errors: ImportError[] = [];
  const records: FinancialRecord[] = [];
  const addError = (line: number | null, message: string) => {
    errors.push({ fileName, line, message });
  };

  let headerChecked = false;
  let previousCursor = 0;
  let currentLine = 1;
  let fileTotalCents = 0n;

  Papa.parse<string[]>(content, {
    delimiter: ';',
    header: false,
    skipEmptyLines: false,
    step: (step) => {
      const rowStart = previousCursor;
      const line = currentLine + countLeadingNewlines(content, rowStart);
      const segment = content.slice(previousCursor, step.meta.cursor);
      currentLine += countNewlines(segment);
      previousCursor = step.meta.cursor;

      const row = step.data;
      if (isEmptyRow(row)) return;

      for (const parseError of step.errors) {
        addError(line, `Erro de leitura do CSV: ${parseError.message}.`);
      }
      if (step.errors.length > 0) return;

      if (!headerChecked) {
        headerChecked = true;
        const header = row.map((cell) => cell.trim());
        const valid =
          header.length === EXPECTED_HEADER.length &&
          EXPECTED_HEADER.every((name, index) => header[index] === name);
        if (!valid) {
          addError(
            line,
            `Cabeçalho inválido. Esperado "${EXPECTED_HEADER.join(';')}", encontrado "${row.join(';')}".`,
          );
        }
        return;
      }

      if (row.length !== EXPECTED_HEADER.length) {
        addError(line, `Esperadas 4 colunas, encontradas ${row.length}.`);
        return;
      }

      const [rawId, rawDescription, rawDate, rawAmount] = row.map((cell) => cell.trim());
      let rowValid = true;
      if (rawId === '') {
        addError(line, 'ID obrigatório.');
        rowValid = false;
      }
      if (rawDescription === '') {
        addError(line, 'Descrição obrigatória.');
        rowValid = false;
      }
      if (!isValidIsoDate(rawDate)) {
        addError(line, `Data inválida "${rawDate}". Use o formato AAAA-MM-DD com uma data existente.`);
        rowValid = false;
      }
      const amountCents = parseAmountToCents(rawAmount);
      if (amountCents === null) {
        addError(
          line,
          `Valor inválido "${rawAmount}". Use número não negativo, sem separador de milhar, com vírgula e duas casas decimais (ex.: 1500,00).`,
        );
        rowValid = false;
      }
      if (!rowValid || amountCents === null) return;

      fileTotalCents += BigInt(amountCents);
      records.push({
        id: rawId,
        description: rawDescription,
        date: rawDate,
        amountCents,
        line,
      });
    },
  });

  if (!headerChecked) {
    return fileError(fileName, 'O arquivo está vazio ou não possui cabeçalho.');
  }
  if (records.length + countRowErrors(errors) > MAX_RECORDS) {
    addError(null, `O arquivo excede o limite de ${MAX_RECORDS} registros.`);
  }
  if (fileTotalCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    addError(null, 'A soma dos valores do arquivo excede o limite numérico suportado.');
  }
  if (errors.length === 0 && records.length === 0) {
    return fileError(fileName, 'O arquivo não contém registros além do cabeçalho.');
  }

  if (errors.length > 0) {
    const reported = errors.slice(0, MAX_REPORTED_ERRORS);
    if (errors.length > MAX_REPORTED_ERRORS) {
      reported.push({
        fileName,
        line: null,
        message: `Mais ${errors.length - MAX_REPORTED_ERRORS} erro(s) não exibido(s).`,
      });
    }
    return { ok: false, errors: reported };
  }
  return { ok: true, records };
}

function countNewlines(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') count++;
  }
  return count;
}

function countLeadingNewlines(text: string, from: number): number {
  let count = 0;
  for (let i = from; i < text.length && (text[i] === '\n' || text[i] === '\r'); i++) {
    if (text[i] === '\n') count++;
  }
  return count;
}

function countRowErrors(errors: ImportError[]): number {
  return new Set(errors.filter((e) => e.line !== null).map((e) => e.line)).size;
}

export async function readCsvFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_BYTES) {
    return fileError(file.name, 'O arquivo excede o limite de 1 MB.');
  }
  try {
    const text = await file.text();
    return parseRecordsCsv(text, file.name);
  } catch {
    return fileError(file.name, 'Não foi possível ler o arquivo.');
  }
}

export async function fetchSampleCsv(url: string, fileName: string): Promise<ParseResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return fileError(fileName, `Não foi possível carregar o exemplo (HTTP ${response.status}).`);
    }
    return parseRecordsCsv(await response.text(), fileName);
  } catch {
    return fileError(fileName, 'Não foi possível carregar o arquivo de exemplo.');
  }
}
