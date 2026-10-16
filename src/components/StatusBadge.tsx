import { AlertTriangle, CheckCircle2, CircleSlash, Copy, XCircle } from 'lucide-react';
import { STATUS_LABELS } from '../lib/reconcile';
import type { ReconciliationStatus } from '../lib/types';

const ICONS = {
  matched: CheckCircle2,
  divergent: AlertTriangle,
  missing_payment: XCircle,
  missing_transaction: CircleSlash,
  duplicate: Copy,
} satisfies Record<ReconciliationStatus, unknown>;

export function StatusBadge({ status }: { status: ReconciliationStatus }) {
  const Icon = ICONS[status];
  return (
    <span className={`badge badge--${status}`}>
      <Icon size={14} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
