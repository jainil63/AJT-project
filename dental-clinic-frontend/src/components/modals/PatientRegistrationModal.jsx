import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Mail, Phone, MapPin, Calculator, Calendar, UserPlus, CreditCard, Stethoscope, AlertCircle, Briefcase, Users, IndianRupee, ChevronDown, ChevronUp, FileText, Search, Plus, UserSquare, ArrowRight } from 'lucide-react';
import useToast from '../../hooks/useToast';
import api from '../../api/axios';
import DocumentUploadSection from '../DocumentUploadSection';

const getTodayLocalYmd = () => {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const PatientRegistrationModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const { showToast } = useToast();
  // Step management: 'search' or 'form'
  const [step, setStep] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(false);
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(true);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatePatients, setDuplicatePatients] = useState([]);
  const [selectedDuplicateId, setSelectedDuplicateId] = useState(null);
  /** Amount deducted as surgeon charges when that payment type is selected (UI only; not sent on save). */
  const [surgeonChargesAmount, setSurgeonChargesAmount] = useState('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');


  // Array of staged docs: [{ tempId, documentTypeId, file, note }]
  const [stagedFiles, setStagedFiles] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Masters Data
  const [medicalAlerts, setMedicalAlerts] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [allPatients, setAllPatients] = useState([]); // For new-patient duplicate check on submit

  const [formData, setFormData] = useState({
    patientName: '',
    mobileNo: '',
    alternativeMobileNo: '',
    gender: 'Male',
    dob: '',
    age: '',
    email: '',
    aadharNo: '',
    panNo: '',
    height: '',
    weight: '',
    bloodGroup: '',
    medicalAlertId: '',
    occupation: '',
    referredBy: '',
    familyHistory: '',
    address: '',
    city: '',
    pincode: '',
    country: 'India',
    appointmentType: "Today's Visit",
    doctorId: '',
    registrationFee: '',
    paymentMode: '',
    paymentCategories: ['PaymentReceived'],
    appointmentDateTime: '',
    registrationDate: getTodayLocalYmd(),
  });

  const fetchMasters = async () => {
    try {
      const [formRes, patientsRes] = await Promise.all([
        api.get('/form-dropdowns/patientRegistration'),
        // Load a small batch for duplicate-mobile check on submit (not for step-1 search)
        api.get('/patient/getPatient?limit=500').catch(() => ({ data: { data: [] } })),
      ]);
      const fd = formRes.data.data || {};
      setMedicalAlerts(fd.medicalAlerts || []);
      setDoctors(fd.doctors || []);
      setPaymentMethods(fd.paymentMethods || []);
      setTreatments(fd.treatments || []);
      setAllPatients(patientsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  useEffect(() => {
    if (!(formData.paymentCategories || []).includes('SurgeonCharges')) {
      setSurgeonChargesAmount('');
    }
  }, [formData.paymentCategories]);

  // Whenever the user enters an amount with no payment type selected at all,
  // surface "Payment Received" so the Credit entry being created is never invisible.
  // (Backend already defaults to this, but the UI should match — only auto-add when
  // the user hasn't explicitly chosen a different category like SurgeonCharges.)
  useEffect(() => {
    const amount = parseFloat(formData.registrationFee) || 0;
    const cats = formData.paymentCategories || [];
    if (amount > 0 && cats.length === 0) {
      setFormData(prev => ({ ...prev, paymentCategories: ['PaymentReceived'] }));
    }
  }, [formData.registrationFee, formData.paymentCategories]);

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
      setStep('search');
      setSearchTerm('');
      setSearchResults([]);
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    const query = searchTerm.trim();
    const isNumeric = /^\d+$/.test(query);
    const minLength = isNumeric ? 6 : 3;
    if (query.length < minLength) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const controller = new AbortController();
    api.get('/patient/getPatient', {
      params: { search: query, limit: 20 },
      signal: controller.signal,
    }).then(res => {
      setSearchResults(res.data.data || []);
    }).catch(err => {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') setSearchResults([]);
    }).finally(() => setIsSearching(false));
    return () => controller.abort();
  }, [searchTerm]);

  const handleSelectExistingPatient = (patient) => {
    const plain = typeof patient.toJSON === 'function' ? patient.toJSON() : { ...patient };
    [
      'registrationFee',
      'registration_fee',
      'paymentMode',
      'payment_mode',
      'paymentCategories',
      'payment_categories'
    ].forEach((k) => {
      if (k in plain) delete plain[k];
    });


    setFormData({
      ...plain,
      appointmentDateTime: patient.appointmentDateTime
        ? new Date(patient.appointmentDateTime).toISOString().slice(0, 16)
        : '',
      registrationDate: getTodayLocalYmd(),
      registrationFee: '',
      paymentMode: '',
      paymentCategories: ['PaymentReceived']
    });
    setSurgeonChargesAmount('');
    setSelectedTreatmentId('');
    setEditingId(patient.id);
    setIsEditing(true);
    setIsBasicInfoOpen(false);
    setIsAdditionalDetailsOpen(false);
    setIsAppointmentOpen(false);
    setStep('form');

    const fetchDocs = async () => {
      try {
        const response = await api.get(`/document/list/Patient/${patient.id}`);
        setExistingDocuments(response.data.data || []);
      } catch (error) {
        console.error('Error fetching docs:', error);
      }
    };
    fetchDocs();
  };

  useEffect(() => {
    if (isOpen && initialData) {
      handleSelectExistingPatient(initialData);
    }
  }, [isOpen, initialData]);

  const handleCreateNewPatient = () => {
    resetForm();
    setIsEditing(false);
    setEditingId(null);
    // Carry the search term into the new-patient form so the user doesn't
    // have to re-type what they just searched. A numeric query is treated as
    // a mobile number, anything else as the patient's name.
    const term = (searchTerm || '').trim();
    if (term) {
      const looksLikeMobile = /^[+\d][\d\s-]*$/.test(term);
      setFormData((prev) => ({
        ...prev,
        mobileNo: looksLikeMobile ? term : prev.mobileNo,
        patientName: looksLikeMobile ? prev.patientName : term
      }));
    }
    setStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePaymentCategory = (category) => {
    setFormData(prev => {
      const current = prev.paymentCategories || [];
      const has = current.includes(category);
      if (has) return { ...prev, paymentCategories: current.filter(c => c !== category) };
      // Refund is mutually exclusive with the credit-side tags
      if (category === 'Refund') return { ...prev, paymentCategories: ['Refund'] };
      const without = current.filter(c => c !== 'Refund');
      return { ...prev, paymentCategories: [...without, category] };
    });
  };



  const resetForm = () => {
    setFormData({
      patientName: '',
      mobileNo: '',
      alternativeMobileNo: '',
      gender: 'Male',
      dob: '',
      age: '',
      email: '',
      aadharNo: '',
      panNo: '',
      height: '',
      weight: '',
      bloodGroup: '',
      medicalAlertId: '',
      occupation: '',
          referredBy: '',
      familyHistory: '',
      address: '',
      city: '',
      pincode: '',
      country: 'India',
      appointmentType: "Today's Visit",
      doctorId: '',
      registrationFee: '',
      paymentMode: '',
      paymentCategories: ['PaymentReceived'],
      appointmentDateTime: '',
      registrationDate: getTodayLocalYmd(),
      });
    setIsEditing(false);
    setEditingId(null);
    setStagedFiles([]);
    setExistingDocuments([]);
    setSurgeonChargesAmount('');
    setSelectedTreatmentId('');
    setIsBasicInfoOpen(true);
    setIsAdditionalDetailsOpen(false);
    setIsAppointmentOpen(true);
  };

  const savePatient = async (forceNew = false) => {
    try {
      setSaving(true);
      const method = isEditing ? 'put' : 'post';
      const url = isEditing ? `/patient/updatePatient/${editingId}` : '/patient/addPatient';

      const data = new FormData();
      Object.keys(formData).forEach(key => {
        let value = formData[key];
        const optionalFields = ['appointmentDateTime', 'registrationDate', 'bloodGroup', 'medicalAlertId', 'doctorId', 'registrationFee', 'height', 'weight'];
        if (optionalFields.includes(key) && value === '') {
          value = null;
        }
        if (key === 'paymentCategories') {
          (Array.isArray(value) ? value : []).forEach(c => data.append('paymentCategories', c));
          return;
        }
        if (key !== 'patientPhoto' && value !== null && value !== undefined) {
          if (isEditing && key === 'registrationDate') {
            // Do not send registrationDate to avoid modifying patient's original registration date in the database
            return;
          }
          data.append(key, value);
        }
      });
      if (isEditing) {
        // Send transactionDate to specify the transaction date on the backend
        data.append('transactionDate', formData.registrationDate || getTodayLocalYmd());
      }
      if (surgeonChargesAmount !== '' && surgeonChargesAmount != null) {
        data.append('surgeonChargesAmount', surgeonChargesAmount);
      }

      const response = await api({
        method,
        url,
        data,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const patientId = isEditing ? editingId : response.data.data.id;
      const savedPatient = response.data.data;

      // Upload staged documents if any
      const filesToUpload = stagedFiles.filter(d => !!d.file);
      if (filesToUpload.length > 0) {
        const docFormData = new FormData();
        docFormData.append('entityId', patientId);
        docFormData.append('entityType', 'Patient');
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


      // Auto-create a Visit entry when:
      //  - existing patient is being updated (they came for a follow-up), OR
      //  - new patient registration with "Today's Visit" appointment type
      const shouldCreateVisit = isEditing || formData.appointmentType === "Today's Visit";
      if (shouldCreateVisit) {
        try {
          await api.post('/opdMaster/addOPDMaster', {
            patientId: patientId,
            date: formData.registrationDate || getTodayLocalYmd(),
            doctorId: formData.doctorId || null,
            statusId: null,
            treatmentId: selectedTreatmentId || null
          });
        } catch (visitErr) {
          console.error('Auto-create visit failed:', visitErr);
        }
      }

      showToast(response.data.message || 'Patient saved successfully', 'success');
      if (onSuccess) onSuccess(savedPatient || { id: patientId, ...formData });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving patient:', error);
      showToast(error.response?.data?.message || 'Error saving patient', 'error');
    } finally {
      setSaving(false);
    }
  };

  const validatePaymentSection = () => {
    const cats = formData.paymentCategories || [];
    const amount = parseFloat(formData.registrationFee) || 0;
    const surgeon = parseFloat(surgeonChargesAmount) || 0;
    const hasRefund = cats.includes('Refund');
    const hasSurgeon = cats.includes('SurgeonCharges');

    // The user is only recording a payment if they typed an amount or surgeon charges
    // (or explicitly picked Refund/SurgeonCharges). PaymentReceived alone, with an empty
    // amount, means "no payment to record" — patient registration should still go through.
    const isRecordingPayment = amount > 0 || surgeon > 0 || hasRefund;
    if (!isRecordingPayment) return true;

    if (hasRefund && amount <= 0) {
      showToast('Enter the refund amount.', 'error');
      return false;
    }

    if (hasSurgeon && surgeon <= 0) {
      showToast('Enter the surgeon charges amount.', 'error');
      return false;
    }

    if (!formData.paymentMode) {
      showToast('Select a payment method to record the transaction in the account.', 'error');
      return false;
    }

    return true;
  };

  const validateTreatment = () => {
    if (!selectedTreatmentId) {
      showToast('Please select a treatment.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && !validateTreatment()) return;
    if (!validatePaymentSection()) return;
    if (!isEditing && formData.mobileNo) {
      const existing = allPatients.filter(p => p.mobileNo === formData.mobileNo);
      if (existing.length > 0) {
        setDuplicatePatients(existing);
        setShowDuplicateModal(true);
        setSelectedDuplicateId(null);
        return;
      }
    }
    await savePatient();
  };

  if (!isOpen) return null;

  // STEP 1: Search View
  if (step === 'search') {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col">
          {/* Header */}
          <div className="px-6 py-6 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-200 shadow-sm">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Find Patient</h2>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-1">Step 1 of 2: Search or Create</p>
              </div>
            </div>
            <button onClick={() => { onClose(); setStep('search'); setSearchTerm(''); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 flex-1">
            <div className="space-y-8">
              {/* Search Input */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4 text-brand-600" />
                  Search by Name or Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="Type at least 3 characters — name or mobile number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-base font-medium placeholder:text-slate-400"
                  autoFocus
                />
                {(() => {
                  const isNumeric = /^\d+$/.test(searchTerm.trim());
                  const minSearchLength = isNumeric ? 6 : 3;
                  if (searchTerm.trim().length > 0 && searchTerm.trim().length < minSearchLength) {
                    return (
                      <p className="text-xs text-slate-400 mt-1 pl-1">
                        {minSearchLength - searchTerm.trim().length} more character{minSearchLength - searchTerm.trim().length !== 1 ? 's' : ''} to search…
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Search Results */}
              <div className="space-y-3">
                {searchTerm && isSearching && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Searching...</p>
                  </div>
                )}

                {(() => {
                  const isNumeric = /^\d+$/.test(searchTerm.trim());
                  const minSearchLength = isNumeric ? 6 : 3;
                  return searchTerm.trim().length >= minSearchLength && !isSearching && searchResults.length > 0 && (
                    <>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Found {searchResults.length} Patient(s)
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {searchResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => handleSelectExistingPatient(patient)}
                            className="w-full p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all text-left flex items-center justify-between group"
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {patient.patientName}
                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">EXISTING</span>
                              </div>
                              <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>📱 {patient.mobileNo}</span>
                                <span>⚧ {patient.gender} • {patient.age} yrs</span>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {(() => {
                  const isNumeric = /^\d+$/.test(searchTerm.trim());
                  const minSearchLength = isNumeric ? 6 : 3;
                  return searchTerm.trim().length >= minSearchLength && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-8 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                      </div>
                      <p className="font-semibold text-slate-900">No Existing Patient Found</p>
                      <p className="text-sm text-slate-600">This patient doesn't exist yet. Create a new record below.</p>
                    </div>
                  );
                })()}
              </div>

              {/* Create New Button */}
              <button
                type="button"
                onClick={handleCreateNewPatient}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                {searchTerm ? 'Create New Patient Record' : 'Register New Patient'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Form View
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden animate-fade-in-up flex flex-col">
        {/* Header — single line layout on phone; title doesn't wrap to 3 lines anymore */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-4 md:px-6 md:py-6 border-b border-slate-100 bg-linear-to-r from-brand-50 to-white flex justify-between items-center gap-2 sm:gap-4 sticky top-0 z-60">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-brand-100 text-brand-600 rounded-xl md:rounded-2xl flex items-center justify-center border border-brand-200 shadow-sm shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base md:text-2xl font-bold text-slate-900 tracking-tight truncate">{isEditing ? 'Record Visit' : 'New Patient Registration'}</h2>
              <p className="hidden xsm:block text-[9px] sm:text-[10px] md:text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5 md:mt-1 truncate">Step 2 of 2{isEditing && formData.patientName ? ` · ${formData.patientName}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStep('search')}
              className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap"
              title="Back to Search"
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">Back to Search</span>
              <span className="sm:hidden">Back</span>
            </button>
            <button onClick={() => { onClose(); setStep('search'); setSearchTerm(''); }} className="text-slate-400 hover:text-slate-600 p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-8 overflow-y-auto flex-1">
            {/* Section 1: Basic Info */}
            <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <button type="button" onClick={() => setIsBasicInfoOpen(!isBasicInfoOpen)} className="w-full px-6 py-4 bg-white flex items-center justify-between group hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isBasicInfoOpen ? 'bg-brand-100 text-brand-600' : 'bg-white text-slate-400 border border-slate-200'} transition-colors`}><UserSquare className="w-4 h-4" /></div><span className="text-sm font-bold text-slate-800 uppercase tracking-widest">Basic Information</span></div>
                {isBasicInfoOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {isBasicInfoOpen && <div className="bg-white px-6 pb-6 space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Patient Name <span className="text-rose-500">*</span></label>
                  <input type="text" name="patientName" required value={formData.patientName} onChange={handleInputChange} placeholder="Full Name" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mobile Number <span className="text-rose-500">*</span></label>
                  <div className="relative group"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" /><input type="tel" name="mobileNo" required value={formData.mobileNo} onChange={handleInputChange} placeholder="Primary Contact" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800" /></div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Gender <span className="text-rose-500">*</span></label>
                  <div className="flex p-1 bg-slate-100/50 border border-slate-100 rounded-2xl h-11">
                    {['Male', 'Female'].map(g => (
                      <label key={g} className="flex-1 relative cursor-pointer group">
                        <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleInputChange} className="sr-only" />
                        <div className={`flex items-center justify-center h-full rounded-xl text-xs font-bold transition-all ${formData.gender === g ? 'bg-white text-brand-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>{g}</div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Age</label><div className="relative group"><Calculator className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" /><input type="number" name="age" value={formData.age} onChange={handleInputChange} onWheel={(e) => e.target.blur()} placeholder="Age" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800" /></div></div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date</label>
                  <div className="relative group">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                    <input type="date" name="registrationDate" max={getTodayLocalYmd()} value={formData.registrationDate} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800 min-h-[42px] disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Alt. Contact</label><div className="relative group"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" /><input type="tel" name="alternativeMobileNo" value={formData.alternativeMobileNo} onChange={handleInputChange} placeholder="Emergency Contact" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium text-slate-800" /></div></div>
              </div>
              </div>}
            </div>

            {/* Section 2: Additional Details (Collapsible) */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <button type="button" onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)} className="w-full px-6 py-4 bg-slate-50/80 flex items-center justify-between group hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isAdditionalDetailsOpen ? 'bg-brand-100 text-brand-600' : 'bg-white text-slate-400 border border-slate-200'} transition-colors`}><Plus className={`w-4 h-4 transition-transform duration-300 ${isAdditionalDetailsOpen ? 'rotate-45' : ''}`} /></div><span className="font-bold text-slate-700 tracking-tight">Additional Details</span></div>
                {isAdditionalDetailsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {isAdditionalDetailsOpen && (
                <div className="p-6 space-y-8 animate-fade-in">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Identity & Medical</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Email Address</label><div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="example@mail.com" className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /></div></div>
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Aadhar No.</label><input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleInputChange} placeholder="12 Digit No." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /></div>
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">PAN No.</label><input type="text" name="panNo" value={formData.panNo} onChange={handleInputChange} placeholder="Ex: ABCDE1234F" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm uppercase" /></div>
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Blood Group</label><div className="relative"><select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm appearance-none bg-white pr-10"><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}</select><ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div></div>
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Medical Alert</label><div className="relative"><select name="medicalAlertId" value={formData.medicalAlertId} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm appearance-none bg-white pr-10"><option value="">None</option>{medicalAlerts.map(alert => <option key={alert.id} value={alert.id}>{alert.text}</option>)}</select><ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div></div>
                      <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Height (cm)</label><input type="number" name="height" value={formData.height} onChange={handleInputChange} onWheel={(e) => e.target.blur()} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /></div><div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Weight (kg)</label><input type="number" name="weight" value={formData.weight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /></div></div>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Professional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Occupation</label><input type="text" name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /></div>
                    </div>
                  </div>
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4"><h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Family History</h4><textarea name="familyHistory" rows="4" value={formData.familyHistory} onChange={handleInputChange} placeholder="Describe any chronic illnesses or conditions in family..." className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm resize-none bg-white"></textarea></div>
                      <div className="space-y-4"><h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Residential Address</h4><div className="space-y-4"><textarea name="address" rows="1" value={formData.address} onChange={handleInputChange} placeholder="Street address..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm resize-none"></textarea><div className="grid grid-cols-2 gap-4"><input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="City" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /><input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="Pincode" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm" /></div></div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Appointment Details */}
            <div className="border border-brand-100/80 rounded-3xl overflow-hidden shadow-sm">
              <button type="button" onClick={() => setIsAppointmentOpen(!isAppointmentOpen)} className="w-full px-6 py-4 bg-brand-50/30 flex items-center justify-between group hover:bg-brand-50 transition-colors">
                <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isAppointmentOpen ? 'bg-brand-100 text-brand-600' : 'bg-white text-slate-400 border border-slate-200'} transition-colors`}><Calendar className="w-4 h-4" /></div><span className="text-sm font-bold text-slate-800 uppercase tracking-widest">Appointment Details</span></div>
                {isAppointmentOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {isAppointmentOpen && <div className="bg-brand-50/20 px-8 pb-8 space-y-8 animate-fade-in">
              <div className="space-y-8">
                <div className="space-y-3"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Type of Appointment</label><div className="flex flex-wrap gap-4">{["Today's Visit", "Future Appointment"].map((type) => (<label key={type} className="relative cursor-pointer group"><input type="radio" name="appointmentType" value={type} checked={formData.appointmentType === type} onChange={handleInputChange} className="sr-only" /><div className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 border-2 ${formData.appointmentType === type ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-600/20 scale-[1.02]' : 'bg-white text-slate-600 border-slate-100 hover:border-brand-200 hover:text-brand-600'}`}>{type}</div></label>))}</div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
                  <div className="space-y-2 md:col-span-2 lg:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Assigned Doctor</label><div className="relative group"><Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" /><select name="doctorId" value={formData.doctorId} onChange={handleInputChange} className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-semibold text-slate-800 bg-white appearance-none shadow-sm"><option value="">Search/Select Doctor</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select><ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-500 transition-colors" /></div></div>
                  {formData.appointmentType === "Future Appointment" && (<div className="space-y-2 md:col-span-2 lg:col-span-1 animate-fade-in"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Preferred Date & Time</label><div className="relative group"><Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" /><input type="datetime-local" name="appointmentDateTime" value={formData.appointmentDateTime} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-semibold text-slate-800 bg-white shadow-sm" /></div></div>)}
                </div>
              </div>
              </div>}
            </div>

            {/* Section 4: Payment */}
            {(() => {
              const cats = formData.paymentCategories || [];
              const hasPaymentReceived = cats.includes('PaymentReceived');
              const hasRefund = cats.includes('Refund');
              const hasSurgeon = cats.includes('SurgeonCharges');
              const amountNum = parseFloat(formData.registrationFee) || 0;
              const surgeonNum = parseFloat(surgeonChargesAmount) || 0;
              // "Recording a payment" requires an actual amount, surgeon charges, or an explicit Refund.
              // PaymentReceived alone with an empty Amount = patient registration without payment, no errors.
              const isRecordingPayment = amountNum > 0 || surgeonNum > 0 || hasRefund;
              const requiresAmount = hasRefund;
              const requiresMode = isRecordingPayment;
              const creditEntryReady = hasPaymentReceived && amountNum > 0 && !!formData.paymentMode;
              const refundEntryReady = hasRefund && amountNum > 0 && !!formData.paymentMode;
              const surgeonEntryReady = hasSurgeon && surgeonNum > 0 && !!formData.paymentMode;
              return (
            <div className="bg-emerald-50/30 p-8 rounded-3xl border border-emerald-100/60 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{isEditing ? 'Add New Payment' : 'Initial Payment'}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {hasRefund
                        ? 'Refund — this amount will be recorded as a Debit entry in the patient account.'
                        : 'Payment Received — the amount entered will be recorded as a Credit entry in the patient account.'}
                    </p>
                  </div>
                </div>
              </div>
              {!isEditing && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Treatment <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <select
                    value={selectedTreatmentId}
                    onChange={(e) => setSelectedTreatmentId(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-semibold text-slate-800 bg-white appearance-none shadow-sm ${!selectedTreatmentId ? 'border-rose-300' : 'border-slate-200'}`}
                  >
                    <option value="">Select Treatment *</option>
                    {treatments.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {!selectedTreatmentId && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Select the treatment for this visit.
                  </p>
                )}
              </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Amount {requiresAmount && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative group">
                    <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    <input type="number" min="0" step="0.01" name="registrationFee" value={formData.registrationFee} onChange={handleInputChange} onWheel={(e) => e.target.blur()} placeholder="0.00" className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold text-slate-800 bg-white shadow-sm ${requiresAmount && amountNum <= 0 ? 'border-rose-300' : 'border-slate-200'}`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Payment Method {requiresMode && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative group">
                    <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange} className={`w-full pl-10 pr-10 py-2.5 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-semibold text-slate-800 bg-white appearance-none shadow-sm ${requiresMode && !formData.paymentMode ? 'border-rose-300' : 'border-slate-200'}`}>
                      <option value="">Select Payment Mode</option>
                      {paymentMethods.map(m => (<option key={m.id} value={m.id}>{m.text}</option>))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Type</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'PaymentReceived', label: 'Payment Received', tone: 'emerald' },
                    { id: 'SurgeonCharges',  label: 'Surgeon Charges',  tone: 'sky' },
                    { id: 'Refund',          label: 'Refund',           tone: 'rose' }
                  ].map(opt => {
                    const checked = (formData.paymentCategories || []).includes(opt.id);
                    const toneActive = {
                      emerald: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20',
                      sky:     'bg-sky-600 text-white border-sky-600 shadow-sky-500/20',
                      rose:    'bg-rose-600 text-white border-rose-600 shadow-rose-500/20'
                    }[opt.tone];
                    const dotBg = {
                      emerald: 'bg-emerald-600',
                      sky:     'bg-sky-600',
                      rose:    'bg-rose-600'
                    }[opt.tone];
                    return (
                      <label key={opt.id} className={`relative cursor-pointer select-none flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all ${checked ? `${toneActive} shadow-md` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePaymentCategory(opt.id)} />
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-white border-white' : 'border-slate-300'}`}>
                          {checked && <span className={`w-2 h-2 rounded-sm ${dotBg}`}></span>}
                        </span>
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
                {hasRefund && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1"><AlertCircle className="w-3.5 h-3.5" /> Refund will be recorded as a Debit transaction in the account.</p>
                )}
                {(formData.paymentCategories || []).includes('SurgeonCharges') && (
                  <div className="mt-4 space-y-2 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Surgeon charges amount</label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-600" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={surgeonChargesAmount}
                        onChange={(e) => setSurgeonChargesAmount(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-2.5 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold text-slate-800 bg-white"
                      />
                    </div>
                    {(() => {
                      const paid = parseFloat(formData.registrationFee) || 0;
                      const surgeon = parseFloat(surgeonChargesAmount) || 0;
                      const totalAfter = Math.max(0, paid - surgeon);
                      return (
                        <div className="pt-2 border-t border-sky-100 space-y-1 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Payment amount</span>
                            <span className="font-semibold text-slate-800">₹{paid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Surgeon charges</span>
                            <span className="font-semibold text-sky-700">− ₹{surgeon.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-800 font-bold pt-1">
                            <span>Total</span>
                            <span>₹{totalAfter.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Account Entry Preview */}
              {(creditEntryReady || refundEntryReady || surgeonEntryReady) && (
                <div className="rounded-2xl bg-white border border-emerald-200 p-4 space-y-2 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account entry preview</p>
                  {creditEntryReady && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-medium flex items-center gap-2"><ArrowRight className="w-4 h-4 text-emerald-600" /> Credit (Payment Received)</span>
                      <span className="font-bold text-emerald-700">+ ₹{amountNum.toFixed(2)}</span>
                    </div>
                  )}
                  {refundEntryReady && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-medium flex items-center gap-2"><ArrowRight className="w-4 h-4 text-rose-600" /> Debit (Refund)</span>
                      <span className="font-bold text-rose-700">- ₹{amountNum.toFixed(2)}</span>
                    </div>
                  )}
                  {surgeonEntryReady && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-medium flex items-center gap-2"><ArrowRight className="w-4 h-4 text-sky-600" /> Debit (Surgeon Charges)</span>
                      <span className="font-bold text-sky-700">- ₹{surgeonNum.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Inline validation hints — only nudge once the user starts recording a payment */}
              {hasRefund && amountNum <= 0 && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Enter the refund amount.</p>
              )}
              {hasSurgeon && surgeonNum <= 0 && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Enter the surgeon charges amount.</p>
              )}
              {isRecordingPayment && !formData.paymentMode && (
                <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Select a payment method to record the transaction in the account.</p>
              )}
            </div>
            );
            })()}

            {/* Document Management Section */}
            <div className="pt-6 mt-4 border-t border-slate-100">
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white hover:border-brand-300 transition-all shadow-sm">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform border border-slate-100"><FileText className="w-6 h-6 text-brand-600" /></div><div className="text-left"><h4 className="text-sm font-bold text-slate-800 leading-tight">Patient Documents</h4><p className="text-[11px] text-slate-500 mt-0.5">Manage ID Proofs, Reports & Consent Forms</p></div></div>
                <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                  <button type="button" onClick={() => setIsDocumentModalOpen(true)} className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all shadow-sm flex items-center justify-center gap-2 text-sm whitespace-nowrap active:scale-95"><Plus className="w-4 h-4" />{stagedFiles.length > 0 ? `Manage Documents (${stagedFiles.length})` : 'Add Documents'}</button>
                  {stagedFiles.length > 0 && <span className="text-[9px] text-brand-600 font-bold uppercase tracking-widest px-2 py-0.5 bg-brand-50 rounded-full self-center sm:self-auto animate-pulse">Draft Saved</span>}
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-70">
            <button type="button" onClick={() => { onClose(); setStep('search'); setSearchTerm(''); }} disabled={saving} className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-8 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center gap-2">{saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}{saving ? 'Saving...' : (isEditing ? 'Save Visit' : 'Complete Registration')}</button>
          </div>
        </form>
      </div>

      {isDocumentModalOpen && (
        <DocumentUploadSection 
          isOpen={true} 
          onClose={() => setIsDocumentModalOpen(false)} 
          isStaged={true} 
          stagedDocuments={stagedFiles}
          onChange={setStagedFiles}
          existingDocuments={existingDocuments} 
          entityType="Patient" 
          entityId={editingId} 
          title="Manage Patient Documents" 
        />
      )}

      {/* Duplicate Mobile Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-150 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-slate-800">Mobile Number Already Exists</h3></div><button onClick={() => setShowDuplicateModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors" type="button"><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="p-6"><p className="text-sm text-slate-600 mb-4">The mobile number <span className="font-bold text-slate-900">{formData.mobileNo}</span> is already registered with:</p><div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">{duplicatePatients.map((p) => (<label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedDuplicateId === p.id ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}><input type="radio" name="duplicatePatient" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" checked={selectedDuplicateId === p.id} onChange={() => setSelectedDuplicateId(p.id)} /><div><div className="text-sm font-bold text-slate-800">{p.patientName}</div><div className="text-[10px] text-slate-500">ID: {p.id} • {p.gender} • {p.age} Years</div></div></label>))}</div><div className="flex items-center gap-3"><button type="button" onClick={() => { const selected = duplicatePatients.find(p => p.id === selectedDuplicateId); if (selected) { setShowDuplicateModal(false); handleSelectExistingPatient(selected); } }} disabled={!selectedDuplicateId} className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/25 transition-all disabled:opacity-50 disabled:shadow-none">Old</button><button type="button" onClick={() => savePatient(true)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all border border-slate-200">New</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRegistrationModal;
