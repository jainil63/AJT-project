import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, Eye, Plus, Camera } from 'lucide-react';
import api from '../api/axios';
import useToast from '../hooks/useToast';
import { useConfirm } from '../context/ConfirmContext';
import { fileUrl, isImageFile } from '../utils/fileUrl';

// Generates a short id for staged documents living only in component state.
const makeTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DocumentUploadSection = ({
  isOpen = false,
  onClose = () => { },
  // Controlled list of staged docs: [{ tempId, documentTypeId, file, note }]
  stagedDocuments = [],
  onChange = () => { },
  entityId,
  entityType,
  existingDocuments = [],
  isStaged = true,
  title = 'Manage Documents'
}) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [internalExistingDocs, setInternalExistingDocs] = useState([]);

  // Picker popup state — supports multi-file pick for the same document type.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTypeId, setPickerTypeId] = useState('');
  const [pickerFiles, setPickerFiles] = useState([]);
  const [pickerNote, setPickerNote] = useState('');

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/documentType/getDocumentType');
        setDocumentTypes(response.data.data || []);
      } catch (error) {
        console.error('Error fetching document types:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!isStaged && entityId) {
      const fetchDocs = async () => {
        try {
          const res = await api.get(`/document/list/${entityType}/${entityId}`);
          setInternalExistingDocs(res.data.data || []);
        } catch (err) {
          console.error('Error loading documents:', err);
        }
      };
      fetchDocs();
    }
  }, [isStaged, entityId, entityType]);

  // ESC handling lives globally in <GlobalEscapeCloser /> (mounted in App.jsx).
  // It picks the topmost visible modal and clicks its close button, so nothing
  // local is needed here.

  const currentExistingDocs = isStaged ? existingDocuments : internalExistingDocs;
  const typeById = documentTypes.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

  const resetPicker = () => {
    setPickerOpen(false);
    setPickerTypeId('');
    setPickerFiles([]);
    setPickerNote('');
  };

  const openPicker = (typeId = '') => {
    setPickerTypeId(typeId);
    setPickerFiles([]);
    setPickerNote('');
    setPickerOpen(true);
  };

  const removePickerFile = (idx) => {
    setPickerFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmUpload = async () => {
    if (!pickerTypeId) {
      showToast('Please select a document type', 'error');
      return;
    }
    if (pickerFiles.length === 0) {
      showToast('Please select at least one file', 'error');
      return;
    }

    const trimmedNote = pickerNote.trim();

    if (isStaged) {
      const newRows = pickerFiles.map(file => ({
        tempId: makeTempId(),
        documentTypeId: pickerTypeId,
        file,
        note: trimmedNote
      }));
      onChange([...stagedDocuments, ...newRows]);
      resetPicker();
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('entityId', entityId);
      formData.append('entityType', entityType);
      pickerFiles.forEach(file => formData.append('files', file));
      formData.append('documentTypeIds', JSON.stringify(pickerFiles.map(() => pickerTypeId)));
      formData.append('notes', JSON.stringify(pickerFiles.map(() => trimmedNote)));

      await api.post('/document/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(`${pickerFiles.length} document${pickerFiles.length > 1 ? 's' : ''} uploaded successfully`, 'success');
      const res = await api.get(`/document/list/${entityType}/${entityId}`);
      setInternalExistingDocs(res.data.data || []);
      resetPicker();
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast('Error uploading document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveStaged = (tempId) => {
    onChange(stagedDocuments.filter(d => d.tempId !== tempId));
  };

  const handleUpdateStagedNote = (tempId, note) => {
    onChange(stagedDocuments.map(d => (d.tempId === tempId ? { ...d, note } : d)));
  };

  const handleDeleteExisting = async (docId) => {
    const isConfirmed = await confirm({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? This action cannot be undone.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/document/delete/${docId}`);
      showToast('Document deleted successfully', 'success');
      setInternalExistingDocs(prev => prev.filter(d => d.id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast('Error deleting document', 'error');
    }
  };

  const getStagedPreview = (file) => {
    if (file && file.type?.startsWith('image/')) return URL.createObjectURL(file);
    return null;
  };

  const getExistingPreview = (filePath) => {
    if (!filePath || !isImageFile(filePath)) return null;
    return fileUrl(filePath);
  };

  const totalCount = stagedDocuments.length + currentExistingDocs.length;

  const MainContent = (
    <div className={`space-y-4 ${isOpen ? '' : 'pt-4 border-t border-slate-100'}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-bold text-slate-700">Documents</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            Upload multiple files per type. Add a short label/note to identify each one.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openPicker('')}
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {totalCount === 0 ? (
        <div className="text-center text-xs text-slate-400 italic py-6 border border-dashed border-slate-200 rounded-2xl">
          No documents yet. Click <span className="font-semibold text-slate-500">Add Document</span> to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {currentExistingDocs.map(doc => {
            const type = typeById[doc.documentTypeId] || doc.DocumentType;
            const previewUrl = getExistingPreview(doc.filePath);
            return (
              <div key={doc.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-brand-200 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                  {previewUrl ? (
                    <img src={previewUrl} alt={doc.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {type?.text || 'Untyped'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Uploaded
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 truncate">{doc.fileName}</p>
                  {doc.note && (
                    <p className="text-xs text-slate-500 italic">{doc.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={fileUrl(doc.filePath)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-brand-50 rounded-lg text-brand-600 transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteExisting(doc.id)}
                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {stagedDocuments.map(doc => {
            const type = typeById[doc.documentTypeId];
            const previewUrl = getStagedPreview(doc.file);
            return (
              <div key={doc.tempId} className="flex items-start gap-3 p-3 bg-amber-50/30 border border-amber-200 rounded-xl shadow-sm hover:border-amber-300 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-amber-100">
                  {previewUrl ? (
                    <img src={previewUrl} alt={doc.file?.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {type?.text || 'Untyped'}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Pending Save</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 truncate">{doc.file?.name}</p>
                  <input
                    type="text"
                    value={doc.note || ''}
                    onChange={(e) => handleUpdateStagedNote(doc.tempId, e.target.value)}
                    placeholder="Add a short note / label (optional)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStaged(doc.tempId)}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const PickerModal = pickerOpen ? (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 pt-safe pb-safe pl-safe pr-safe bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92dvh] sm:max-h-none overflow-hidden flex flex-col animate-in zoom-in duration-300 transform-gpu border border-slate-200 min-w-0">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
              <Upload className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">Add Document</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Pick a type, add one or many files, optional note
              </p>
            </div>
          </div>
          <button
            onClick={resetPicker}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200/50 rounded-full transition-colors active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Document Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={pickerTypeId}
              onChange={(e) => setPickerTypeId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="">{loading ? 'Loading types...' : '-- Select Type --'}</option>
              {documentTypes.map(type => (
                <option key={type.id} value={type.id}>{type.text}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Files <span className="text-rose-500">*</span>
              <span className="ml-2 text-slate-400 font-medium normal-case tracking-normal">(select one or many — all go under the chosen type)</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/30 hover:bg-white hover:border-brand-400 transition-all cursor-pointer relative group/dropzone">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  if (picked.length === 0) return;
                  setPickerFiles(prev => [...prev, ...picked]);
                  e.target.value = '';
                }}
              />
              {pickerFiles.length > 0 ? (
                <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                    {pickerFiles.length} file{pickerFiles.length > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Tap again to add more</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center group-hover/dropzone:scale-110 transition-all duration-300 border border-brand-100/50">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Tap to select or Drag & Drop</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.15em] mt-1 opacity-70">Multiple files allowed • Max 5MB each</p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera capture — opens the camera on mobile, falls back to a file dialog on desktop */}
            <label className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all shadow-sm cursor-pointer active:scale-[0.98]">
              <Camera className="w-4 h-4" />
              Take Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  if (picked.length === 0) return;
                  setPickerFiles(prev => [...prev, ...picked]);
                  e.target.value = '';
                }}
              />
            </label>

            {pickerFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {pickerFiles.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="flex-1 text-xs font-medium text-slate-700 truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <button
                      type="button"
                      onClick={() => removePickerFile(idx)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Note / Label <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={pickerNote}
              onChange={(e) => setPickerNote(e.target.value)}
              placeholder="e.g. Front side, March 2025 report"
              maxLength={200}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">{pickerNote.length}/200</p>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={resetPicker}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={!pickerTypeId || pickerFiles.length === 0 || uploading}
            onClick={handleConfirmUpload}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] transform-gpu"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span className="tracking-wide text-sm">
              {uploading
                ? 'Uploading...'
                : (isStaged
                    ? `Add ${pickerFiles.length > 0 ? pickerFiles.length + ' ' : ''}to List`
                    : `Upload ${pickerFiles.length > 0 ? pickerFiles.length + ' file' + (pickerFiles.length > 1 ? 's' : '') : ''}`)}
            </span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (isOpen) {
    return (
      <>
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 pt-safe pb-safe pl-safe pr-safe">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up border border-slate-200 min-w-0">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100">
                  <FileText className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider italic">
                    {isStaged ? 'Changes will be saved on form submission' : 'Changes are saved immediately'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {MainContent}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
        {PickerModal}
      </>
    );
  }

  return (
    <>
      {MainContent}
      {PickerModal}
    </>
  );
};

export default DocumentUploadSection;
