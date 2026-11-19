import React, { useState, useEffect } from 'react';
import { X, Calendar, ClipboardList, IndianRupee, CreditCard, MessageSquare, Loader2, Stethoscope, User, AlertCircle } from 'lucide-react';
import useToast from '../../hooks/useToast';
import api from '../../api/axios';

const EditVisitAndPaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
  patientDate
}) => {
  const { showToast } = useToast();
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Master lists
  const [doctors, setDoctors] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);

  // Form states
  const [newDate, setNewDate] = useState('');
  
  // Visit state (from OPDMaster)
  const [hasVisit, setHasVisit] = useState(false);
  const [visitId, setVisitId] = useState('');
  const [visitForm, setVisitForm] = useState({
    doctorId: '',
    treatmentId: '',
    statusId: '',
    bloodPressure: '',
    height: '',
    weight: '',
    remark: ''
  });

  // Transactions state
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (isOpen && patientId && patientDate) {
      setNewDate(patientDate);
      fetchInitialData();
    }
  }, [isOpen, patientId, patientDate]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Fetch data and masters in parallel
      const [
        dataRes,
        doctorsRes,
        treatmentsRes,
        statusesRes,
        paymentModesRes
      ] = await Promise.all([
        api.get('/dashboard/patient-visit-payment', { params: { patientId, date: patientDate } }),
        api.get('/doctor/getDoctors'),
        api.get('/treatment/getTreatment'),
        api.get('/opdStatus/getOPDStatus'),
        api.get('/paymentBy/getPaymentBy')
      ]);

      // Populate masters
      setDoctors(doctorsRes.data.data || []);
      setTreatments(treatmentsRes.data.data || []);
      setStatuses(statusesRes.data.data || []);
      setPaymentModes(paymentModesRes.data.data || []);

      // Populate visit and transactions
      const { visit, transactions: txns } = dataRes.data.data || {};
      
      if (visit) {
        setHasVisit(true);
        setVisitId(visit.id);
        setVisitForm({
          doctorId: visit.doctorId || '',
          treatmentId: visit.treatmentId || '',
          statusId: visit.statusId || '',
          bloodPressure: visit.bloodPressure || '',
          height: visit.height || '',
          weight: visit.weight || '',
          remark: visit.remark || ''
        });
      } else {
        setHasVisit(false);
        setVisitId('');
        setVisitForm({
          doctorId: '',
          treatmentId: '',
          statusId: '',
                bloodPressure: '',
          height: '',
          weight: '',
          remark: ''
        });
      }

      setTransactions(txns || []);
    } catch (error) {
      console.error('Error fetching edit visit and payment details:', error);
      showToast('Failed to load visit and payment details', 'error');
      onClose();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleVisitChange = (e) => {
    const { name, value } = e.target;
    setVisitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTransactionChange = (index, field, value) => {
    setTransactions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const payload = {
        patientId,
        originalDate: patientDate,
        newDate,
        visitData: hasVisit ? visitForm : null,
        transactionsData: transactions.map(t => ({
          id: t.id,
          amount: parseFloat(t.amount || 0),
          paymentById: t.paymentById,
          remark: t.remark || '',
          paymentType: t.paymentType
        }))
      };

      await api.put('/dashboard/patient-visit-payment', payload);
      showToast('Visit and payment details updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating visit and payment details:', error);
      showToast(error.response?.data?.message || 'Failed to update visit and payment details', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
              <ClipboardList className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Edit Visit & Payment</h2>
              <p className="text-slate-500 text-xs">Patient: <span className="font-semibold text-brand-600">{patientName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm font-medium">Fetching details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            {/* 1. Date Config */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Visit & Transaction Date
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Selected Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Changing this date will update both the visit date and all transactions on this date to the new date.</p>
                </div>
              </div>
            </div>

            {/* 2. Visit Details Section */}
            <div className="p-4 border border-slate-200/60 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-slate-400" />
                Visit Details
              </h3>
              
              {!hasVisit ? (
                <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  No visit (OPD) entry exists for this patient on this date. Only payment records can be modified.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Doctor */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Doctor</label>
                    <select
                      name="doctorId"
                      value={visitForm.doctorId}
                      onChange={handleVisitChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Treatment */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Treatment</label>
                    <select
                      name="treatmentId"
                      value={visitForm.treatmentId}
                      onChange={handleVisitChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                    >
                      <option value="">Select Treatment</option>
                      {treatments.map((t) => (
                        <option key={t.id} value={t.id}>{t.text}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Status</label>
                    <select
                      name="statusId"
                      value={visitForm.statusId}
                      onChange={handleVisitChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                    >
                      <option value="">Select Status</option>
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>{s.text}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vitals */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Blood Pressure</label>
                    <input
                      type="text"
                      name="bloodPressure"
                      value={visitForm.bloodPressure}
                      onChange={handleVisitChange}
                      placeholder="e.g. 120/80"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Height</label>
                      <input
                        type="text"
                        name="height"
                        value={visitForm.height}
                        onChange={handleVisitChange}
                        placeholder="e.g. 170 cm"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Weight</label>
                      <input
                        type="text"
                        name="weight"
                        value={visitForm.weight}
                        onChange={handleVisitChange}
                        placeholder="e.g. 65 kg"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Remark</label>
                    <textarea
                      name="remark"
                      value={visitForm.remark}
                      onChange={handleVisitChange}
                      rows={2}
                      placeholder="Visit remarks..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none text-sm font-medium text-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Payment Details Section */}
            <div className="p-4 border border-slate-200/60 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-slate-400" />
                Transactions on this Date
              </h3>

              {transactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-sm">
                  No payment transactions found for this patient on this date.
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((txn, index) => (
                    <div key={txn.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                      <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-brand-600 text-white rounded text-[9px] font-bold uppercase tracking-wider">
                        {txn.paymentType} Entry
                      </div>
                      
                      {/* Amount */}
                      <div className="space-y-1 mt-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Amount (₹)</label>
                        <div className="relative">
                          <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            value={txn.amount}
                            onChange={(e) => handleTransactionChange(index, 'amount', e.target.value)}
                            onWheel={(e) => e.target.blur()}
                            required
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-bold text-slate-700 bg-white"
                          />
                        </div>
                      </div>

                      {/* Payment Mode */}
                      <div className="space-y-1 mt-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Payment Mode</label>
                        <div className="relative">
                          <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={txn.paymentById}
                            onChange={(e) => handleTransactionChange(index, 'paymentById', e.target.value)}
                            required
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-semibold text-slate-700 bg-white"
                          >
                            <option value="">Select Mode</option>
                            {paymentModes.map((mode) => (
                              <option key={mode.id} value={mode.id}>{mode.text}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Remark */}
                      <div className="space-y-1 mt-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-0.5">Remark</label>
                        <div className="relative">
                          <MessageSquare className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={txn.remark || ''}
                            onChange={(e) => handleTransactionChange(index, 'remark', e.target.value)}
                            placeholder="Transaction notes..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium text-slate-700 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditVisitAndPaymentModal;
