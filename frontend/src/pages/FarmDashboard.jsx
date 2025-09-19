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

  const StatCard = ({ title, value, icon, color = "blue", onClick = null }) => (
    <div 
      className={`bg-white rounded-lg shadow p-4 sm:p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-md bg-${color}-100`}>
          {icon}
        </div>
        <div className="ml-3 sm:ml-4">
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const ActivityCard = ({ title, activities, emptyMessage }) => (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">{title}</h3>
      {activities.length === 0 ? (
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 3).map((activity, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {activity.crop_zone_name || activity.activity_type || activity.title}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.created_at || activity.date_time || activity.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-xs text-gray-500">
                {activity.status || activity.ec_change ? `EC: ${activity.ec_change}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!dashboard) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Farm not found</h2>
          <button 
            onClick={() => navigate('/my-farms')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to My Farms
          </button>
        </div>
      </Layout>
    );
  }

  const { farm, stats, recent_activities } = dashboard;

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Farm Header */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => navigate('/my-farms')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{farm.name}</h1>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {farm.location}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {farm.size_in_acres} acres
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="w-3 h-3 bg-green-400 rounded-full mb-1"></div>
              <span className="text-xs text-gray-500">Active</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Today's Tasks"
            value={stats.today_tasks_completed}
            color="green"
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            onClick={() => navigate(`/farm/${farmId}/daily-tasks`)}
          />
          
          <StatCard
            title="This Month's Tasks"
            value={stats.total_tasks_this_month}
            color="blue"
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />

          <StatCard
            title="Crop Stages"
            value={`${stats.total_crop_stages} (${stats.healthy_crops} healthy)`}
            color="purple"
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            onClick={() => navigate(`/farm/${farmId}/crop-stages`)}
          />

          <StatCard
            title="Worker Tasks"
            value={`${stats.pending_worker_tasks} pending`}
            color="orange"
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            onClick={() => navigate(`/farm/${farmId}/worker-tasks`)}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { name: 'Daily Tasks', path: 'daily-tasks', icon: '📋', color: 'bg-blue-100 text-blue-700' },
              { name: 'Crop Stages', path: 'crop-stages', icon: '🌱', color: 'bg-green-100 text-green-700' },
              { name: 'Spray Schedule', path: 'spray-schedules', icon: '💧', color: 'bg-purple-100 text-purple-700' },
              { name: 'Fertigation', path: 'fertigations', icon: '🧪', color: 'bg-yellow-100 text-yellow-700' },
              { name: 'Workers', path: 'workers', icon: '👷', color: 'bg-orange-100 text-orange-700' },
              { name: 'Sales', path: 'sales', icon: '💰', color: 'bg-indigo-100 text-indigo-700' }
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(`/farm/${farmId}/${action.path}`)}
                className={`p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${action.color}`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{action.icon}</div>
                <div className="text-xs sm:text-sm font-medium">{action.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ActivityCard
            title="Recent Spray/Irrigation Logs"
            activities={recent_activities.spray_logs || []}
            emptyMessage="No recent spray or irrigation activities"
          />
          
          <ActivityCard
            title="Recent Fertigations"
            activities={recent_activities.fertigations || []}
            emptyMessage="No recent fertigation activities"
          />
        </div>

        {/* Alerts */}
        {(stats.crops_needing_attention > 0 || stats.unread_notifications > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm sm:text-base font-medium text-yellow-800">Attention Required</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {stats.crops_needing_attention > 0 && (
                      <li>{stats.crops_needing_attention} crop(s) need attention</li>
                    )}
                    {stats.unread_notifications > 0 && (
                      <li>{stats.unread_notifications} unread notification(s)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FarmDashboard;