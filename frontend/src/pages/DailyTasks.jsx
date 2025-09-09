import React, { useState, useEffect } from 'react';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const DailyTasks = () => {
  const [farms, setFarms] = useState([]);
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

  useEffect(() => {
    fetchFarms();
    fetchTaskHistory();
  }, []);

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

  const fetchTaskHistory = async () => {
    try {
      const response = await farmAPI.getDailyTasks({ history: true });
      setTaskHistory(response.data);
    } catch (error) {
      console.error('Error fetching task history:', error);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await farmAPI.submitDailyTask(taskForm);
      toast.success('Daily tasks completed successfully! 🌱', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      
      // Reset form to initial state
      setTaskForm({
        farm: taskForm.farm, // Keep the selected farm
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
      
      fetchTaskHistory();
    } catch (error) {
      toast.error('Failed to submit daily tasks', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
      console.error('Error submitting task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskChange = (e) => {
    const { name, type, checked, value } = e.target;
    setTaskForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="text-emerald-700 font-medium">Loading your tasks...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="card p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Daily Tasks</h1>
              <p className="text-slate-600 font-medium">
                Complete your daily farm tasks - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Tasks Form */}
        <div className="card overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Today's Tasks</h3>
                <p className="text-slate-600 text-sm">Track your daily farm activities and measurements</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleTaskSubmit} className="p-8 space-y-8">
            {/* Farm Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Select Farm</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <select
                  name="farm"
                  value={taskForm.farm}
                  onChange={handleTaskChange}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm sm:text-base appearance-none"
                >
                  <option value="">Choose your farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.location}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Task Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Farm Hygiene Tasks */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Farm Hygiene</h4>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'farm_hygiene', label: 'Hygiene of the farm', icon: '🧹' },
                    { key: 'disease_pest_check', label: 'Disease & pest check', icon: '🔍' },
                    { key: 'daily_crop_update', label: 'Daily crop update', icon: '📊' }
                  ].map((task) => (
                    <label key={task.key} className="group flex items-center space-x-3 p-4 bg-slate-50/80 rounded-xl hover:bg-emerald-50/80 transition-all duration-200 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          name={task.key}
                          checked={taskForm[task.key]}
                          onChange={handleTaskChange}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                          taskForm[task.key] 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-slate-300 group-hover:border-emerald-400'
                        }`}>
                          {taskForm[task.key] && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{task.icon}</span>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors duration-200">
                          {task.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Daily Operations */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-teal-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Daily Operations</h4>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'trellising', label: 'Trellising', icon: '🌿' },
                    { key: 'spraying', label: 'Spraying', icon: '💨' },
                    { key: 'cleaning', label: 'Cleaning', icon: '🧽' },
                    { key: 'pruning', label: 'Pruning', icon: '✂️' }
                  ].map((task) => (
                    <label key={task.key} className="group flex items-center space-x-3 p-4 bg-slate-50/80 rounded-xl hover:bg-blue-50/80 transition-all duration-200 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          name={task.key}
                          checked={taskForm[task.key]}
                          onChange={handleTaskChange}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                          taskForm[task.key] 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-slate-300 group-hover:border-blue-400'
                        }`}>
                          {taskForm[task.key] && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{task.icon}</span>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors duration-200">
                          {task.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* EC, pH Check */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">EC & pH Levels</h4>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                    <h5 className="text-sm font-semibold text-purple-800 mb-3 flex items-center space-x-2">
                      <span>🏆</span>
                      <span>Main Tank</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">EC Level</label>
                        <input
                          type="number"
                          step="0.01"
                          name="main_tank_ec"
                          value={taskForm.main_tank_ec}
                          onChange={handleTaskChange}
                          className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">pH Level</label>
                        <input
                          type="number"
                          step="0.01"
                          name="main_tank_ph"
                          value={taskForm.main_tank_ph}
                          onChange={handleTaskChange}
                          className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                    <h5 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center space-x-2">
                      <span>💧</span>
                      <span>Dripper</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">EC Level</label>
                        <input
                          type="number"
                          step="0.01"
                          name="dripper_ec"
                          value={taskForm.dripper_ec}
                          onChange={handleTaskChange}
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">pH Level</label>
                        <input
                          type="number"
                          step="0.01"
                          name="dripper_ph"
                          value={taskForm.dripper_ph}
                          onChange={handleTaskChange}
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-slate-200 gap-4">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200 group"
              >
                <svg className={`w-5 h-5 transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>{showHistory ? 'Hide' : 'View'} Task History</span>
              </button>
              
              <button
                type="submit"
                disabled={submitting}
                className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[200px]"
              >
                <span className={`flex items-center justify-center space-x-2 transition-opacity duration-200 ${submitting ? 'opacity-0' : 'opacity-100'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete Tasks</span>
                </span>
                
                {submitting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="text-white font-semibold">Submitting...</span>
                    </div>
                  </div>
                )}
                
                {/* Button Shine Effect */}
                <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform transition-transform duration-700 hover:translate-x-full"></div>
              </button>
            </div>
          </form>
        </div>

        {/* Task History */}
        {showHistory && (
          <div className="card overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Task History</h3>
                  <p className="text-slate-600 text-sm">Your previous daily task submissions</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              {taskHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">No task history yet</h4>
                  <p className="text-slate-500">Complete your first daily tasks to see them here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {taskHistory.map((task, index) => (
                    <div key={task.id} className="relative">
                      {/* Timeline Line */}
                      {index !== taskHistory.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-0 w-px bg-gradient-to-b from-emerald-200 to-transparent"></div>
                      )}
                      
                      <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start space-x-4">
                          {/* Timeline Dot */}
                          <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                              <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-1">{task.farm_name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-slate-500">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{new Date(task.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                    <div className="text-xs text-slate-600">
                                      <span>EC: {task.main_tank_ec || 'N/A'}</span>
                                      <span className="mx-2">•</span>
                                      <span>pH: {task.main_tank_ph || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 border border-indigo-100">
                                    <div className="text-xs font-semibold text-indigo-700 mb-1">💧 Dripper</div>
                                    <div className="text-xs text-slate-600">
                                      <span>EC: {task.dripper_ec || 'N/A'}</span>
                                      <span className="mx-2">•</span>
                                      <span>pH: {task.dripper_ph || 'N/A'}</span>
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
        )}
      </div>
    </Layout>
  );
};

export default DailyTasks;