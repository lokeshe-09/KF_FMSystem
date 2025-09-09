import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Handle incoming WebSocket notifications
  const handleWebSocketMessage = useCallback((newNotification) => {
    setNotifications(prev => {
      // Check if notification already exists to avoid duplicates
      const exists = prev.some(notif => notif.id === newNotification.id);
      if (exists) {
        return prev;
      }
      const updated = [newNotification, ...prev];
      return updated;
    });
  }, []);

  // WebSocket connection
  const { connectionStatus } = useWebSocket(handleWebSocketMessage);

  // Fetch stored notifications from database
  const fetchStoredNotifications = async (showToast = true, preserveLocalState = false, silentRefresh = false) => {
    if (!silentRefresh) {
      setLoading(true);
      setApiError(null);
    }
    
    // Preserve scroll position for silent refresh
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
          type: notification.notification_type,
          farm_name: notification.farm_name,
          user_name: notification.user_full_name || notification.user_name,
          isStored: true
        }));
        
        
        if (preserveLocalState) {
          // Preserve local read states when refreshing
          setNotifications(prev => {
            const localReadIds = new Set(prev.filter(n => n.read).map(n => n.id));
            return storedNotifications.map(notification => ({
              ...notification,
              read: localReadIds.has(notification.id) || notification.read
            }));
          });
        } else {
          setNotifications(storedNotifications);
        }
        if (showToast && storedNotifications.length > 0) {
          toast.success(`Loaded ${storedNotifications.length} notifications`);
        }
      } else {
        setNotifications([]);
        setApiError('Invalid data format received');
      }
      if (!silentRefresh) {
        setLoading(false);
      } else {
        // Restore scroll position after silent refresh
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
      }
    } catch (error) {
      console.error('Error fetching stored notifications:', error);
      
      let errorMessage = 'Failed to load notifications';
      
      // Check if it's a 404 error (URL not found)
      if (error.response && error.response.status === 404) {
        errorMessage = 'Server needs restart - notifications endpoint not found';
        if (!silentRefresh) setApiError('endpoint_not_found');
        if (showToast) toast.error('Please restart your Django server to enable notifications.');
      } else if (error.response && error.response.status === 401) {
        errorMessage = 'Authentication failed';
        if (!silentRefresh) setApiError('auth_failed');
        if (showToast) toast.error('Please login again');
      } else {
        if (!silentRefresh) setApiError('network_error');
        if (showToast) toast.error('Network error loading notifications');
      }
      
      if (!silentRefresh) {
        setNotifications([]);
        setLoading(false);
      } else {
        // Restore scroll position after silent refresh (error case)
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
      }
    }
  };

  useEffect(() => {
    
    // Fetch stored notifications
    fetchStoredNotifications();
    
    // Auto-refresh notifications every 30 seconds as backup
    const refreshInterval = setInterval(() => {
      fetchStoredNotifications(false, true, true); // Silent refresh: no toast, preserve state, no loading
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []); // Empty dependency array ensures this runs only once

  const markAsRead = async (id) => {
    // Update local state immediately
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    // Update on server
    try {
      await farmAPI.markNotificationsAsRead({ notification_ids: [id] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification status');
    }
  };

  const markAllAsRead = async () => {
    // Update local state
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    
    // Update stored notifications on server
    try {
      await farmAPI.markNotificationsAsRead({});
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notification status');
    }
  };

  const deleteNotifications = async (notificationIds = null) => {
    const isDeleteAll = !notificationIds;
    const confirmMessage = isDeleteAll 
      ? 'Are you sure you want to delete ALL notifications? This action cannot be undone.'
      : `Are you sure you want to delete ${notificationIds.length} notification(s)? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      if (isDeleteAll) {
        try {
          const response = await farmAPI.deleteNotifications({});
          setNotifications([]);
          toast.success(response.data.message);
        } catch (error) {
          console.error('Error deleting all notifications:', error);
          toast.error('Failed to delete notifications');
        }
      } else {
        // Delete notifications from database
        try {
          const response = await farmAPI.deleteNotifications({ notification_ids: notificationIds });
          setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
          toast.success(`${notificationIds.length} notification(s) deleted`);
        } catch (error) {
          console.error('Error deleting notifications:', error);
          toast.error('Failed to delete notifications');
        }
      }
    }
  };

  const deleteNotification = (id) => {
    deleteNotifications([id]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="card p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
                <p className="text-slate-600 font-medium">
                  Real-time updates when farm users submit daily tasks
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {notifications.some(n => !n.read) && (
                <button
                  onClick={markAllAsRead}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => deleteNotifications()}
                  className="inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 border-0 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Total Notifications */}
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Total Notifications
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{notifications.length}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-blue-50 px-2 py-1 rounded-full">
                All Time
              </div>
            </div>
          </div>

          {/* Unread Notifications */}
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Unread
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{unreadCount}</p>
                </div>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                unreadCount > 0 
                  ? 'text-amber-700 bg-amber-100' 
                  : 'text-slate-500 bg-slate-100'
              }`}>
                {unreadCount > 0 ? 'Attention' : 'All Read'}
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ${
                  connectionStatus === 'connected' 
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500' 
                    : connectionStatus === 'connecting' 
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500' 
                    : 'bg-gradient-to-br from-red-400 to-rose-500'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Real-time Status
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    connectionStatus === 'connected' ? 'text-emerald-600' : 
                    connectionStatus === 'connecting' ? 'text-amber-600' : 
                    'text-red-600'
                  }`}>
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 
                     'Disconnected'}
                  </p>
                </div>
              </div>
              <div className={`flex items-center space-x-2 text-xs font-medium px-2 py-1 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'text-emerald-700 bg-emerald-100' 
                  : connectionStatus === 'connecting' 
                  ? 'text-amber-700 bg-amber-100' 
                  : 'text-red-700 bg-red-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 
                  'bg-red-500'
                }`}></div>
                Live
              </div>
            </div>
          </div>
        </div>

        {/* Error Message and Retry */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {apiError === 'endpoint_not_found' && 'Server Restart Required'}
                    {apiError === 'auth_failed' && 'Authentication Failed'}
                    {apiError === 'network_error' && 'Network Error'}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {apiError === 'endpoint_not_found' && (
                      <p>The notifications API endpoint is not available. Please restart your Django server to load the new URL configuration.</p>
                    )}
                    {apiError === 'auth_failed' && (
                      <p>Your session has expired. Please refresh the page and login again.</p>
                    )}
                    {apiError === 'network_error' && (
                      <p>Unable to connect to the server. Please check your connection and try again.</p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => fetchStoredNotifications(true)}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="card">
          <div className="px-8 py-6 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Recent Notifications</h3>
                  <p className="text-sm text-slate-500">Latest activity from your farm users</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="loading-spinner mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl mx-auto flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">No notifications yet</h4>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  You'll receive notifications here when farm users submit their daily tasks. 
                  Real-time updates will appear automatically.
                </p>
                <div className="inline-flex items-center space-x-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">System is ready and listening</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                      notification.read 
                        ? 'border-slate-200 bg-white hover:bg-slate-50/50' 
                        : 'border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 shadow-lg shadow-emerald-100/50'
                    }`}
                  >
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500"></div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start space-x-4">
                            {!notification.read && (
                              <div className="flex-shrink-0 mt-2">
                                <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              {notification.title && (
                                <h4 className={`text-base font-semibold mb-1 ${
                                  notification.read ? 'text-slate-700' : 'text-slate-900'
                                }`}>
                                  {notification.title}
                                </h4>
                              )}
                              
                              <p className={`text-sm leading-relaxed mb-3 ${
                                notification.read ? 'text-slate-600' : 'text-slate-700'
                              }`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center flex-wrap gap-3 text-xs">
                                <div className="flex items-center space-x-2 text-slate-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium">
                                    {notification.timestamp.toLocaleString()}
                                  </span>
                                </div>
                                
                                {notification.farm_name && (
                                  <div className="flex items-center space-x-2 text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <span className="font-medium">{notification.farm_name}</span>
                                  </div>
                                )}
                                
                                {notification.user_name && (
                                  <div className="flex items-center space-x-2 text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="font-medium">{notification.user_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 ml-4">
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors duration-200"
                                title="Mark as read"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200"
                              title="Delete notification"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
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

export default Notifications;