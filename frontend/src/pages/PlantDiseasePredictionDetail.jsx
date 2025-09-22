import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const PlantDiseasePredictionDetail = () => {
  const { farmId, predictionId } = useParams();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [locationInFarm, setLocationInFarm] = useState('');
  const [actionsT, setActionsT] = useState('');
  const [isResolved, setIsResolved] = useState(false);

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

  // Fetch prediction details
  useEffect(() => {
    fetchPredictionDetail();
  }, [predictionId]);

  const fetchPredictionDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/farms/plant-disease/predictions/${predictionId}/`);
      console.log('Prediction detail response:', response.data);
      console.log('Image data exists:', !!response.data.image_data);
      console.log('Image data preview:', response.data.image_data ? response.data.image_data.substring(0, 100) : 'No image data');
      setPrediction(response.data);
      setUserNotes(response.data.user_notes || '');
      setLocationInFarm(response.data.location_in_farm || '');
      setActionsT(response.data.actions_taken || '');
      setIsResolved(response.data.is_resolved || false);
    } catch (error) {
      console.error('Error fetching prediction details:', error);
      alert('Failed to load prediction details');
    } finally {
      setLoading(false);
    }
  };

  // Update prediction
  const handleUpdate = async () => {
    try {
      setUpdating(true);
      const updateData = {
        user_notes: userNotes,
        location_in_farm: locationInFarm,
        actions_taken: actionsT,
        is_resolved: isResolved
      };

      await api.put(`/farms/plant-disease/predictions/${predictionId}/update/`, updateData);
      alert('Prediction updated successfully!');
      fetchPredictionDetail(); // Refresh data
    } catch (error) {
      console.error('Error updating prediction:', error);
      alert('Failed to update prediction');
    } finally {
      setUpdating(false);
    }
  };

  // Get severity color based on disease status and confidence
  const getSeverityColor = (status, confidence) => {
    if (status === 'healthy') return 'text-green-600 bg-green-100 border-green-200';
    if (status === 'diseased') {
      if (confidence === 'high') return 'text-red-600 bg-red-100 border-red-200';
      if (confidence === 'medium') return 'text-orange-600 bg-orange-100 border-orange-200';
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    }
    return 'text-gray-600 bg-gray-100 border-gray-200';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    if (status === 'healthy') {
      return (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (status === 'diseased') {
      return (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading prediction details...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!prediction) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Prediction Not Found</h2>
            <p className="text-gray-600 mb-6">The requested prediction could not be found.</p>
            <button
              onClick={() => navigate(`/farm/${farmId}/plant-disease`)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Plant Disease Predictions
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/farm/${farmId}/plant-disease`)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Predictions
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Plant Disease Analysis Details</h1>
              <p className="text-gray-600 mt-1">
                Analyzed on {new Date(prediction.analysis_timestamp).toLocaleDateString()} at {new Date(prediction.analysis_timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          {prediction.is_resolved && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Resolved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image and Status */}
          <div className="lg:col-span-1">
            {/* Plant Image */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Plant Image</h2>
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
                {prediction.image_data ? (
                  <img
                    src={prediction.image_data.startsWith('data:') ? prediction.image_data : `data:image/jpeg;base64,${prediction.image_data}`}
                    alt="Plant analysis"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error:', e);
                      console.log('Failed image src:', e.target.src);
                      console.log('Image data length:', prediction.image_data.length);
                      console.log('Image data starts with:', prediction.image_data.substring(0, 50));
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully');
                      console.log('Image src:', prediction.image_data.substring(0, 50));
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">No image data available</p>
                      <p className="text-xs text-gray-400 mt-1">Debug: {prediction.image_data ? 'Has data' : 'No data'}</p>
                    </div>
                  </div>
                )}
                <div className="w-full h-full items-center justify-center" style={{display: 'none'}}>
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-gray-500">Failed to load image</p>
                    <p className="text-xs text-gray-400 mt-1">Check browser console for details</p>
                  </div>
                </div>
              </div>
              {/* Image Metadata */}
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {prediction.image_filename && (
                  <div className="flex justify-between">
                    <span>Filename:</span>
                    <span className="font-medium">{prediction.image_filename}</span>
                  </div>
                )}
                {prediction.image_format && (
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="font-medium uppercase">{prediction.image_format}</span>
                  </div>
                )}
                {prediction.image_width && prediction.image_height && (
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium">{prediction.image_width} × {prediction.image_height} px</span>
                  </div>
                )}
                {prediction.image_size_bytes && (
                  <div className="flex justify-between">
                    <span>File Size:</span>
                    <span className="font-medium">
                      {prediction.image_size_bytes < 1024
                        ? `${prediction.image_size_bytes} B`
                        : prediction.image_size_bytes < 1024 * 1024
                        ? `${(prediction.image_size_bytes / 1024).toFixed(1)} KB`
                        : `${(prediction.image_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Status */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Status</h2>
              <div className={`p-4 rounded-lg border-2 ${getSeverityColor(prediction.disease_status, prediction.confidence_level)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(prediction.disease_status)}
                    <span className="font-semibold text-lg capitalize">{prediction.disease_status}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {prediction.confidence_score}% confident
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Confidence Level:</span>
                    <span className="font-medium capitalize">{prediction.confidence_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diseases Found:</span>
                    <span className="font-medium">{prediction.disease_count}</span>
                  </div>
                  {prediction.severity_level && (
                    <div className="flex justify-between">
                      <span>Severity:</span>
                      <span className="font-medium capitalize">{prediction.severity_level}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Farm:</span>
                  <span className="ml-2 font-medium">{prediction.farm_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Analyzed by:</span>
                  <span className="ml-2 font-medium">{prediction.user_full_name || prediction.user_name}</span>
                </div>
                {prediction.crop_stage_name && (
                  <div>
                    <span className="text-gray-600">Crop Stage:</span>
                    <span className="ml-2 font-medium">{prediction.crop_stage_name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Location in Farm:</span>
                  <span className="ml-2 font-medium">{prediction.location_in_farm || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Analysis Details */}
          <div className="lg:col-span-2">
            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis Results</h2>
              <div className="prose max-w-none">
                <div
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(prediction.ai_analysis) }}
                />
              </div>
            </div>

            {/* Diseases Detected */}
            {prediction.diseases_detected && prediction.diseases_detected.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Diseases Detected</h2>
                <div className="space-y-4">
                  {prediction.diseases_detected.map((disease, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{disease.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            disease.severity === 'severe' ? 'bg-red-100 text-red-800' :
                            disease.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {disease.severity}
                          </span>
                          <span className="text-sm text-gray-600">{disease.confidence}% confident</span>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{disease.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remedies */}
            {prediction.remedies_suggested && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Treatments</h2>
                <div className="prose max-w-none">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(prediction.remedies_suggested) }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prevention Tips */}
            {prediction.prevention_tips && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Prevention Tips</h2>
                <div className="prose max-w-none">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(prediction.prevention_tips) }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Actions */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Update Actions & Notes</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location in Farm</label>
                  <input
                    type="text"
                    value={locationInFarm}
                    onChange={(e) => setLocationInFarm(e.target.value)}
                    placeholder="e.g., Greenhouse A, Section 2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Notes</label>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Add your observations, notes, or additional information..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actions Taken</label>
                  <textarea
                    value={actionsT}
                    onChange={(e) => setActionsT(e.target.value)}
                    placeholder="Describe what actions have been taken to address this issue..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isResolved"
                    checked={isResolved}
                    onChange={(e) => setIsResolved(e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isResolved" className="ml-2 block text-sm text-gray-900">
                    Mark this issue as resolved
                  </label>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {updating ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : (
                      'Update Information'
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/farm/${farmId}/plant-disease`)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PlantDiseasePredictionDetail;