import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import Breadcrumb from '../components/Breadcrumb';
import toast from 'react-hot-toast';

const WorkerTaskManagement = () => {
  const { farmId } = useParams(); // Get farmId from URL if in farm-specific context
  const [activeTab, setActiveTab] = useState('workers');
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Data states
  const [workers, setWorkers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Filter states
  const [taskFilters, setTaskFilters] = useState({
    worker: '',
    status: '',
    date_from: ''
  });
  
  // Modal states
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskUpdateModal, setShowTaskUpdateModal] = useState(false);
  
  // Edit states
  const [editingWorker, setEditingWorker] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  
  // Form states
  const [workerForm, setWorkerForm] = useState({
    name: '',
    employment_type: 'permanent',
    wage_per_day: '',
    phone_number: '',
    address: '',
    farm: farmId || ''
  });
  
  const [taskForm, setTaskForm] = useState({
    worker: '',
    task_description: '',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: ''
  });
  
  const [taskUpdateForm, setTaskUpdateForm] = useState({
    status: '',
    remarks: '',
    completion_notes: ''
  });
  

  useEffect(() => {
    if (!farmId) {
      // Only fetch farms if not in farm-specific context
      fetchFarms();
    }
    fetchWorkers();
    fetchTasks();
  }, [farmId]);

  const fetchWorkers = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await farmAPI.getWorkers(filters);
      setWorkers(response.data);
    } catch (error) {
      toast.error('Failed to fetch workers');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
    } catch (error) {
      toast.error('Failed to fetch farms');
    }
  };

  const fetchTasks = async (newFilters = {}) => {
    try {
      setTasksLoading(true);
      const combinedFilters = { ...taskFilters, ...newFilters };
      // Remove empty filter values
      const cleanFilters = Object.fromEntries(
        Object.entries(combinedFilters).filter(([_, value]) => value !== '')
      );
      console.log('Fetching tasks with filters:', cleanFilters);
      const response = await farmAPI.getWorkerTasks(cleanFilters);
      console.log('Tasks response:', response.data);
      setTasks(response.data);
      setTaskFilters(combinedFilters);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setTasksLoading(false);
    }
  };
  
  const clearFilters = () => {
    const resetFilters = { worker: '', status: '', date_from: '' };
    setTaskFilters(resetFilters);
    fetchTasks(resetFilters);
  };


  const handleCreateWorker = async () => {
    try {
      if (editingWorker) {
        await farmAPI.updateWorker(editingWorker.id, workerForm);
        toast.success('Worker updated successfully');
      } else {
        await farmAPI.createWorker(workerForm);
        toast.success('Worker created successfully');
      }
      setShowWorkerModal(false);
      setEditingWorker(null);
      setWorkerForm({
        name: '',
        employment_type: 'permanent',
        wage_per_day: '',
        phone_number: '',
        address: '',
        farm: ''
      });
      fetchWorkers();
      // Also refresh tasks to show updated worker data
      fetchTasks();
    } catch (error) {
      toast.error('Failed to save worker');
    }
  };

  const handleCreateTask = async () => {
    try {
      const taskData = {
        worker: taskForm.worker,
        task_description: taskForm.task_description,
        assigned_date: taskForm.assigned_date,
        due_date: taskForm.due_date || null,
        status: 'pending'
      };
      await farmAPI.createWorkerTask(taskData);
      toast.success('Task assigned successfully');
      setShowTaskModal(false);
      setTaskForm({
        worker: '',
        task_description: '',
        assigned_date: new Date().toISOString().split('T')[0],
        due_date: ''
      });
      
      // Refresh tasks data to update current tasks display
      await fetchTasks();
      console.log('Task created and data refreshed');
    } catch (error) {
      console.error('Task creation error:', error);
      toast.error('Failed to assign task');
    }
  };

  const handleUpdateTask = async () => {
    try {
      await farmAPI.updateWorkerTask(editingTask.id, taskUpdateForm);
      toast.success('Task updated successfully');
      setShowTaskUpdateModal(false);
      setEditingTask(null);
      setTaskUpdateForm({
        status: '',
        remarks: '',
        completion_notes: ''
      });
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };



  const renderWorkers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Workers Management</h2>
        <button 
          onClick={() => setShowWorkerModal(true)}
          className="btn-primary"
        >
          Add New Worker
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
              <p className="ml-4 text-slate-600">Loading workers...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👷</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workers found</h3>
              <p className="text-gray-500 mb-6">
                Start by adding workers to your farm to manage their tasks and assignments.
              </p>
              <button 
                onClick={() => setShowWorkerModal(true)}
                className="btn-primary"
              >
                Add First Worker
              </button>
            </div>
          ) : (
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employment Type</th>
                  <th>Wage/Day</th>
                  <th>Phone</th>
                  <th>Farm</th>
                  <th>Current Tasks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => {
                // Debug: Check if tasks and worker data are properly loaded
                console.log('Worker:', worker.id, worker.name);
                console.log('All tasks:', tasks.map(t => ({id: t.id, worker_id: t.worker_id, worker: t.worker, status: t.status, desc: t.task_description})));
                
                const workerTasks = tasks.filter(task => {
                  // Try multiple ways to match worker ID
                  const matchesById = task.worker_id === worker.id;
                  const matchesByWorker = task.worker === worker.id;
                  const isActive = task.status === 'pending';
                  
                  console.log(`Task ${task.id}: worker_id=${task.worker_id}, worker=${task.worker}, status=${task.status}, matches=${matchesById || matchesByWorker}, active=${isActive}`);
                  
                  return (matchesById || matchesByWorker) && isActive;
                });
                
                console.log(`Worker ${worker.name} has ${workerTasks.length} active tasks:`, workerTasks.map(t => t.task_description));
                
                return (
                  <tr key={worker.id}>
                    <td>
                      <div>
                        <p className="font-medium">{worker.name}</p>
                        <p className="text-sm text-gray-500">{worker.address || 'No address'}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        worker.employment_type === 'permanent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {worker.employment_type === 'permanent' ? 'Permanent' : 'Temporary'}
                      </span>
                    </td>
                    <td className="font-medium">₹{worker.wage_per_day}</td>
                    <td>{worker.phone_number || 'N/A'}</td>
                    <td>{worker.farm?.name || worker.farm_name || 'No farm assigned'}</td>
                    <td>
                      {workerTasks.length > 0 ? (
                        <div className="space-y-1">
                          {workerTasks.slice(0, 2).map(task => (
                            <div key={task.id} className="text-xs bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                              {task.task_description.length > 30 
                                ? `${task.task_description.substring(0, 30)}...` 
                                : task.task_description
                              }
                            </div>
                          ))}
                          {workerTasks.length > 2 && (
                            <div className="text-xs text-blue-600">+{workerTasks.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No active tasks</span>
                      )}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setEditingWorker(worker);
                            setWorkerForm({
                              name: worker.name,
                              employment_type: worker.employment_type,
                              wage_per_day: worker.wage_per_day,
                              phone_number: worker.phone_number || '',
                              address: worker.address || '',
                              farm: worker.farm?.id || ''
                            });
                            setShowWorkerModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            setTaskForm({
                              worker: worker.id,
                              task_description: '',
                              assigned_date: new Date().toISOString().split('T')[0],
                              due_date: ''
                            });
                            setShowTaskModal(true);
                          }}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Assign Task
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Add useEffect at component level for data fetching
  useEffect(() => {
    if (activeTab === 'workers') {
      fetchWorkers();
    } else if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab]);

  const renderTasks = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Worker Tasks</h2>
          <button 
            onClick={() => setShowTaskModal(true)}
            className="btn-primary"
          >
            Assign Task
          </button>
        </div>

        {/* Task Filters */}
        <div className="card p-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select 
                className="input" 
                value={taskFilters.worker}
                onChange={(e) => fetchTasks({worker: e.target.value})}
              >
                <option value="">All Workers</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              <select 
                className="input"
                value={taskFilters.status}
                onChange={(e) => fetchTasks({status: e.target.value})}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="issue">Issue</option>
              </select>
              <input 
                type="date" 
                className="input" 
                placeholder="Date" 
                value={taskFilters.date_from}
                onChange={(e) => fetchTasks({date_from: e.target.value})} 
              />
            </div>
            {(taskFilters.worker || taskFilters.status || taskFilters.date_from) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {taskFilters.worker && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Worker: {workers.find(w => w.id == taskFilters.worker)?.name}
                  </span>
                )}
                {taskFilters.status && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Status: {taskFilters.status}
                  </span>
                )}
                {taskFilters.date_from && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    From: {new Date(taskFilters.date_from).toLocaleDateString()}
                  </span>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-xs text-red-600 hover:text-red-800 underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            {tasksLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loading-spinner"></div>
                <p className="ml-4 text-slate-600">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-500 mb-6">
                  {taskFilters.worker || taskFilters.status || taskFilters.date_from
                    ? "No tasks match your current filters. Try adjusting your search criteria."
                    : "No tasks have been assigned yet. Start by assigning tasks to your workers."}
                </p>
                {(taskFilters.worker || taskFilters.status || taskFilters.date_from) ? (
                  <button 
                    onClick={clearFilters}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowTaskModal(true)}
                    className="btn-primary"
                  >
                    Assign First Task
                  </button>
                )}
              </div>
            ) : (
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div>
                          <p className="font-medium">{task.worker_name || 'Unknown Worker'}</p>
                          <p className="text-sm text-gray-500 capitalize">
                            {task.worker_employment_type || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm text-gray-900 mb-1">{task.task_description}</p>
                          {task.due_date && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <span>📅</span>
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'issue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'completed' ? '✅ Completed' :
                           task.status === 'pending' ? '⏳ Pending' :
                           task.status === 'issue' ? '⚠️ Issue' :
                           task.status}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">
                          <p>{new Date(task.assigned_date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">
                            {Math.ceil((new Date() - new Date(task.assigned_date)) / (1000 * 60 * 60 * 24))} days ago
                          </p>
                        </div>
                      </td>
                      <td>
                        <button 
                          onClick={() => {
                            setEditingTask(task);
                            setTaskUpdateForm({
                              status: task.status || '',
                              remarks: task.remarks || '',
                              completion_notes: task.completion_notes || ''
                            });
                            setShowTaskUpdateModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };



  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-slate-600">Loading worker management...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          farmId={farmId}
          items={[
            {
              label: 'Worker Tasks',
              isActive: true
            }
          ]}
        />

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
          <p className="text-gray-600">Manage workers, assign tasks and track their progress</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('workers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'workers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workers
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tasks
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'workers' ? renderWorkers() : renderTasks()}

        {/* Worker Modal */}
        {showWorkerModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 sm:mx-auto shadow-2xl transform animate-scaleIn overflow-hidden">
              
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-teal-500 to-green-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">👷</span>
                  {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                </h3>
                <button
                  onClick={() => {
                    setShowWorkerModal(false);
                    setEditingWorker(null);
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                
                {/* Worker Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Worker Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({...workerForm, name: e.target.value})}
                    required
                  />
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Employment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-teal-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={workerForm.employment_type}
                    onChange={(e) => setWorkerForm({...workerForm, employment_type: e.target.value})}
                    required
                  >
                    <option value="permanent">🏢 Permanent</option>
                    <option value="temporary">⏰ Temporary</option>
                  </select>
                </div>

                {/* Daily Wage */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Daily Wage <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="Enter daily wage"
                      className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                      value={workerForm.wage_per_day}
                      onChange={(e) => setWorkerForm({...workerForm, wage_per_day: e.target.value})}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={workerForm.phone_number}
                    onChange={(e) => setWorkerForm({...workerForm, phone_number: e.target.value})}
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Address
                  </label>
                  <textarea
                    placeholder="Enter address"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md resize-none"
                    rows={2}
                    value={workerForm.address}
                    onChange={(e) => setWorkerForm({...workerForm, address: e.target.value})}
                    style={{minHeight: '44px'}}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                  />
                </div>

                {/* Select Farm */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Select Farm <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-teal-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={workerForm.farm}
                    onChange={(e) => setWorkerForm({...workerForm, farm: e.target.value})}
                    required
                  >
                    <option value="">Select Farm</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        🌾 {farm.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowWorkerModal(false);
                      setEditingWorker(null);
                      setWorkerForm({
                        name: '',
                        employment_type: 'permanent',
                        wage_per_day: '',
                        phone_number: '',
                        address: '',
                        farm: ''
                      });
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateWorker} 
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-medium rounded-full hover:from-green-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-green-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {editingWorker ? '✨ Update Worker' : '🚀 Create Worker'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Task Assignment Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-sm w-full mx-4 sm:mx-auto shadow-2xl transform animate-scaleIn overflow-hidden">
              
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  Assign Task
                </h3>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskForm({
                      worker: '',
                      task_description: '',
                      assigned_date: new Date().toISOString().split('T')[0],
                      due_date: ''
                    });
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                
                {/* Worker Selection */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Worker <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={taskForm.worker}
                    onChange={(e) => setTaskForm({...taskForm, worker: e.target.value})}
                    required
                  >
                    <option value="">Select Worker</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        👷 {worker.name} ({worker.employment_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Task Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe the task in detail..."
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md resize-none"
                    rows={3}
                    value={taskForm.task_description}
                    onChange={(e) => setTaskForm({...taskForm, task_description: e.target.value})}
                    style={{minHeight: '76px'}}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.max(76, e.target.scrollHeight) + 'px';
                    }}
                    required
                  />
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assigned Date */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Assigned Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                      value={taskForm.assigned_date}
                      onChange={(e) => setTaskForm({...taskForm, assigned_date: e.target.value})}
                      required
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Due Date
                    </label>
                    <input
                      type="date"
                      placeholder="Select due date"
                      className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                      min={taskForm.assigned_date}
                    />
                  </div>
                </div>

                {/* Task Preview */}
                {taskForm.worker && taskForm.task_description && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2 animate-slideDown">
                    <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                      <span>📋</span>
                      Task Preview
                    </div>
                    <div className="text-sm text-blue-600">
                      <span className="font-medium">
                        {workers.find(w => w.id == taskForm.worker)?.name || 'Selected Worker'}
                      </span>
                      {' will be assigned: '}
                      <span className="italic">"{taskForm.task_description.substring(0, 50)}{taskForm.task_description.length > 50 ? '...' : ''}"</span>
                    </div>
                    {taskForm.due_date && (
                      <div className="text-xs text-blue-500">
                        📅 Due: {new Date(taskForm.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setTaskForm({
                        worker: '',
                        task_description: '',
                        assigned_date: new Date().toISOString().split('T')[0],
                        due_date: ''
                      });
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateTask} 
                    disabled={!taskForm.worker || !taskForm.task_description}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-400 to-indigo-400 text-white font-medium rounded-full hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    📝 Assign Task
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Task Update Modal */}
        {showTaskUpdateModal && editingTask && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-auto transform animate-scaleIn">
              
              {/* Modal Content */}
              <div className="p-6 space-y-5">
                
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✏️</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Update Task</h3>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-gray-700">
                      {editingTask.worker_name || 'Worker'}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed px-2">
                      {editingTask.task_description}
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  
                  {/* Status Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200"
                      value={taskUpdateForm.status}
                      onChange={(e) => setTaskUpdateForm({...taskUpdateForm, status: e.target.value})}
                    >
                      <option value="">Choose status...</option>
                      <option value="completed">✅ Completed</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="issue">⚠️ Issue</option>
                    </select>
                  </div>

                  {/* Completion Notes - Conditional */}
                  {taskUpdateForm.status === 'completed' && (
                    <div className="space-y-1.5 animate-slideDown">
                      <label className="block text-xs font-medium text-green-600 uppercase tracking-wide">
                        Completion Notes
                      </label>
                      <textarea
                        placeholder="How was the task completed? 🎆"
                        className="w-full px-3 py-2.5 bg-green-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-green-400 focus:ring-2 focus:ring-green-200 focus:bg-white transition-all duration-200 resize-none"
                        rows={3}
                        value={taskUpdateForm.completion_notes}
                        onChange={(e) => setTaskUpdateForm({...taskUpdateForm, completion_notes: e.target.value})}
                      />
                    </div>
                  )}

                  {/* Remarks Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Remarks
                    </label>
                    <textarea
                      placeholder="Any additional notes? 💭"
                      className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 resize-none"
                      rows={2}
                      value={taskUpdateForm.remarks}
                      onChange={(e) => setTaskUpdateForm({...taskUpdateForm, remarks: e.target.value})}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={handleUpdateTask} 
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-medium rounded-full hover:from-green-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-green-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl text-sm animate-bounce-gentle"
                  >
                    Update Task ✨
                  </button>
                  <button
                    onClick={() => {
                      setShowTaskUpdateModal(false);
                      setEditingTask(null);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default WorkerTaskManagement;