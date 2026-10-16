import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { differenceClass, formatCents, formatDate, formatSignedCents } from '../lib/format';
import { explainResult } from '../lib/reconcile';
import type { FinancialRecord, ReconciliationResult } from '../lib/types';
import { StatusBadge } from './StatusBadge';

interface DetailsModalProps {
  result: ReconciliationResult;
  systemFileName: string;
  paymentFileName: string;
  onClose: () => void;
}

function RecordsTable({ title, fileName, records }: { title: string; fileName: string; records: FinancialRecord[] }) {
  return (
    <section className="details-source">
      <h3 className="subheading">
        {title} <span className="muted small">({records.length} registro(s))</span>
      </h3>
      {records.length === 0 ? (
        <p className="muted small">Nenhum registro com este ID em {fileName}.</p>
      ) : (
        <div className="table-wrapper">
          <table className="records-table">
            <caption className="sr-only">
              {title} — {fileName}
            </caption>
            <thead>
              <tr>
                <th scope="col">Linha</th>
                <th scope="col">Descrição</th>
                <th scope="col">Data</th>
                <th scope="col" className="num">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.line}>
                  <td className="num">{record.line}</td>
                  <td className="desc">{record.description}</td>
                  <td className="nowrap">{formatDate(record.date)}</td>
                  <td className="num">{formatCents(record.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function DetailsModal({ result, systemFileName, paymentFileName, onClose }: DetailsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="details-title"
      aria-describedby="details-explanation"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <p className="muted small">Detalhes do ID</p>
            <h2 id="details-title" className="mono">
              {result.id}
            </h2>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} autoFocus>
            <X size={20} aria-hidden="true" />
            <span className="sr-only">Fechar detalhes</span>
          </button>
        </header>

        <div className="details-status">
          <StatusBadge status={result.status} />
          <p id="details-explanation">{explainResult(result)}</p>
        </div>

        <dl className="details-totals">
          <div>
            <dt>Total no sistema</dt>
            <dd className="num">{formatCents(result.systemTotalCents)}</dd>
          </div>
          <div>
            <dt>Total pago</dt>
            <dd className="num">{formatCents(result.paymentTotalCents)}</dd>
          </div>
          <div>
            <dt>Diferença (pago − sistema)</dt>
            <dd className={`num ${differenceClass(result.differenceCents)}`}>
              {formatSignedCents(result.differenceCents)}
            </dd>
          </div>
        </dl>

        <RecordsTable title="Transações do sistema" fileName={systemFileName} records={result.systemRecords} />
        <RecordsTable title="Pagamentos recebidos" fileName={paymentFileName} records={result.paymentRecords} />
      </div>
    </dialog>
  );
}
