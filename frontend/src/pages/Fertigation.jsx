import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import toast from 'react-hot-toast';

const Fertigation = () => {
  const [fertigations, setFertigations] = useState([]);
  const [farms, setFarms] = useState([]);
  const [cropStages, setCropStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingFertigation, setEditingFertigation] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('logs');
  const [nutrients, setNutrients] = useState([{ product_name: '', quantity: '', unit: 'kg' }]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [formData, setFormData] = useState({
    farm: '',
    crop_stage: '',
    crop_zone_name: '',
    date_time: new Date().toISOString().slice(0, 16),
    operator_name: '',
    remarks: '',
    ec_before: '',
    ph_before: '',
    ec_after: '',
    ph_after: '',
    water_volume: '',
    nutrients_used: [],
    status: 'completed',
    image_data: null
  });

  const [scheduleData, setScheduleData] = useState({
    farm: '',
    crop_stage: '',
    crop_zone_name: '',
    scheduled_date: new Date().toISOString().slice(0, 16),
    operator_name: '',
    remarks: '',
    ec_before: '',
    ph_before: '',
    ec_after: '',
    ph_after: '',
    water_volume: '',
    nutrients_used: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchFertigations(),
        fetchFarms(),
        fetchAnalytics()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchFertigations = async () => {
    try {
      const response = await farmAPI.getFertigations();
      setFertigations(response.data || []);
    } catch (error) {
      console.error('Error fetching fertigations:', error);
      setFertigations([]);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const fetchCropStages = async (farmId) => {
    try {
      const response = await farmAPI.getCropStages({ farm: farmId });
      setCropStages(response.data || []);
    } catch (error) {
      console.error('Error fetching crop stages:', error);
      setCropStages([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await farmAPI.getFertigationAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
      
      if (dataURL === 'data:,') {
        toast.error('Failed to capture image. Please try again.');
        return;
      }

      const newImage = {
        id: Date.now(),
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const imagesData = capturedImages.map(img => img.data);
    
    const data = {
      ...formData,
      nutrients_used: nutrients.filter(n => n.product_name && n.quantity),
      image_data: imagesData.length > 0 ? imagesData : null
    };

    try {
      if (editingFertigation) {
        await farmAPI.updateFertigation(editingFertigation.id, data);
        toast.success('Fertigation updated successfully!');
      } else {
        await farmAPI.createFertigation(data);
        toast.success('Fertigation logged successfully!');
      }
      
      resetForm();
      setShowForm(false);
      setShowCamera(false);
      setCapturedImages([]);
      fetchFertigations();
      fetchAnalytics();
    } catch (error) {
      console.error('Error saving fertigation:', error);
      toast.error('Failed to save fertigation');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...scheduleData,
      nutrients_used: nutrients.filter(n => n.product_name && n.quantity) || [],
      date_time: scheduleData.scheduled_date,
      scheduled_date: scheduleData.scheduled_date,
      status: 'scheduled',
      is_scheduled: true,
      // Provide default values for required fields
      ec_before: scheduleData.ec_before || 0.0,
      ph_before: scheduleData.ph_before || 7.0,
      ec_after: scheduleData.ec_after || 0.0,
      ph_after: scheduleData.ph_after || 7.0,
      water_volume: scheduleData.water_volume || 0.0
    };

    try {
      await farmAPI.createFertigationSchedule(data);
      toast.success('Fertigation scheduled successfully!');
      setShowScheduleForm(false);
      resetScheduleForm();
      fetchFertigations();
    } catch (error) {
      console.error('Error scheduling fertigation:', error);
      toast.error('Failed to schedule fertigation');
    }
  };

  const resetForm = () => {
    setFormData({
      farm: '',
      crop_stage: '',
      crop_zone_name: '',
      date_time: new Date().toISOString().slice(0, 16),
      operator_name: '',
      remarks: '',
      ec_before: '',
      ph_before: '',
      ec_after: '',
      ph_after: '',
      water_volume: '',
      nutrients_used: [],
      status: 'completed',
      image_data: null
    });
    setNutrients([{ product_name: '', quantity: '', unit: 'kg' }]);
    setEditingFertigation(null);
    setCapturedImages([]);
  };

  const resetScheduleForm = () => {
    setScheduleData({
      farm: '',
      crop_stage: '',
      crop_zone_name: '',
      scheduled_date: new Date().toISOString().slice(0, 16),
      operator_name: '',
      remarks: '',
      ec_before: '',
      ph_before: '',
      ec_after: '',
      ph_after: '',
      water_volume: '',
      nutrients_used: []
    });
    setNutrients([{ product_name: '', quantity: '', unit: 'kg' }]);
  };

  const handleEdit = (fertigation) => {
    setEditingFertigation(fertigation);
    setFormData({
      farm: fertigation.farm,
      crop_stage: fertigation.crop_stage || '',
      crop_zone_name: fertigation.crop_zone_name,
      date_time: fertigation.date_time.slice(0, 16),
      operator_name: fertigation.operator_name,
      remarks: fertigation.remarks || '',
      ec_before: fertigation.ec_before,
      ph_before: fertigation.ph_before,
      ec_after: fertigation.ec_after,
      ph_after: fertigation.ph_after,
      water_volume: fertigation.water_volume,
      status: fertigation.status
    });
    setNutrients(fertigation.nutrients_used.length > 0 ? fertigation.nutrients_used : [{ product_name: '', quantity: '', unit: 'kg' }]);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this fertigation record?')) {
      try {
        await farmAPI.deleteFertigation(id);
        toast.success('Fertigation deleted successfully');
        fetchFertigations();
        fetchAnalytics();
      } catch (error) {
        console.error('Error deleting fertigation:', error);
        toast.error('Failed to delete fertigation');
      }
    }
  };

  const addNutrient = () => {
    setNutrients([...nutrients, { product_name: '', quantity: '', unit: 'kg' }]);
  };

  const removeNutrient = (index) => {
    setNutrients(nutrients.filter((_, i) => i !== index));
  };

  const updateNutrient = (index, field, value) => {
    const updated = nutrients.map((nutrient, i) => 
      i === index ? { ...nutrient, [field]: value } : nutrient
    );
    setNutrients(updated);
  };

  const handleFarmChange = (farmId, isSchedule = false) => {
    if (isSchedule) {
      setScheduleData(prev => ({ ...prev, farm: farmId, crop_stage: '' }));
    } else {
      setFormData(prev => ({ ...prev, farm: farmId, crop_stage: '' }));
    }
    setCropStages([]);
    if (farmId) {
      fetchCropStages(farmId);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.completed;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDateTime = (dateTimeStr) => {
    return new Date(dateTimeStr).toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="text-emerald-700 font-medium text-lg">Loading fertigation data...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">Fertigation Management</h1>
                      <p className="text-slate-600 mt-1">Track nutrient solutions, EC/pH monitoring, and scheduling</p>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  {analytics && (
                    <div className="flex flex-wrap gap-6 mt-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-slate-600">
                          {analytics.total_fertigations} Total Applications
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-slate-600">
                          {analytics.total_water_used?.toFixed(1) || 0}L Water Used
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-slate-600">
                          Avg EC: {analytics.avg_ec_change?.toFixed(2) || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 lg:mt-0 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowScheduleForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Log Fertigation
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'logs', label: 'Fertigation Logs', count: fertigations.length },
                  { key: 'schedule', label: 'Scheduled', count: fertigations.filter(f => f.status === 'scheduled').length },
                  { key: 'analytics', label: 'Analytics', count: null }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      activeTab === key
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                    {count !== null && count > 0 && (
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        activeTab === key
                          ? 'bg-emerald-200 text-emerald-800'
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

          {/* Content based on active tab */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-slate-200/60">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Fertigation Records ({fertigations.length})
                </h2>
              </div>
              
              <div className="p-8">
                {fertigations.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No fertigation records yet</h3>
                    <p className="text-slate-500 mb-6">Start by logging your first fertigation activity.</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Log First Fertigation
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/6">Crop/Zone & Farm</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/6">Date & Operator</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/4">EC/pH Values</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/5">Water & Nutrients</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/6">Status & Remarks</th>
                            <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {fertigations.map((fertigation, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                              {/* Crop/Zone & Farm */}
                              <td className="px-4 py-4 align-top">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-900 truncate">{fertigation.crop_zone_name}</div>
                                  <div className="text-xs text-slate-500 mt-1">Farm: {fertigation.farm_name}</div>
                                  {fertigation.crop_stage_info && (
                                    <div className="text-xs text-emerald-600 mt-1 truncate">
                                      Stage: {fertigation.crop_stage_info.crop_name} ({fertigation.crop_stage_info.variety})
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Date & Operator */}
                              <td className="px-4 py-4 align-top">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-900">{formatDateTime(fertigation.date_time)}</div>
                                  <div className="text-xs text-slate-500 mt-1">Operator: {fertigation.operator_name}</div>
                                  {fertigation.scheduled_date && fertigation.status === 'scheduled' && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      Scheduled: {formatDateTime(fertigation.scheduled_date)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* EC/pH Values */}
                              <td className="px-4 py-4 align-top">
                                <div className="text-xs space-y-1.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <div className="text-slate-500 mb-0.5">EC Before:</div>
                                      <div className="font-semibold text-slate-700">{fertigation.ec_before} mS/cm</div>
                                    </div>
                                    <div>
                                      <div className="text-slate-500 mb-0.5">EC After:</div>
                                      <div className="font-semibold text-slate-700">{fertigation.ec_after} mS/cm</div>
                                    </div>
                                    <div>
                                      <div className="text-slate-500 mb-0.5">pH Before:</div>
                                      <div className="font-semibold text-slate-700">{fertigation.ph_before}</div>
                                    </div>
                                    <div>
                                      <div className="text-slate-500 mb-0.5">pH After:</div>
                                      <div className="font-semibold text-slate-700">{fertigation.ph_after}</div>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-slate-200">
                                    <div className="flex justify-between items-center">
                                      <span className={`text-xs font-semibold ${fertigation.ec_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ΔEC: {fertigation.ec_change > 0 ? '+' : ''}{fertigation.ec_change?.toFixed(2)}
                                      </span>
                                      <span className={`text-xs font-semibold ${fertigation.ph_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ΔpH: {fertigation.ph_change > 0 ? '+' : ''}{fertigation.ph_change?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Water & Nutrients */}
                              <td className="px-4 py-4 align-top">
                                <div className="space-y-2">
                                  <div className="flex items-center bg-blue-50 px-2 py-1 rounded">
                                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-blue-700">{fertigation.water_volume}L</span>
                                  </div>
                                  {fertigation.nutrients_used && fertigation.nutrients_used.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nutrients:</div>
                                      <div className="space-y-1 max-h-20 overflow-y-auto">
                                        {fertigation.nutrients_used.map((nutrient, idx) => (
                                          <div key={idx} className="text-xs bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                                            <div className="font-medium text-emerald-800 truncate">{nutrient.product_name}</div>
                                            <div className="text-emerald-600">{nutrient.quantity} {nutrient.unit || 'kg'}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Status & Remarks */}
                              <td className="px-4 py-4 align-top">
                                <div className="space-y-2">
                                  <div className="flex justify-start">
                                    {getStatusBadge(fertigation.status)}
                                  </div>
                                  {fertigation.remarks && (
                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded max-w-xs">
                                      <div className="font-medium text-slate-500 mb-1">Remarks:</div>
                                      <div className="line-clamp-3 leading-relaxed">{fertigation.remarks}</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Actions */}
                              <td className="px-4 py-4 align-top">
                                <div className="flex flex-col space-y-1 items-center">
                                  <button
                                    onClick={() => handleEdit(fertigation)}
                                    className="w-full text-emerald-600 hover:text-emerald-800 font-medium hover:bg-emerald-50 px-2 py-1 rounded text-sm transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(fertigation.id)}
                                    className="w-full text-red-600 hover:text-red-800 font-medium hover:bg-red-50 px-2 py-1 rounded text-sm transition-colors"
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

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4">
                      {fertigations.map((fertigation, index) => (
                        <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">{fertigation.crop_zone_name}</h3>
                              <p className="text-sm text-slate-500">Farm: {fertigation.farm_name}</p>
                              {fertigation.crop_stage_info && (
                                <p className="text-xs text-emerald-600 mt-1">
                                  Stage: {fertigation.crop_stage_info.crop_name} ({fertigation.crop_stage_info.variety})
                                </p>
                              )}
                            </div>
                            {getStatusBadge(fertigation.status)}
                          </div>
                          
                          {/* Basic Info */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-slate-500">Date & Time</p>
                              <p className="text-sm font-medium">{formatDateTime(fertigation.date_time)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Operator</p>
                              <p className="text-sm font-medium">{fertigation.operator_name}</p>
                            </div>
                            {fertigation.scheduled_date && fertigation.status === 'scheduled' && (
                              <div className="col-span-2">
                                <p className="text-xs text-slate-500">Scheduled Date</p>
                                <p className="text-sm font-medium text-blue-600">{formatDateTime(fertigation.scheduled_date)}</p>
                              </div>
                            )}
                          </div>

                          {/* Technical Values */}
                          <div className="mb-4">
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">EC & pH Values</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-500">EC Before</span>
                                  <span className="text-sm font-medium">{fertigation.ec_before} mS/cm</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">EC After</span>
                                  <span className="text-sm font-medium">{fertigation.ec_after} mS/cm</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Change</span>
                                    <span className={`text-sm font-semibold ${fertigation.ec_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {fertigation.ec_change > 0 ? '+' : ''}{fertigation.ec_change?.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-500">pH Before</span>
                                  <span className="text-sm font-medium">{fertigation.ph_before}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">pH After</span>
                                  <span className="text-sm font-medium">{fertigation.ph_after}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Change</span>
                                    <span className={`text-sm font-semibold ${fertigation.ph_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {fertigation.ph_change > 0 ? '+' : ''}{fertigation.ph_change?.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Water Volume */}
                          <div className="mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h16.5m0 0L24 21m0-4.5L19.5 12" />
                                </svg>
                                <div>
                                  <p className="text-xs text-slate-500">Water Volume</p>
                                  <p className="text-lg font-semibold text-blue-700">{fertigation.water_volume}L</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Nutrients */}
                          {fertigation.nutrients_used && fertigation.nutrients_used.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Nutrients Used</h4>
                              <div className="space-y-2">
                                {fertigation.nutrients_used.map((nutrient, idx) => (
                                  <div key={idx} className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-emerald-800">{nutrient.product_name}</span>
                                      <span className="text-sm text-emerald-600">{nutrient.quantity} {nutrient.unit || 'kg'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Remarks */}
                          {fertigation.remarks && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Remarks</h4>
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-sm text-slate-700">{fertigation.remarks}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                            <button
                              onClick={() => handleEdit(fertigation)}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-2 rounded-md transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(fertigation.id)}
                              className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-slate-200/60">
                <h2 className="text-xl font-semibold text-slate-900">Scheduled Fertigations</h2>
              </div>
              
              <div className="p-8">
                {fertigations.filter(f => f.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No scheduled fertigations</h3>
                    <p className="text-slate-500 mb-6">Schedule your fertigation activities in advance.</p>
                    <button
                      onClick={() => setShowScheduleForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule Fertigation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {fertigations.filter(f => f.status === 'scheduled').map((fertigation, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 text-lg">{fertigation.crop_zone_name}</h3>
                            <p className="text-sm text-slate-600 mt-1">Farm: {fertigation.farm_name}</p>
                            {fertigation.crop_stage_info && (
                              <p className="text-xs text-emerald-600 mt-1">
                                Stage: {fertigation.crop_stage_info.crop_name} ({fertigation.crop_stage_info.variety})
                              </p>
                            )}
                          </div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            📅 Scheduled
                          </span>
                        </div>

                        {/* Scheduled Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Scheduled Date</span>
                            </div>
                            <p className="text-sm font-semibold text-blue-700">{formatDateTime(fertigation.scheduled_date || fertigation.date_time)}</p>
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Operator</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{fertigation.operator_name}</p>
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h16.5m0 0L24 21m0-4.5L19.5 12" />
                              </svg>
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Water Volume</span>
                            </div>
                            <p className="text-sm font-semibold text-blue-700">{fertigation.water_volume || 0}L</p>
                          </div>
                        </div>

                        {/* Technical Parameters (if provided) */}
                        {(fertigation.ec_before > 0 || fertigation.ph_before > 0) && (
                          <div className="mb-4">
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Planned Technical Parameters</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {fertigation.ec_before > 0 && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-slate-500">EC Before</p>
                                  <p className="text-sm font-medium">{fertigation.ec_before} mS/cm</p>
                                </div>
                              )}
                              {fertigation.ec_after > 0 && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-slate-500">EC After</p>
                                  <p className="text-sm font-medium">{fertigation.ec_after} mS/cm</p>
                                </div>
                              )}
                              {fertigation.ph_before > 0 && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-slate-500">pH Before</p>
                                  <p className="text-sm font-medium">{fertigation.ph_before}</p>
                                </div>
                              )}
                              {fertigation.ph_after > 0 && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-slate-500">pH After</p>
                                  <p className="text-sm font-medium">{fertigation.ph_after}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Planned Nutrients */}
                        {fertigation.nutrients_used && fertigation.nutrients_used.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Planned Nutrients</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {fertigation.nutrients_used.map((nutrient, idx) => (
                                <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-emerald-800">{nutrient.product_name}</span>
                                    <span className="text-sm text-emerald-600 font-semibold">{nutrient.quantity} {nutrient.unit || 'kg'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Remarks */}
                        {fertigation.remarks && (
                          <div className="mb-4">
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Planning Notes</h4>
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-sm text-slate-700">{fertigation.remarks}</p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-blue-200">
                          <button
                            onClick={() => handleEdit(fertigation)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Schedule
                          </button>
                          <button
                            onClick={() => handleDelete(fertigation.id)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Summary Cards */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Summary (Last 30 Days)</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Applications</span>
                    <span className="text-2xl font-bold text-emerald-600">{analytics.total_fertigations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Water Used</span>
                    <span className="text-2xl font-bold text-blue-600">{analytics.total_water_used?.toFixed(1) || 0}L</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Avg EC Level</span>
                    <span className="text-2xl font-bold text-purple-600">{analytics.avg_ec_change?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Avg pH Level</span>
                    <span className="text-2xl font-bold text-orange-600">{analytics.avg_ph_change?.toFixed(2) || 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activities</h3>
                <div className="space-y-4">
                  {analytics.recent_fertigations?.slice(0, 5).map((fertigation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{fertigation.crop_zone_name}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(fertigation.date_time)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">{fertigation.water_volume}L</p>
                        <p className="text-xs text-slate-500">EC: {fertigation.ec_change?.toFixed(2)}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-slate-500 text-center py-8">No recent activities</p>
                  )}
                </div>
              </div>

              {/* EC/pH Trends */}
              {analytics.ec_ph_trends?.length > 0 && (
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">EC/pH Trends</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Crop Zone</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">EC Before</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">EC After</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">pH Before</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">pH After</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {analytics.ec_ph_trends.map((trend, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">{trend.date}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{trend.crop_zone}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{trend.ec_before}</td>
                            <td className="px-4 py-3 text-sm font-medium text-emerald-600">{trend.ec_after}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{trend.ph_before}</td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-600">{trend.ph_after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Log Fertigation Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[440px] sm:max-w-[480px] md:max-w-[520px] w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-in fade-in-0 zoom-in-95">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-4 border-b border-blue-600/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">💧</span>
                    <h3 className="text-lg font-semibold">
                      {editingFertigation ? 'Edit Fertigation Record' : 'Log Fertigation Activity'}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); resetForm(); }}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>🌱</span>
                      <span>Basic Information</span>
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Farm *</label>
                      <div className="relative">
                        <select
                          value={formData.farm}
                          onChange={(e) => handleFarmChange(e.target.value)}
                          required
                          className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                        >
                          <option value="">Select Farm</option>
                          {farms.map(farm => (
                            <option key={farm.id} value={farm.id}>{farm.name}</option>
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
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Crop Stage (Optional)</label>
                      <div className="relative">
                        <select
                          value={formData.crop_stage}
                          onChange={(e) => setFormData(prev => ({ ...prev, crop_stage: e.target.value }))}
                          className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                        >
                          <option value="">Select Crop Stage</option>
                          {cropStages.map(stage => (
                            <option key={stage.id} value={stage.id}>
                              {stage.crop_name} ({stage.variety}) - {stage.batch_code}
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

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Crop/Zone Name *</label>
                      <input
                        type="text"
                        value={formData.crop_zone_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, crop_zone_name: e.target.value }))}
                        required
                        placeholder="Tomato Block A, Lettuce Greenhouse 1"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Date & Time *</label>
                        <input
                          type="datetime-local"
                          value={formData.date_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, date_time: e.target.value }))}
                          required
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Operator Name *</label>
                        <input
                          type="text"
                          value={formData.operator_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
                          required
                          placeholder="Operator name"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Water Volume (L) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.water_volume}
                        onChange={(e) => setFormData(prev => ({ ...prev, water_volume: e.target.value }))}
                        required
                        placeholder="500"
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Technical Measurements Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>🔬</span>
                      <span>Technical Measurements</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">EC Before (mS/cm) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.ec_before}
                          onChange={(e) => setFormData(prev => ({ ...prev, ec_before: e.target.value }))}
                          required
                          placeholder="1.2"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">EC After (mS/cm) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.ec_after}
                          onChange={(e) => setFormData(prev => ({ ...prev, ec_after: e.target.value }))}
                          required
                          placeholder="1.8"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">pH Before *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.ph_before}
                          onChange={(e) => setFormData(prev => ({ ...prev, ph_before: e.target.value }))}
                          required
                          placeholder="6.5"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">pH After *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.ph_after}
                          onChange={(e) => setFormData(prev => ({ ...prev, ph_after: e.target.value }))}
                          required
                          placeholder="6.2"
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nutrients Used Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                        <span>🧪</span>
                        <span>Nutrients Used</span>
                      </h4>
                      <button
                        type="button"
                        onClick={addNutrient}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {nutrients.map((nutrient, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1.5">Product Name</label>
                              <input
                                type="text"
                                value={nutrient.product_name}
                                onChange={(e) => updateNutrient(index, 'product_name', e.target.value)}
                                placeholder="NPK 20-20-20"
                                className="w-full px-3 py-2 bg-white border-0 rounded-full text-sm focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                              />
                            </div>
                            <div className="flex items-end space-x-2">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity</label>
                                <input
                                  type="text"
                                  value={nutrient.quantity}
                                  onChange={(e) => updateNutrient(index, 'quantity', e.target.value)}
                                  placeholder="5kg, 2L"
                                  className="w-full px-3 py-2 bg-white border-0 rounded-full text-sm focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200"
                                />
                              </div>
                              {nutrients.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeNutrient(index)}
                                  className="w-8 h-8 text-red-500 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Additional Information</span>
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks</label>
                      <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                        rows={3}
                        placeholder="Any observations, notes, or remarks about the fertigation activity..."
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                        style={{ minHeight: '80px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Photo Attachments</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                        >
                          <svg className="w-4 h-4 mr-2 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Capture</span>
                        </button>

                        <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group">
                          <svg className="w-4 h-4 mr-2 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      {capturedImages.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                          <div className="flex items-center text-blue-800">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                            <span className="text-xs font-medium">Photo(s) attached successfully</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              
              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-slate-200/60 px-6 py-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full text-sm font-medium hover:from-blue-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>💧</span>
                      <span>{editingFertigation ? 'Update Record' : 'Log Fertigation'}</span>
                    </div>
                  </button>
                </div>
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

              <div className="p-6 space-y-6">
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

        {/* Schedule Fertigation Form Modal */}
        {showScheduleForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-40">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-8 py-6 z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Schedule Fertigation</h3>
                      <p className="text-sm text-slate-500">Plan your fertigation activity in advance</p>
                    </div>
                    <button
                      onClick={() => { setShowScheduleForm(false); resetScheduleForm(); }}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleScheduleSubmit} className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Farm *</label>
                      <select
                        value={scheduleData.farm}
                        onChange={(e) => handleFarmChange(e.target.value, true)}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Farm</option>
                        {farms.map(farm => (
                          <option key={farm.id} value={farm.id}>{farm.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Crop/Zone Name *</label>
                      <input
                        type="text"
                        value={scheduleData.crop_zone_name}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, crop_zone_name: e.target.value }))}
                        required
                        placeholder="e.g., Tomato Block A"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={scheduleData.scheduled_date}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Operator Name *</label>
                      <input
                        type="text"
                        value={scheduleData.operator_name}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, operator_name: e.target.value }))}
                        required
                        placeholder="Operator name"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Remarks</label>
                      <textarea
                        value={scheduleData.remarks}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, remarks: e.target.value }))}
                        rows={3}
                        placeholder="Notes for the scheduled fertigation..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 mt-8">
                    <button
                      type="button"
                      onClick={() => { setShowScheduleForm(false); resetScheduleForm(); }}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold"
                    >
                      Schedule Fertigation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Fertigation;