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

  const StatCard = ({ title, value, icon, color = "blue", onClick = null, description }) => {
    const getColorClasses = (color) => {
      const colorMap = {
        emerald: {
          bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
          iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
          iconText: 'text-white',
          accent: 'border-l-emerald-400',
          hover: 'hover:from-emerald-100 hover:to-emerald-200'
        },
        blue: {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
          iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
          iconText: 'text-white',
          accent: 'border-l-blue-400',
          hover: 'hover:from-blue-100 hover:to-blue-200'
        },
        purple: {
          bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
          iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
          iconText: 'text-white',
          accent: 'border-l-purple-400',
          hover: 'hover:from-purple-100 hover:to-purple-200'
        },
        amber: {
          bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
          iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
          iconText: 'text-white',
          accent: 'border-l-amber-400',
          hover: 'hover:from-amber-100 hover:to-amber-200'
        }
      };
      return colorMap[color] || colorMap.blue;
    };

    const colors = getColorClasses(color);

    return (
      <div
        className={`group relative overflow-hidden bg-white/90 rounded-xl shadow-sm hover:shadow-md border border-slate-200/60 hover:border-slate-300 border-l-4 ${colors.accent} transition-all duration-200 p-4 ${
          onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
        }`}
        onClick={onClick}
      >
        {/* Subtle background gradient */}
        <div className={`absolute inset-0 ${colors.bg} opacity-20 group-hover:opacity-30 transition-opacity duration-200`} />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
              <div className={colors.iconText}>
                {icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                {title}
              </p>
              <p className="text-lg font-bold text-slate-900 leading-tight break-words">
                {value}
              </p>
              {description && (
                <p className="text-xs text-slate-600 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {onClick && (
            <div className="flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-all duration-200">
                <svg className="w-3 h-3 text-slate-500 group-hover:text-slate-700 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ActivityCard = ({ title, activities, emptyMessage }) => (
    <div className="group bg-white/90 rounded-xl shadow-sm hover:shadow-md border border-slate-200/60 hover:border-slate-300 transition-all duration-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors duration-200">
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 3).map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all duration-200">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {activity.crop_zone_name || activity.activity_type || activity.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(activity.created_at || activity.date_time || activity.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {(activity.status || activity.ec_change) && (
                <div className="flex-shrink-0 ml-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    {activity.status || `EC: ${activity.ec_change}`}
                  </span>
                </div>
              )}
            </div>
          ))}

          {activities.length > 3 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-center text-slate-500">
                +{activities.length - 3} more
              </p>
            </div>
          )}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <button
              onClick={() => navigate('/my-farms')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              My Farms
            </button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-emerald-600 font-medium">{farm.name} Dashboard</span>
          </nav>

          {/* Farm Header */}
          <div className="bg-white/90 shadow-sm rounded-xl border border-slate-200/60 hover:border-slate-300 p-5 mb-6 transition-all duration-200">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold text-slate-900">{farm.name}</h1>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{farm.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      <span>{farm.size_in_acres} acres</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm font-medium text-emerald-700">Active</span>
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
              value={`${stats.healthy_crops} healthy`}
              description="All healthy"
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
          <div className="bg-white/90 shadow-sm rounded-xl border border-slate-200/60 hover:border-slate-300 p-5 mb-6 transition-all duration-200">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  name: 'Daily Tasks',
                  path: 'daily-tasks',
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  ),
                  gradient: 'from-blue-500 to-blue-600',
                  bgColor: 'bg-blue-50 hover:bg-blue-100',
                  textColor: 'text-blue-700'
                },
                {
                  name: 'Crop Stages',
                  path: 'crop-stages',
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ),
                  gradient: 'from-emerald-500 to-emerald-600',
                  bgColor: 'bg-emerald-50 hover:bg-emerald-100',
                  textColor: 'text-emerald-700'
                },
                {
                  name: 'Spray Schedule',
                  path: 'spray-schedules',
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ),
                  gradient: 'from-purple-500 to-purple-600',
                  bgColor: 'bg-purple-50 hover:bg-purple-100',
                  textColor: 'text-purple-700'
                },
                {
                  name: 'Fertigation',
                  path: 'fertigations',
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                  gradient: 'from-amber-500 to-amber-600',
                  bgColor: 'bg-amber-50 hover:bg-amber-100',
                  textColor: 'text-amber-700'
                },
                {
                  name: 'Worker Tasks',
                  path: 'worker-tasks',
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  gradient: 'from-orange-500 to-orange-600',
                  bgColor: 'bg-orange-50 hover:bg-orange-100',
                  textColor: 'text-orange-700'
                },
                {
                  name: 'Sales',
                  path: 'sales',
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-indigo-500 to-indigo-600',
                  bgColor: 'bg-indigo-50 hover:bg-indigo-100',
                  textColor: 'text-indigo-700'
                }
              ].map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(`/farm/${farmId}/${action.path}`)}
                  className={`group ${action.bgColor} rounded-lg border border-slate-200/60 hover:border-slate-300 hover:shadow-sm transition-all duration-200 hover:scale-[1.01] p-3`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-9 h-9 bg-gradient-to-br ${action.gradient} rounded-lg flex items-center justify-center shadow-sm`}>
                      <div className="text-white">
                        {action.icon}
                      </div>
                    </div>
                    <div className={`text-xs font-semibold ${action.textColor} text-center leading-tight`}>
                      {action.name}
                    </div>
                  </div>
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
            <div className="group relative overflow-hidden bg-gradient-to-r from-amber-50/90 to-orange-50/90 backdrop-blur-sm border border-amber-200/60 hover:border-amber-300/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 to-orange-100/30 opacity-50" />

              <div className="relative z-10 flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="text-lg font-bold text-amber-900">⚠️ Attention Required</h3>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    {stats.crops_needing_attention > 0 && (
                      <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl border border-amber-200/50">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800">
                            <span className="text-base font-bold">{stats.crops_needing_attention}</span> crop(s) need immediate attention
                          </p>
                          <p className="text-xs text-red-600">Check crop stages for issues</p>
                        </div>
                      </div>
                    )}
                    {stats.unread_notifications > 0 && (
                      <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl border border-amber-200/50">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-800">
                            <span className="text-base font-bold">{stats.unread_notifications}</span> unread notification(s)
                          </p>
                          <p className="text-xs text-blue-600">New updates available</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/farm/${farmId}/notifications`)}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    View All Notifications
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-2 right-2 w-20 h-20 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-300/20 to-orange-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default FarmDashboard;