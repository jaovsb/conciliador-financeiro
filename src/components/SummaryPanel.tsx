import { differenceClass, formatCents, formatSignedCents } from '../lib/format';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/reconcile';
import type { ReconciliationSummary } from '../lib/types';
import { StatusBadge } from './StatusBadge';

export function SummaryPanel({ summary }: { summary: ReconciliationSummary }) {
  return (
    <section className="card" aria-labelledby="summary-title">
      <div className="section-header">
        <h2 id="summary-title">Resumo da conciliação</h2>
        <p className="muted small">Representa a conciliação completa; não é afetado pela busca nem pelo filtro.</p>
      </div>

      <dl className="totals">
        <div className="total">
          <dt>Valor registrado no sistema</dt>
          <dd className="num">{formatCents(summary.systemTotalCents)}</dd>
        </div>
        <div className="total">
          <dt>Valor recebido</dt>
          <dd className="num">{formatCents(summary.paymentTotalCents)}</dd>
        </div>
        <div className="total">
          <dt>Diferença líquida (recebido − registrado)</dt>
          <dd className={`num ${differenceClass(summary.netDifferenceCents)}`}>
            {formatSignedCents(summary.netDifferenceCents)}
          </dd>
        </div>
      </dl>
      <p className="help small">
        Os totais somam <strong>todas as linhas importadas</strong> de cada arquivo, inclusive as de IDs
        duplicados. Por isso a diferença líquida é igual à soma das diferenças de todos os IDs.
      </p>

      <h3 className="subheading">Quantidade por classificação</h3>
      <ul className="counts">
        {STATUS_ORDER.map((status) => (
          <li key={status} className="count">
            <StatusBadge status={status} />
            <span className="num count__value" aria-label={`${summary.counts[status]} ${STATUS_LABELS[status]}`}>
              {summary.counts[status]}
            </span>
          </li>
        ))}
        <li className="count count--total">
          <span>IDs únicos</span>
          <span className="num count__value">{summary.uniqueIds}</span>
        </li>
      </ul>
    </section>
  );
}
