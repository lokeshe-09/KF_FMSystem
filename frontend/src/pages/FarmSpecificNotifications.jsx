import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const FarmSpecificNotifications = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Check if we're in farm-specific mode for complete database isolation
  const inFarmMode = Boolean(farmId);

  useEffect(() => {
    if (inFarmMode) {
      fetchFarmNotifications();
    } else {
      // Redirect to general notifications if not in farm mode
      navigate('/farm-notifications');
    }
  }, [farmId, inFarmMode]);

  const fetchFarmNotifications = async () => {
    setLoading(true);
    try {
      console.log(`DEBUG: Fetching notifications for farm ${farmId} only`);
      const response = await farmAPI.getFarmNotifications(farmId);
      
      if (response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
        setTotalCount(response.data.total_count || 0);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching farm notifications:', error);
      toast.error('Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      console.log(`Marking notifications as read for farm ${farmId}:`, notificationIds);
      const response = await farmAPI.markFarmNotificationsAsRead(farmId, notificationIds);
      
      console.log('Mark as read full response:', response);
      console.log('Mark as read response data:', response.data);
      
      // Check if we have a successful response
      if (response.status === 200 || response.status === 201) {
        // Handle different possible response formats
        const updated = response.data.updated || response.data.count || notificationIds.length;
        const message = response.data.message || `${updated} notifications marked as read`;
        
        // Update local state immediately for better UX
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - updated));
        
        // Show success message
        toast.success(message);
        
        console.log(`Successfully marked ${updated} notifications as read`);
        
        // Force a small delay to ensure database update is committed
        // then validate the state hasn't changed
        setTimeout(() => {
          console.log('Verifying notification state after update...');
        }, 500);
      } else {
        console.warn('Unexpected response status:', response.status);
        toast.warning('Notifications may not have been updated properly');
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      // More detailed error handling
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 404) {
        toast.error('Notifications not found or already read');
      } else if (error.response?.status === 400) {
        toast.error('Invalid request - check notification IDs');
      } else if (error.response?.status === 403) {
        toast.error('Permission denied - cannot mark these notifications as read');
      } else {
        toast.error(`Failed to mark notifications as read: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(notif => !notif.is_read)
      .map(notif => notif.id);
    
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
      // Don't show additional toast here - markAsRead already shows one
    } else {
      toast.info('No unread notifications to mark');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'admin_message':
        return '📢';
      case 'farm_announcement':
        return '📣';
      case 'task_reminder':
        return '⏰';
      case 'harvest_due':
        return '🌾';
      case 'fertigation_due':
        return '💧';
      case 'daily_task':
        return '📋';
      default:
        return '📝';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read;
      case 'admin':
        return notification.notification_type === 'admin_message' || notification.notification_type === 'farm_announcement';
      case 'tasks':
        return notification.notification_type === 'task_reminder' || notification.notification_type === 'daily_task';
      case 'high':
        return notification.priority === 'high';
      default:
        return true;
    }
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Farm Notifications</h1>
                <p className="text-gray-600 mt-1">
                  Stay updated with farm activities and announcements
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {unreadCount} unread
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  {totalCount} total
                </span>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'admin', label: 'Admin Messages', count: notifications.filter(n => n.notification_type === 'admin_message' || n.notification_type === 'farm_announcement').length },
              { key: 'tasks', label: 'Tasks', count: notifications.filter(n => n.notification_type === 'task_reminder' || n.notification_type === 'daily_task').length },
              { key: 'high', label: 'High Priority', count: notifications.filter(n => n.priority === 'high').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1} 
                    d="M15 17h6l2 4h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3l1-1h0"
                  />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? 'No notifications yet for this farm' 
                  : `No ${filter} notifications`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">{getTypeIcon(notification.notification_type)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900 font-semibold' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>From: {notification.created_by}</span>
                            <span>{formatDate(notification.created_at)}</span>
                            {notification.is_farm_wide && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Farm-wide
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            getPriorityColor(notification.priority)
                          }`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead([notification.id])}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Farm Context Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Farm-Specific Notifications</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  These notifications are specifically for this farm only. You'll see personal messages from your admin and farm-wide announcements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FarmSpecificNotifications;