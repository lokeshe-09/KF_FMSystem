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
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          
          {/* Header Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
                  Farm Dashboard
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm lg:text-base">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button 
                onClick={() => navigate('/my-farms')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                View All Farms
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                    {dashboard?.total_farms || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">Total Farms</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                    {dashboard?.farms?.reduce((sum, farm) => sum + farm.today_tasks_completed, 0) || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">Completed Today</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                    {dashboard?.farms?.reduce((sum, farm) => sum + farm.total_crop_stages, 0) || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">Crop Stages</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                    {dashboard?.farms?.reduce((sum, farm) => sum + farm.pending_tasks, 0) || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">Pending Tasks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Farms Grid */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Your Farms</h2>
            
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {dashboard.farms.map((farm) => (
                  <div
                    key={farm.id}
                    onClick={() => handleFarmClick(farm.id)}
                    className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 group"
                  >
                    {/* Farm Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 group-hover:text-emerald-700 mb-2 transition-colors duration-300">
                          {farm.name}
                        </h3>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {farm.location}
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            {farm.size_in_acres} acres
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>

                    {/* Farm Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xl font-bold text-blue-900">{farm.today_tasks_completed}</div>
                        <div className="text-xs text-blue-700">Today's Tasks</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <div className="text-xl font-bold text-emerald-900">{farm.total_crop_stages}</div>
                        <div className="text-xs text-emerald-700">Crop Stages</div>
                      </div>
                    </div>

                    {/* Notifications */}
                    {(farm.pending_tasks > 0 || farm.unread_notifications > 0) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {farm.pending_tasks > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                            {farm.pending_tasks} pending
                          </span>
                        )}
                        {farm.unread_notifications > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                            {farm.unread_notifications} alerts
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-sm text-slate-500 group-hover:text-emerald-600 transition-colors duration-300">Click to manage farm</span>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
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