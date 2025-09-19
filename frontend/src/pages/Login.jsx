import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-700 font-medium text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.user_type === 'farm_user') {
      return <Navigate to="/farm-user-dashboard" replace />;
    } else if (user?.user_type === 'admin' || user?.is_superuser) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const result = await login(formData);
    
    if (result.success) {
      toast.success('Welcome back!', {
        duration: 3000,
        style: {
          background: '#059669',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
      
      const userData = JSON.parse(localStorage.getItem('user'));
      
      if (userData.user_type === 'farm_user') {
        navigate('/farm-user-dashboard');
      } else if (userData.user_type === 'admin' || userData.is_superuser) {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      toast.error(result.error || 'Login failed', {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
    
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#f8fafc',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
      
      {/* Full Page Background Image */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80" 
          alt="Hydroponic Lettuce Farm" 
          className="w-full h-full object-cover"
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/75 via-emerald-900/70 to-slate-900/75"></div>
      </div>

      {/* Additional Background Images for Depth */}
      <div className="absolute top-16 right-16 w-40 h-40 opacity-20 rounded-2xl overflow-hidden transform rotate-12 shadow-xl border-2 border-white/20 hidden lg:block">
        <img 
          src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
          alt="Modern Hydroponic Greenhouse" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="absolute bottom-20 left-16 w-36 h-36 opacity-15 rounded-xl overflow-hidden transform -rotate-6 shadow-lg border-2 border-white/20 hidden lg:block">
        <img 
          src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
          alt="Hydroponic Vegetables" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.8'%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3Ccircle cx='30' cy='10' r='2'/%3E%3Ccircle cx='50' cy='10' r='2'/%3E%3Ccircle cx='10' cy='30' r='2'/%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3Ccircle cx='50' cy='30' r='2'/%3E%3Ccircle cx='10' cy='50' r='2'/%3E%3Ccircle cx='30' cy='50' r='2'/%3E%3Ccircle cx='50' cy='50' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16 items-center">
          
          {/* Left Side - Brand & Features */}
          <div className="lg:col-span-7 text-center lg:text-left order-2 lg:order-1 px-2 sm:px-0">
            {/* Logo */}
            <div className="mb-8 sm:mb-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-6 sm:mb-8 shadow-xl shadow-emerald-500/30">
                <svg className="w-7 h-7 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight tracking-tight">
                  Hydroponic
                  <span className="block text-emerald-400">Farm Intelligence</span>
                </h1>
                <div className="w-12 sm:w-16 h-1 bg-emerald-500 rounded-full mb-6 sm:mb-8 mx-auto lg:mx-0"></div>
                <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed font-light max-w-2xl mx-auto lg:mx-0">
                  Transforming agriculture through intelligent automation, 
                  precision monitoring, and data-driven optimization.
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-12">
              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-sm sm:text-base">AI-Powered Analytics</h3>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-sm sm:text-base">Automated Systems</h3>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-sm sm:text-base">Real-Time Monitoring</h3>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-sm sm:text-base">Smart Economics</h3>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 hidden sm:grid">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">300%</div>
                <div className="text-xs sm:text-sm text-slate-400 font-medium">Higher Yields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">97%</div>
                <div className="text-xs sm:text-sm text-slate-400 font-medium">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">24/7</div>
                <div className="text-xs sm:text-sm text-slate-400 font-medium">Monitoring</div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:col-span-5 order-1 lg:order-2 px-2 sm:px-0">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-5 sm:p-6 md:p-8 lg:p-10 max-w-md mx-auto w-full">
              
              {/* Form Header */}
              <div className="mb-6 sm:mb-8 text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base font-light">Sign in to your dashboard</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white/40 border-2 border-slate-200/40 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 text-sm sm:text-base font-medium shadow-sm backdrop-blur-sm"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full pl-12 pr-12 py-3 sm:py-4 bg-white/40 border-2 border-slate-200/40 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 text-sm sm:text-base font-medium shadow-sm backdrop-blur-sm"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-500 transition-colors duration-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full relative overflow-hidden bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                >
                  <span className={`flex items-center justify-center space-x-3 transition-opacity duration-200 ${submitting ? 'opacity-0' : 'opacity-100'}`}>
                    <span>Sign In</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  
                  {/* Loading State */}
                  {submitting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-600">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white font-semibold">Signing in...</span>
                      </div>
                    </div>
                  )}
                </button>
              </form>

              {/* Security Footer */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-2 text-slate-500 text-sm mb-4">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Secured with enterprise-grade encryption</span>
                </div>
                
                {/* Features */}
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-8 text-xs text-slate-400 mb-6">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">24/7 Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium">Real-time Data</span>
                  </div>
                </div>
                
                {/* Company Info */}
                <div className="text-xs text-slate-400">
                  <p>© 2025 Hydroponic Farm Intelligence. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;