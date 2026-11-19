import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    User,
    Clock,
    Info,
    RefreshCcw,
    LayoutGrid,
    Columns,
    CalendarCheck,
    Stethoscope,
    Maximize2,
    CheckCircle2,
    ChevronDown,
    MoreHorizontal
} from 'lucide-react';
import api from '../api/axios';
import useToast from '../hooks/useToast';
import usePermissions from '../hooks/usePermissions';
import AccessDenied from '../components/AccessDenied';
import { formatDate } from '../utils/dateUtils';
import FilterModal from '../components/common/FilterModal';
import ExportExcelButton from '../components/common/ExportExcelButton';
import useListExport from '../hooks/useListExport';
import { countActiveFilters, matchesDateRange, matchesIds } from '../utils/filterUtils';

const EMPTY_CAL_FILTERS = {
    doctorIds: [],
      status: 'all',
    source: 'all',
    fromDate: '',
    toDate: '',
};

const CAL_FILTER_KEYS = [
    { key: 'doctorIds', type: 'array' },
      { key: 'status', type: 'string' },
    { key: 'source', type: 'string' },
    { key: 'fromDate', type: 'date' },
    { key: 'toDate', type: 'date' },
];

const getPatientName = (app) => app.Patient?.patientName || app.Lead?.name || 'Unknown';

const DoctorCalendar = () => {
    const { showToast } = useToast();
    const permissions = usePermissions('Doctor Calendar');

    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month'); // 'month', 'week', 'day'
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
      const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterData, setFilterData] = useState(EMPTY_CAL_FILTERS);
    const [now, setNow] = useState(new Date());
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const scrollContainerRef = useRef(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [docsRes, appsRes] = await Promise.all([
                api.get('/doctor/getDoctors'),
                api.get('/appointment/getAppointments'),
            ]);
            setDoctors(docsRes.data.data || []);
            setAppointments(appsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            showToast('Failed to load schedule', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!permissions || !permissions.view) return;
        fetchData();
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, [permissions?.view]);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);

        const calendarDays = [];
        const prevMonthDays = daysInMonth(year, month - 1);

        // Fill from previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            calendarDays.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                currentMonth: false
            });
        }
        // Current month
        for (let i = 1; i <= days; i++) {
            calendarDays.push({
                date: new Date(year, month, i),
                currentMonth: true
            });
        }
        return calendarDays;
    }, [currentDate]);

    const weekData = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            week.push(day);
        }
        return week;
    }, [currentDate]);

    const activeFilterCount = useMemo(
        () => countActiveFilters(filterData, CAL_FILTER_KEYS),
        [filterData]
    );

    const calFilterFields = useMemo(
        () => [
            { type: 'multiselect', key: 'doctorIds', label: 'Doctor', options: doctors, labelKey: 'name', placeholder: 'All Doctors' },
            {
                type: 'select',
                key: 'status',
                label: 'Status',
                options: [
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'visit', label: 'Visited' },
                    { value: 'no-visit', label: 'No Visit' },
                ],
            },
            {
                type: 'select',
                key: 'source',
                label: 'Source',
                options: [
                    { value: 'all', label: 'All Sources' },
                    { value: 'online', label: 'Online (Lead)' },
                    { value: 'offline', label: 'Offline' },
                ],
            },
            { type: 'date', key: 'fromDate', label: 'From Date' },
            { type: 'date', key: 'toDate', label: 'To Date' },
        ],
        [doctors]
    );

    const filteredAppointments = useMemo(() => {
        if (!permissions || !permissions.view) return [];
        return appointments.filter((app) => {
            if (selectedDoctorId && app.doctorId !== selectedDoctorId) return false;
            if (!matchesIds(app.doctorId, filterData.doctorIds)) return false;
            if (filterData.status !== 'all' && (app.status || 'pending') !== filterData.status) return false;
            if (filterData.source === 'online' && !app.leadId) return false;
            if (filterData.source === 'offline' && app.leadId) return false;
            if (!matchesDateRange(app.appointmentDate, filterData.fromDate, filterData.toDate)) return false;
            return true;
        });
    }, [appointments, selectedDoctorId, filterData, permissions?.view]);

    const { exporting, runExport } = useListExport({
        exportModule: 'appointment',
        exportRows: filteredAppointments,
        exportFilename: 'doctor_calendar',
    });

    const getAppointmentsForDate = (date) => {
        if (!date) return [];
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return filteredAppointments.filter((app) => {
            const appDate = new Date(app.appointmentDate);
            appDate.setHours(0, 0, 0, 0);
            return appDate.getTime() === d.getTime();
        }).sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    };

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() - 1);
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() - 7);
        } else {
            newDate.setDate(currentDate.getDate() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() + 1);
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() + 7);
        } else {
            newDate.setDate(currentDate.getDate() + 1);
        }
        setCurrentDate(newDate);
    };

    const handleDayClick = (date) => {
        setCurrentDate(new Date(date));
        setView('day');
    };

    const formatHeaderDate = () => {
        if (view === 'month') {
            return currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
        } else if (view === 'week') {
            const start = weekData[0];
            const end = weekData[6];
            if (start.getMonth() === end.getMonth()) {
                return `${start.toLocaleDateString('default', { month: 'long' })} ${start.getFullYear()}`;
            }
            return `${start.toLocaleDateString('default', { month: 'short' })} - ${end.toLocaleDateString('default', { month: 'short' })} ${end.getFullYear()}`;
        } else {
            return formatDate(currentDate);
        }
    };

    const START_HOUR = 0;
    const END_HOUR = 23;
    const timeSlots = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => `${i + START_HOUR}:00`); // 7 AM to 11 PM
    const SLOT_HEIGHT = 80;

    const getRedLineTop = () => {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        if (hours < START_HOUR || hours >= END_HOUR) return null;

        const minutesFromStart = (hours - START_HOUR) * 60 + minutes;
        return (minutesFromStart / 60) * SLOT_HEIGHT;
    };

    const isDateToday = (date) => date.toDateString() === new Date().toDateString();

    const AppointmentTooltip = ({ app, position = 'top' }) => (
        <div className={`invisible group-hover/card:visible opacity-0 group-hover/card:opacity-100 absolute left-1/2 -translate-x-1/2 ${position === 'top' ? 'bottom-[110%] mb-2 origin-bottom' : 'top-[110%] mt-2 origin-top'} w-64 bg-white text-slate-900 p-4 rounded-2xl shadow-2xl z-50 transition-all duration-300 pointer-events-none scale-95 group-hover/card:scale-100 border border-slate-100 ring-1 ring-black/5`}>
            <div className="flex items-center gap-3 mb-3 border-b border-slate-50 pb-3">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center font-bold text-brand-600 text-sm shadow-sm shrink-0 uppercase">
                    {getPatientName(app).charAt(0)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="font-bold text-sm text-slate-800 truncate uppercase tracking-tight">{getPatientName(app)}</div>
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-slate-300" /> {app.appointmentTime}
                    </div>
                </div>
            </div>
            
            <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                        <Stethoscope size={11} className="text-slate-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-slate-400 font-bold uppercase tracking-widest text-[7px] mb-0.5 opacity-70">Treatment</div>
                        <div className="text-slate-700 text-[11px] font-medium leading-tight">{app.Treatment?.text || 'Clinical Visit'}</div>
                    </div>
                </div>
            </div>
            
            {/* Arrow */}
            <div className={`absolute ${position === 'top' ? 'top-full border-t-white -mt-1' : 'bottom-full border-b-white -mb-1'} left-1/2 -translate-x-1/2 border-8 border-transparent drop-shadow-sm`}></div>
        </div>
    );


    if (permissions.loading) {
        return (
            <div className="h-full flex items-center justify-center p-12">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!permissions.view) {
        return <AccessDenied moduleName="Doctor Calendar" />;
    }

    return (
        <>
        <FilterModal
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            title="Filter Calendar"
            filterData={filterData}
            setFilterData={setFilterData}
            emptyFilters={EMPTY_CAL_FILTERS}
            activeFilterCount={activeFilterCount}
            filteredCount={filteredAppointments.length}
            totalCount={appointments.length}
            fields={calFilterFields}
            resultLabel="appointments"
        />
        <div className="h-full flex flex-col space-y-4 font-inter text-slate-900 bg-slate-50/50 p-2 sm:p-4 transition-all duration-300">
            {/* Header section - Refined Google Style */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-brand-600 p-3.5 rounded-2xl shadow-lg shadow-brand-100 text-white">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none uppercase">Schedule</h1>
                        <p className="text-slate-400 text-[10px] font-bold mt-2.5 uppercase tracking-[0.2em]">{formatHeaderDate()}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* View Toggle */}
                    <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center border border-slate-200/50">
                        {['Day', 'Week', 'Month'].map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v.toLowerCase())}
                                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${view === v.toLowerCase() ? 'bg-white text-brand-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFilterOpen(true)}
                        className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all ${activeFilterCount > 0 ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-4 h-4 inline mr-1.5" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1.5 min-w-5 h-5 px-1 inline-flex items-center justify-center bg-brand-600 text-white rounded-full text-[10px]">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <ExportExcelButton
                        onExport={runExport}
                        exporting={exporting}
                        count={filteredAppointments.length}
                    />

                    {/* Navigation */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                        <button onClick={handlePrev} className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-brand-600 transition-colors rounded-xl mx-0.5">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={() => { setCurrentDate(new Date()); setView('week'); }} className="px-5 py-1 text-[10px] font-bold text-slate-500 hover:text-brand-600 transition-colors uppercase tracking-[0.2em]">
                            Today
                        </button>
                        <button onClick={handleNext} className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-brand-600 transition-colors rounded-xl mx-0.5">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button
                        onClick={fetchData}
                        className={`p-3.5 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-brand-600 transition-all hover:scale-110 active:scale-95 shadow-sm ${loading ? 'animate-spin border-brand-500 text-brand-600' : ''}`}
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>

            {/* Main Calendar Body */}
            <div className="flex-1 bg-white rounded-2xl sm:rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col relative min-h-[420px] sm:min-h-[550px] lg:min-h-[650px] transition-all duration-500 font-inter min-w-0 max-w-full">

                {view === 'month' ? (
                    <div className="flex flex-col h-full animate-fade-in">
                        {/* Month Header */}
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/40 sticky top-0 z-20 backdrop-blur-md">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                                    {day}
                                </div>
                            ))}
                        </div>
                        {/* Month Grid */}
                        <div className="grid grid-cols-7 flex-1 overflow-y-auto overflow-x-auto touch-scroll-x custom-scrollbar min-w-[640px]">
                            {monthData.map((item, idx) => {
                                const dayApps = getAppointmentsForDate(item?.date);
                                const isToday = isDateToday(item?.date);

                                return (
                                    <div
                                        key={idx}
                                        className={`min-h-[150px] p-3.5 border-r border-b border-slate-100 last:border-r-0 transition-all duration-300 ${item?.currentMonth ? 'bg-white' : 'bg-slate-50/40 opacity-40'} group/day relative`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span
                                                onClick={() => handleDayClick(item?.date)}
                                                className={`text-xs font-bold w-9 h-9 flex items-center justify-center rounded-2xl transition-all cursor-pointer ${isToday ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 animate-pulse' : 'text-slate-700 group-hover/day:bg-brand-50 group-hover/day:text-brand-600'}`}
                                            >
                                                {item?.date.getDate()}
                                            </span>
                                            {dayApps.length > 0 && (
                                                <div className="flex gap-1">
                                                    {dayApps.slice(0, 3).map(app => (
                                                        <div key={app.id} className="w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: app.Doctor?.colorCode || '#cbd5e1' }} />
                                                    ))}
                                                    {dayApps.length > 3 && <MoreHorizontal size={14} className="text-slate-300" />}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 overflow-visible">
                                            {dayApps.slice(0, 4).map(app => (
                                                <div
                                                    key={app.id}
                                                    className="group/card relative px-2 py-1 rounded-lg border-l-4 text-[10px] font-bold transition-all duration-200 hover:z-50 cursor-default shadow-sm border-r border-y border-slate-100/50 flex items-center min-w-0"
                                                    style={{
                                                        backgroundColor: `${app.Doctor?.colorCode || '#cbd5e1'}08`,
                                                        borderLeftColor: app.Doctor?.colorCode || '#cbd5e1',
                                                        color: '#334155'
                                                    }}
                                                >
                                                    <span className="opacity-60 mr-1.5 font-medium shrink-0">{app.appointmentTime?.slice(0, 5)}</span>
                                                    <span className="truncate flex-1">{getPatientName(app)}</span>

                                                    <AppointmentTooltip app={app} />
                                                </div>
                                            ))}
                                            {dayApps.length > 4 && (
                                                <div
                                                    onClick={() => handleDayClick(item?.date)}
                                                    className="text-[9px] font-bold text-slate-400 text-center pt-1.5 uppercase tracking-widest cursor-pointer hover:text-brand-600 transition-colors"
                                                >
                                                    + {dayApps.length - 4} More
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // Day and Week View Container
                    <div className="flex flex-col h-full animate-fade-in relative font-inter min-w-0">
                        <div className="flex-1 touch-scroll-x min-h-0">
                        {/* Day/Week Time Header (Sticky) */}
                        <div className="grid overflow-y-hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm min-w-[560px]" style={{ gridTemplateColumns: view === 'day' ? '64px 1fr' : '64px repeat(7, minmax(72px, 1fr))' }}>
                            <div className="p-4 border-r border-slate-100 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-300 uppercase rotate-[-90deg] tracking-[0.2em]">TIME</span>
                            </div>
                            {(view === 'day' ? [currentDate] : weekData).map((day, idx) => {
                                const isToday = isDateToday(day);
                                return (
                                    <div key={idx} className={`py-5 px-2 text-center border-r border-slate-100 last:border-0 flex flex-col items-center gap-2 ${isToday ? 'bg-brand-50/10' : ''}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isToday ? 'text-brand-600 font-extrabold' : 'text-slate-400'}`}>
                                            {day.toLocaleDateString('default', { weekday: 'short' })}
                                        </span>
                                        <span className={`w-10 h-10 flex items-center justify-center rounded-2xl font-bold text-base transition-all ${isToday ? 'bg-brand-600 text-white shadow-xl shadow-brand-100' : 'text-slate-700'}`}>
                                            {day.getDate()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Scrolling Grid */}
                        <div
                            ref={scrollContainerRef}
                            className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/20"
                        >
                            <div className="relative min-w-full" style={{ height: timeSlots.length * SLOT_HEIGHT }}>
                                {/* Hour Lines & Time Labels */}
                                {timeSlots.map((time, idx) => (
                                    <React.Fragment key={time}>
                                        <div className="absolute left-0 w-20 flex items-center justify-center border-r border-slate-100 bg-white font-bold" style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}>
                                            <span className="text-[10px] text-slate-400 opacity-80 uppercase tracking-tighter">{time}</span>
                                        </div>
                                        <div className="absolute right-0 border-b border-slate-100/60" style={{ left: 80, top: idx * SLOT_HEIGHT, height: 1 }} />
                                    </React.Fragment>
                                ))}

                                {/* Day Columns for Week View */}
                                {view === 'week' && Array.from({ length: 7 }).map((_, idx) => (
                                    <div key={idx} className="absolute h-full border-r border-slate-100/50 last:border-0" style={{ left: `calc(80px + ${idx} * (100% - 80px) / 7)`, width: 1 }} />
                                ))}

                                {/* Appointments Layer */}
                                <div className="absolute inset-0 z-10 overflow-visible" style={{ left: 80 }}>
                                    {(view === 'day' ? [currentDate] : weekData).map((day, dayIdx) => {
                                        const dayApps = getAppointmentsForDate(day);
                                        const columnWidth = view === 'day' ? 100 : 100 / 7;
                                        const leftPos = view === 'day' ? 0 : dayIdx * (100 / 7);

                                        return (
                                            <div
                                                key={dayIdx}
                                                className="absolute h-full"
                                                style={{ left: `${leftPos}%`, width: `${columnWidth}%` }}
                                            >
                                                {(() => {
                                                    // Group appointments by time to handle overlaps
                                                    const appointmentsByTime = dayApps.reduce((acc, a) => {
                                                        if (!acc[a.appointmentTime]) acc[a.appointmentTime] = [];
                                                        acc[a.appointmentTime].push(a);
                                                        return acc;
                                                    }, {});

                                                    return dayApps.map(app => {
                                                        const [h, m] = app.appointmentTime.split(':').map(Number);
                                                        if (h < START_HOUR || h >= END_HOUR) return null;
                                                        const top = ((h - START_HOUR) * 60 + m) / 60 * SLOT_HEIGHT;
                                                        const duration = 60;
                                                        const height = (duration / 60) * SLOT_HEIGHT;

                                                        // Overlap handling for same start time
                                                        const siblings = appointmentsByTime[app.appointmentTime];
                                                        const siblingIndex = siblings.indexOf(app);
                                                        const itemWidth = 100 / siblings.length;
                                                        const itemLeft = siblingIndex * itemWidth;

                                                        return (
                                                            <div
                                                                key={app.id}
                                                                className="absolute group/card transition-all duration-300 z-10"
                                                                style={{ 
                                                                    top: top + 5, 
                                                                    height: height - 10,
                                                                    left: `${itemLeft}%`,
                                                                    width: `${itemWidth}%`,
                                                                    paddingLeft: '4px',
                                                                    paddingRight: '4px'
                                                                }}
                                                            >
                                                                <div 
                                                                    className="h-full rounded-xl border-l-4 py-2 px-3 shadow-sm group-hover/card:shadow-xl group-hover/card:-translate-y-0.5 transition-all flex flex-col relative border-r border-y border-slate-100/30 gap-0.5"
                                                                    style={{ 
                                                                        backgroundColor: `${app.Doctor?.colorCode || '#cbd5e1'}08`,
                                                                        borderLeftColor: app.Doctor?.colorCode || '#cbd5e1',
                                                                        background: `linear-gradient(135deg, ${app.Doctor?.colorCode || '#cbd5e1'}05 0%, ${app.Doctor?.colorCode || '#cbd5e1'}12 100%)`
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-start mb-0.5 min-h-[14px]">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: app.Doctor?.colorCode || '#cbd5e1' }} />
                                                                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: '#475569' }}>
                                                                                {app.appointmentTime?.slice(0, 5)}
                                                                            </span>
                                                                        </div>
                                                                        <Maximize2 size={10} className="opacity-0 group-hover/card:opacity-40 transition-opacity text-slate-400" />
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col justify-center min-h-0">
                                                                        <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight text-slate-700 line-clamp-1 leading-tight">{getPatientName(app)}</div>
                                                                        <div className="text-[8px] sm:text-[9px] font-semibold opacity-50 italic truncate text-slate-500 leading-tight">
                                                                            {app.Treatment?.text || 'Clinical Consultation'}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <AppointmentTooltip app={app} position={top < 180 ? 'bottom' : 'top'} />
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Red Line Indicator */}
                                {((view === 'day' && isDateToday(currentDate)) || (view === 'week' && weekData.some(isDateToday))) && getRedLineTop() !== null && (
                                    <div
                                        className="absolute z-20 pointer-events-none flex items-center transition-all duration-1000"
                                        style={{
                                            top: getRedLineTop(),
                                            left: 0,
                                            right: 0
                                        }}
                                    >
                                        <div className="relative w-full h-[2px] bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                                            {view === 'week' ? (
                                                <div
                                                    className="absolute w-4 h-4 bg-rose-500 rounded-full border-4 border-white -top-[7px] shadow-xl shadow-rose-200 z-50 transition-all duration-1000"
                                                    style={{ left: `calc(80px + ${new Date().getDay()} * (100% - 80px) / 7 - 8px)` }}
                                                />
                                            ) : (
                                                <div className="absolute w-4 h-4 bg-rose-500 rounded-full border-4 border-white -top-[7px] -left-2 shadow-xl shadow-rose-200 z-50" style={{ left: 80 }} />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #96f4dc; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #14b8a6; }
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
            `}</style>
        </div>
        </>
    );
};

export default DoctorCalendar;
