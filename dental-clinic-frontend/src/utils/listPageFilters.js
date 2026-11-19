import { matchesDateRange } from './filterUtils';

/** Default date-only filter state for client-side list pages */
export const EMPTY_DATE_FILTERS = {
  fromDate: '',
  toDate: '',
};

export const DATE_FILTER_KEYS = [
  { key: 'fromDate', type: 'date' },
  { key: 'toDate', type: 'date' },
];

export const DATE_FILTER_FIELDS = [
  { type: 'date', key: 'fromDate', label: 'From Date' },
  { type: 'date', key: 'toDate', label: 'To Date' },
];

/**
 * Client-side search + optional date range on a record field.
 */
export function applyListFilters(items, {
  searchTerm = '',
  getSearchableText,
  filterData = EMPTY_DATE_FILTERS,
  dateKey = 'createdAt',
} = {}) {
  const list = items || [];
  const q = searchTerm.trim().toLowerCase();

  return list.filter((item) => {
    if (q && getSearchableText) {
      const text = getSearchableText(item);
      if (!text || !String(text).toLowerCase().includes(q)) return false;
    }
    if (!matchesDateRange(item[dateKey], filterData.fromDate, filterData.toDate)) {
      return false;
    }
    return true;
  });
}
