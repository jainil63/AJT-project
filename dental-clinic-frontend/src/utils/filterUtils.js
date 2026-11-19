/**
 * Count active filter groups from a filter state object.
 * @param {Object} filterData
 * @param {Array<{ key: string, type?: 'array'|'date'|'string'|'boolean' }>} keys
 */
export function countActiveFilters(filterData, keys) {
  if (!filterData || !keys?.length) return 0;
  return keys.reduce((count, { key, type = 'array' }) => {
    const value = filterData[key];
    if (type === 'array') return count + (Array.isArray(value) && value.length > 0 ? 1 : 0);
    if (type === 'date') return count + (value ? 1 : 0);
    if (type === 'string') return count + (value && value !== 'All' && value !== 'all' && value !== '' ? 1 : 0);
    if (type === 'boolean') return count + (value ? 1 : 0);
    return count;
  }, 0);
}

/** @returns {boolean} */
export function matchesDateRange(recordDate, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const d = recordDate ? new Date(recordDate) : null;
  if (!d || Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    if (d < from) return false;
  }
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    if (d > to) return false;
  }
  return true;
}

/** @returns {boolean} */
export function matchesIds(recordId, selectedIds) {
  if (!selectedIds?.length) return true;
  return recordId != null && selectedIds.includes(recordId);
}

/**
 * Days-ago range filter. Used by list pages that show a "N days ago" label
 * on each row (lab logs, ortho, implant, vendor lab) — lets the user say
 * "only items from the last 7 days" or "older than 30 days" without
 * fiddling with raw calendar dates.
 *
 * Values are positive integers (days). Empty / null / undefined = no
 * constraint on that side of the range.
 *
 * @param {string|Date|number|null|undefined} recordDate
 * @param {number|string|null|undefined} minDays  inclusive lower bound (e.g. 7 = at least 7 days old)
 * @param {number|string|null|undefined} maxDays  inclusive upper bound (e.g. 30 = at most 30 days old)
 */
export function matchesDaysAgoRange(recordDate, minDays, maxDays) {
  const hasMin = minDays !== '' && minDays != null && !Number.isNaN(Number(minDays));
  const hasMax = maxDays !== '' && maxDays != null && !Number.isNaN(Number(maxDays));
  if (!hasMin && !hasMax) return true;
  const d = recordDate ? new Date(recordDate) : null;
  if (!d || Number.isNaN(d.getTime())) return false;

  // Calendar-day delta so "1 day ago" rows match a `<= 1` bound regardless
  // of the hour they were created at. Matches the `formatDaysAgo` helper
  // in `dateUtils.js` exactly.
  const startOfDay = (x) => {
    const t = new Date(x);
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  };
  const today = startOfDay(new Date());
  const then = startOfDay(d);
  const days = Math.round((today - then) / 86_400_000);
  if (days < 0) return false; // future records never match a days-ago window
  if (hasMin && days < Number(minDays)) return false;
  if (hasMax && days > Number(maxDays)) return false;
  return true;
}

/** Referral filter with optional direct/walk-in sentinel id */
export function matchesReferralFilter(recordReferralById, selectedIds, directId = '__direct__') {
  if (!selectedIds?.length) return true;
  const wantsDirect = selectedIds.includes(directId);
  const referralIds = selectedIds.filter((id) => id !== directId);
  const isDirect = !recordReferralById;
  const matchesReferral = recordReferralById && referralIds.includes(recordReferralById);
  return (wantsDirect && isDirect) || matchesReferral;
}

/**
 * Standard preset options used by every list page that has a "days ago"
 * column. Render these as a single `select` field in FilterModal; convert
 * the chosen value to a {minDays, maxDays} window with [daysAgoRangeFromPreset].
 *
 * Add new presets here once and every page picks them up automatically.
 */
export const DAYS_AGO_PRESET_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last-3', label: 'Last 3 days' },
  { value: 'last-7', label: 'Last 7 days' },
  { value: 'last-14', label: 'Last 14 days' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'last-90', label: 'Last 90 days' },
  { value: '7-30', label: '7 – 30 days old' },
  { value: '30-90', label: '30 – 90 days old' },
  { value: '90+', label: 'Older than 90 days' },
];

/**
 * Resolve a preset key (e.g. 'last-7') to a {minDays, maxDays} window.
 * Pass the result to [matchesDaysAgoRange].
 *
 * Empty/null/'all' = no filter ({minDays: null, maxDays: null}).
 */
export function daysAgoRangeFromPreset(preset) {
  switch (preset) {
    case 'today': return { minDays: 0, maxDays: 0 };
    case 'yesterday': return { minDays: 1, maxDays: 1 };
    case 'last-3': return { minDays: 0, maxDays: 3 };
    case 'last-7': return { minDays: 0, maxDays: 7 };
    case 'last-14': return { minDays: 0, maxDays: 14 };
    case 'last-30': return { minDays: 0, maxDays: 30 };
    case 'last-90': return { minDays: 0, maxDays: 90 };
    case '7-30': return { minDays: 7, maxDays: 30 };
    case '30-90': return { minDays: 30, maxDays: 90 };
    case '90+': return { minDays: 90, maxDays: null };
    default: return { minDays: null, maxDays: null };
  }
}

/** Convenience: full pipeline preset → match boolean for one record. */
export function matchesDaysAgoPreset(recordDate, preset) {
  const { minDays, maxDays } = daysAgoRangeFromPreset(preset);
  return matchesDaysAgoRange(recordDate, minDays, maxDays);
}

export function filterBranchesByScope(branches, permissions, user) {
  return (branches || []).filter((b) => {
    if (permissions?.branchScope === 'own') return b.id === user?.branchId;
    if (permissions?.branchScope === 'manual') {
      return (permissions.selectedBranches || []).includes(b.id);
    }
    return true;
  });
}
