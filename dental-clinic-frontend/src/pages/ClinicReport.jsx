import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarRange, IndianRupee, Stethoscope, UserPlus } from 'lucide-react';
import api from '../api/axios';
import useToast from '../hooks/useToast';

const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

const inr = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const StatCard = ({ icon: Icon, label, value, tone }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>
                <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{value}</p>
            </div>
        </div>
    </div>
);

const BreakdownTable = ({ title, rows, labelKey, valueKey, formatValue }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td className="px-4 py-6 text-center text-slate-400" colSpan={2}>
                                No records in this range
                            </td>
                        </tr>
                    )}
                    {rows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                            <td className="px-4 py-2.5 text-slate-700">{row[labelKey]}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                                {formatValue ? formatValue(row[valueKey]) : row[valueKey]}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ClinicReport = () => {
    const { showToast } = useToast();
    const [fromDate, setFromDate] = useState(daysAgoYmd(29));
    const [toDate, setToDate] = useState(todayYmd());
    const [report, setReport] = useState(null);
    const [daily, setDaily] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = { fromDate, toDate };
            const [summaryRes, dailyRes] = await Promise.all([
                api.get('/report/clinic', { params }),
                api.get('/report/daily', { params })
            ]);
            setReport(summaryRes.data?.data || null);
            setDaily(dailyRes.data?.data || []);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to load report', 'error');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, showToast]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const summary = report?.summary;

    const totals = useMemo(
        () =>
            daily.reduce(
                (acc, row) => ({
                    registrations: acc.registrations + (row.registrations || 0),
                    visits: acc.visits + (row.visits || 0),
                    collection: acc.collection + (row.collection || 0)
                }),
                { registrations: 0, visits: 0, collection: 0 }
            ),
        [daily]
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Clinic Report</h1>
                    <p className="text-sm text-slate-500">Registrations, visits and collections for a date range.</p>
                </div>
                <div className="sm:ml-auto flex flex-wrap items-end gap-3">
                    <label className="text-xs font-semibold text-slate-500">
                        From
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                        To
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate}
                            max={todayYmd()}
                            onChange={(e) => setToDate(e.target.value)}
                            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                    </label>
                </div>
            </div>

            {loading && <p className="text-sm text-slate-500">Loading report…</p>}

            {!loading && summary && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            icon={UserPlus}
                            label="New Patients"
                            value={summary.newPatients}
                            tone="bg-emerald-50 text-emerald-600"
                        />
                        <StatCard
                            icon={Stethoscope}
                            label="Visits"
                            value={summary.visits}
                            tone="bg-rose-50 text-rose-600"
                        />
                        <StatCard
                            icon={CalendarRange}
                            label="Appointments"
                            value={summary.appointments}
                            tone="bg-purple-50 text-purple-600"
                        />
                        <StatCard
                            icon={IndianRupee}
                            label="Collection"
                            value={inr(summary.totalCollection)}
                            tone="bg-teal-50 text-teal-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                        <BreakdownTable
                            title="Visits by Doctor"
                            rows={report.byDoctor}
                            labelKey="doctor"
                            valueKey="visits"
                        />
                        <BreakdownTable
                            title="Visits by Treatment"
                            rows={report.byTreatment}
                            labelKey="treatment"
                            valueKey="visits"
                        />
                        <BreakdownTable
                            title="Collection by Payment Mode"
                            rows={report.byPaymentMode}
                            labelKey="mode"
                            valueKey="total"
                            formatValue={inr}
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-violet-500" />
                            <h3 className="font-semibold text-slate-800">Day-wise Breakdown</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[520px]">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Registrations</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Visits</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Collection</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daily.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                                                No activity in this range
                                            </td>
                                        </tr>
                                    )}
                                    {daily.map((row) => (
                                        <tr key={row.date} className="border-t border-slate-100">
                                            <td className="px-4 py-2.5 text-slate-700">{row.date}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-900">{row.registrations}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-900">{row.visits}</td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                                {inr(row.collection)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {daily.length > 0 && (
                                    <tfoot className="bg-slate-50 font-semibold text-slate-900">
                                        <tr>
                                            <td className="px-4 py-2.5">Total</td>
                                            <td className="px-4 py-2.5 text-right">{totals.registrations}</td>
                                            <td className="px-4 py-2.5 text-right">{totals.visits}</td>
                                            <td className="px-4 py-2.5 text-right">{inr(totals.collection)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ClinicReport;
