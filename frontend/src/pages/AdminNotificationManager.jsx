import React, { useState, useEffect } from 'react';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const AdminNotificationManager = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState('');
  
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    notification_type: 'admin_message',
    priority: 'medium',
    is_farm_wide: true,
    user_ids: [],
    due_date: '',
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const response = await farmAPI.getAdminNotifications();
      setFarms(response.data.farms || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch farm data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotificationForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUserSelection = (userId) => {
    setNotificationForm(prev => ({
      ...prev,
      user_ids: prev.user_ids.includes(userId)
        ? prev.user_ids.filter(id => id !== userId)
        : [...prev.user_ids, userId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFarm) {
      toast.error('Please select a farm');
      return;
    }

    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }

    setSending(true);
    try {
      const notificationData = {
        ...notificationForm,
        farm_id: parseInt(selectedFarm),
      };

      await farmAPI.sendAdminNotification(notificationData);
      toast.success('Notification sent successfully!');
      
      // Reset form
      setNotificationForm({
        title: '',
        message: '',
        notification_type: 'admin_message',
        priority: 'medium',
        is_farm_wide: true,
        user_ids: [],
        due_date: '',
      });
      
      // Refresh data to show the new notification
      fetchAdminData();
    } catch (error) {
      console.error('Error sending notification:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send notification';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const getSelectedFarm = () => {
    return farms.find(farm => farm.id === parseInt(selectedFarm));
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
          <h1 className="text-2xl font-bold text-gray-900">Admin Notification Manager</h1>
          <p className="text-gray-600 mt-1">
            Send notifications to your farm users with complete farm isolation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Send Notification</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Farm Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Farm *
                </label>
                <select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a farm...</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.location} ({farm.users.length} users)
                    </option>
                  ))}
                </select>
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Type
                </label>
                <select
                  name="notification_type"
                  value={notificationForm.notification_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="admin_message">Admin Message</option>
                  <option value="farm_announcement">Farm Announcement</option>
                  <option value="task_reminder">Task Reminder</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={notificationForm.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Farm-wide toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_farm_wide"
                  checked={notificationForm.is_farm_wide}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Send to all farm users (farm-wide announcement)
                </label>
              </div>

              {/* User Selection (if not farm-wide) */}
              {!notificationForm.is_farm_wide && selectedFarm && getSelectedFarm() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Users
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                    {getSelectedFarm().users.length === 0 ? (
                      <p className="text-sm text-gray-500">No users assigned to this farm</p>
                    ) : (
                      getSelectedFarm().users.map((user) => (
                        <div key={user.id} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={notificationForm.user_ids.includes(user.id)}
                            onChange={() => handleUserSelection(user.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-700">
                            {user.username} {user.full_name && `(${user.full_name})`}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={notificationForm.title}
                  onChange={handleInputChange}
                  placeholder="Enter notification title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={notificationForm.message}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Enter your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="due_date"
                  value={notificationForm.due_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>

          {/* Farm Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Farms</h2>
            
            {farms.length === 0 ? (
              <p className="text-gray-500">No farms found. Create a farm first to send notifications.</p>
            ) : (
              <div className="space-y-4">
                {farms.map((farm) => (
                  <div key={farm.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{farm.name}</h3>
                        <p className="text-sm text-gray-600">{farm.location}</p>
                        <p className="text-sm text-gray-500">{farm.users.length} assigned users</p>
                      </div>
                      <button
                        onClick={() => setSelectedFarm(farm.id.toString())}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Select
                      </button>
                    </div>
                    
                    {/* Recent Notifications */}
                    {farm.recent_notifications.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Recent Notifications
                        </h4>
                        <div className="space-y-1">
                          {farm.recent_notifications.slice(0, 3).map((notif) => (
                            <div key={notif.id} className="text-xs text-gray-600">
                              <span className="font-medium">{notif.title}</span>
                              <span className="text-gray-500 ml-2">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Farm-Specific Notification System</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Farm-wide notifications reach all users assigned to the selected farm</li>
                  <li>User-specific notifications are private and only visible to selected users</li>
                  <li>All notifications are completely isolated by farm - no cross-farm visibility</li>
                  <li>High priority notifications appear at the top of user notification lists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminNotificationManager;