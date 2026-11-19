import * as XLSX from 'xlsx';

/** Warn / block very large client-side exports */
export const MAX_EXPORT_ROWS = 1000000;

/** File-safe date suffix for export filenames (YYYY-MM-DD) */
export function getExportDateSuffix(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Download name: module_name + date (e.g. appointments_2026-05-22) */
export function buildExportFilename(moduleName, date = new Date()) {
  const base = String(moduleName || 'export')
    .trim()
    .replace(/\.xlsx$/i, '')
    .replace(/_\d{4}-\d{2}-\d{2}$/i, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase() || 'export';
  return `${base}_${getExportDateSuffix(date)}`;
}

/**
 * @param {Array<object>} rows
 * @param {Array<{ header: string, key?: string, getValue?: (row) => unknown }>} columns
 * @param {string} filename — without or with .xlsx
 */
export function exportRowsToExcel(rows, columns, filename) {
  if (!rows?.length || !columns?.length) return false;

  const sheetData = rows.map((row) => {
    const out = {};
    columns.forEach(({ header, key, getValue }) => {
      let val;
      if (typeof getValue === 'function') {
        val = getValue(row);
      } else if (key) {
        val = row[key];
      }
      out[header] = val == null ? '' : val;
    });
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, name);
  return true;
}
