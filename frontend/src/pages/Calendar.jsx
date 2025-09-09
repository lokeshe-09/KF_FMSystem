import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import toast from 'react-hot-toast';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cropStages, setCropStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [harvestEvents, setHarvestEvents] = useState({});

  useEffect(() => {
    fetchCropStages();
  }, []);

  const fetchCropStages = async () => {
    try {
      setLoading(true);
      const response = await farmAPI.getCropStages();
      setCropStages(response.data);
      
      // Create harvest events map
      const events = {};
      response.data.forEach(crop => {
        if (crop.expected_harvest_date) {
          const dateKey = crop.expected_harvest_date;
          if (!events[dateKey]) {
            events[dateKey] = [];
          }
          events[dateKey].push(crop);
        }
      });
      setHarvestEvents(events);
    } catch (error) {
      console.error('Error fetching crop stages:', error);
      toast.error('Failed to load harvest calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-IN', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return date.toDateString() === todayIST.toDateString();
  };

  const hasHarvestEvent = (date) => {
    if (!date) return false;
    const dateKey = formatDate(date);
    return harvestEvents[dateKey] && harvestEvents[dateKey].length > 0;
  };

  const getHarvestEvents = (date) => {
    if (!date) return [];
    const dateKey = formatDate(date);
    return harvestEvents[dateKey] || [];
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    todayIST.setHours(0, 0, 0, 0);
    return date < todayIST;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentDate);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🗓️ Harvest Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Track expected harvest dates for your crops
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Expected Harvest</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Overdue</span>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getMonthName(currentDate)}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week Day Headers */}
            {weekDays.map(day => (
              <div key={day} className="p-3 text-center font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {days.map((date, index) => {
              const events = getHarvestEvents(date);
              const hasEvents = hasHarvestEvent(date);
              const isOverdue = hasEvents && isPastDate(date);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[80px] p-2 border border-gray-200 dark:border-gray-600 cursor-pointer
                    transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700
                    ${!date ? 'bg-gray-50 dark:bg-gray-900' : ''}
                    ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''}
                    ${selectedDate === date ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => date && setSelectedDate(selectedDate === date ? null : date)}
                >
                  {date && (
                    <>
                      <div className={`
                        text-sm font-medium mb-1
                        ${isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}
                      `}>
                        {date.getDate()}
                      </div>
                      
                      {hasEvents && (
                        <div className="space-y-1">
                          {events.slice(0, 2).map((crop, idx) => (
                            <div
                              key={idx}
                              className={`
                                text-xs px-2 py-1 rounded truncate
                                ${isOverdue 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                }
                              `}
                              title={`${crop.crop_name} (${crop.variety}) - ${crop.batch_code}`}
                            >
                              🌱 {crop.crop_name}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                              +{events.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && getHarvestEvents(selectedDate).length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📅 {selectedDate.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'Asia/Kolkata'
              })}
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getHarvestEvents(selectedDate).map((crop, index) => {
                const isOverdue = isPastDate(selectedDate);
                return (
                  <div
                    key={index}
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-200
                      ${isOverdue 
                        ? 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/10'
                        : 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/10'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {crop.crop_name}
                      </h4>
                      {isOverdue && (
                        <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p><span className="font-medium">Variety:</span> {crop.variety}</p>
                      <p><span className="font-medium">Batch:</span> {crop.batch_code}</p>
                      <p><span className="font-medium">Current Stage:</span> 
                        <span className="ml-1 capitalize">{crop.current_stage}</span>
                      </p>
                      <p><span className="font-medium">Growth Duration:</span> {crop.growth_duration_days} days</p>
                      {crop.farm_name && (
                        <p><span className="font-medium">Farm:</span> {crop.farm_name}</p>
                      )}
                    </div>
                    
                    {crop.notes && (
                      <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">Notes:</p>
                        <p className="text-gray-600 dark:text-gray-300">{crop.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🌱</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Crops</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{cropStages.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">📅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {Object.values(harvestEvents).reduce((acc, events) => {
                    return acc + events.filter(crop => {
                      const harvestDate = new Date(crop.expected_harvest_date);
                      return harvestDate.getMonth() === currentDate.getMonth() && 
                             harvestDate.getFullYear() === currentDate.getFullYear();
                    }).length;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {Object.entries(harvestEvents).reduce((acc, [dateKey, events]) => {
                    const harvestDate = new Date(dateKey);
                    return acc + (isPastDate(harvestDate) ? events.length : 0);
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;