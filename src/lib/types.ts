export type Source = 'system' | 'payments';

export interface FinancialRecord {
  id: string;
  description: string;
  date: string;
  amountCents: number;
  line: number;
}

export interface ImportError {
  fileName: string;
  line: number | null;
  message: string;
}

export type ParseResult =
  | { ok: true; records: FinancialRecord[] }
  | { ok: false; errors: ImportError[] };

export interface ImportedFile {
  fileName: string;
  records: FinancialRecord[];
}

export type ReconciliationStatus =
  | 'matched'
  | 'divergent'
  | 'missing_payment'
  | 'missing_transaction'
  | 'duplicate';

export interface ReconciliationResult {
  id: string;
  status: ReconciliationStatus;
  systemRecords: FinancialRecord[];
  paymentRecords: FinancialRecord[];
  systemTotalCents: number;
  paymentTotalCents: number;
  differenceCents: number;
}

export interface ReconciliationSummary {
  systemTotalCents: number;
  paymentTotalCents: number;
  netDifferenceCents: number;
  counts: Record<ReconciliationStatus, number>;
  uniqueIds: number;
}

export interface Reconciliation {
  results: ReconciliationResult[];
  summary: ReconciliationSummary;
}
