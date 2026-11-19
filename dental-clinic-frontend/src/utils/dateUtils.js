export const formatDate = (date) => {
  if (!date) return '-';
  let str = String(date).trim();
  if (!str) return '-';
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Calendar days between dateInput (e.g. createdAt) and today; for list "N days ago" labels */
export const formatDaysAgo = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const startOfDay = (x) => {
    const t = new Date(x);
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  };
  const today = startOfDay(new Date());
  const then = startOfDay(d);
  const days = Math.round((today - then) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

/**
 * Relative "time since" label with fine granularity:
 * "Just now", "20 min ago", "1 hour ago", "3 days ago", "1 month ago", "2 years ago".
 */
export const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '-';
  let str = String(dateInput).trim();
  if (!str) return '-';
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return '-';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0 && Math.abs(diffMs) < 60000) {
    return 'Just now';
  }
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 0) {
    return formatDate(d);
  }
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};
