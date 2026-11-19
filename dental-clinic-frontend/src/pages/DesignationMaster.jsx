import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Briefcase, X, Trash2 } from 'lucide-react';
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
  name: (r) => r.name,
};

const DesignationMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_DATE_FILTERS);

  // State for designations
  const [roles, setRoles] = useState([]);




  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/designation/getDesignation');
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
      showToast(error.response?.data?.message || 'Failed to fetch designations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleAddDesignation = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    try {
      setSaving(true);
      const response = await api.post('/designation/addDesignation', { name: roleName });

      if (response.data) {
        showToast('Designation added successfully', 'success');
        setRoles(prev => [...prev, response.data.data]);
        setRoleName('');
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding designation:', error);
      showToast(error.response?.data?.message || 'An error occurred while adding designation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditName = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateDesignation = async (e) => {
    e.preventDefault();
    if (!roleName.trim() || !editingRole) return;

    try {
      setSaving(true);
      const response = await api.put(`/designation/updateDesignation/${editingRole.id}`, { name: roleName });

      if (response.data) {
        showToast('Designation updated successfully', 'success');
        setRoles(prev => prev.map(role =>
          role.id === editingRole.id ? { ...role, name: roleName } : role
        ));
        setRoleName('');
        setEditingRole(null);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating designation:', error);
      showToast(error.response?.data?.message || 'An error occurred while updating designation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDesignation = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Designation',
      message: 'Are you sure you want to delete this designation? This will affect employees associated with it.',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.delete(`/designation/deleteDesignation/${id}`);
      showToast('Designation deleted successfully', 'success');
      setRoles(prev => prev.filter(role => role.id !== id));
    } catch (error) {
      console.error('Error deleting designation:', error);
      showToast(error.response?.data?.message || 'An error occurred while deleting designation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = useMemo(
    () => applyListFilters(roles, {
      searchTerm: searchQuery,
      getSearchableText: (item) => item.name,
      filterData,
    }),
    [roles, searchQuery, filterData]
  );

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredRoles, SORT_ACCESSORS);

  // Permissions check
  const permissions = usePermissions('Designation Master');

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="Designation Master" />;
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-fuchsia-50 rounded-xl flex items-center justify-center border border-fuchsia-100">
            <Briefcase className="w-6 h-6 text-fuchsia-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Designation Master</h1>
            <p className="text-slate-500 text-sm mt-1">Manage employee designations</p>
          </div>
        </div>
      </div>

      {/* List/Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <ListPageFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search designations..."
            isFilterOpen={isFilterOpen}
            onFilterOpen={() => setIsFilterOpen(true)}
            onFilterClose={() => setIsFilterOpen(false)}
            filterData={filterData}
            setFilterData={setFilterData}
            filteredCount={filteredRoles.length}
            totalCount={roles.length}
            recordLabel="designations"
            exportModule="designation"
            exportRows={filteredRoles}
            exportLabel="Designation"
            filterTitle="Filter Designations"
            className="border-0 shadow-none p-0 bg-transparent"
          >
            {permissions.add && (
              <button
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0"
                onClick={() => {
                  setRoleName('');
                  setEditingRole(null);
                  setIsAddModalOpen(true);
                }}
              >
                <Plus className="w-5 h-5" />
                Add Designation
              </button>
            )}
          </ListPageFilters>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              Loading designations...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <SortableTh label="Designation Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4 w-2/4" />
                  <SortableTh label="Actions" sortable={false} align="right" className="py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-base">{role.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {permissions.update && (
                          <button
                            onClick={() => handleEditName(role)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-white border border-brand-200 hover:bg-brand-600 hover:border-brand-600 rounded-lg transition-all"
                            title="Edit Name"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.delete && (
                          <button
                            onClick={() => handleDeleteDesignation(role.id)}
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
                {filteredRoles.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-6 py-20 text-center text-slate-500">
                      No designations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Add New Designation</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleAddDesignation}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Designation Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    placeholder="Enter Designation"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Adding...' : 'Add Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Edit Designation</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleUpdateDesignation}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Designation Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    placeholder="Enter Designation"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Updating...' : 'Update Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignationMaster;
