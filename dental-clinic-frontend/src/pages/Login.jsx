import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import useToast from '../hooks/useToast';
import api from '../api/axios';
import logoImg from '../assets/logo.jpeg';

const Login = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    loginId: '',
    password: ''
  });
  const [isFocused, setIsFocused] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // If a session is already cached, jump straight to the dashboard. `replace` removes
  // the login route from history so a single back press from the dashboard exits the
  // WebView (in the Android shell) or the browser tab — never returns here.
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/super', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', {
        identifier: formData.loginId,
        password: formData.password
      });

      if (response.data) {
        const accessToken = response.data.tokens.accessToken;
        const refreshToken = response.data.tokens.refreshToken ?? null;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        // Hand the token to the Android shell when the app runs inside the WebView,
        // so background call-log / recording uploads can authenticate.
        showToast('Login successful!', 'success');
        // `replace` so the back stack drops the login page entirely.
        navigate('/super', { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast(error.response?.data?.message || 'An error occurred during login', 'error');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-dvh w-full max-w-full flex items-center justify-center p-4 sm:p-8 pt-safe pb-safe pl-safe pr-safe relative overflow-x-hidden overflow-y-auto bg-[#f8fafc] font-sans">
      {/* Background Ornaments - Medical/Clean Teal Theme */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Soft static backgrounds */}
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-brand-50/60 blur-[100px] opacity-80 mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-50/60 blur-[120px] opacity-80 mix-blend-multiply"></div>
        
        {/* Animated animated-blob to mimic previous design */}
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d94880a_1px,transparent_1px),linear-gradient(to_bottom,#0d94880a_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(13,148,136,0.1)] border border-slate-100 flex flex-col md:flex-row overflow-hidden relative z-10 animate-fade-in-up">
        
        {/* Left Side - Branding & Visuals (Hidden on small screens) */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-brand-600 p-12 text-white relative overflow-hidden">
          {/* Internal decorative elements for left side */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-tr-full"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-700 opacity-90"></div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-lg mb-8 flex items-center justify-center backdrop-blur-sm bg-white/90">
              <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4 tracking-tight">
              Swaminarayan <br/>
              <span className="text-brand-100 italic font-semibold">Dental Clinic</span>
            </h1>
            <p className="text-brand-100 text-lg max-w-md font-medium">
              A comprehensive system to manage appointments, patients, and clinic operations effortlessly.
            </p>
          </div>

          <div className="relative z-10 mt-16">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-1 bg-brand-300 rounded-full"></div>
              <div className="w-3 h-1 bg-brand-300/50 rounded-full"></div>
            </div>
            <p className="text-sm text-brand-200 font-medium">
              Secure, Fast, and Reliable Access
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Mobile Logo/Title (Visible only on small screens) */}
            <div className="md:hidden text-center mb-8">
              <div className="w-16 h-16 bg-white rounded-xl p-1.5 shadow-md border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Swaminarayan</h2>
              <h3 className="text-lg font-semibold text-brand-600">Dental Clinic</h3>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
              <p className="text-slate-500 font-medium">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={`transition-all duration-300 transform origin-left ${isFocused === 'loginId' ? 'scale-[1.02]' : 'scale-100'}`}>
                <label className="text-sm font-bold text-slate-700 block mb-2">Email or Mobile</label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${isFocused === 'loginId' ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    <UserCircle2 className="h-[22px] w-[22px]" />
                  </div>
                  <input
                    type="text"
                    name="loginId"
                    value={formData.loginId}
                    onChange={handleChange}
                    onFocus={() => setIsFocused('loginId')}
                    onBlur={() => setIsFocused(null)}
                    className={`block w-full pl-12 pr-4 py-4 rounded-xl text-slate-800 placeholder-slate-400 transition-all duration-300 border-2 outline-none font-medium ${isFocused === 'loginId' ? 'bg-white border-brand-500 shadow-[0_0_0_4px_rgba(13,148,136,0.1)]' : 'bg-slate-50/80 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                    placeholder="Enter your email or mobile"
                    required
                  />
                </div>
              </div>

              <div className={`transition-all duration-300 transform origin-left ${isFocused === 'password' ? 'scale-[1.02]' : 'scale-100'}`}>
                <label className="text-sm font-bold text-slate-700 block mb-2">Password</label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${isFocused === 'password' ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    <Lock className="h-[22px] w-[22px]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setIsFocused('password')}
                    onBlur={() => setIsFocused(null)}
                    className={`block w-full pl-12 pr-12 py-4 rounded-xl text-slate-800 placeholder-slate-400 transition-all duration-300 border-2 outline-none font-medium ${isFocused === 'password' ? 'bg-white border-brand-500 shadow-[0_0_0_4px_rgba(13,148,136,0.1)]' : 'bg-slate-50/80 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-[0_8px_20px_-6px_rgba(13,148,136,0.6)] hover:shadow-[0_12px_24px_-8px_rgba(13,148,136,0.7)] hover:-translate-y-1 transform transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-500/30 flex items-center justify-center space-x-3 mt-8 group"
              >
                <span>Sign In Securely</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
