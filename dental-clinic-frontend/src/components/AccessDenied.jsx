import React from 'react';
import { ShieldAlert, Lock, UserX } from 'lucide-react';

const AccessDenied = ({ moduleName }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm animate-fade-in">
      <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 relative">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100">
          <Lock className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h2>
      <p className="text-slate-500 text-center max-w-md font-medium mb-8">
        You do not have permission to access the <span className="text-brand-600 font-bold">{moduleName}</span> module. 
        Please contact your Super Admin to request access.
      </p>
      
      <div className="flex gap-4">
        <div className="px-6 py-3 bg-slate-100 rounded-2xl text-slate-600 font-bold text-sm flex items-center gap-2">
          <UserX className="w-4 h-4" />
          Unauthorized Access
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
