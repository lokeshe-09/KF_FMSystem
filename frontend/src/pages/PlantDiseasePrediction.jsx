import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const PlantDiseasePrediction = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    confidence: '',
    resolved: ''
  });
  const [cropStages, setCropStages] = useState([]);
  const [selectedCropStage, setSelectedCropStage] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Function to format markdown text to HTML
  const formatMarkdownToHTML = (text) => {
    if (!text) return '';

    // Convert basic markdown to HTML
    return text
      // Bold text: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic text: *text* or _text_
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br/>');
  };

  // Fetch existing predictions
  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        farm_id: farmId,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await api.get(`/farms/plant-disease/predictions/?${params}`);
      setPredictions(response.data.results || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, filters]);

  // Fetch crop stages for the farm
  const fetchCropStages = useCallback(async () => {
    try {
      const response = await api.get(`/farms/${farmId}/crop-stages/`);
      setCropStages(response.data || []);
    } catch (error) {
      console.error('Error fetching crop stages:', error);
    }
  }, [farmId]);

  useEffect(() => {
    fetchPredictions();
    fetchCropStages();
  }, [fetchPredictions, fetchCropStages]);

  // Handle image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Analyze plant disease
  const handleAnalyze = async () => {
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    setAnalyzing(true);
    try {
      const formData = {
        farm: farmId,
        crop_stage: selectedCropStage || null,
        image_data: imagePreview,
        image_filename: selectedImage.name,
        location_in_farm: location,
        user_notes: notes
      };

      const response = await api.post('/farms/plant-disease/analyze/', formData);
      setAnalysisResult(response.data);
      setShowUploadForm(false);
      setSelectedImage(null);
      setImagePreview(null);
      setLocation('');
      setNotes('');
      setSelectedCropStage('');

      // Refresh predictions list
      fetchPredictions();
    } catch (error) {
      console.error('Error analyzing image:', error);

      // Extract user-friendly error message from backend response
      let errorMessage = 'Failed to analyze image. Please try again.';

      if (error.response && error.response.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.details) {
          errorMessage = error.response.data.details;
        }
      }

      alert(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  // Get severity color
  const getSeverityColor = (status, confidence) => {
    if (status === 'healthy') return 'text-green-600 bg-green-100';
    if (status === 'diseased') {
      if (confidence === 'high') return 'text-red-600 bg-red-100';
      if (confidence === 'medium') return 'text-orange-600 bg-orange-100';
      return 'text-yellow-600 bg-yellow-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    if (status === 'healthy') {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (status === 'diseased') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plant Disease & Pest Analysis</h1>
            <p className="text-gray-600 mt-2">AI-powered plant disease and pest detection with comprehensive analysis</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Analysis
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Plant Image for Analysis</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plant Image</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                      <p className="text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div>
                        <p className="text-lg font-medium text-gray-900">Drop image here or click to upload</p>
                        <p className="text-sm text-gray-600">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Crop Stage (Optional)</label>
                  <select
                    value={selectedCropStage}
                    onChange={(e) => setSelectedCropStage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select crop stage</option>
                    {cropStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.crop_name} - {stage.batch_code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location in Farm</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Greenhouse A, Section 2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional observations..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={!selectedImage || analyzing}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {analyzing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </span>
                    ) : (
                      'Analyze Plant'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadForm(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                      setLocation('');
                      setNotes('');
                      setSelectedCropStage('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Result */}
        {analysisResult && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getSeverityColor(analysisResult.disease_status, analysisResult.confidence_level)}`}>
                  {getStatusIcon(analysisResult.disease_status)}
                  <span className="ml-2">
                    {analysisResult.disease_status === 'healthy' ? 'Healthy Plant' :
                     analysisResult.disease_status === 'diseased' ? `Disease Detected` :
                     'Analysis Uncertain'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Confidence Score Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Confidence Level</span>
                  <span className="text-sm font-bold text-gray-900">{analysisResult.confidence_score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysisResult.confidence_score >= 80 ? 'bg-green-500' :
                      analysisResult.confidence_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysisResult.confidence_score}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Analysis Content */}
                <div className="space-y-6">
                  {/* AI Analysis */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Analysis Report
                    </h3>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <div
                        className="text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(analysisResult.ai_analysis) }}
                      />
                    </div>
                  </div>

                  {/* Diseases Detected */}
                  {analysisResult.diseases_detected && analysisResult.diseases_detected.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Diseases Identified
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.diseases_detected.map((disease, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-red-900">{disease.name}</h4>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  disease.severity === 'severe' ? 'bg-red-200 text-red-800' :
                                  disease.severity === 'moderate' ? 'bg-orange-200 text-orange-800' :
                                  'bg-yellow-200 text-yellow-800'
                                }`}>
                                  {disease.severity}
                                </span>
                                <span className="text-sm text-red-700 font-medium">{disease.confidence}%</span>
                              </div>
                            </div>
                            <p className="text-red-800 text-sm">{disease.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div className="space-y-6">
                  {/* Treatments */}
                  {analysisResult.remedies_suggested && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recommended Treatments
                      </h3>
                      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                        <div
                          className="text-green-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(analysisResult.remedies_suggested) }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Prevention */}
                  {analysisResult.prevention_tips && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Prevention Tips
                      </h3>
                      <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
                        <div
                          className="text-purple-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(analysisResult.prevention_tips) }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setAnalysisResult(null);
                      setShowUploadForm(false);
                    }}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
                  >
                    Analyze Another Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Combined Filter and History Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl shadow-lg border border-green-100 overflow-hidden">
          <div className="bg-white bg-opacity-70 backdrop-blur-sm px-6 py-4 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                  </svg>
                  Filter Analysis Results
                </h2>
                <p className="text-sm text-gray-600 mt-1">Find specific analyses by status, confidence level, or resolution state</p>
              </div>
              <button
                onClick={() => setFilters({ status: '', confidence: '', resolved: '' })}
                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear Filters
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Plant Health Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 hover:bg-white transition-colors"
                >
                  <option value="">All Health Statuses</option>
                  <option value="healthy">Healthy Plants</option>
                  <option value="diseased">Disease Detected</option>
                  <option value="uncertain">Uncertain Results</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Filter by the overall health assessment</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  AI Confidence Level
                </label>
                <select
                  value={filters.confidence}
                  onChange={(e) => setFilters({ ...filters, confidence: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 hover:bg-white transition-colors"
                >
                  <option value="">All Confidence Levels</option>
                  <option value="high">High Confidence (80%+)</option>
                  <option value="medium">Medium Confidence (60-79%)</option>
                  <option value="low">Low Confidence (&lt;60%)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Filter by how certain the AI analysis is</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  Issue Resolution
                </label>
                <select
                  value={filters.resolved}
                  onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 hover:bg-white transition-colors"
                >
                  <option value="">All Issues</option>
                  <option value="false">Needs Attention</option>
                  <option value="true">Resolved Issues</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Filter by treatment and resolution status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis History Section - Connected to Filter */}
        <div className="bg-white rounded-b-xl shadow-lg border-l border-r border-b border-gray-100 overflow-hidden border-t-0">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Analysis History & Records
                </h2>
                <p className="text-sm text-gray-600 mt-1">Track all your plant health analyses and their outcomes</p>
              </div>
              {predictions.length > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {predictions.length} Analysis{predictions.length !== 1 ? 'es' : ''} Found
                  </p>
                  <p className="text-xs text-gray-500">
                    {predictions.filter(p => !p.is_resolved).length} pending resolution
                  </p>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading your analysis history...</p>
              <p className="text-gray-500 text-sm mt-1">Please wait while we fetch your records</p>
            </div>
          ) : predictions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analysis History Yet</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Start analyzing your plants to build a comprehensive health record. Your analysis history will appear here.
              </p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Your First Image
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {predictions.map((prediction, index) => (
                <div key={prediction.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header with Status and Date */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getSeverityColor(prediction.disease_status, prediction.confidence_level)}`}>
                            {getStatusIcon(prediction.disease_status)}
                            <span className="ml-2 capitalize">
                              {prediction.disease_status === 'healthy' ? 'Healthy Plant' :
                               prediction.disease_status === 'diseased' ? 'Issue Detected' :
                               'Needs Review'}
                            </span>
                          </div>
                          {prediction.is_resolved && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 shadow-sm">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(prediction.analysis_timestamp).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(prediction.analysis_timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Key Information Grid */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <span className="text-gray-600 text-xs uppercase font-medium">Location</span>
                              <p className="font-semibold text-gray-900">{prediction.location_in_farm || 'Not specified'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <div>
                              <span className="text-gray-600 text-xs uppercase font-medium">AI Confidence</span>
                              <p className="font-semibold text-gray-900 capitalize">
                                {prediction.confidence_level}
                                <span className="text-gray-600 font-normal">({prediction.confidence_score}%)</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <span className="text-gray-600 text-xs uppercase font-medium">Issues Found</span>
                              <p className="font-semibold text-gray-900">
                                {prediction.disease_count === 0 ? 'None' : prediction.disease_count}
                                <span className="text-gray-600 font-normal text-xs ml-1">
                                  {prediction.disease_count === 1 ? 'issue' : 'issues'}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Primary Disease Information */}
                      {prediction.primary_disease_name && prediction.primary_disease_name !== 'None' && (
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg mb-4">
                          <p className="text-sm">
                            <span className="font-semibold text-orange-800">Primary Concern:</span>
                            <span className="text-orange-700 ml-2">{prediction.primary_disease_name}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="ml-6 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/farm/${farmId}/plant-disease/${prediction.id}`)}
                        className="bg-white border-2 border-green-200 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 hover:border-green-300 transition-all duration-200 group-hover:shadow-md flex items-center"
                      >
                        <span>View Full Report</span>
                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlantDiseasePrediction;