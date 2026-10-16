import { describe, expect, it } from 'vitest';
import { parseRecordsCsv, MAX_RECORDS } from './csv';
import { formatCents, formatSignedCents, isValidIsoDate, parseAmountToCents } from './format';

const HEADER = 'id;descricao;data;valor';

function errorsOf(text: string) {
  const result = parseRecordsCsv(text, 'teste.csv');
  if (result.ok) throw new Error('Esperava erro de importação');
  return result.errors;
}

describe('parseAmountToCents', () => {
  it('converte texto diretamente para centavos inteiros exatos', () => {
    expect(parseAmountToCents('150,00')).toBe(15000);
    expect(parseAmountToCents('0,10')).toBe(10);
    expect(parseAmountToCents('0,20')).toBe(20);
    expect(parseAmountToCents('89,90')).toBe(8990);
    expect(parseAmountToCents('0,00')).toBe(0);
    expect(parseAmountToCents('1234567,89')).toBe(123456789);
    expect(parseAmountToCents('0,10')! + parseAmountToCents('0,20')!).toBe(30);
  });

  it('aceita o maior inteiro seguro e rejeita valores acima dele', () => {
    expect(parseAmountToCents('90071992547409,91')).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseAmountToCents('90071992547409,92')).toBeNull();
    expect(parseAmountToCents('999999999999999999,00')).toBeNull();
  });

  it.each(['-10,00', '10', '10,0', '10,000', '10.00', '1.000,00', ' 10,00', 'R$ 10,00', '', ',50', '1e3,00'])(
    'rejeita formato inválido "%s"',
    (value) => {
      expect(parseAmountToCents(value)).toBeNull();
    },
  );
});

describe('formatação', () => {
  it('formata centavos em reais sem usar decimais', () => {
    expect(formatCents(0)).toBe('R$ 0,00');
    expect(formatCents(5)).toBe('R$ 0,05');
    expect(formatCents(123456789)).toBe('R$ 1.234.567,89');
    expect(formatCents(-104465)).toBe('-R$ 1.044,65');
    expect(formatSignedCents(2000)).toBe('+R$ 20,00');
    expect(formatSignedCents(-2000)).toBe('-R$ 20,00');
  });
});

describe('isValidIsoDate', () => {
  it('aceita datas existentes', () => {
    expect(isValidIsoDate('2026-10-15')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '15/10/2026', '2026-1-5', '2026-10-15T00:00', ''])(
    'rejeita "%s"',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );
});

describe('parseRecordsCsv', () => {
  it('importa registros válidos, removendo espaços externos do ID', () => {
    const result = parseRecordsCsv(`${HEADER}\n  TX001 ;Mensalidade;2026-10-15;150,00\n`, 'a.csv');
    expect(result).toEqual({
      ok: true,
      records: [{ id: 'TX001', description: 'Mensalidade', date: '2026-10-15', amountCents: 15000, line: 2 }],
    });
  });

  it('aceita BOM, CRLF, linhas vazias e campos entre aspas com ponto e vírgula', () => {
    const text = `\uFEFF${HEADER}\r\n\r\nTX001;"Serviço; design";2026-10-15;10,00\r\n   \r\nTX002;"Texto com ""aspas""";2026-10-16;20,00\r\n`;
    const result = parseRecordsCsv(text, 'a.csv');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records.map((r) => [r.id, r.description, r.line])).toEqual([
      ['TX001', 'Serviço; design', 3],
      ['TX002', 'Texto com "aspas"', 5],
    ]);
  });

  it('informa a linha correta após campo com quebra de linha', () => {
    const text = `${HEADER}\nTX001;"linha 1\nlinha 2";2026-10-15;10,00\nTX002;Ok;2026-99-01;10,00`;
    const errors = errorsOf(text);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(4);
  });

  it('rejeita datas e valores inválidos informando arquivo, linha e motivo', () => {
    const text = `${HEADER}\nTX001;A;2026-02-30;10,00\nTX002;B;2026-10-15;-5,00\nTX003;C;2026-10-15;1.000,00`;
    const errors = errorsOf(text);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(errors.every((e) => e.fileName === 'teste.csv')).toBe(true);
    expect(errors[0].message).toContain('Data inválida');
    expect(errors[1].message).toContain('Valor inválido');
    expect(errors[2].message).toContain('Valor inválido');
  });

  it('não importa parcialmente quando há qualquer linha inválida', () => {
    const result = parseRecordsCsv(`${HEADER}\nTX001;A;2026-10-15;10,00\nTX002;;2026-10-15;10,00`, 'a.csv');
    expect(result.ok).toBe(false);
    expect('records' in result).toBe(false);
  });

  it('exige ID, descrição, cabeçalho e quantidade de colunas corretos', () => {
    expect(errorsOf(`${HEADER}\n ;A;2026-10-15;10,00`)[0].message).toBe('ID obrigatório.');
    expect(errorsOf(`${HEADER}\nTX1;  ;2026-10-15;10,00`)[0].message).toBe('Descrição obrigatória.');
    expect(errorsOf(`id,descricao,data,valor\nTX1,A,2026-10-15,10.00`)[0].message).toContain('Cabeçalho inválido');
    expect(errorsOf(`${HEADER}\nTX1;A;2026-10-15`)[0].message).toContain('Esperadas 4 colunas');
    expect(errorsOf('')[0].message).toContain('vazio');
    expect(errorsOf(HEADER)[0].message).toContain('não contém registros');
  });

  it('limita a quantidade de registros e o tamanho do arquivo', () => {
    const rows = Array.from({ length: MAX_RECORDS + 1 }, (_, i) => `ID${i};A;2026-10-15;1,00`);
    const tooMany = errorsOf(`${HEADER}\n${rows.join('\n')}`);
    expect(tooMany[0].message).toContain('2000 registros');

    const exactly = parseRecordsCsv(`${HEADER}\n${rows.slice(0, MAX_RECORDS).join('\n')}`, 'a.csv');
    expect(exactly.ok).toBe(true);

    const big = `${HEADER}\nTX1;${'x'.repeat(1024 * 1024)};2026-10-15;1,00`;
    expect(errorsOf(big)[0].message).toContain('1 MB');
  });
});
