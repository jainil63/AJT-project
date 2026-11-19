import React, { useState, useEffect, useMemo } from 'react';
import {
 Plus,
 Edit2,
 Calendar,
 X,
 Trash2,
 Clock,
 User,
 UserPlus,
 Stethoscope,
 FileText,
 Building2,
 CalendarCheck,
 ChevronDown,
 Activity,
 Clock3,
 CheckCircle2,
 Layout,
 RefreshCw,
 Filter,
 Search
} from 'lucide-react';
import FilterModal from '../components/common/FilterModal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { countActiveFilters, matchesDateRange, matchesIds } from '../utils/filterUtils';

const EMPTY_APPT_FILTERS = {
 doctorIds: [],
 source: 'all',
 status: 'all',
 fromDate: '',
 toDate: '',
};

const APPT_FILTER_KEYS = [
 { key: 'doctorIds', type: 'array' },
 { key: 'source', type: 'string' },
 { key: 'status', type: 'string' },
 { key: 'fromDate', type: 'date' },
 { key: 'toDate', type: 'date' },
];
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import { formatDate } from '../utils/dateUtils';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';
import TimeSlotSelect from '../components/common/TimeSlotSelect';

const SORT_ACCESSORS = {
 schedule: { getValue: (a) => `${a.appointmentDate} ${a.appointmentTime || ''}`, type: 'date' },
 patient: (a) => a.Patient?.patientName || a.Lead?.name,
 doctor: (a) => a.Doctor?.name,
 treatment: (a) => a.treatmentType,
 status: (a) => a.status,
};
import PatientRegistrationModal from '../components/modals/PatientRegistrationModal';

const AppointmentMaster = () => {
 const { showToast } = useToast();
 const confirm = useConfirm();
 const location = useLocation();
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [editingId, setEditingId] = useState(null);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [modalSearchTerm, setModalSearchTerm] = useState('');

 // Patient edit modal — opened from the patient search results inside the appointment form
 const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
 const [editingPatient, setEditingPatient] = useState(null);

 const [isFilterOpen, setIsFilterOpen] = useState(false);
 const [filterData, setFilterData] = useState(EMPTY_APPT_FILTERS);

 // Master Data
 const [appointments, setAppointments] = useState([]);
 const [patients, setPatients] = useState([]);
 const [doctors, setDoctors] = useState([]);
 const [treatments, setTreatments] = useState([]);

 const [formData, setFormData] = useState({
 patientId: '',
 doctorId: '',
 appointmentDate: '',
 appointmentTime: '',
 duration: 15,
 treatmentId: '',
 note: ''
 });

 const permissions = usePermissions('Appointment Booking');
 const user = JSON.parse(localStorage.getItem('user') || '{}');

 const fetchData = async () => {
 try {
 setLoading(true);
 const [
 appointmentsRes,
 patientsRes,
 doctorsRes,
 treatmentsRes
 ] = await Promise.all([
 api.get('/appointment/getAppointments'),
 api.get('/patient/getPatient?limit=all'), // FIXED PATH
 api.get('/doctor/getDoctors'),
 api.get('/treatment/getTreatment')
 ]);

 setAppointments(appointmentsRes.data.data || []);
 setPatients(patientsRes.data.data || []);
 setDoctors(doctorsRes.data.data || []);
 setTreatments(treatmentsRes.data.data || []);
 } catch (error) {
 console.error('Error fetching data:', error);
 // Don't show toast for every error if it's permission related, but log it
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();

 // Handle action=new from dashboard
 const params = new URLSearchParams(location.search);
 if (params.get('action') === 'new') {
 resetForm();
 setIsModalOpen(true);
 }
 }, [location.search]);

 const resetForm = () => {

 setFormData({
 patientId: '',
 doctorId: '',
 appointmentDate: new Date().toISOString().split('T')[0],
 appointmentTime: '',
 duration: 15,
 treatmentId: '',
 note: ''
 });
 setModalSearchTerm('');
 setIsEditing(false);
 setEditingId(null);
 };


 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => {
 const next = { ...prev, [name]: value };
 return next;
 });
 };

 const handleEdit = (appointment) => {
 setFormData({
 patientId: appointment.patientId,
 doctorId: appointment.doctorId,
 appointmentDate: appointment.appointmentDate.split('T')[0],
 appointmentTime: appointment.appointmentTime,
 duration: appointment.duration,
 treatmentId: appointment.treatmentId || '',
 note: appointment.note || ''
 });
 setEditingId(appointment.id);
 setIsEditing(true);
 setModalSearchTerm(appointment.Patient?.patientName || '');
 setIsModalOpen(true);
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 setSaving(true);
 const method = isEditing ? 'put' : 'post';
 const url = isEditing ? `/appointment/updateAppointment/${editingId}` : '/appointment/addAppointment';

 const payload = {
 ...formData,
 treatmentId: formData.treatmentId || null
 };

 const response = await api[method](url, payload);

 if (response.data.success) {
 showToast(response.data.message || 'Appointment saved successfully', 'success');
 fetchData();
 setIsModalOpen(false);
 resetForm();
 }
 } catch (error) {
 console.error('Error saving appointment:', error);
 showToast(error.response?.data?.message || 'Error saving appointment', 'error');
 } finally {
 setSaving(false);
 }
 };

 const STATUS_META = {
 pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-600 border-amber-100' },
 visit: { label: 'Visited', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
 'no-visit': { label: 'No Visit', badge: 'bg-rose-50 text-rose-600 border-rose-100' }
 };

 const handleStatusChange = async (app, newStatus) => {
 if ((app.status || 'pending') === newStatus) return;
 try {
 const response = await api.put(`/appointment/updateAppointment/${app.id}`, {
 patientId: app.patientId,
 doctorId: app.doctorId,
 appointmentDate: app.appointmentDate
 ? app.appointmentDate.split('T')[0]
 : app.appointmentDate,
 appointmentTime: app.appointmentTime,
 duration: app.duration,
 treatmentId: app.treatmentId || null,
 note: app.note || '',
 status: newStatus
 });
 if (response.data.success) {
 showToast('Visit status updated', 'success');
 fetchData();
 }
 } catch (error) {
 console.error('Error updating status:', error);
 showToast(error.response?.data?.message || 'Error updating status', 'error');
 }
 };

 const handleDelete = async (id) => {
 const isConfirmed = await confirm({
 title: 'Cancel Appointment',
 message: 'Are you sure you want to cancel this appointment?',
 type: 'danger'
 });

 if (!isConfirmed) return;

 try {
 const response = await api.delete(`/appointment/deleteAppointment/${id}`);
 if (response.data.success) {
 showToast('Appointment cancelled successfully', 'success');
 fetchData();
 }
 } catch (error) {
 showToast('Error cancelling appointment', 'error');
 }
 };

 const activeFilterCount = useMemo(
 () => countActiveFilters(filterData, APPT_FILTER_KEYS),
 [filterData]
 );

 const apptFilterFields = useMemo(() => [
 { type: 'multiselect', key: 'doctorIds', label: 'Doctor', options: doctors, labelKey: 'name', placeholder: 'All Doctors' },
 { type: 'select', key: 'source', label: 'Source', options: [
 { value: 'all', label: 'All Sources' },
 { value: 'online', label: 'Online (Lead)' },
 { value: 'offline', label: 'Offline' },
 ]},
 { type: 'select', key: 'status', label: 'Status', options: [
 { value: 'all', label: 'All Status' },
 { value: 'pending', label: 'Pending' },
 { value: 'visit', label: 'Visited' },
 { value: 'no-visit', label: 'No Visit' },
 ]},
 { type: 'date', key: 'fromDate', label: 'From Date' },
 { type: 'date', key: 'toDate', label: 'To Date' },
 ], [doctors]);

 const filteredAppointments = useMemo(() => appointments.filter(app => {
 const q = searchTerm.trim().toLowerCase();
 if (q) {
 const matchesSearch =
 (app.Patient?.patientName || app.Lead?.name)?.toLowerCase().includes(q) ||
 app.Doctor?.name?.toLowerCase().includes(q) ;
 if (!matchesSearch) return false;
 }
 if (!matchesIds(app.doctorId, filterData.doctorIds)) return false;
 const matchesSource =
 filterData.source === 'all' ||
 (filterData.source === 'online' && !!app.leadId) ||
 (filterData.source === 'offline' && !app.leadId);
 if (!matchesSource) return false;
 if (filterData.status !== 'all' && (app.status || 'pending') !== filterData.status) return false;
 if (!matchesDateRange(app.appointmentDate, filterData.fromDate, filterData.toDate)) return false;
 return true;
 }).sort((a, b) => {
 const parseDateTime = (dateStr, timeStr) => {
 const d = new Date(dateStr);
 const [hours, minutes] = (timeStr || '00:00').split(':');
 d.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0, 0, 0);
 return d.getTime();
 };

 const timeA = parseDateTime(a.appointmentDate, a.appointmentTime);
 const timeB = parseDateTime(b.appointmentDate, b.appointmentTime);
 const now = Date.now();

 const isFutureA = timeA >= now;
 const isFutureB = timeB >= now;

 if (isFutureA && isFutureB) {
 // Both in future: sort ASC (closest to now comes first)
 return timeA - timeB;
 } else if (!isFutureA && !isFutureB) {
 // Both in past: sort DESC (most recently missed comes first among past items)
 return timeB - timeA;
 } else {
 // One future, one past: Future always placed above past
 return isFutureA ? -1 : 1;
 }
 }), [appointments, searchTerm, filterData]);

 const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredAppointments, SORT_ACCESSORS, 'schedule', 'desc');

 // Filtered patients for modal search
 const modalSearchResults = modalSearchTerm.trim() !== ''
 ? patients.filter(p =>
 p.patientName?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
 p.mobileNo?.includes(modalSearchTerm)
 )
 : [];

 const handleSelectPatient = (patient) => {
 setFormData(prev => ({ ...prev, patientId: patient.id }));
 setModalSearchTerm(patient.patientName);
 };

 // Open the Patient modal in edit mode for a patient picked from the search results
 const handleEditPatient = (patient) => {
 setEditingPatient(patient);
 setIsPatientModalOpen(true);
 };

 const handlePatientModalSuccess = (savedPatient) => {
 // Refresh data so the updated patient is reflected in search
 fetchData();
 // If the edited patient is the one selected in the form, refresh its label
 if (formData.patientId === savedPatient.id) {
 setModalSearchTerm(savedPatient.patientName);
 }
 setIsPatientModalOpen(false);
 setEditingPatient(null);
 };

 if (permissions.loading) {
 return (
 <div className="h-full flex items-center justify-center p-12">
 <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
 </div>
 );
 }
  if (!permissions.view) {
    return <AccessDenied moduleName="Appointment Booking" />;
  }


 return (
 <div className="h-full flex flex-col space-y-4">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
 <CalendarCheck className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-slate-800">Appointment Master</h1>
 <p className="text-slate-500 text-sm mt-1">Schedule and manage patient clinical visits</p>
 </div>
 </div>
 {permissions.add && (
 <button
 className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
 onClick={() => { resetForm(); setIsModalOpen(true); }}
 >
 <Plus className="w-5 h-5" />
 Book Appointment
 </button>
 )}
 </div>

 <SearchFilterBar
 searchValue={searchTerm}
 onSearchChange={setSearchTerm}
 searchPlaceholder="Search patient, doctor..."
 onFilterClick={() => setIsFilterOpen(true)}
 activeFilterCount={activeFilterCount}
 filteredCount={filteredAppointments.length}
 totalCount={appointments.length}
 recordLabel="appointments"
                exportModule="appointment"
            exportRows={filteredAppointments}
 >
 <button
 type="button"
 onClick={fetchData}
 disabled={loading}
 className="shrink-0 h-11 w-11 flex items-center justify-center text-slate-500 hover:text-brand-600 border border-slate-200 rounded-xl hover:bg-brand-50 transition-all disabled:opacity-50"
 title="Refresh"
 >
 <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
 </button>
 </SearchFilterBar>

 <FilterModal
 isOpen={isFilterOpen}
 onClose={() => setIsFilterOpen(false)}
 title="Filter Appointments"
 filterData={filterData}
 setFilterData={setFilterData}
 emptyFilters={EMPTY_APPT_FILTERS}
 activeFilterCount={activeFilterCount}
 filteredCount={filteredAppointments.length}
 totalCount={appointments.length}
 fields={apptFilterFields}
 resultLabel="appointments"
 />

 {/* Main Content */}
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-brand-500" />
 <span className="text-sm font-bold text-slate-700">Appointment Records</span>
 </div>
 <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-slate-100">
 Results: {filteredAppointments.length}
 </span>
 </div>

 <div className="overflow-x-auto flex-1 custom-scrollbar">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-[0.15em] font-bold border-b border-slate-100">
 <SortableTh label="Schedule" sortKey="schedule" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
 <SortableTh label="Patient Details" sortKey="patient" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
 <SortableTh label="Doctor" sortKey="doctor" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
 <SortableTh label="Treatment" sortKey="treatment" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
 <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
 <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {loading ? (
 <tr>
 <td colSpan="7" className="px-6 py-12 text-center text-slate-400">Loading appointments...</td>
 </tr>
 ) : filteredAppointments.length > 0 ? (
 sortedRows.map((app) => (
 <tr key={app.id} className="hover:bg-slate-50/80 transition-colors group">
 <td className="px-6 py-4">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <Calendar className="w-3.5 h-3.5 text-brand-500" />
 <span className="text-sm font-bold text-slate-700">
 {formatDate(app.appointmentDate)}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Clock className="w-3.5 h-3.5 text-slate-400" />
 <span className="text-xs text-slate-500 font-medium">{app.appointmentTime} ({app.duration}m)</span>
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
 {(app.Patient?.patientName || app.Lead?.name)?.charAt(0)}
 </div>
 <div>
 <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
 {app.Patient?.patientName || app.Lead?.name}
 {!app.Patient && app.Lead && (
 <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100">Lead</span>
 )}
 </div>
 <div className="text-[11px] text-slate-500 font-medium">{app.Patient?.mobileNo || app.Lead?.mobileNo}</div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
 <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
 Dr. {app.Doctor?.name}
 </div>
 </td>
 <td className="px-6 py-4">
 <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded inline-block">
 </span>
 </td>
 <td className="px-6 py-4">
 {app.Treatment ? (
 <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase">
 {app.Treatment.text}
 </span>
 ) : (
 <span className="text-slate-300 italic text-xs">Unspecified</span>
 )}
 </td>
 <td className="px-6 py-4">
 {permissions.update ? (
 <select
 value={app.status || 'pending'}
 onChange={(e) => handleStatusChange(app, e.target.value)}
 className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${(STATUS_META[app.status] || STATUS_META.pending).badge}`}
 >
 <option value="pending">Pending</option>
 <option value="visit">Visited</option>
 <option value="no-visit">No Visit</option>
 </select>
 ) : (
 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${(STATUS_META[app.status] || STATUS_META.pending).badge}`}>
 {(STATUS_META[app.status] || STATUS_META.pending).label}
 </span>
 )}
 </td>
 <td className="px-6 py-4 text-right">
 <div className="flex justify-end gap-1 ">
 {permissions.update && (
 <button onClick={() => handleEdit(app)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
 <Edit2 className="w-4 h-4" />
 </button>
 )}
 {permissions.delete && (
 <button onClick={() => handleDelete(app.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="7" className="px-6 py-20 text-center">
 <div className="flex flex-col items-center gap-2 text-slate-400">
 <Calendar className="w-10 h-10 opacity-20" />
 <p className="text-sm font-medium">No appointments found</p>
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Book Appointment Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-200 animate-fade-in-up">
 {/* Modal Header */}
 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-70">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 shadow-sm">
 <UserPlus className="w-5 h-5 text-brand-600" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'Modify Appointment' : 'New Appointment Booking'}</h2>
 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Clinical Schedule Management</p>
 </div>
 </div>
 <button
 onClick={() => { setIsModalOpen(false); resetForm(); }}
 className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-full transition-colors group"
 >
 <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
 </button>
 </div>

 <form className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20" onSubmit={handleSubmit}>
 <div className="p-6 space-y-6 max-w-5xl mx-auto">
 {/* Section: Schedule Details */}
 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
 <Clock3 className="w-4 h-4 text-brand-600" />
 </div>
 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Schedule Information</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Visit Date <span className="text-rose-500">*</span></label>
 <div className="relative group">
 <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
 <input
 type="date"
 name="appointmentDate"
 required
 value={formData.appointmentDate}
 onChange={handleInputChange}
 className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Visit Time <span className="text-rose-500">*</span></label>
 <div className="relative group">
 <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors z-10" />
 <TimeSlotSelect
 name="appointmentTime"
 required
 value={formData.appointmentTime}
 onChange={handleInputChange}
 placeholder="Select Time"
 className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 bg-white"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Duration (Min) <span className="text-rose-500">*</span></label>
 <input
 type="number"
 name="duration"
 required
 min="5"
 step="5"
 value={formData.duration}
 onChange={handleInputChange}
 className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800"
 />
 </div>
 </div>
 </div>

 {/* Section: Patient & Doctor */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
 <User className="w-4 h-4 text-blue-600" />
 </div>
 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Patient Selection</h3>
 </div>

 <div className="space-y-4">
 <div className="relative group">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
 <input
 type="text"
 placeholder="Search patient by name or mobile..."
 value={modalSearchTerm}
 onChange={(e) => {
 setModalSearchTerm(e.target.value);
 setFormData(prev => ({ ...prev, patientId: '' }));
 }}
 className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium border-slate-200 text-slate-800`}
 />

 {/* Search Results Dropdown */}
 {modalSearchTerm && !formData.patientId && modalSearchResults.length > 0 && (
 <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-80 max-h-64 overflow-y-auto custom-scrollbar border-t-4 border-t-brand-500">
 {modalSearchResults.map(p => (
 <div
 key={p.id}
 className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
 >
 <button
 type="button"
 onClick={() => handleSelectPatient(p)}
 className="flex items-center gap-3 flex-1 min-w-0 text-left"
 >
 <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
 {p.patientName?.charAt(0)}
 </div>
 <div className="min-w-0">
 <div className="text-sm font-bold text-slate-800 truncate">{p.patientName}</div>
 <div className="text-[10px] text-slate-500 flex items-center gap-2">
 <span>{p.mobileNo}</span>
 </div>
 </div>
 </button>
 <button
 type="button"
 onClick={() => handleEditPatient(p)}
 title="Edit this patient"
 className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 {modalSearchTerm && !formData.patientId && modalSearchResults.length === 0 && (
 <p className="text-[10px] text-amber-600 font-bold italic ml-1">No patients found. Please cross-verify name/mobile.</p>
 )}
 </div>
 </div>

 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
 <Stethoscope className="w-4 h-4 text-indigo-600" />
 </div>
 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Assign Practitioner</h3>
 </div>

 <div className="space-y-2">
 <div className="relative group">
 <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
 <select
 name="doctorId"
 required
 value={formData.doctorId}
 onChange={handleInputChange}
 className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 bg-white appearance-none cursor-pointer"
 >
 <option value="">Select Practitioner</option>
 {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
 </select>
 <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-500 transition-colors" />
 </div>
 </div>
 </div>
 </div>

 {/* Section: Clinical context */}
 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
 <Activity className="w-4 h-4 text-emerald-600" />
 </div>
 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Clinical Context</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="md:col-span-1 space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Expected Treatment</label>
 <div className="relative group">
 <Layout className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
 <select
 name="treatmentId"
 value={formData.treatmentId}
 onChange={handleInputChange}
 className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 bg-white appearance-none cursor-pointer"
 >
 <option value="">No specific treatment</option>
 {treatments.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
 </select>
 <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-500 transition-colors" />
 </div>
 </div>
 </div>

 <div className="md:col-span-2 space-y-1.5">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Appointment Notes / Complaints</label>
 <div className="relative group">
 <FileText className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
 <textarea
 name="note"
 rows="3"
 value={formData.note}
 onChange={handleInputChange}
 placeholder="Brief description of the visit or patient complaints..."
 className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 bg-white resize-none"
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Modal Footer */}
 <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 z-80">
 <button
 type="button"
 onClick={() => { setIsModalOpen(false); resetForm(); }}
 disabled={saving}
 className="px-6 py-2.5 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-200/50 transition-all disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving || !formData.patientId}
 className="px-10 py-2.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-500 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
 >
 {saving ? (
 <>
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 <span>Processing...</span>
 </>
 ) : (
 <>
 <CheckCircle2 className="w-4 h-4" />
 <span>{isEditing ? 'Confirm Update' : 'Schedule Appointment'}</span>
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 <PatientRegistrationModal
 isOpen={isPatientModalOpen}
 initialData={editingPatient}
 onClose={() => {
 setIsPatientModalOpen(false);
 setEditingPatient(null);
 }}
 onSuccess={handlePatientModalSuccess}
 />
 </div>
 );
};

export default AppointmentMaster;
