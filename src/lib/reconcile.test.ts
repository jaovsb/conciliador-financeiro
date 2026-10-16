import { describe, expect, it } from 'vitest';
import { filterResults, reconcile } from './reconcile';
import { parseRecordsCsv } from './csv';
import type { FinancialRecord } from './types';
import systemCsv from '../../public/exemplos/transacoes-sistema.csv?raw';
import paymentsCsv from '../../public/exemplos/pagamentos-recebidos.csv?raw';

let line = 2;
function rec(id: string, amountCents: number, description = `Desc ${id}`): FinancialRecord {
  return { id, description, date: '2026-10-15', amountCents, line: line++ };
}

function byId(system: FinancialRecord[], payments: FinancialRecord[]) {
  const { results } = reconcile(system, payments);
  return new Map(results.map((r) => [r.id, r]));
}

describe('reconcile - classificações', () => {
  it('classifica os cinco casos', () => {
    const results = byId(
      [rec('A', 1000), rec('B', 1000), rec('C', 500), rec('E', 100), rec('E', 100)],
      [rec('A', 1000), rec('B', 1200), rec('D', 300), rec('E', 100)],
    );
    expect(results.get('A')?.status).toBe('matched');
    expect(results.get('B')?.status).toBe('divergent');
    expect(results.get('C')?.status).toBe('missing_payment');
    expect(results.get('D')?.status).toBe('missing_transaction');
    expect(results.get('E')?.status).toBe('duplicate');
  });

  it('calcula a diferença como pagamentos menos sistema', () => {
    const results = byId([rec('B', 1000), rec('C', 500)], [rec('B', 1200), rec('D', 300)]);
    expect(results.get('B')?.differenceCents).toBe(200);
    expect(results.get('C')?.differenceCents).toBe(-500);
    expect(results.get('D')?.differenceCents).toBe(300);
  });

  it('compara IDs de forma sensível a maiúsculas/minúsculas', () => {
    const results = byId([rec('tx1', 100)], [rec('TX1', 100)]);
    expect(results.get('tx1')?.status).toBe('missing_payment');
    expect(results.get('TX1')?.status).toBe('missing_transaction');
  });
});

describe('reconcile - duplicidade', () => {
  it('tem prioridade mesmo quando a soma ou um dos valores coincidiria', () => {
    const results = byId(
      [rec('S', 100), rec('S', 100), rec('P', 200), rec('X', 50), rec('X', 50)],
      [rec('S', 100), rec('P', 100), rec('P', 100)],
    );
    expect(results.get('S')?.status).toBe('duplicate');
    expect(results.get('P')?.status).toBe('duplicate');
    expect(results.get('X')?.status).toBe('duplicate');
  });

  it('preserva todos os registros duplicados de ambas as fontes', () => {
    const s1 = rec('D', 100, 'primeiro');
    const s2 = rec('D', 100, 'segundo');
    const s3 = rec('D', 300, 'terceiro');
    const p1 = rec('D', 150);
    const p2 = rec('D', 150);
    const result = byId([s1, s2, s3], [p1, p2]).get('D');
    expect(result?.systemRecords).toEqual([s1, s2, s3]);
    expect(result?.paymentRecords).toEqual([p1, p2]);
    expect(result?.systemTotalCents).toBe(500);
    expect(result?.paymentTotalCents).toBe(300);
    expect(result?.differenceCents).toBe(-200);
  });
});

describe('reconcile - totais', () => {
  it('soma todas as linhas, inclusive duplicadas, e calcula a diferença líquida', () => {
    const { summary } = reconcile(
      [rec('A', 1000), rec('A', 1000), rec('B', 250)],
      [rec('A', 1000), rec('C', 99)],
    );
    expect(summary.systemTotalCents).toBe(2250);
    expect(summary.paymentTotalCents).toBe(1099);
    expect(summary.netDifferenceCents).toBe(-1151);
    expect(summary.uniqueIds).toBe(3);
    const countSum = Object.values(summary.counts).reduce((a, b) => a + b, 0);
    expect(countSum).toBe(summary.uniqueIds);
  });
});

describe('filterResults', () => {
  const { results } = reconcile(
    [rec('TX1', 100, 'Mensalidade'), rec('TX2', 100, 'Consultoria')],
    [rec('TX1', 100, 'Pagamento'), rec('TX3', 50, 'Depósito avulso')],
  );

  it('busca por ID ou descrição de qualquer fonte, sem diferenciar maiúsculas', () => {
    expect(filterResults(results, 'tx2', 'all').map((r) => r.id)).toEqual(['TX2']);
    expect(filterResults(results, 'pagamento', 'all').map((r) => r.id)).toEqual(['TX1']);
    expect(filterResults(results, 'DEPÓSITO', 'all').map((r) => r.id)).toEqual(['TX3']);
  });

  it('combina busca e classificação', () => {
    expect(filterResults(results, '', 'matched').map((r) => r.id)).toEqual(['TX1']);
    expect(filterResults(results, 'consultoria', 'matched')).toEqual([]);
  });
});

describe('dados de exemplo', () => {
  const system = parseRecordsCsv(systemCsv, 'transacoes-sistema.csv');
  const payments = parseRecordsCsv(paymentsCsv, 'pagamentos-recebidos.csv');

  it('são válidos', () => {
    expect(system.ok).toBe(true);
    expect(payments.ok).toBe(true);
  });

  it('produzem as classificações e totais esperados', () => {
    if (!system.ok || !payments.ok) throw new Error('exemplo inválido');
    expect(system.records).toHaveLength(12);
    expect(payments.records).toHaveLength(12);

    const { results, summary } = reconcile(system.records, payments.records);
    const statusById = Object.fromEntries(results.map((r) => [r.id, r.status]));
    expect(statusById).toEqual({
      TX001: 'matched',
      TX002: 'matched',
      TX003: 'matched',
      TX004: 'matched',
      TX005: 'divergent',
      TX006: 'divergent',
      TX007: 'missing_payment',
      TX008: 'missing_payment',
      TX009: 'duplicate',
      TX010: 'duplicate',
      TX011: 'missing_transaction',
      TX012: 'missing_transaction',
      TX013: 'matched',
    });

    const differenceById = Object.fromEntries(results.map((r) => [r.id, r.differenceCents]));
    expect(differenceById).toMatchObject({
      TX005: -5000,
      TX006: 2000,
      TX007: -32000,
      TX008: -96000,
      TX009: -5990,
      TX010: 0,
      TX011: 25000,
      TX012: 7525,
    });

    expect(summary).toEqual({
      systemTotalCents: 577020,
      paymentTotalCents: 472555,
      netDifferenceCents: -104465,
      uniqueIds: 13,
      counts: {
        matched: 5,
        divergent: 2,
        missing_payment: 2,
        missing_transaction: 2,
        duplicate: 2,
      },
    });

    const tx010 = results.find((r) => r.id === 'TX010');
    expect(tx010?.systemRecords[0].description).toBe('Serviço de design; identidade visual');
    expect(tx010?.paymentRecords).toHaveLength(2);
  });
});
