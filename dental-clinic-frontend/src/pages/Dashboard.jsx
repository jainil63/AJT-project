import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays,
    CreditCard,
    Edit2,
    Eye,
    IndianRupee,
    Plus,
    RefreshCw,
    Stethoscope,
    UserPlus,
    Users
} from 'lucide-react';
import api from '../api/axios';
import useToast from '../hooks/useToast';
import usePermissions from '../hooks/usePermissions';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';
import { dateCol, numCol, textCol } from '../utils/sortColumnHelpers';
import EditVisitAndPaymentModal from '../components/modals/EditVisitAndPaymentModal';

const todayYmd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const inr = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PATIENT_SORT_ACCESSORS = {
    patientName: textCol((p) => p.patientName),
    mobileNo: textCol((p) => p.mobileNo),
    doctor: textCol((p) => p.doctor),
    patientType: textCol((p) => p.patientType),
    credit: numCol((p) => p.paymentSummary?.credit),
    balance: numCol((p) => p.paymentSummary?.balance),
    activityDate: dateCol((p) => p.activityDate)
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${tone}`}>
                <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
                <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const patientPerms = usePermissions('Patient Registration');
    const opdPerms = usePermissions('Visit');
    const appointmentPerms = usePermissions('Appointment Booking');
    const transactionPerms = usePermissions('Transactions');

    const [startDate, setStartDate] = useState(todayYmd());
    const [endDate, setEndDate] = useState(todayYmd());
    const [stats, setStats] = useState(null);
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const fetchStats = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            try {
                const res = await api.get('/dashboard/stats', {
                    params: { startDate, endDate }
                });
                const data = res.data?.data || res.data || {};
                setStats(data.stats || null);
                setPatients(data.todayPatients || []);
                setAppointments(data.appointments || []);
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to load dashboard', 'error');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [startDate, endDate, showToast]
    );

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(
        patients,
        PATIENT_SORT_ACCESSORS,
        'activityDate',
        'desc'
    );

    const quickActions = [
        {
            id: 'patient',
            title: 'Patients',
            desc: 'Register and manage patient records',
            icon: Users,
            basePath: '/super/patient-master',
            iconBg: 'bg-emerald-50 text-emerald-600',
            canAdd: patientPerms.add,
            canView: patientPerms.view
        },
        {
            id: 'appointment',
            title: 'Appointments',
            desc: 'Book and track appointments',
            icon: CalendarDays,
            basePath: '/super/appointment-booking',
            iconBg: 'bg-purple-50 text-purple-600',
            canAdd: appointmentPerms.add,
            canView: appointmentPerms.view
        },
        {
            id: 'visit',
            title: 'Visits',
            desc: 'Record treatments and clinical notes',
            icon: Stethoscope,
            basePath: '/super/opd-master',
            iconBg: 'bg-rose-50 text-rose-600',
            canAdd: opdPerms.add,
            canView: opdPerms.view
        },
        {
            id: 'transaction',
            title: 'Billing',
            desc: 'Invoices and payment records',
            icon: CreditCard,
            basePath: '/super/transactions',
            iconBg: 'bg-teal-50 text-teal-600',
            canAdd: transactionPerms.add,
            canView: transactionPerms.view
        }
    ].filter((a) => a.canAdd || a.canView);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Clinic Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">Overview of today&apos;s activities and performance</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => fetchStats(true)}
                        disabled={loading || refreshing}
                        className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 px-4 py-2 border border-slate-200 rounded-xl font-semibold text-sm transition-all shadow-sm shrink-0 cursor-pointer"
                        title="Refresh Dashboard Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <div className="flex items-center flex-wrap gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm w-full sm:w-auto">
                        <CalendarDays className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={startDate}
                                max={endDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer focus:outline-none max-w-[120px]"
                            />
                            <span className="text-slate-400 text-xs font-semibold">to</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer focus:outline-none max-w-[120px]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    icon={UserPlus}
                    label="New Patients"
                    value={stats?.todayPatients ?? 0}
                    tone="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    icon={Stethoscope}
                    label="Visits"
                    value={stats?.todayVisits ?? 0}
                    tone="bg-rose-50 text-rose-600"
                />
                <StatCard
                    icon={CalendarDays}
                    label="Appointments"
                    value={stats?.todayAppointments ?? 0}
                    tone="bg-purple-50 text-purple-600"
                />
                <StatCard
                    icon={IndianRupee}
                    label="Collection"
                    value={inr(stats?.todayCollection)}
                    tone="bg-teal-50 text-teal-600"
                />
            </div>

            {/* Quick Actions */}
            {quickActions.length > 0 && (
                <div>
                    <div className="flex items-center space-x-2 mb-5">
                        <div className="w-2 h-8 bg-brand-500 rounded-full"></div>
                        <h2 className="text-xl font-bold text-slate-800">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <div
                                    key={action.id}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 flex flex-col gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 leading-tight">{action.title}</h3>
                                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{action.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-auto">
                                        {action.canAdd && (
                                            <button
                                                onClick={() => navigate(`${action.basePath}?action=new`)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 font-semibold text-xs rounded-lg transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add
                                            </button>
                                        )}
                                        {action.canView && (
                                            <button
                                                onClick={() => navigate(action.basePath)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 font-semibold text-xs rounded-lg transition-all"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Patients in range */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-bold text-slate-800">Patients</h2>
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        {patients.length}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <SortableTh label="Patient" sortKey="patientName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-3" />
                                <SortableTh label="Contact" sortKey="mobileNo" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-3" />
                                <SortableTh label="Doctor" sortKey="doctor" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-3" />
                                <SortableTh label="Type" sortKey="patientType" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-3" />
                                <SortableTh label="Paid" sortKey="credit" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-3" />
                                <SortableTh label="Balance" sortKey="balance" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-3" />
                                <SortableTh label="Actions" sortable={false} align="right" className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td className="px-6 py-8 text-center text-slate-400" colSpan={7}>Loading…</td>
                                </tr>
                            )}
                            {!loading && sortedRows.length === 0 && (
                                <tr>
                                    <td className="px-6 py-8 text-center text-slate-400" colSpan={7}>
                                        No patient activity in this range.
                                    </td>
                                </tr>
                            )}
                            {!loading && sortedRows.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="font-semibold text-slate-800">{p.patientName}</div>
                                        {p.uhid && (
                                            <div className="text-[10px] text-brand-600 font-bold uppercase tracking-wider bg-brand-50 inline-block px-2 py-0.5 rounded-full mt-1">
                                                ID: {p.uhid}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{p.mobileNo}</td>
                                    <td className="px-6 py-3 text-slate-600">{p.doctor || '—'}</td>
                                    <td className="px-6 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.patientType === 'New' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {p.patientType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 font-semibold text-slate-800">{inr(p.paymentSummary?.credit)}</td>
                                    <td className="px-6 py-3 font-semibold text-slate-800">{inr(p.paymentSummary?.balance)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditTarget({ id: p.id, name: p.patientName, date: p.activityDate })}
                                                className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                                title="Edit visit & payment"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/super/patient/${p.id}`)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                                title="Open patient record"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Appointments in range */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
                    <h2 className="font-bold text-slate-800">Appointments</h2>
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        {appointments.length}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <th className="px-6 py-3 text-left font-semibold">Time</th>
                                <th className="px-6 py-3 text-left font-semibold">Patient</th>
                                <th className="px-6 py-3 text-left font-semibold">Treatment</th>
                                <th className="px-6 py-3 text-left font-semibold">Doctor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {appointments.length === 0 && (
                                <tr>
                                    <td className="px-6 py-8 text-center text-slate-400" colSpan={4}>
                                        No appointments in this range.
                                    </td>
                                </tr>
                            )}
                            {appointments.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-3 font-semibold text-slate-700">{a.time || '—'}</td>
                                    <td className="px-6 py-3 text-slate-700">{a.patient}</td>
                                    <td className="px-6 py-3 text-slate-600">{a.treatment}</td>
                                    <td className="px-6 py-3 text-slate-600">{a.doctor || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editTarget && (
                <EditVisitAndPaymentModal
                    isOpen={true}
                    onClose={() => setEditTarget(null)}
                    onSuccess={() => {
                        setEditTarget(null);
                        fetchStats(true);
                    }}
                    patientId={editTarget.id}
                    patientName={editTarget.name}
                    patientDate={editTarget.date}
                />
            )}
        </div>
    );
};

export default Dashboard;
