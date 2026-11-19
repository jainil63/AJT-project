import React from 'react';
import { X, Filter, Calendar, ChevronDown } from 'lucide-react';
import MultiSelect from './MultiSelect';

/**
 * Reusable filter modal — inset on mobile, centered on desktop.
 *
 * fields: Array of:
 *   { type: 'multiselect', key, label, options, labelKey?, valueKey?, colorKey?, placeholder?, colSpan? }
 *   { type: 'date', key, label }
 *   { type: 'select', key, label, options: [{ value, label }], placeholder? }
 */
const FilterModal = ({
  isOpen,
  onClose,
  title = 'Filters',
  subtitle,
  filterData,
  setFilterData,
  emptyFilters,
  activeFilterCount = 0,
  filteredCount,
  totalCount,
  fields = [],
  onApply,
  resultLabel = 'results',
}) => {
  if (!isOpen) return null;

  const handleClear = () => {
    if (emptyFilters) setFilterData({ ...emptyFilters });
  };

  const handleApply = () => {
    onApply?.();
    onClose();
  };

  const updateField = (key, value) => {
    setFilterData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-60 flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <div
        className="bg-white w-full max-w-lg sm:max-w-2xl lg:max-w-3xl rounded-2xl shadow-2xl flex flex-col min-h-0 max-h-[calc(100dvh-2rem)] sm:max-h-[min(88vh,680px)] border border-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" aria-hidden />
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 shrink-0">
              <Filter className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h2 id="filter-modal-title" className="text-lg font-bold text-slate-800">
                {title}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {subtitle ||
                  (activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                    : 'Refine your list')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {filteredCount != null && totalCount != null && (
          <div className="shrink-0 px-4 sm:px-6 py-2 bg-brand-50/80 border-b border-brand-100/60">
            <p className="text-xs text-brand-800 font-semibold text-center sm:text-left">
              Showing <span className="font-bold">{filteredCount}</span> of{' '}
              <span className="font-bold">{totalCount}</span>
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              const colClass = field.colSpan === 2 ? 'sm:col-span-2' : '';

              if (field.type === 'multiselect') {
                return (
                  <div key={field.key} className={`space-y-1.5 ${colClass}`}>
                    <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                    <MultiSelect
                      fixedDropdown
                      options={field.options || []}
                      selectedIds={filterData[field.key] || []}
                      onChange={(ids) => updateField(field.key, ids)}
                      placeholder={field.placeholder || `All ${field.label}`}
                      labelKey={field.labelKey || 'name'}
                      valueKey={field.valueKey || 'id'}
                      colorKey={field.colorKey}
                    />
                  </div>
                );
              }

              if (field.type === 'date') {
                return (
                  <div key={field.key} className={`space-y-1.5 ${colClass}`}>
                    <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={filterData[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.key} className={`space-y-1.5 ${colClass}`}>
                    <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                    <div className="relative">
                      <select
                        value={filterData[field.key] ?? field.defaultValue ?? ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-sm font-medium appearance-none cursor-pointer"
                      >
                        {(field.options || []).map((opt) => {
                          const vKey = field.valueKey || 'value';
                          const lKey = field.labelKey || 'label';
                          const val = opt[vKey] ?? opt.value ?? opt.id ?? '';
                          const lbl = opt[lKey] ?? opt.label ?? opt.name ?? '';
                          return (
                            <option key={val} value={val}>{lbl}</option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 pb-safe border-t border-slate-100 bg-white rounded-b-2xl flex flex-col sm:flex-row gap-2.5 sm:gap-3 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={handleClear}
            disabled={activeFilterCount === 0}
            className="w-full sm:flex-1 px-4 py-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-full sm:flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/20 hover:bg-brand-500 active:scale-[0.98]"
          >
            Show {filteredCount != null ? filteredCount : ''} {resultLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
