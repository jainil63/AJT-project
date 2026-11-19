import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, CreditCard, X, Trash2 } from 'lucide-react';
import ListPageFilters from '../components/common/ListPageFilters';
import { applyListFilters, EMPTY_DATE_FILTERS } from '../utils/listPageFilters';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';

const SORT_ACCESSORS = {
  text: (r) => r.text,
};

const PaymentByMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [typeText, setTypeText] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_DATE_FILTERS);
  const [types, setTypes] = useState([]);






  const fetchTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/paymentBy/getPaymentBy');
      setTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching payment by masters:', error);
      showToast(error.response?.data?.message || 'Failed to fetch payment by masters', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);





  const handleAddType = async (e) => {
    e.preventDefault();
    if (!typeText.trim()) return;

    try {
      setSaving(true);
      const response = await api.post('/paymentBy/addPaymentBy', { text: typeText });

      if (response.data) {
        showToast('Payment mode added successfully', 'success');
        setTypes(prev => [...prev, response.data.data]);
        setTypeText('');
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding payment mode:', error);
      showToast(error.response?.data?.message || 'An error occurred while adding payment mode', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditType = (type) => {
    setEditingType(type);
    setTypeText(type.text);
    setIsEditModalOpen(true);
  };

  const handleUpdateType = async (e) => {
    e.preventDefault();
    if (!typeText.trim() || !editingType) return;

    try {
      setSaving(true);
      const response = await api.put(`/paymentBy/updatePaymentBy/${editingType.id}`, { text: typeText });

      if (response.data) {
        showToast('Payment mode updated successfully', 'success');
        setTypes(prev => prev.map(type =>
          type.id === editingType.id ? { ...type, text: typeText } : type
        ));
        setTypeText('');
        setEditingType(null);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating payment by:', error);
      showToast(error.response?.data?.message || 'An error occurred while updating payment mode', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Payment Mode',
      message: 'Are you sure you want to delete this payment mode entry?',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.delete(`/paymentBy/deletePaymentBy/${id}`);
      showToast('Payment mode deleted successfully', 'success');
      setTypes(prev => prev.filter(type => type.id !== id));
    } catch (error) {
      console.error('Error deleting payment mode:', error);
      showToast(error.response?.data?.message || 'An error occurred while deleting payment mode', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredTypes = useMemo(
    () => applyListFilters(types, {
      searchTerm: searchQuery,
      getSearchableText: (item) => item.text,
      filterData,
    }),
    [types, searchQuery, filterData]
  );

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredTypes, SORT_ACCESSORS);

  // Permissions check
  const permissions = usePermissions('Payment Mode');

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="Payment Mode" />;
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
            <CreditCard className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Payment Mode</h1>
            <p className="text-slate-500 text-sm mt-1">Manage payment mode masters (e.g. Cash, GPay, Bank)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <ListPageFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search payment mode..."
            isFilterOpen={isFilterOpen}
            onFilterOpen={() => setIsFilterOpen(true)}
            onFilterClose={() => setIsFilterOpen(false)}
            filterData={filterData}
            setFilterData={setFilterData}
            filteredCount={filteredTypes.length}
            totalCount={types.length}
            recordLabel="payment modes"
            exportModule="paymentBy"
            exportRows={filteredTypes}
            exportLabel="Payment Mode"
            filterTitle="Filter Payment Modes"
            className="border-0 shadow-none p-0 bg-transparent"
          >
            {permissions.add && (
              <button
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0"
                onClick={() => {
                  setTypeText('');
                  setEditingType(null);
                  setIsAddModalOpen(true);
                }}
              >
                <Plus className="w-5 h-5" />
                Add Payment Mode
              </button>
            )}
          </ListPageFilters>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <SortableTh label="Payment Mode" sortKey="text" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4 w-2/4" />
                  <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((type) => (
                  <tr key={type.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-base">{type.text}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {permissions.update && (
                          <button
                            onClick={() => handleEditType(type)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-white border border-brand-200 hover:bg-brand-600 hover:border-brand-600 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.delete && (
                          <button
                            onClick={() => handleDeleteType(type.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 hover:border-rose-600 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTypes.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-6 py-20 text-center text-slate-500">
                      No entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Add New Payment Mode</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleAddType}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={typeText}
                    onChange={(e) => setTypeText(e.target.value)}
                    required
                    placeholder="e.g. Cash, GPay, Bank Transfer"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Adding...' : 'Add Payment Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Edit Payment Mode</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleUpdateType}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={typeText}
                    onChange={(e) => setTypeText(e.target.value)}
                    required
                    placeholder="e.g. Cash, GPay, Bank Transfer"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Updating...' : 'Update Payment Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default PaymentByMaster;
