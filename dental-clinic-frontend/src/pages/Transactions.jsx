import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Landmark, Trash2, Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, CreditCard, MessageSquare, IndianRupee, Clock, ChevronDown, X, Search, UploadCloud } from 'lucide-react';
import ExcelImportModal from '../components/modals/ExcelImportModal';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import FilterModal from '../components/common/FilterModal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { formatDate } from '../utils/dateUtils';
import { countActiveFilters } from '../utils/filterUtils';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';
import { dateCol, numCol, textCol } from '../utils/sortColumnHelpers';

const SORT_ACCESSORS = {
    dateTime: dateCol((t) => t.paymentDateTime),
    patient: textCol((t) => t.Patient?.patientName || 'Walk-in'),
    type: textCol((t) => t.paymentType),
    paymentMode: textCol((t) => t.PaymentBy?.text),
    amount: numCol((t) => parseFloat(t.amount || 0)),
};

const EMPTY_TX_FILTERS = {
      paymentByIds: [],
    paymentType: 'All',
    fromDate: '',
    toDate: '',
};

const TX_FILTER_KEYS = [
      { key: 'paymentByIds', type: 'array' },
    { key: 'paymentType', type: 'string' },
    { key: 'fromDate', type: 'date' },
    { key: 'toDate', type: 'date' },
];

const Transactions = () => {
    const { showToast } = useToast();
    const confirm = useConfirm();
    const permissions = usePermissions('Transactions');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [patients, setPatients] = useState([]);
    const [paymentByMasters, setPaymentByMasters] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
      const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterData, setFilterData] = useState(EMPTY_TX_FILTERS);
    const [page, setPage] = useState(1);
    const limit = 50;
    const [selectedIds, setSelectedIds] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [serverStats, setServerStats] = useState({ totalCredits: 0, totalDebits: 0 });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    // Helper to get local ISO string for datetime-local input
    const getLocalISOString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now - offset).toISOString().slice(0, 16);
    };

    // Form State
    const [formData, setFormData] = useState({
        patientId: '',
        patientName: '',
        paymentType: 'Credit',
        paymentById: '',
        amount: '',
        paymentDateTime: getLocalISOString(),
        remark: '',
        });

    const [patientBalance, setPatientBalance] = useState(null);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const fetchMasters = useCallback(async () => {
        try {
            const [patientRes, payByRes] = await Promise.all([
                api.get('/patient/getPatient?limit=all'),
                api.get('/paymentBy/getPaymentBy?forCurrentUser=true'),
            ]);
            setPatients(patientRes.data.data || []);
            setPaymentByMasters(payByRes.data.data || []);
        } catch (error) {
            console.error('Error fetching masters:', error);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit, search: debouncedSearch };
            if (filterData.paymentByIds.length) params.paymentByIds = filterData.paymentByIds.join(',');
            if (filterData.paymentType !== 'All') params.paymentType = filterData.paymentType;
            if (filterData.fromDate) params.fromDate = filterData.fromDate;
            if (filterData.toDate) params.toDate = filterData.toDate;
            const res = await api.get('/transaction/getTransactions', { params });
            const rows = res.data.data || [];
            if (rows.length === 0 && page > 1) { setPage(p => Math.max(1, p - 1)); return; }
            setTransactions(rows);
            setPagination(res.data.pagination || { total: 0, totalPages: 1 });
            setServerStats(res.data.stats || { totalCredits: 0, totalDebits: 0 });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showToast('Failed to load transactions', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, filterData, showToast]);

    useEffect(() => { fetchMasters(); }, [fetchMasters]);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
    useEffect(() => { setPage(1); }, [debouncedSearch, filterData]);

    const handleImport = async (rawData) => {
        const getVal = (row, ...keys) => {
            const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim()));
            const val = foundKey ? row[foundKey] : '';
            return val ? String(val).trim() : '';
        };

        const allMapped = rawData.map(row => ({
            patientName: getVal(row, 'Patient Name', 'Patient name', 'Name'),
            mobileNo: getVal(row, 'Phone', 'Mobile', 'Mobile No'),
            paymentMode: getVal(row, 'paymentMode', 'Payment Mode', 'payment mode', 'Mode', 'Payment Method'),
            amountPaid: getVal(row, 'amountPaid', 'Amount Paid', 'Amount'),
            createdAt: getVal(row, 'createdAt', 'Created At', 'Date', 'Payment Date') || null,
        }));

        const payments = allMapped.filter(p => p.amountPaid);
        const frontendSkipped = allMapped.length - payments.length;

        if (payments.length === 0) {
            showToast(`No valid rows found — Amount Paid is required (${frontendSkipped} rows had no amount)`, 'error');
            return;
        }

        const response = await api.post('/transaction/bulkAddTransactions', { payments });
        const { createdCount = 0, skippedCount = 0 } = response.data || {};
        const totalSkipped = skippedCount + frontendSkipped;
        const parts = [`${createdCount} of ${rawData.length} payments imported`];
        if (totalSkipped > 0) parts.push(`${totalSkipped} skipped (${skippedCount} patient/mode not found, ${frontendSkipped} had no amount)`);
        showToast(parts.join(' — '), totalSkipped > 0 && createdCount === 0 ? 'error' : 'success');

        fetchTransactions();
    };

    const fetchPatientBalance = async (pId) => {
        if (!pId) {
            setPatientBalance(null);
            return;
        }
        try {
            const res = await api.get(`/transaction/getPatientBalance/${pId}`);
            setPatientBalance(res.data.data?.outstandingBalance || 0);
        } catch (error) {
            console.error('Error fetching balance:', error);
            setPatientBalance(null);
        }
    };

    const handlePatientSelect = (p) => {
        setFormData(prev => ({
            ...prev,
            patientId: p.id,
            patientName: p.patientName
        }));
        setModalSearchTerm('');
        fetchPatientBalance(p.id);
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.paymentById) {
            showToast('Please fill required fields', 'error');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount)
            };
            if (!payload.patientId) delete payload.patientId;

            const res = await api.post('/transaction/addTransaction', payload);
            showToast(res.data.message || 'Transaction added successfully', 'success');
            setIsAddModalOpen(false);

            fetchTransactions();

            // Reset form
            setFormData({
                patientId: '',
                patientName: '',
                paymentType: 'Credit',
                paymentById: '',
                amount: '',
                paymentDateTime: getLocalISOString(),
                remark: '',
                        });
            setPatientBalance(null);
        } catch (error) {
            console.error('Error adding transaction:', error);
            showToast(error.response?.data?.message || 'Failed to add transaction', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleTransactionSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === transactions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(transactions.map(t => t.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        const isConfirmed = await confirm({
            title: 'Delete Selected Transactions',
            message: `Are you sure you want to delete the ${selectedIds.length} selected transaction records?`,
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await api.post('/transaction/bulkDelete', { ids: selectedIds });
            showToast('Transactions deleted successfully', 'success');
            setSelectedIds([]);
            fetchTransactions();
        } catch (error) {
            console.error('Error batch deleting transactions:', error);
            showToast(error.response?.data?.message || 'Failed to delete transactions', 'error');
        }
    };

    const handleDeleteTransaction = async (id) => {
        const isConfirmed = await confirm({
            title: 'Delete Transaction',
            message: 'Are you sure you want to delete this transaction record?',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            await api.delete(`/transaction/deleteTransaction/${id}`);
            showToast('Transaction deleted successfully', 'success');
            setTransactions(prev => prev.filter(t => t.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
        } catch (error) {
            showToast('Error deleting transaction', 'error');
        }
    };

    useEffect(() => { setSelectedIds([]); }, [page, debouncedSearch, filterData]);

    const activeFilterCount = useMemo(
        () => countActiveFilters(filterData, TX_FILTER_KEYS),
        [filterData]
    );

    const txFilterFields = useMemo(
        () => [
            { type: 'select', key: 'paymentType', label: 'Type', options: [
                { value: 'All', label: 'All Types' },
                { value: 'Credit', label: 'Credit' },
                { value: 'Debit', label: 'Debit' },
            ]},
            { type: 'multiselect', key: 'paymentByIds', label: 'Payment Method', options: paymentByMasters, labelKey: 'text', placeholder: 'All Methods' },
            { type: 'date', key: 'fromDate', label: 'From Date' },
            { type: 'date', key: 'toDate', label: 'To Date' },
        ],
        [paymentByMasters]
    );

    const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(transactions, SORT_ACCESSORS, 'dateTime', 'desc');

    const stats = { credits: serverStats.totalCredits, debits: serverStats.totalDebits };

    const modalSearchResults = useMemo(() => {
        if (!modalSearchTerm) return [];
        const term = modalSearchTerm.toLowerCase();
        return patients.filter(p =>
            p.patientName?.toLowerCase().includes(term) ||
            p.mobileNo?.includes(term)
        );
    }, [patients, modalSearchTerm]);

    if (permissions.loading) {
        return (
            <div className="h-full flex items-center justify-center p-12">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!permissions.view) {
        return <AccessDenied moduleName="Transactions" />;
    }

    return (
        <div className="h-full flex flex-col space-y-3 sm:space-y-4 md:space-y-6 pb-4 md:pb-8">
            {/* Header — compact on phone so list fits more rows */}
            <div className="flex flex-row justify-between items-center gap-3 bg-white p-2.5 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-teal-50 rounded-lg sm:rounded-xl flex items-center justify-center border border-teal-100 shrink-0">
                        <Landmark className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg md:text-2xl font-bold text-slate-800 truncate">Transactions</h1>
                        <p className="hidden sm:block text-slate-500 text-xs md:text-sm sm:mt-1">Manage patient payments and records</p>
                    </div>
                </div>
                {permissions.add && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            className="bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-all whitespace-nowrap"
                            onClick={() => setIsImportOpen(true)}
                        >
                            <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Import Excel</span>
                        </button>
                        <button
                            className="bg-brand-600 hover:bg-brand-500 text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base transition-all shadow-md sm:shadow-lg shadow-brand-200 active:scale-95 whitespace-nowrap"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden xsm:inline">New Transaction</span>
                            <span className="xsm:hidden">New</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Dashboard Stats — 3-col on phone with compact cards so all fit in one row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-6">
                <div className="bg-white p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 md:gap-4 group hover:border-emerald-200 transition-all min-w-0">
                    <div className="p-1.5 sm:p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-md sm:rounded-lg md:rounded-xl group-hover:bg-emerald-100 transition-colors shrink-0">
                        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0 w-full">
                        <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Total Credits</p>
                        <p className="text-xs sm:text-sm md:text-xl font-bold text-emerald-600 truncate">₹{stats.credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="bg-white p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 md:gap-4 group hover:border-rose-200 transition-all min-w-0">
                    <div className="p-1.5 sm:p-2 md:p-3 bg-rose-50 text-rose-600 rounded-md sm:rounded-lg md:rounded-xl group-hover:bg-rose-100 transition-colors shrink-0">
                        <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0 w-full">
                        <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Total Debits</p>
                        <p className="text-xs sm:text-sm md:text-xl font-bold text-rose-600 truncate">₹{stats.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="bg-white p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 md:gap-4 min-w-0">
                    <div className="p-1.5 sm:p-2 md:p-3 bg-teal-50 text-teal-600 rounded-md sm:rounded-lg md:rounded-xl shrink-0">
                        <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0 w-full">
                        <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Net Balance</p>
                        <p className={`text-xs sm:text-sm md:text-xl font-bold truncate ${(stats.credits - stats.debits) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            ₹{(stats.credits - stats.debits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            <SearchFilterBar
                searchValue={searchQuery}
                onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
                searchPlaceholder="Search by patient name or mobile..."
                onFilterClick={() => setIsFilterOpen(true)}
                activeFilterCount={activeFilterCount}
                filteredCount={pagination.total}
                totalCount={pagination.total}
                recordLabel="transactions"
                exportModule="transaction"
                exportRows={sortedRows}
            >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                    {transactions.length > 0 && (
                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 border rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${selectedIds.length === transactions.length ? 'bg-brand-50 border-brand-200 text-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span className="hidden xsm:inline">{selectedIds.length === transactions.length ? 'Deselect All' : 'Select All'}</span>
                            <span className="xsm:hidden">{selectedIds.length === transactions.length ? 'None' : 'All'}</span>
                        </button>
                    )}

                    {selectedIds.length > 0 && permissions.delete && (
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 bg-rose-600 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:bg-rose-500 transition-all shadow-sm active:scale-95 whitespace-nowrap animate-in fade-in duration-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Selected ({selectedIds.length})</span>
                        </button>
                    )}
                </div>
            </SearchFilterBar>

            <FilterModal
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                title="Filter Transactions"
                filterData={filterData}
                setFilterData={(f) => { setFilterData(f); setPage(1); }}
                emptyFilters={EMPTY_TX_FILTERS}
                activeFilterCount={activeFilterCount}
                filteredCount={pagination.total}
                totalCount={pagination.total}
                fields={txFilterFields}
                resultLabel="transactions"
            />

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto text-sm">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-slate-500 font-medium">Loading transactions...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                                    <th className="px-6 py-4 text-left w-12">
                                        <input
                                            type="checkbox"
                                            checked={transactions.length > 0 && selectedIds.length === transactions.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                                        />
                                    </th>
                                    <SortableTh label="Date & Time" sortKey="dateTime" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                                    <SortableTh label="Patient" sortKey="patient" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                                    <SortableTh label="Type" sortKey="type" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" align="center" />
                                    <SortableTh label="Payment Mode" sortKey="paymentMode" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                                    <SortableTh label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" align="right" />
                                    <SortableTh label="Remark" sortable={false} className="py-4" />
                                    <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedRows.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(t.id)}
                                                onChange={() => toggleTransactionSelection(t.id)}
                                                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-800">{formatDate(t.paymentDateTime)}</span>
                                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(t.paymentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0 border border-brand-100 font-bold text-xs">
                                                    {t.Patient?.patientName?.charAt(0) || 'W'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{t.Patient?.patientName || 'Walk-in'}</span>
                                                    <span className="text-[10px] text-slate-400">{t.Patient?.mobileNo || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded inline-block">
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.paymentType === 'Credit' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                {t.paymentType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-600">{t.PaymentBy?.text || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-bold ${t.paymentType === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.paymentType === 'Credit' ? '+' : '-'} ₹{parseFloat(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-500 italic truncate max-w-[200px] block" title={t.remark}>
                                                {t.remark || '---'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {permissions.delete && (
                                                <button
                                                    onClick={() => handleDeleteTransaction(t.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all "
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {sortedRows.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                            No transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {pagination.total > 0 && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between shrink-0">
                        <span className="text-sm text-slate-500 font-medium">
                            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} transactions
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {[...Array(pagination.totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (pageNum === 1 || pageNum === pagination.totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === pageNum ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                                        return <span key={pageNum} className="w-8 h-8 flex items-center justify-center text-slate-400 text-sm">…</span>;
                                    }
                                    return null;
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ExcelImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImport={handleImport}
                title="Import Payments"
                sampleColumns={['Patient Name', 'Phone', 'Payment Mode', 'amountPaid', 'createdAt']}
                sampleFileName="payment_import_sample.xlsx"
            />

            {/* Add Transaction Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                                    <Landmark className="w-6 h-6 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Create New Transaction</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Transaction Record Entry</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleAddTransaction} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Patient Search */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Patient (Optional)</label>
                                <div className="relative group">
                                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or mobile..."
                                        value={formData.patientName || modalSearchTerm}
                                        onChange={(e) => {
                                            setModalSearchTerm(e.target.value);
                                            if (formData.patientId) {
                                                setFormData(prev => ({ ...prev, patientId: '', patientName: '' }));
                                                setPatientBalance(null);
                                            }
                                        }}
                                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-slate-50 focus:bg-white transition-all text-sm font-medium"
                                    />
                                    {modalSearchTerm && modalSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto border-t-4 border-t-brand-500 animate-fade-in-down">
                                            {modalSearchResults.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handlePatientSelect(p)}
                                                    className="w-full px-5 py-3 hover:bg-brand-50 transition-colors text-left border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center text-slate-400 group-hover:text-brand-600 font-bold text-xs transition-colors">
                                                            {p.patientName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{p.patientName}</div>
                                                            <div className="text-[10px] text-slate-500 font-medium">{p.mobileNo}</div>
                                                        </div>
                                                    </div>
                                                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {formData.patientId && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-brand-50/50 rounded-xl border border-brand-100 animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <Landmark className="w-4 h-4 text-brand-600" />
                                            <span className="text-xs font-bold text-brand-700">Outstanding Balance:</span>
                                        </div>
                                        <span className={`text-sm font-bold ${patientBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            ₹{patientBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Payment Type */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Type <span className="text-rose-500">*</span></label>
                                    <div className="flex p-1 bg-slate-100/50 border border-slate-200 rounded-xl h-11">
                                        {['Credit', 'Debit'].map(t => (
                                            <label key={t} className="flex-1 relative cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="paymentType"
                                                    value={t}
                                                    checked={formData.paymentType === t}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                                                    className="sr-only"
                                                />
                                                <div className={`flex items-center justify-center h-full rounded-lg text-xs font-bold transition-all ${formData.paymentType === t ? (t === 'Credit' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-rose-500 text-white shadow-lg shadow-rose-200') : 'text-slate-500 hover:text-slate-700'}`}>
                                                    {t}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount (₹) <span className="text-rose-500">*</span></label>
                                    <div className="relative group">
                                        <IndianRupee className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                                        <input
                                            type="number"
                                            required
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-slate-50 focus:bg-white transition-all text-sm font-semibold text-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Mode <span className="text-rose-500">*</span></label>
                                    <div className="relative group">
                                        <CreditCard className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                                        <select
                                            required
                                            value={formData.paymentById}
                                            onChange={(e) => setFormData(prev => ({ ...prev, paymentById: e.target.value }))}
                                            className="w-full pl-11 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-slate-50 focus:bg-white transition-all text-sm font-semibold text-slate-800 appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Payment Mode</option>
                                            {paymentByMasters.map(m => (
                                                <option key={m.id} value={m.id}>{m.text}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Payment Date & Time */}
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Date & Time <span className="text-rose-500">*</span></label>
                                    <div className="relative group">
                                        <CalendarIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.paymentDateTime}
                                            onChange={(e) => setFormData(prev => ({ ...prev, paymentDateTime: e.target.value }))}
                                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-slate-50 focus:bg-white transition-all text-sm font-semibold text-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Remark */}
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Remark (Optional)</label>
                                    <div className="relative group">
                                        <MessageSquare className="w-4 h-4 absolute left-4 top-3 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                                        <textarea
                                            value={formData.remark}
                                            onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                                            placeholder="Add notes about this transaction..."
                                            rows={2}
                                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-slate-50 focus:bg-white transition-all text-sm font-medium resize-none text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-50 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-200 transition-all disabled:opacity-50 flex items-center gap-2 transform active:scale-95"
                                >
                                    {saving ? (
                                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            Submit Transaction
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;
