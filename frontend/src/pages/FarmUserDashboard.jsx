import React, { useState, useEffect } from 'react';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const FarmUserDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await farmAPI.getFarmUserDashboard();
      setDashboard(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard');
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFarmClick = (farmId) => {
    navigate(`/farm/${farmId}/dashboard`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-700 font-medium">Loading dashboard...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">

          {/* Header Section */}
          <div className="mb-8 sm:mb-12">
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-6 sm:p-8 shadow-xl">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-teal-500/90"></div>
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
                        Farm Dashboard
                      </h1>
                      <div className="flex items-center gap-2 text-emerald-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm sm:text-base font-medium">
                          {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/my-farms')}
                  className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <svg className="w-4 h-4 mr-2 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="relative z-10">View All Farms</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Total Farms Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full transform translate-x-4 -translate-y-4"></div>

              <div className="relative z-10 flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.total_farms || 0}
                  </p>
                  <p className="text-xs font-medium text-blue-100">Total Farms</p>
                </div>
                <div className="ml-auto w-1 h-1 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Completed Today Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full transform translate-x-4 -translate-y-4"></div>

              <div className="relative z-10 flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.farms?.reduce((sum, farm) => sum + farm.today_tasks_completed, 0) || 0}
                  </p>
                  <p className="text-xs font-medium text-emerald-100">Completed Today</p>
                </div>
                <div className="ml-auto w-1 h-1 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Crop Stages Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full transform translate-x-4 -translate-y-4"></div>

              <div className="relative z-10 flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.farms?.reduce((sum, farm) => sum + farm.total_crop_stages, 0) || 0}
                  </p>
                  <p className="text-xs font-medium text-purple-100">Crop Stages</p>
                </div>
                <div className="ml-auto w-1 h-1 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Pending Tasks Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full transform translate-x-4 -translate-y-4"></div>

              <div className="relative z-10 flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.farms?.reduce((sum, farm) => sum + farm.pending_tasks, 0) || 0}
                  </p>
                  <p className="text-xs font-medium text-amber-100">Pending Tasks</p>
                </div>
                <div className="ml-auto w-1 h-1 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Farms Grid */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Your Farms</h2>
                <p className="text-slate-600">Manage and monitor your assigned farm operations</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Active Farms</span>
              </div>
            </div>
            
            {!dashboard?.farms || dashboard.farms.length === 0 ? (
              <div className="bg-white rounded-xl p-6 sm:p-8 lg:p-12 text-center shadow-sm border border-slate-200">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No Farms Assigned</h3>
                <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
                  You haven't been assigned to any farms yet. Contact your administrator to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {dashboard.farms.map((farm) => (
                  <div
                    key={farm.id}
                    onClick={() => handleFarmClick(farm.id)}
                    className="group relative overflow-hidden bg-white rounded-2xl p-6 sm:p-7 shadow-lg hover:shadow-2xl cursor-pointer transition-all duration-500 hover:-translate-y-2 border border-slate-100 hover:border-emerald-200"
                  >
                    {/* Background Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-emerald-100 rounded-full opacity-20 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-16 h-16 bg-blue-100 rounded-full opacity-20 group-hover:scale-110 transition-transform duration-500"></div>

                    <div className="relative z-10">
                      {/* Farm Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors duration-300">
                              {farm.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-emerald-600">Active</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Operational
                          </div>
                        </div>
                      </div>

                      {/* Farm Details */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="font-medium">{farm.location}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                          </div>
                          <span className="font-medium">{farm.size_in_acres} acres</span>
                        </div>
                      </div>

                      {/* Enhanced Farm Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                          <div className="absolute top-0 right-0 w-8 h-8 bg-blue-200 rounded-full opacity-50 transform translate-x-2 -translate-y-2"></div>
                          <div className="relative z-10">
                            <div className="text-2xl font-bold text-blue-900 mb-1">{farm.today_tasks_completed}</div>
                            <div className="text-xs font-medium text-blue-700">Tasks Completed</div>
                            <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
                              <div className="bg-blue-500 h-1 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                          <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-200 rounded-full opacity-50 transform translate-x-2 -translate-y-2"></div>
                          <div className="relative z-10">
                            <div className="text-2xl font-bold text-emerald-900 mb-1">{farm.total_crop_stages}</div>
                            <div className="text-xs font-medium text-emerald-700">Crop Stages</div>
                            <div className="w-full bg-emerald-200 rounded-full h-1 mt-2">
                              <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Notifications */}
                      {(farm.pending_tasks > 0 || farm.unread_notifications > 0) && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {farm.pending_tasks > 0 && (
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {farm.pending_tasks} pending
                            </div>
                          )}
                          {farm.unread_notifications > 0 && (
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 7.5H21m-10.5 0a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                              </svg>
                              {farm.unread_notifications} alerts
                            </div>
                          )}
                        </div>
                      )}

                      {/* Enhanced Action Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200 group-hover:border-emerald-200 transition-colors duration-300">
                        <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-700 transition-colors duration-300">Manage Farm Operations</span>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 group-hover:bg-emerald-100 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-all duration-300">
                            <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 transform group-hover:translate-x-0.5 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FarmUserDashboard;