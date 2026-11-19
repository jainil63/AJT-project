/** Shared attendance display helpers (IST clinic timezone). */

export const CLINIC_TZ = 'Asia/Kolkata';

export const todayStr = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(new Date());

export const firstOfMonthStr = () => `${todayStr().slice(0, 8)}01`;

export const formatTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: CLINIC_TZ });
};

export const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', timeZone: CLINIC_TZ });
};

export const formatWorkHours = (ms) => {
  if (!(ms > 0)) return null;
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
};

/** Sum completed session durations per calendar day. */
export const buildDayWorkMs = (records) => {
  const dayWorkMs = {};
  (records || []).forEach((r) => {
    if (r.checkInAt && r.checkOutAt) {
      const ms = new Date(r.checkOutAt).getTime() - new Date(r.checkInAt).getTime();
      if (ms > 0) {
        const key = `${r.userId}|${toYmd(r.attendanceDate)}`;
        dayWorkMs[key] = (dayWorkMs[key] || 0) + ms;
      }
    }
  });
  return dayWorkMs;
};

/** Normalize any date value to YYYY-MM-DD in clinic timezone. */
export const toYmd = (val) => {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(d);
};

export const parseYmd = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isTodayYmd = (ymd) => toYmd(new Date()) === toYmd(ymd);

export const monthRange = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const today = todayStr();
  return {
    fromDate: toYmd(start),
    toDate: toYmd(end) > today ? today : toYmd(end)
  };
};

/** Build a 6-row month grid (Sun–Sat) including leading/trailing days. */
export const buildMonthGrid = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthDays - i);
    cells.push({ date, ymd: toYmd(date), currentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({ date, ymd: toYmd(date), currentMonth: true });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, trailing++);
    cells.push({ date, ymd: toYmd(date), currentMonth: false });
  }
  while (cells.length < 42) {
    const date = new Date(year, month + 1, trailing++);
    cells.push({ date, ymd: toYmd(date), currentMonth: false });
  }
  return cells;
};

export const groupRecordsByDate = (records) => {
  const map = {};
  (records || []).forEach((r) => {
    const key = toYmd(r.attendanceDate);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  Object.values(map).forEach((arr) =>
    arr.sort((a, b) => new Date(a.checkInAt || 0) - new Date(b.checkInAt || 0))
  );
  return map;
};

// Returns the approved leave (if any) that covers a particular ymd. `leaves`
// is the list returned by /leave/calendar — already filtered to status=approved
// for the relevant user.
export const findLeaveForDay = (leaves = [], ymd) => {
  if (!ymd || !Array.isArray(leaves) || leaves.length === 0) return null;
  return leaves.find((l) => l.fromDate <= ymd && ymd <= l.toDate) || null;
};

/**
 * Day-level attendance status for calendar cells.
 * absent | present | late | in_progress | on_leave
 *
 * Leave overlay rule: actual attendance wins over an approved leave (an
 * employee who showed up despite an approved leave should still read as
 * Present). On a no-attendance day with an approved leave the cell flips
 * from 'absent' to 'on_leave'.
 */
export const getDaySummary = (dayRecords = [], userId, ymd, dayWorkMs = {}, leaves = []) => {
  if (!dayRecords.length) {
    const leave = findLeaveForDay(leaves, ymd);
    if (leave) {
      return { status: 'on_leave', records: [], workHours: null, sessionCount: 0, leave };
    }
    return { status: 'absent', records: [], workHours: null, sessionCount: 0 };
  }
  const hasOpen = dayRecords.some((r) => r.checkInAt && !r.checkOutAt);
  if (hasOpen) {
    return {
      status: 'in_progress',
      records: dayRecords,
      workHours: formatWorkHours(dayWorkMs[`${userId}|${ymd}`]),
      sessionCount: dayRecords.length
    };
  }
  const hasLate = dayRecords.some((r) => r.checkInStatus === 'late');
  return {
    status: hasLate ? 'late' : 'present',
    records: dayRecords,
    workHours: formatWorkHours(dayWorkMs[`${userId}|${ymd}`]),
    sessionCount: dayRecords.length
  };
};

export const DAY_STATUS_META = {
  absent: {
    label: 'Absent',
    cell: 'bg-white hover:bg-slate-50 border-slate-100',
    dot: 'bg-slate-200',
    badge: 'bg-slate-100 text-slate-500 border-slate-200'
  },
  present: {
    label: 'Present',
    cell: 'bg-emerald-50/80 hover:bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  late: {
    label: 'Late',
    cell: 'bg-rose-50/80 hover:bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  in_progress: {
    label: 'In progress',
    cell: 'bg-amber-50/80 hover:bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  on_leave: {
    label: 'On Leave',
    cell: 'bg-purple-50/80 hover:bg-purple-50 border-purple-200',
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200'
  }
};
