import { Plus, Edit2, Stethoscope, Trash2, DollarSign, UploadCloud, X, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import usePermissions from '../hooks/usePermissions';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api/axios';
import AccessDenied from '../components/AccessDenied';
import ExcelImportModal from '../components/modals/ExcelImportModal';
import ListPageFilters from '../components/common/ListPageFilters';
import { applyListFilters, EMPTY_DATE_FILTERS } from '../utils/listPageFilters';
import useTableSort from '../hooks/useTableSort';
import SortableTh from '../components/common/SortableTh';

const SORT_ACCESSORS = {
  text: (r) => r.text,
  pricePerUnit: { getValue: (r) => r.pricePerUnit, type: 'number' },
  dayCount: { getValue: (r) => r.dayCount, type: 'number' },
};

const TreatmentMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [treatmentText, setTreatmentText] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [dayCount, setDayCount] = useState('1');
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_DATE_FILTERS);
  const [treatments, setTreatments] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Helper for permission-restricted actions
  const handlePermissionAction = (hasPermission, callback) => {
    if (!hasPermission) {
      showToast('Access Denied: You do not have permission to perform this action.', 'error');
      return;
    }
    callback();
  };




  const handleImport = async (rawData) => {
    try {
      // Helper to find case-insensitive key and trim value
      const getVal = (row, ...keys) => {
        const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim()));
        const val = foundKey ? row[foundKey] : "";
        return val ? String(val).trim() : "";
      };

      // Map excel data to backend keys
      const formattedTreatments = rawData
        .map(row => ({
          text: getVal(row, 'Treatment Name', 'Name', 'Treatment'),
          pricePerUnit: parseFloat(getVal(row, 'Price Per Unit', 'Price', 'Rate')) || 0
        }))
        .filter(t => t.text);

      if (formattedTreatments.length === 0) {
        showToast('The uploaded file contains no valid treatment names', 'error');
        return;
      }

      await api.post('/treatment/bulkAddTreatments', { 
        treatments: formattedTreatments
      });

      showToast(`${formattedTreatments.length} treatments imported successfully!`, 'success');
      fetchTreatments();
    } catch (error) {
      console.error('Import error:', error);
      showToast('Error importing treatments. Please check the Excel format.', 'error');
    }
  };

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/treatment/getTreatment');
      setTreatments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching treatments:', error);
      showToast(error.response?.data?.message || 'Failed to fetch treatments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const handleAddTreatment = async (e) => {
    e.preventDefault();
    if (!treatmentText.trim()) return;

    try {
      setSaving(true);
      const response = await api.post('/treatment/addTreatment', {
        text: treatmentText,
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        dayCount: parseInt(dayCount, 10) || 1
      });

      if (response.data) {
        showToast('Treatment added successfully', 'success');
        setTreatments(prev => [...prev, response.data.data]);
        setTreatmentText('');
        setPricePerUnit('');
        setDayCount('1');
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding treatment:', error);
      showToast(error.response?.data?.message || 'An error occurred while adding treatment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditTreatment = (treatment) => {
    setEditingTreatment(treatment);
    setTreatmentText(treatment.text);
    setPricePerUnit(treatment.pricePerUnit != null ? treatment.pricePerUnit.toString() : '');
    setDayCount(treatment.dayCount != null ? treatment.dayCount.toString() : '1');
    setIsEditModalOpen(true);
  };

  const handleUpdateTreatment = async (e) => {
    e.preventDefault();
    if (!treatmentText.trim() || !editingTreatment) return;

    try {
      setSaving(true);
      const response = await api.put(`/treatment/updateTreatment/${editingTreatment.id}`, {
        text: treatmentText,
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        dayCount: parseInt(dayCount, 10) || 1
      });

      if (response.data) {
        showToast('Treatment updated successfully', 'success');
        setTreatments(prev => prev.map(treatment =>
          treatment.id === editingTreatment.id ? {
            ...treatment,
            text: treatmentText,
            pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
            dayCount: parseInt(dayCount, 10) || 1
          } : treatment
        ));
        setTreatmentText('');
        setPricePerUnit('');
        setDayCount('1');
        setEditingTreatment(null);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating treatment:', error);
      showToast(error.response?.data?.message || 'An error occurred while updating treatment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTreatment = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Treatment',
      message: 'Are you sure you want to delete this treatment?',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.delete(`/treatment/deleteTreatment/${id}`);
      showToast('Treatment deleted successfully', 'success');
      setTreatments(prev => prev.filter(treatment => treatment.id !== id));
    } catch (error) {
      console.error('Error deleting treatment:', error);
      showToast(error.response?.data?.message || 'An error occurred while deleting treatment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredTreatments = useMemo(
    () => applyListFilters(treatments, {
      searchTerm: searchQuery,
      getSearchableText: (item) => item.text || '',
      filterData,
    }),
    [treatments, searchQuery, filterData]
  );

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredTreatments, SORT_ACCESSORS);

  // Permissions check
  const permissions = usePermissions('Treatment Master');

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="Treatment Master" />;
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
            <Stethoscope className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Treatment Master</h1>
            <p className="text-slate-500 text-sm mt-1">Manage dental treatment procedures and pricing</p>
          </div>
        </div>
        <button
          onClick={() => handlePermissionAction(permissions.import, () => setIsImportModalOpen(true))}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${permissions.import ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'}`}
        >
          <UploadCloud className="w-5 h-5" />
          Import
        </button>
      </div>


      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <ListPageFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search treatments..."
            isFilterOpen={isFilterOpen}
            onFilterOpen={() => setIsFilterOpen(true)}
            onFilterClose={() => setIsFilterOpen(false)}
            filterData={filterData}
            setFilterData={setFilterData}
            filteredCount={filteredTreatments.length}
            totalCount={treatments.length}
            recordLabel="treatments"
            exportModule="treatment"
            exportRows={filteredTreatments}
            filterTitle="Filter Treatments"
            onApply={() => setIsFilterOpen(false)}
          >
            <button
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm ${permissions.add ? 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'} shrink-0`}
              onClick={() => handlePermissionAction(permissions.add, () => {
                setTreatmentText('');
                setPricePerUnit('');
                setDayCount('1');
                setEditingTreatment(null);
                setIsAddModalOpen(true);
              })}
            >
              <Plus className="w-5 h-5" />
              Add Treatment
            </button>
          </ListPageFilters>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              Loading treatments...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <SortableTh label="Treatment Name" sortKey="text" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Price Per Unit" sortKey="pricePerUnit" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Duration (Days)" sortKey="dayCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4" />
                  <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((treatment) => (
                  <tr key={treatment.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-base">{treatment.text}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ₹ {treatment.pricePerUnit ? treatment.pricePerUnit.toLocaleString() : '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-sky-50 text-sky-700 border border-sky-100">
                        <Clock className="w-3.5 h-3.5" />
                        {treatment.dayCount ?? 1} {treatment.dayCount === 1 ? 'day' : 'days'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePermissionAction(permissions.update, () => handleEditTreatment(treatment))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all border ${permissions.update ? 'text-brand-600 border-brand-200 hover:text-white hover:bg-brand-600 hover:border-brand-600' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}
                          title={permissions.update ? "Edit" : "Access Denied"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermissionAction(permissions.delete, () => handleDeleteTreatment(treatment.id))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all border ${permissions.delete ? 'text-rose-600 border-rose-200 hover:text-white hover:bg-rose-600 hover:border-rose-600' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}
                          title={permissions.delete ? "Delete" : "Access Denied"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTreatments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center text-slate-500">
                      No treatments found.
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
              <h2 className="text-xl font-bold text-slate-800">Add New Treatment</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleAddTreatment}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Treatment Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={treatmentText}
                    onChange={(e) => setTreatmentText(e.target.value)}
                    required
                    placeholder="Enter treatment name"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price Per Unit (₹)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Duration (Days) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={dayCount}
                      onChange={(e) => setDayCount(e.target.value)}
                      required
                      placeholder="1"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Estimated days to complete this treatment</p>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Adding...' : 'Add Treatment'}
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
              <h2 className="text-xl font-bold text-slate-800">Edit Treatment</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleUpdateTreatment}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Treatment Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={treatmentText}
                    onChange={(e) => setTreatmentText(e.target.value)}
                    required
                    placeholder="Enter treatment name"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price Per Unit (₹)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Duration (Days) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={dayCount}
                      onChange={(e) => setDayCount(e.target.value)}
                      required
                      placeholder="1"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Estimated days to complete this treatment</p>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Updating...' : 'Update Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="Import Treatments"
        sampleFileUrl="/treatment_sample.xlsx"
        showBranchSelector={false}
      />
    </div>
  );
};

export default TreatmentMaster;
