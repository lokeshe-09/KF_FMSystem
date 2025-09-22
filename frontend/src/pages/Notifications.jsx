import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Handle incoming WebSocket notifications
  const handleWebSocketMessage = useCallback((newNotification) => {
    setNotifications(prev => {
      const exists = prev.some(notif => notif.id === newNotification.id);
      if (exists) return prev;
      const updated = [newNotification, ...prev];

      // Show professional toast notification
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-md pointer-events-auto flex ring-1 ring-gray-200`}>
          <div className="flex-1 w-0 p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{newNotification.title}</p>
                <p className="mt-1 text-xs text-gray-600 truncate">{newNotification.message}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-md p-3 flex items-center justify-center text-xs font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      ), { duration: 4000 });

      return updated;
    });
  }, []);

  // WebSocket connection for real-time notifications
  useWebSocket(handleWebSocketMessage);

  // Fetch stored notifications from database
  const fetchStoredNotifications = async (showToast = true, preserveLocalState = false, silentRefresh = false) => {
    if (!silentRefresh) {
      setLoading(true);
      setApiError(null);
    }

    let scrollY = 0;
    if (silentRefresh) {
      scrollY = window.scrollY;
    }

    try {
      const response = await farmAPI.getNotifications();

      if (response.data && Array.isArray(response.data)) {
        const storedNotifications = response.data.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          timestamp: new Date(notification.created_at),
          read: notification.is_read,
          type: notification.notification_type || 'general',
          farm: notification.farm_name || 'System',
          user: notification.user_name || 'Unknown',
          priority: notification.priority || 'normal',
          source_farm: notification.source_farm,
          related_object_id: notification.related_object_id,
          tags: notification.tags || [],
          metadata: notification.metadata || {}
        }));

        if (!preserveLocalState) {
          setNotifications(storedNotifications);
        }

        if (showToast && !silentRefresh) {
          toast.success(`Loaded ${storedNotifications.length} notifications`, {
            duration: 3000,
            position: 'bottom-right',
            style: {
              background: '#f9fafb',
              color: '#374151',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          });
        }
      } else {
        console.warn('Unexpected response format:', response.data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setApiError(error.response?.data?.message || 'Failed to load notifications');

      if (showToast && !silentRefresh) {
        toast.error('Failed to load notifications', {
          style: {
            background: '#fef2f2',
            color: '#991b1b',
            borderRadius: '6px',
            border: '1px solid #fecaca'
          }
        });
      }
    } finally {
      setLoading(false);
      if (silentRefresh) {
        setTimeout(() => window.scrollTo(0, scrollY), 100);
      }
    }
  };

  useEffect(() => {
    fetchStoredNotifications();
  }, []);

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      if (filterType !== 'all' && notification.type !== filterType) return false;
      if (filterStatus === 'unread' && notification.read) return false;
      if (filterStatus === 'read' && !notification.read) return false;
      if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.timestamp) - new Date(a.timestamp);
        case 'oldest': return new Date(a.timestamp) - new Date(b.timestamp);
        case 'type': return a.type.localeCompare(b.type);
        case 'farm': return a.farm.localeCompare(b.farm);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, normal: 1, low: 0 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default: return 0;
      }
    });

  // Real-time analytics calculations
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    todayCount: notifications.filter(n => {
      const today = new Date();
      const notifDate = new Date(n.timestamp);
      return notifDate.toDateString() === today.toDateString();
    }).length,
    weeklyTrend: calculateWeeklyTrend(notifications),
    byType: notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {}),
    byPriority: notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {})
  };

  function calculateWeeklyTrend(notifications) {
    const last7Days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayNotifs = notifications.filter(n =>
        new Date(n.timestamp).toDateString() === date.toDateString()
      ).length;
      last7Days.push(dayNotifs);
    }

    return last7Days;
  }

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleSelectNotification = (id) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const markAsRead = async (notificationIds) => {
    try {
      await farmAPI.markNotificationsAsRead({ notification_ids: notificationIds });
      setNotifications(prev => prev.map(n =>
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      ));
      toast.success(`Marked ${notificationIds.length} notification(s) as read`, {
        style: {
          background: '#f0fdf4',
          color: '#166534',
          borderRadius: '6px',
          border: '1px solid #bbf7d0'
        }
      });
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const deleteNotifications = async (notificationIds) => {
    try {
      await farmAPI.deleteNotifications({ notification_ids: notificationIds });
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setSelectedNotifications(new Set());
      toast.success(`Deleted ${notificationIds.length} notification(s)`, {
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          borderRadius: '6px',
          border: '1px solid #fecaca'
        }
      });
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      daily_task: { icon: '📋', gradient: 'from-blue-400 to-blue-600' },
      system: { icon: '⚙️', gradient: 'from-gray-400 to-gray-600' },
      alert: { icon: '🚨', gradient: 'from-red-400 to-red-600' },
      info: { icon: 'ℹ️', gradient: 'from-cyan-400 to-cyan-600' },
      success: { icon: '✅', gradient: 'from-green-400 to-green-600' },
      warning: { icon: '⚠️', gradient: 'from-yellow-400 to-yellow-600' },
      general: { icon: '📢', gradient: 'from-purple-400 to-purple-600' }
    };
    return icons[type] || icons.general;
  };

  const getPriorityIndicator = (priority) => {
    const indicators = {
      high: { color: 'bg-red-500', pulse: 'animate-pulse', text: 'High Priority' },
      medium: { color: 'bg-yellow-500', pulse: '', text: 'Medium Priority' },
      normal: { color: 'bg-blue-500', pulse: '', text: 'Normal Priority' },
      low: { color: 'bg-gray-400', pulse: '', text: 'Low Priority' }
    };
    return indicators[priority] || indicators.normal;
  };

  const MiniChart = ({ data, color = '#6b7280' }) => (
    <div className="flex items-end space-x-0.5 h-6">
      {data.map((value, index) => (
        <div
          key={index}
          className="w-1 bg-gray-300 rounded-sm transition-all duration-200"
          style={{
            height: `${Math.max(2, (value / Math.max(...data, 1)) * 20)}px`,
            backgroundColor: value > 0 ? color : '#e5e7eb'
          }}
          title={`Day ${index + 1}: ${value} notifications`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-green-50/40 via-blue-50/30 to-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              {/* Premium Header skeleton */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-emerald-300 rounded-2xl shadow-lg"></div>
                  <div className="space-y-3">
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-80"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-60"></div>
                  </div>
                </div>
              </div>

              {/* Premium Stats skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-2xl p-6 border border-gray-200/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24"></div>
                        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-16"></div>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-200 to-blue-300 rounded-xl shadow-lg"></div>
                    </div>
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                  </div>
                ))}
              </div>

              {/* Premium Notifications skeleton */}
              <div className="space-y-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-200/50">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl shadow-lg"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"></div>
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/40 via-blue-50/30 to-slate-50">
        {/* Premium Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Notification Center</h1>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-600">
                        {stats.unread} unread • {stats.total} total notifications
                      </span>
                      {stats.unread > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm">
                          <div className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse"></div>
                          Live Updates
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Premium Search */}
                  <div className="relative hidden sm:block">
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-72 pl-10 pr-4 py-3 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white/80 backdrop-blur-sm text-sm placeholder-gray-500 shadow-sm transition-all duration-200 hover:shadow-md"
                    />
                    <div className="absolute left-3 top-3">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-3 p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Premium Action Buttons */}
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`inline-flex items-center px-4 py-2.5 border text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md hover:scale-105 ${
                      showAnalytics
                        ? 'border-green-300 text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm'
                        : 'border-gray-300 text-gray-700 bg-white/80 backdrop-blur-sm hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </button>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center px-4 py-2.5 border text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md hover:scale-105 ${
                      showFilters
                        ? 'border-blue-300 text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm'
                        : 'border-gray-300 text-gray-700 bg-white/80 backdrop-blur-sm hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                    </svg>
                    Filters
                  </button>

                  <button
                    onClick={() => fetchStoredNotifications()}
                    className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-xl text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Premium Filters Panel */}
              <div className={`transition-all duration-500 ease-out ${showFilters ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="bg-gradient-to-br from-white/90 to-gray-50/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                      </div>
                      Advanced Filters
                    </h3>
                    <button
                      onClick={() => {
                        setFilterType('all');
                        setFilterStatus('all');
                        setSortBy('newest');
                        setSearchQuery('');
                      }}
                      className="text-sm font-medium text-gray-500 hover:text-red-600 transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:scale-105"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Enhanced Type Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Notification Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 text-sm shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 font-medium"
                      >
                        <option value="all">All Types</option>
                        <option value="daily_task">Daily Tasks</option>
                        <option value="system">System</option>
                        <option value="alert">Alerts</option>
                        <option value="info">Information</option>
                        <option value="success">Success</option>
                        <option value="warning">Warnings</option>
                      </select>
                    </div>

                    {/* Enhanced Status Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Read Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/90 text-sm shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 font-medium"
                      >
                        <option value="all">All Status</option>
                        <option value="unread">Unread Only</option>
                        <option value="read">Read Only</option>
                      </select>
                    </div>

                    {/* Enhanced Sort Options */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Sort Order</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/90 text-sm shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 font-medium"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="priority">By Priority</option>
                        <option value="type">By Type</option>
                        <option value="farm">By Farm</option>
                      </select>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Quick Actions</label>
                      <div className="space-y-2">
                        <button
                          onClick={() => markAsRead(filteredNotifications.filter(n => !n.read).map(n => n.id))}
                          disabled={stats.unread === 0}
                          className="w-full px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Mark All Read
                        </button>
                        <button
                          onClick={() => setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)))}
                          className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Premium Analytics Dashboard */}
          {showAnalytics && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Analytics Overview</h2>
                  <p className="text-sm text-gray-600">Real-time insights and performance metrics</p>
                </div>
                <div className="text-sm font-medium text-gray-500 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Total Notifications Card */}
                <div className="group bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border border-gray-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Total Notifications</p>
                      <p className="text-4xl font-bold text-gray-900 mb-1">{stats.total}</p>
                      <p className="text-xs text-gray-500">All time count</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500">Last 7 days trend</div>
                    <MiniChart data={stats.weeklyTrend} color="#3b82f6" />
                  </div>
                </div>

                {/* Unread Notifications Card */}
                <div className="group bg-gradient-to-br from-white to-orange-50/30 rounded-2xl border border-orange-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Unread Messages</p>
                      <p className="text-4xl font-bold text-orange-600 mb-1">{stats.unread}</p>
                      <p className="text-xs text-orange-500">Requires attention</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500">Priority breakdown</div>
                    <div className="flex space-x-1">
                      {Object.entries(stats.byPriority).map(([priority, count]) => (
                        <div
                          key={priority}
                          className="w-1.5 h-4 rounded-full shadow-sm transition-transform hover:scale-110"
                          style={{
                            height: `${Math.max(6, (count / Math.max(stats.total, 1)) * 16 + 4)}px`,
                            background: priority === 'high' ? 'linear-gradient(to top, #ef4444, #dc2626)' : priority === 'medium' ? 'linear-gradient(to top, #f59e0b, #d97706)' : priority === 'normal' ? 'linear-gradient(to top, #3b82f6, #2563eb)' : 'linear-gradient(to top, #6b7280, #4b5563)'
                          }}
                          title={`${priority}: ${count}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Today's Activity Card */}
                <div className="group bg-gradient-to-br from-white to-green-50/30 rounded-2xl border border-green-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Today's Activity</p>
                      <p className="text-4xl font-bold text-green-600 mb-1">{stats.todayCount}</p>
                      <p className="text-xs text-green-500">Fresh notifications</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500">Current date</div>
                    <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className="group bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl border border-indigo-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">Quick Actions</p>
                      <div className="space-y-3">
                        <button
                          onClick={() => markAsRead(filteredNotifications.filter(n => !n.read).map(n => n.id))}
                          disabled={stats.unread === 0}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm"
                        >
                          Mark All Read
                        </button>
                        <button
                          onClick={() => setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)))}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 hover:scale-105 shadow-sm"
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Floating Bulk Actions */}
          {selectedNotifications.size > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-max">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-medium">
                      {selectedNotifications.size}
                    </div>
                    <span>selected</span>
                  </div>

                  <div className="h-6 w-px bg-gray-300"></div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => markAsRead(Array.from(selectedNotifications))}
                      className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Read
                    </button>

                    <button
                      onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                      className="inline-flex items-center px-3 py-1.5 bg-red-600 border border-transparent rounded text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>

                    <button
                      onClick={() => setSelectedNotifications(new Set())}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Premium Notifications List */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-white/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-xl font-bold text-gray-900">Recent Notifications</h3>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
                    {filteredNotifications.length}
                  </span>
                  {searchQuery && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm">
                      Search: "{searchQuery}"
                    </span>
                  )}
                  {(filterType !== 'all' || filterStatus !== 'all') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm">
                      Filtered
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                    onChange={handleSelectAll}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg transition-all duration-200 hover:scale-110"
                  />
                  <label className="text-sm font-medium text-gray-700">Select All</label>
                </div>
              </div>
            </div>

            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">No notifications found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
                  {searchQuery
                    ? `No notifications match "${searchQuery}". Try adjusting your search terms or filters.`
                    : 'No notifications match your current filters. Try adjusting your filter settings or check back later.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Search
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterStatus('all');
                      setSortBy('newest');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification, index) => {
                  const typeInfo = getTypeIcon(notification.type);
                  const priorityInfo = getPriorityIndicator(notification.priority);
                  const isExpanded = expandedNotification === notification.id;

                  return (
                    <div
                      key={notification.id}
                      className={`group relative p-6 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-white transition-all duration-300 border-l-4 hover:shadow-lg hover:scale-[1.01] ${
                        priorityInfo.color.replace('bg-', 'border-')
                      } ${!notification.read ? 'bg-gradient-to-r from-blue-50/40 to-white/60' : ''} ${
                        selectedNotifications.has(notification.id) ? 'bg-gradient-to-r from-blue-50/60 to-indigo-50/40 shadow-md' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.has(notification.id)}
                          onChange={() => handleSelectNotification(notification.id)}
                          className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg transition-all duration-200 hover:scale-110"
                        />

                        <div className="relative w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                          </svg>
                          {!notification.read && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg animate-pulse"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm animate-pulse">
                                    NEW
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                                  notification.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                                  notification.priority === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                                  notification.priority === 'normal' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                                  'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                                }`}>
                                  {notification.priority}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                                  notification.type === 'daily_task' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' :
                                  notification.type === 'system' ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white' :
                                  notification.type === 'alert' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                                  notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                                  notification.type === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                                  'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                                }`}>
                                  {notification.type.replace('_', ' ')}
                                </span>
                              </div>

                              <p className={`text-sm text-gray-700 leading-relaxed font-medium ${
                                isExpanded ? '' : 'line-clamp-2'
                              }`}>
                                {notification.message}
                              </p>

                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-4">
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{new Date(notification.timestamp).toLocaleDateString()}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span>{notification.farm}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>{notification.user}</span>
                                  </span>
                                </div>
                                <button
                                  onClick={() => setExpandedNotification(isExpanded ? null : notification.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
                                >
                                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-3">
                              <button
                                onClick={() => markAsRead([notification.id])}
                                className="text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 transition-all duration-200 p-2 rounded-xl hover:shadow-lg hover:scale-110"
                                title="Mark as read"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteNotifications([notification.id])}
                                className="text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 p-2 rounded-xl hover:shadow-lg hover:scale-110"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Compact Error State */}
            {apiError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-red-800">Unable to load notifications</h3>
                    <div className="mt-1 text-xs text-red-700">
                      <p>{apiError}</p>
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={() => fetchStoredNotifications()}
                        className="inline-flex items-center px-3 py-1.5 bg-red-600 border border-transparent rounded-lg text-xs font-medium text-white hover:bg-red-700 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </Layout>
  );
};

export default Notifications;