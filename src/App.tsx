import { useEffect, useRef, useState } from 'react';
import { Download, FlaskConical, GitCompareArrows, Loader2, RotateCcw } from 'lucide-react';
import { DetailsModal } from './components/DetailsModal';
import { FileImport } from './components/FileImport';
import { ResultsTable } from './components/ResultsTable';
import { SummaryPanel } from './components/SummaryPanel';
import { fetchSampleCsv, readCsvFile } from './lib/csv';
import { STATUS_LABELS, reconcile } from './lib/reconcile';
import type {
  ImportError,
  ImportedFile,
  Reconciliation,
  ReconciliationResult,
  ReconciliationStatus,
  Source,
} from './lib/types';

const SAMPLE_FILES = {
  system: { url: `${import.meta.env.BASE_URL}exemplos/transacoes-sistema.csv`, name: 'transacoes-sistema.csv' },
  payments: { url: `${import.meta.env.BASE_URL}exemplos/pagamentos-recebidos.csv`, name: 'pagamentos-recebidos.csv' },
};

type BusyAction = Source | 'sample' | null;

interface ReconciliationState extends Reconciliation {
  systemFileName: string;
  paymentFileName: string;
}

export default function App() {
  const [systemFile, setSystemFile] = useState<ImportedFile | null>(null);
  const [paymentFile, setPaymentFile] = useState<ImportedFile | null>(null);
  const [systemErrors, setSystemErrors] = useState<ImportError[]>([]);
  const [paymentErrors, setPaymentErrors] = useState<ImportError[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationState | null>(null);
  const [needsRerun, setNeedsRerun] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReconciliationResult | null>(null);
  const detailsOpenerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selected && detailsOpenerRef.current) {
      detailsOpenerRef.current.focus();
      detailsOpenerRef.current = null;
    }
  }, [selected]);

  const isBusy = busy !== null;
  const canReconcile = systemFile !== null && paymentFile !== null && !isBusy;

  function resetView() {
    setQuery('');
    setStatusFilter('all');
    setPage(1);
    setSelected(null);
  }

  function runReconciliation(system: ImportedFile, payments: ImportedFile) {
    setReconciliation({
      ...reconcile(system.records, payments.records),
      systemFileName: system.fileName,
      paymentFileName: payments.fileName,
    });
    setNeedsRerun(false);
    resetView();
  }

  function acceptFile(source: Source, file: ImportedFile) {
    if (source === 'system') {
      setSystemFile(file);
      setSystemErrors([]);
    } else {
      setPaymentFile(file);
      setPaymentErrors([]);
    }
    if (reconciliation) {
      setReconciliation(null);
      setNeedsRerun(true);
      resetView();
    }
  }

  async function handleFileSelect(source: Source, file: File) {
    setBusy(source);
    try {
      const result = await readCsvFile(file);
      if (result.ok) {
        acceptFile(source, { fileName: file.name, records: result.records });
      } else if (source === 'system') {
        setSystemErrors(result.errors);
      } else {
        setPaymentErrors(result.errors);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleLoadSample() {
    setBusy('sample');
    try {
      const [systemResult, paymentResult] = await Promise.all([
        fetchSampleCsv(SAMPLE_FILES.system.url, SAMPLE_FILES.system.name),
        fetchSampleCsv(SAMPLE_FILES.payments.url, SAMPLE_FILES.payments.name),
      ]);
      if (!systemResult.ok || !paymentResult.ok) {
        setSystemErrors(systemResult.ok ? [] : systemResult.errors);
        setPaymentErrors(paymentResult.ok ? [] : paymentResult.errors);
        return;
      }
      const system = { fileName: SAMPLE_FILES.system.name, records: systemResult.records };
      const payments = { fileName: SAMPLE_FILES.payments.name, records: paymentResult.records };
      setSystemFile(system);
      setPaymentFile(payments);
      setSystemErrors([]);
      setPaymentErrors([]);
      runReconciliation(system, payments);
    } finally {
      setBusy(null);
    }
  }

  function handleClear() {
    setSystemFile(null);
    setPaymentFile(null);
    setSystemErrors([]);
    setPaymentErrors([]);
    setReconciliation(null);
    setNeedsRerun(false);
    resetView();
  }

  function statusMessage(): string {
    if (busy === 'sample') return 'Carregando dados de exemplo…';
    if (busy) return 'Lendo e validando o arquivo…';
    if (reconciliation) {
      return `Resultado gerado a partir de "${reconciliation.systemFileName}" e "${reconciliation.paymentFileName}".`;
    }
    if (!systemFile && !paymentFile) return 'Carregue os dois arquivos para habilitar a conciliação.';
    if (!systemFile) return 'Falta carregar o arquivo de transações do sistema.';
    if (!paymentFile) return 'Falta carregar o arquivo de pagamentos recebidos.';
    if (needsRerun) {
      return 'Um arquivo foi substituído e o resultado anterior foi descartado. Clique em “Conciliar arquivos” para gerar um novo resultado.';
    }
    return 'Os dois arquivos são válidos. Clique em “Conciliar arquivos”.';
  }

  const hasAnyData = systemFile || paymentFile || reconciliation || systemErrors.length || paymentErrors.length;

  return (
    <>
      <header className="app-header">
        <div className="container app-header__inner">
          <div>
            <h1>Conciliador Financeiro</h1>
            <p className="app-header__subtitle">
              Simulador que compara transações registradas no sistema com pagamentos recebidos, usando arquivos CSV
              fictícios.
            </p>
          </div>
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={handleLoadSample} disabled={isBusy}>
              {busy === 'sample' ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <FlaskConical size={16} aria-hidden="true" />
              )}
              Carregar exemplo
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleClear}
              disabled={isBusy || !hasAnyData}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Limpar dados
            </button>
          </div>
        </div>
      </header>

      <main className="container main" aria-busy={isBusy}>
        <section aria-labelledby="import-title" className="stack">
          <div className="section-header">
            <h2 id="import-title">1. Arquivos</h2>
            <p className="muted small">
              CSV em UTF-8, separado por ponto e vírgula, com cabeçalho <code>id;descricao;data;valor</code>. Data no
              formato AAAA-MM-DD e valor como <code>1500,00</code>. Limite de 1 MB e 2.000 registros por arquivo.
            </p>
          </div>

          <div className="grid-2">
            <FileImport
              title="Transações do sistema"
              description="Registros lançados no sistema."
              file={systemFile}
              errors={systemErrors}
              disabled={isBusy}
              onSelect={(file) => handleFileSelect('system', file)}
            />
            <FileImport
              title="Pagamentos recebidos"
              description="Pagamentos efetivamente recebidos."
              file={paymentFile}
              errors={paymentErrors}
              disabled={isBusy}
              onSelect={(file) => handleFileSelect('payments', file)}
            />
          </div>

          <p className="downloads small">
            <span className="muted">Baixar CSVs de exemplo:</span>
            <a href={SAMPLE_FILES.system.url} download>
              <Download size={14} aria-hidden="true" />
              {SAMPLE_FILES.system.name}
            </a>
            <a href={SAMPLE_FILES.payments.url} download>
              <Download size={14} aria-hidden="true" />
              {SAMPLE_FILES.payments.name}
            </a>
          </p>
        </section>

        <section aria-labelledby="run-title" className="card run">
          <h2 id="run-title" className="sr-only">
            2. Conciliação
          </h2>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canReconcile}
            onClick={() => systemFile && paymentFile && runReconciliation(systemFile, paymentFile)}
          >
            <GitCompareArrows size={16} aria-hidden="true" />
            Conciliar arquivos
          </button>
          <p
            className={`run__status ${needsRerun && !reconciliation ? 'run__status--warning' : ''}`}
            role="status"
            aria-live="polite"
          >
            {statusMessage()}
          </p>
        </section>

        {reconciliation ? (
          <>
            <SummaryPanel summary={reconciliation.summary} />
            <ResultsTable
              results={reconciliation.results}
              query={query}
              statusFilter={statusFilter}
              page={page}
              onQueryChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              onStatusFilterChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              onPageChange={setPage}
              onOpenDetails={(result, opener) => {
                detailsOpenerRef.current = opener;
                setSelected(result);
              }}
            />
          </>
        ) : (
          <section className="card empty-state empty-state--intro" aria-labelledby="empty-title">
            <h2 id="empty-title">Nenhum resultado para exibir</h2>
            <p className="muted">
              Use “Carregar exemplo” ou importe os dois arquivos e clique em “Conciliar arquivos”. Os registros são
              cruzados pelo ID (diferenciando maiúsculas e minúsculas) e cada ID recebe uma classificação:
            </p>
            <ul className="rules">
              <li>
                <strong>{STATUS_LABELS.matched}:</strong> um registro em cada arquivo, com valores iguais.
              </li>
              <li>
                <strong>{STATUS_LABELS.divergent}:</strong> um registro em cada arquivo, com valores diferentes.
              </li>
              <li>
                <strong>{STATUS_LABELS.missing_payment}:</strong> existe no sistema e não nos pagamentos.
              </li>
              <li>
                <strong>{STATUS_LABELS.missing_transaction}:</strong> existe nos pagamentos e não no sistema.
              </li>
              <li>
                <strong>{STATUS_LABELS.duplicate}:</strong> mais de um registro com o mesmo ID em algum arquivo (tem
                prioridade sobre as demais).
              </li>
            </ul>
          </section>
        )}
      </main>

      <footer className="container footer small muted">
        Os arquivos são processados localmente no navegador e não são enviados a nenhum servidor. Todos os dados de
        exemplo são fictícios.
      </footer>

      {selected && reconciliation && (
        <DetailsModal
          result={selected}
          systemFileName={reconciliation.systemFileName}
          paymentFileName={reconciliation.paymentFileName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
