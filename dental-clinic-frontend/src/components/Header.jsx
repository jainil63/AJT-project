import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, LogOut, Activity, Plus, Users, User, Stethoscope, Loader2, X, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import usePermissions from '../hooks/usePermissions';
import { fileUrl } from '../utils/fileUrl';

const Header = ({ setSidebarOpen, isCollapsed, setIsCollapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnDashboard = location.pathname === '/super' || location.pathname === '/super/';

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.isSuperAdmin === true;
    const patientPerms = usePermissions('Patient Registration');
    const opdPerms = usePermissions('Visit');
    const appointmentPerms = usePermissions('Appointment Booking');
    const canSearchPatients = isSuperAdmin || patientPerms.view;


    // ---- Global patient search ----
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // Debounced search — reuses /patient/getPatient which already enforces the
    // Patient Registration permission + branch scope server-side.
    useEffect(() => {
        const term = query.trim();
        const isNumeric = /^\d+$/.test(term);
        const minLength = isNumeric ? 6 : 2;
        if (!canSearchPatients || term.length < minLength) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const handle = setTimeout(async () => {
            try {
                const res = await api.get('/patient/getPatient', { params: { search: term, limit: 8 } });
                const raw = res.data.data || [];
                // Prioritize patients from the logged-in user's branch
                const userBranchId = user.branchId;
                if (userBranchId) {
                    raw.sort((a, b) => {
                        const aMatch = a.branchId === userBranchId || a.registrationBranchId === userBranchId;
                        const bMatch = b.branchId === userBranchId || b.registrationBranchId === userBranchId;
                        return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
                    });
                }
                setResults(raw);
            } catch (error) {
                console.error('Patient search failed:', error);
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
        return () => clearTimeout(handle);
    }, [query, canSearchPatients]);

    // Close the dropdown on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleSelectPatient = (patient) => {
        setShowDropdown(false);
        setQuery('');
        setResults([]);
        navigate(`/super/patient/${patient.id}`);
    };

    const quickAddActions = [
        { id: 'patient', label: 'Patient', icon: Users,       path: '/super/patient-master?action=new',         accent: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100',           hasAccess: isSuperAdmin || patientPerms.add },
        { id: 'opd',     label: 'Visit',   icon: Stethoscope, path: '/super/opd-master?action=new',             accent: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100',   hasAccess: isSuperAdmin || opdPerms.add },
        { id: 'appointment', label: 'Appointment', icon: Activity, path: '/super/appointment-booking?action=new', accent: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100', hasAccess: isSuperAdmin || appointmentPerms.add },
    ].filter(a => a.hasAccess);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // `replace` so back press from the login screen doesn't return to a
            // protected route (which would itself bounce back here — a navigation loop).
            navigate('/', { replace: true });
        }
    };

    const trimmedQuery = query.trim();
    const isSearchNumeric = /^\d+$/.test(trimmedQuery);
    const minSearchLength = isSearchNumeric ? 6 : 2;

    return (
        <>
        <header className="relative shrink-0 bg-white border-b border-slate-200 shadow-sm z-30 w-full max-w-full pt-safe">
            <div className="flex flex-col gap-1 px-2 py-1 xsm:gap-1.5 xsm:py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-0 sm:min-h-12 md:min-h-16 md:gap-4 md:px-4 lg:px-6">
            <div className="flex items-center min-w-0 flex-1 gap-2 sm:gap-0">
                <button className="lg:hidden text-slate-500 hover:text-slate-700 shrink-0" onClick={() => setSidebarOpen(true)}>
                    <Menu className="w-5 h-5" />
                </button>
                <button className="hidden lg:block mr-4 text-slate-500 hover:text-slate-700 shrink-0" onClick={() => setIsCollapsed(!isCollapsed)}>
                    <Menu className="w-5 h-5" />
                </button>
 
                {/* Global patient search */}
                <div ref={searchRef} className="flex items-center relative flex-1 min-w-0 w-full sm:w-auto md:flex-none md:shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search patient by name or mobile..."
                        className="pl-9 pr-9 py-1.5 sm:py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-full md:w-64 xl:w-80 transition-all"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults([]); }}
                            className="absolute right-3 text-slate-400 hover:text-slate-600"
                            title="Clear"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {showDropdown && trimmedQuery.length >= minSearchLength && (
                        <div className="absolute top-full left-0 mt-2 w-full md:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                            {!canSearchPatients ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-400">
                                    You don't have permission to search patients.
                                </div>
                            ) : searching ? (
                                <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                                </div>
                            ) : results.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-400">
                                    No patients found for “{trimmedQuery}”.
                                </div>
                            ) : (
                                <div className="max-h-96 overflow-y-auto custom-scrollbar py-1">
                                    {results.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelectPatient(p)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-50/60 transition-colors text-left"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                                {p.patientPhoto ? (
                                                    <img src={fileUrl(p.patientPhoto)} alt={p.patientName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-slate-400 font-bold text-sm uppercase">{p.patientName?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-slate-800 truncate">{p.patientName}</div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                                    <span>{p.mobileNo}</span>
                                                    {p.uhid && <span className="text-brand-600 font-bold">· {p.uhid}</span>}
                                                </div>
                                            </div>
                                            {(p.RegistrationBranch?.name || p.Branch?.name) && (
                                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                                    {p.RegistrationBranch?.name || p.Branch?.name}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {quickAddActions.length > 0 && (
                    <div className="hidden lg:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200 overflow-x-auto custom-scrollbar">
                        {quickAddActions.map(action => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    onClick={() => navigate(action.path)}
                                    title={`Add new ${action.label}`}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${action.accent}`}
                                >
                                    <Plus className="w-3 h-3" strokeWidth={3} />
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="hidden xl:inline">{action.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Mobile-only: Dashboard shortcut below the search bar */}
            {!isOnDashboard && (
                <button
                    onClick={() => navigate('/super')}
                    className="sm:hidden flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-sm font-semibold bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 transition-colors"
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                </button>
            )}

            <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-3 shrink-0 w-full sm:w-auto pr-safe">
                <div className="flex items-center gap-2 sm:ml-2 sm:border-l sm:border-slate-200 sm:pl-4">
                    <Link to="/super/profile" className="group" title="Profile">
                        <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center group-hover:bg-brand-100 group-hover:border-brand-300 transition-all">
                            <User className="w-4 h-4" />
                        </div>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
            </div>
        </header>
        </>
    );
};

export default Header;
