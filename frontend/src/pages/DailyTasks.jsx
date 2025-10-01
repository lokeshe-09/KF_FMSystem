import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const DailyTasks = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-teal-400 rounded-full animate-pulse mx-auto"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Tasks</h3>
            <p className="text-gray-600">Preparing your daily farm activities...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
  const hasWaterData = taskForm.main_tank_ec || taskForm.main_tank_ph || taskForm.dripper_ec || taskForm.dripper_ph;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Modern Header with Glass Effect */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-3xl blur-xl"></div>
            <div className="relative backdrop-blur-sm bg-white/70 border border-white/40 rounded-2xl p-8 shadow-xl">
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <button
                  onClick={() => navigate(inFarmMode ? `/farm/${farmId}/dashboard` : '/dashboard')}
                  className="hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  Farm Management
                </button>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-emerald-600 font-medium">Daily Tasks</span>
              </nav>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-700 bg-clip-text text-transparent">
                        Daily Tasks
                      </h1>
                      <p className="text-gray-600 mt-1">
                        {inFarmMode ? (
                          <>Track daily activities for <span className="font-semibold text-emerald-700">{farmName}</span></>
                        ) : (
                          'Manage farm operations and track progress'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="group flex items-center gap-2 px-5 py-3 bg-white/80 hover:bg-white border border-gray-200 hover:border-emerald-300 rounded-xl text-gray-700 hover:text-emerald-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {showHistory ? 'Hide History' : 'View History'}
                  </button>

                  <div className="w-px h-8 bg-gray-300"></div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Today</div>
                    <div className="font-semibold text-gray-900">
                      {new Date().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {[
              {
                title: 'Tasks Done',
                value: completedTasks,
                total: totalTasks,
                color: 'emerald',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                title: 'Progress',
                value: `${completionPercentage}%`,
                color: 'teal',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )
              },
              {
                title: 'Water Quality',
                value: hasWaterData ? 'Recorded' : 'Pending',
                color: 'blue',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                )
              },
              {
                title: 'Status',
                value: todayTaskSubmitted ? 'Complete' : 'In Progress',
                color: todayTaskSubmitted ? 'green' : 'amber',
                icon: todayTaskSubmitted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
            ].map((stat, index) => (
              <div key={index} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-r from-${stat.color}-500/20 to-${stat.color}-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <div className="relative bg-white/80 backdrop-blur-sm border border-white/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      {stat.icon}
                    </div>
                    {stat.total && (
                      <div className="text-right text-xs text-gray-500">
                        of {stat.total}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Completion Status Banner */}
          {todayTaskSubmitted && (
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl"></div>
              <div className={`relative backdrop-blur-sm bg-white/80 border-2 ${editMode ? 'border-amber-300' : 'border-emerald-300'} rounded-2xl p-6 shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      editMode ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                    }`}>
                      {editMode ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {editMode ? 'Editing Mode Active' : 'Tasks Completed Successfully'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {editMode ? (
                          'Make your changes and update when ready'
                        ) : (
                          <>
                            Submitted at{' '}
                            <span className="font-medium text-emerald-700">
                              {submissionTime ? new Date(submissionTime).toLocaleString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric',
                                hour12: true
                              }) : 'unknown time'}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {editMode ? (
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-gray-700 font-medium transition-all duration-200"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-white/80 hover:bg-white border border-gray-300 hover:border-emerald-300 rounded-xl text-gray-700 hover:text-emerald-700 font-medium transition-all duration-200"
                      >
                        Edit Tasks
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Task Form with Glass Effect */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-3xl blur-xl"></div>
            <div className="relative backdrop-blur-sm bg-white/80 border border-white/40 rounded-3xl shadow-2xl overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Farm Activities</h2>
                    <p className="text-emerald-100">Complete your daily tasks and monitor progress</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                    <div className="text-white text-sm font-medium">{completionPercentage}% Complete</div>
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-emerald-100 mb-2">
                    <span>Task Progress</span>
                    <span>{completedTasks} of {totalTasks} tasks</span>
                  </div>
                  <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-white to-emerald-100 rounded-full transition-all duration-700 ease-out shadow-lg"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 rounded-full"></div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleTaskSubmit} className="p-8 space-y-8">
                {/* Farm Selection - Only show in admin mode */}
                {!inFarmMode && (
                  <div className="space-y-3">
                    <label className="block text-lg font-semibold text-gray-900 mb-2">Select Farm</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <select
                        name="farm"
                        value={taskForm.farm}
                        onChange={handleTaskChange}
                        disabled={todayTaskSubmitted}
                        required
                        className={`w-full pl-14 pr-12 py-4 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-gray-900 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-base appearance-none ${
                          todayTaskSubmitted ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Choose your farm</option>
                        {farms.map((farm) => (
                          <option key={farm.id} value={farm.id}>
                            {farm.name} - {farm.location}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hidden farm input for form submission in farm mode */}
                {inFarmMode && <input type="hidden" name="farm" value={farmId} />}

                {/* Task Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Farm Hygiene Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Farm Hygiene</h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'farm_hygiene', label: 'Farm hygiene maintenance', desc: 'Clean facilities and equipment' },
                        { key: 'disease_pest_check', label: 'Disease & pest inspection', desc: 'Check plants for signs of disease or pests' },
                        { key: 'daily_crop_update', label: 'Daily crop assessment', desc: 'Monitor plant health and growth' }
                      ].map((task) => (
                        <label
                          key={task.key}
                          className={`group relative flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            taskForm[task.key]
                              ? 'bg-emerald-50 border-emerald-300 shadow-md'
                              : todayTaskSubmitted && !editMode
                              ? 'bg-gray-50 border-gray-200 cursor-default opacity-50'
                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center h-6">
                            <input
                              type="checkbox"
                              name={task.key}
                              checked={taskForm[task.key]}
                              onChange={handleTaskChange}
                              disabled={todayTaskSubmitted && !editMode}
                              className="w-5 h-5 text-emerald-600 border-2 border-gray-300 rounded-lg focus:ring-emerald-500 focus:ring-2"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 mb-1">
                              {task.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              {task.desc}
                            </div>
                          </div>
                          {taskForm[task.key] && (
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Operations Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Operations</h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'trellising', label: 'Plant trellising', desc: 'Support plant growth with structures' },
                        { key: 'spraying', label: 'Pesticide spraying', desc: 'Apply protective treatments' },
                        { key: 'cleaning', label: 'Equipment cleaning', desc: 'Maintain tools and machinery' },
                        { key: 'pruning', label: 'Plant pruning', desc: 'Trim and shape plants for health' }
                      ].map((task) => (
                        <label
                          key={task.key}
                          className={`group relative flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            taskForm[task.key]
                              ? 'bg-teal-50 border-teal-300 shadow-md'
                              : todayTaskSubmitted && !editMode
                              ? 'bg-gray-50 border-gray-200 cursor-default opacity-50'
                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center h-6">
                            <input
                              type="checkbox"
                              name={task.key}
                              checked={taskForm[task.key]}
                              onChange={handleTaskChange}
                              disabled={todayTaskSubmitted && !editMode}
                              className="w-5 h-5 text-teal-600 border-2 border-gray-300 rounded-lg focus:ring-teal-500 focus:ring-2"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 mb-1">
                              {task.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              {task.desc}
                            </div>
                          </div>
                          {taskForm[task.key] && (
                            <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Water Quality Section */}
                <div className="border-t-2 border-gray-100 pt-8 mt-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Water Quality Measurements</h3>
                      <p className="text-gray-600 text-sm">Monitor EC and pH levels for optimal plant health</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Main Tank */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl blur-sm"></div>
                      <div className="relative bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">Main Tank</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {[
                            {
                              name: 'main_tank_ec',
                              label: 'EC Level',
                              range: '1.2-2.5',
                              placeholder: '1.8',
                              min: 0,
                              max: 5,
                              value: taskForm.main_tank_ec,
                              isOutOfRange: taskForm.main_tank_ec && (taskForm.main_tank_ec < 1.2 || taskForm.main_tank_ec > 2.5)
                            },
                            {
                              name: 'main_tank_ph',
                              label: 'pH Level',
                              range: '5.5-6.5',
                              placeholder: '6.0',
                              min: 0,
                              max: 14,
                              value: taskForm.main_tank_ph,
                              isOutOfRange: taskForm.main_tank_ph && (taskForm.main_tank_ph < 5.5 || taskForm.main_tank_ph > 6.5)
                            }
                          ].map((field) => (
                            <div key={field.name}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {field.label}
                                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {field.range}
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={field.min}
                                  max={field.max}
                                  name={field.name}
                                  value={field.value}
                                  onChange={handleTaskChange}
                                  disabled={todayTaskSubmitted && !editMode}
                                  className={`w-full px-4 py-3 border-2 ${
                                    field.isOutOfRange
                                      ? 'border-amber-300 bg-amber-50'
                                      : 'border-gray-200 bg-white'
                                  } focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl text-sm transition-all duration-300 ${
                                    todayTaskSubmitted && !editMode ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  placeholder={field.placeholder}
                                />
                                {field.isOutOfRange && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              {field.isOutOfRange && (
                                <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  Outside optimal range
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dripper */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-2xl blur-sm"></div>
                      <div className="relative bg-white border-2 border-teal-200 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">Dripper System</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {[
                            {
                              name: 'dripper_ec',
                              label: 'EC Level',
                              range: '1.2-2.5',
                              placeholder: '1.8',
                              min: 0,
                              max: 5,
                              value: taskForm.dripper_ec,
                              isOutOfRange: taskForm.dripper_ec && (taskForm.dripper_ec < 1.2 || taskForm.dripper_ec > 2.5)
                            },
                            {
                              name: 'dripper_ph',
                              label: 'pH Level',
                              range: '5.5-6.5',
                              placeholder: '6.0',
                              min: 0,
                              max: 14,
                              value: taskForm.dripper_ph,
                              isOutOfRange: taskForm.dripper_ph && (taskForm.dripper_ph < 5.5 || taskForm.dripper_ph > 6.5)
                            }
                          ].map((field) => (
                            <div key={field.name}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {field.label}
                                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {field.range}
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={field.min}
                                  max={field.max}
                                  name={field.name}
                                  value={field.value}
                                  onChange={handleTaskChange}
                                  disabled={todayTaskSubmitted && !editMode}
                                  className={`w-full px-4 py-3 border-2 ${
                                    field.isOutOfRange
                                      ? 'border-amber-300 bg-amber-50'
                                      : 'border-gray-200 bg-white'
                                  } focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 rounded-xl text-sm transition-all duration-300 ${
                                    todayTaskSubmitted && !editMode ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  placeholder={field.placeholder}
                                />
                                {field.isOutOfRange && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              {field.isOutOfRange && (
                                <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  Outside optimal range
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showHistory ? 'Hide History' : 'View History'}
                  </button>

                  <div className="flex items-center gap-4">
                    {(() => {
                      const hasData = taskForm.main_tank_ec || taskForm.main_tank_ph || taskForm.dripper_ec || taskForm.dripper_ph;
                      const canSubmit = (editMode || !todayTaskSubmitted) && (completedTasks > 0 || hasData);

                      return (
                        <>
                          {!canSubmit && (
                            <div className="text-sm text-gray-500 text-right">
                              {todayTaskSubmitted && !editMode
                                ? 'Tasks already submitted today'
                                : 'Complete at least one task to submit'
                              }
                            </div>
                          )}
                          <button
                            type="submit"
                            disabled={!canSubmit || submitting || updating}
                            className={`relative overflow-hidden px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl ${
                              !canSubmit
                                ? 'bg-gray-300 cursor-not-allowed'
                                : submitting || updating
                                ? 'bg-gradient-to-r from-gray-600 to-gray-700'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transform hover:scale-105'
                            }`}
                          >
                            {submitting || updating ? (
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>{updating ? 'Updating Tasks...' : 'Submitting Tasks...'}</span>
                              </div>
                            ) : (
                              <span className="flex items-center gap-2">
                                {editMode ? (
                                  <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Update Tasks
                                  </>
                                ) : todayTaskSubmitted ? (
                                  <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Tasks Submitted
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Submit Tasks
                                  </>
                                )}
                              </span>
                            )}

                            {/* Shimmer effect */}
                            {!(!canSubmit || submitting || updating) && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Enhanced History Section */}
          {showHistory && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 to-slate-500/5 rounded-3xl blur-xl"></div>
              <div className="relative backdrop-blur-sm bg-white/90 border border-white/40 rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-slate-700 px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Task History</h3>
                      <p className="text-gray-200">Your recent daily task submissions</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {taskHistory.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mx-auto flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">No History Available</h4>
                      <p className="text-gray-600">Your completed daily tasks will appear here once you start submitting them.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {taskHistory.slice(0, 10).map((task, index) => (
                        <div key={task.id} className="group relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative bg-white border-2 border-gray-200 group-hover:border-emerald-300 rounded-2xl p-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <div className="flex items-start gap-6">
                              {/* Date Badge */}
                              <div className="flex-shrink-0">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                                  <div className="text-xs font-semibold">
                                    {new Date(task.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                  </div>
                                  <div className="text-lg font-bold">
                                    {new Date(task.date).getDate()}
                                  </div>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">{task.farm_name}</h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                      <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V8a1 1 0 011-1h2z" />
                                        </svg>
                                        {new Date(task.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {new Date(task.created_at).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {(() => {
                                        const completed = [
                                          task.farm_hygiene,
                                          task.disease_pest_check,
                                          task.daily_crop_update,
                                          task.trellising,
                                          task.spraying,
                                          task.cleaning,
                                          task.pruning
                                        ].filter(Boolean).length;
                                        const total = 7;
                                        return `${completed}/${total} Tasks`;
                                      })()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {Math.round(([
                                        task.farm_hygiene,
                                        task.disease_pest_check,
                                        task.daily_crop_update,
                                        task.trellising,
                                        task.spraying,
                                        task.cleaning,
                                        task.pruning
                                      ].filter(Boolean).length / 7) * 100)}% Complete
                                    </div>
                                  </div>
                                </div>

                                {/* Task Details Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Hygiene Tasks */}
                                  <div className="space-y-3">
                                    <h5 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3"/>
                                        </svg>
                                      </div>
                                      Farm Hygiene
                                    </h5>
                                    <div className="space-y-2 text-xs">
                                      {[
                                        { key: 'farm_hygiene', label: 'Maintenance', done: task.farm_hygiene },
                                        { key: 'disease_pest_check', label: 'Pest Check', done: task.disease_pest_check },
                                        { key: 'daily_crop_update', label: 'Crop Assessment', done: task.daily_crop_update }
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between">
                                          <span className="text-gray-700">{item.label}</span>
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                            item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                                          }`}>
                                            {item.done ? (
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            ) : (
                                              <span className="text-xs">—</span>
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Operations */}
                                  <div className="space-y-3">
                                    <h5 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3"/>
                                        </svg>
                                      </div>
                                      Operations
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                      {[
                                        { key: 'trellising', label: 'Trellis', done: task.trellising },
                                        { key: 'spraying', label: 'Spray', done: task.spraying },
                                        { key: 'cleaning', label: 'Clean', done: task.cleaning },
                                        { key: 'pruning', label: 'Prune', done: task.pruning }
                                      ].map((op) => (
                                        <span
                                          key={op.key}
                                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            op.done
                                              ? 'bg-teal-100 text-teal-800'
                                              : 'bg-gray-100 text-gray-500'
                                          }`}
                                        >
                                          {op.label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Water Quality */}
                                  <div className="space-y-3">
                                    <h5 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                      <div className="w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3"/>
                                        </svg>
                                      </div>
                                      Water Quality
                                    </h5>
                                    <div className="space-y-2 text-xs">
                                      <div className="bg-gray-50 rounded-lg p-2">
                                        <div className="font-medium text-gray-700 mb-1">Main Tank</div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">EC: {task.main_tank_ec || '—'}</span>
                                          <span className="text-gray-600">pH: {task.main_tank_ph || '—'}</span>
                                        </div>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-2">
                                        <div className="font-medium text-gray-700 mb-1">Dripper</div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">EC: {task.dripper_ec || '—'}</span>
                                          <span className="text-gray-600">pH: {task.dripper_ph || '—'}</span>
                                        </div>
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
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DailyTasks;