export const getCalendarPatientName = (event) =>
    event.Patient?.patientName || event.Lead?.name || 'Unknown';

export const getCalendarTreatment = (event) => event.Treatment?.text || 'Clinical Visit';

export const getCalendarColor = (event) => {
    if (event.eventType === 'followup') {
        return event.FollowupStatus?.color || '#f59e0b';
    }
    return event.Doctor?.colorCode || '#94a3b8';
};

export const formatCalendarTime = (time) => {
    if (!time) return '';
    const parts = String(time).split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
};

export const filterScheduleByDoctor = (events, doctorId) => {
    if (!doctorId) return events;
    return events.filter((e) => e.eventType !== 'followup' && e.doctorId === doctorId);
};

export const EVENT_TYPE_META = {
    appointment: { label: 'Appointment', color: '#0d9488', bg: 'bg-brand-50 text-brand-700 border-brand-100' },
    followup: { label: 'Follow-up', color: '#d97706', bg: 'bg-amber-50 text-amber-700 border-amber-100' },
    patient_appointment: { label: 'Patient Visit', color: '#059669', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
};

export const getEventTypeMeta = (eventType) =>
    EVENT_TYPE_META[eventType] || EVENT_TYPE_META.appointment;

export const filterNavbarSchedule = (events, { doctorId = '', eventType = 'all' } = {}) => {
    let list = events;
    if (eventType !== 'all') {
        list = list.filter((e) => e.eventType === eventType);
    }
    if (doctorId) {
        list = list.filter((e) => e.eventType !== 'followup' && e.doctorId === doctorId);
    }
    return list;
};
