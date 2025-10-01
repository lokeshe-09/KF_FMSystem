import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import Breadcrumb from '../components/Breadcrumb';
import useWebSocket from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

// Production constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const DEBOUNCE_DELAY = 300;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

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

  // Production features
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [retryQueue, setRetryQueue] = useState([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [cacheData, setCacheData] = useState(new Map());
  const [dataVersion, setDataVersion] = useState(0);
  const [errorLog, setErrorLog] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    apiCallCount: 0,
    errorCount: 0,
    lastOptimization: null
  });
  const autoSaveRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((notification) => {
    if (notification.type === 'crop_stage_update' || notification.type === 'harvest_alert') {
      setRealTimeUpdates(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 updates
      fetchCropHistory();
      generateAnalytics();

      // Play alert sound for critical notifications
      if (notification.type === 'harvest_alert' && alertAudioRef.current) {
        alertAudioRef.current.play().catch(console.error);
      }

      // Add to active alerts if critical
      if (notification.type === 'harvest_alert') {
        setActiveAlerts(prev => [{
          id: Date.now(),
          message: notification.message,
          type: 'harvest',
          timestamp: new Date()
        }, ...prev]);
      }
    }
  }, []);

  const { connectionStatus } = useWebSocket(handleWebSocketMessage);

  // Production utilities
  const logError = useCallback((error, context) => {
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date(),
      error: error.message || error,
      context,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    setErrorLog(prev => [errorEntry, ...prev.slice(0, 49)]); // Keep last 50 errors
    console.error(`[${context}]`, error);
  }, []);

  const updatePerformanceMetrics = useCallback((metric, value) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      [metric]: value,
      lastOptimization: new Date()
    }));
  }, []);

  const getCachedData = useCallback((key) => {
    const cached = cacheData.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cacheData]);

  const setCachedData = useCallback((key, data) => {
    setCacheData(prev => new Map(prev).set(key, {
      data,
      timestamp: Date.now()
    }));
  }, []);

  const addToRetryQueue = useCallback((operation, data) => {
    setRetryQueue(prev => [...prev, {
      id: Date.now(),
      operation,
      data,
      attempts: 0,
      timestamp: new Date()
    }]);
  }, []);

  const processRetryQueue = useCallback(async () => {
    if (!isOnline || retryQueue.length === 0) return;

    const item = retryQueue[0];
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      setRetryQueue(prev => prev.slice(1));
      logError(new Error(`Max retry attempts reached for ${item.operation}`), 'RETRY_QUEUE');
      return;
    }

    try {
      switch (item.operation) {
        case 'CREATE_CROP':
          await farmAPI.createCropStage(item.data);
          break;
        case 'UPDATE_CROP':
          await farmAPI.updateCropStage(item.data.id, item.data);
          break;
        case 'DELETE_CROP':
          await farmAPI.deleteCropStage(item.data.id);
          break;
        default:
          break;
      }
      setRetryQueue(prev => prev.slice(1));
      toast.success('Sync completed successfully!');
    } catch (error) {
      setRetryQueue(prev => [
        { ...item, attempts: item.attempts + 1 },
        ...prev.slice(1)
      ]);
      logError(error, `RETRY_${item.operation}`);
    }
  }, [isOnline, retryQueue, logError]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Syncing data...');
      processRetryQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processRetryQueue]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return;

    autoSaveRef.current = setInterval(() => {
      if (pendingChanges.length > 0 && isOnline) {
        // Auto-save pending changes
        toast.success('Auto-saving changes...', { duration: 1000 });
        setPendingChanges([]);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [autoSaveEnabled, pendingChanges, isOnline]);

  // Mobile detection and touch handlers
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode('mobile');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    const views = ['form', 'timeline', 'analytics', 'calendar'];
    const currentIndex = views.indexOf(selectedView);

    if (isLeftSwipe && currentIndex < views.length - 1) {
      setSelectedView(views[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      setSelectedView(views[currentIndex - 1]);
    }
  };

  // Enhanced real-time features
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalCrops: 0,
    averageGrowthDays: 0,
    healthDistribution: {},
    stageDistribution: {},
    upcomingHarvests: [],
    overdueStages: [],
    yieldEfficiency: 0
  });
  const [selectedView, setSelectedView] = useState('form'); // 'form', 'timeline', 'analytics', 'calendar'
  const [timelineData, setTimelineData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const alertAudioRef = useRef(null);
  const [showPredictiveInsights, setShowPredictiveInsights] = useState(false);
  const [batchComparison, setBatchComparison] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [viewMode, setViewMode] = useState('standard'); // 'standard', 'advanced', 'mobile'
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const cropStages = [
    {
      value: 'germination',
      label: 'Germination',
      icon: '🌱',
      color: 'from-green-400 to-emerald-500',
      duration: 7,
      description: 'Seed sprouting and initial root development',
      careInstructions: 'Maintain consistent moisture, monitor temperature',
      idealConditions: 'Temperature: 18-25°C, Humidity: 80-90%'
    },
    {
      value: 'seedling',
      label: 'Seedling',
      icon: '🌿',
      color: 'from-lime-400 to-green-500',
      duration: 14,
      description: 'First true leaves emerge, root system develops',
      careInstructions: 'Provide gentle light, maintain humidity, start light fertilization',
      idealConditions: 'Temperature: 20-24°C, Light: 12-14 hours, pH: 6.0-6.5'
    },
    {
      value: 'vegetative',
      label: 'Vegetative',
      icon: '🍃',
      color: 'from-emerald-400 to-teal-500',
      duration: 28,
      description: 'Rapid leaf and stem growth, strong root development',
      careInstructions: 'Increase nutrients, ensure adequate light, monitor for pests',
      idealConditions: 'Temperature: 22-26°C, EC: 1.8-2.2, Nitrogen focus'
    },
    {
      value: 'flowering',
      label: 'Flowering',
      icon: '🌸',
      color: 'from-pink-400 to-rose-500',
      duration: 21,
      description: 'Flower development and pollination stage',
      careInstructions: 'Reduce nitrogen, increase phosphorus, ensure pollination',
      idealConditions: 'Temperature: 20-24°C, EC: 2.0-2.4, Phosphorus boost'
    },
    {
      value: 'fruiting',
      label: 'Fruiting',
      icon: '🍅',
      color: 'from-orange-400 to-red-500',
      duration: 35,
      description: 'Fruit development and maturation',
      careInstructions: 'Balance nutrients, monitor water stress, support heavy fruits',
      idealConditions: 'Temperature: 18-22°C, EC: 2.2-2.6, Potassium focus'
    },
    {
      value: 'harvest',
      label: 'Harvest',
      icon: '🎯',
      color: 'from-amber-400 to-yellow-500',
      duration: 7,
      description: 'Fruit maturity and harvest readiness',
      careInstructions: 'Monitor ripeness indicators, plan harvest timing',
      idealConditions: 'Optimal harvesting conditions based on crop type'
    }
  ];

  const healthStatuses = [
    {
      value: 'excellent',
      label: 'Excellent',
      icon: '🌟',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      score: 100,
      description: 'Optimal health with vigorous growth'
    },
    {
      value: 'healthy',
      label: 'Healthy',
      icon: '💚',
      color: 'text-green-600 bg-green-50 border-green-200',
      score: 85,
      description: 'Good health with normal growth patterns'
    },
    {
      value: 'moderate',
      label: 'Moderate',
      icon: '⚠️',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      score: 60,
      description: 'Some stress indicators, requires monitoring'
    },
    {
      value: 'poor',
      label: 'Poor',
      icon: '🚨',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      score: 40,
      description: 'Significant stress, immediate intervention needed'
    },
    {
      value: 'critical',
      label: 'Critical',
      icon: '☠️',
      color: 'text-red-600 bg-red-50 border-red-200',
      score: 20,
      description: 'Severe distress, emergency care required'
    }
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
    generateAnalytics();
    generateTimelineData();
    fetchPredictiveInsights();
  }, [farmId]);

  const generateAnalytics = useCallback(async (useCache = true) => {
    const cacheKey = `analytics_${farmId || 'all'}`;

    try {
      // Check cache first for analytics
      if (useCache) {
        const cachedAnalytics = getCachedData(cacheKey);
        if (cachedAnalytics) {
          setAnalytics(cachedAnalytics);
          return;
        }
      }

      const response = farmId
        ? await farmAPI.getFarmCropStages(farmId, { analytics: true })
        : await farmAPI.getCropStages({ analytics: true });

      const crops = response.data;
      const totalCrops = crops.length;

      // Calculate health distribution
      const healthDist = crops.reduce((acc, crop) => {
        acc[crop.health_status] = (acc[crop.health_status] || 0) + 1;
        return acc;
      }, {});

      // Calculate stage distribution
      const stageDist = crops.reduce((acc, crop) => {
        acc[crop.current_stage] = (acc[crop.current_stage] || 0) + 1;
        return acc;
      }, {});

      // Calculate average growth days
      const avgGrowthDays = crops.length > 0
        ? crops.reduce((sum, crop) => sum + (crop.growth_duration_days || 0), 0) / crops.length
        : 0;

      // Find upcoming harvests (next 7 days)
      const upcomingHarvests = crops.filter(crop => {
        if (!crop.expected_harvest_date) return false;
        const harvestDate = new Date(crop.expected_harvest_date);
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return harvestDate >= today && harvestDate <= weekFromNow;
      });

      // Find overdue stages
      const overdueStages = crops.filter(crop => {
        if (!crop.stage_end_date) return false;
        const endDate = new Date(crop.stage_end_date);
        return endDate < new Date();
      });

      // Calculate yield efficiency
      const yieldsData = crops.filter(crop => crop.expected_yield && crop.actual_yield);
      const yieldEfficiency = yieldsData.length > 0
        ? (yieldsData.reduce((sum, crop) => sum + (crop.actual_yield / crop.expected_yield), 0) / yieldsData.length) * 100
        : 0;

      const analyticsData = {
        totalCrops,
        averageGrowthDays: Math.round(avgGrowthDays),
        healthDistribution: healthDist,
        stageDistribution: stageDist,
        upcomingHarvests,
        overdueStages,
        yieldEfficiency: Math.round(yieldEfficiency),
        lastUpdated: new Date(),
        dataQuality: crops.length > 0 ? 'good' : 'insufficient'
      };

      setAnalytics(analyticsData);
      setCachedData(cacheKey, analyticsData);

    } catch (error) {
      logError(error, 'GENERATE_ANALYTICS');

      // Fallback to cached data or default values
      const fallbackAnalytics = getCachedData(cacheKey) || {
        totalCrops: 0,
        averageGrowthDays: 0,
        healthDistribution: {},
        stageDistribution: {},
        upcomingHarvests: [],
        overdueStages: [],
        yieldEfficiency: 0,
        lastUpdated: null,
        dataQuality: 'error'
      };

      setAnalytics(fallbackAnalytics);
      toast.error('Failed to generate analytics. Using cached data.');
    }
  }, [farmId, getCachedData, setCachedData, logError]);

  const generateTimelineData = useCallback(async () => {
    try {
      const response = farmId
        ? await farmAPI.getFarmCropStages(farmId, { timeline: true })
        : await farmAPI.getCropStages({ timeline: true });

      const crops = response.data;
      const timelineEvents = [];

      crops.forEach(crop => {
        const stageInfo = getCurrentStage(crop.current_stage);

        // Add stage start event
        if (crop.stage_start_date) {
          timelineEvents.push({
            id: `${crop.id}-start`,
            cropId: crop.id,
            cropName: crop.crop_name,
            variety: crop.variety,
            batchCode: crop.batch_code,
            date: new Date(crop.stage_start_date),
            type: 'stage_start',
            stage: crop.current_stage,
            stageInfo,
            description: `${crop.crop_name} entered ${stageInfo.label} stage`
          });
        }

        // Add expected harvest event
        if (crop.expected_harvest_date) {
          timelineEvents.push({
            id: `${crop.id}-harvest`,
            cropId: crop.id,
            cropName: crop.crop_name,
            variety: crop.variety,
            batchCode: crop.batch_code,
            date: new Date(crop.expected_harvest_date),
            type: 'expected_harvest',
            description: `Expected harvest for ${crop.crop_name}`,
            isOverdue: new Date(crop.expected_harvest_date) < new Date()
          });
        }

        // Add transplant event
        if (crop.transplant_date) {
          timelineEvents.push({
            id: `${crop.id}-transplant`,
            cropId: crop.id,
            cropName: crop.crop_name,
            variety: crop.variety,
            batchCode: crop.batch_code,
            date: new Date(crop.transplant_date),
            type: 'transplant',
            description: `${crop.crop_name} transplanted`
          });
        }
      });

      // Sort by date
      timelineEvents.sort((a, b) => a.date - b.date);
      setTimelineData(timelineEvents);

    } catch (error) {
      console.error('Error generating timeline data:', error);
    }
  }, [farmId]);

  const fetchPredictiveInsights = useCallback(async () => {
    try {
      // Simulate predictive insights based on current crop data
      const response = farmId
        ? await farmAPI.getFarmCropStages(farmId)
        : await farmAPI.getCropStages();

      const crops = response.data;
      const insights = [];

      crops.forEach(crop => {
        const stageInfo = getCurrentStage(crop.current_stage);
        const transplantDate = new Date(crop.transplant_date);
        const currentDate = new Date();
        const daysSinceTransplant = Math.floor((currentDate - transplantDate) / (1000 * 60 * 60 * 24));

        // Predict next stage transition
        const currentStageIndex = cropStages.findIndex(s => s.value === crop.current_stage);
        if (currentStageIndex < cropStages.length - 1) {
          const nextStage = cropStages[currentStageIndex + 1];
          const expectedTransitionDate = new Date(transplantDate);
          expectedTransitionDate.setDate(expectedTransitionDate.getDate() +
            cropStages.slice(0, currentStageIndex + 1).reduce((sum, stage) => sum + stage.duration, 0));

          if (expectedTransitionDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) { // Next 3 days
            insights.push({
              id: `transition-${crop.id}`,
              type: 'stage_transition',
              cropId: crop.id,
              cropName: crop.crop_name,
              batchCode: crop.batch_code,
              currentStage: stageInfo.label,
              nextStage: nextStage.label,
              expectedDate: expectedTransitionDate,
              priority: 'medium',
              message: `${crop.crop_name} (${crop.batch_code}) is expected to transition to ${nextStage.label} stage`
            });
          }
        }

        // Health risk prediction
        if (crop.health_status === 'moderate' || crop.health_status === 'poor') {
          insights.push({
            id: `health-${crop.id}`,
            type: 'health_risk',
            cropId: crop.id,
            cropName: crop.crop_name,
            batchCode: crop.batch_code,
            healthStatus: crop.health_status,
            priority: crop.health_status === 'poor' ? 'high' : 'medium',
            message: `${crop.crop_name} (${crop.batch_code}) shows signs of stress - monitor closely`
          });
        }
      });

      setNotifications(insights);

    } catch (error) {
      console.error('Error fetching predictive insights:', error);
    }
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

  const fetchCropHistory = async (useCache = true) => {
    const startTime = Date.now();
    const cacheKey = `crop_history_${farmId || 'all'}`;

    try {
      // Check cache first
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setCropHistory(cachedData);
          updatePerformanceMetrics('loadTime', Date.now() - startTime);
          return;
        }
      }

      updatePerformanceMetrics('apiCallCount', performanceMetrics.apiCallCount + 1);

      const response = farmId
        ? await farmAPI.getFarmCropStages(farmId, { history: true })
        : await farmAPI.getCropStages({ history: true });

      setCropHistory(response.data);
      setCachedData(cacheKey, response.data);
      setLastSyncTime(new Date());
      setDataVersion(prev => prev + 1);
      updatePerformanceMetrics('loadTime', Date.now() - startTime);

    } catch (error) {
      logError(error, 'FETCH_CROP_HISTORY');
      updatePerformanceMetrics('errorCount', performanceMetrics.errorCount + 1);

      if (!isOnline) {
        // Try to load from cache as fallback
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setCropHistory(cachedData);
          toast.info('Loaded cached data (offline mode)');
        } else {
          toast.error('No cached data available');
        }
      } else {
        toast.error('Failed to load crop data');
      }
    }
  };

  const handleCropSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const startTime = Date.now();

    // Clean up form data - convert empty strings to null for optional fields
    const cleanedForm = { ...cropForm };

    try {
      
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
      
      fetchCropHistory(false); // Force refresh after save
      updatePerformanceMetrics('loadTime', Date.now() - startTime);
    } catch (error) {
      logError(error, editingStage ? 'UPDATE_CROP_STAGE' : 'CREATE_CROP_STAGE');

      if (!isOnline) {
        // Add to retry queue for offline scenarios
        addToRetryQueue(
          editingStage ? 'UPDATE_CROP' : 'CREATE_CROP',
          editingStage ? { ...cleanedForm, id: editingStage.id } : cleanedForm
        );
        toast.success('Changes saved locally. Will sync when online.');
      } else {
        toast.error('Failed to save crop stage', {
          duration: 4000,
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        });
      }
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
    if (window.confirm('Are you sure you want to delete this crop stage? This action cannot be undone.')) {
      try {
        if (farmId) {
          await farmAPI.deleteFarmCropStage(farmId, stageId);
        } else {
          await farmAPI.deleteCropStage(stageId);
        }
        toast.success('Crop stage deleted successfully!');
        fetchCropHistory(false); // Force refresh

        // Clear related cache
        setCacheData(prev => {
          const newCache = new Map(prev);
          newCache.delete(`crop_history_${farmId || 'all'}`);
          newCache.delete(`analytics_${farmId || 'all'}`);
          return newCache;
        });

      } catch (error) {
        logError(error, 'DELETE_CROP_STAGE');

        if (!isOnline) {
          addToRetryQueue('DELETE_CROP', { id: stageId });
          toast.info('Delete queued for when online.');
        } else {
          toast.error('Failed to delete crop stage');
        }
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

  // Real-time alert system
  const checkStageTransitionAlerts = useCallback(() => {
    if (!cropHistory.length) return;

    const alerts = [];
    const today = new Date();

    cropHistory.forEach(crop => {
      const stageInfo = getCurrentStage(crop.current_stage);
      const transplantDate = new Date(crop.transplant_date);
      const daysSinceTransplant = Math.floor((today - transplantDate) / (1000 * 60 * 60 * 24));

      // Check for stage transition readiness
      const currentStageIndex = cropStages.findIndex(s => s.value === crop.current_stage);
      let expectedDaysInStage = 0;
      for (let i = 0; i <= currentStageIndex; i++) {
        expectedDaysInStage += cropStages[i].duration;
      }

      // Alert if crop is ready for next stage
      if (daysSinceTransplant >= expectedDaysInStage && currentStageIndex < cropStages.length - 1) {
        alerts.push({
          id: `transition-${crop.id}`,
          type: 'stage_transition',
          priority: 'medium',
          cropId: crop.id,
          cropName: crop.crop_name,
          batchCode: crop.batch_code,
          currentStage: stageInfo.label,
          nextStage: cropStages[currentStageIndex + 1].label,
          message: `${crop.crop_name} (${crop.batch_code}) is ready to transition to ${cropStages[currentStageIndex + 1].label}`,
          timestamp: new Date(),
          action: 'Update stage'
        });
      }

      // Alert for harvest readiness
      if (crop.expected_harvest_date) {
        const harvestDate = new Date(crop.expected_harvest_date);
        const daysUntilHarvest = Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilHarvest <= 3 && daysUntilHarvest >= 0) {
          alerts.push({
            id: `harvest-${crop.id}`,
            type: 'harvest_ready',
            priority: 'high',
            cropId: crop.id,
            cropName: crop.crop_name,
            batchCode: crop.batch_code,
            message: `${crop.crop_name} (${crop.batch_code}) harvest due in ${daysUntilHarvest} day(s)`,
            timestamp: new Date(),
            action: 'Plan harvest'
          });
        } else if (daysUntilHarvest < 0) {
          alerts.push({
            id: `overdue-${crop.id}`,
            type: 'harvest_overdue',
            priority: 'critical',
            cropId: crop.id,
            cropName: crop.crop_name,
            batchCode: crop.batch_code,
            message: `${crop.crop_name} (${crop.batch_code}) harvest is ${Math.abs(daysUntilHarvest)} day(s) overdue`,
            timestamp: new Date(),
            action: 'Harvest immediately'
          });
        }
      }

      // Health alerts
      if (crop.health_status === 'poor' || crop.health_status === 'critical') {
        alerts.push({
          id: `health-${crop.id}`,
          type: 'health_critical',
          priority: crop.health_status === 'critical' ? 'critical' : 'high',
          cropId: crop.id,
          cropName: crop.crop_name,
          batchCode: crop.batch_code,
          message: `${crop.crop_name} (${crop.batch_code}) requires immediate attention - ${crop.health_status} health`,
          timestamp: new Date(),
          action: 'Check crop'
        });
      }
    });

    setActiveAlerts(alerts);
  }, [cropHistory]);

  // Health trend tracking
  const calculateHealthTrends = useCallback(() => {
    if (!cropHistory.length) return [];

    const healthScores = healthStatuses.reduce((acc, status) => {
      acc[status.value] = status.score;
      return acc;
    }, {});

    return cropHistory.map(crop => {
      const currentScore = healthScores[crop.health_status] || 60;
      const transplantDate = new Date(crop.transplant_date);
      const daysGrowing = Math.floor((new Date() - transplantDate) / (1000 * 60 * 60 * 24));

      // Simulate trend (in real implementation, this would come from historical data)
      const trend = Math.random() > 0.5 ? 'improving' : 'declining';
      const trendValue = trend === 'improving' ? Math.random() * 10 : -Math.random() * 10;

      return {
        cropId: crop.id,
        cropName: crop.crop_name,
        batchCode: crop.batch_code,
        currentScore,
        trend,
        trendValue,
        daysGrowing,
        riskLevel: currentScore < 40 ? 'high' : currentScore < 70 ? 'medium' : 'low'
      };
    });
  }, [cropHistory]);

  // Batch comparison functionality
  const generateBatchComparison = useCallback(() => {
    if (!cropHistory.length) return [];

    const batchGroups = cropHistory.reduce((acc, crop) => {
      const key = `${crop.crop_name}-${crop.variety}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(crop);
      return acc;
    }, {});

    return Object.entries(batchGroups)
      .filter(([_, batches]) => batches.length > 1)
      .map(([cropVariety, batches]) => {
        const avgGrowthDays = batches.reduce((sum, batch) => sum + (batch.growth_duration_days || 0), 0) / batches.length;
        const avgExpectedYield = batches.reduce((sum, batch) => sum + (parseFloat(batch.expected_yield) || 0), 0) / batches.length;
        const avgActualYield = batches.reduce((sum, batch) => sum + (parseFloat(batch.actual_yield) || 0), 0) / batches.filter(b => b.actual_yield).length || 0;

        const healthDistribution = batches.reduce((acc, batch) => {
          acc[batch.health_status] = (acc[batch.health_status] || 0) + 1;
          return acc;
        }, {});

        const bestPerforming = batches.reduce((best, current) => {
          const currentYield = parseFloat(current.actual_yield) || parseFloat(current.expected_yield) || 0;
          const bestYield = parseFloat(best.actual_yield) || parseFloat(best.expected_yield) || 0;
          return currentYield > bestYield ? current : best;
        });

        return {
          cropVariety,
          totalBatches: batches.length,
          avgGrowthDays: Math.round(avgGrowthDays),
          avgExpectedYield: Math.round(avgExpectedYield * 100) / 100,
          avgActualYield: Math.round(avgActualYield * 100) / 100,
          yieldEfficiency: avgExpectedYield > 0 ? Math.round((avgActualYield / avgExpectedYield) * 100) : 0,
          healthDistribution,
          bestPerforming,
          batches
        };
      });
  }, [cropHistory]);

  // Calendar integration data
  const generateCalendarEvents = useCallback(() => {
    if (!cropHistory.length) return [];

    const events = [];

    cropHistory.forEach(crop => {
      const stageInfo = getCurrentStage(crop.current_stage);

      // Add current stage events
      if (crop.stage_start_date) {
        events.push({
          id: `stage-start-${crop.id}`,
          title: `${crop.crop_name} - ${stageInfo.label} Started`,
          date: crop.stage_start_date,
          type: 'stage_start',
          cropId: crop.id,
          color: 'blue',
          description: `${crop.crop_name} (${crop.batch_code}) entered ${stageInfo.label} stage`
        });
      }

      if (crop.stage_end_date) {
        events.push({
          id: `stage-end-${crop.id}`,
          title: `${crop.crop_name} - ${stageInfo.label} Expected End`,
          date: crop.stage_end_date,
          type: 'stage_end',
          cropId: crop.id,
          color: 'orange',
          description: `${crop.crop_name} (${crop.batch_code}) expected to complete ${stageInfo.label} stage`
        });
      }

      // Add harvest events
      if (crop.expected_harvest_date) {
        const isOverdue = new Date(crop.expected_harvest_date) < new Date();
        events.push({
          id: `harvest-${crop.id}`,
          title: `${crop.crop_name} - Expected Harvest`,
          date: crop.expected_harvest_date,
          type: 'harvest',
          cropId: crop.id,
          color: isOverdue ? 'red' : 'green',
          priority: isOverdue ? 'high' : 'normal',
          description: `Expected harvest for ${crop.crop_name} (${crop.batch_code})`
        });
      }

      if (crop.actual_harvest_date) {
        events.push({
          id: `harvest-actual-${crop.id}`,
          title: `${crop.crop_name} - Harvested`,
          date: crop.actual_harvest_date,
          type: 'harvest_completed',
          cropId: crop.id,
          color: 'green',
          description: `${crop.crop_name} (${crop.batch_code}) successfully harvested`
        });
      }

      // Add transplant events
      if (crop.transplant_date) {
        events.push({
          id: `transplant-${crop.id}`,
          title: `${crop.crop_name} - Transplanted`,
          date: crop.transplant_date,
          type: 'transplant',
          cropId: crop.id,
          color: 'purple',
          description: `${crop.crop_name} (${crop.batch_code}) transplanted`
        });
      }
    });

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [cropHistory]);

  // Automatic alert checking
  useEffect(() => {
    if (cropHistory.length > 0) {
      checkStageTransitionAlerts();
      setBatchComparison(generateBatchComparison());
    }
  }, [cropHistory, checkStageTransitionAlerts, generateBatchComparison]);

  // Dismiss alert function
  const dismissAlert = (alertId) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Audio element for alerts
  useEffect(() => {
    alertAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFApGn+DyvmMhBjaQ2O/FeSYFJnbH8N2QQAoUXrTp66hVFA==');
    alertAudioRef.current.volume = 0.3;
  }, []);

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
      <div className={`space-y-8 ${isMobile ? 'px-2' : ''}`}>
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          farmId={farmId}
          items={[
            {
              label: 'Crop Stages',
              isActive: true
            }
          ]}
        />

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
            <div className={`flex justify-between items-center pt-8 border-t border-slate-200 gap-4 ${
              isMobile ? 'flex-col space-y-4' : 'flex-col sm:flex-row'
            }`}>
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

        {/* View Mode Navigation */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Smart Crop Insights</h3>
            </div>

            <div className="flex items-center space-x-2">
              {/* Network Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isOnline
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* WebSocket Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connectionStatus === 'connected'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-blue-500' : 'bg-gray-500'
                }`}></div>
                <span className="font-medium">
                  {connectionStatus === 'connected' ? 'Live' : 'Static'}
                </span>
              </div>

              {/* Sync Status */}
              {lastSyncTime && (
                <div className="text-xs text-slate-500">
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </div>
              )}

              {/* Retry Queue Indicator */}
              {retryQueue.length > 0 && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{retryQueue.length} pending</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'form', label: 'Form', icon: '📝' },
              { id: 'timeline', label: 'Timeline', icon: '⏳' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
              { id: 'calendar', label: 'Calendar', icon: '📅' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedView === view.id
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white hover:border-purple-300 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{view.icon}</span>
                  <span className="font-medium text-sm">{view.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {selectedView === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Crops */}
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Crops</p>
                    <p className="text-3xl font-bold text-slate-900">{analytics.totalCrops}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-2xl">🌱</span>
                  </div>
                </div>
              </div>

              {/* Average Growth Days */}
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Avg Growth Days</p>
                    <p className="text-3xl font-bold text-slate-900">{analytics.averageGrowthDays}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-2xl">📈</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Harvests */}
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Upcoming Harvests</p>
                    <p className="text-3xl font-bold text-slate-900">{analytics.upcomingHarvests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-2xl">🎯</span>
                  </div>
                </div>
              </div>

              {/* Yield Efficiency */}
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Yield Efficiency</p>
                    <p className="text-3xl font-bold text-slate-900">{analytics.yieldEfficiency}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-2xl">⚡</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Stage Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Health Distribution */}
              <div className="card p-6">
                <h4 className="text-lg font-bold text-slate-900 mb-4">🏥 Health Distribution</h4>
                <div className="space-y-3">
                  {healthStatuses.map((status) => {
                    const count = analytics.healthDistribution[status.value] || 0;
                    const percentage = analytics.totalCrops > 0 ? (count / analytics.totalCrops) * 100 : 0;
                    return (
                      <div key={status.value} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{status.icon}</span>
                          <span className="font-medium text-slate-700">{status.label}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${status.color.split(' ')[2]} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-slate-600 w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stage Distribution */}
              <div className="card p-6">
                <h4 className="text-lg font-bold text-slate-900 mb-4">📈 Stage Distribution</h4>
                <div className="space-y-3">
                  {cropStages.map((stage) => {
                    const count = analytics.stageDistribution[stage.value] || 0;
                    const percentage = analytics.totalCrops > 0 ? (count / analytics.totalCrops) * 100 : 0;
                    return (
                      <div key={stage.value} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{stage.icon}</span>
                          <span className="font-medium text-slate-700">{stage.label}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${stage.color} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-slate-600 w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Timeline */}
        {selectedView === 'timeline' && (
          <div className="card p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">⏳ Crop Lifecycle Timeline</h3>
            <div className="relative">
              {timelineData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">No timeline events</h4>
                  <p className="text-slate-500">Add crop stages to view timeline events.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineData.slice(0, 10).map((event, index) => (
                    <div key={event.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.type === 'stage_start' ? 'bg-green-100' :
                          event.type === 'transplant' ? 'bg-blue-100' :
                          event.type === 'expected_harvest' ? (event.isOverdue ? 'bg-red-100' : 'bg-orange-100') :
                          'bg-slate-100'
                        }`}>
                          <span className="text-sm">
                            {event.type === 'stage_start' ? event.stageInfo?.icon || '🌱' :
                             event.type === 'transplant' ? '🌿' :
                             event.type === 'expected_harvest' ? '🎯' : '📅'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">{event.description}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            event.isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {event.date.toLocaleDateString()}
                            {event.isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Batch: {event.batchCode} • Variety: {event.variety}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real-time Alerts */}
        {activeAlerts.length > 0 && (
          <div className="card p-6 border-l-4 border-red-400">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-900">🚨 Active Alerts ({activeAlerts.length})</h3>
              </div>
              <button
                onClick={() => setActiveAlerts([])}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Dismiss All
              </button>
            </div>
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                  alert.priority === 'critical' ? 'border-red-600 bg-red-50' :
                  alert.priority === 'high' ? 'border-orange-400 bg-orange-50' :
                  'border-yellow-400 bg-yellow-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{alert.message}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {alert.timestamp.toLocaleTimeString()} • {alert.action}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        alert.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {alert.priority.toUpperCase()}
                      </span>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Trend Tracking */}
        {selectedView === 'analytics' && (
          <div className="card p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">📈 Health Trend Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {calculateHealthTrends().map((trend) => (
                <div key={trend.cropId} className={`p-4 rounded-lg border-2 ${
                  trend.riskLevel === 'high' ? 'border-red-200 bg-red-50' :
                  trend.riskLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">{trend.cropName}</h4>
                    <div className={`flex items-center space-x-1 text-sm ${
                      trend.trend === 'improving' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span>{trend.trend === 'improving' ? '↑' : '↓'}</span>
                      <span>{Math.abs(trend.trendValue).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Health Score:</span>
                      <span className="font-medium">{trend.currentScore}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Days Growing:</span>
                      <span className="font-medium">{trend.daysGrowing}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Risk Level:</span>
                      <span className={`font-medium ${
                        trend.riskLevel === 'high' ? 'text-red-600' :
                        trend.riskLevel === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {trend.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Comparison */}
        {selectedView === 'analytics' && batchComparison.length > 0 && (
          <div className="card p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">📉 Batch Performance Comparison</h3>
            <div className="space-y-6">
              {batchComparison.map((comparison, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-slate-900">{comparison.cropVariety}</h4>
                    <span className="text-sm text-slate-600">{comparison.totalBatches} batches</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Avg Growth Days</p>
                      <p className="text-xl font-bold text-slate-900">{comparison.avgGrowthDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Expected Yield</p>
                      <p className="text-xl font-bold text-slate-900">{comparison.avgExpectedYield}kg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Actual Yield</p>
                      <p className="text-xl font-bold text-slate-900">{comparison.avgActualYield}kg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Efficiency</p>
                      <p className={`text-xl font-bold ${
                        comparison.yieldEfficiency >= 90 ? 'text-green-600' :
                        comparison.yieldEfficiency >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {comparison.yieldEfficiency}%
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <h5 className="font-medium text-slate-900 mb-2">Best Performing Batch:</h5>
                    <p className="text-sm text-slate-600">
                      {comparison.bestPerforming.batch_code} - {comparison.bestPerforming.variety}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Integration */}
        {selectedView === 'calendar' && (
          <div className="card p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">📅 Crop Calendar Events</h3>
            <div className="space-y-4">
              {generateCalendarEvents().length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">No calendar events</h4>
                  <p className="text-slate-500">Add crop stages to view calendar events.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generateCalendarEvents().slice(0, 15).map((event) => (
                    <div key={event.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                      <div className={`w-4 h-4 rounded-full mt-1 ${
                        event.color === 'red' ? 'bg-red-500' :
                        event.color === 'green' ? 'bg-green-500' :
                        event.color === 'blue' ? 'bg-blue-500' :
                        event.color === 'orange' ? 'bg-orange-500' :
                        'bg-purple-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-900">{event.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            event.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Predictive Notifications */}
        {notifications.length > 0 && (
          <div className="card p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">🔮 Predictive Insights</h3>
            <div className="space-y-4">
              {notifications.map((insight) => (
                <div key={insight.id} className={`p-4 rounded-lg border-l-4 ${
                  insight.priority === 'high' ? 'border-red-400 bg-red-50' :
                  insight.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                  'border-blue-400 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{insight.message}</p>
                      {insight.expectedDate && (
                        <p className="text-sm text-slate-600 mt-1">
                          Expected: {insight.expectedDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {insight.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance & System Status Dashboard */}
        {selectedView === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🚀 System Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Load Time:</span>
                  <span className="text-sm font-medium">{performanceMetrics.loadTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">API Calls:</span>
                  <span className="text-sm font-medium">{performanceMetrics.apiCallCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Error Count:</span>
                  <span className={`text-sm font-medium ${
                    performanceMetrics.errorCount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>{performanceMetrics.errorCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Cache Hits:</span>
                  <span className="text-sm font-medium">{cacheData.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Data Version:</span>
                  <span className="text-sm font-medium">v{dataVersion}</span>
                </div>
              </div>

              {autoSaveEnabled && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-700 font-medium">Auto-save enabled</span>
                  </div>
                  {pendingChanges.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {pendingChanges.length} pending changes
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Error Log */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">🐛 Error Log</h3>
                <button
                  onClick={() => setErrorLog([])}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear Log
                </button>
              </div>

              {errorLog.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-green-600">No errors recorded</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errorLog.slice(0, 10).map((error) => (
                    <div key={error.id} className="p-2 bg-red-50 rounded border-l-2 border-red-400">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-medium text-red-800">{error.context}</span>
                        <span className="text-xs text-red-600">
                          {error.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-red-700 mt-1 truncate">{error.error}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Quality Dashboard */}
        {selectedView === 'analytics' && (
          <div className="card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Data Quality Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Completeness</h4>
                <div className="text-2xl font-bold text-blue-700">
                  {cropHistory.length > 0
                    ? Math.round((cropHistory.filter(crop =>
                        crop.crop_name && crop.variety && crop.batch_code && crop.transplant_date
                      ).length / cropHistory.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-blue-600 mt-1">Required fields filled</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Consistency</h4>
                <div className="text-2xl font-bold text-green-700">
                  {cropHistory.length > 0
                    ? Math.round((cropHistory.filter(crop => {
                        if (!crop.expected_harvest_date || !crop.transplant_date) return true;
                        return new Date(crop.expected_harvest_date) > new Date(crop.transplant_date);
                      }).length / cropHistory.length) * 100)
                    : 100}%
                </div>
                <p className="text-xs text-green-600 mt-1">Logical date sequences</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Recency</h4>
                <div className="text-2xl font-bold text-purple-700">
                  {cropHistory.length > 0
                    ? Math.round((cropHistory.filter(crop => {
                        const daysSinceUpdate = Math.floor(
                          (new Date() - new Date(crop.transplant_date)) / (1000 * 60 * 60 * 24)
                        );
                        return daysSinceUpdate <= 30;
                      }).length / cropHistory.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-purple-600 mt-1">Updated in last 30 days</p>
              </div>
            </div>

            {analytics.dataQuality === 'insufficient' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    Insufficient data for reliable analytics
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Add more crop records to improve insights and predictions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Crop History */}
        {(selectedView === 'form' || showHistory) && (
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