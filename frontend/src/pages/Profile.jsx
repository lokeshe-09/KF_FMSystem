import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone_number: user.phone_number || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number
      };

      await authAPI.updateProfile(updateData);
      toast.success('Profile updated successfully! 🌱', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      
      // Update local storage
      const updatedUser = { ...user, ...updateData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (error) {
      toast.error('Failed to update profile', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
      return;
    }

    setPasswordLoading(true);

    try {
      await authAPI.changePassword({
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      
      toast.success('Password updated successfully! 🔐', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setShowPasswordForm(false);
      
    } catch (error) {
      toast.error('Failed to update password', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="card p-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
              <p className="text-slate-600 font-medium">
                Manage your account information and security preferences
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Profile Information</h3>
                    <p className="text-slate-600 text-sm">Update your personal information and contact details</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleProfileUpdate} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="first_name" className="block text-sm font-semibold text-slate-700">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        name="first_name"
                        id="first_name"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm"
                        placeholder="Enter first name"
                        value={formData.first_name}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="last_name" className="block text-sm font-semibold text-slate-700">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        name="last_name"
                        id="last_name"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm"
                        placeholder="Enter last name"
                        value={formData.last_name}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone_number" className="block text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="phone_number"
                      id="phone_number"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm"
                      placeholder="Enter phone number"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[160px]"
                  >
                    <span className={`flex items-center justify-center space-x-2 transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Update Profile</span>
                    </span>
                    
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span className="text-white font-semibold">Updating...</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform transition-transform duration-700 hover:translate-x-full"></div>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Account Details Sidebar */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <div className="card">
              <div className="px-6 py-4 border-b border-slate-200">
                <h4 className="text-lg font-bold text-slate-900">Account Details</h4>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Username
                  </label>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">{user.username}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Account Type
                  </label>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      user.user_type === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {user.user_type === 'admin' ? (
                        <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.719,17.073l-6.562-6.51c-0.27-0.268-0.27-0.701,0-0.969c0.27-0.268,0.701-0.268,0.969,0l6.562,6.51 c0.27,0.268,0.27,0.701,0,0.969C10.42,17.341,9.989,17.341,9.719,17.073z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707,5.293c0.39,0.39,0.39,1.023,0,1.414L9.414,14l-4.707-4.707c-0.39-0.39-0.39-1.023,0-1.414s1.023-0.39,1.414,0L9.414,11.172l6.879-6.879C16.683,4.903,17.317,4.903,16.707,5.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium capitalize px-2 py-1 rounded-full ${
                      user.user_type === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.user_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Change Card */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Password Security</h4>
                    <p className="text-slate-600 text-sm">Update your password to keep your account secure</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {!showPasswordForm ? (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/20 transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Change Password</span>
                  </button>
                ) : (
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="current_password" className="block text-sm font-semibold text-slate-700">
                        Current Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          name="current_password"
                          id="current_password"
                          required
                          className="w-full pl-12 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                          placeholder="Enter current password"
                          value={formData.current_password}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="new_password" className="block text-sm font-semibold text-slate-700">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          name="new_password"
                          id="new_password"
                          required
                          className="w-full pl-12 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                          placeholder="Enter new password"
                          value={formData.new_password}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirm_password" className="block text-sm font-semibold text-slate-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          name="confirm_password"
                          id="confirm_password"
                          required
                          className="w-full pl-12 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                          placeholder="Confirm new password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setFormData({
                            ...formData,
                            current_password: '',
                            new_password: '',
                            confirm_password: ''
                          });
                        }}
                        className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex-1 relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className={`flex items-center justify-center space-x-2 transition-opacity duration-200 ${passwordLoading ? 'opacity-0' : 'opacity-100'}`}>
                          <span className="text-sm">Update</span>
                        </span>
                        
                        {passwordLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;