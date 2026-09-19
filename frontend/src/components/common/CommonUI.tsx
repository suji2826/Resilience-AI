import React, { useEffect } from 'react';
import {
  Info,
  Download,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Inbox,
  X,
} from 'lucide-react';
import { exportToCSV } from '../../lib/utils';
import { Link } from 'react-router-dom';

export const SyntheticDataBanner: React.FC = () => {
  return (
    <aside
      aria-label="Demonstration Data Notice"
      className="bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border px-4 py-2.5 rounded-xl text-xs text-command-muted dark:text-slate-300 flex items-center justify-between gap-3 shadow-subtle"
    >
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-tomato-500 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-bold text-command-text dark:text-white">Synthetic / Demonstration Data:</strong> Modeled on Indian Primary Health Centre networks &amp; BRICS health hubs for hackathon evaluation.
        </span>
      </div>
      <span className="hidden md:inline-block px-2 py-0.5 rounded bg-tomato-500/10 text-[10px] font-mono border border-tomato-500/30 text-tomato-600 dark:text-tomato-400 font-bold">
        SYNTHETIC DATASET
      </span>
    </aside>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse" role="status" aria-label="Loading content">
      <div className="h-10 bg-slate-200 dark:bg-navy-800 rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 dark:bg-navy-850 rounded-xl w-full" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" role="status" aria-label="Loading metrics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 bg-slate-200 dark:bg-navy-800 rounded w-24" />
            <div className="h-8 w-8 bg-slate-200 dark:bg-navy-800 rounded-xl" />
          </div>
          <div className="h-8 bg-slate-200 dark:bg-navy-800 rounded w-32" />
          <div className="h-3 bg-slate-100 dark:bg-navy-850 rounded w-3/4" />
        </div>
      ))}
      <span className="sr-only">Loading metrics...</span>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-8 text-center rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border flex flex-col items-center justify-center shadow-subtle">
      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-navy-800 text-command-muted dark:text-slate-400 mb-3 border border-command-border dark:border-navy-border">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-command-text dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-command-muted dark:text-slate-400 max-w-md mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-tomato-500 hover:bg-tomato-600 text-white transition-all shadow-subtle active:scale-95 focus-visible:ring-2 focus-visible:ring-tomato-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({
  title = "Telemetry Unavailable",
  message,
  onRetry,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-tomato-500/30 text-center flex flex-col items-center justify-center shadow-subtle">
      <div className="p-3 rounded-xl bg-tomato-500/15 text-tomato-600 dark:text-tomato-400 mb-3 border border-tomato-500/30">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-command-text dark:text-white uppercase tracking-wider mb-1">{title}</h4>
      <p className="text-xs text-command-muted dark:text-slate-300 max-w-md mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-tomato-500 hover:bg-tomato-600 text-white transition-all active:scale-95 shadow-subtle"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
};

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmBtnStyles =
    variant === 'danger'
      ? 'bg-tomato-500 hover:bg-tomato-600 text-white'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-tomato-500 hover:bg-tomato-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border rounded-2xl shadow-elevated p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              variant === 'danger' ? 'bg-tomato-500/15 text-tomato-600 dark:text-tomato-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="dialog-title" className="text-sm font-bold text-command-text dark:text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-command-muted dark:text-slate-400 hover:text-command-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-command-muted dark:text-slate-300 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-command-border dark:border-navy-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-command-muted dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 border border-command-border dark:border-navy-border transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-subtle ${confirmBtnStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Breadcrumbs: React.FC<{
  items: { label: string; to?: string }[];
}> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-command-muted dark:text-slate-400 mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />}
            {isLast || !item.to ? (
              <span className="font-semibold text-command-text dark:text-white truncate max-w-[200px]" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-tomato-500 transition-colors">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export const ExportButton: React.FC<{
  data: any[];
  filename?: string;
  label?: string;
}> = ({ data, filename = 'resilience_ai_export', label = 'Export CSV' }) => {
  return (
    <button
      onClick={() => exportToCSV(filename, data)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-navy-900 hover:bg-slate-50 dark:hover:bg-navy-850 text-command-text dark:text-white border border-command-border dark:border-navy-border transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-tomato-500"
    >
      <Download className="w-3.5 h-3.5 text-tomato-500" />
      <span>{label}</span>
    </button>
  );
};
