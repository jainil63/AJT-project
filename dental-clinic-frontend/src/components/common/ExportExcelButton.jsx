import React from 'react';
import { Download } from 'lucide-react';

/**
 * Triggers async export (fetch all filtered rows, then download).
 * Disabled while exporting or when count is 0.
 */
const ExportExcelButton = ({
  onExport,
  exporting = false,
  disabled = false,
  count = 0,
  className = '',
  label = 'Export',
}) => (
  <button
    type="button"
    onClick={onExport}
    disabled={disabled || exporting || count === 0}
    title={count === 0 ? 'No records to export' : `Export ${count} record(s) matching filters`}
    className={`shrink-0 h-9 sm:h-10 md:h-11 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 md:px-4 border border-slate-200 rounded-lg sm:rounded-xl font-medium text-sm transition-all ${
      disabled || exporting || count === 0
        ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
        : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
    } ${className}`}
  >
    {exporting ? (
      <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    ) : (
      <Download className="w-4 h-4 shrink-0" />
    )}
    <span className="hidden min-[380px]:inline">{exporting ? 'Exporting…' : label}</span>
  </button>
);

export default ExportExcelButton;
