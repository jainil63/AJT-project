import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SortableTh from '../components/common/SortableTh';
import useTableSort from '../hooks/useTableSort';
import {
  PAYMENT_SORT_ACCESSORS,
  APPOINTMENT_SORT_ACCESSORS,
  OPD_SORT_ACCESSORS
} from '../utils/patientRecordSortAccessors';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Stethoscope, Activity,
  IndianRupee, FileText, AlertCircle, Droplet, Briefcase, Users as UsersIcon,
  CreditCard, ClipboardList, Eye, Building2, Edit2, Plus, Trash2
} from 'lucide-react';
import api from '../api/axios';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import AccessDenied from '../components/AccessDenied';
import { fileUrl } from '../utils/fileUrl';
import { formatDate } from '../utils/dateUtils';
import PatientRegistrationModal from '../components/modals/PatientRegistrationModal';
import PatientHistoryAddModal from '../components/modals/PatientHistoryAddModal';

// Static class strings so Tailwind's scanner picks them up (no dynamic interpolation).
const ACCENT_CLASSES = {
  brand: 'bg-brand-50 border-brand-100 text-brand-600',
  rose: 'bg-rose-50 border-rose-100 text-rose-600',
  purple: 'bg-purple-50 border-purple-100 text-purple-600',
  sky: 'bg-sky-50 border-sky-100 text-sky-600',
  amber: 'bg-amber-50 border-amber-100 text-amber-600',
  indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600'
};

const Section = ({ icon: Icon, title, count, accent = 'brand', onAdd, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${ACCENT_CLASSES[accent] || ACCENT_CLASSES.brand}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h2>
      <div className="ml-auto flex items-center gap-2">
        {count != null && (
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{count}</span>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
  </div>
);

const EmptyRow = ({ text }) => (
  <p className="text-sm text-slate-400 italic text-center py-4">{text}</p>
);

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const permissions = usePermissions('Patient Registration');
  const opdPerms = usePermissions('Visit');
  const txnPerms = usePermissions('Transactions');
  const apptPerms = usePermissions('Appointment Booking');

  const isSuperAdmin = JSON.parse(localStorage.getItem('user') || '{}').isSuperAdmin === true;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('all');

  useEffect(() => {
    setSelectedPatientId('all');
  }, [id]);

  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [addModalType, setAddModalType] = useState(null);
  const [editingRecordData, setEditingRecordData] = useState(null);

  const handleDeleteRecord = async (type, recordId) => {
    const label = type === 'opd' ? 'Visit Record' : type === 'payments' ? 'Payment' : type === 'appointments' ? 'Appointment' : 'Document';
    if (!window.confirm(`Are you sure you want to delete this ${label}?`)) return;

    try {
      let endpoint = '';
      if (type === 'appointments') endpoint = `/appointment/deleteAppointment/${recordId}`;
      else if (type === 'opd') endpoint = `/opdMaster/deleteOPDMaster/${recordId}`;
      else if (type === 'payments') endpoint = `/transaction/deleteTransaction/${recordId}`;
      else if (type === 'documents') endpoint = `/document/delete/${recordId}`;

      await api.delete(endpoint);
      showToast(`${label} deleted successfully`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || `Failed to delete ${label}`, 'error');
    }
  };
  const handleEditRecord = (type, record) => {
    setEditingRecordData({ type, data: record });
  };
  const { patient: primaryPatient, relatedPatients = [] } = data || {};
  const activePatient = useMemo(() => {
    if (!data) return null;
    if (selectedPatientId === 'all') return primaryPatient;
    return relatedPatients.find(p => p.id === selectedPatientId) || primaryPatient;
  }, [data, selectedPatientId, primaryPatient, relatedPatients]);
  const patient = activePatient || {};

  // In the combined view the header shows the URL patient, so reading the tag off
  // that one row hid it whenever you arrived via a sibling. The number came from a

  const appointments = useMemo(() => {
    const list = data?.appointments ?? [];
    return selectedPatientId === 'all' ? list : list.filter(a => a.patientId === selectedPatientId);
  }, [data, selectedPatientId]);

  const opds = useMemo(() => {
    const list = data?.opds ?? [];
    return selectedPatientId === 'all' ? list : list.filter(o => o.patientId === selectedPatientId);
  }, [data, selectedPatientId]);



  const transactions = useMemo(() => {
    const list = data?.transactions ?? [];
    return selectedPatientId === 'all' ? list : list.filter(t => t.patientId === selectedPatientId);
  }, [data, selectedPatientId]);

  const documents = useMemo(() => {
    const list = data?.documents ?? [];
    return selectedPatientId === 'all' ? list : list.filter(d => d.entityId === selectedPatientId);
  }, [data, selectedPatientId]);


  const thCls = 'py-2 pr-4 text-[11px] uppercase tracking-wider text-slate-400';

  const { sortedRows: sortedAppointments, sortKey: apptSortKey, sortDir: apptSortDir, toggleSort: toggleApptSort, sortTypes: apptSortTypes } =
    useTableSort(appointments, APPOINTMENT_SORT_ACCESSORS, 'date', 'desc');
  const { sortedRows: sortedOpds, sortKey: opdSortKey, sortDir: opdSortDir, toggleSort: toggleOpdSort, sortTypes: opdSortTypes } =
    useTableSort(opds, OPD_SORT_ACCESSORS, 'date', 'desc');
  const { sortedRows: sortedTransactions, sortKey: paymentSortKey, sortDir: paymentSortDir, toggleSort: togglePaymentSort, sortTypes: paymentSortTypes } =
    useTableSort(transactions, PAYMENT_SORT_ACCESSORS, 'date', 'desc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/patient/detail/${id}`);
      setData(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load patient detail';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view && !permissions.isSuperAdmin) {
    return <AccessDenied moduleName="Patient Registration" />;
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 mb-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-700">{error || 'Patient not found'}</h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-5 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }



  const totalCredit = transactions.filter(t => t.paymentType === 'Credit').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalDebit = transactions.filter(t => t.paymentType === 'Debit').reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-6 pb-10">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Patient selector for multiple patients on same mobile number */}
      {data?.relatedPatients?.length > 1 && (
        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Multiple Patients found on mobile: {primaryPatient?.mobileNo}</p>
              <p className="text-xs text-slate-500">Showing combined records. Filter below to view a specific patient.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Select Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
            >
              <option value="all">All Patients ({data.relatedPatients.length})</option>
              {data.relatedPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patientName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
          {patient.patientPhoto ? (
            <img src={fileUrl(patient.patientPhoto)} alt={patient.patientName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-9 h-9 text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{patient.patientName}</h1>
            {patient.uhid && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600 border border-brand-100 px-2.5 py-1 rounded-full">
                UHID: {patient.uhid}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {patient.mobileNo}</span>
            {patient.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {patient.email}</span>}
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {patient.gender}{patient.age ? `, ${patient.age} yrs` : ''}</span>
            {patient.createdAt && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Created: {formatDate(patient.createdAt)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Received</p>
            <p className="text-base font-bold text-emerald-700">{money(totalCredit)}</p>
          </div>
          <div className="text-center px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Debit / Refund</p>
            <p className="text-base font-bold text-rose-700">{money(totalDebit)}</p>
          </div>
          {(isSuperAdmin || permissions.update) && (
            <button
              onClick={() => setEditPatientOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit Patient
            </button>
          )}
        </div>
      </div>

      {/* Personal & contact */}
      <Section icon={User} title="Personal & Contact">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <InfoRow label="Patient Name" value={patient.patientName} />
          <InfoRow label="Mobile" value={patient.mobileNo} />
          <InfoRow label="Alt. Mobile" value={patient.alternativeMobileNo} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Gender" value={patient.gender} />
          <InfoRow label="Age" value={patient.age} />
          <InfoRow label="Blood Group" value={patient.bloodGroup} />
          <InfoRow label="Occupation" value={patient.occupation} />
          <InfoRow label="Aadhar No." value={patient.aadharNo} />
          <InfoRow label="PAN No." value={patient.panNo} />
          <InfoRow label="Height" value={patient.height} />
          <InfoRow label="Weight" value={patient.weight} />
          <InfoRow label="Address" value={patient.address} />
          <InfoRow label="City" value={patient.city} />
          <InfoRow label="Pincode" value={patient.pincode} />
          <InfoRow label="Country" value={patient.country} />
          <InfoRow label="Registration Date" value={patient.registrationDate ? formatDate(patient.registrationDate) : null} />
          <InfoRow label="Created At" value={patient.createdAt ? formatDate(patient.createdAt) : null} />
        </div>
      </Section>

      {/* Medical & referral */}
      <Section icon={AlertCircle} title="Medical History" accent="rose">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <InfoRow label="Medical Alert" value={patient.MedicalAlert?.text} />
          <InfoRow label="Assigned Doctor" value={patient.Doctor?.name} />
          <InfoRow label="Referred By (Text)" value={patient.referredBy} />
          <InfoRow label="Family History" value={patient.familyHistory} />
        </div>
      </Section>

      {/* Appointments */}
      <Section icon={Calendar} title="Appointments" count={appointments.length} accent="purple"
        onAdd={(isSuperAdmin || apptPerms.add) ? () => setAddModalType('appointments') : undefined}
      >
        {appointments.length === 0 ? <EmptyRow text="No appointments recorded." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <SortableTh label="Date" sortKey="date" sortType={apptSortTypes.date} activeKey={apptSortKey} direction={apptSortDir} onSort={toggleApptSort} className={thCls} />
                  <SortableTh label="Treatment" sortKey="treatment" sortType={apptSortTypes.treatment} activeKey={apptSortKey} direction={apptSortDir} onSort={toggleApptSort} className={thCls} />
                  <SortableTh label="Doctor" sortKey="doctor" sortType={apptSortTypes.doctor} activeKey={apptSortKey} direction={apptSortDir} onSort={toggleApptSort} className={thCls} />
                  <SortableTh label="Status" sortKey="status" sortType={apptSortTypes.status} activeKey={apptSortKey} direction={apptSortDir} onSort={toggleApptSort} className={thCls} />
                  {selectedPatientId === 'all' && <th className={thCls}>Patient</th>}
                  <SortableTh label="Actions" sortable={false} className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedAppointments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{a.appointmentDate ? formatDate(a.appointmentDate) : '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{a.Treatment?.text || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{a.Doctor?.name || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{a.status || a.appointmentStatus || '—'}</td>
                    {selectedPatientId === 'all' && (
                      <td className="py-2.5 pr-4 text-slate-600 font-semibold">{a.Patient?.patientName || '—'}</td>
                    )}
                    <td className="py-2.5 pr-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {(isSuperAdmin || apptPerms.update) && (
                          <button
                            onClick={() => handleEditRecord('appointments', a)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Appointment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isSuperAdmin || apptPerms.delete) && (
                          <button
                            onClick={() => handleDeleteRecord('appointments', a.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Appointment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* OPD */}
      <Section icon={ClipboardList} title="Visit Records" count={opds.length} accent="sky"
        onAdd={(isSuperAdmin || opdPerms.add) ? () => setAddModalType('opd') : undefined}
      >
        {opds.length === 0 ? <EmptyRow text="No Visit records." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <SortableTh label="Date" sortKey="date" sortType={opdSortTypes.date} activeKey={opdSortKey} direction={opdSortDir} onSort={toggleOpdSort} className={thCls} />
                  <SortableTh label="Doctor" sortKey="doctor" sortType={opdSortTypes.doctor} activeKey={opdSortKey} direction={opdSortDir} onSort={toggleOpdSort} className={thCls} />
                  <SortableTh label="Status" sortKey="status" sortType={opdSortTypes.status} activeKey={opdSortKey} direction={opdSortDir} onSort={toggleOpdSort} className={thCls} />
                  <SortableTh label="Payment" sortKey="payment" sortType={opdSortTypes.payment} activeKey={opdSortKey} direction={opdSortDir} onSort={toggleOpdSort} className={thCls} />
                  <SortableTh label="Remark" sortable={false} className={thCls} />
                  {selectedPatientId === 'all' && <th className={thCls}>Patient</th>}
                  <SortableTh label="Actions" sortable={false} className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedOpds.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{o.date ? formatDate(o.date) : '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{o.Doctor?.name || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{o.Status?.text || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{o.PaymentBy?.text || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{o.remark || '—'}</td>
                    {selectedPatientId === 'all' && (
                      <td className="py-2.5 pr-4 text-slate-600 font-semibold">{o.Patient?.patientName || '—'}</td>
                    )}
                    <td className="py-2.5 pr-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {(isSuperAdmin || opdPerms.update) && (
                          <button
                            onClick={() => handleEditRecord('opd', o)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Visit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isSuperAdmin || opdPerms.delete) && (
                          <button
                            onClick={() => handleDeleteRecord('opd', o.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Visit Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Transactions */}
      <Section icon={IndianRupee} title="Payments & Transactions" count={transactions.length} accent="emerald"
        onAdd={(isSuperAdmin || txnPerms.add) ? () => setAddModalType('payments') : undefined}
      >
        {transactions.length === 0 ? <EmptyRow text="No transactions." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <SortableTh label="Date" sortKey="date" sortType={paymentSortTypes.date} activeKey={paymentSortKey} direction={paymentSortDir} onSort={togglePaymentSort} className={thCls} />
                  <SortableTh label="Type" sortKey="type" sortType={paymentSortTypes.type} activeKey={paymentSortKey} direction={paymentSortDir} onSort={togglePaymentSort} className={thCls} />
                  <SortableTh label="Category" sortKey="category" sortType={paymentSortTypes.category} activeKey={paymentSortKey} direction={paymentSortDir} onSort={togglePaymentSort} className={thCls} />
                  <SortableTh label="Mode" sortKey="mode" sortType={paymentSortTypes.mode} activeKey={paymentSortKey} direction={paymentSortDir} onSort={togglePaymentSort} className={thCls} />
                  <SortableTh label="Amount" sortKey="amount" sortType={paymentSortTypes.amount} activeKey={paymentSortKey} direction={paymentSortDir} onSort={togglePaymentSort} className={thCls} />
                  <SortableTh label="Remark" sortable={false} className={thCls} />
                  {selectedPatientId === 'all' && <th className={thCls}>Patient</th>}
                  <SortableTh label="Actions" sortable={false} className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{t.paymentDateTime ? formatDate(t.paymentDateTime) : '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.paymentType === 'Credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {t.paymentType}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{(t.paymentCategory || '').split(',').join(', ') || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{t.PaymentBy?.text || '—'}</td>
                    <td className={`py-2.5 pr-4 font-bold ${t.paymentType === 'Credit' ? 'text-emerald-700' : 'text-rose-700'}`}>{money(t.amount)}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{t.remark || '—'}</td>
                    {selectedPatientId === 'all' && (
                      <td className="py-2.5 pr-4 text-slate-600 font-semibold">{t.Patient?.patientName || '—'}</td>
                    )}
                    <td className="py-2.5 pr-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {(isSuperAdmin || txnPerms.update) && (
                          <button
                            onClick={() => handleEditRecord('payments', t)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Payment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isSuperAdmin || txnPerms.delete) && (
                          <button
                            onClick={() => handleDeleteRecord('payments', t.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Documents */}
      <Section icon={FileText} title="Documents" count={documents.length}
        onAdd={(isSuperAdmin || permissions.update) ? () => setAddModalType('documents') : undefined}
      >
        {documents.length === 0 ? <EmptyRow text="No documents uploaded." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map(d => {
              const isImg = (d.fileType || '').startsWith('image/');
              return (
                <a
                  key={d.id}
                  href={fileUrl(d.filePath)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {isImg ? (
                      <img src={fileUrl(d.filePath)} alt={d.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {d.DocumentType?.text || 'Untyped'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 truncate">{d.fileName}</p>
                    {d.note && <p className="text-[11px] text-slate-400 truncate italic">{d.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Eye className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                    {(isSuperAdmin || permissions.update) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteRecord('documents', d.id);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </Section>

      {editPatientOpen && (
        <PatientRegistrationModal
          isOpen={editPatientOpen}
          initialData={patient}
          onClose={() => setEditPatientOpen(false)}
          onSuccess={() => { setEditPatientOpen(false); fetchData(); }}
        />
      )}

      {(addModalType || editingRecordData) && (
        <PatientHistoryAddModal
          addType={addModalType || editingRecordData.type}
          patient={patient}
          patientDetail={patient}
          editingData={editingRecordData?.data || null}
          onClose={() => { setAddModalType(null); setEditingRecordData(null); }}
          onSuccess={() => { setAddModalType(null); setEditingRecordData(null); fetchData(); }}
        />
      )}
    </div>
  );
};

export default PatientDetail;
