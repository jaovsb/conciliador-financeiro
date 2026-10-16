import type {
  FinancialRecord,
  Reconciliation,
  ReconciliationResult,
  ReconciliationStatus,
} from './types';

export const STATUS_ORDER: ReconciliationStatus[] = [
  'matched',
  'divergent',
  'missing_payment',
  'missing_transaction',
  'duplicate',
];

export const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  matched: 'Conciliado',
  divergent: 'Divergente',
  missing_payment: 'Sem pagamento',
  missing_transaction: 'Sem transação',
  duplicate: 'Duplicado',
};

export function groupById(records: FinancialRecord[]): Map<string, FinancialRecord[]> {
  const groups = new Map<string, FinancialRecord[]>();
  for (const record of records) {
    const group = groups.get(record.id);
    if (group) group.push(record);
    else groups.set(record.id, [record]);
  }
  return groups;
}

function sumCents(records: FinancialRecord[]): number {
  return records.reduce((total, record) => total + record.amountCents, 0);
}

export function classify(
  systemRecords: FinancialRecord[],
  paymentRecords: FinancialRecord[],
): ReconciliationStatus {
  if (systemRecords.length > 1 || paymentRecords.length > 1) return 'duplicate';
  if (systemRecords.length === 1 && paymentRecords.length === 0) return 'missing_payment';
  if (systemRecords.length === 0 && paymentRecords.length === 1) return 'missing_transaction';
  return systemRecords[0].amountCents === paymentRecords[0].amountCents ? 'matched' : 'divergent';
}

export function reconcile(
  systemRecords: FinancialRecord[],
  paymentRecords: FinancialRecord[],
): Reconciliation {
  const systemById = groupById(systemRecords);
  const paymentsById = groupById(paymentRecords);
  const allIds = new Set([...systemById.keys(), ...paymentsById.keys()]);

  const counts: Record<ReconciliationStatus, number> = {
    matched: 0,
    divergent: 0,
    missing_payment: 0,
    missing_transaction: 0,
    duplicate: 0,
  };

  const results: ReconciliationResult[] = [];
  for (const id of allIds) {
    const systemGroup = systemById.get(id) ?? [];
    const paymentGroup = paymentsById.get(id) ?? [];
    const status = classify(systemGroup, paymentGroup);
    const systemTotalCents = sumCents(systemGroup);
    const paymentTotalCents = sumCents(paymentGroup);
    counts[status]++;
    results.push({
      id,
      status,
      systemRecords: systemGroup,
      paymentRecords: paymentGroup,
      systemTotalCents,
      paymentTotalCents,
      differenceCents: paymentTotalCents - systemTotalCents,
    });
  }

  const systemTotalCents = sumCents(systemRecords);
  const paymentTotalCents = sumCents(paymentRecords);
  return {
    results,
    summary: {
      systemTotalCents,
      paymentTotalCents,
      netDifferenceCents: paymentTotalCents - systemTotalCents,
      counts,
      uniqueIds: allIds.size,
    },
  };
}

export function filterResults(
  results: ReconciliationResult[],
  query: string,
  status: ReconciliationStatus | 'all',
): ReconciliationResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  return results.filter((result) => {
    if (status !== 'all' && result.status !== status) return false;
    if (normalizedQuery === '') return true;
    if (result.id.toLocaleLowerCase('pt-BR').includes(normalizedQuery)) return true;
    return [...result.systemRecords, ...result.paymentRecords].some((record) =>
      record.description.toLocaleLowerCase('pt-BR').includes(normalizedQuery),
    );
  });
}

export function explainResult(result: ReconciliationResult): string {
  const systemCount = result.systemRecords.length;
  const paymentCount = result.paymentRecords.length;
  switch (result.status) {
    case 'matched':
      return 'Há exatamente um registro no sistema e um pagamento com este ID, e os valores são iguais.';
    case 'divergent':
      return 'Há exatamente um registro no sistema e um pagamento com este ID, mas os valores são diferentes. A diferença é o valor pago menos o valor registrado.';
    case 'missing_payment':
      return 'O ID existe no sistema, mas não há nenhum pagamento com este ID.';
    case 'missing_transaction':
      return 'Há um pagamento com este ID, mas nenhum registro correspondente no sistema.';
    case 'duplicate':
      return `O ID aparece ${systemCount} vez(es) no sistema e ${paymentCount} vez(es) nos pagamentos. Como há mais de um registro em pelo menos uma fonte, nenhum registro é escolhido automaticamente: todos são exibidos para análise manual. A diferença considera a soma de todos os registros.`;
  }
}
