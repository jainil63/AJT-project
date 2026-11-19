import { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import DesignationMaster from './pages/DesignationMaster';
import EmployeeMaster from './pages/EmployeeMaster';
import MedicalAlertMaster from './pages/MedicalAlertMaster';
import ConsultantChargeMaster from './pages/ConsultantChargeMaster';
import PaymentByMaster from './pages/PaymentByMaster';
import Transactions from './pages/Transactions';
import SpecialtyMaster from './pages/SpecialtyMaster';
import OPDStatusMaster from './pages/OPDStatusMaster';
import TreatmentMaster from './pages/TreatmentMaster';
import PatientMaster from './pages/PatientMaster';
import PatientDetail from './pages/PatientDetail';
import DoctorMaster from './pages/DoctorMaster';
import DoctorCalendar from './pages/DoctorCalendar';
import OPDMaster from './pages/OPDMaster';
import AppointmentMaster from './pages/AppointmentMaster';
import DocumentTypeMaster from './pages/DocumentTypeMaster';
import ClinicReport from './pages/ClinicReport';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './components/SplashScreen';
import GlobalEscapeCloser from './components/GlobalEscapeCloser';
import NetworkStatusBanner from './components/NetworkStatusBanner';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoverStyle, setHoverStyle] = useState({});

  const toggleMenu = (id) => {
    if (isCollapsed) return;
    setOpenMenus((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="h-dvh min-h-dvh w-full max-w-full bg-slate-50 flex overflow-hidden font-sans relative">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        openMenus={openMenus}
        toggleMenu={toggleMenu}
        hoveredMenu={hoveredMenu}
        setHoveredMenu={setHoveredMenu}
        hoverStyle={hoverStyle}
        setHoverStyle={setHoverStyle}
      />

      <main className="flex-1 flex flex-col h-dvh min-h-0 overflow-hidden relative min-w-0 max-w-full">
        <Header
          setSidebarOpen={setSidebarOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        <div className="app-main-scroll custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-50/50 min-w-0">
          <div className="p-2 xsm:p-2.5 sm:p-3 md:p-4 lg:p-6 w-full max-w-full min-w-0 mx-auto h-full pb-safe">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="designation-master" element={<DesignationMaster />} />
              <Route path="employee-master" element={<EmployeeMaster />} />
              <Route path="medical-alerts" element={<MedicalAlertMaster />} />
              <Route path="consultant-charge" element={<ConsultantChargeMaster />} />
              <Route path="payment-mode" element={<PaymentByMaster />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="specialties-master" element={<SpecialtyMaster />} />
              <Route path="opd-status" element={<OPDStatusMaster />} />
              <Route path="treatment-master" element={<TreatmentMaster />} />
              <Route path="patient-master" element={<PatientMaster />} />
              <Route path="patient/:id" element={<PatientDetail />} />
              <Route path="doctor-master" element={<DoctorMaster />} />
              <Route path="doctor-calendar" element={<DoctorCalendar />} />
              <Route path="opd-master" element={<OPDMaster />} />
              <Route path="appointment-master" element={<AppointmentMaster />} />
              <Route path="appointment-booking" element={<AppointmentMaster />} />
              <Route path="document-type" element={<DocumentTypeMaster />} />
              <Route path="reports/clinic" element={<ClinicReport />} />
              <Route path="profile" element={<Profile />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="relative">
      <GlobalEscapeCloser />
      <NetworkStatusBanner />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/super/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
    </div>
  );
}

export default App;
