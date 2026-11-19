import React from 'react';
import { Search, Filter } from 'lucide-react';
import ExportExcelButton from './ExportExcelButton';
import useListExport from '../../hooks/useListExport';

/**
 * Standard search + filter button row used across list pages.
 * Optional export: pass exportModule + exportRows, or exportColumns + exportRows, or onExport.
 */
const SearchFilterBar = ({
  searchValue,
  onSearchChange,
  onSearchKeyDown,
  searchPlaceholder = 'Search...',
  onFilterClick,
  activeFilterCount = 0,
  filteredCount,
  totalCount,
  recordLabel = 'records',
  className = '',
  children,
  exportModule,
  exportColumns,
  exportLabel,
  exportRows,
  exportFilename,
  onExport,
  customFieldsModule,
  showSearch = true,
}) => {
  const exportCount = totalCount ?? filteredCount ?? exportRows?.length ?? 0;

  const { exporting, runExport } = useListExport({
    exportModule,
    exportColumns,
    exportLabel,
    exportRows,
    exportFilename,
    onExport,
    customFieldsModule,
  });

  const showExport = Boolean(exportModule || exportColumns?.length || onExport);

  return (
    <div className={`bg-white p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 shrink-0 ${className}`}>
      {/* On phones, stack: search on its own row, action buttons below.
          From md up, keep everything on a single row. */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
        {showSearch && (
          <div className="relative w-full md:flex-1 md:min-w-0">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="w-full h-9 sm:h-10 md:h-11 pl-8 sm:pl-10 pr-3 border border-slate-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            />
          </div>
        )}
        <div className={`flex items-center gap-1.5 sm:gap-2 w-full md:w-auto min-w-0 ${!showSearch ? 'md:ml-auto md:justify-end' : ''}`}>
          {onFilterClick && (
            <button
              type="button"
              onClick={onFilterClick}
              className={`relative shrink-0 h-9 sm:h-10 md:h-11 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 md:px-4 border rounded-lg sm:rounded-xl font-medium transition-all ${
                activeFilterCount > 0
                  ? 'bg-brand-50 border-brand-200 text-brand-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
              }`}
              aria-label="Open filters"
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span className="hidden min-[380px]:inline text-sm">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-brand-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          {showExport && (
            <ExportExcelButton
              onExport={runExport}
              exporting={exporting}
              count={exportCount}
            />
          )}
          {/* Children (usually the page's primary "Add X" button) get the
              remaining width so long labels like "Add Sub-Category" don't
              clip off the right edge on phones. */}
          <div className="flex-1 min-w-0 flex justify-end *:max-w-full [&>button]:truncate">
            {children}
          </div>
        </div>
      </div>
      {filteredCount != null && totalCount != null && (
        <p className="text-[10px] sm:text-xs text-slate-500 font-medium text-right mt-1.5 sm:mt-2 tabular-nums">
          {filteredCount} / {totalCount} {recordLabel}
        </p>
      )}
    </div>
  );
};

export default SearchFilterBar;
