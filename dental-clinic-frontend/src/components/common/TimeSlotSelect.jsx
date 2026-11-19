import React, { useMemo } from 'react';
import { buildTimeSlots, formatBranchHours, formatTime12h, hasOperatingHours, normalizeTimeValue } from '../../utils/branchHours';

/**
 * Appointment time picker bound to a branch's operating hours.
 *
 * When the branch has opening/closing times set, this renders a fixed slot list
 * so nobody can book outside clinic hours. When it doesn't — or no branch is
 * picked yet — it degrades to the plain `<input type="time">` these forms used
 * before, so unconfigured branches keep working.
 *
 * The change event carries the same `{ target: { name, value } }` shape either
 * way, so existing `handleInputChange` handlers can be passed straight through.
 */
const TimeSlotSelect = ({
  branch,
  value,
  onChange,
  name = 'appointmentTime',
  required = false,
  disabled = false,
  className = '',
  showHours = true,
  placeholder = 'Select time'
}) => {
  const current = normalizeTimeValue(value);
  const restricted = hasOperatingHours(branch);

  const slots = useMemo(
    () => (restricted ? buildTimeSlots(branch, current) : []),
    [restricted, branch, current]
  );

  if (!restricted) {
    return (
      <input
        type="time"
        name={name}
        value={current}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={className}
      />
    );
  }

  const outOfHours = current && !buildTimeSlots(branch).includes(current);

  return (
    <>
      <select
        name={name}
        value={current}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={className}
      >
        <option value="">{placeholder}</option>
        {slots.map((slot) => (
          <option key={slot} value={slot}>
            {formatTime12h(slot)}
          </option>
        ))}
      </select>
      {showHours && (
        <p className="mt-1 text-[11px] text-slate-500">
          Clinic hours: {formatBranchHours(branch)}
          {outOfHours && <span className="text-amber-600 font-semibold"> · current time is outside these hours</span>}
        </p>
      )}
    </>
  );
};

export default TimeSlotSelect;
