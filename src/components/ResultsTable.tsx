import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import { differenceClass, formatCents, formatSignedCents } from '../lib/format';
import { STATUS_LABELS, STATUS_ORDER, filterResults } from '../lib/reconcile';
import type { FinancialRecord, ReconciliationResult, ReconciliationStatus } from '../lib/types';
import { StatusBadge } from './StatusBadge';

const PAGE_SIZE = 20;

interface ResultsTableProps {
  results: ReconciliationResult[];
  query: string;
  statusFilter: ReconciliationStatus | 'all';
  page: number;
  onQueryChange: (query: string) => void;
  onStatusFilterChange: (status: ReconciliationStatus | 'all') => void;
  onPageChange: (page: number) => void;
  onOpenDetails: (result: ReconciliationResult, opener: HTMLElement) => void;
}

function AmountCell({ records, totalCents }: { records: FinancialRecord[]; totalCents: number }) {
  if (records.length === 0) {
    return (
      <td className="num muted">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sem registro</span>
      </td>
    );
  }
  return (
    <td className="num">
      {formatCents(totalCents)}
      {records.length > 1 && <span className="cell-note">soma de {records.length} registros</span>}
    </td>
  );
}

export function ResultsTable({
  results,
  query,
  statusFilter,
  page,
  onQueryChange,
  onStatusFilterChange,
  onPageChange,
  onOpenDetails,
}: ResultsTableProps) {
  const filtered = useMemo(() => filterResults(results, query, statusFilter), [results, query, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isFiltered = query.trim() !== '' || statusFilter !== 'all';

  return (
    <section className="card" aria-labelledby="results-title">
      <div className="section-header">
        <h2 id="results-title">Resultados por ID</h2>
        <p className="muted small">A busca e o filtro afetam apenas esta tabela e a contagem abaixo.</p>
      </div>

      <div className="filters">
        <div className="field field--grow">
          <label htmlFor="search">Buscar por ID ou descrição</label>
          <div className="input-icon">
            <Search size={16} aria-hidden="true" />
            <input
              id="search"
              type="search"
              value={query}
              placeholder="Ex.: TX005 ou mensalidade"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="status-filter">Classificação</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as ReconciliationStatus | 'all')}
          >
            <option value="all">Todas</option>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count" role="status" aria-live="polite">
        {isFiltered
          ? `${filtered.length} de ${results.length} resultado(s) correspondem aos filtros.`
          : `${results.length} resultado(s).`}
      </p>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>
            <strong>Nenhum resultado encontrado.</strong>
          </p>
          <p className="muted small">Revise o termo buscado ou selecione outra classificação.</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              onQueryChange('');
              onStatusFilterChange('all');
            }}
          >
            Limpar busca e filtro
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrapper" tabIndex={0} role="region" aria-label="Tabela de resultados (rolável)">
            <table className="results-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Descrição</th>
                  <th scope="col" className="num">
                    Sistema
                  </th>
                  <th scope="col" className="num">
                    Pagamentos
                  </th>
                  <th scope="col" className="num">
                    Diferença
                  </th>
                  <th scope="col">Classificação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((result) => {
                  const allRecords = [...result.systemRecords, ...result.paymentRecords];
                  const mainDescription = allRecords[0].description;
                  return (
                    <tr key={result.id}>
                      <th scope="row" className="mono">
                        {result.id}
                      </th>
                      <td className="desc">
                        {mainDescription}
                        {allRecords.length > 2 && (
                          <span className="cell-note">{allRecords.length} registros no total</span>
                        )}
                      </td>
                      <AmountCell records={result.systemRecords} totalCents={result.systemTotalCents} />
                      <AmountCell records={result.paymentRecords} totalCents={result.paymentTotalCents} />
                      <td className={`num ${differenceClass(result.differenceCents)}`}>
                        {formatSignedCents(result.differenceCents)}
                      </td>
                      <td>
                        <StatusBadge status={result.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={(event) => onOpenDetails(result, event.currentTarget)}
                        >
                          <Eye size={16} aria-hidden="true" />
                          Detalhes<span className="sr-only"> do ID {result.id}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav className="pagination" aria-label="Paginação dos resultados">
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Anterior
            </button>
            <span className="small">
              Página {currentPage} de {pageCount}
            </span>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={currentPage >= pageCount}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Próxima
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
