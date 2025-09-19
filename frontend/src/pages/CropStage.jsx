import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const CropStage = () => {
  const { farmId } = useParams(); // Get farmId from URL if in farm-specific context
  const [farms, setFarms] = useState([]);
  const [cropForm, setCropForm] = useState({
    farm: '',
    crop_name: '',
    variety: '',
    batch_code: '',
    farm_section: '',
    area: '',
    number_of_plants: '',
    current_stage: 'germination',
    stage_start_date: '',
    stage_end_date: '',
    sowing_date: '',
    transplant_date: '',
    expected_harvest_date: '',
    actual_harvest_date: '',
    health_status: 'healthy',
    issues_reported: '',
    notes: '',
    expected_yield: '',
    actual_yield: '',
    losses: ''
  });
  const [cropHistory, setCropHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [exporting, setExporting] = useState(false);

  const cropStages = [
    { value: 'germination', label: 'Germination', icon: '🌱', color: 'from-green-400 to-emerald-500' },
    { value: 'seedling', label: 'Seedling', icon: '🌿', color: 'from-lime-400 to-green-500' },
    { value: 'vegetative', label: 'Vegetative', icon: '🍃', color: 'from-emerald-400 to-teal-500' },
    { value: 'flowering', label: 'Flowering', icon: '🌸', color: 'from-pink-400 to-rose-500' },
    { value: 'fruiting', label: 'Fruiting', icon: '🍅', color: 'from-orange-400 to-red-500' },
    { value: 'harvest', label: 'Harvest', icon: '🎯', color: 'from-amber-400 to-yellow-500' }
  ];

  const healthStatuses = [
    { value: 'healthy', label: 'Healthy', icon: '💚', color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'moderate', label: 'Moderate', icon: '⚠️', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { value: 'needs_attention', label: 'Needs Attention', icon: '🚨', color: 'text-red-600 bg-red-50 border-red-200' }
  ];

  useEffect(() => {
    if (!farmId) {
      // Only fetch farms if not in farm-specific context
      fetchFarms();
    } else {
      // If in farm-specific context, set farm ID directly and skip farm loading
      setCropForm(prev => ({ ...prev, farm: farmId }));
      setLoading(false);
    }
    fetchCropHistory();
  }, [farmId]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
      if (response.data.length > 0 && !cropForm.farm) {
        setCropForm(prev => ({ ...prev, farm: response.data[0]?.id || '' }));
      }
    } catch (error) {
      toast.error('Failed to fetch farms');
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCropHistory = async () => {
    try {
      const response = farmId 
        ? await farmAPI.getFarmCropStages(farmId, { history: true })
        : await farmAPI.getCropStages({ history: true });
      setCropHistory(response.data);
    } catch (error) {
      console.error('Error fetching crop history:', error);
    }
  };

  const handleCropSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedForm = { ...cropForm };
      
      // Convert empty strings to null for date fields
      const dateFields = ['stage_start_date', 'stage_end_date', 'sowing_date', 'actual_harvest_date', 'expected_harvest_date'];
      dateFields.forEach(field => {
        if (cleanedForm[field] === '') {
          cleanedForm[field] = null;
        }
      });
      
      // Convert empty strings to null for numeric fields
      const numericFields = ['expected_yield', 'actual_yield', 'losses', 'area', 'number_of_plants'];
      numericFields.forEach(field => {
        if (cleanedForm[field] === '' || cleanedForm[field] === undefined) {
          cleanedForm[field] = null;
        }
      });
      
      // Convert empty strings to null for text fields
      const textFields = ['farm_section', 'issues_reported', 'notes'];
      textFields.forEach(field => {
        if (cleanedForm[field] === '') {
          cleanedForm[field] = null;
        }
      });
      
      // Ensure health_status has a default value
      if (!cleanedForm.health_status || cleanedForm.health_status === '') {
        cleanedForm.health_status = 'healthy';
      }
      
      if (editingStage) {
        if (farmId) {
          await farmAPI.updateFarmCropStage(farmId, editingStage.id, cleanedForm);
        } else {
          await farmAPI.updateCropStage(editingStage.id, cleanedForm);
        }
        toast.success('Crop stage updated successfully! 🌱', {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
        setEditingStage(null);
      } else {
        if (farmId) {
          await farmAPI.createFarmCropStage(farmId, cleanedForm);
        } else {
          await farmAPI.createCropStage(cleanedForm);
        }
        toast.success('New crop stage created successfully! 🌱', {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
      }
      
      // Reset form
      setCropForm({
        farm: farmId || cropForm.farm, // Use farmId if in farm-specific context, otherwise keep the selected farm
        crop_name: '',
        variety: '',
        batch_code: '',
        farm_section: '',
        area: '',
        number_of_plants: '',
        current_stage: 'germination',
        stage_start_date: '',
        stage_end_date: '',
        sowing_date: '',
        transplant_date: '',
        expected_harvest_date: '',
        actual_harvest_date: '',
        health_status: 'healthy',
        issues_reported: '',
        notes: '',
        expected_yield: '',
        actual_yield: '',
        losses: ''
      });
      
      fetchCropHistory();
    } catch (error) {
      toast.error('Failed to save crop stage', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
      console.error('Error saving crop stage:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCropChange = (e) => {
    const { name, value } = e.target;
    setCropForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setCropForm({
      farm: stage.farm,
      crop_name: stage.crop_name,
      variety: stage.variety,
      batch_code: stage.batch_code,
      farm_section: stage.farm_section || '',
      area: stage.area || '',
      number_of_plants: stage.number_of_plants || '',
      current_stage: stage.current_stage,
      stage_start_date: stage.stage_start_date || '',
      stage_end_date: stage.stage_end_date || '',
      sowing_date: stage.sowing_date || '',
      transplant_date: stage.transplant_date,
      expected_harvest_date: stage.expected_harvest_date || '',
      actual_harvest_date: stage.actual_harvest_date || '', // Can be empty until harvest
      health_status: stage.health_status || 'healthy',
      issues_reported: stage.issues_reported || '',
      notes: stage.notes || '',
      expected_yield: stage.expected_yield || '',
      actual_yield: stage.actual_yield || '', // Can be empty until harvest
      losses: stage.losses || '' // Can be empty
    });
  };

  const handleDelete = async (stageId) => {
    if (window.confirm('Are you sure you want to delete this crop stage?')) {
      try {
        if (farmId) {
          await farmAPI.deleteFarmCropStage(farmId, stageId);
        } else {
          await farmAPI.deleteCropStage(stageId);
        }
        toast.success('Crop stage deleted successfully!');
        fetchCropHistory();
      } catch (error) {
        toast.error('Failed to delete crop stage');
        console.error('Error deleting crop stage:', error);
      }
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await farmAPI.exportCropStages();
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crop_stages_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Crop stages exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export crop stages');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await farmAPI.importCropStages(formData);
      setImportResults(response.data);
      
      if (response.data.created_count > 0) {
        toast.success(`Successfully imported ${response.data.created_count} crop stages!`);
        fetchCropHistory(); // Refresh the list
      }
      
      if (response.data.total_errors > 0) {
        toast.warning(`Import completed with ${response.data.total_errors} errors. Check details below.`);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import crop stages');
      setImportResults({
        created_count: 0,
        errors: [error.response?.data?.error || 'Unknown error occurred'],
        total_errors: 1
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `crop_name,variety,batch_code,current_stage,transplant_date,expected_harvest_date,farm_id,notes
Tomato,Cherry,TOM001,seedling,2025-01-15,2025-04-15,1,Sample tomato crop
Lettuce,Iceberg,LET001,germination,2025-01-20,2025-03-20,1,Sample lettuce crop
Pepper,Bell,PEP001,vegetative,2024-12-15,2025-03-15,1,Sample pepper crop`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crop_stages_sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Sample CSV downloaded!');
  };

  const getCurrentStage = (stageValue) => {
    return cropStages.find(stage => stage.value === stageValue) || cropStages[0];
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="text-emerald-700 font-medium">Loading crop stages...</span>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Crop Stage Management</h1>
              <p className="text-slate-600 font-medium">
                Track crop growth stages and plan fertigation schedules - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Crop Stage Form */}
        <div className="card overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingStage ? 'Update Crop Stage Progress' : 'New Crop Stage Progress'}
                </h3>
                <p className="text-slate-600 text-sm">
                  {editingStage ? 'Update comprehensive crop progress tracking' : 'Complete crop stage progress tracking with health, timeline, and yield monitoring'}
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleCropSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            {/* Farm Selection - Only show if not in farm-specific context */}
            {!farmId && (
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
                    value={cropForm.farm}
                    onChange={handleCropChange}
                    required
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-sm sm:text-base appearance-none"
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
            )}

            {/* Crop Identification Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">🔍 Crop Identification</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Crop Name *</label>
                    <input
                      type="text"
                      name="crop_name"
                      value={cropForm.crop_name}
                      onChange={handleCropChange}
                      required
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                      placeholder="e.g., Tomato, Lettuce"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Variety *</label>
                    <input
                      type="text"
                      name="variety"
                      value={cropForm.variety}
                      onChange={handleCropChange}
                      required
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                      placeholder="e.g., Cherry Tomato, Hybrid"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Batch Code / Lot ID *</label>
                    <input
                      type="text"
                      name="batch_code"
                      value={cropForm.batch_code}
                      onChange={handleCropChange}
                      required
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                      placeholder="e.g., BATCH-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Farm Section</label>
                    <input
                      type="text"
                      name="farm_section"
                      value={cropForm.farm_section}
                      onChange={handleCropChange}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                      placeholder="e.g., Section A, Unit 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Area (acres/hectares)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="area"
                      value={cropForm.area}
                      onChange={handleCropChange}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                      placeholder="e.g., 2.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Number of Plants</label>
                    <input
                      type="number"
                      name="number_of_plants"
                      value={cropForm.number_of_plants}
                      onChange={handleCropChange}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>

              {/* Stage Tracking Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">📈 Stage Tracking</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">Current Stage *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {cropStages.map((stage) => (
                        <label key={stage.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="current_stage"
                            value={stage.value}
                            checked={cropForm.current_stage === stage.value}
                            onChange={handleCropChange}
                            className="sr-only"
                          />
                          <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            cropForm.current_stage === stage.value 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-slate-200 bg-white hover:border-emerald-300'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{stage.icon}</span>
                              <span className={`font-medium text-xs ${
                                cropForm.current_stage === stage.value ? 'text-emerald-700' : 'text-slate-700'
                              }`}>
                                {stage.label}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Stage Start Date</label>
                      <input
                        type="date"
                        name="stage_start_date"
                        value={cropForm.stage_start_date}
                        onChange={handleCropChange}
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Stage End Date (Expected)</label>
                      <input
                        type="date"
                        name="stage_end_date"
                        value={cropForm.stage_end_date}
                        onChange={handleCropChange}
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-800">⏰ Timeline</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Sowing Date</label>
                  <input
                    type="date"
                    name="sowing_date"
                    value={cropForm.sowing_date}
                    onChange={handleCropChange}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Transplant Date *</label>
                  <input
                    type="date"
                    name="transplant_date"
                    value={cropForm.transplant_date}
                    onChange={handleCropChange}
                    required
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Expected Harvest Date</label>
                  <input
                    type="date"
                    name="expected_harvest_date"
                    value={cropForm.expected_harvest_date}
                    onChange={handleCropChange}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Actual Harvest Date 
                    <span className="text-xs text-slate-500 font-normal ml-1">(fill after harvest)</span>
                  </label>
                  <input
                    type="date"
                    name="actual_harvest_date"
                    value={cropForm.actual_harvest_date}
                    onChange={handleCropChange}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                    placeholder="Leave empty until harvest is complete"
                  />
                </div>
              </div>
            </div>

            {/* Health & Observations Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-800">🏥 Crop Health & Observations</h4>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">Health Status</label>
                    <div className="grid grid-cols-1 gap-2">
                      {healthStatuses.map((status) => (
                        <label key={status.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="health_status"
                            value={status.value}
                            checked={cropForm.health_status === status.value}
                            onChange={handleCropChange}
                            className="sr-only"
                          />
                          <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            cropForm.health_status === status.value 
                              ? status.color.replace('border-', 'border-').replace('bg-', 'bg-')
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{status.icon}</span>
                              <span className={`font-medium ${
                                cropForm.health_status === status.value 
                                  ? status.color.split(' ')[0] 
                                  : 'text-slate-700'
                              }`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Issues Reported</label>
                    <textarea
                      name="issues_reported"
                      value={cropForm.issues_reported}
                      onChange={handleCropChange}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200 text-sm resize-none"
                      placeholder="Describe any pests, diseases, nutrient deficiencies..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">General Notes</label>
                    <textarea
                      name="notes"
                      value={cropForm.notes}
                      onChange={handleCropChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200 text-sm resize-none"
                      placeholder="General observations, treatments, care notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Yield Tracking Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">📊 Yield Tracking</h4>
                </div>
                <div className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                  💡 Actual values filled after harvest
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Expected Yield (kg/units)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="expected_yield"
                    value={cropForm.expected_yield}
                    onChange={handleCropChange}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Actual Yield (kg/units) 
                    <span className="text-xs text-slate-500 font-normal ml-1">(fill after harvest)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="actual_yield"
                    value={cropForm.actual_yield}
                    onChange={handleCropChange}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-sm"
                    placeholder="Leave empty until harvest is complete"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Losses (kg/units) 
                    <span className="text-xs text-slate-500 font-normal ml-1">(optional, after harvest)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="losses"
                    value={cropForm.losses}
                    onChange={handleCropChange}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-sm"
                    placeholder="Enter if there are any losses (optional)"
                  />
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
                <span>{showHistory ? 'Hide' : 'View'} Crop History</span>
              </button>
              
              <div className="flex space-x-3">
                {editingStage && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStage(null);
                      setCropForm({
                        farm: farmId || cropForm.farm,
                        crop_name: '',
                        variety: '',
                        batch_code: '',
                        farm_section: '',
                        area: '',
                        number_of_plants: '',
                        current_stage: 'germination',
                        stage_start_date: '',
                        stage_end_date: '',
                        sowing_date: '',
                        transplant_date: '',
                        expected_harvest_date: '',
                        actual_harvest_date: '',
                        health_status: 'healthy',
                        issues_reported: '',
                        notes: '',
                        expected_yield: '',
                        actual_yield: '',
                        losses: ''
                      });
                    }}
                    className="py-4 px-6 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/20 transition-all duration-200"
                  >
                    Cancel Edit
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[200px]"
                >
                  <span className={`flex items-center justify-center space-x-2 transition-opacity duration-200 ${submitting ? 'opacity-0' : 'opacity-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span>{editingStage ? 'Update Stage' : 'Add Crop Stage'}</span>
                  </span>
                  
                  {submitting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="text-white font-semibold">{editingStage ? 'Updating...' : 'Adding...'}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform transition-transform duration-700 hover:translate-x-full"></div>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Crop History */}
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
                  <h3 className="text-xl font-bold text-slate-900">Crop History</h3>
                  <p className="text-slate-600 text-sm">Your crop stage tracking records</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              {cropHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">No crop records yet</h4>
                  <p className="text-slate-500">Add your first crop stage to start tracking growth progress.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {cropHistory.map((crop) => {
                    const stageInfo = getCurrentStage(crop.current_stage);
                    return (
                      <div key={crop.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 bg-gradient-to-br ${stageInfo.color} rounded-xl flex items-center justify-center`}>
                              <span className="text-white text-xl">{stageInfo.icon}</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-slate-900">{crop.crop_name}</h4>
                              <p className="text-sm text-slate-600">{crop.variety}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(crop)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(crop.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Batch Code:</span>
                            <span className="text-sm font-semibold text-slate-900">{crop.batch_code}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Farm:</span>
                            <span className="text-sm font-semibold text-slate-900">{crop.farm_name}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Stage:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${stageInfo.color} text-white`}>
                              {stageInfo.icon} {stageInfo.label}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Transplanted:</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {new Date(crop.transplant_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Growth Days:</span>
                            <span className="text-sm font-semibold text-emerald-600">{crop.growth_duration_days} days</span>
                          </div>
                          
                          {crop.expected_harvest_date && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-600">Expected Harvest:</span>
                              <span className="text-sm font-semibold text-orange-600">
                                {new Date(crop.expected_harvest_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {crop.notes && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-600">{crop.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CropStage;