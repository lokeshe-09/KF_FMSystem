import React, { useState, useEffect, useRef } from 'react';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const IssueReports = () => {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [issueForm, setIssueForm] = useState({
    crop_zone: '',
    issue_type: '',
    description: '',
    severity: 'medium',
    image_data: null
  });

  useEffect(() => {
    fetchIssueReports();
  }, []);

  const fetchIssueReports = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await farmAPI.getIssueReports(filters);
      setIssues(response.data);
    } catch (error) {
      toast.error('Failed to fetch issue reports');
    } finally {
      setLoading(false);
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

  const handleCreateIssue = async () => {
    try {
      const imagesData = capturedImages.map(img => img.data);
      
      const issueData = {
        crop_zone: issueForm.crop_zone,
        issue_type: issueForm.issue_type,
        description: issueForm.description,
        severity: issueForm.severity,
        image_data: imagesData.length > 0 ? imagesData : null
      };

      const formData = new FormData();
      formData.append('crop_zone', issueData.crop_zone);
      formData.append('issue_type', issueData.issue_type);
      formData.append('description', issueData.description);
      formData.append('severity', issueData.severity);
      
      if (imagesData.length > 0) {
        formData.append('photo_evidence', imagesData[0]);
      }

      await farmAPI.createIssueReport(formData);
      toast.success('Issue report created successfully');
      setShowCreateModal(false);
      setShowCamera(false);
      setCapturedImages([]);
      setIssueForm({
        crop_zone: '',
        issue_type: '',
        description: '',
        severity: 'medium',
        image_data: null
      });
      fetchIssueReports();
    } catch (error) {
      toast.error('Failed to create issue report');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Are you sure you want to delete this issue report?')) {
      return;
    }

    try {
      await farmAPI.deleteIssueReport(issueId);
      toast.success('Issue report deleted successfully');
      fetchIssueReports();
    } catch (error) {
      toast.error('Failed to delete issue report');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'reported':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="ml-4 text-slate-600">Loading issue reports...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-8 py-6 border-b border-slate-200/60">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Issue Reports</h1>
                    <p className="text-slate-600 mt-1">Report and track field issues for admin review</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 lg:mt-0">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="w-full lg:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Report New Issue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filter Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                onChange={(e) => fetchIssueReports({ status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Issue Type</label>
              <select 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                onChange={(e) => fetchIssueReports({ issue_type: e.target.value })}
              >
                <option value="">All Issue Types</option>
                <option value="pest">Pest</option>
                <option value="disease">Disease</option>
                <option value="nutrient_deficiency">Nutrient Deficiency</option>
                <option value="equipment_malfunction">Equipment Malfunction</option>
                <option value="water_leak">Water Leak</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
              <select 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                onChange={(e) => fetchIssueReports({ severity: e.target.value })}
              >
                <option value="">All Severity Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Issue Reports Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Issue Reports ({issues.length})
            </h2>
          </div>
          
          <div className="p-8">
            {issues.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No issues reported</h3>
                <p className="text-slate-500 mb-6">Start by reporting your first field issue for admin review.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Report First Issue
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Issue Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type & Severity</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Photo Attachment</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {issues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                issue.severity === 'high' ? 'bg-red-100 text-red-600' :
                                issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-slate-900">Issue #{issue.id}</div>
                              <div className="text-xs text-slate-500">{issue.crop_zone || 'General'}</div>
                              <div className="text-sm text-slate-600 mt-1 max-w-xs truncate" title={issue.description}>
                                {issue.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{issue.issue_type_display}</div>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getSeverityBadgeClass(issue.severity)}`}>
                            {issue.severity_display}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(issue.status)}`}>
                            {issue.status_display}
                          </span>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(issue.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {issue.photo_evidence ? (
                            <div className="flex items-center">
                              <img 
                                src={issue.photo_evidence} 
                                alt="Issue attachment" 
                                className="w-12 h-12 object-cover rounded-lg cursor-pointer shadow-sm border border-slate-200"
                                onClick={() => window.open(issue.photo_evidence, '_blank')}
                              />
                              <div className="ml-3">
                                <div className="text-xs font-medium text-slate-700">Photo attached</div>
                                <button 
                                  onClick={() => window.open(issue.photo_evidence, '_blank')}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  View full size
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center text-slate-400">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm">No attachment</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            {issue.status === 'reported' && (
                              <button 
                                onClick={() => handleDeleteIssue(issue.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            )}
                            {issue.resolution_notes && (
                              <button 
                                onClick={() => setEditingIssue(issue)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View Resolution
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Issue Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full max-h-screen overflow-hidden shadow-2xl transform animate-scaleIn">
              
              {/* Sticky Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-5 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Report Issue</h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-160px)] px-5 py-4 space-y-4">
                
                {/* Basic Information */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      Crop/Zone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Tomato Block A 🍅"
                      className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-red-200 focus:bg-white transition-all duration-200"
                      value={issueForm.crop_zone}
                      onChange={(e) => setIssueForm({...issueForm, crop_zone: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      Issue Type *
                    </label>
                    <select
                      className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-red-200 focus:bg-white transition-all duration-200"
                      value={issueForm.issue_type}
                      onChange={(e) => setIssueForm({...issueForm, issue_type: e.target.value})}
                    >
                      <option value="">Choose issue type...</option>
                      <option value="pest">🐛 Pest Infestation</option>
                      <option value="disease">🦠 Plant Disease & Pest</option>
                      <option value="nutrient_deficiency">🌱 Nutrient Deficiency</option>
                      <option value="equipment_malfunction">🔧 Equipment Issue</option>
                      <option value="water_leak">💧 Water Leak</option>
                      <option value="other">❓ Other Issue</option>
                    </select>
                  </div>
                </div>

                {/* Description - Collapsible */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Description *
                  </label>
                  <textarea
                    placeholder="What's the problem? Describe in detail... 📝"
                    className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-red-200 focus:bg-white transition-all duration-200 resize-none"
                    rows={3}
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                  />
                </div>

                {/* Attachments - Compact */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Photo (Optional)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center px-3 py-2.5 bg-red-50 border-2 border-red-100 rounded-full hover:bg-red-100 transition-all duration-200 group"
                    >
                      <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs font-medium text-red-700">📷 Capture</span>
                    </button>

                    <label className="flex-1 flex items-center justify-center px-3 py-2.5 bg-blue-50 border-2 border-blue-100 rounded-full hover:bg-blue-100 transition-all duration-200 cursor-pointer">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-medium text-blue-700">📁 Choose</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {capturedImages.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-2xl animate-slideDown">
                      <div className="flex items-center text-green-700">
                        <span className="text-sm">✅ {capturedImages.length} photo(s) attached</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Severity - Compact Buttons */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Severity Level
                  </label>
                  
                  <div className="flex gap-2">
                    {[
                      { level: 'low', color: 'green', emoji: '🟢', label: 'Low' },
                      { level: 'medium', color: 'yellow', emoji: '🟡', label: 'Medium' },
                      { level: 'high', color: 'red', emoji: '🔴', label: 'High' }
                    ].map(({ level, color, emoji, label }) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setIssueForm({...issueForm, severity: level})}
                        className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                          issueForm.severity === level
                            ? `bg-${color}-100 border-2 border-${color}-300 text-${color}-700`
                            : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-1.5">{emoji}</span>
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 sticky bottom-0">
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateIssue} 
                    disabled={!issueForm.issue_type || !issueForm.description}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-full hover:from-red-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                  >
                    Submit Issue 🚀
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

        {/* Resolution Modal */}
        {editingIssue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Resolution Details</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium">{editingIssue.issue_type_display}</h4>
                  <p className="text-sm text-gray-600">{editingIssue.description}</p>
                </div>
                
                {editingIssue.resolution_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution Notes
                    </label>
                    <div className="bg-green-50 p-3 rounded border">
                      <p className="text-sm">{editingIssue.resolution_notes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setEditingIssue(null)}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default IssueReports;