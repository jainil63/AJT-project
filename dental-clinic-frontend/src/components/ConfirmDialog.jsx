import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
  if (!isOpen) return null;

  const themes = {
    danger: {
      icon: <AlertCircle className="w-8 h-8 text-rose-500" />,
      btnColor: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100'
    },
    warning: {
      icon: <AlertCircle className="w-8 h-8 text-amber-500" />,
      btnColor: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100'
    }
  };

  const theme = themes[type] || themes.danger;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe pl-safe pr-safe">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-zoom-in">
        <div className="p-8">
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className={`p-4 rounded-2xl ${theme.bgColor} ${theme.borderColor} border-2 mb-6`}>
              {theme.icon}
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {title}
            </h3>
            
            <p className="text-slate-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-6 py-3 rounded-xl text-white font-bold shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${theme.btnColor}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
