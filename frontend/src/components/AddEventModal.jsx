import React, { useState, useEffect } from 'react';
import { farmAPI } from '../services/api';
import toast from 'react-hot-toast';

const AddEventModal = ({ isOpen, onClose, selectedDate, farmId, onEventCreated }) => {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'other',
    priority: 'medium',
    start_date: '',
    end_date: '',
    is_all_day: false,
    location: '',
    notify_before_minutes: 15,
    enable_notifications: true,
    notes: '',
    color: '#3B82F6',
    farm: farmId || ''
  });

  const eventTypes = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'planting', label: 'Planting' },
    { value: 'harvesting', label: 'Harvesting' },
    { value: 'spraying', label: 'Spraying' },
    { value: 'fertilizing', label: 'Fertilizing' },
    { value: 'irrigation', label: 'Irrigation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'training', label: 'Training' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchFarms();
      // Set default dates based on selected date
      if (selectedDate) {
        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);
        endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration

        setFormData(prev => ({
          ...prev,
          start_date: startDate.toISOString().slice(0, 16),
          end_date: endDate.toISOString().slice(0, 16)
        }));
      }
    }
  }, [isOpen, selectedDate]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getMyFarms();
      setFarms(response.data);
      if (!formData.farm && response.data.length > 0) {
        setFormData(prev => ({
          ...prev,
          farm: farmId || response.data[0].id
        }));
      }
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Failed to fetch farms');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Event title is required');
      return;
    }

    if (!formData.farm) {
      toast.error('Please select a farm');
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      await farmAPI.createCalendarEvent(eventData);
      toast.success('Event created successfully');
      onEventCreated && onEventCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'other',
      priority: 'medium',
      start_date: '',
      end_date: '',
      is_all_day: false,
      location: '',
      notify_before_minutes: 15,
      enable_notifications: true,
      notes: '',
      color: '#3B82F6',
      farm: farmId || ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add New Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Event Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Farm Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Farm *
            </label>
            <select
              name="farm"
              value={formData.farm}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Farm</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_all_day"
              checked={formData.is_all_day}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              All Day Event
            </label>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event location"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event description"
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="enable_notifications"
                checked={formData.enable_notifications}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Enable Notifications
              </label>
            </div>

            {formData.enable_notifications && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notify Before (minutes)
                </label>
                <input
                  type="number"
                  name="notify_before_minutes"
                  value={formData.notify_before_minutes}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventModal;