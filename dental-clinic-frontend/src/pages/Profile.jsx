import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  IdCard,
  BadgeCheck,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Profile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);

      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isBranch = false;
  const displayName = user.fullName;
  const displayDesignation = isBranch ? 'Branch Account' : (user.designation || 'Team Member');

  const identityFields = [
    {
      label: isBranch ? 'Branch Name' : 'Full Name',
      value: displayName,
      icon: isBranch ? Building : User
    },
    {
      label: isBranch ? 'Branch Login Number' : 'Employee Code',
      value: isBranch ? user.mobileNumber : (user.employeeCode || 'N/A'),
      icon: IdCard
    }
  ];

  const contactFields = [
    { label: 'Email Address', value: user.email || 'N/A', icon: Mail },
    { label: 'Mobile Number', value: user.mobileNumber || 'N/A', icon: Phone }
  ];

  const workFields = [
    { label: 'Designation', value: displayDesignation, icon: BadgeCheck },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
            {isBranch ? <Building className="w-6 h-6 text-brand-600" /> : <User className="w-6 h-6 text-brand-600" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{isBranch ? 'Branch Profile' : 'My Profile'}</h1>
            <p className="text-slate-500 text-sm">View and manage your account details</p>
          </div>
        </div>
        {user.isSuperAdmin && (
          <span className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-2">
            <Shield className="w-3 h-3 text-brand-400" />
            Super Admin
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-24 bg-brand-600 relative"></div>
            <div className="px-6 pb-8 text-center -mt-12 relative z-10">
              <div className="inline-block relative">
                <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-lg border border-slate-100">
                  <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                    {isBranch ? <Building className="w-12 h-12 text-slate-400" /> : <User className="w-12 h-12 text-slate-400" />}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" title="Active">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-4">{displayName}</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">{displayDesignation}</p>

              <div className="mt-6 pt-6 border-t border-slate-50 flex flex-col gap-3">
                <div className="flex items-center justify-between px-2 text-sm">
                  <span className="text-slate-400">Account Status</span>
                  <span className="font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md">Verified</span>
                </div>
                <div className="flex items-center justify-between px-2 text-sm">
                  <span className="text-slate-400">{isBranch ? 'Login Identifier' : 'Employee ID'}</span>
                  <span className="font-mono font-bold text-slate-700">{isBranch ? user.mobileNumber : (user.employeeCode || 'N/A')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Information Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2 mb-6">
              <IdCard className="w-4 h-4" /> Identity Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              {identityFields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{field.label}</p>
                  <div className="flex items-center gap-3">
                    <field.icon className="w-4 h-4 text-slate-300" />
                    <p className="font-semibold text-slate-700">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2 mb-6">
              <Mail className="w-4 h-4" /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              {contactFields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{field.label}</p>
                  <div className="flex items-center gap-3">
                    <field.icon className="w-4 h-4 text-slate-300" />
                    <p className="font-semibold text-slate-700">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Professional / Organization Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center gap-2 mb-6">
              <Building className="w-4 h-4" /> Organization Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              {workFields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{field.label}</p>
                  <div className="flex items-center gap-3">
                    <field.icon className="w-4 h-4 text-slate-300" />
                    <p className="font-semibold text-slate-700">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
