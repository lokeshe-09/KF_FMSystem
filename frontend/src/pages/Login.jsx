import React, { useState, useEffect } from 'react';
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 20 - 10,
        y: (e.clientY / window.innerHeight) * 20 - 10
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white font-semibold text-xl">Loading...</span>
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
      toast.success('You\'re in! Redirecting...', {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #00C389, #0AA77A)',
          color: '#fff',
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: '600',
        },
      });

      const userData = JSON.parse(localStorage.getItem('user'));

      setTimeout(() => {
        if (userData.user_type === 'farm_user') {
          navigate('/farm-user-dashboard');
        } else if (userData.user_type === 'admin' || userData.is_superuser) {
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } else {
      const errorMessages = {
        'Invalid credentials': 'We couldn\'t find an account with that email.',
        'Incorrect password': 'Incorrect password — try again.',
        'Account locked': 'Your account has been temporarily locked for security.',
      };

      toast.error(errorMessages[result.error] || result.error || 'Login failed', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: '#fff',
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: '600',
        },
      });
    }

    setSubmitting(false);
  };


  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#0F1724',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '500',
            backdropFilter: 'blur(20px)',
          },
        }}
      />

      {/* Cinematic Background Hero */}
      <div className="absolute inset-0">
        {/* Main Hero Image with Parallax */}
        <div
          className="absolute inset-0 transition-transform duration-1000 ease-out"
          style={{
            transform: `translate3d(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.3}px, 0)`
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=3440&q=90"
            alt="Hydroponic Farm Intelligence"
            className="w-full h-full object-cover scale-110 filter blur-[2px]"
          />
          {/* Warm Green Color Grade Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 via-green-700/50 to-slate-900/60 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40"></div>
        </div>

        {/* Floating Particle Animation */}
        <div className="absolute inset-0 opacity-20 pointer-events-none hidden lg:block">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Side - Hero Content (60%) */}
            <div className="lg:col-span-7 text-center lg:text-left order-2 lg:order-1">
              {/* Brand Header */}
              <div className="mb-12">
                <div className="flex items-center justify-center lg:justify-start mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                  Hydroponic
                  <span className="block bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-transparent">
                    Farm Intelligence
                  </span>
                </h1>

                <div className="w-20 h-1.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mb-8 mx-auto lg:mx-0 shadow-lg shadow-emerald-400/50"></div>

                <p className="text-xl text-slate-300 leading-relaxed font-light max-w-2xl mx-auto lg:mx-0 mb-12">
                  Revolutionary agtech platform delivering precision monitoring,
                  AI-driven optimization, and sustainable farming solutions.
                </p>
              </div>

              {/* Feature Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <div className="group p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">AI Analytics</h3>
                  <p className="text-slate-400 text-sm">Predictive insights</p>
                </div>

                <div className="group p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Automation</h3>
                  <p className="text-slate-400 text-sm">Smart controls</p>
                </div>

                <div className="group p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Monitoring</h3>
                  <p className="text-slate-400 text-sm">Real-time data</p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl font-bold text-white mb-2">300%</div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Higher Yields</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl font-bold text-white mb-2">97%</div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl font-bold text-white mb-2">24/7</div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Support</div>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Card (36%) */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div
                className="relative max-w-md mx-auto transform transition-all duration-500 ease-out"
                style={{
                  transform: `translate3d(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.1}px, 0)`
                }}
              >
                {/* Glassmorphism Auth Card */}
                <div className="bg-white/15 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl shadow-black/20 relative overflow-hidden">
                  {/* Card Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-emerald-500/10 rounded-3xl"></div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
                      <p className="text-slate-300 text-sm font-medium">Sign in to your Hydroponic Farm Intelligence dashboard</p>
                    </div>

                    {/* Main Auth Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Username Field */}
                      <div>
                        <label className="block text-sm font-semibold text-white mb-3">
                          Username
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <input
                            name="username"
                            type="text"
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 focus:-translate-y-1 backdrop-blur-sm"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div>
                        <label className="block text-sm font-semibold text-white mb-3">
                          Password
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full pl-12 pr-12 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all duration-300 focus:-translate-y-1 backdrop-blur-sm"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-400 transition-colors duration-200"
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
                        className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-500 disabled:to-slate-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 text-lg"
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center space-x-3">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Signing in...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-3">
                            <span>Sign In</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </form>

                    {/* Security & Trust Footer */}
                    <div className="mt-8 text-center">
                      <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs mb-4">
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Enterprise-grade encryption</span>
                      </div>

                      <div className="text-xs text-slate-500">
                        <p>© 2025 Hydroponic Farm Intelligence. All rights reserved.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.2; }
          25% { transform: translateY(-20px) rotate(90deg); opacity: 0.4; }
          50% { transform: translateY(-40px) rotate(180deg); opacity: 0.6; }
          75% { transform: translateY(-20px) rotate(270deg); opacity: 0.4; }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;