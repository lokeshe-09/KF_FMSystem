import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import toast from 'react-hot-toast';

const SprayIrrigation = () => {
  const [farms, setFarms] = useState([]);
  const [cropStages, setCropStages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedCropStage, setSelectedCropStage] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [formData, setFormData] = useState({
    farm: '',
    crop_stage: '',
    activity_type: 'spray',
    date: new Date().toISOString().split('T')[0],
    crop_type: '',
    chemical_name: '',
    dosage: '',
    quantity: '',
    sprayer_name: '',
    irrigation_timing: '',
    irrigation_volume: '',
    notes: '',
    image_data: ''
  });

  useEffect(() => {
    fetchFarms();
    fetchLogs();
  }, []);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Failed to load farms');
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await farmAPI.getSprayIrrigationLogs({ history: true });
      setLogs(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      if (error.response && error.response.status === 404) {
        setLogs([]);
      } else {
        toast.error('Failed to load logs');
      }
      setLoading(false);
    }
  };

  const fetchCropStages = async () => {
    try {
      const response = await farmAPI.getCropStages();
      setCropStages(response.data || []);
    } catch (error) {
      console.error('Error fetching crop stages:', error);
      setCropStages([]);
    }
  };

  const handleFarmChange = (farmId) => {
    setFormData(prev => ({ ...prev, farm: farmId, crop_stage: '' }));
    setSelectedCropStage(null);
    setRecommendations(null);
    fetchCropStages();
  };

  const handleCropStageChange = (stageId) => {
    const stage = cropStages.find(s => s.id.toString() === stageId);
    setFormData(prev => ({ ...prev, crop_stage: stageId }));
    setSelectedCropStage(stage);
    setRecommendations(stage ? stage.stage_recommendations : null);
    
    if (stage) {
      setFormData(prev => ({ 
        ...prev, 
        crop_stage: stageId,
        crop_type: `${stage.crop_name} (${stage.variety}) - ${stage.batch_code}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.farm) {
      toast.error('Please select a farm');
      return;
    }

    try {
      await farmAPI.createSprayIrrigationLog(formData);
      toast.success('Log entry created successfully!');
      stopCamera();
      setShowForm(false);
      setCapturedImages([]);
      setFormData({
        farm: '',
        crop_stage: '',
        activity_type: 'spray',
        date: new Date().toISOString().split('T')[0],
        crop_type: '',
        chemical_name: '',
        dosage: '',
        quantity: '',
        sprayer_name: '',
        irrigation_timing: '',
        irrigation_volume: '',
        notes: '',
        image_data: ''
      });
      setSelectedCropStage(null);
      setRecommendations(null);
      fetchLogs();
    } catch (error) {
      console.error('Error creating log:', error);
      toast.error('Failed to create log entry');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          image_data: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      // Check if camera permissions are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }

      setShowCamera(true);
      setCameraLoading(true);
      
      // Try different camera configurations
      let stream = null;
      const videoConstraints = [
        { facingMode: 'environment' }, // Back camera preferred
        { facingMode: 'user' }, // Front camera fallback
        true // Any available camera
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
        
        // Wait for video to be ready
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
    
    // Check if video is ready
    if (video.readyState < 2) {
      toast.error('Camera is loading. Please wait a moment and try again.');
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera not ready. Please wait a moment and try again.');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      // Convert to data URL
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      
      // Check if we got a valid image
      if (dataURL === 'data:,') {
        toast.error('Failed to capture image. Please try again.');
        return;
      }
      
      const newImage = {
        id: Date.now(),
        data: dataURL,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setCapturedImages(prev => [...prev, newImage]);
      toast.success(`Photo captured successfully! (${capturedImages.length + 1} total)`);
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo. Please try again.');
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

  const removeImage = (imageId) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const selectImagesForForm = () => {
    const imagesData = capturedImages.map(img => img.data);
    setFormData({
      ...formData,
      image_data: JSON.stringify(imagesData)
    });
    stopCamera();
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  const getActivityBadge = (activityType) => {
    if (activityType === 'spray') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
          </svg>
          Spray
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd"/>
          </svg>
          Irrigation
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="text-emerald-700 font-medium text-lg">Loading logs...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1M13 21h4a2 2 0 002-2v-4a2 2 0 00-2-2h-4m0-4h4a2 2 0 012 2v4a2 2 0 01-2 2h-4m0-4V9a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">Spray & Irrigation Logs</h1>
                      <p className="text-slate-600 mt-1">Record and track your daily spray and irrigation activities</p>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 mt-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {logs.filter(log => log.activity_type === 'spray').length} Spray Logs
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {logs.filter(log => log.activity_type === 'irrigation').length} Irrigation Logs
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {logs.filter(log => log.has_image).length} With Images
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 lg:mt-0">
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full lg:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Log
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Logs Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-slate-200/60">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Recent Activity Logs ({logs.length})
              </h2>
            </div>
            
            <div className="p-8">
              {logs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No logs found</h3>
                  <p className="text-slate-500 mb-6">Start by creating your first spray or irrigation log entry.</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create First Log
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-1">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date & Activity</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Farm & Crop</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {logs.map((log, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    log.activity_type === 'spray' 
                                      ? 'bg-blue-100 text-blue-600' 
                                      : 'bg-green-100 text-green-600'
                                  }`}>
                                    {log.activity_type === 'spray' ? (
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-slate-900">{formatDate(log.date)}</div>
                                  <div className="text-xs text-slate-500">{getActivityBadge(log.activity_type)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-900">{log.farm_name || 'Unknown Farm'}</div>
                              {log.crop_stage_info && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {log.crop_stage_info.crop_name} ({log.crop_stage_info.variety}) - {log.crop_stage_info.batch_code}
                                </div>
                              )}
                              {log.crop_type && !log.crop_stage_info && (
                                <div className="text-xs text-slate-500 mt-1">{log.crop_type}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {log.activity_type === 'spray' ? (
                                <div className="text-sm text-slate-900">
                                  {log.chemical_name && <div className="font-medium">{log.chemical_name}</div>}
                                  {(log.dosage || log.quantity) && (
                                    <div className="text-xs text-slate-500 mt-1">
                                      {log.dosage && `Dosage: ${log.dosage}`}
                                      {log.dosage && log.quantity && ' • '}
                                      {log.quantity && `Qty: ${log.quantity}`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-900">
                                  {log.irrigation_timing && <div className="font-medium">Timing: {log.irrigation_timing}</div>}
                                  {log.irrigation_volume && <div className="text-xs text-slate-500 mt-1">Volume: {log.irrigation_volume}</div>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {log.has_image && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                                    </svg>
                                    Images
                                  </span>
                                )}
                                {log.notes && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                    </svg>
                                    Notes
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => viewLogDetails(log)}
                                className="text-emerald-600 hover:text-emerald-800 font-medium hover:bg-emerald-50 px-3 py-1 rounded-md transition-all duration-200"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {logs.map((log, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              log.activity_type === 'spray' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {log.activity_type === 'spray' ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{formatDate(log.date)}</div>
                              <div className="text-sm text-slate-500">{log.farm_name || 'Unknown Farm'}</div>
                            </div>
                          </div>
                          {getActivityBadge(log.activity_type)}
                        </div>
                        
                        {log.crop_stage_info && (
                          <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm font-medium text-slate-900">
                              {log.crop_stage_info.crop_name} ({log.crop_stage_info.variety})
                            </div>
                            <div className="text-xs text-slate-500">Batch: {log.crop_stage_info.batch_code}</div>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          {log.activity_type === 'spray' ? (
                            <div>
                              {log.chemical_name && <div className="text-sm font-medium text-slate-900 mb-1">{log.chemical_name}</div>}
                              {(log.dosage || log.quantity) && (
                                <div className="text-xs text-slate-600">
                                  {log.dosage && `Dosage: ${log.dosage}`}
                                  {log.dosage && log.quantity && ' • '}
                                  {log.quantity && `Quantity: ${log.quantity}`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {log.irrigation_timing && <div className="text-sm font-medium text-slate-900 mb-1">Timing: {log.irrigation_timing}</div>}
                              {log.irrigation_volume && <div className="text-xs text-slate-600">Volume: {log.irrigation_volume}</div>}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                          <div className="flex items-center space-x-2">
                            {log.has_image && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                                </svg>
                                Images
                              </span>
                            )}
                            {log.notes && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                </svg>
                                Notes
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => viewLogDetails(log)}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-md transition-all duration-200"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-slate-900">Camera Capture</h3>
                  <button
                    onClick={stopCamera}
                    className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Camera Preview */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Camera Preview</h4>
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        controls={false}
                        width="100%"
                        height="256"
                        style={{ 
                          objectFit: 'cover',
                          backgroundColor: '#000',
                          borderRadius: '12px',
                          border: '2px solid #e2e8f0'
                        }}
                        className="w-full h-64"
                        onError={(e) => {
                          console.error('Video error:', e);
                          toast.error('Video display error');
                          setCameraLoading(false);
                        }}
                        onCanPlay={() => {
                          setCameraLoading(false);
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

                  {/* Captured Images */}
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
                                <p className="text-sm font-medium text-slate-900">Photo {image.id}</p>
                                <p className="text-xs text-slate-500">{image.timestamp}</p>
                              </div>
                              <button
                                onClick={() => removeImage(image.id)}
                                className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-all duration-200"
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
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  {capturedImages.length > 0 && (
                    <button
                      onClick={selectImagesForForm}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg"
                    >
                      Use Images ({capturedImages.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Log Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-40">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-8 py-6 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Add New Log Entry</h3>
                        <p className="text-sm text-slate-500">Record your spray or irrigation activity</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                  {/* Farm Information Section */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Farm Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Farm *</label>
                        <select
                          name="farm"
                          value={formData.farm}
                          onChange={(e) => handleFarmChange(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                        >
                          <option value="">Select Farm</option>
                          {farms.map(farm => (
                            <option key={farm.id} value={farm.id}>{farm.name}</option>
                          ))}
                        </select>
                      </div>

                      {cropStages.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Crop Stage (Optional)</label>
                          <select
                            name="crop_stage"
                            value={formData.crop_stage}
                            onChange={(e) => handleCropStageChange(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                          >
                            <option value="">Select Crop Stage (Optional)</option>
                            {cropStages.map(stage => (
                              <option key={stage.id} value={stage.id}>
                                {stage.crop_name} ({stage.variety}) - {stage.batch_code}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {recommendations && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">Stage Recommendations</h5>
                        <div className="text-sm text-blue-800 space-y-1">
                          {formData.activity_type === 'spray' && recommendations.spray.map((rec, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              <span>{rec}</span>
                            </div>
                          ))}
                          {formData.activity_type === 'irrigation' && recommendations.irrigation.map((rec, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activity Information Section */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Activity Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Activity Type *</label>
                        <select
                          name="activity_type"
                          value={formData.activity_type}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                        >
                          <option value="spray">🧪 Spray Application</option>
                          <option value="irrigation">💧 Irrigation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Date *</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        />
                      </div>

                      {!selectedCropStage && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Crop Type</label>
                          <input
                            type="text"
                            name="crop_type"
                            value={formData.crop_type}
                            onChange={handleChange}
                            placeholder="e.g., Tomato, Lettuce, Pepper"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                          />
                        </div>
                      )}

                      {formData.activity_type === 'spray' ? (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Chemical Name</label>
                            <input
                              type="text"
                              name="chemical_name"
                              value={formData.chemical_name}
                              onChange={handleChange}
                              placeholder="e.g., Pesticide, Fungicide"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Dosage</label>
                            <input
                              type="text"
                              name="dosage"
                              value={formData.dosage}
                              onChange={handleChange}
                              placeholder="e.g., 2ml/L, 10g/100ml"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity Used</label>
                            <input
                              type="text"
                              name="quantity"
                              value={formData.quantity}
                              onChange={handleChange}
                              placeholder="e.g., 500ml, 2 bottles"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Sprayer Name</label>
                            <input
                              type="text"
                              name="sprayer_name"
                              value={formData.sprayer_name}
                              onChange={handleChange}
                              placeholder="Operator name"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Irrigation Timing</label>
                            <input
                              type="text"
                              name="irrigation_timing"
                              value={formData.irrigation_timing}
                              onChange={handleChange}
                              placeholder="e.g., Morning 6AM, Evening 5PM"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Irrigation Volume</label>
                            <input
                              type="text"
                              name="irrigation_volume"
                              value={formData.irrigation_volume}
                              onChange={handleChange}
                              placeholder="e.g., 100L, 2 hours"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656l-6.586 6.586a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Photo Attachments
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 group"
                      >
                        <svg className="w-6 h-6 mr-3 text-slate-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium text-slate-700 group-hover:text-emerald-700">Capture Photo</span>
                      </button>

                      <label className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 cursor-pointer group">
                        <svg className="w-6 h-6 mr-3 text-slate-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-medium text-slate-700 group-hover:text-emerald-700">Choose File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {formData.image_data && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center text-green-800">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-sm font-medium">Photo(s) attached successfully</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Additional Notes
                    </h4>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Any additional observations or notes about the activity..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg"
                    >
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Log Entry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-40">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Activity Details</h3>
                    <button
                      onClick={closeDetailModal}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                        selectedLog.activity_type === 'spray' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {selectedLog.activity_type === 'spray' ? (
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                          </svg>
                        ) : (
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-slate-900">
                          {selectedLog.activity_type === 'spray' ? 'Spray Application' : 'Irrigation Activity'}
                        </h4>
                        <p className="text-slate-500">{formatDate(selectedLog.date)} • {selectedLog.farm_name}</p>
                      </div>
                    </div>

                    {/* Activity Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLog.activity_type === 'spray' ? (
                        <>
                          {selectedLog.chemical_name && (
                            <div className="bg-slate-50 p-4 rounded-xl">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Chemical</label>
                              <p className="text-slate-900 font-medium">{selectedLog.chemical_name}</p>
                            </div>
                          )}
                          {selectedLog.dosage && (
                            <div className="bg-slate-50 p-4 rounded-xl">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Dosage</label>
                              <p className="text-slate-900 font-medium">{selectedLog.dosage}</p>
                            </div>
                          )}
                          {selectedLog.quantity && (
                            <div className="bg-slate-50 p-4 rounded-xl">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quantity</label>
                              <p className="text-slate-900 font-medium">{selectedLog.quantity}</p>
                            </div>
                          )}
                          {selectedLog.sprayer_name && (
                            <div className="bg-slate-50 p-4 rounded-xl">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Operator</label>
                              <p className="text-slate-900 font-medium">{selectedLog.sprayer_name}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {selectedLog.irrigation_timing && (
                            <div className="bg-slate-50 p-4 rounded-xl">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Timing</label>
                              <p className="text-slate-900 font-medium">{selectedLog.irrigation_timing}</p>
                            </div>
                          )}
                          {selectedLog.irrigation_volume && (
                            <div className="bg-slate-50 p-4 rounded-xl">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Volume</label>
                              <p className="text-slate-900 font-medium">{selectedLog.irrigation_volume}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Crop Stage Info */}
                    {selectedLog.crop_stage_info && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                        <h5 className="text-sm font-semibold text-emerald-900 mb-2">Associated Crop</h5>
                        <p className="text-emerald-800">
                          <span className="font-medium">{selectedLog.crop_stage_info.crop_name}</span> ({selectedLog.crop_stage_info.variety})
                        </p>
                        <p className="text-sm text-emerald-700 mt-1">
                          Batch: {selectedLog.crop_stage_info.batch_code} • Stage: {selectedLog.crop_stage_info.current_stage_display}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedLog.notes && (
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Notes</label>
                        <div className="bg-slate-50 p-4 rounded-xl">
                          <p className="text-slate-700">{selectedLog.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    {selectedLog.has_image && selectedLog.image_data && (
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-3 block">Attached Photos</label>
                        <div className="space-y-3">
                          {(() => {
                            try {
                              const images = JSON.parse(selectedLog.image_data);
                              return images.map((imageData, index) => (
                                <img
                                  key={index}
                                  src={imageData}
                                  alt={`Activity documentation ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                                />
                              ));
                            } catch {
                              return (
                                <img
                                  src={selectedLog.image_data}
                                  alt="Activity documentation"
                                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                                />
                              );
                            }
                          })()}
                        </div>
                      </div>
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

export default SprayIrrigation;