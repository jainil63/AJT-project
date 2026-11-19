import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, FileText, X, Trash2 } from 'lucide-react';
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

const DocumentTypeMaster = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [documentTypeText, setDocumentTypeText] = useState('');
  const [editingDocumentType, setEditingDocumentType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState(EMPTY_DATE_FILTERS);
  const [documentTypes, setDocumentTypes] = useState([]);




  const fetchDocumentTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documentType/getDocumentType');
      setDocumentTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching document types:', error);
      showToast(error.response?.data?.message || 'Failed to fetch document types', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const handleAddDocumentType = async (e) => {
    e.preventDefault();
    if (!documentTypeText.trim()) return;

    try {
      setSaving(true);
      const response = await api.post('/documentType/addDocumentType', { text: documentTypeText });

      if (response.data) {
        showToast('Document Type added successfully', 'success');
        setDocumentTypes(prev => [...prev, response.data.data]);
        setDocumentTypeText('');
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding document type:', error);
      showToast(error.response?.data?.message || 'An error occurred while adding document type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDocumentType = (documentType) => {
    setEditingDocumentType(documentType);
    setDocumentTypeText(documentType.text);
    setIsEditModalOpen(true);
  };

  const handleUpdateDocumentType = async (e) => {
    e.preventDefault();
    if (!documentTypeText.trim() || !editingDocumentType) return;

    try {
      setSaving(true);
      const response = await api.put(`/documentType/updateDocumentType/${editingDocumentType.id}`, { text: documentTypeText });

      if (response.data) {
        showToast('Document Type updated successfully', 'success');
        setDocumentTypes(prev => prev.map(documentType =>
          documentType.id === editingDocumentType.id ? { ...documentType, text: documentTypeText } : documentType
        ));
        setDocumentTypeText('');
        setEditingDocumentType(null);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating document type:', error);
      showToast(error.response?.data?.message || 'An error occurred while updating document type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocumentType = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Document Type',
      message: 'Are you sure you want to delete this document type?',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      setSaving(true);
      await api.delete(`/documentType/deleteDocumentType/${id}`);
      showToast('Document Type deleted successfully', 'success');
      setDocumentTypes(prev => prev.filter(documentType => documentType.id !== id));
    } catch (error) {
      console.error('Error deleting document type:', error);
      showToast(error.response?.data?.message || 'An error occurred while deleting document type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredDocumentTypes = useMemo(
    () => applyListFilters(documentTypes, {
      searchTerm: searchQuery,
      getSearchableText: (item) => item.text || item.name,
      filterData,
    }),
    [documentTypes, searchQuery, filterData]
  );

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filteredDocumentTypes, SORT_ACCESSORS);

  // Permissions check
  const permissions = usePermissions('Document Type');

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!permissions.view) {
    return <AccessDenied moduleName="Document Type" />;
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
            <FileText className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Document Type Master</h1>
            <p className="text-slate-500 text-sm mt-1">Manage patient document categories</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <ListPageFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search document types..."
            isFilterOpen={isFilterOpen}
            onFilterOpen={() => setIsFilterOpen(true)}
            onFilterClose={() => setIsFilterOpen(false)}
            filterData={filterData}
            setFilterData={setFilterData}
            filteredCount={filteredDocumentTypes.length}
            totalCount={documentTypes.length}
            recordLabel="document types"
            exportModule="documentType"
            exportRows={filteredDocumentTypes}
            exportLabel="Document Type"
            filterTitle="Filter Document Types"
            className="border-0 shadow-none p-0 bg-transparent"
          >
            {permissions.add && (
              <button
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0"
                onClick={() => {
                  setDocumentTypeText('');
                  setEditingDocumentType(null);
                  setIsAddModalOpen(true);
                }}
              >
                <Plus className="w-5 h-5" />
                Add Document Type
              </button>
            )}
          </ListPageFilters>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              Loading document types...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <SortableTh label="Document Type" sortKey="text" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="py-4 w-2/4" />
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
                            onClick={() => handleEditDocumentType(type)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-white border border-brand-200 hover:bg-brand-600 hover:border-brand-600 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.delete && (
                          <button
                            onClick={() => handleDeleteDocumentType(type.id)}
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
                {filteredDocumentTypes.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-6 py-20 text-center text-slate-500">
                      No document types found.
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
              <h2 className="text-xl font-bold text-slate-800">Add New Document Type</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleAddDocumentType}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Type <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={documentTypeText}
                    onChange={(e) => setDocumentTypeText(e.target.value)}
                    required
                    placeholder="Enter document type"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Adding...' : 'Add Document Type'}
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
              <h2 className="text-xl font-bold text-slate-800">Edit Document Type</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="p-6" onSubmit={handleUpdateDocumentType}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Type <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={documentTypeText}
                    onChange={(e) => setDocumentTypeText(e.target.value)}
                    required
                    placeholder="Enter document type"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={saving} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saving ? 'Updating...' : 'Update Document Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTypeMaster;
