import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../api/axios';
import useToast from '../../hooks/useToast';
import DocumentUploadSection from '../DocumentUploadSection';
import TimeSlotSelect from '../common/TimeSlotSelect';

const getLocalISOString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().slice(0, 16);
};

const ADD_TITLES = {
    payments: 'Add Payment',
    appointments: 'Add Appointment',
    opd: 'Add Visit Record',
    documents: 'Upload Document'
};

const PatientHistoryAddModal = ({ addType, patient, patientDetail, onClose, onSuccess, editingData = null }) => {
    const { showToast } = useToast();
    const [loadingMasters, setLoadingMasters] = useState(true);
    const [saving, setSaving] = useState(false);


    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [opdStatuses, setOpdStatuses] = useState([]);


    const [paymentForm, setPaymentForm] = useState(() => {
        if (editingData && addType === 'payments') {
            return {
                paymentType: editingData.paymentType || 'Credit',
                paymentById: editingData.paymentById || editingData.PaymentBy?.id || '',
                amount: editingData.amount || '',
                paymentDateTime: editingData.paymentDateTime ? new Date(editingData.paymentDateTime).toISOString().slice(0, 16) : getLocalISOString(),
                remark: editingData.remark || ''
            };
        }
        return {
            paymentType: 'Credit',
            paymentById: '',
            amount: '',
            paymentDateTime: getLocalISOString(),
            remark: ''
        };
    });

    const [appointmentForm, setAppointmentForm] = useState(() => {
        if (editingData && addType === 'appointments') {
            return {
                doctorId: editingData.doctorId || editingData.Doctor?.id || '',
                appointmentDate: editingData.appointmentDate ? new Date(editingData.appointmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                appointmentTime: editingData.appointmentTime || '',
                duration: editingData.duration || 15,
                treatmentId: editingData.treatmentId || editingData.Treatment?.id || '',
                note: editingData.note || ''
            };
        }
        return {
            doctorId: '',
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: '',
            duration: 15,
            treatmentId: '',
            note: ''
        };
    });

    const [opdForm, setOpdForm] = useState(() => {
        if (editingData && addType === 'opd') {
            return {
                doctorId: editingData.doctorId || editingData.Doctor?.id || '',
                date: editingData.date ? new Date(editingData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                statusId: editingData.statusId || editingData.Status?.id || '',
                paymentTypeId: editingData.paymentTypeId || editingData.PaymentBy?.id || '',
                remark: editingData.remark || ''
            };
        }
        return {
            doctorId: '',
            date: new Date().toISOString().split('T')[0],
            statusId: '',
            paymentTypeId: '',
            remark: ''
        };
    });



    const defaultFollowTime = format(new Date(Date.now() + 5 * 60000), 'HH:mm');

    useEffect(() => {
        if (!addType || addType === 'documents') {
            setLoadingMasters(false);
            return;
        }

        let mounted = true;
        (async () => {
            try {
                setLoadingMasters(true);
                const fetches = [];

                if (addType === 'payments' || addType === 'opd') {
                    fetches.push(
                        api.get('/paymentBy/getPaymentBy?forCurrentUser=true').then((r) => {
                            if (mounted) setPaymentMethods(r.data.data || []);
                        })
                    );
                }
                if (['appointments', 'opd'].includes(addType)) {
                    fetches.push(
                        api.get('/doctor/getDoctors').then((r) => {
                            if (mounted) setDoctors(r.data.data || r.data || []);
                        })
                    );
                }
                if (addType === 'appointments') {
                    fetches.push(
                        api.get('/treatment/getTreatment').then((r) => {
                            if (mounted) setTreatments(r.data.data || []);
                        })
                    );
                }
                if (addType === 'opd') {
                    fetches.push(
                        api.get('/opdStatus/getOPDStatus').then((r) => {
                            if (mounted) setOpdStatuses(r.data.data || []);
                        })
                    );
                }
                await Promise.all(fetches);
            } catch (err) {
                showToast('Failed to load form options', 'error');
            } finally {
                if (mounted) setLoadingMasters(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [addType]);

    const appendFormFields = (fd, obj) => {
        Object.entries(obj).forEach(([key, val]) => {
            if (val !== '' && val !== null && val !== undefined) {
                fd.append(key, val);
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!patient?.id) return;

        try {
            setSaving(true);

            if (addType === 'payments') {
                if (!paymentForm.amount || !paymentForm.paymentById) {
                    showToast('Amount and payment mode are required', 'error');
                    return;
                }
                const body = {
                    patientId: patient.id,
                    paymentType: paymentForm.paymentType,
                    paymentById: paymentForm.paymentById,
                    amount: parseFloat(paymentForm.amount),
                    paymentDateTime: paymentForm.paymentDateTime,
                    remark: paymentForm.remark?.trim() || null
                };
                if (editingData) {
                    await api.put(`/transaction/updateTransaction/${editingData.id}`, body);
                    showToast('Payment updated', 'success');
                } else {
                    await api.post('/transaction/addTransaction', body);
                    showToast('Payment recorded', 'success');
                }
            }

            if (addType === 'appointments') {
                const isDocReq = !editingData || !!(editingData.doctorId || editingData.Doctor?.id);
                if ((isDocReq && !appointmentForm.doctorId) || !appointmentForm.appointmentTime) {
                    showToast('Doctor and time are required', 'error');
                    return;
                }
                const body = {
                    patientId: patient.id,
                    doctorId: appointmentForm.doctorId,
                    appointmentDate: appointmentForm.appointmentDate,
                    appointmentTime: appointmentForm.appointmentTime,
                    duration: Number(appointmentForm.duration) || 15,
                    treatmentId: appointmentForm.treatmentId || null,
                    note: appointmentForm.note?.trim() || ''
                };
                if (editingData) {
                    await api.put(`/appointment/updateAppointment/${editingData.id}`, body);
                    showToast('Appointment updated', 'success');
                } else {
                    await api.post('/appointment/addAppointment', body);
                    showToast('Appointment booked', 'success');
                }
            }

            if (addType === 'opd') {
                const isDocReq = !editingData || !!(editingData.doctorId || editingData.Doctor?.id);
                const isStatReq = !editingData || !!(editingData.statusId || editingData.Status?.id);
                if (isDocReq && !opdForm.doctorId) {
                    showToast('Doctor is required', 'error');
                    return;
                }
                if (isStatReq && !opdForm.statusId) {
                    showToast('Status is required', 'error');
                    return;
                }
                const body = {
                    patientId: patient.id,
                    doctorId: opdForm.doctorId || null,
                    date: opdForm.date,
                    statusId: opdForm.statusId || null,
                    paymentTypeId: opdForm.paymentTypeId || null,
                    remark: opdForm.remark?.trim() || null
                };
                if (editingData) {
                    await api.put(`/opdMaster/updateOPDMaster/${editingData.id}`, body);
                    showToast('Visit record updated', 'success');
                } else {
                    await api.post('/opdMaster/addOPDMaster', body);
                    showToast('Visit record added', 'success');
                }
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!addType || !patient) return null;

    if (addType === 'documents') {
        return (
            <DocumentUploadSection
                isOpen
                onClose={() => {
                    if (onSuccess) onSuccess();
                    onClose();
                }}
                isStaged={false}
                entityType="Patient"
                entityId={patient.id}
                title={`Upload — ${patient.patientName}`}
            />
        );
    }

    const isDoctorRequired = !editingData || !!(editingData.doctorId || editingData.Doctor?.id);
    const isStatusRequired = !editingData || !!(editingData.statusId || editingData.Status?.id);

    const inputCls =
        'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white';
    const labelCls = 'text-xs font-bold text-slate-600 uppercase tracking-wider';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-brand-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">
                            {editingData ? ADD_TITLES[addType]?.replace('Add', 'Edit')?.replace('Upload', 'Edit') : ADD_TITLES[addType]}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                            {patient.patientName}
                            {patient.uhid ? ` · ${patient.uhid}` : ''}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loadingMasters ? (
                    <div className="flex-1 flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        {addType === 'payments' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Type</label>
                                    <div className="flex gap-2">
                                        {['Credit', 'Debit'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setPaymentForm((f) => ({ ...f, paymentType: t }))}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${
                                                    paymentForm.paymentType === t
                                                        ? t === 'Credit'
                                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                                            : 'bg-rose-600 text-white border-rose-600'
                                                        : 'border-slate-200 text-slate-600'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Amount *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Payment mode *</label>
                                    <select
                                        required
                                        value={paymentForm.paymentById}
                                        onChange={(e) => setPaymentForm((f) => ({ ...f, paymentById: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="">Select mode</option>
                                        {paymentMethods.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Date & time</label>
                                    <input
                                        type="datetime-local"
                                        value={paymentForm.paymentDateTime}
                                        onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDateTime: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Remark</label>
                                    <textarea
                                        rows={2}
                                        value={paymentForm.remark}
                                        onChange={(e) => setPaymentForm((f) => ({ ...f, remark: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                            </>
                        )}

                        {addType === 'appointments' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Doctor {isDoctorRequired && '*'}</label>
                                    <select
                                        required={isDoctorRequired}
                                        value={appointmentForm.doctorId}
                                        onChange={(e) => setAppointmentForm((f) => ({ ...f, doctorId: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="">Select doctor</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={appointmentForm.appointmentDate}
                                            onChange={(e) =>
                                                setAppointmentForm((f) => ({ ...f, appointmentDate: e.target.value }))
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Time *</label>
                                        <TimeSlotSelect
                                            required
                                            value={appointmentForm.appointmentTime}
                                            onChange={(e) =>
                                                setAppointmentForm((f) => ({ ...f, appointmentTime: e.target.value }))
                                            }
                                            className={inputCls}
                                            placeholder="Select time"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Treatment</label>
                                    <select
                                        value={appointmentForm.treatmentId}
                                        onChange={(e) =>
                                            setAppointmentForm((f) => ({ ...f, treatmentId: e.target.value }))
                                        }
                                        className={inputCls}
                                    >
                                        <option value="">Optional</option>
                                        {treatments.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Note</label>
                                    <textarea
                                        rows={2}
                                        value={appointmentForm.note}
                                        onChange={(e) => setAppointmentForm((f) => ({ ...f, note: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                            </>
                        )}

                        {addType === 'opd' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Doctor {isDoctorRequired && '*'}</label>
                                    <select
                                        required={isDoctorRequired}
                                        value={opdForm.doctorId}
                                        onChange={(e) => setOpdForm((f) => ({ ...f, doctorId: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="">Select doctor</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={opdForm.date}
                                            onChange={(e) => setOpdForm((f) => ({ ...f, date: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Status {isStatusRequired && '*'}</label>
                                        <select
                                            required={isStatusRequired}
                                            value={opdForm.statusId}
                                            onChange={(e) => setOpdForm((f) => ({ ...f, statusId: e.target.value }))}
                                            className={inputCls}
                                        >
                                            <option value="">Select status</option>
                                            {opdStatuses.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.text}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Payment mode</label>
                                    <select
                                        value={opdForm.paymentTypeId}
                                        onChange={(e) => setOpdForm((f) => ({ ...f, paymentTypeId: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="">Optional</option>
                                        {paymentMethods.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Remark</label>
                                    <textarea
                                        rows={2}
                                        value={opdForm.remark}
                                        onChange={(e) => setOpdForm((f) => ({ ...f, remark: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PatientHistoryAddModal;
