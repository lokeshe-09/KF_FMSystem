import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Breadcrumb from '../components/Breadcrumb';
import { farmAPI } from '../services/api';
import toast from 'react-hot-toast';

const SpraySchedule = () => {
  const { farmId } = useParams(); // Get farmId from URL if in farm-specific context
  const [farms, setFarms] = useState([]);
  const [cropStages, setCropStages] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedCropStage, setSelectedCropStage] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [formData, setFormData] = useState({
    farm: farmId || '',
    crop_zone: '',
    date_time: new Date().toISOString().slice(0, 16),
    product_used: '',
    dose_concentration: '',
    reason: 'pest',
    phi_log: '',
    worker_name: '',
    next_spray_reminder: '',
    crop_stage: '',
    weather_conditions: '',
    application_method: '',
    equipment_used: '',
    area_covered: '',
    notes: '',
    image_data: ''
  });

  useEffect(() => {
    if (!farmId) {
      // Only fetch farms if not in farm-specific context
      fetchFarms();
    } else {
      // If in farm-specific context, set farm ID directly and fetch crop stages
      setFormData(prev => ({ ...prev, farm: farmId }));
      fetchCropStages(farmId);
    }
    fetchSchedules();
  }, [farmId]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Failed to load farms');
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = farmId 
        ? await farmAPI.getFarmSpraySchedules(farmId)
        : await farmAPI.getSpraySchedules();
      setSchedules(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching spray schedules:', error);
      if (error.response && error.response.status === 404) {
        setSchedules([]);
      } else {
        toast.error('Failed to load spray schedules');
      }
      setLoading(false);
    }
  };

  const fetchCropStages = async (farmIdParam) => {
    try {
      const response = farmId 
        ? await farmAPI.getFarmCropStages(farmId)
        : await farmAPI.getCropStages({ farm: farmIdParam });
      setCropStages(response.data || []);
    } catch (error) {
      console.error('Error fetching crop stages:', error);
      setCropStages([]);
    }
  };

  const handleFarmChange = (farmId) => {
    setFormData(prev => ({ ...prev, farm: farmId, crop_stage: '' }));
    setSelectedCropStage(null);
    if (farmId) {
      fetchCropStages(farmId);
    }
  };

  const handleCropStageChange = (stageId) => {
    const stage = cropStages.find(s => s.id.toString() === stageId);
    setFormData(prev => ({ ...prev, crop_stage: stageId }));
    setSelectedCropStage(stage);
    
    if (stage) {
      setFormData(prev => ({ 
        ...prev, 
        crop_stage: stageId,
        crop_zone: `${stage.crop_name} (${stage.variety}) - ${stage.batch_code}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.farm) {
      toast.error('Please select a farm');
      return;
    }

    // Validate all required fields
    const requiredFields = [
      { field: 'crop_zone', message: 'Please enter crop zone' },
      { field: 'product_used', message: 'Please enter product used' },
      { field: 'worker_name', message: 'Please enter worker name' },
      { field: 'dose_concentration', message: 'Please enter dose/concentration' },
      { field: 'phi_log', message: 'Please enter PHI days' },
      { field: 'reason', message: 'Please select a reason' }
    ];

    for (const { field, message } of requiredFields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast.error(message);
        return;
      }
    }

    try {
      const imagesData = capturedImages.map(img => img.data);

      // Clean and prepare submit data
      const submitData = {
        crop_zone: formData.crop_zone.trim(),
        date_time: formData.date_time,
        product_used: formData.product_used.trim(),
        dose_concentration: formData.dose_concentration.trim(),
        reason: formData.reason,
        phi_log: parseInt(formData.phi_log) || 0,
        worker_name: formData.worker_name.trim(),
        next_spray_reminder: formData.next_spray_reminder || null,
        crop_stage: formData.crop_stage || null,
        weather_conditions: formData.weather_conditions?.trim() || null,
        application_method: formData.application_method?.trim() || null,
        equipment_used: formData.equipment_used?.trim() || null,
        area_covered: formData.area_covered ? parseFloat(formData.area_covered) : null,
        notes: formData.notes?.trim() || null,
        image_data: imagesData.length > 0 ? imagesData : null
      };

      // Add farm field only for non-farm-specific context (legacy endpoint)
      if (!farmId) {
        submitData.farm = formData.farm;
      }

      if (editMode && selectedSchedule) {
        if (farmId) {
          await farmAPI.updateFarmSpraySchedule(farmId, selectedSchedule.id, submitData);
        } else {
          await farmAPI.updateSpraySchedule(selectedSchedule.id, submitData);
        }
        toast.success('Spray schedule updated successfully!');
      } else {
        if (farmId) {
          await farmAPI.createFarmSpraySchedule(farmId, submitData);
        } else {
          await farmAPI.createSpraySchedule(submitData);
        }
        toast.success('Spray schedule created successfully!');
      }

      stopCamera();
      setShowForm(false);
      setEditMode(false);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving spray schedule:', error);

      // Handle validation errors from backend
      if (error.response?.data?.details) {
        const validationErrors = error.response.data.details;
        // Show specific field errors
        Object.keys(validationErrors).forEach(field => {
          const errorMsg = Array.isArray(validationErrors[field])
            ? validationErrors[field][0]
            : validationErrors[field];
          toast.error(`${field}: ${errorMsg}`);
        });
      } else {
        // Show general error message
        const errorMessage = error.response?.data?.message ||
                            error.response?.data?.error ||
                            error.message ||
                            'Failed to save spray schedule';
        toast.error(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      farm: farmId || '',
      crop_zone: '',
      date_time: new Date().toISOString().slice(0, 16),
      product_used: '',
      dose_concentration: '',
      reason: 'pest',
      phi_log: '',
      worker_name: '',
      next_spray_reminder: '',
      crop_stage: '',
      weather_conditions: '',
      application_method: '',
      equipment_used: '',
      area_covered: '',
      notes: '',
      image_data: ''
    });
    setCapturedImages([]);
    setSelectedCropStage(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      farm: schedule.farm,
      crop_zone: schedule.crop_zone,
      date_time: schedule.date_time.slice(0, 16),
      product_used: schedule.product_used,
      dose_concentration: schedule.dose_concentration,
      reason: schedule.reason,
      phi_log: schedule.phi_log.toString(),
      worker_name: schedule.worker_name,
      next_spray_reminder: schedule.next_spray_reminder ? schedule.next_spray_reminder.slice(0, 16) : '',
      crop_stage: schedule.crop_stage || '',
      weather_conditions: schedule.weather_conditions || '',
      application_method: schedule.application_method || '',
      equipment_used: schedule.equipment_used || '',
      area_covered: schedule.area_covered ? schedule.area_covered.toString() : '',
      notes: schedule.notes || '',
      image_data: schedule.image_data || ''
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleMarkComplete = async (schedule) => {
    try {
      await farmAPI.updateSpraySchedule(schedule.id, {
        is_completed: true,
        completion_date: new Date().toISOString()
      });
      toast.success('Spray marked as completed!');
      fetchSchedules();
    } catch (error) {
      console.error('Error marking spray as complete:', error);
      toast.error('Failed to mark spray as completed');
    }
  };

  const handleDelete = async (schedule) => {
    if (window.confirm('Are you sure you want to delete this spray schedule?')) {
      try {
        if (farmId) {
          await farmAPI.deleteFarmSpraySchedule(farmId, schedule.id);
        } else {
          await farmAPI.deleteSpraySchedule(schedule.id);
        }
        toast.success('Spray schedule deleted successfully!');
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting spray schedule:', error);
        toast.error('Failed to delete spray schedule');
      }
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }

      setShowCamera(true);
      setCameraLoading(true);
      
      let stream = null;
      const videoConstraints = [
        { facingMode: 'environment' },
        { facingMode: 'user' },
        true
      ];

      for (const constraint of videoConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: constraint,
            audio: false 
          });
          break;
        } catch (err) {
          continue;
        }
      }

      if (!stream) {
        throw new Error('No camera available');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setCameraLoading(false);
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
            toast.error('Failed to start camera preview');
            setCameraLoading(false);
          });
        };
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
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraLoading(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not available. Please try again.');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.readyState < 2) {
      toast.error('Camera is loading. Please wait a moment and try again.');
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera not ready. Please wait a moment and try again.');
      return;
    }

    try {
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = {
          id: Date.now(),
          data: event.target.result,
          timestamp: new Date().toISOString(),
          file: file
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

  const filteredSchedules = schedules.filter(schedule => {
    let statusMatch = true;
    let reasonMatch = true;

    if (filterStatus === 'completed') {
      statusMatch = schedule.is_completed;
    } else if (filterStatus === 'pending') {
      statusMatch = !schedule.is_completed;
    }

    if (filterReason !== 'all') {
      reasonMatch = schedule.reason === filterReason;
    }

    return statusMatch && reasonMatch;
  });

  const getStatusColor = (schedule) => {
    if (schedule.is_completed) return 'text-green-600 bg-green-100';
    if (schedule.is_reminder_due) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'pest': return 'bg-red-100 text-red-800';
      case 'disease': return 'bg-purple-100 text-purple-800';
      case 'nutrient': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-slate-600 font-medium">Loading spray schedules...</p>
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
              label: 'Spray Schedule',
              isActive: true
            }
          ]}
        />

        {/* Header */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Spray Schedule</h1>
              <p className="text-slate-600 mt-1">
                Manage and log all pesticide, fungicide, and foliar nutrient applications
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditMode(false);
                setShowForm(true);
              }}
              className="btn btn-primary"
            >
              + Schedule New Spray
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status Filter
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-40"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason Filter
              </label>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="input w-40"
              >
                <option value="all">All Reasons</option>
                <option value="pest">Pest Control</option>
                <option value="disease">Disease Control</option>
                <option value="nutrient">Nutrient Application</option>
              </select>
            </div>
          </div>
        </div>

        {/* Spray Schedules List */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Spray Schedules ({filteredSchedules.length})
          </h2>
          
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No spray schedules found</h3>
              <p className="text-slate-500">
                {filterStatus !== 'all' || filterReason !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first spray schedule to get started.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSchedules.map((schedule) => (
                <div key={schedule.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {schedule.spray_id}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(schedule)}`}>
                          {schedule.is_completed ? 'Completed' : 'Pending'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getReasonColor(schedule.reason)}`}>
                          {schedule.reason_display}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">Crop Zone:</span>
                          <p className="text-slate-600">{schedule.crop_zone}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Product:</span>
                          <p className="text-slate-600">{schedule.product_used}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Worker:</span>
                          <p className="text-slate-600">{schedule.worker_name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">PHI:</span>
                          <p className="text-slate-600">{schedule.phi_log} days</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-medium">Scheduled:</span> {new Date(schedule.date_time).toLocaleString()}
                        {schedule.is_phi_complete !== undefined && schedule.days_until_harvest_safe !== null && (
                          <span className="ml-4">
                            <span className="font-medium">Harvest Safe:</span> 
                            <span className={schedule.is_phi_complete ? 'text-green-600' : 'text-orange-600'}>
                              {schedule.is_phi_complete ? 'Yes' : `${schedule.days_until_harvest_safe} days`}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setShowDetailModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        View Details
                      </button>
                      
                      {!schedule.is_completed && (
                        <>
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleMarkComplete(schedule)}
                            className="btn btn-success btn-sm"
                          >
                            Mark Complete
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDelete(schedule)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-[440px] sm:max-w-[480px] md:max-w-[520px] w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-in fade-in-0 zoom-in-95">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 border-b border-emerald-600/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🌿</span>
                    <h3 className="text-lg font-semibold">
                      {editMode ? 'Edit Spray Schedule' : 'Schedule New Spray'}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditMode(false);
                      stopCamera();
                    }}
                    className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Scrollable Form Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>🌱</span>
                      <span>Basic Information</span>
                    </h4>
                    {/* Farm Selection - Only show if not in farm-specific context */}
                    {!farmId && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Farm *</label>
                        <div className="relative">
                          <select
                            name="farm"
                            value={formData.farm}
                            onChange={(e) => handleFarmChange(e.target.value)}
                            required
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                          >
                            <option value="">Select Farm</option>
                            {farms.map((farm) => (
                              <option key={farm.id} value={farm.id}>
                                {farm.name} - {farm.location}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Crop Zone *</label>
                      <input
                        type="text"
                        name="crop_zone"
                        value={formData.crop_zone}
                        onChange={handleChange}
                        required
                        placeholder="Block A - Tomato Section"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Date & Time *</label>
                        <input
                          type="datetime-local"
                          name="date_time"
                          value={formData.date_time}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Worker Name *</label>
                        <input
                          type="text"
                          name="worker_name"
                          value={formData.worker_name}
                          onChange={handleChange}
                          required
                          placeholder="Worker applying spray"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>🧪</span>
                      <span>Product Information</span>
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Product Used *</label>
                      <input
                        type="text"
                        name="product_used"
                        value={formData.product_used}
                        onChange={handleChange}
                        required
                        placeholder="Mancozeb 75% WP"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Dose/Concentration *</label>
                      <input
                        type="text"
                        name="dose_concentration"
                        value={formData.dose_concentration}
                        onChange={handleChange}
                        required
                        placeholder="2g/L or 500ml/acre"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason *</label>
                        <div className="relative">
                          <select
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                          >
                            <option value="pest">Pest Control</option>
                            <option value="disease">Disease Control</option>
                            <option value="nutrient">Nutrient Application</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">PHI Days *</label>
                        <input
                          type="number"
                          name="phi_log"
                          value={formData.phi_log}
                          onChange={handleChange}
                          required
                          min="0"
                          placeholder="Days before harvest"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Additional Information</span>
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Next Spray Reminder</label>
                      <input
                        type="datetime-local"
                        name="next_spray_reminder"
                        value={formData.next_spray_reminder}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Crop Stage</label>
                      <div className="relative">
                        <select
                          name="crop_stage"
                          value={formData.crop_stage}
                          onChange={(e) => handleCropStageChange(e.target.value)}
                          className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                        >
                          <option value="">Select Crop Stage</option>
                          {cropStages.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.crop_name} ({stage.variety}) - {stage.current_stage_display}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Weather Conditions</label>
                        <input
                          type="text"
                          name="weather_conditions"
                          value={formData.weather_conditions}
                          onChange={handleChange}
                          placeholder="Sunny, 25°C, Light wind"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Application Method</label>
                        <input
                          type="text"
                          name="application_method"
                          value={formData.application_method}
                          onChange={handleChange}
                          placeholder="Foliar spray, Soil drench"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Equipment Used</label>
                        <input
                          type="text"
                          name="equipment_used"
                          value={formData.equipment_used}
                          onChange={handleChange}
                          placeholder="Knapsack sprayer, Power sprayer"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Area Covered (acres)</label>
                        <input
                          type="number"
                          name="area_covered"
                          value={formData.area_covered}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          placeholder="Area in acres"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Additional notes about the spray application..."
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                        style={{ minHeight: '80px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Photo Attachments</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 group"
                        >
                          <svg className="w-4 h-4 mr-2 text-slate-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-700">Capture</span>
                        </button>

                        <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer group">
                          <svg className="w-4 h-4 mr-2 text-slate-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-700">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      {capturedImages.length > 0 && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                          <div className="flex items-center text-emerald-800">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                            <span className="text-xs font-medium">Photo(s) attached successfully</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Buttons - Moved inside form */}
                  <div className="sticky bottom-0 bg-white border-t border-slate-200/60 px-6 py-4 -mx-4 sm:-mx-6">
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditMode(false);
                          stopCamera();
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-sm font-medium hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <span>🌿</span>
                          <span>{editMode ? 'Update Schedule' : 'Create Schedule'}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto shadow-2xl">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Camera Capture</h3>
                  <button
                    onClick={() => {
                      setShowCamera(false);
                      if (videoRef.current && videoRef.current.srcObject) {
                        const tracks = videoRef.current.srcObject.getTracks();
                        tracks.forEach(track => track.stop());
                      }
                    }}
                    className="text-white/80 hover:text-white transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Live Camera Preview</h4>
                    <div className="relative bg-black rounded-xl overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover"
                        style={{
                          transform: 'scaleX(-1)'
                        }}
                      />
                      {cameraLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                            <p className="text-sm font-medium">Initializing camera...</p>
                          </div>
                        </div>
                      )}
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                    <button
                      onClick={capturePhoto}
                      disabled={cameraLoading}
                      className={`w-full mt-4 px-6 py-3 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg ${
                        cameraLoading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-0.5'
                      }`}
                    >
                      <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                      </svg>
                      {cameraLoading ? 'Camera Loading...' : 'Capture Photo'}
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      Captured Images ({capturedImages.length})
                    </h4>
                    <div className="h-64 overflow-y-auto border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                      {capturedImages.length === 0 ? (
                        <div className="text-center text-slate-500 py-16">
                          <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">No images captured yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {capturedImages.map((image) => (
                            <div key={image.id} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                              <img
                                src={image.data}
                                alt={`Captured at ${image.timestamp}`}
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                  Captured Image
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(image.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => removeImage(image.id)}
                                className="text-red-500 hover:text-red-700 transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200"
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

        {/* Detail Modal */}
        {showDetailModal && selectedSchedule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Spray Schedule Details
                  </h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Spray ID:</span> {selectedSchedule.spray_id}</div>
                        <div><span className="font-medium">Crop Zone:</span> {selectedSchedule.crop_zone}</div>
                        <div><span className="font-medium">Date & Time:</span> {new Date(selectedSchedule.date_time).toLocaleString()}</div>
                        <div><span className="font-medium">Worker:</span> {selectedSchedule.worker_name}</div>
                        <div><span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedSchedule)}`}>
                            {selectedSchedule.is_completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Product Information</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Product:</span> {selectedSchedule.product_used}</div>
                        <div><span className="font-medium">Dose/Concentration:</span> {selectedSchedule.dose_concentration}</div>
                        <div><span className="font-medium">Reason:</span> 
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getReasonColor(selectedSchedule.reason)}`}>
                            {selectedSchedule.reason_display}
                          </span>
                        </div>
                        <div><span className="font-medium">PHI:</span> {selectedSchedule.phi_log} days</div>
                      </div>
                    </div>
                  </div>

                  {(selectedSchedule.weather_conditions || selectedSchedule.application_method || selectedSchedule.equipment_used || selectedSchedule.area_covered) && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Additional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {selectedSchedule.weather_conditions && (
                          <div><span className="font-medium">Weather:</span> {selectedSchedule.weather_conditions}</div>
                        )}
                        {selectedSchedule.application_method && (
                          <div><span className="font-medium">Method:</span> {selectedSchedule.application_method}</div>
                        )}
                        {selectedSchedule.equipment_used && (
                          <div><span className="font-medium">Equipment:</span> {selectedSchedule.equipment_used}</div>
                        )}
                        {selectedSchedule.area_covered && (
                          <div><span className="font-medium">Area:</span> {selectedSchedule.area_covered} acres</div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedSchedule.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Notes</h3>
                      <p className="text-sm text-slate-600">{selectedSchedule.notes}</p>
                    </div>
                  )}

                  {selectedSchedule.next_spray_reminder && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Next Spray Reminder</h3>
                      <p className="text-sm text-slate-600">
                        {new Date(selectedSchedule.next_spray_reminder).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedSchedule.image_data && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Photo Attachments</h3>
                      <img
                        src={selectedSchedule.image_data}
                        alt="Spray attachment"
                        className="w-full max-w-md rounded-lg border border-slate-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SpraySchedule;