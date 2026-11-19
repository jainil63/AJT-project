/**
 * Branch operating hours → the slot list appointment forms offer.
 *
 * `Branch.openingTime` / `closingTime` are 24h "HH:mm" strings, or null when the
 * branch has no hours configured. Callers fall back to a free time input in that
 * case, so branches that never set hours keep behaving as they always did.
 */

export const SLOT_INTERVAL_MINUTES = 15;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (value) => {
  const match = HHMM.exec(String(value ?? '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Trims the "14:30:00" the API returns down to the "14:30" the picker uses. */
export const normalizeTimeValue = (value) => {
  const hhmm = String(value ?? '').trim().slice(0, 5);
  return HHMM.test(hhmm) ? hhmm : '';
};

/** "14:30" → "02:30 PM". Empty string for anything unparseable. */
export const formatTime12h = (value) => {
  const minutes = toMinutes(normalizeTimeValue(value));
  if (minutes === null) return '';
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${hour24 < 12 ? 'AM' : 'PM'}`;
};

export const hasOperatingHours = (branch) => {
  const open = toMinutes(normalizeTimeValue(branch?.openingTime));
  const close = toMinutes(normalizeTimeValue(branch?.closingTime));
  return open !== null && close !== null && close > open;
};

/** "09:00 AM – 09:00 PM", or empty string when the branch has no hours set. */
export const formatBranchHours = (branch) =>
  hasOperatingHours(branch)
    ? `${formatTime12h(branch.openingTime)} – ${formatTime12h(branch.closingTime)}`
    : '';

/**
 * Slots from opening up to — but not including — closing, every
 * SLOT_INTERVAL_MINUTES.
 *
 * `extraValue` keeps an already-saved time selectable even when it now falls
 * outside the branch's hours; editing an old appointment must not silently
 * blank out its time.
 */
export const buildTimeSlots = (branch, extraValue) => {
  const start = toMinutes(normalizeTimeValue(branch?.openingTime));
  const end = toMinutes(normalizeTimeValue(branch?.closingTime));
  if (start === null || end === null || end <= start) return [];

  const slots = [];
  for (let minutes = start; minutes < end; minutes += SLOT_INTERVAL_MINUTES) {
    slots.push(toHHMM(minutes));
  }

  const extra = normalizeTimeValue(extraValue);
  if (extra && !slots.includes(extra)) {
    slots.push(extra);
    slots.sort();
  }
  return slots;
};
