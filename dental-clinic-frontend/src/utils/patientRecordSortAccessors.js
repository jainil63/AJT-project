/** Shared sort accessors for patient history / detail tables */
import { dateCol, numCol, textCol } from './sortColumnHelpers';

export const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
};

export const PAYMENT_SORT_ACCESSORS = {
    date: dateCol((t) => t.paymentDateTime),
    type: textCol((t) => t.paymentType),
    category: textCol((t) => (t.paymentCategory || '').split(',').join(', ')),
    mode: textCol((t) => t.PaymentBy?.text),
    amount: numCol((t) => Number(t.amount || 0))
};

export const APPOINTMENT_SORT_ACCESSORS = {
    date: dateCol((a) => a.appointmentDate),
    time: textCol((a) => a.appointmentTime),
    treatment: textCol((a) => a.Treatment?.text),
    doctor: textCol((a) => a.Doctor?.name),
    status: textCol((a) => a.status)
};

export const OPD_SORT_ACCESSORS = {
    date: dateCol((o) => o.date),
    doctor: textCol((o) => o.Doctor?.name),
    status: textCol((o) => o.Status?.title || o.Status?.text),
    payment: textCol((o) => o.PaymentBy?.text)
};

export const ORTHO_SORT_ACCESSORS = {
    date: dateCol((o) => o.date),
    type: textCol((o) => o.TreatmentType?.title),
    brand: textCol((o) => o.OrthoBrand?.title),
    trays: numCol((o) => Number(o.numberOfTrays ?? 0), 'asc'),
    doctor: textCol((o) => o.Doctor?.name),
    budget: numCol((o) => Number(o.budget || 0)),
    status: textCol((o) => o.Status?.title)
};

export const IMPLANT_SORT_ACCESSORS = {
    date: dateCol((o) => o.date),
    type: textCol((o) => o.TreatmentType?.title),
    brand: textCol((o) => o.ImplantBrand?.title),
    implants: numCol((o) => Number(o.numberOfImplants ?? 0), 'asc'),
    doctor: textCol((o) => o.Doctor?.name),
    budget: numCol((o) => Number(o.budget || 0)),
    status: textCol((o) => o.Status?.title)
};

export const FOLLOWUP_SORT_ACCESSORS = {
    date: dateCol((fu) => fu.followUpDate),
    status: textCol((fu) => fu.status),
    type: textCol((fu) => `${fu.followUpType} · ${fu.type}`)
};

export const DOCUMENT_SORT_ACCESSORS = {
    type: textCol((d) => d.DocumentType?.text),
    name: textCol((d) => d.fileName)
};

export const PATIENT_TAB_SORT_ACCESSORS = {
    payments: PAYMENT_SORT_ACCESSORS,
    appointments: APPOINTMENT_SORT_ACCESSORS,
    opd: OPD_SORT_ACCESSORS,
    ortho: ORTHO_SORT_ACCESSORS,
    implant: IMPLANT_SORT_ACCESSORS,
    followups: FOLLOWUP_SORT_ACCESSORS,
    documents: DOCUMENT_SORT_ACCESSORS
};
