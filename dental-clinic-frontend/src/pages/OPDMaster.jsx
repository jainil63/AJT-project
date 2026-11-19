import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Edit2, ClipboardList, X, Trash2, Calendar as CalendarIcon, CheckCircle2, ChevronDown, Search, UploadCloud } from 'lucide-react';
import ExcelImportModal from '../components/modals/ExcelImportModal';
import FilterModal from '../components/common/FilterModal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { countActiveFilters } from '../utils/filterUtils';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';

const SORT_ACCESSORS = {
  date: { getValue: (r) => r.date, type: 'date' },
  patient: (r) => r.Patient?.patientName,
  doctor: (r) => r.Doctor?.name,
  treatment: (r) => r.Treatment?.text,
  status: (r) => r.Status?.text,
  payment: (r) => r.PaymentBy?.text,
};

const EMPTY_OPD_FILTERS = {
  doctorIds: [],
  statusIds: [],
  paymentTypeIds: [],
  fromDate: '',
  toDate: '',
};

const OPD_FILTER_KEYS = [
  { key: 'doctorIds', type: 'array' },
  { key: 'statusIds', type: 'array' },
  { key: 'paymentTypeIds', type: 'array' },
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
import { fileUrl } from '../utils/fileUrl';
import PatientRegistrationModal from '../components/modals/PatientRegistrationModal';

const OPDMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const location = useLocation();
  
  const permissions = usePermissions('Visit');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Helper for permission-restricted actions
  const handlePermissionAction = (hasPermission, callback) => {
    if (!hasPermission) {
      showToast('Access Denied: You do not have permission to perform this action.', 'error');
      return;
    }
    callback();
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_OPD_FILTERS);

  const [page, setPage] = useState(1);
  const limit = 50;
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [opdList, setOpdList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [treatments, setTreatments] = useState([]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFixDatesOpen, setIsFixDatesOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Patient edit modal — opened from the patient search results inside the OPD form
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // Holds a patientId from URL param until patients list is loaded
  const pendingPatientIdRef = useRef(null);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    statusId: '',
    paymentTypeId: '',
    treatmentId: '',
    remark: '',
    bloodPressure: '',
    height: '',
    weight: '',
    patientName: '',
  });

  const resetForm = () => {

    setFormData({
      patientId: '',
      doctorId: '',
      date: '',
      statusId: '',
      paymentTypeId: '',
      treatmentId: '',
      remark: '',
      bloodPressure: '',
      height: '',
      weight: '',
      patientName: '',
    });
    setModalSearchTerm('');
    setEditing(null);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchMasters = async () => {
    try {
      const [pRes, dRes, sRes, payRes, bRes, tRes] = await Promise.all([
        api.get('/patient/getPatient?limit=all'),
        api.get('/doctor/getDoctors'),
        api.get('/opdStatus/getOPDStatus'),
        api.get('/paymentBy/getPaymentBy?forCurrentUser=true'),
        api.get('/treatment/getTreatment')
      ]);
      const loadedPatients = pRes.data.data || [];
      setPatients(loadedPatients);
      setDoctors(dRes.data.data || []);
      setStatuses(sRes.data.data || []);
      setPaymentTypes(payRes.data.data || []);
      setTreatments(tRes.data.data || []);

      // Apply any pending patientId from URL param that arrived before patients loaded
      if (pendingPatientIdRef.current) {
        const pid = pendingPatientIdRef.current;
        pendingPatientIdRef.current = null;
        const patient = loadedPatients.find(p => p.id === pid);
        if (patient) {
          setFormData(prev => ({ ...prev, patientId: patient.id, patientName: patient.patientName || '' }));
        }
      }
    } catch (error) {
      console.error('Error fetching masters:', error);
      showToast('Failed to load dropdown data', 'error');
    }
  };

  const canViewAll = permissions.isSuperAdmin || permissions.viewAll;
  const isAllDigits = (s) => /^\d+$/.test(s);
  const meetsSearchMin = (s) => { const t = s.trim(); return isAllDigits(t) ? t.length >= 5 : t.length >= 4; };

  const fetchOPD = async () => {
    if (!canViewAll && !meetsSearchMin(debouncedSearch)) {
      setOpdList([]);
      setPagination({ total: 0, totalPages: 1 });
      return;
    }
    try {
      setLoading(true);
      const params = { page, limit, search: debouncedSearch };
      if (filterData.doctorIds.length) params.doctorIds = filterData.doctorIds.join(',');
      if (filterData.statusIds.length) params.statusIds = filterData.statusIds.join(',');
      if (filterData.paymentTypeIds.length) params.paymentTypeIds = filterData.paymentTypeIds.join(',');
      if (filterData.fromDate) params.fromDate = filterData.fromDate;
      if (filterData.toDate) params.toDate = filterData.toDate;
      const res = await api.get('/opdMaster/getOPDMaster', { params });
      const rows = res.data.data || [];
      if (rows.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
        return;
      }
      setOpdList(rows);
      setPagination(res.data.pagination || { total: 0, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching OPD:', error);
      showToast(error.response?.data?.message || 'Failed to fetch Visit list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchOPD();
  }, [page, limit, debouncedSearch, filterData, canViewAll]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      resetForm();
      const today = new Date().toISOString().split('T')[0];
      setFormData((p) => ({ ...p, date: today }));

      const patientId = params.get('patientId');
      if (patientId) {
        // Try to resolve immediately if patients are already loaded
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
          setFormData(prev => ({ ...prev, date: today, patientId: patient.id, patientName: patient.patientName || '' }));
        } else {
          // Patients not loaded yet — store for fetchMasters to apply
          pendingPatientIdRef.current = patientId;
        }
      }

      setIsAddModalOpen(true);
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toPayload = () => {
    return {
      patientId: formData.patientId,
      doctorId: formData.doctorId,
      date: formData.date,
      statusId: formData.statusId,
      paymentTypeId: formData.paymentTypeId || null,
      treatmentId: formData.treatmentId || null,
      remark: formData.remark,
      bloodPressure: formData.bloodPressure,
      height: formData.height,
      weight: formData.weight
    };
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post('/opdMaster/addOPDMaster', toPayload());
      showToast(res.data.message || 'Visit entry added', 'success');
      setIsAddModalOpen(false);
      resetForm();
      fetchOPD();
    } catch (error) {
      console.error('Error adding OPD:', error);
      showToast(error.response?.data?.message || 'Failed to add Visit entry', 'error');
    } finally {
      setSaving(false);
    }
  };


  const handleEdit = (row) => {
    setEditing(row);
    setFormData({
      patientId: row.patientId || row.Patient?.id || '',
      doctorId: row.doctorId || row.Doctor?.id || '',
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      statusId: row.statusId || row.Status?.id || '',
      paymentTypeId: row.paymentTypeId || row.PaymentBy?.id || '',
      treatmentId: row.treatmentId || row.Treatment?.id || '',
      remark: row.remark || '',
      bloodPressure: row.bloodPressure || '',
      height: row.height || '',
      weight: row.weight || '',
      patientName: row.Patient?.patientName || ''
    });
    setModalSearchTerm('');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing?.id) return;
    try {
      setSaving(true);
      const res = await api.put(`/opdMaster/updateOPDMaster/${editing.id}`, toPayload());
      showToast(res.data.message || 'Visit entry updated', 'success');
      setIsEditModalOpen(false);
      resetForm();
      fetchOPD();
    } catch (error) {
      console.error('Error updating OPD:', error);
      showToast(error.response?.data?.message || 'Failed to update Visit entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Visit Entry',
      message: 'Are you sure you want to delete this Visit entry?',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.delete(`/opdMaster/deleteOPDMaster/${id}`);
      showToast('Visit entry deleted successfully', 'success');
      fetchOPD();
    } catch (error) {
      console.error('Error deleting OPD:', error);
      showToast(error.response?.data?.message || 'Failed to delete Visit entry', 'error');
    } finally {
      setSaving(false);
    }
  };


  const handleImport = async (rawData) => {
    const getVal = (row, ...keys) => {
      const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim()));
      const val = foundKey ? row[foundKey] : '';
      return val ? String(val).trim() : '';
    };

    const visits = rawData
      .map(row => ({
        patientName: getVal(row, 'Patient Name', 'Name'),
        mobileNo: getVal(row, 'Phone', 'Mobile', 'Mobile No'),
        createdAt: getVal(row, 'createdAt', 'Created At', 'Date', 'Visit Date') || null
      }))
      .filter(v => v.mobileNo);

    if (visits.length === 0) {
      showToast('No valid rows found — Phone number is required for each row', 'error');
      return;
    }

    const response = await api.post('/opdMaster/bulkAddOPDMaster', { visits });
    const { createdCount = 0, skippedCount = 0 } = response.data || {};
    const parts = [`${createdCount} visit${createdCount !== 1 ? 's' : ''} imported successfully`];
    if (skippedCount > 0) parts.push(`${skippedCount} skipped (patient not found)`);
    showToast(parts.join(', '), skippedCount > 0 && createdCount === 0 ? 'error' : 'success');
    fetchOPD();
  };

  const handleFixDates = async (rawData) => {
    const getVal = (row, ...keys) => {
      const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim()));
      const val = foundKey ? row[foundKey] : '';
      return val ? String(val).trim() : '';
    };

    const visits = rawData
      .map(row => ({
        mobileNo: getVal(row, 'Phone', 'Mobile', 'Mobile No'),
        createdAt: getVal(row, 'createdAt', 'Created At', 'Date', 'Visit Date') || null
      }))
      .filter(v => v.mobileNo && v.createdAt);

    if (visits.length === 0) {
      showToast('No valid rows found — Phone and createdAt are required', 'error');
      return;
    }

    const response = await api.post('/opdMaster/fixImportDates', { visits });
    const { fixedCount = 0, skippedCount = 0 } = response.data || {};
    showToast(`${fixedCount} visits updated, ${skippedCount} skipped`, fixedCount > 0 ? 'success' : 'error');
    fetchOPD();
  };

  const activeFilterCount = useMemo(
    () => countActiveFilters(filterData, OPD_FILTER_KEYS),
    [filterData]
  );

  const opdFilterFields = useMemo(() => [
    { type: 'multiselect', key: 'doctorIds', label: 'Doctor', options: doctors, labelKey: 'name', placeholder: 'All Doctors' },
    { type: 'multiselect', key: 'statusIds', label: 'Status', options: statuses, labelKey: 'text', placeholder: 'All Statuses' },
    { type: 'multiselect', key: 'paymentTypeIds', label: 'Payment Type', options: paymentTypes, labelKey: 'text', placeholder: 'All Payment Types' },
    { type: 'date', key: 'fromDate', label: 'From Date' },
    { type: 'date', key: 'toDate', label: 'To Date' },
  ], [doctors, statuses, paymentTypes]);


  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(opdList, SORT_ACCESSORS, 'date', 'desc');

  const modalSearchResults = useMemo(() => {
    if (!modalSearchTerm) return [];

    const term = modalSearchTerm.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(term);

    return patients.filter(p => {
      if (isNumeric) {
        // Wait for 10 digits for mobile number search
        if (term.length >= 10) {
          return p.mobileNo?.includes(term);
        }
        return false;
      }
      // Otherwise search by name
      return p.patientName?.toLowerCase().includes(term);
    });
  }, [patients, modalSearchTerm]);

  const handleSelectPatient = (patient) => {
    setFormData(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.patientName || '',
    }));
    setModalSearchTerm('');
  };

  // Open the Patient modal in edit mode for a patient picked from the search results
  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setIsPatientModalOpen(true);
  };

  const handlePatientModalSuccess = (savedPatient) => {
    // Refresh the patient list so the updated record is reflected in search
    fetchMasters();
    // If the edited patient is the one selected in the OPD form, refresh its label
    setFormData(prev => (
      prev.patientId === savedPatient.id
        ? { ...prev, patientName: savedPatient.patientName || prev.patientName }
        : prev
    ));
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const handlePatientChange = (e) => {
    const pId = e.target.value;
    const patient = patients.find(p => p.id === pId);

    setFormData(prev => ({
      ...prev,
      patientId: pId || '',
      patientName: patient?.patientName || '',
    }));
  };

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="OPD Master" />;
  }


  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-100">
        <div className="w-9 h-9 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100 shrink-0">
          <ClipboardList className="w-5 h-5 text-sky-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Visit Master</h1>
      </div>

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Visit Entries"
        filterData={filterData}
        setFilterData={(f) => { setFilterData(f); setPage(1); }}
        emptyFilters={EMPTY_OPD_FILTERS}
        activeFilterCount={activeFilterCount}
        filteredCount={pagination.total}
        totalCount={pagination.total}
        fields={opdFilterFields}
        resultLabel="entries"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="flex-1 w-full min-w-0">
            <SearchFilterBar
              searchValue={searchQuery}
              onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
              searchPlaceholder="Search by patient name or mobile..."
              onFilterClick={() => setIsFilterOpen(true)}
              activeFilterCount={activeFilterCount}
              filteredCount={pagination.total}
              totalCount={pagination.total}
              recordLabel="entries"
              exportModule="opd"
              exportRows={sortedRows}
              className="border-0 shadow-none p-0"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end shrink-0">
            {user?.isSuperAdmin && (
              <button
                className="px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm shrink-0 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 hover:shadow-md"
                onClick={() => setIsFixDatesOpen(true)}
              >
                <CalendarIcon className="w-5 h-5" />
                Fix Import Dates
              </button>
            )}
            <button
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm shrink-0 ${permissions.add ? 'bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 hover:shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'}`}
              onClick={() => handlePermissionAction(permissions.add, () => setIsImportOpen(true))}
            >
              <UploadCloud className="w-5 h-5" />
              Import Excel
            </button>
            <button
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm shrink-0 ${permissions.add ? 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'}`}
              onClick={() => handlePermissionAction(permissions.add, () => {
                resetForm();
                const today = new Date().toISOString().split('T')[0];
                setFormData((p) => ({ ...p, date: today }));
                setIsAddModalOpen(true);
              })}
            >
              <Plus className="w-5 h-5" />
              Add Visit Entry
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              Loading Visit entries...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <SortableTh label="Date" sortKey="date" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Patient" sortKey="patient" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Doctor" sortKey="doctor" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Treatment" sortKey="treatment" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Payment" sortKey="payment" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        {formatDate(r.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{r.Patient?.patientName || '-'}</div>
                      <div className="text-xs text-slate-400">{r.Patient?.mobileNo || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{r.Doctor?.name || '-'}</div>
                      <div className="text-xs text-slate-400">{r.Doctor?.mobileNo || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      {r.Treatment?.text
                        ? <span className="inline-block px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-lg">{r.Treatment.text}</span>
                        : <span className="text-slate-400 text-xs">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{r.Status?.text || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded inline-block mt-3 ml-6 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{r.PaymentBy?.text || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePermissionAction(permissions.update, () => handleEdit(r))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all border ${permissions.update ? 'text-brand-600 border-brand-200 hover:text-white hover:bg-brand-600 hover:border-brand-600' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}
                          title={permissions.update ? "Edit" : "Access Denied"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermissionAction(permissions.delete, () => handleDelete(r.id))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all border ${permissions.delete ? 'text-rose-600 border-rose-200 hover:text-white hover:bg-rose-600 hover:border-rose-600' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}
                          title={permissions.delete ? "Delete" : "Access Denied"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="px-6 py-20 text-center text-slate-500">
                      {!canViewAll && !meetsSearchMin(debouncedSearch)
                        ? 'Type at least 4 characters (name) or 5 digits (mobile) to search visits.'
                        : 'No Visit entries found.'}
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
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <FormModal
          title="Add Visit Entry"
          onClose={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
          onSubmit={handleAdd}
          modalSearchTerm={modalSearchTerm}
          setModalSearchTerm={setModalSearchTerm}
          modalSearchResults={modalSearchResults}
          handleSelectPatient={handleSelectPatient}
          onEditPatient={handleEditPatient}
          formData={formData}
          handlePatientChange={handlePatientChange}
          patients={patients}
          doctors={doctors}
          statuses={statuses}
          paymentTypes={paymentTypes}
          treatments={treatments}
          handleChange={handleChange}
          saving={saving}
          permissions={permissions}
          user={user}
        />
      )}

      {isEditModalOpen && (
        <FormModal
          title="Edit Visit Entry"
          onClose={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
          onSubmit={handleUpdate}
          modalSearchTerm={modalSearchTerm}
          setModalSearchTerm={setModalSearchTerm}
          modalSearchResults={modalSearchResults}
          handleSelectPatient={handleSelectPatient}
          onEditPatient={handleEditPatient}
          formData={formData}
          handlePatientChange={handlePatientChange}
          patients={patients}
          doctors={doctors}
          statuses={statuses}
          paymentTypes={paymentTypes}
          treatments={treatments}
          handleChange={handleChange}
          saving={saving}
          permissions={permissions}
          user={user}
        />
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

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        title="Import Visit Entries"
        sampleColumns={['Patient Name', 'Phone', 'createdAt']}
        sampleFileName="visit_import_sample.xlsx"
      />

      <ExcelImportModal
        isOpen={isFixDatesOpen}
        onClose={() => setIsFixDatesOpen(false)}
        onImport={handleFixDates}
        title="Fix Visit Import Dates"
        sampleColumns={['Phone', 'createdAt']}
        sampleFileName="fix_dates_sample.xlsx"
      />
    </div>
  );
};

const FormModal = ({
  title,
  onClose,
  onSubmit,
  modalSearchTerm,
  setModalSearchTerm,
  modalSearchResults,
  handleSelectPatient,
  onEditPatient,
  formData,
  handlePatientChange,
  patients,
  doctors,
  statuses,
  paymentTypes,
  treatments,
  handleChange,
  saving,
  permissions,
  user
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4 sticky top-0 z-60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
              <ClipboardList className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Visit Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name / 10-digit mobile..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
              {modalSearchTerm && modalSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-80 max-h-60 overflow-y-auto custom-scrollbar border-t-4 border-t-brand-500">
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
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs overflow-hidden shrink-0">
                          {p.patientPhoto ? (
                            <img
                              src={fileUrl(p.patientPhoto)}
                              className="w-full h-full object-cover"
                            />
                          ) : p.patientName?.charAt(0)}
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
                        onClick={() => onEditPatient(p)}
                        title="Edit this patient"
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {modalSearchTerm && modalSearchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-80 p-3 text-xs text-amber-600 font-medium italic">
                  No patients found. For mobile search, enter at least 10 digits.
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form className="p-6 overflow-y-auto" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Patient <span className="text-rose-500">*</span></label>
              <select
                name="patientId"
                required
                value={formData.patientId}
                onChange={handlePatientChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patientName} ({p.mobileNo})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Doctor <span className="text-rose-500">*</span></label>
              <select
                name="doctorId"
                required
                value={formData.doctorId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Select Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.mobileNo})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Status <span className="text-rose-500">*</span></label>
              <select
                name="statusId"
                required
                value={formData.statusId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Select Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.text}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Treatment <span className="text-rose-500">*</span></label>
              <select
                name="treatmentId"
                required
                value={formData.treatmentId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Select Treatment</option>
                {(treatments || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.text}
                  </option>
                ))}
              </select>
            </div>


            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Blood Pressure</label>
              <input
                type="text"
                name="bloodPressure"
                value={formData.bloodPressure}
                onChange={handleChange}
                placeholder="e.g. 120/80"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Height</label>
              <input
                type="text"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="e.g. 170 cm"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Weight</label>
              <input
                type="text"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 65 kg"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Remark</label>
              <textarea
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                rows={3}
                placeholder="Remark..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OPDMaster;

