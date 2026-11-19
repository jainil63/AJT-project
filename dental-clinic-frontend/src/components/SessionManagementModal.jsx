import React, { useState, useEffect } from 'react';
import { X, MonitorSmartphone, LogOut, Clock, Globe, Shield, Laptop, Tablet, Smartphone } from 'lucide-react';
import api from '../api/axios';
import useToast from '../hooks/useToast';

const SessionManagementModal = ({ isOpen, onClose, employee }) => {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    if (isOpen && employee?.id) {
      fetchSessions();
    }
  }, [isOpen, employee]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employee/sessions/${employee.id}`);
      setSessions(res.data.data || []);
    } catch (error) {
      showToast('Error fetching sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (sessionId) => {
    try {
      setRevoking(sessionId);
      await api.post(`/employee/revoke-session/${sessionId}`);
      showToast('Session revoked successfully', 'success');
      setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, isActive: false } : s));
    } catch (error) {
      showToast('Error revoking session', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'Mobile': return <Smartphone className="w-5 h-5" />;
      case 'Tablet': return <Tablet className="w-5 h-5" />;
      default: return <Laptop className="w-5 h-5" />;
    }
  };

  const getDeviceLabel = (session) => {
    if (session.deviceType === 'Unknown') return 'Unknown Device';
    if (session.osName && session.browserName) {
      return `${session.browserName} on ${session.osName}`;
    }
    return session.deviceType || 'Desktop Device';
  };

  if (!isOpen) return null;

  const activeCount = sessions.filter((s) => s.isActive).length;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in-up flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5 text-brand-600" />
              Login Sessions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {employee?.fullName || 'Employee'} &mdash; active devices &amp; browsers
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Sessions</div>
              <div className="text-xl font-black text-emerald-800 mt-1">{activeCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Logged</div>
              <div className="text-xl font-black text-slate-800 mt-1">{sessions.length}</div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              No login sessions recorded for this employee.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-xl border transition-all ${
                    session.isActive
                      ? 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'
                      : 'bg-slate-50/50 border-slate-100 opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        session.isActive ? 'bg-brand-50 text-brand-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {getDeviceIcon(session.deviceType)}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-800 text-sm truncate">
                            {getDeviceLabel(session)}
                          </h4>
                          {session.isActive ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-bold rounded-full">
                              Revoked
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Globe className="w-3 h-3" />
                            {session.ipAddress}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(session.lastActiveAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {session.isActive && (
                      <button
                        onClick={() => handleLogout(session.sessionId)}
                        disabled={revoking === session.sessionId}
                        className="px-3 py-2 bg-rose-50 text-rose-600 font-semibold text-xs rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        title="Force Logout"
                      >
                        {revoking === session.sessionId ? (
                          <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogOut className="w-3.5 h-3.5" />
                            Logout
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-slate-600 font-medium hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManagementModal;
