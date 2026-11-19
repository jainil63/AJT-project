import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Edit2, UserSquare, X, Trash2, Phone, UserPlus, Image as ImageIcon, 
  Briefcase, Stethoscope, ShieldCheck, CheckSquare, Square, Mail, Globe, Palette, 
  FileText, Layout, Building, ChevronDown, Lock, Eye, EyeOff, Search
} from 'lucide-react';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import DocumentUploadSection from '../components/DocumentUploadSection';
import { fileUrl } from '../utils/fileUrl';
import FilterModal from '../components/common/FilterModal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { countActiveFilters, matchesIds } from '../utils/filterUtils';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';

const SORT_ACCESSORS = {
  name: (r) => r.name,
  contact: (r) => r.mobileNo,
  doctorType: (r) => r.doctorType,
  gender: (r) => r.gender,
};

const EMPTY_DOCTOR_FILTERS = {
  specialtyIds: [],
  doctorTypes: [],
};

const DOCTOR_FILTER_KEYS = [
  { key: 'specialtyIds', type: 'array' },
  { key: 'doctorTypes', type: 'array' },
];

const DOCTOR_TYPE_OPTIONS = [
  { id: 'Consultant', text: 'Consultant' },
  { id: 'Visiting', text: 'Visiting' },
  { id: 'Full Time', text: 'Full Time' },
];

const DoctorMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_DOCTOR_FILTERS);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [signatoryPreview, setSignatoryPreview] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const signatoryInputRef = useRef(null);

  // Array of staged docs: [{ tempId, documentTypeId, file, note }]
  const [stagedFiles, setStagedFiles] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  // Doctor whose documents are being viewed in the standalone (non-staged) modal
  const [docModalEntity, setDocModalEntity] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordChanged, setIsPasswordChanged] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    gender: 'Male',
    mobileNo: '',
    alternativeMobileNo: '',
    doctorType: 'Consultant',
    accessPrescription: false,
    accessBilling: false,
    accessPatients: false,
    accessAppointments: false,
    email: '',
    description: '',
    googleProfileUrl: '',
    colorCode: '#0d9488', // Default to brand color
    specialtyId: '',
    authorisedSignatory: null,
    password: '',
    confirmPassword: ''
  });

  const permissions = usePermissions('Doctor Master');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const [doctorsResponse, specialtiesResponse] = await Promise.all([
        api.get('/doctor/getDoctors'),
        api.get('/specialty/getSpecialty')
      ]);

      setDoctors(doctorsResponse.data.data || []);
      setSpecialties(specialtiesResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'password' && isEditing) {
      setIsPasswordChanged(true);
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSignatoryChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Signatory image size should be less than 2MB', 'error');
        return;
      }
      setFormData(prev => ({ ...prev, authorisedSignatory: file }));
      const reader = new FileReader();
      reader.onloadend = () => setSignatoryPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const triggerSignatoryInput = () => {
    signatoryInputRef.current?.click();
  };

  const resetForm = () => {

    setFormData({
      name: '',
      gender: 'Male',
      mobileNo: '',
      alternativeMobileNo: '',
      doctorType: 'Consultant',
      accessPrescription: false,
      accessBilling: false,
      accessPatients: false,
      accessAppointments: false,
      email: '',
      description: '',
      googleProfileUrl: '',
      colorCode: '#0d9488',
      specialtyId: '',
      authorisedSignatory: null,
      password: '',
      confirmPassword: ''
    });
    setSignatoryPreview(null);
    setIsEditing(false);
    setEditingId(null);
    setModalSearchTerm('');
    setStagedFiles([]);
    setExistingDocuments([]);
    setIsPasswordChanged(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing && !isPasswordChanged) {
      // Skip password match check
    } else if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (formData.email && String(formData.email).trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(formData.email).trim())) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      const method = isEditing ? 'put' : 'post';
      const url = isEditing ? `/doctor/updateDoctor/${editingId}` : '/doctor/addDoctor';

      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'image') {
          // Profile photo is not managed from this screen
        } else if (isEditing && !isPasswordChanged && (key === 'password' || key === 'confirmPassword')) {
          // Skip password fields if not changed
        } else if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      const response = await api({
        method,
        url,
        data,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const doctorId = isEditing ? editingId : response.data.data.id;

      // Upload staged documents if any
      const filesToUpload = stagedFiles.filter(d => !!d.file);
      if (filesToUpload.length > 0) {
        const docFormData = new FormData();
        docFormData.append('entityId', doctorId);
        docFormData.append('entityType', 'Doctor');
        
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

      showToast(response.data.message || 'Doctor saved successfully', 'success');
      fetchDoctors();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving doctor:', error);
      showToast(error.response?.data?.message || 'Error saving doctor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (doctor) => {
    setFormData({
      ...doctor,
      specialtyId: doctor.specialtyId || '',
      image: null,
      authorisedSignatory: null,
      password: '********',
      confirmPassword: '********'
    });

    setIsPasswordChanged(false);
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (doctor.authorisedSignatory) {
      setSignatoryPreview(fileUrl(doctor.authorisedSignatory));
    } else {
      setSignatoryPreview(null);
    }

    setEditingId(doctor.id);
    setIsEditing(true);
    setModalSearchTerm('');
    
    // Fetch existing documents
    const fetchDocs = async () => {
      try {
        const response = await api.get(`/document/list/Doctor/${doctor.id}`);
        setExistingDocuments(response.data.data || []);
      } catch (error) {
        console.error('Error fetching docs:', error);
      }
    };
    fetchDocs();
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Doctor',
      message: 'Are you sure you want to delete this doctor record?',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await api.delete(`/doctor/deleteDoctor/${id}`);
      showToast('Doctor record deleted successfully', 'success');
      fetchDoctors();
    } catch (error) {
      showToast('Error deleting doctor', 'error');
    }
  };

  const activeFilterCount = useMemo(
    () => countActiveFilters(filterData, DOCTOR_FILTER_KEYS),
    [filterData]
  );

  const doctorFilterFields = useMemo(() => [
    { type: 'multiselect', key: 'specialtyIds', label: 'Specialty', options: specialties, labelKey: 'name', placeholder: 'All Specialties' },
    { type: 'multiselect', key: 'doctorTypes', label: 'Doctor Type', options: DOCTOR_TYPE_OPTIONS, labelKey: 'text', placeholder: 'All Types' },
  ], [specialties]);

  const filteredDoctors = useMemo(() => doctors.filter((d) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matchesSearch =
        d.name?.toLowerCase().includes(q) ||
        d.mobileNo?.includes(q) ||
        d.email?.toLowerCase().includes(q) ;
      if (!matchesSearch) return false;
    }
    if (!matchesIds(d.specialtyId, filterData.specialtyIds)) return false;
    if (filterData.doctorTypes.length && !filterData.doctorTypes.includes(d.doctorType)) return false;
    return true;
  }), [doctors, searchTerm, filterData]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredDoctors, SORT_ACCESSORS);

  const modalSearchResults = doctors.filter(d => {
    if (!modalSearchTerm) return false;
    const term = modalSearchTerm.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(term);
    if (isNumeric) {
      if (term.length >= 10) return d.mobileNo?.includes(term);
      return false;
    }
    return d.name?.toLowerCase().includes(term);
  });
  const handleSelectDoctor = (doctor) => {
    handleEdit(doctor);
    setModalSearchTerm('');
  };

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="Doctor Master" />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Doctor Master</h1>
            <p className="text-slate-500 text-sm mt-1">Manage hospital doctors and consultants</p>
          </div>
        </div>
        {permissions.add && (
          <button
            className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
          >
            <Plus className="w-5 h-5" />
            Add Doctor
          </button>
        )}
      </div>

      <SearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search doctors..."
        onFilterClick={() => setIsFilterOpen(true)}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredDoctors.length}
        totalCount={doctors.length}
        recordLabel="doctors"
                exportModule="doctor"
            exportRows={filteredDoctors}
      />

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Doctors"
        filterData={filterData}
        setFilterData={setFilterData}
        emptyFilters={EMPTY_DOCTOR_FILTERS}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredDoctors.length}
        totalCount={doctors.length}
        fields={doctorFilterFields}
        resultLabel="doctors"
      />

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <SortableTh label="Doctor Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Contact Details" sortKey="contact" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Type" sortKey="doctorType" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Gender" sortKey="gender" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-3" />
                <SortableTh label="Actions" sortable={false} align="right" className="py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                        {d.image ? (
                          <img src={fileUrl(d.image)} alt={d.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-400 font-bold uppercase">{d.name?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{d.name}</div>
                        {d.User && <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5">ID: {d.User.id}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm text-slate-600 font-medium">{d.mobileNo}</div>
                    <div className="text-xs text-slate-400">{d.alternativeMobileNo || 'No Alt Mobile'}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${d.doctorType === 'Consultant' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                      {d.doctorType}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {d.gender}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setDocModalEntity(d)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View Documents">
                        <FileText className="w-4 h-4" />
                      </button>
                      {permissions.update && (
                        <button onClick={() => handleEdit(d)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.delete && (
                        <button onClick={() => handleDelete(d.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDoctors.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden animate-fade-in-up flex flex-col border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4 sticky top-0 z-70">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                  <UserPlus className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{isEditing ? 'Update Doctor Details' : 'Add New Doctor'}</h2>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Doctor Management System</p>
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
                  {modalSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-80 max-h-60 overflow-y-auto custom-scrollbar">
                      {modalSearchResults.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleSelectDoctor(d)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs overflow-hidden">
                            {d.image ? (
                              <img
                                src={fileUrl(d.image)}
                                className="w-full h-full object-cover"
                              />
                            ) : d.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{d.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>{d.mobileNo}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {modalSearchTerm && modalSearchResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-80 p-3 text-xs text-amber-600 font-medium italic">
                      No doctors found. For mobile search, enter at least 10 digits.
                    </div>
                  )}
                </div>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20" onSubmit={handleSubmit}>
              <div className="p-6 space-y-8 max-w-5xl mx-auto">
                {/* Section 1: Basic Information */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                      <UserSquare className="w-4 h-4 text-brand-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Basic Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Doctor Name <span className="text-rose-500">*</span></label>
                      <div className="relative group">
                        <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Dr. Full Name"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Gender <span className="text-rose-500">*</span></label>
                      <div className="flex p-1 bg-slate-100/50 border border-slate-100 rounded-2xl h-11">
                        {['Male', 'Female'].map(g => (
                          <label key={g} className="flex-1 relative cursor-pointer group">
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={formData.gender === g}
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className={`flex items-center justify-center h-full rounded-xl text-[10px] font-bold transition-all ${formData.gender === g ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                              {g}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mobile Number <span className="text-rose-500">*</span></label>
                      <div className="relative group">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="tel"
                          name="mobileNo"
                          required
                          value={formData.mobileNo}
                          onChange={handleInputChange}
                          placeholder="Primary Contact"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Alternative Mobile</label>
                      <div className="relative group">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="tel"
                          name="alternativeMobileNo"
                          value={formData.alternativeMobileNo}
                          onChange={handleInputChange}
                          placeholder="Secondary contact"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                      <div className="relative group">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="text"
                          inputMode="email"
                          autoComplete="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Leave blank if not available"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Doctor Type</label>
                      <div className="relative group">
                        <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <select
                          name="doctorType"
                          value={formData.doctorType}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 bg-white appearance-none cursor-pointer"
                        >
                          <option value="Consultant">In-House Consultant</option>
                          <option value="Visiting Consultant">Visiting Consultant</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-500 transition-colors" />
                      </div>
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Clinical Specialty</label>
                       <div className="relative group">
                         <Layout className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                         <select
                           name="specialtyId"
                           value={formData.specialtyId}
                           onChange={handleInputChange}
                           className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 bg-white appearance-none cursor-pointer"
                         >
                           <option value="">Select Specialty</option>
                           {specialties.map(s => <option key={s.id} value={s.id}>{s.text}</option>)}
                         </select>
                         <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-500 transition-colors" />
                       </div>
                     </div>

                     <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password {(!isEditing || isPasswordChanged) && <span className="text-rose-500">*</span>}</label>
                       <div className="relative group">
                         <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                         <input
                           type={showPassword ? "text" : "password"}
                           name="password"
                           required={!isEditing}
                           value={formData.password}
                           onChange={handleInputChange}
                           placeholder="••••••••"
                           className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                         />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                       </div>
                       {isEditing && <p className="text-[9px] text-slate-400 mt-1 italic ml-1">Edit to change. Indicators are hidden.</p>}
                     </div>

                     {(!isEditing || isPasswordChanged) && (
                       <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm Password <span className="text-rose-500">*</span></label>
                         <div className="relative group">
                           <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                           <input
                             type={showConfirmPassword ? "text" : "password"}
                             name="confirmPassword"
                             required={!isEditing}
                             value={formData.confirmPassword}
                             onChange={handleInputChange}
                             placeholder="••••••••"
                             className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
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
                  </div>
                </div>

                {/* Section 2: Access & Allocations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Module Access</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'accessPrescription', label: 'Prescription' },
                        { id: 'accessBilling', label: 'Billing' },
                        { id: 'accessPatients', label: 'Patients' },
                        { id: 'accessAppointments', label: 'Appointments' }
                      ].map(item => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-4 p-3.5 border rounded-2xl cursor-pointer transition-all ${formData[item.id] ? 'bg-brand-50/50 border-brand-200 shadow-sm' : 'border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-200'}`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData[item.id]}
                            onChange={(e) => setFormData(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          />
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${formData[item.id] ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/20' : 'border-slate-300 bg-white'}`}>
                            {formData[item.id] && <CheckSquare className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-sm font-semibold tracking-tight ${formData[item.id] ? 'text-brand-900' : 'text-slate-500'}`}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: Professional Bio & Digital Assets */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                      <Globe className="w-4 h-4 text-brand-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Professional Bio & Branding</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">About Doctor</label>
                      <div className="relative group">
                        <FileText className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Professional summary, experience and expertise..."
                          rows="4"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Google Profile URL</label>
                      <div className="relative group">
                        <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="url"
                          name="googleProfileUrl"
                          value={formData.googleProfileUrl}
                          onChange={handleInputChange}
                          placeholder="https://g.co/profile/..."
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Appointment Calendar Color</label>
                      <div className="flex gap-4 items-center h-[46px] px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500 transition-all">
                        <Palette className="w-4 h-4 text-slate-400" />
                        <input
                          type="color"
                          name="colorCode"
                          value={formData.colorCode}
                          onChange={handleInputChange}
                          className="w-10 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex-1 text-center">{formData.colorCode}</span>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Authorized Digital Signature</label>
                      <input
                        type="file"
                        ref={signatoryInputRef}
                        onChange={handleSignatoryChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div
                        onClick={triggerSignatoryInput}
                        className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-brand-400 hover:bg-white transition-all group"
                      >
                        {signatoryPreview ? (
                          <img src={signatoryPreview} alt="Signatory" className="h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-2 group-hover:text-brand-600 transition-colors" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select Signature File</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-sm py-2 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <span className="text-white text-[10px] font-bold uppercase tracking-widest">Update Signatory</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic mt-1 ml-1">Recommended: PNG with transparent background</p>
                    </div>

                    {/* Document Management Section - Compact & Professional */}
                    <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
                      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white hover:border-brand-300 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform border border-slate-100">
                            <FileText className="w-6 h-6 text-brand-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-bold text-slate-800 leading-tight">Doctor Documents</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Manage Certificates, ID Proofs & Licenses</p>
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
                </div>
              </div>

              {/* Footer */}
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
                  disabled={saving}
                  className="px-10 py-2.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-500 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-5 h-5" />
                      <span>{isEditing ? 'Update Doctor' : 'Complete Registration'}</span>
                    </>
                  )}
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
          entityType="Doctor"
          entityId={editingId}
          title="Manage Doctor Documents"
        />
      )}

      {/* Standalone Document Viewer (from the list) */}
      {docModalEntity && (
        <DocumentUploadSection
          isOpen={true}
          onClose={() => setDocModalEntity(null)}
          isStaged={false}
          entityType="Doctor"
          entityId={docModalEntity.id}
          title={`Documents — ${docModalEntity.name}`}
        />
      )}
    </div>
  );
};

export default DoctorMaster;