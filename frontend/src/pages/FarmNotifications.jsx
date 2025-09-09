import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import toast from 'react-hot-toast';

const FarmNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, harvest, tasks

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await farmAPI.getNotifications();
      if (response.data && Array.isArray(response.data)) {
        const userNotifications = response.data.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          timestamp: new Date(notification.created_at),
          read: notification.is_read,
          type: notification.notification_type,
          farm_name: notification.farm_name,
          priority: getPriority(notification.notification_type, notification.created_at),
          daysUntil: getDaysUntil(notification.notification_type, notification.message)
        }));
        
        // Sort by priority and timestamp
        userNotifications.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return b.timestamp - a.timestamp;
        });
        
        setNotifications(userNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (error.response?.status === 404) {
        setNotifications([]);
      } else {
        setNotifications([]);
      }
    }
    setLoading(false);
  };

  const getPriority = (type, createdAt) => {
    const daysSince = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    
    if (type === 'fertigation_overdue') return 1; // Highest priority
    if (type === 'harvest_overdue') return 1;
    if (type === 'fertigation_due') return 2;
    if (type === 'harvest_due') return 2;
    if (type === 'harvest_approaching') return 3;
    if (type === 'daily_task' && daysSince > 1) return 4; // Overdue daily tasks
    if (type === 'daily_task') return 5;
    return 6; // General notifications
  };

  const getDaysUntil = (type, message) => {
    if (type.includes('harvest')) {
      const match = message.match(/(\d+) days?/);
      if (match) {
        const days = parseInt(match[1]);
        if (type === 'harvest_overdue') return -days;
        return days;
      }
    }
    return null;
  };

  const markAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    try {
      await farmAPI.markNotificationsAsRead({ notification_ids: [id] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    
    try {
      await farmAPI.markNotificationsAsRead({});
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await farmAPI.deleteNotifications({ notification_ids: [id] });
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Notification deleted');
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'fertigation_overdue':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
            </svg>
          </div>
        );
      case 'fertigation_due':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
            </svg>
          </div>
        );
      case 'harvest_overdue':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'harvest_due':
        return (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'harvest_approaching':
        return (
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        );
      case 'daily_task':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
            </svg>
          </div>
        );
    }
  };

  const getPriorityBadge = (priority, type, daysUntil) => {
    if (type === 'fertigation_overdue') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
    }
    if (type === 'fertigation_due') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Due Now</span>;
    }
    if (type === 'harvest_overdue') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
    }
    if (type === 'harvest_due') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Due Now</span>;
    }
    if (type === 'harvest_approaching' && daysUntil !== null) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{daysUntil} days</span>;
    }
    if (priority <= 4) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Task</span>;
    }
    return null;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'due') return notification.type.includes('_due') || notification.type.includes('_overdue');
    if (filter === 'fertigation') return notification.type.includes('fertigation');
    if (filter === 'harvest') return notification.type.includes('harvest');
    if (filter === 'tasks') return notification.type === 'daily_task';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const dueCount = notifications.filter(n => (n.type.includes('_due') || n.type.includes('_overdue')) && !n.read).length;
  const fertigationCount = notifications.filter(n => n.type.includes('fertigation')).length;
  const harvestCount = notifications.filter(n => n.type.includes('harvest')).length;
  const taskCount = notifications.filter(n => n.type === 'daily_task').length;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">My Notifications</h1>
                      <p className="text-slate-600 mt-1">Stay updated on your farm activities and important reminders</p>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 mt-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {notifications.filter(n => n.priority <= 2).length} Urgent
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {unreadCount} Unread
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {notifications.length} Total
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 lg:mt-0 flex flex-wrap gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark All Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'unread', label: 'Unread', count: unreadCount },
                  { key: 'due', label: 'Due', count: dueCount },
                  { key: 'fertigation', label: 'Fertigation', count: fertigationCount },
                  { key: 'harvest', label: 'Harvest', count: harvestCount },
                  { key: 'tasks', label: 'Tasks', count: taskCount }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      filter === key
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        filter === key
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-slate-200/60">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {filter === 'all' ? 'All Notifications' : 
                 filter === 'unread' ? 'Unread Notifications' :
                 filter === 'harvest' ? 'Harvest Reminders' : 'Task Notifications'} 
                ({filteredNotifications.length})
              </h2>
            </div>
            
            <div className="p-8">
              {loading ? (
                <div className="text-center py-16">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-blue-700 font-medium text-lg">Loading notifications...</span>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    {filter === 'all' ? 'No notifications yet' :
                     filter === 'unread' ? 'All caught up!' :
                     filter === 'harvest' ? 'No harvest reminders' : 'No task notifications'}
                  </h3>
                  <p className="text-slate-500">
                    {filter === 'all' ? 'You\'ll receive notifications about your farm activities here.' :
                     filter === 'unread' ? 'You\'ve read all your notifications.' :
                     filter === 'harvest' ? 'No harvest dates are approaching.' : 'No task notifications at this time.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
                        notification.read 
                          ? 'border-slate-200 bg-white hover:bg-slate-50/50' 
                          : notification.priority <= 2
                          ? 'border-red-200 bg-gradient-to-r from-red-50/50 to-orange-50/50 shadow-lg shadow-red-100/50'
                          : 'border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-lg shadow-blue-100/50'
                      }`}
                    >
                      {!notification.read && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          notification.priority <= 2 ? 'bg-gradient-to-b from-red-400 to-orange-500' : 'bg-gradient-to-b from-blue-400 to-indigo-500'
                        }`}></div>
                      )}
                      
                      <div className="p-6">
                        <div className="flex items-start space-x-4">
                          {getNotificationIcon(notification.type)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {notification.title && (
                                  <h4 className={`text-lg font-semibold mb-1 ${
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
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                {getPriorityBadge(notification.priority, notification.type, notification.daysUntil)}
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  {!notification.read && (
                                    <button
                                      onClick={() => markAsRead(notification.id)}
                                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200"
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
                            
                            <div className="flex items-center flex-wrap gap-4 text-xs text-slate-500">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{notification.timestamp.toLocaleString()}</span>
                              </div>
                              
                              {notification.farm_name && (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                  <span className="font-medium">{notification.farm_name}</span>
                                </div>
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FarmNotifications;