import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import Breadcrumb from '../components/Breadcrumb';
import toast from 'react-hot-toast';

const FarmTasks = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Data states
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    date_from: '',
    date_to: ''
  });

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    notes: '',
    image_data: ''
  });

  // Priority and status options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' }
  ];

  useEffect(() => {
    if (farmId) {
      fetchTasks();
      fetchSummary();
    }
  }, [farmId]);

  const fetchTasks = async (newFilters = {}) => {
    try {
      setTasksLoading(true);
      const combinedFilters = { ...filters, ...newFilters };
      const cleanFilters = Object.fromEntries(
        Object.entries(combinedFilters).filter(([_, value]) => value !== '')
      );

      const response = await farmAPI.getFarmTasks(farmId, cleanFilters);
      setTasks(response.data || []);
      setFilters(combinedFilters);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await farmAPI.getFarmTasksSummary(farmId);
      setSummary(response.data || {});
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummary({});
    }
  };

  const handleAddTask = async () => {
    // Validation
    if (!taskForm.title.trim()) {
      toast.error('Please enter task title');
      return;
    }

    try {
      setLoading(true);

      // Prepare images data
      const imagesData = capturedImages.map(img => img.data);

      const taskData = {
        ...taskForm,
        image_data: imagesData.length > 0 ? imagesData : null
      };

      await farmAPI.createFarmTask(farmId, taskData);
      toast.success('Task created successfully');
      setShowAddModal(false);
      stopCamera();
      resetForm();
      fetchTasks();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create task');
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      setLoading(true);

      // Prepare images data
      const imagesData = capturedImages.map(img => img.data);

      const taskData = {
        ...taskForm,
        image_data: imagesData.length > 0 ? imagesData : taskForm.image_data
      };

      await farmAPI.updateFarmTask(farmId, selectedTask.id, taskData);
      toast.success('Task updated successfully');
      setShowEditModal(false);
      setSelectedTask(null);
      stopCamera();
      resetForm();
      fetchTasks();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update task');
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await farmAPI.deleteFarmTask(farmId, taskId);
      toast.success('Task deleted successfully');
      fetchTasks();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Failed to delete task:', error);
    }
  };

  const handleQuickStatusChange = async (task, newStatus) => {
    try {
      await farmAPI.updateFarmTask(farmId, task.id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchTasks();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Failed to update status:', error);
    }
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
      notes: '',
      image_data: ''
    });
    setCapturedImages([]);
  };

  // Camera functions (same as SpraySchedule)
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }

      setShowCamera(true);
      setCameraLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      const video = document.getElementById('cameraVideo');
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play()
            .then(() => {
              setCameraLoading(false);
            })
            .catch((err) => {
              console.error('Error playing video:', err);
              toast.error('Failed to start camera preview');
              setCameraLoading(false);
            });
        };
      } else {
        throw new Error('No camera available');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setShowCamera(false);
      setCameraLoading(false);

      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found. Please check your camera connection.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('Camera not supported by this browser.');
      } else {
        toast.error('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    const video = document.getElementById('cameraVideo');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
    setCameraLoading(false);
  };

  const capturePhoto = () => {
    if (!navigator.mediaDevices) {
      toast.error('Camera not available. Please try again.');
      return;
    }

    const video = document.getElementById('cameraVideo');
    if (!video) {
      toast.error('Camera is loading. Please wait a moment and try again.');
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error('Camera not ready. Please wait a moment and try again.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      const imageId = Date.now();
      const newImage = {
        id: imageId,
        data: dataURL,
        timestamp: new Date().toISOString()
      };

      setCapturedImages(prev => [...prev, newImage]);
      toast.success(`Photo captured successfully! (${capturedImages.length + 1} total)`);
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = {
          id: Date.now(),
          data: reader.result,
          timestamp: new Date().toISOString()
        };
        setCapturedImages(prev => [...prev, newImage]);
        toast.success('Photo selected successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (imageId) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
      notes: task.notes || '',
      image_data: task.image_data || ''
    });
    setCapturedImages([]);
    setShowEditModal(true);
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const clearFilters = () => {
    const resetFilters = { status: '', priority: '', date_from: '', date_to: '' };
    setFilters(resetFilters);
    fetchTasks(resetFilters);
  };

  const getPriorityBadge = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option ? (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${option.color}`}>
        {option.label}
      </span>
    ) : priority;
  };

  const getStatusBadge = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${option.color}`}>
        {option.label}
      </span>
    ) : status;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          farmId={farmId}
          items={[{ label: 'Farm Tasks', isClickable: false }]}
        />

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Farm Tasks</h1>
              <p className="text-slate-600">Create and manage your farm tasks</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
            >
              Add New Task
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 font-medium">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-700">{summary.total_tasks || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{summary.pending_tasks || 0}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-purple-700">{summary.in_progress_tasks || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔄</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{summary.completed_tasks || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-medium text-slate-900 mb-5">Filter Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => fetchTasks({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => fetchTasks({ ...filters, priority: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              >
                <option value="">All Priorities</option>
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => fetchTasks({ ...filters, date_from: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => fetchTasks({ ...filters, date_to: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
          <div className="p-6 border-b border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-800">My Tasks</h2>
          </div>

          {tasksLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <p className="mt-2 text-slate-600">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">No tasks found</h3>
              <p className="text-slate-500 mb-4">Start organizing your farm work by creating your first task.</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Add First Task
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200/60">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 cursor-pointer hover:text-emerald-600" onClick={() => openDetailModal(task)}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task, e.target.value)}
                          className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {task.due_date ? (
                          <div>
                            <p className="text-slate-900">{new Date(task.due_date).toLocaleDateString()}</p>
                            {task.is_overdue && task.status !== 'completed' && (
                              <span className="text-xs text-red-600 font-medium">Overdue</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No due date</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(task)}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Add New Task</h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <form className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Task Information</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Task Title *</label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="Enter task title"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        rows={3}
                        placeholder="Enter task description"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority *</label>
                        <div className="relative">
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                          >
                            {priorityOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Due Date</label>
                        <input
                          type="date"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                      <textarea
                        value={taskForm.notes}
                        onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                        rows={3}
                        placeholder="Additional notes"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                      />
                    </div>
                  </div>

                  {/* Photo Attachments Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📷</span>
                      <span>Photo Attachments</span>
                    </h4>

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-colors group shadow-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-medium">Capture</span>
                      </button>
                      <label className="flex items-center space-x-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Upload</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                    {capturedImages.length > 0 && (
                      <div className="mt-3 flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium">{capturedImages.length} Photo(s) attached successfully</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCamera(true)}
                          className="text-emerald-700 hover:text-emerald-800 text-xs font-medium whitespace-nowrap"
                        >
                          View/Edit
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200/60 px-6 py-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-sm font-medium hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none"
                  >
                    {loading ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditModal && selectedTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit Task</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTask(null);
                      resetForm();
                    }}
                    className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <form className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Task Information</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Task Title *</label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="Enter task title"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        rows={3}
                        placeholder="Enter task description"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority *</label>
                        <div className="relative">
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                          >
                            {priorityOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Status *</label>
                        <div className="relative">
                          <select
                            value={taskForm.status}
                            onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Due Date</label>
                      <input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                      <textarea
                        value={taskForm.notes}
                        onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                        rows={3}
                        placeholder="Additional notes"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                      />
                    </div>
                  </div>

                  {/* Photo Attachments Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📷</span>
                      <span>Photo Attachments</span>
                    </h4>

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-colors group shadow-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-medium">Capture</span>
                      </button>
                      <label className="flex items-center space-x-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">Upload</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                    {capturedImages.length > 0 && (
                      <div className="mt-3 flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium">{capturedImages.length} Photo(s) attached successfully</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCamera(true)}
                          className="text-emerald-700 hover:text-emerald-800 text-xs font-medium whitespace-nowrap"
                        >
                          View/Edit
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200/60 px-6 py-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTask(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateTask}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-medium hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none"
                  >
                    {loading ? 'Updating...' : 'Update Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-900 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Task Details</h3>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTask(null);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Task Title</h4>
                  <p className="text-lg font-semibold text-slate-900">{selectedTask.title}</p>
                </div>

                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Description</h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Priority</h4>
                    {getPriorityBadge(selectedTask.priority)}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Status</h4>
                    {getStatusBadge(selectedTask.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Due Date</h4>
                    <p className="text-slate-900">
                      {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>

                  {selectedTask.completed_at && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Completed At</h4>
                      <p className="text-slate-900">{new Date(selectedTask.completed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {selectedTask.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Notes</h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedTask.notes}</p>
                  </div>
                )}

                {selectedTask.image_data && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Photo Attachments</h4>
                    <img
                      src={selectedTask.image_data}
                      alt="Task attachment"
                      className="w-full max-w-md h-64 object-cover rounded-lg border-2 border-slate-200"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Created At</h4>
                    <p className="text-slate-900 text-sm">{new Date(selectedTask.created_at).toLocaleString()}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Last Updated</h4>
                    <p className="text-slate-900 text-sm">{new Date(selectedTask.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200/60 px-6 py-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTask(null);
                    }}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Camera Modal (Same as SpraySchedule) */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 flex items-center justify-between shadow-lg z-10">
                <h3 className="text-lg font-semibold text-white">Camera Capture</h3>
                <button
                  onClick={() => {
                    setShowCamera(false);
                    stopCamera();
                  }}
                  className="w-8 h-8 rounded-full hover:bg-white/20 transition-colors duration-200 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Live Camera Preview</h4>
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        id="cameraVideo"
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {cameraLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-white text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                            <p className="text-sm font-medium">Initializing camera...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={cameraLoading}
                      className={`mt-4 w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                        cameraLoading
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {cameraLoading ? 'Camera Loading...' : 'Capture Photo'}
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      Captured Images ({capturedImages.length})
                    </h4>
                    <div className="space-y-3">
                      {capturedImages.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">No images captured yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {capturedImages.map((image) => (
                            <div key={image.id} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                              <img
                                src={image.data}
                                alt={`Captured at ${image.timestamp}`}
                                className="w-20 h-20 object-cover rounded-md"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-900 truncate">
                                  Captured Image
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(image.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => removeImage(image.id)}
                                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {capturedImages.length > 0 && (
                      <button
                        onClick={() => setShowCamera(false)}
                        className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Use Images ({capturedImages.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FarmTasks;
