import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { farmAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import useWebSocket from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, isAdmin, isSuperuser } = useAuth();
  const [farms, setFarms] = useState([]);
  const [farmUsers, setFarmUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    phone_number: ''
  });
  const [adminFormErrors, setAdminFormErrors] = useState({});
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalUsers: 0,
    totalAcres: 0
  });

  // Handle incoming WebSocket notifications on Dashboard
  const handleDashboardNotification = useCallback((newNotification) => {
    // Show a brief toast notification on dashboard
    toast.success(`${newNotification.title}: ${newNotification.user_name}`, {
      duration: 3000,
      icon: '📋',
    });
  }, []);

  // WebSocket connection for admin users
  const { connectionStatus } = useWebSocket((isAdmin || isSuperuser) ? handleDashboardNotification : null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const farmResponse = await farmAPI.getFarms();
      setFarms(farmResponse.data);
      
      if (isAdmin) {
        const userResponse = await authAPI.getFarmUsers();
        setFarmUsers(userResponse.data);
        
        setStats({
          totalFarms: farmResponse.data.length,
          totalUsers: userResponse.data.length,
          totalAcres: farmResponse.data.reduce((sum, farm) => sum + parseFloat(farm.size_in_acres || 0), 0)
        });
      } else if (isSuperuser) {
        const userResponse = await authAPI.getAllUsers();
        setFarmUsers(userResponse.data);
        
        setStats({
          totalFarms: farmResponse.data.length,
          totalUsers: userResponse.data.length,
          totalAcres: farmResponse.data.reduce((sum, farm) => sum + parseFloat(farm.size_in_acres || 0), 0)
        });
      } else {
        setStats({
          totalFarms: farmResponse.data.length,
          totalUsers: 0,
          totalAcres: farmResponse.data.reduce((sum, farm) => sum + parseFloat(farm.size_in_acres || 0), 0)
        });
      }
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminFormErrors({});
    
    // Client-side validation
    const errors = {};
    if (!adminFormData.username.trim()) errors.username = 'Username is required';
    if (!adminFormData.email.trim()) errors.email = 'Email is required';
    if (!adminFormData.password.trim()) errors.password = 'Password is required';
    else if (adminFormData.password.length < 8) errors.password = 'Password must be at least 8 characters';

    if (Object.keys(errors).length > 0) {
      setAdminFormErrors(errors);
      return;
    }

    try {
      await authAPI.createAdmin(adminFormData);
      toast.success('🎉 Admin created successfully!');
      setShowCreateAdminModal(false);
      setShowPassword(false);
      setAdminFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        phone_number: ''
      });
      setAdminFormErrors({});
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating admin:', error);
      if (error.response?.data) {
        setAdminFormErrors(error.response.data);
      } else {
        toast.error('Failed to create admin. Please try again.');
      }
    }
  };

  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="card p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back, {user.first_name || user.username}! 👋
              </h1>
              <p className="text-lg text-slate-600 font-medium">
                {isSuperuser ? 'Superuser Dashboard - Full System Access' : 
                 user.user_type === 'admin' ? 'System Administrator Dashboard' : 'Farm User Dashboard'}
              </p>
              {isSuperuser && (
                <div className="flex items-center space-x-2 text-purple-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Superuser privileges - Full system control</span>
                </div>
              )}
              {isAdmin && !isSuperuser && (
                <div className="flex items-center space-x-2 text-emerald-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Administrator privileges active</span>
                </div>
              )}
              {!isAdmin && !isSuperuser && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Manage your assigned farms</span>
                </div>
              )}
            </div>
            <div className="text-left lg:text-right">
              <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 rounded-2xl border border-slate-200/60">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Farms Stats Card */}
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    {isAdmin || isSuperuser ? 'Total Farms' : 'My Farms'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalFarms}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                Active
              </div>
            </div>
          </div>

          {/* Users Stats Card (Admin/Superuser Only) */}
          {(isAdmin || isSuperuser) && (
            <div className="stats-card group">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                      Farm Users
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium bg-blue-50 px-2 py-1 rounded-full">
                  Registered
                </div>
              </div>
            </div>
          )}

          {/* Acres Stats Card */}
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Total Acres
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalAcres.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-amber-50 px-2 py-1 rounded-full">
                Managed
              </div>
            </div>
          </div>
        </div>

        {/* Admin Management Card (Superuser Only) */}
        {isSuperuser && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Admin Management</h2>
                <p className="text-slate-600">Create and manage system administrators</p>
              </div>
              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="btn btn-primary"
              >
                + Create Admin
              </button>
            </div>
            <div className="text-center text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p>Use the "Create Admin" button to add new administrators to the system.</p>
            </div>
          </div>
        )}

        {/* Recent Farms */}
        <div className="card">
          <div className="px-8 py-6 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {isAdmin || isSuperuser ? 'Recent Farms' : 'My Farms'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {isAdmin || isSuperuser ? 'Overview of all farms in the system' : 'Farms assigned to you'}
                  </p>
                </div>
              </div>
              {farms.length > 0 && (
                <a
                  href="/farms"
                  className="btn-secondary text-sm"
                >
                  View All
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          </div>
          
          <div className="p-8">
            {farms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No farms found</h4>
                <p className="text-slate-500 mb-6">
                  {isAdmin || isSuperuser ? 'Start by creating your first farm' : 'You haven\'t been assigned to any farms yet'}
                </p>
                {(isAdmin || isSuperuser) && (
                  <a href="/create-farm" className="btn-primary">
                    Create Farm
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </a>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Farm Name</th>
                      <th>Location</th>
                      <th>Size (Acres)</th>
                      {(isAdmin || isSuperuser) && <th>Owner</th>}
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {farms.slice(0, 5).map((farm) => (
                      <tr key={farm.id} className="group">
                        <td>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                              <span className="text-sm font-bold text-emerald-600">
                                {farm.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{farm.name}</p>
                              <p className="text-xs text-slate-500">ID: {farm.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center text-slate-600">
                            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {farm.location}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {farm.size_in_acres} acres
                            </span>
                          </div>
                        </td>
                        {(isAdmin || isSuperuser) && (
                          <td>
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-xs font-semibold text-white">
                                  {farm.owner_details?.username?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <span className="text-slate-600 text-sm">{farm.owner_details?.username || 'Unknown'}</span>
                            </div>
                          </td>
                        )}
                        <td>
                          <div className="text-sm text-slate-600">
                            {new Date(farm.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 hover:bg-slate-100 rounded-lg">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Admin Modal - Cute & Responsive Design */}
      {showCreateAdminModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-[420px] max-h-[90vh] overflow-hidden"
            style={{
              animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Sticky Header with Gradient */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👤</span>
                Create Admin
              </h2>
              <button
                onClick={() => {
                  setShowCreateAdminModal(false);
                  setShowPassword(false);
                  setAdminFormErrors({});
                }}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6">
                <form onSubmit={handleCreateAdmin} className="space-y-5">
                  {/* Username Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                      Username *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        name="username"
                        value={adminFormData.username}
                        onChange={handleAdminFormChange}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm placeholder-gray-400 transition-all duration-200 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          adminFormErrors.username ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Enter username"
                        autoComplete="username"
                      />
                    </div>
                    {adminFormErrors.username && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {adminFormErrors.username}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                      Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={adminFormData.email}
                        onChange={handleAdminFormChange}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm placeholder-gray-400 transition-all duration-200 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          adminFormErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                        }`}
                        placeholder="admin@example.com"
                        autoComplete="email"
                      />
                    </div>
                    {adminFormErrors.email && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {adminFormErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Name Fields - Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={adminFormData.first_name}
                        onChange={handleAdminFormChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 transition-all duration-200 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John"
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={adminFormData.last_name}
                        onChange={handleAdminFormChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 transition-all duration-200 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Doe"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                      Phone Number
                      <span className="text-xs text-gray-400 ml-1 lowercase font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        name="phone_number"
                        value={adminFormData.phone_number}
                        onChange={handleAdminFormChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 transition-all duration-200 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                      Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={adminFormData.password}
                        onChange={handleAdminFormChange}
                        className={`w-full pl-10 pr-12 py-3 bg-gray-50 border rounded-xl text-sm placeholder-gray-400 transition-all duration-200 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          adminFormErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M14.12 14.12L15.536 15.536" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {adminFormErrors.password && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {adminFormErrors.password}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Sticky Footer with Buttons */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAdminModal(false);
                    setShowPassword(false);
                    setAdminFormErrors({});
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateAdmin}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full text-sm font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span>✨</span>
                  Create Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;