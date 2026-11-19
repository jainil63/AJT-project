import { useState, useCallback } from 'react';
import useToast from './useToast';
import api from '../api/axios';
import { exportRowsToExcel, MAX_EXPORT_ROWS } from '../utils/exportToExcel';
import { resolveExportColumns, getExportFilename } from '../utils/exportColumnPresets';

/**
 * Client-side Excel export for filtered list rows.
 * Pass exportModule (preset key) or explicit exportColumns.
 *
 * Custom field columns (admin-defined via Custom Form Field master) are
 * automatically appended when `customFieldsModule` is supplied (the targetModule
 * string, e.g. "Lead Entry"). The hook fetches the field definitions + every
 * stored value for the visible rows in ONE request, then builds extra column
 * defs whose `getValue` looks up the in-memory map.
 */
export default function useListExport({
  exportModule,
  exportColumns: columnsProp,
  exportLabel,
  exportRows = [],
  exportFilename,
  onExport: customExport,
  customFieldsModule,
} = {}) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const resolvedFilename = getExportFilename(
    exportModule,
    exportFilename && exportFilename !== 'export' ? exportFilename : undefined
  );

  const baseColumns = columnsProp || resolveExportColumns(exportModule, exportLabel);
  const count = exportRows?.length ?? 0;

  // Custom Form Fields were removed from this build — exports use preset columns only.
  const buildCustomFieldColumns = useCallback(async () => [], []);

  const runExport = useCallback(async () => {
    if (customExport) {
      try {
        setExporting(true);
        await customExport();
      } finally {
        setExporting(false);
      }
      return;
    }

    if (!baseColumns?.length) {
      showToast('Export is not configured for this page', 'error');
      return;
    }
    if (count === 0) {
      showToast('No records to export', 'error');
      return;
    }

    try {
      setExporting(true);
      showToast(`Exporting ${count} record(s)…`, 'info');
      const extraCols = await buildCustomFieldColumns();
      const columns = [...baseColumns, ...extraCols];
      const ok = exportRowsToExcel(exportRows, columns, resolvedFilename);
      if (ok) showToast(`Exported ${count} record(s)`, 'success');
      else showToast('Nothing to export', 'error');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }, [baseColumns, count, customExport, resolvedFilename, exportRows, showToast, buildCustomFieldColumns]);

  return { exporting, runExport, exportCount: count };
}
