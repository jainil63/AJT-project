import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Wallet, X, Trash2 } from 'lucide-react';
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

const ConsultantChargeMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_DATE_FILTERS);
  const [items, setItems] = useState([]);

  const permissions = usePermissions('Consultant Charge');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/consultantCharge/getConsultantCharge');
      setItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching consultant charges:', error);
      showToast(error.response?.data?.message || 'Failed to fetch consultant charges', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions.view || permissions.isSuperAdmin) fetchItems();
  }, [permissions.view, permissions.isSuperAdmin]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      setSaving(true);
      const res = await api.post('/consultantCharge/addConsultantCharge', { text });
      if (res.data) {
        showToast('Consultant charge added successfully', 'success');
        setItems(prev => [res.data.data, ...prev]);
        setText('');
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding consultant charge:', error);
      showToast(error.response?.data?.message || 'An error occurred while adding consultant charge', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditOpen = (item) => {
    setEditing(item);
    setText(item.text);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!text.trim() || !editing) return;
    try {
      setSaving(true);
      const res = await api.put(`/consultantCharge/updateConsultantCharge/${editing.id}`, { text });
      if (res.data) {
        showToast('Consultant charge updated successfully', 'success');
        setItems(prev => prev.map(it => (it.id === editing.id ? { ...it, text } : it)));
        setText('');
        setEditing(null);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating consultant charge:', error);
      showToast(error.response?.data?.message || 'An error occurred while updating consultant charge', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Consultant Charge',
      message: 'Are you sure you want to delete this consultant charge?',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/consultantCharge/deleteConsultantCharge/${id}`);
      showToast('Consultant charge deleted successfully', 'success');
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (error) {
      console.error('Error deleting consultant charge:', error);
      showToast(error.response?.data?.message || 'An error occurred while deleting consultant charge', 'error');
    }
  };

  const filtered = useMemo(
    () => applyListFilters(items, {
      searchTerm: searchQuery,
      getSearchableText: (item) => item.text,
      filterData,
    }),
    [items, searchQuery, filterData]
  );

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filtered, SORT_ACCESSORS);

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view && !permissions.isSuperAdmin) {
    return <AccessDenied moduleName="Consultant Charge" />;
  }

  const canAdd = permissions.add || permissions.isSuperAdmin;
  const canUpdate = permissions.update || permissions.isSuperAdmin;
  const canDelete = permissions.delete || permissions.isSuperAdmin;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
            <Wallet className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Consultant Charge</h1>
            <p className="text-slate-500 text-sm mt-1">Manage consultant charge labels used in Ortho & Implant forms</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <ListPageFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search charges..."
            isFilterOpen={isFilterOpen}
            onFilterOpen={() => setIsFilterOpen(true)}
            onFilterClose={() => setIsFilterOpen(false)}
            filterData={filterData}
            setFilterData={setFilterData}
            filteredCount={filtered.length}
            totalCount={items.length}
            recordLabel="charges"
            exportModule="consultantCharge"
            exportRows={filtered}
            filterTitle="Filter Consultant Charges"
            className="border-0 shadow-none p-0 bg-transparent"
          >
            {canAdd && (
              <button
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0"
                onClick={() => { setText(''); setEditing(null); setIsAddModalOpen(true); }}
              >
                <Plus className="w-5 h-5" />
                Add Charge
              </button>
            )}
          </ListPageFilters>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              Loading charges...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <SortableTh label="Charge" sortKey="text" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4 w-2/4" />
                  <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-base">{item.text}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => handleEditOpen(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-white border border-brand-200 hover:bg-brand-600 hover:border-brand-600 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(item.id)}
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-6 py-20 text-center text-slate-500">No consultant charges found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">{isEditModalOpen ? 'Edit Consultant Charge' : 'Add New Consultant Charge'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={isEditModalOpen ? handleUpdate : handleAdd}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Charge <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                    maxLength={255}
                    placeholder="Any text — digits, special characters, alphabets…"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? (isEditModalOpen ? 'Updating...' : 'Adding...') : (isEditModalOpen ? 'Update Charge' : 'Add Charge')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultantChargeMaster;
