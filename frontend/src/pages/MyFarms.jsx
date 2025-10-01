import React, { useState, useEffect } from 'react';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MyFarms = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyFarms();
  }, []);

  const fetchMyFarms = async () => {
    try {
      const response = await farmAPI.getMyFarms();
      setFarms(response.data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
      // Fail gracefully - set empty array instead of showing error to user
      setFarms([]);
      // Only show critical errors (auth issues should redirect automatically via interceptor)
    } finally {
      setLoading(false);
    }
  };

  const handleFarmClick = (farmId) => {
    // Navigate to farm-specific dashboard
    navigate(`/farm/${farmId}/dashboard`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-700 font-medium text-lg">Loading your farms...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          
          {/* Header Section */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                My Farm Portfolio
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Manage and oversee your assigned agricultural operations with comprehensive tools and insights
              </p>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto"></div>
          </div>

          {farms.length === 0 ? (
            /* Empty State */
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 48 48" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-8-8m0 0V9m0 4h4M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">No Farms Assigned</h3>
                <p className="text-slate-600 leading-relaxed">
                  You haven't been assigned to any farms yet. Please contact your agronomist to get started with farm management.
                </p>
              </div>
            </div>
          ) : (
            /* Farms Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {farms.map((farm) => (
                <div 
                  key={farm.id}
                  onClick={() => handleFarmClick(farm.id)}
                  className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-slate-300/20"
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-teal-50/0 group-hover:from-emerald-50/50 group-hover:to-teal-50/30 transition-all duration-300 rounded-2xl"></div>
                  
                  <div className="relative p-8">
                    {/* Farm Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors duration-300 mb-3">
                          {farm.name}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center text-slate-600">
                            <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 616 0z" />
                              </svg>
                            </div>
                            <span className="font-medium">{farm.location}</span>
                          </div>
                          <div className="flex items-center text-slate-600">
                            <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                              </svg>
                            </div>
                            <span className="font-medium">{farm.size_in_acres} acres</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {farm.description && (
                      <div className="mb-6">
                        <p className="text-slate-600 leading-relaxed line-clamp-2">
                          {farm.description}
                        </p>
                      </div>
                    )}

                    {/* Farm Stats - Quick Preview */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700 mb-1">
                          {farm.total_crop_stages || 0}
                        </div>
                        <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                          Crop Stages
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-700 mb-1">
                          {farm.today_tasks_completed || 0}
                        </div>
                        <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">
                          Tasks Today
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <div className="text-xs text-slate-500 font-medium">
                        Created {new Date(farm.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center space-x-2 text-emerald-600 font-semibold group-hover:text-emerald-700 transition-colors duration-300">
                        <span className="text-sm">Enter Farm</span>
                        <div className="w-8 h-8 bg-emerald-100 group-hover:bg-emerald-200 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                          <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle border highlight on hover */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-200/50 rounded-2xl transition-colors duration-300"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyFarms;