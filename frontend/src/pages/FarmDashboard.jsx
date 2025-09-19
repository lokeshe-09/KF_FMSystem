import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const FarmDashboard = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmId) {
      fetchFarmDashboard();
    }
  }, [farmId]);

  const fetchFarmDashboard = async () => {
    try {
      const response = await farmAPI.getFarmDashboard(farmId);
      setDashboard(response.data);
    } catch (error) {
      toast.error('Failed to fetch farm dashboard');
      console.error('Error fetching farm dashboard:', error);
      navigate('/my-farms');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = "blue", onClick = null, description }) => (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 p-4 sm:p-5 md:p-6 ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3 sm:space-x-4">
        <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${color}-100 flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1 truncate">{value}</p>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
        {onClick && (
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );

  const ActivityCard = ({ title, activities, emptyMessage }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900">{title}</h3>
        <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
      </div>
      {activities.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {activities.slice(0, 3).map((activity, index) => (
            <div key={index} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-b-0">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm sm:text-base font-medium text-slate-900 truncate">
                  {activity.crop_zone_name || activity.activity_type || activity.title}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {new Date(activity.created_at || activity.date_time || activity.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {(activity.status || activity.ec_change) && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {activity.status || `EC: ${activity.ec_change}`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-3 border-emerald-600 border-t-transparent"></div>
            <p className="text-slate-600 font-medium text-sm sm:text-base">Loading farm dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!dashboard) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Farm not found</h2>
            <p className="text-slate-600 text-sm sm:text-base mb-6">The farm you're looking for doesn't exist or you don't have access to it.</p>
            <button
              onClick={() => navigate('/my-farms')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Farms
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const { farm, stats, recent_activities } = dashboard;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

          {/* Farm Header */}
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-4 sm:p-5 md:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <button
                    onClick={() => navigate('/my-farms')}
                    className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{farm.name}</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Farm Dashboard</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="truncate">{farm.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <span>{farm.size_in_acres} acres</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-emerald-600">Active</span>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
            <StatCard
              title="Today's Tasks"
              value={stats.today_tasks_completed}
              description="Completed today"
              color="emerald"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              onClick={() => navigate(`/farm/${farmId}/daily-tasks`)}
            />

            <StatCard
              title="This Month"
              value={stats.total_tasks_this_month}
              description="Total tasks"
              color="blue"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              onClick={() => navigate(`/farm/${farmId}/daily-tasks`)}
            />

            <StatCard
              title="Crop Stages"
              value={`${stats.total_crop_stages} (${stats.healthy_crops} healthy)`}
              description={stats.healthy_crops === stats.total_crop_stages ? "All healthy" : "Some need attention"}
              color="purple"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              onClick={() => navigate(`/farm/${farmId}/crop-stages`)}
            />

            <StatCard
              title="Worker Tasks"
              value={`${stats.pending_worker_tasks} pending`}
              description="Tasks assigned"
              color="amber"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              onClick={() => navigate(`/farm/${farmId}/worker-tasks`)}
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-4 sm:p-5 md:p-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900">Quick Actions</h2>
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                {
                  name: 'Daily Tasks',
                  path: 'daily-tasks',
                  icon: (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  ),
                  bgColor: 'bg-blue-50 hover:bg-blue-100',
                  textColor: 'text-blue-700'
                },
                {
                  name: 'Crop Stages',
                  path: 'crop-stages',
                  icon: (
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ),
                  bgColor: 'bg-emerald-50 hover:bg-emerald-100',
                  textColor: 'text-emerald-700'
                },
                {
                  name: 'Spray Schedule',
                  path: 'spray-schedules',
                  icon: (
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ),
                  bgColor: 'bg-purple-50 hover:bg-purple-100',
                  textColor: 'text-purple-700'
                },
                {
                  name: 'Fertigation',
                  path: 'fertigations',
                  icon: (
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ),
                  bgColor: 'bg-amber-50 hover:bg-amber-100',
                  textColor: 'text-amber-700'
                },
                {
                  name: 'Workers',
                  path: 'workers',
                  icon: (
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  bgColor: 'bg-orange-50 hover:bg-orange-100',
                  textColor: 'text-orange-700'
                },
                {
                  name: 'Sales',
                  path: 'sales',
                  icon: (
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  bgColor: 'bg-indigo-50 hover:bg-indigo-100',
                  textColor: 'text-indigo-700'
                }
              ].map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(`/farm/${farmId}/${action.path}`)}
                  className={`group relative p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 ${action.bgColor}`}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                      {action.icon}
                    </div>
                    <div className={`text-xs sm:text-sm font-semibold text-center ${action.textColor}`}>
                      {action.name}
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
            <ActivityCard
              title="Recent Spray/Irrigation"
              activities={recent_activities.spray_logs || []}
              emptyMessage="No recent spray or irrigation activities recorded"
            />

            <ActivityCard
              title="Recent Fertigations"
              activities={recent_activities.fertigations || []}
              emptyMessage="No recent fertigation activities recorded"
            />
          </div>

          {/* Alerts */}
          {(stats.crops_needing_attention > 0 || stats.unread_notifications > 0) && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5 md:p-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-amber-900 mb-2">⚠️ Attention Required</h3>
                  <div className="space-y-2">
                    {stats.crops_needing_attention > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <span className="text-sm text-amber-800">
                          <span className="font-medium">{stats.crops_needing_attention}</span> crop(s) need immediate attention
                        </span>
                      </div>
                    )}
                    {stats.unread_notifications > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-sm text-amber-800">
                          <span className="font-medium">{stats.unread_notifications}</span> unread notification(s)
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/farm/${farmId}/notifications`)}
                    className="mt-3 inline-flex items-center text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors duration-200"
                  >
                    View all notifications
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default FarmDashboard;