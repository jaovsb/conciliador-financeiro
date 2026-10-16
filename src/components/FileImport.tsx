import { useId, useRef } from 'react';
import { FileCheck2, FileWarning, Upload } from 'lucide-react';
import type { ImportError, ImportedFile } from '../lib/types';

interface FileImportProps {
  title: string;
  description: string;
  file: ImportedFile | null;
  errors: ImportError[];
  disabled: boolean;
  onSelect: (file: File) => void;
}

export function FileImport({ title, description, file, errors, disabled, onSelect }: FileImportProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusId = `${inputId}-status`;
  const errorsId = `${inputId}-errors`;
  const hasErrors = errors.length > 0;

  const actionText = file ? 'Substituir arquivo' : 'Selecionar CSV';

  return (
    <section className="card file-import" aria-labelledby={`${inputId}-title`}>
      <h3 id={`${inputId}-title`} className="file-import__title">
        {title}
      </h3>
      <p className="muted small">{description}</p>

      <div className="file-import__main">
        {file ? (
          <div className="file-import__info">
            <FileCheck2 size={20} aria-hidden="true" className="icon-ok" />
            <div className="file-import__details">
              <span className="file-import__filename break">{file.fileName}</span>
              <span className="file-import__count small muted">{file.records.length} registro(s) válido(s)</span>
            </div>
          </div>
        ) : (
          <p id={statusId} className="file-import__status muted small">
            Nenhum arquivo válido carregado.
          </p>
        )}

        <div className="file-import__action">
          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only file-input-hidden"
            disabled={disabled}
            aria-describedby={hasErrors ? `${statusId} ${errorsId}` : statusId}
            aria-invalid={hasErrors || undefined}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = '';
              if (selected) onSelect(selected);
            }}
          />
          <button
            type="button"
            className="btn btn--secondary"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            {actionText}
          </button>
        </div>
      </div>

      <div id={errorsId} role="alert" aria-live="assertive">
        {hasErrors && (
          <div className="error-box">
            <p className="error-box__title">
              <FileWarning size={16} aria-hidden="true" />
              {file
                ? `Substituição rejeitada: ${errors[0].fileName}`
                : `Importação rejeitada: ${errors[0].fileName}`}
            </p>
            <p className="small">
              Nenhum registro deste arquivo foi importado.
              {file ? ' O arquivo válido anterior foi mantido.' : ''}
            </p>
            <ul className="error-list">
              {errors.map((error, index) => (
                <li key={index}>
                  {error.line !== null ? <strong>Linha {error.line}:</strong> : <strong>Arquivo:</strong>}{' '}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
