import React, { useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronDown,
    LayoutDashboard,
    X
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';
import { modulesData } from '../data/modulesData';

const Sidebar = ({
    sidebarOpen,
    setSidebarOpen,
    isCollapsed,
    openMenus,
    toggleMenu,
    hoveredMenu,
    setHoveredMenu,
    hoverStyle,
    setHoverStyle,
    setIsCollapsed
}) => {
    const hoverTimeoutRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const visibleModules = useMemo(() => modulesData, []);

    const handleMouseEnter = (e, id) => {
        if (!isCollapsed) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

        const rect = e.currentTarget.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        let style = {};
        if (rect.top > windowHeight / 2) {
            style = {
                bottom: Math.max(20, windowHeight - rect.bottom - 10),
                maxHeight: `${Math.max(200, rect.bottom - 20)}px`
            };
        } else {
            style = {
                top: rect.top,
                maxHeight: `${Math.max(200, windowHeight - rect.top - 20)}px`
            };
        }

        setHoverStyle(style);
        setHoveredMenu(id);
    };

    const handleMouseLeave = () => {
        if (!isCollapsed) return;
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredMenu(null);
        }, 300);
    };

    const subModuleRoutes = {
        'Patient Registration': '/super/patient-master',
        'Appointment Booking': '/super/appointment-booking',
        'Doctor Calendar': '/super/doctor-calendar',
        'Visit': '/super/opd-master',
        'Visit Status': '/super/opd-status',
        'Treatments': '/super/treatment-master',
        'Transactions': '/super/transactions',
        'Payment Mode': '/super/payment-mode',
        'Consultant Charge': '/super/consultant-charge',
        'Employee Master': '/super/employee-master',
        'Designation Master': '/super/designation-master',
        'Clinic Report': '/super/reports/clinic',
        'Doctor Master': '/super/doctor-master',
        'Specialty': '/super/specialties-master',
        'Medical Alert': '/super/medical-alerts',
        'Document Type': '/super/document-type'
    };

    const handleSubModuleClick = (subModule) => {
        const route = subModuleRoutes[subModule];
        if (route) {
            navigate(route);
        }

        if (window.innerWidth < 1025) {
            setSidebarOpen(false);
        }
    };

    const handleDashboardClick = () => {
        navigate('/super');
        if (window.innerWidth < 1025) {
            setSidebarOpen(false);
        }
    };


    return (
        <>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out flex flex-col overflow-x-hidden shadow-sm ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isCollapsed ? 'w-20' : 'w-72'}`}
            >
                <div className={`h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0 w-full`}>
                    {isCollapsed ? (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden mx-auto">
                            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center space-x-2 overflow-hidden w-full">
                                <div className="rounded-lg flex items-center justify-center shrink-0 overflow-hidden w-8 h-8 mr-1">
                                    <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="font-bold text-lg text-slate-800 tracking-tight whitespace-nowrap">Swaminarayan <span className="text-brand-600 block text-xs -mt-1 font-semibold">Dental Clinic</span></span>
                            </div>
                            <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pt-4 pb-24 pb-safe space-y-1 relative custom-scrollbar">

                    <div className={`px-3 mb-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
                        <div
                            onClick={handleDashboardClick}
                            className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${location.pathname === '/super' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center w-12 px-0' : 'space-x-3'}`}
                        >
                            <LayoutDashboard className={`w-5 h-5 shrink-0 ${location.pathname === '/super' ? 'text-brand-600' : 'text-slate-400'}`} />
                            {!isCollapsed && <span className="font-medium whitespace-nowrap">Dashboard</span>}
                        </div>
                    </div>

                    <div className="px-4 mb-2">
                        {!isCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Modules</p>}
                    </div>

                    <div className="px-3 space-y-1">
                        {visibleModules.map((mod) => {
                            const Icon = mod.icon;
                            const isOpen = openMenus[mod.id];

                            // Check if current route matches any submodule of this module to keep it highlighted/open potentially
                            // For simplicity, just use standard toggle logic

                            return (
                                <div key={mod.id}>
                                    <div
                                        onClick={() => toggleMenu(mod.id)}
                                        onMouseEnter={(e) => handleMouseEnter(e, mod.id)}
                                        onMouseLeave={handleMouseLeave}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${isOpen && !isCollapsed ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${isCollapsed ? 'justify-center w-12 px-0 mx-auto' : ''}`}
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <Icon className={`w-5 h-5 shrink-0 ${isOpen && !isCollapsed ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500 transition-colors'}`} />
                                            {!isCollapsed && <span className="font-medium whitespace-nowrap">{mod.title}</span>}
                                        </div>
                                        {!isCollapsed && mod.subModules && mod.subModules.length > 0 && (
                                            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-600' : 'text-slate-400'}`} />
                                        )}
                                    </div>

                                    {/* Inline Expanded Menu (when not collapsed) */}
                                    {!isCollapsed && mod.subModules && mod.subModules.length > 0 && (
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                                            <div className="pl-12 pr-4 py-1 space-y-1 border-l-2 border-slate-100 ml-6">
                                                {mod.subModules.map((sub, idx) => {
                                                    const isActive = location.pathname === subModuleRoutes[sub];
                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleSubModuleClick(sub)}
                                                            className={`block py-2 text-sm cursor-pointer transition-colors w-full text-left truncate ${isActive ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-brand-600'}`}
                                                        >
                                                            {sub}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {/* Floating Hover Menu for Collapsed Sidebar */}
            {isCollapsed && hoveredMenu && (
                <div
                    className="fixed left-20 w-64 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-slate-100 z-100 flex flex-col overflow-hidden"
                    style={hoverStyle}
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                    onMouseLeave={handleMouseLeave}
                >
                    {(() => {
                        const mod = visibleModules.find(m => m.id === hoveredMenu);
                        if (!mod) return null;
                        return (
                            <div className="flex flex-col h-full">
                                <div className="px-4 py-3 border-b border-slate-50 font-bold text-slate-800 text-sm bg-slate-50/50">
                                    {mod.title}
                                </div>
                                {mod.subModules && mod.subModules.length > 0 ? (
                                    <div className="overflow-y-auto flex-1">
                                        {mod.subModules.map((sub, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSubModuleClick(sub)}
                                                className="block px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-brand-600 cursor-pointer transition-colors w-full text-left"
                                            >
                                                {sub}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-3 text-sm text-slate-400">No sub-modules</div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </>
    );
};

export default Sidebar;
