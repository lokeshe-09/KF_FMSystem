import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const DailyTasks = () => {
  const { farmId } = useParams();
  const [farms, setFarms] = useState([]);

  // Check if we're in farm-specific mode
  const inFarmMode = Boolean(farmId);

  // Get farm name for display
  const farmName = farms.find(farm => farm.id === parseInt(farmId))?.name || 'your farm';
  
  const [taskForm, setTaskForm] = useState({
    farm: '',
    farm_hygiene: false,
    disease_pest_check: false,
    daily_crop_update: false,
    trellising: false,
    spraying: false,
    cleaning: false,
    pruning: false,
    main_tank_ec: '',
    main_tank_ph: '',
    dripper_ec: '',
    dripper_ph: ''
  });
  const [taskHistory, setTaskHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayTaskSubmitted, setTodayTaskSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState(null);
  const [todayTaskData, setTodayTaskData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (inFarmMode) {
      // In farm-specific mode, set the farm automatically and fetch task history
      setTaskForm(prev => ({ ...prev, farm: farmId }));
      fetchFarms(); // Also fetch farms to get farm name for display
      fetchTaskHistory();
      checkTodaySubmission();
      setLoading(false);
    } else {
      // In admin mode, fetch farms and task history
      fetchFarms();
      fetchTaskHistory();
      checkTodaySubmission();
    }
  }, [farmId, inFarmMode]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
      if (response.data.length > 0 && !taskForm.farm) {
        setTaskForm(prev => ({ ...prev, farm: response.data[0]?.id || '' }));
      }
    } catch (error) {
      toast.error('Failed to fetch farms');
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTodaySubmission = async () => {
    try {
      let response;
      if (inFarmMode) {
        // Check today's tasks for this farm
        response = await farmAPI.getFarmDailyTasks(farmId);
      } else {
        // Check today's tasks for general view
        response = await farmAPI.getDailyTasks();
      }

      // Check if there's a task for today
      const today = new Date().toDateString();
      const todayTask = response.data.find(task =>
        new Date(task.date).toDateString() === today
      );

      if (todayTask) {
        setTodayTaskSubmitted(true);
        setSubmissionTime(todayTask.created_at);
        setTodayTaskData(todayTask);

        // Pre-fill the form with today's submitted data (for viewing only)
        setTaskForm({
          farm: inFarmMode ? farmId : todayTask.farm,
          farm_hygiene: todayTask.farm_hygiene,
          disease_pest_check: todayTask.disease_pest_check,
          daily_crop_update: todayTask.daily_crop_update,
          trellising: todayTask.trellising,
          spraying: todayTask.spraying,
          cleaning: todayTask.cleaning,
          pruning: todayTask.pruning,
          main_tank_ec: todayTask.main_tank_ec || '',
          main_tank_ph: todayTask.main_tank_ph || '',
          dripper_ec: todayTask.dripper_ec || '',
          dripper_ph: todayTask.dripper_ph || ''
        });
      }
    } catch (error) {
      console.error('Error checking today\'s submission:', error);
    }
  };

  const fetchTaskHistory = async () => {
    try {
      let response;
      if (inFarmMode) {
        // Use farm-specific API endpoint
        response = await farmAPI.getFarmDailyTasks(farmId, { history: true });
      } else {
        // Use general API endpoint
        response = await farmAPI.getDailyTasks({ history: true });
      }
      setTaskHistory(response.data);
    } catch (error) {
      console.error('Error fetching task history:', error);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    // Prevent submission if already submitted today and not in edit mode
    if (todayTaskSubmitted && !editMode) {
      toast.error('Daily tasks already submitted for today!', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
      return;
    }

    // Set appropriate loading state
    if (editMode) {
      setUpdating(true);
    } else {
      setSubmitting(true);
    }

    try {
      let response;

      if (editMode && todayTaskData) {
        // Update existing task
        if (inFarmMode) {
          response = await farmAPI.updateFarmDailyTask(farmId, todayTaskData.id, taskForm);
        } else {
          response = await farmAPI.updateDailyTask(todayTaskData.id, taskForm);
        }

        // Handle successful update
        toast.success('Daily tasks updated successfully! ✏️', {
          duration: 3000,
          style: {
            background: '#3b82f6',
            color: '#fff',
          },
        });

        // Update data and exit edit mode
        setTodayTaskData(response.data.task_data);
        setSubmissionTime(response.data.task_data.updated_at);
        setEditMode(false);
      } else {
        // Create new task
        if (inFarmMode) {
          response = await farmAPI.submitFarmDailyTask(farmId, taskForm);
        } else {
          response = await farmAPI.submitDailyTask(taskForm);
        }

        // Handle successful submission
        toast.success(response.data.message || 'Daily tasks completed successfully! 🌱', {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });

        // Update submission status
        setTodayTaskSubmitted(true);
        setSubmissionTime(response.data.task_data.created_at);
        setTodayTaskData(response.data.task_data);
      }

      fetchTaskHistory();
    } catch (error) {
      // Handle different error types
      if (error.response?.data?.already_submitted) {
        // Handle already submitted error
        setTodayTaskSubmitted(true);
        setSubmissionTime(error.response.data.submission_time);
        setTodayTaskData(error.response.data.task_data);

        toast.error(error.response.data.message || 'Daily tasks already submitted for today!', {
          duration: 4000,
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        });
      } else {
        // Handle other errors
        const errorMessage = editMode
          ? 'Failed to update daily tasks'
          : 'Failed to submit daily tasks';

        toast.error(error.response?.data?.message || errorMessage, {
          duration: 4000,
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        });
      }
      console.error('Error with task:', error);
    } finally {
      setSubmitting(false);
      setUpdating(false);
    }
  };

  const handleTaskChange = (e) => {
    // Prevent changes if already submitted today and not in edit mode
    if (todayTaskSubmitted && !editMode) {
      return;
    }

    const { name, type, checked, value } = e.target;
    setTaskForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Restore form to original submitted data
    if (todayTaskData) {
      setTaskForm({
        farm: inFarmMode ? farmId : todayTaskData.farm,
        farm_hygiene: todayTaskData.farm_hygiene,
        disease_pest_check: todayTaskData.disease_pest_check,
        daily_crop_update: todayTaskData.daily_crop_update,
        trellising: todayTaskData.trellising,
        spraying: todayTaskData.spraying,
        cleaning: todayTaskData.cleaning,
        pruning: todayTaskData.pruning,
        main_tank_ec: todayTaskData.main_tank_ec || '',
        main_tank_ph: todayTaskData.main_tank_ph || '',
        dripper_ec: todayTaskData.dripper_ec || '',
        dripper_ph: todayTaskData.dripper_ph || ''
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600"></div>
            <span className="text-emerald-700 font-medium text-sm sm:text-base">Loading your tasks...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <span>Dashboard</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">Daily Tasks</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Daily Tasks
              </h1>
              <p className="text-gray-600">
                {inFarmMode
                  ? `Complete your daily tasks for ${farmName}`
                  : 'Manage and track daily farm activities'
                }
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showHistory ? 'Hide History' : 'View History'}
              </button>

              {showHistory && (
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setTimeout(() => setShowHistory(true), 100);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(() => {
            const completedTasks = [
              taskForm.farm_hygiene,
              taskForm.disease_pest_check,
              taskForm.daily_crop_update,
              taskForm.trellising,
              taskForm.spraying,
              taskForm.cleaning,
              taskForm.pruning
            ].filter(Boolean).length;
            const totalTasks = 7;
            const hasWaterData = taskForm.main_tank_ec || taskForm.main_tank_ph || taskForm.dripper_ec || taskForm.dripper_ph;

            return (
              <>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{completedTasks}</h3>
                      <p className="text-sm text-gray-500">Tasks Completed</p>
                      <p className="text-xs text-gray-400 mt-1">{totalTasks} total tasks</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {Math.round((completedTasks / totalTasks) * 100)}%
                      </h3>
                      <p className="text-sm text-gray-500">Progress</p>
                      <p className="text-xs text-gray-400 mt-1">Daily completion</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {hasWaterData ? 'Yes' : 'No'}
                      </h3>
                      <p className="text-sm text-gray-500">Water Data</p>
                      <p className="text-xs text-gray-400 mt-1">EC/pH recorded</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        todayTaskSubmitted ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <svg className={`w-6 h-6 ${
                          todayTaskSubmitted ? 'text-green-600' : 'text-yellow-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                            todayTaskSubmitted
                              ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          } />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {todayTaskSubmitted ? 'Complete' : 'Pending'}
                      </h3>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="text-xs text-gray-400 mt-1">Today's submission</p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Submission Status Banner */}
        {todayTaskSubmitted && (
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 mb-6 ${
            editMode ? 'ring-2 ring-blue-500 ring-opacity-50' : 'ring-2 ring-emerald-500 ring-opacity-50'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      editMode ? 'bg-blue-100' : 'bg-emerald-100'
                    }`}>
                      <svg className={`w-6 h-6 ${
                        editMode ? 'text-blue-600' : 'text-emerald-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {editMode ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {editMode ? 'Editing Daily Tasks' : 'Daily Tasks Completed'}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {editMode ? (
                        'You are currently editing your daily tasks. Make your changes and update when ready.'
                      ) : (
                        <>
                          Successfully submitted at{' '}
                          <span className="font-medium text-gray-900">
                            {submissionTime ? new Date(submissionTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : 'unknown time'}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {editMode
                        ? 'Your admin will be notified when you update your tasks.'
                        : 'You can edit your tasks if you need to make changes.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {editMode ? (
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleEdit}
                        className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Tasks
                      </button>
                      <div className="inline-flex items-center px-3 py-2 bg-emerald-50 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-200">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                        Submitted
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Tasks Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">Today's Tasks</h3>
                <p className="text-gray-600 text-sm mt-1">Track your daily farm activities and measurements</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleTaskSubmit} className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
            {/* Progress Tracker */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800">Today's Progress</h4>
                <span className="text-xs text-slate-600">
                  {(() => {
                    const totalTasks = 7; // 3 hygiene + 4 operations
                    const completedTasks = [
                      taskForm.farm_hygiene,
                      taskForm.disease_pest_check,
                      taskForm.daily_crop_update,
                      taskForm.trellising,
                      taskForm.spraying,
                      taskForm.cleaning,
                      taskForm.pruning
                    ].filter(Boolean).length;
                    return `${completedTasks}/${totalTasks} tasks`;
                  })()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(() => {
                      const totalTasks = 7;
                      const completedTasks = [
                        taskForm.farm_hygiene,
                        taskForm.disease_pest_check,
                        taskForm.daily_crop_update,
                        taskForm.trellising,
                        taskForm.spraying,
                        taskForm.cleaning,
                        taskForm.pruning
                      ].filter(Boolean).length;
                      return (completedTasks / totalTasks) * 100;
                    })()}%`
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-slate-600">Completed</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-slate-600">Remaining</span>
                  </div>
                </div>
                {(() => {
                  const hasMainTankData = taskForm.main_tank_ec || taskForm.main_tank_ph;
                  const hasDripperData = taskForm.dripper_ec || taskForm.dripper_ph;
                  if (hasMainTankData || hasDripperData) {
                    return (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Water data recorded</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            {/* Farm Selection - Only show in admin mode */}
            {!inFarmMode && (
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-sm sm:text-base font-semibold text-slate-700">Select Farm</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <select
                    name="farm"
                    value={taskForm.farm}
                    onChange={handleTaskChange}
                    disabled={todayTaskSubmitted}
                    required
                    className={`w-full pl-9 sm:pl-10 md:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 md:py-4 bg-slate-50/80 border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm sm:text-base appearance-none min-h-[44px] ${todayTaskSubmitted ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Choose your farm</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} - {farm.location}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden farm input for form submission in farm mode */}
            {inFarmMode && (
              <input type="hidden" name="farm" value={farmId} />
            )}

            {/* Task Sections */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Farm Hygiene Tasks */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">Farm Hygiene</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'farm_hygiene', label: 'Hygiene of the farm', icon: '🧹' },
                      { key: 'disease_pest_check', label: 'Disease & pest check', icon: '🔍' },
                      { key: 'daily_crop_update', label: 'Daily crop update', icon: '📊' }
                    ].map((task) => (
                      <label key={task.key} className={`group flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        taskForm[task.key]
                          ? 'bg-emerald-50 border-emerald-200'
                          : todayTaskSubmitted && !editMode
                          ? 'bg-gray-50 border-gray-200 cursor-default opacity-60'
                          : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}>
                        <div className="relative flex-shrink-0">
                          <input
                            type="checkbox"
                            name={task.key}
                            checked={taskForm[task.key]}
                            onChange={handleTaskChange}
                            disabled={todayTaskSubmitted && !editMode}
                            className="sr-only"
                          />
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                            taskForm[task.key]
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-300 group-hover:border-emerald-400'
                          }`}>
                            {taskForm[task.key] && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-xl" role="img" aria-label={task.label}>
                            {task.icon}
                          </span>
                          <span className="text-gray-900 font-medium text-sm group-hover:text-emerald-700 transition-colors duration-200">
                            {task.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

                {/* Daily Operations */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">Daily Operations</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'trellising', label: 'Trellising', icon: '🌿' },
                      { key: 'spraying', label: 'Spraying', icon: '💨' },
                      { key: 'cleaning', label: 'Cleaning', icon: '🧽' },
                      { key: 'pruning', label: 'Pruning', icon: '✂️' }
                    ].map((task) => (
                      <label key={task.key} className={`group flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        taskForm[task.key]
                          ? 'bg-blue-50 border-blue-200'
                          : todayTaskSubmitted && !editMode
                          ? 'bg-gray-50 border-gray-200 cursor-default opacity-60'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}>
                        <div className="relative flex-shrink-0">
                          <input
                            type="checkbox"
                            name={task.key}
                            checked={taskForm[task.key]}
                            onChange={handleTaskChange}
                            disabled={todayTaskSubmitted && !editMode}
                            className="sr-only"
                          />
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                            taskForm[task.key]
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 group-hover:border-blue-400'
                          }`}>
                            {taskForm[task.key] && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-xl" role="img" aria-label={task.label}>
                            {task.icon}
                          </span>
                          <span className="text-gray-900 font-medium text-sm group-hover:text-blue-700 transition-colors duration-200">
                            {task.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

            {/* Water Quality Measurements */}
            <div className="border-t border-gray-200 pt-8 mt-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h4 className="text-base font-semibold text-gray-900">Water Quality Measurements</h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-slate-800">Water Quality Measurements</h4>
                  </div>
                  <div className="group relative">
                    <button type="button" className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <div className="absolute right-0 top-6 hidden group-hover:block z-20 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                      <div className="font-semibold mb-2">Optimal Ranges:</div>
                      <div>• EC: 1.2-2.5 (Electrical Conductivity)</div>
                      <div>• pH: 5.5-6.5 (Acidity/Alkalinity)</div>
                      <div className="mt-2 text-slate-300">Critical for nutrient uptake and plant health</div>
                    </div>
                  </div>
                </div>

                {/* Quick Reference Guide */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-blue-800">Quick Reference</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium text-blue-700 mb-1">EC (Electrical Conductivity)</div>
                      <div className="text-blue-600">
                        <div>• Optimal: 1.2-2.5</div>
                        <div>• Measures nutrient concentration</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-indigo-700 mb-1">pH (Acidity Level)</div>
                      <div className="text-indigo-600">
                        <div>• Optimal: 5.5-6.5</div>
                        <div>• Affects nutrient availability</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-100">
                    <h5 className="text-xs sm:text-sm font-semibold text-purple-800 mb-2 sm:mb-3 flex items-center space-x-2">
                      <span>🏆</span>
                      <span>Main Tank</span>
                    </h5>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">
                          EC Level
                          <span className="ml-1 text-xs text-purple-600 font-normal">(1.2-2.5 optimal)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="5"
                            name="main_tank_ec"
                            value={taskForm.main_tank_ec}
                            onChange={handleTaskChange}
                            disabled={todayTaskSubmitted && !editMode}
                            className={`w-full px-2 sm:px-3 py-2 sm:py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 transition-all duration-200 text-sm min-h-[44px] ${todayTaskSubmitted && !editMode ? 'opacity-70 cursor-not-allowed' : ''} ${
                              taskForm.main_tank_ec
                                ? (taskForm.main_tank_ec >= 1.2 && taskForm.main_tank_ec <= 2.5
                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                                    : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20')
                                : 'border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
                            }`}
                            placeholder="e.g. 1.8"
                          />
                          {taskForm.main_tank_ec && (taskForm.main_tank_ec < 1.2 || taskForm.main_tank_ec > 2.5) && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {taskForm.main_tank_ec && (taskForm.main_tank_ec < 1.2 || taskForm.main_tank_ec > 2.5) && (
                          <div className="text-xs text-amber-600 mt-1">Outside optimal range</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">
                          pH Level
                          <span className="ml-1 text-xs text-purple-600 font-normal">(5.5-6.5 optimal)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="14"
                            name="main_tank_ph"
                            value={taskForm.main_tank_ph}
                            onChange={handleTaskChange}
                            disabled={todayTaskSubmitted && !editMode}
                            className={`w-full px-2 sm:px-3 py-2 sm:py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 transition-all duration-200 text-sm min-h-[44px] ${todayTaskSubmitted && !editMode ? 'opacity-70 cursor-not-allowed' : ''} ${
                              taskForm.main_tank_ph
                                ? (taskForm.main_tank_ph >= 5.5 && taskForm.main_tank_ph <= 6.5
                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                                    : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20')
                                : 'border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
                            }`}
                            placeholder="e.g. 6.0"
                          />
                          {taskForm.main_tank_ph && (taskForm.main_tank_ph < 5.5 || taskForm.main_tank_ph > 6.5) && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {taskForm.main_tank_ph && (taskForm.main_tank_ph < 5.5 || taskForm.main_tank_ph > 6.5) && (
                          <div className="text-xs text-amber-600 mt-1">Outside optimal range</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-indigo-100">
                    <h5 className="text-xs sm:text-sm font-semibold text-indigo-800 mb-2 sm:mb-3 flex items-center space-x-2">
                      <span>💧</span>
                      <span>Dripper</span>
                    </h5>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">
                          EC Level
                          <span className="ml-1 text-xs text-indigo-600 font-normal">(1.2-2.5 optimal)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="5"
                            name="dripper_ec"
                            value={taskForm.dripper_ec}
                            onChange={handleTaskChange}
                            disabled={todayTaskSubmitted && !editMode}
                            className={`w-full px-2 sm:px-3 py-2 sm:py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 transition-all duration-200 text-sm min-h-[44px] ${todayTaskSubmitted && !editMode ? 'opacity-70 cursor-not-allowed' : ''} ${
                              taskForm.dripper_ec
                                ? (taskForm.dripper_ec >= 1.2 && taskForm.dripper_ec <= 2.5
                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                                    : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20')
                                : 'border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                            }`}
                            placeholder="e.g. 1.8"
                          />
                          {taskForm.dripper_ec && (taskForm.dripper_ec < 1.2 || taskForm.dripper_ec > 2.5) && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {taskForm.dripper_ec && (taskForm.dripper_ec < 1.2 || taskForm.dripper_ec > 2.5) && (
                          <div className="text-xs text-amber-600 mt-1">Outside optimal range</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">
                          pH Level
                          <span className="ml-1 text-xs text-indigo-600 font-normal">(5.5-6.5 optimal)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="14"
                            name="dripper_ph"
                            value={taskForm.dripper_ph}
                            onChange={handleTaskChange}
                            disabled={todayTaskSubmitted && !editMode}
                            className={`w-full px-2 sm:px-3 py-2 sm:py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 transition-all duration-200 text-sm min-h-[44px] ${todayTaskSubmitted && !editMode ? 'opacity-70 cursor-not-allowed' : ''} ${
                              taskForm.dripper_ph
                                ? (taskForm.dripper_ph >= 5.5 && taskForm.dripper_ph <= 6.5
                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                                    : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20')
                                : 'border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                            }`}
                            placeholder="e.g. 6.0"
                          />
                          {taskForm.dripper_ph && (taskForm.dripper_ph < 5.5 || taskForm.dripper_ph > 6.5) && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {taskForm.dripper_ph && (taskForm.dripper_ph < 5.5 || taskForm.dripper_ph > 6.5) && (
                          <div className="text-xs text-amber-600 mt-1">Outside optimal range</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-amber-800">Farm Care Tips</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-700">
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Check EC/pH levels early morning for best accuracy</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Look for pest signs on leaf undersides during inspections</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Record unusual observations in crop update notes</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Clean tools between sections to prevent disease spread</span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 sm:pt-6 md:pt-8 border-t border-slate-200 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center justify-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200 group py-2 sm:py-0 min-h-[44px] sm:min-h-0"
              >
                <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-sm sm:text-base">{showHistory ? 'Hide' : 'View'} Task History</span>
              </button>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {(() => {
                  const completedTasks = [
                    taskForm.farm_hygiene,
                    taskForm.disease_pest_check,
                    taskForm.daily_crop_update,
                    taskForm.trellising,
                    taskForm.spraying,
                    taskForm.cleaning,
                    taskForm.pruning
                  ].filter(Boolean).length;
                  const hasData = taskForm.main_tank_ec || taskForm.main_tank_ph || taskForm.dripper_ec || taskForm.dripper_ph;
                  const canSubmit = (editMode || !todayTaskSubmitted) && (completedTasks > 0 || hasData);

                  return (
                    <>
                      {!canSubmit && (
                        <div className="text-center sm:text-left">
                          <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${
                            todayTaskSubmitted
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {todayTaskSubmitted ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                            {todayTaskSubmitted && !editMode
                              ? 'Daily tasks completed for today!'
                              : 'Complete at least one task or add measurements to submit'
                            }
                          </div>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={(submitting || updating) || !canSubmit}
                        className={`relative inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 min-h-[48px] w-full sm:w-auto sm:min-w-[180px] ${
                          !canSubmit
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : (submitting || updating)
                            ? editMode
                              ? 'bg-blue-500 text-white opacity-70'
                              : 'bg-emerald-500 text-white opacity-70'
                            : editMode
                            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500'
                        }`}
                      >
                        {(submitting || updating) ? (
                          <div className="flex items-center space-x-2">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>
                              {updating ? 'Updating...' : 'Submitting...'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {editMode ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              )}
                            </svg>
                            <span>
                              {editMode
                                ? 'Update Tasks'
                                : todayTaskSubmitted && !editMode
                                ? 'Already Submitted'
                                : completedTasks === 7 && hasData
                                ? 'Complete All Tasks'
                                : canSubmit
                                ? 'Submit Progress'
                                : 'Select Tasks'
                              }
                            </span>
                          </div>
                        )}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </form>
        </div>

        {/* Task History */}
        {showHistory && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">Task History</h3>
                  <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Your previous daily task submissions</p>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 md:p-6 lg:p-8">
              {taskHistory.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl sm:rounded-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No task history yet</h4>
                  <p className="text-slate-500 text-sm sm:text-base">Complete your first daily tasks to see them here.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {taskHistory.map((task, index) => (
                    <div key={task.id} className="relative">
                      {/* Timeline Line - Hidden on mobile for cleaner look */}
                      {index !== taskHistory.length - 1 && (
                        <div className="absolute left-4 sm:left-6 top-12 sm:top-16 bottom-0 w-px bg-gradient-to-b from-emerald-200 to-transparent hidden sm:block"></div>
                      )}

                      <div className="relative bg-white border border-slate-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                          {/* Timeline Dot */}
                          <div className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-center sm:text-left mb-3 sm:mb-4">
                              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{task.farm_name}</h4>
                              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-center sm:justify-start xs:space-x-4 space-y-1 xs:space-y-0 text-xs sm:text-sm text-slate-500">
                                <div className="flex items-center justify-center xs:justify-start space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center justify-center xs:justify-start space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{new Date(task.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                              {/* Hygiene Tasks */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                  <span>Farm Hygiene</span>
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${task.farm_hygiene ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                      {task.farm_hygiene ? '✓' : '✗'}
                                    </div>
                                    <span className="text-sm text-slate-600">Farm Hygiene</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${task.disease_pest_check ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                      {task.disease_pest_check ? '✓' : '✗'}
                                    </div>
                                    <span className="text-sm text-slate-600">Pest Check</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${task.daily_crop_update ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                      {task.daily_crop_update ? '✓' : '✗'}
                                    </div>
                                    <span className="text-sm text-slate-600">Crop Update</span>
                                  </div>
                                </div>
                              </div>

                              {/* Operations */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <span>Operations</span>
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'trellising', label: 'Trellising', done: task.trellising },
                                    { key: 'spraying', label: 'Spraying', done: task.spraying },
                                    { key: 'cleaning', label: 'Cleaning', done: task.cleaning },
                                    { key: 'pruning', label: 'Pruning', done: task.pruning }
                                  ].map((op) => (
                                    <span key={op.key} className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                      op.done 
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}>
                                      {op.label}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Measurements */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  <span>Measurements</span>
                                </h5>
                                <div className="space-y-2">
                                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-100">
                                    <div className="text-xs font-semibold text-purple-700 mb-1">🏆 Main Tank</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">EC:</span>
                                        <span className={`text-xs font-medium ${task.main_tank_ec ? 'text-slate-700' : 'text-slate-400'}`}>
                                          {task.main_tank_ec || '-- --'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">pH:</span>
                                        <span className={`text-xs font-medium ${task.main_tank_ph ? 'text-slate-700' : 'text-slate-400'}`}>
                                          {task.main_tank_ph || '-- --'}
                                        </span>
                                      </div>
                                    </div>
                                    {!task.main_tank_ec && !task.main_tank_ph && (
                                      <div className="mt-2 text-xs text-slate-400 italic">No measurements recorded</div>
                                    )}
                                  </div>
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 border border-indigo-100">
                                    <div className="text-xs font-semibold text-indigo-700 mb-1">💧 Dripper</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">EC:</span>
                                        <span className={`text-xs font-medium ${task.dripper_ec ? 'text-slate-700' : 'text-slate-400'}`}>
                                          {task.dripper_ec || '-- --'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">pH:</span>
                                        <span className={`text-xs font-medium ${task.dripper_ph ? 'text-slate-700' : 'text-slate-400'}`}>
                                          {task.dripper_ph || '-- --'}
                                        </span>
                                      </div>
                                    </div>
                                    {!task.dripper_ec && !task.dripper_ph && (
                                      <div className="mt-2 text-xs text-slate-400 italic">No measurements recorded</div>
                                    )}
                                  </div>
                                </div>
                              </div>
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
        )}
      </div>
    </Layout>
  );
};

export default DailyTasks;