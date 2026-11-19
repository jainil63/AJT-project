import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, UserSquare, X, Trash2, Mail, Phone, Lock, MapPin, Clock, Building2, Briefcase, Settings2, Eye, EyeOff, ShieldAlert, FileText, MonitorSmartphone, MessageCircle, Ban, CheckCircle2, History, Banknote, CalendarClock, GitBranch } from 'lucide-react';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import FilterModal from '../components/common/FilterModal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { countActiveFilters, matchesIds } from '../utils/filterUtils';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';

const SORT_ACCESSORS = {
  employee: (r) => r.fullName,
  contact: (r) => r.email,
  designation: (r) => r.Doctor ? (r.Doctor.doctorType || 'Doctor') : r.Vendor ? 'Lab Vendor' : (r.Designation?.name || 'Staff'),
};

const EMPTY_EMP_FILTERS = {
  designationIds: [],
};

const EMP_FILTER_KEYS = [
  { key: 'designationIds', type: 'array' },
];
import DocumentUploadSection from '../components/DocumentUploadSection';
import SessionManagementModal from '../components/SessionManagementModal';

// iOS-style toggle. We avoided Tailwind's `peer + after:` pattern here
// because in v4 it was rendering the knob outside the track on some
// breakpoints (the absolutely-positioned pseudo wasn't anchoring to the
// track reliably). A nested span with the `has-checked:` selector gives
// us a deterministic layout that works the same everywhere.
const ToggleSwitch = ({ name, checked, onChange, label, activeColorClass = 'has-checked:bg-brand-600', title }) => (
  <label
    title={title}
    className="inline-flex items-center gap-3 cursor-pointer select-none"
  >
    <span className={`relative inline-flex items-center w-11 h-6 rounded-full bg-slate-200 transition-colors duration-200 has-focus-visible:ring-2 has-focus-visible:ring-brand-500/30 ${activeColorClass}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      {/* Knob — absolutely positioned, translates 20px when the
          containing label sees a checked descendant. Using the `peer`
          on the input lets us drive the knob without `after` pseudo. */}
      <span className="pointer-events-none absolute top-0.5 left-0.5 w-5 h-5 bg-white border border-slate-300 rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-5 peer-checked:border-white"></span>
    </span>
    <span className="text-sm font-semibold text-slate-700">{label}</span>
  </label>
);

const EmployeeMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedEmployeeForSessions, setSelectedEmployeeForSessions] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    designationId: '',
    employeeCode: '',
    allowMultipleCheckIns: false,
    earliestWorkingStartTime: '09:00',
    workdayEndTime: '17:00',
    address: '',
    isDisabled: false
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_EMP_FILTERS);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordChanged, setIsPasswordChanged] = useState(false);
  // Array of staged docs: [{ tempId, documentTypeId, file, note }]
  const [stagedFiles, setStagedFiles] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  // Employee whose documents are being viewed in the standalone (non-staged) modal
  const [docModalEntity, setDocModalEntity] = useState(null);

  const [designations, setDesignations] = useState([]);

  const permissions = usePermissions('Employee Master');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employee/getEmployee');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showToast(error.response?.data?.message || 'Error fetching employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');


  const activeFilterCount = useMemo(
    () => countActiveFilters(filterData, EMP_FILTER_KEYS),
    [filterData]
  );

  const empFilterFields = useMemo(() => [
    { type: 'multiselect', key: 'designationIds', label: 'Designation', options: designations, labelKey: 'name', placeholder: 'All Designations' },
  ], [designations]);

  const filteredEmployees = useMemo(() => employees.filter((emp) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matchesSearch =
        emp.fullName?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.mobileNumber?.includes(q) ||
        emp.Designation?.name?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    const desigId = emp.designationId || emp.Designation?.id;
    if (!matchesIds(desigId, filterData.designationIds)) return false;
    return true;
  }), [employees, searchTerm, filterData]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredEmployees, SORT_ACCESSORS);


  const fetchDesignations = async () => {
    try {
      const response = await api.get('/designation/getDesignation');
      setDesignations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDesignations();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'password' && isEditing) {
      setIsPasswordChanged(true);
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validateForm = () => {
    const { fullName, email, mobileNumber, password, confirmPassword, designationId } = formData;

    if (!fullName.trim()) return "Full Name is required";

    if (email && String(email).trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(email).trim())) return "Please enter a valid email address";
    }

    if (!/^\d{10}$/.test(mobileNumber)) return "Mobile number must be exactly 10 digits";

    if (!designationId) return "Please select a designation";

    // Password validation for new employee or when password is being changed in edit mode
    if (!isEditing || isPasswordChanged) {
      if (!password) return "Password is required";
      const isSuperAdmin = user.userType === 'Super Admin' || user.isSuperAdmin === true;
      if (!isSuperAdmin) {
        if (password.length < 8) return "Password must be at least 8 characters long";

        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!pwdRegex.test(password)) {
          return "Password must include uppercase, lowercase, number, and special character";
        }
      }

      if (password !== confirmPassword) return "Passwords do not match";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    try {
      setSaving(true);
      const endpoint = isEditing
        ? `/employee/updateEmployee/${editingId}`
        : `/employee/addEmployee`;
      const method = isEditing ? 'put' : 'post';

      // Clean payload for update: if password didn't change, don't send it
      const payload = { ...formData };
      if (isEditing && !isPasswordChanged) {
        delete payload.password;
        delete payload.confirmPassword;
      }
      // isDisabled is only settable on edit (by super admins); new employees default to enabled
      if (!isEditing || !permissions.isSuperAdmin) {
        delete payload.isDisabled;
      }

      const response = await api[method](endpoint, payload);
      const savedEmployee = response.data.data;
      const entityId = isEditing ? editingId : savedEmployee.id;

      // Upload staged documents if any
      const filesToUpload = stagedFiles.filter(d => !!d.file);
      if (filesToUpload.length > 0) {
        const docFormData = new FormData();
        docFormData.append('entityId', entityId);
        docFormData.append('entityType', 'Employee');

        const typeIds = [];
        const notes = [];
        filesToUpload.forEach(d => {
          docFormData.append('files', d.file);
          typeIds.push(d.documentTypeId);
          notes.push(d.note || '');
        });
        docFormData.append('documentTypeIds', JSON.stringify(typeIds));
        docFormData.append('notes', JSON.stringify(notes));

        await api.post('/document/upload', docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      showToast(response.data.message || 'Employee saved successfully', 'success');
      fetchEmployees();
      resetForm();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast(error.response?.data?.message || 'Error saving employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      mobileNumber: '',
      password: '',
      confirmPassword: '',
        designationId: '',
      employeeCode: '',
          allowMultipleCheckIns: false,
      earliestWorkingStartTime: '09:00',
      workdayEndTime: '17:00',
      address: '',
      isDisabled: false
    });
    setIsEditing(false);
    setEditingId(null);
    setIsPasswordChanged(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setStagedFiles([]);
    setExistingDocuments([]);
  };

  const handleEdit = (emp) => {
    setFormData({
      fullName: emp.fullName,
      email: emp.email,
      mobileNumber: emp.mobileNumber,
      password: '********', // Indicating existing password
      confirmPassword: '',
      designationId: emp.designationId || '',
      employeeCode: emp.employeeCode || '',
      allowMultipleCheckIns: !!emp.allowMultipleCheckIns,
      earliestWorkingStartTime: emp.earliestWorkingStartTime || '09:00',
      workdayEndTime: emp.workdayEndTime || '17:00',
      address: emp.address || '',
      isDisabled: !!emp.isDisabled
    });
    setEditingId(emp.id);
    setIsEditing(true);
    setIsPasswordChanged(false);

    // Fetch existing documents
    const fetchDocs = async () => {
      try {
        const res = await api.get(`/document/list/Employee/${emp.id}`);
        setExistingDocuments(res.data.data || []);
      } catch (err) {
        console.error('Error fetching employee docs:', err);
      }
    };
    fetchDocs();

    setIsAddModalOpen(true);
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee profile? This action cannot be undone.',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.delete(`/employee/deleteEmployee/${id}`);
      showToast('Employee deleted successfully', 'success');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      showToast(error.response?.data?.message || 'Error deleting employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisabled = async (emp) => {
    const newValue = !emp.isDisabled;
    const isConfirmed = await confirm({
      title: newValue ? 'Disable Employee' : 'Enable Employee',
      message: newValue
        ? 'Disable this employee? They will not be able to log in.'
        : 'Enable this employee? They will be able to log in again.',
      type: newValue ? 'danger' : 'info'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.put(`/employee/updateEmployee/${emp.id}`, { isDisabled: newValue });
      showToast(newValue ? 'Employee disabled successfully' : 'Employee enabled successfully', 'success');
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      showToast(error.response?.data?.message || 'Error updating employee status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async (emp) => {
    const isConfirmed = await confirm({
      title: `Login As ${emp.fullName}`,
      message: `Are you sure you want to log in as ${emp.fullName}? You will be switched to their user session and logged out of your current session.`,
      type: 'info'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      const response = await api.post('/auth/impersonate', { targetUserId: emp.id });
      const { data, tokens } = response.data;
      
      // Backup current admin session details
      const adminUser = localStorage.getItem('user');
      const adminToken = localStorage.getItem('token');
      const adminRefreshToken = localStorage.getItem('refreshToken');
      
      // Clear credentials
      localStorage.clear();
      
      // Restore backups
      if (adminUser) localStorage.setItem('adminUserBackup', adminUser);
      if (adminToken) localStorage.setItem('adminTokenBackup', adminToken);
      if (adminRefreshToken) localStorage.setItem('adminRefreshTokenBackup', adminRefreshToken);
      
      // Save new credentials
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      showToast(`Impersonating ${data.fullName} successfully`, 'success');
      
      // Force reload to dashboard
      window.location.href = '/';
    } catch (err) {
      console.error('Impersonation failed:', err);
      showToast(err.response?.data?.message || 'Failed to impersonate employee', 'error');
    } finally {
      setSaving(false);
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
    return <AccessDenied moduleName="Employee Master" />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <UserSquare className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Employee Master</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your clinic staff and their profiles</p>
          </div>
        </div>
      </div>

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Employees"
        filterData={filterData}
        setFilterData={setFilterData}
        emptyFilters={EMPTY_EMP_FILTERS}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredEmployees.length}
        totalCount={employees.length}
        fields={empFilterFields}
        resultLabel="employees"
      />

      {/* List/Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="flex-1 w-full min-w-0">
            <SearchFilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search employees..."
              onFilterClick={() => setIsFilterOpen(true)}
              activeFilterCount={activeFilterCount}
              filteredCount={filteredEmployees.length}
              totalCount={employees.length}
              recordLabel="employees"
                exportModule="employee"
            exportRows={filteredEmployees}
              className="border-0 shadow-none p-0"
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end shrink-0">
            {permissions.add && (
              <button
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(true);
                }}
              >
                <Plus className="w-5 h-5" />
                Add Employee
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              Loading employees...
            </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <SortableTh label="Employee" sortKey="employee" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-4" />
                <SortableTh label="Contact" sortKey="contact" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-4" />
                <SortableTh label="Designation" sortKey="designation" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-6 py-4" />
                <SortableTh label="Actions" sortable={false} align="right" className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <UserSquare className="w-10 h-10 text-slate-200" />
                      <span>No employees found.</span>
                    </div>
                  </td>
                </tr>
              ) : sortedRows.map((emp) => (
                <tr
                  key={emp.id}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer group/row ${emp.isDisabled ? 'bg-rose-50/40 opacity-70' : ''}`}
                  onClick={() => {}}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {emp.fullName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-800">{emp.fullName}</div>
                          {emp.Doctor && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200 leading-none">
                              Doctor
                            </span>
                          )}
                          {emp.Vendor && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200 leading-none">
                              Vendor
                            </span>
                          )}
                          {emp.isDisabled && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-200 leading-none">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600">{emp.email}</div>
                    <div className="text-xs text-slate-400">
                      {permissions.isSuperAdmin
                        ? emp.mobileNumber
                        : <span className="text-slate-300 italic">Hidden</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      emp.Doctor ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      emp.Vendor ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {emp.Doctor ? (emp.Doctor.doctorType || 'Doctor') : emp.Vendor ? 'Lab Vendor' : (emp.Designation?.name || 'Staff')}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDocModalEntity(emp); }}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="View Documents"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {permissions.update && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(emp); }}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEmployeeForSessions(emp); setIsSessionModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View Login Sessions"
                        >
                          <MonitorSmartphone className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.isSuperAdmin && !emp.isDisabled && emp.id !== user.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleImpersonate(emp); }}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Login As This User"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleDisabled(emp); }}
                          className={`p-2 rounded-lg transition-colors ${
                            emp.isDisabled
                              ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={emp.isDisabled ? 'Enable Employee' : 'Disable Employee'}
                        >
                          {emp.isDisabled
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <Ban className="w-4 h-4" />}
                        </button>
                      )}
                      {permissions.delete && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(emp.id); }} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in-up flex flex-col">
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="p-5 overflow-y-auto custom-scrollbar flex-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                {/* Basic Info */}
                <div className="space-y-2 col-span-full">
                  <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2">
                    <UserSquare className="w-4 h-4" /> Basic Information
                  </h3>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Name <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <UserSquare className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter Full Name"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="example@clinic.com"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Mobile Number <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      name="mobileNumber"
                      required
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Authentication */}
                <div className="space-y-4 col-span-full border-b border-slate-100 pb-4 mt-2">
                  <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Security & Access
                  </h3>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required={!isEditing}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={isEditing ? "Leave blank to keep current" : "Create Password"}
                      className="w-full pl-10 pr-12 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {(!isEditing || isPasswordChanged) && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Confirm Password <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        required={!isEditing || isPasswordChanged}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm Password"
                        className="w-full pl-10 pr-12 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {isEditing && permissions.isSuperAdmin && (
                  <div className="col-span-full">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                      <span className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          name="isDisabled"
                          checked={formData.isDisabled}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <Ban className="w-4 h-4 text-rose-500" /> Account Disabled
                        </span>
                        <span className="text-[11px] text-slate-500">When enabled, this employee cannot log in.</span>
                      </span>
                    </label>
                  </div>
                )}

                {/* Organization Details */}
                <div className="space-y-4 col-span-full border-b border-slate-100 pb-4 mt-2">
                  <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Work Profile
                  </h3>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Designation <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      name="designationId"
                      required
                      value={formData.designationId}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm appearance-none bg-white"
                    >
                      <option value="">Select Designation</option>
                      {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Employee Code</label>
                  <div className="relative">
                    <Settings2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="employeeCode"
                      value={formData.employeeCode}
                      onChange={handleInputChange}
                      placeholder="Enter Employee Code"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Shift Timings */}
                <div className="space-y-4 col-span-full border-b border-slate-100 pb-4 mt-2">
                  <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Shift Timings
                  </h3>
                </div>

                <div className="flex gap-3 col-span-full md:col-span-1 items-end">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-semibold text-slate-700">Start Time</label>
                    <input
                      type="time"
                      name="earliestWorkingStartTime"
                      value={formData.earliestWorkingStartTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-semibold text-slate-700">End Time</label>
                    <input
                      type="time"
                      name="workdayEndTime"
                      value={formData.workdayEndTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="col-span-full flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3 mt-2 mb-2">
                </div>

                {/* Additional Info */}
                <div className="space-y-4 col-span-full border-b border-slate-100 pb-4 mt-2">
                  <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Additional Details
                  </h3>
                </div>

                <div className="col-span-full space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Residential Address</label>
                  <textarea
                    name="address"
                    rows="2"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter complete address"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm resize-none"
                  ></textarea>
                </div>

                {/* Document Management Section - Compact & Professional */}
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white hover:border-brand-300 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform border border-slate-100">
                        <FileText className="w-6 h-6 text-brand-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-800 leading-tight">Employee Documents</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Manage PAN, Aadhar & Identification</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsDocumentModalOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all shadow-sm flex items-center justify-center gap-2 text-sm whitespace-nowrap active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        {stagedFiles.length > 0 ? `Manage Documents (${stagedFiles.length})` : 'Add Documents'}
                      </button>
                      
                      {stagedFiles.length > 0 && (
                        <span className="text-[9px] text-brand-600 font-bold uppercase tracking-widest px-2 py-0.5 bg-brand-50 rounded-full self-center sm:self-auto animate-pulse">
                          Draft Saved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                  disabled={saving}
                  className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Saving...' : 'Save Employee Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal (Staged Mode) */}
      {isDocumentModalOpen && (
        <DocumentUploadSection
          isOpen={true}
          onClose={() => setIsDocumentModalOpen(false)}
          isStaged={true}
          stagedDocuments={stagedFiles}
          onChange={setStagedFiles}
          existingDocuments={existingDocuments}
          entityType="Employee"
          entityId={editingId}
          title="Manage Employee Documents"
        />
      )}
      {/* Session Management Modal */}
      {isSessionModalOpen && (
        <SessionManagementModal
          isOpen={isSessionModalOpen}
          onClose={() => { setIsSessionModalOpen(false); setSelectedEmployeeForSessions(null); }}
          employee={selectedEmployeeForSessions}
        />
      )}
      

      {/* Standalone Document Viewer (from the list) */}
      {docModalEntity && (
        <DocumentUploadSection
          isOpen={true}
          onClose={() => setDocModalEntity(null)}
          isStaged={false}
          entityType="Employee"
          entityId={docModalEntity.id}
          title={`Documents — ${docModalEntity.fullName}`}
        />
      )}





    </div>
  );
};

export default EmployeeMaster;
