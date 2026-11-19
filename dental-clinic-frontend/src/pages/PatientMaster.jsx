import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, UserSquare, Trash2, UploadCloud, FileText, History } from 'lucide-react';
import { exportRowsToExcel, MAX_EXPORT_ROWS, buildExportFilename } from '../utils/exportToExcel';
import { formatDate } from '../utils/dateUtils';
import { useLocation, useNavigate } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import PatientRegistrationModal from '../components/modals/PatientRegistrationModal';
import ExcelImportModal from '../components/modals/ExcelImportModal';
import DocumentUploadSection from '../components/DocumentUploadSection';
import { fileUrl } from '../utils/fileUrl';
import FilterModal from '../components/common/FilterModal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { countActiveFilters } from '../utils/filterUtils';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';

const SORT_ACCESSORS = {
  patientDetails: (p) => p.patientName,
  contact: (p) => p.mobileNo,
  genderAge: (p) => `${p.gender || ''} ${p.age || ''}`,
  location: (p) => p.city,
};

const EMPTY_PATIENT_FILTERS = {
  genders: [],
  fromDate: '',
  toDate: '',
};

const PATIENT_FILTER_KEYS = [
  { key: 'genders', type: 'array' },
  { key: 'fromDate', type: 'date' },
  { key: 'toDate', type: 'date' },
];

const GENDER_FILTER_OPTIONS = [
  { id: 'Male', text: 'Male' },
  { id: 'Female', text: 'Female' },
];

const PatientMaster = () => {
  const showToast = useToast().showToast;
  const confirm = useConfirm();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper for permission-restricted actions
  const handlePermissionAction = (hasPermission, callback) => {
    if (!hasPermission) {
      showToast('Access Denied: You do not have permission to perform this action.', 'error');
      return;
    }
    callback();
  };
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 50;
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_PATIENT_FILTERS);

  // Patient whose documents are being viewed/managed in the standalone modal
  const [docModalPatient, setDocModalPatient] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const navigate = useNavigate();
  const permissions = usePermissions('Patient Registration');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDocImportOpen, setIsDocImportOpen] = useState(false);

  const handleImport = async (rawData) => {
    try {
      // Helper to find case-insensitive key and trim value
      const getVal = (row, ...keys) => {
        const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim()));
        const val = foundKey ? row[foundKey] : "";
        return val ? String(val).trim() : "";
      };

      const normalizeGender = (g) => {
        const s = (g || '').trim();
        const low = s.toLowerCase();
        if (low === 'female' || low === 'f') return 'Female';
        if (low === 'male' || low === 'm') return 'Male';
        if (low === 'other' || low === 'o') return 'Male';
        if (s === 'Male' || s === 'Female') return s;
        return 'Male';
      };

      // Map excel data to backend keys — only import supported columns
      const formattedPatients = rawData
        .map(row => ({
          patientName: getVal(row, 'Patient Name', 'Name'),
          mobileNo: getVal(row, 'Mobile No', 'Phone', 'Mobile'),
          email: getVal(row, 'Email'),
          gender: normalizeGender(getVal(row, 'Gender')),
          age: getVal(row, 'Age'),
          address: getVal(row, 'Address'),
          city: getVal(row, 'City'),
          pincode: getVal(row, 'Pincode'),
          country: getVal(row, 'Country') || 'India',
          registeredAt: getVal(row, 'Registered At', 'registeredAt', 'Registration Date', 'Created At') || null
        }))
        .filter(p => p.patientName || p.mobileNo);

      if (formattedPatients.length === 0) {
        showToast('The uploaded file contains no valid data rows', 'error');
        return;
      }

      // Validate required fields
      const invalidRows = formattedPatients.filter(p => !p.patientName);
      if (invalidRows.length > 0) {
        showToast(`Found ${invalidRows.length} rows missing Patient Name.`, 'error');
        return;
      }

      const response = await api.post('/patient/bulkAddPatients', {
        patients: formattedPatients
      });

      const { createdCount = formattedPatients.length, skippedCount = 0 } = response.data || {};
      const toastParts = [`${createdCount} patient${createdCount !== 1 ? 's' : ''} imported successfully`];
      if (skippedCount > 0) toastParts.push(`${skippedCount} skipped (mobile already exists)`);
      showToast(toastParts.join(', '), skippedCount > 0 && createdCount === 0 ? 'error' : 'success');
      fetchPatients();
    } catch (error) {
      console.error('Import error:', error);
      showToast('Error importing patients. Please check the Excel format.', 'error');
    }
  };

  const handleDocImport = async (rawData) => {
    const getVal = (row, ...keys) => {
      const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim()));
      const val = foundKey ? row[foundKey] : '';
      return val ? String(val).trim() : '';
    };

    const allMapped = rawData.map(row => ({
      patientName: getVal(row, 'Patient Name', 'Name'),
      mobileNo: getVal(row, 'Phone', 'Mobile', 'Mobile No'),
      filename: getVal(row, 'filename', 'Filename', 'File Name', 'file'),
      createdAt: getVal(row, 'createdAt', 'Created At', 'Date') || null,
    }));

    const validRows = allMapped.filter(r => r.mobileNo && r.filename);
    const frontendSkipped = allMapped.length - validRows.length;

    if (validRows.length === 0) {
      showToast(`No valid rows found — Phone and Filename are required (${frontendSkipped} rows were invalid)`, 'error');
      return;
    }

    const BATCH_SIZE = 30;
    let totalCreated = 0;
    let totalSkipped = frontendSkipped;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      try {
        const res = await api.post('/document/bulkImport', { rows: batch }, { timeout: 300000 });
        totalCreated += res.data.createdCount || 0;
        totalSkipped += res.data.skippedCount || 0;
      } catch (err) {
        console.error('Batch failed:', err);
        totalSkipped += batch.length;
      }
    }

    const parts = [`${totalCreated} of ${rawData.length} documents imported`];
    if (totalSkipped > 0) parts.push(`${totalSkipped} skipped`);
    showToast(parts.join(' — '), totalCreated === 0 ? 'error' : 'success');
  };

  const canViewAll = permissions.isSuperAdmin || permissions.viewAll;

  // Minimum search length required when the user doesn't have viewAll permission.
  const isAllDigits = (s) => /^\d+$/.test(s);
  const meetsSearchMin = (s) => {
    const t = s.trim();
    return isAllDigits(t) ? t.length >= 5 : t.length >= 4;
  };

  const fetchPatients = async () => {
    // Without viewAll, require a meaningful search term before hitting the API.
    if (!canViewAll && !meetsSearchMin(debouncedSearch)) {
      setPatients([]);
      setPagination({ total: 0, totalPages: 1 });
      return;
    }
    try {
      setLoading(true);
      // Only this screen renders the Lead chip, so it opts in to the lead lookup.
      const params = { page, limit, search: debouncedSearch };
      if (filterData.genders.length) params.genders = filterData.genders.join(',');
      if (filterData.fromDate) params.fromDate = filterData.fromDate;
      if (filterData.toDate) params.toDate = filterData.toDate;
      const response = await api.get('/patient/getPatient', { params });
      const newPatients = response.data.data || [];
      if (newPatients.length === 0 && page > 1) {
        setPage(prev => Math.max(1, prev - 1));
        return;
      }
      setPatients(newPatients);
      setPagination(response.data.pagination || { total: 0, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching patients:', error);
      showToast('Error fetching patients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, limit, debouncedSearch, filterData, canViewAll]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterData]);



  const activeFilterCount = useMemo(
    () => countActiveFilters(filterData, PATIENT_FILTER_KEYS),
    [filterData]
  );

  const patientFilterFields = useMemo(
    () => [
      { type: 'multiselect', key: 'genders', label: 'Gender', options: GENDER_FILTER_OPTIONS, labelKey: 'text', placeholder: 'All Genders' },
      { type: 'date', key: 'fromDate', label: 'Registered From' },
      { type: 'date', key: 'toDate', label: 'Registered To' },
    ],
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setSelectedPatient(null);
      setIsModalOpen(true);
    }
  }, [location.search]);

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Patient',
      message: 'Are you sure you want to delete this patient record?',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await api.delete(`/patient/deletePatient/${id}`);
      showToast('Patient record deleted successfully', 'success');
      fetchPatients();
    } catch (error) {
      showToast('Error deleting patient', 'error');
    }
  };

  const filteredPatients = patients;

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredPatients, SORT_ACCESSORS);

  const buildPatientListParams = (forExport = false) => {
    const params = {
      page: 1,
      limit: forExport ? 'all' : limit,
      search: debouncedSearch,
    };
    if (filterData.genders.length) params.genders = filterData.genders.join(',');
    // Was missing, so exporting under "Offline (manually added)" exported everyone.
    if (filterData.fromDate) params.fromDate = filterData.fromDate;
    if (filterData.toDate) params.toDate = filterData.toDate;
    return params;
  };

  const PATIENT_EXPORT_COLUMNS = [
    { header: 'UHID', key: 'uhid' },
    { header: 'Patient Name', key: 'patientName' },
    { header: 'Mobile No', key: 'mobileNo' },
    { header: 'Alt Mobile No', key: 'alternativeMobileNo' },
    { header: 'Email', key: 'email' },
    { header: 'Gender', key: 'gender' },
    { header: 'DOB', getValue: (p) => p.dob ? formatDate(p.dob) : '' },
    { header: 'Age', key: 'age' },
    { header: 'Aadhar No', key: 'aadharNo' },
    { header: 'PAN No', key: 'panNo' },
    { header: 'Height (cm)', key: 'height' },
    { header: 'Weight (kg)', key: 'weight' },
    { header: 'Blood Group', key: 'bloodGroup' },
    { header: 'Medical Alert', getValue: (p) => p.MedicalAlert?.text || '' },
    { header: 'Occupation', key: 'occupation' },
    { header: 'Family History', key: 'familyHistory' },
    { header: 'Address', key: 'address' },
    { header: 'City', key: 'city' },
    { header: 'Pincode', key: 'pincode' },
    { header: 'Country', key: 'country' },
    { header: 'Doctor', getValue: (p) => p.Doctor?.name || '' },
    { header: 'Registration Date', getValue: (p) => p.registrationDate ? formatDate(p.registrationDate) : '' },
    { header: 'Registered On', getValue: (p) => formatDate(p.createdAt) },
  ];

  const handleExportExcel = async () => {
    const total = pagination.total ?? 0;
    if (total === 0) {
      showToast('No patients to export', 'error');
      return;
    }
    if (total > MAX_EXPORT_ROWS) {
      showToast(`Too many records (${total}). Narrow filters — max ${MAX_EXPORT_ROWS.toLocaleString()} per export.`, 'error');
      return;
    }
    try {
      showToast(`Preparing export of ${total} patient(s)…`, 'info');
      const response = await api.get('/patient/getPatient', { params: buildPatientListParams(true) });
      const rows = response.data.data || [];

      const extraCols = [];

      const ok = exportRowsToExcel(rows, [...PATIENT_EXPORT_COLUMNS, ...extraCols], buildExportFilename('patient_master'));
      if (ok) showToast(`Exported ${rows.length} patient(s)`, 'success');
      else showToast('Nothing to export', 'error');
    } catch (error) {
      console.error('Patient export error:', error);
      showToast(error.response?.data?.message || 'Export failed', 'error');
    }
  };

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="Patient Registration" />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
            <UserSquare className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Patient Master</h1>
            <p className="text-slate-500 text-sm mt-1">Register and manage patient records</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDocImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200"
            title="Bulk import patient documents from Excel"
          >
            <FileText className="w-5 h-5" />
            Import Docs
          </button>
          <button
            onClick={() => handlePermissionAction(permissions.import, () => setIsImportModalOpen(true))}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${permissions.import ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'}`}
          >
            <UploadCloud className="w-5 h-5" />
            Import
          </button>
          <button
            className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm ${permissions.add ? 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'}`}
            onClick={() => handlePermissionAction(permissions.add, () => { setSelectedPatient(null); setIsModalOpen(true); })}
          >
            <Plus className="w-5 h-5" />
            Register Patient
          </button>
        </div>
      </div>

      <SearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name or mobile..."
        onFilterClick={() => setIsFilterOpen(true)}
        activeFilterCount={activeFilterCount}
        filteredCount={pagination.total}
        totalCount={pagination.total}
        recordLabel="patients"
        onExport={handleExportExcel}
      />

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Patients"
        filterData={filterData}
        setFilterData={setFilterData}
        emptyFilters={EMPTY_PATIENT_FILTERS}
        activeFilterCount={activeFilterCount}
        filteredCount={pagination.total}
        totalCount={pagination.total}
        fields={patientFilterFields}
        resultLabel="patients"
        onApply={() => setPage(1)}
      />

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <SortableTh label="Patient Details" sortKey="patientDetails" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Contact" sortKey="contact" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Gender/Age" sortKey="genderAge" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Location" sortKey="location" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Actions" sortable={false} align="right" className="py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                        {p.patientPhoto ? (
                          <img
                            src={fileUrl(p.patientPhoto)}
                            alt={p.patientName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-400 font-bold uppercase">{p.patientName?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {p.patientName}
                        </div>
                        {p.uhid && <div className="text-[10px] text-brand-600 font-bold uppercase tracking-wider bg-brand-50 inline-block px-2 py-0.5 rounded-full mt-1">ID: {p.uhid}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600">{p.mobileNo}</div>
                    <div className="text-xs text-slate-400">{p.email || 'No Email'}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600 font-medium">{p.gender}</div>
                    <div className="text-xs text-slate-400">{p.age} Years</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600">{p.city}</div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">{p.country}</div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/super/patient/${p.id}`)}
                          className="p-2 rounded-lg transition-colors text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          title="View full history"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDocModalPatient(p)}
                          className="p-2 rounded-lg transition-colors text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          title="View Documents"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermissionAction(permissions.update, () => handleEdit(p))}
                          className={`p-2 rounded-lg transition-colors ${permissions.update ? 'text-slate-400 hover:text-brand-600 hover:bg-brand-50' : 'text-slate-200 cursor-not-allowed'}`}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermissionAction(permissions.delete, () => handleDelete(p.id))}
                          className={`p-2 rounded-lg transition-colors ${permissions.delete ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    {!canViewAll && !meetsSearchMin(debouncedSearch)
                      ? 'Type at least 4 characters (name) or 5 digits (mobile) to search patients.'
                      : 'No patients found matching your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredPatients.length > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between mt-auto">
            <span className="text-sm text-slate-500 font-medium">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
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
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === pageNum ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === page - 2 || pageNum === page + 2) {
                    return <span key={pageNum} className="w-9 h-9 flex items-center justify-center text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <PatientRegistrationModal 
        isOpen={isModalOpen}
        initialData={selectedPatient}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchPatients()}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="Import Patients"
        sampleFileUrl="/patient_sample.xlsx"
      />

      <ExcelImportModal
        isOpen={isDocImportOpen}
        onClose={() => setIsDocImportOpen(false)}
        onImport={handleDocImport}
        title="Bulk Import Patient Documents"
        sampleColumns={['Patient Name', 'Phone', 'filename', 'createdAt']}
        sampleFileName="document_import_sample.xlsx"
      />

      {docModalPatient && (
        <DocumentUploadSection
          isOpen={true}
          onClose={() => setDocModalPatient(null)}
          isStaged={false}
          entityType="Patient"
          entityId={docModalPatient.id}
          title={`Documents — ${docModalPatient.patientName}`}
        />
      )}

    </div>
  );
};

export default PatientMaster;
