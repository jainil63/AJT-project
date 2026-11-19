import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, MapPin, Download, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import useToast from '../../hooks/useToast';

const ExcelImportModal = ({
  isOpen,
  onClose,
  onImport,
  title = "Import Excel Data",
  sampleFileUrl,
  // sampleColumns: optional array of header strings. When set, the modal
  // generates and downloads a tiny .xlsx with just these headers on click —
  // no need to maintain static sample files in /public.
  sampleColumns,
  // sampleFileName: name suggested to the browser on download.
  sampleFileName = 'sample.xlsx',
  showStatusSelector = false,
  statuses = []
}) => {
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [user, setUser] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
    } else {
      // Reset state when modal closes
      setSelectedFile(null);
      setIsUploading(false);
      setSelectedStatusId('');
    }
  }, [isOpen]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      setSelectedFile(file);
    } else {
      showToast('Please upload a valid Excel or CSV file', 'error');
    }
  };

  // Build a one-row .xlsx in memory containing just the supplied header
  // columns. Avoids having to ship static sample files for every entity.
  const handleDownloadInlineSample = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([sampleColumns]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sample');
      XLSX.writeFile(wb, sampleFileName);
    } catch (error) {
      console.error('Sample generation error:', error);
      showToast('Could not generate sample file', 'error');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('Please select a file first', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) {
        showToast('The uploaded file is empty', 'error');
        return;
      }

      // Serialize JS Date objects (produced by cellDates:true) to ISO strings
      // so all date values arrive at handlers as consistent strings.
      const processedData = rawData.map(row => {
        const out = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = v instanceof Date ? v.toISOString() : v;
        }
        return out;
      });

      await onImport(processedData, selectedStatusId);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      showToast('Error processing file. Please check format.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-slate-500 text-sm mt-1">Upload your data using an Excel or CSV file</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">

          {/* Status Selector (Conditional) */}
          {showStatusSelector && Array.isArray(statuses) && statuses.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-brand-600" />
                Target Status (Optional)
              </label>
              <select
                value={selectedStatusId}
                onChange={(e) => setSelectedStatusId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
              >
                <option value="">Select a status to set for all leads (Keep existing status for duplicate leads)</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.text}</option>
                ))}
              </select>
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer group
              border-2 border-dashed rounded-3xl p-10
              flex flex-col items-center justify-center gap-4
              transition-all duration-300
              ${isDragging 
                ? 'border-brand-500 bg-brand-50/50 scale-[1.01]' 
                : selectedFile 
                  ? 'border-emerald-500 bg-emerald-50/30' 
                  : 'border-slate-200 bg-slate-50/50 hover:border-brand-400 hover:bg-slate-50'
              }
            `}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div className={`
              w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300
              ${selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}
            `}>
              {selectedFile ? <CheckCircle2 className="w-10 h-10" /> : <UploadCloud className="w-10 h-10" />}
            </div>

            <div className="text-center">
              {selectedFile ? (
                <>
                  <div className="text-lg font-bold text-slate-800 truncate max-w-[300px]">
                    {selectedFile.name}
                  </div>
                  <div className="text-sm text-emerald-600 font-medium mt-1">Ready to import</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-slate-700">
                    Click or Drag file to upload
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    Supports XLSX, XLS, and CSV
                  </div>
                </>
              )}
            </div>

            {selectedFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {Array.isArray(sampleColumns) && sampleColumns.length > 0 ? (
              <button
                type="button"
                onClick={handleDownloadInlineSample}
                className="flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors bg-brand-50 px-4 py-2.5 rounded-xl border border-brand-100"
              >
                <Download className="w-4 h-4" />
                Download Sample Excel
              </button>
            ) : sampleFileUrl && (
              <a
                href={sampleFileUrl}
                download
                className="flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors bg-brand-50 px-4 py-2.5 rounded-xl border border-brand-100"
              >
                <Download className="w-4 h-4" />
                Download Sample Excel
              </a>
            )}
            <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
              <button
                onClick={onClose}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || isUploading}
                className="px-8 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" />
                    Start Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Warning Note */}
        <div className="px-8 py-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Please ensure your Excel file matches the sample format. Empty rows or missing required columns may cause the import to fail.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
