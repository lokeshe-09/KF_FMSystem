import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { farmAPI } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

// Production constants
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for calendar data
const REFRESH_INTERVAL = 60000; // 1 minute auto-refresh
const EVENT_TYPES = {
  HARVEST: 'harvest',
  STAGE_TRANSITION: 'stage_transition',
  TRANSPLANT: 'transplant',
  SOWING: 'sowing',
  HEALTH_CHECK: 'health_check',
  FERTIGATION: 'fertigation',
  DAILY_TASK: 'daily_task',
  WATER_MEASUREMENT: 'water_measurement',
  HYGIENE_CHECK: 'hygiene_check',
  SPRAY_SCHEDULED: 'spray_scheduled',
  SPRAY_COMPLETED: 'spray_completed',
  SPRAY_REMINDER: 'spray_reminder',
  PHI_COMPLETION: 'phi_completion',
  FERTIGATION_COMPLETED: 'fertigation_completed',
  FERTIGATION_SCHEDULED: 'fertigation_scheduled',
  WORKER_TASK_ASSIGNED: 'worker_task_assigned',
  WORKER_TASK_DUE: 'worker_task_due',
  WORKER_TASK_COMPLETED: 'worker_task_completed',
  WORKER_TASK_ISSUE: 'worker_task_issue',
  ISSUE_REPORTED: 'issue_reported',
  ISSUE_RESOLVED: 'issue_resolved',
  ISSUE_FOLLOWUP: 'issue_followup',
  EXPENDITURE_RECORDED: 'expenditure_recorded',
  PAYMENT_DUE: 'payment_due',
  BUDGET_REVIEW: 'budget_review',
  SALE_RECORDED: 'sale_recorded',
  SALE_PAYMENT_DUE: 'sale_payment_due',
  DELIVERY_SCHEDULED: 'delivery_scheduled',
  IRRIGATION_APPLIED: 'irrigation_applied',
  IRRIGATION_SCHEDULED: 'irrigation_scheduled',
  WATER_USAGE_TRACKING: 'water_usage_tracking',
  CONFLICT_DETECTED: 'conflict_detected',
  OPTIMIZATION_SUGGESTION: 'optimization_suggestion',
  CUSTOM: 'custom'
};


const Calendar = () => {
  const { farmId } = useParams(); // Farm-specific context
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cropStages, setCropStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [allEvents, setAllEvents] = useState({});
  const [selectedFarm, setSelectedFarm] = useState(farmId || '');
  const [farms, setFarms] = useState([]);
  const [dailyTasksData, setDailyTasksData] = useState([]);
  const [spraySchedulesData, setSpraySchedulesData] = useState([]);
  const [fertigationData, setFertigationData] = useState([]);
  const [workerTasksData, setWorkerTasksData] = useState([]);
  const [issueReportsData, setIssueReportsData] = useState([]);
  const [expendituresData, setExpendituresData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [irrigationData, setIrrigationData] = useState([]);
  const [conflictAnalysis, setConflictAnalysis] = useState({});
  const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day', 'agenda'
  const [eventFilter, setEventFilter] = useState('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [cacheData, setCacheData] = useState(new Map());
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [optimizationRecommendations, setOptimizationRecommendations] = useState([]);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'ical',
    dateRange: 'current_month',
    eventTypes: [],
    includeCompleted: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const refreshIntervalRef = useRef(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Utility functions (moved before useMemo)
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Event filtering function (moved before useMemo)
  const getFilteredEvents = (events) => {
    return events.filter(event => {
      // Farm-specific filtering (security)
      if (selectedFarm && event.farmId && event.farmId !== parseInt(selectedFarm)) {
        return false;
      }

      // Event type filtering
      switch (eventFilter) {
        case 'all':
          return true;
        case 'overdue':
          return event.isOverdue || event.priority === 'high';
        case 'upcoming':
          const eventDate = new Date(event.date || formatDate(new Date()));
          const daysDiff = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 0 && daysDiff <= 7;
        default:
          return event.type === eventFilter;
      }
    });
  };

  // Memoized calculations for performance
  const filteredAllEvents = useMemo(() => {
    const filtered = {};
    Object.entries(allEvents).forEach(([date, events]) => {
      const dayFiltered = getFilteredEvents(events);
      if (dayFiltered.length > 0) {
        filtered[date] = dayFiltered;
      }
    });
    return filtered;
  }, [allEvents, eventFilter, selectedFarm]);

  // Update the event display functions to use memoized data
  const getMemoizedHasEvents = useCallback((date) => {
    if (!date) return false;
    const dateKey = formatDate(date);
    return filteredAllEvents[dateKey] && filteredAllEvents[dateKey].length > 0;
  }, [filteredAllEvents]);

  const getMemoizedDateEvents = useCallback((date) => {
    if (!date) return [];
    const dateKey = formatDate(date);
    return filteredAllEvents[dateKey] || [];
  }, [filteredAllEvents]);

  // Real-time WebSocket integration
  const handleWebSocketMessage = useCallback((notification) => {
    if (notification.type === 'crop_stage_update' ||
        notification.type === 'harvest_alert' ||
        notification.type === 'calendar_event') {

      // Only update if it's for the current farm
      if (!farmId || notification.farm_id === parseInt(farmId)) {
        fetchCropStages(false); // Force refresh

        // Add real-time alert
        if (notification.type === 'harvest_alert') {
          setActiveAlerts(prev => [{
            id: Date.now(),
            message: notification.message,
            type: 'harvest',
            timestamp: new Date(),
            farmId: notification.farm_id
          }, ...prev.slice(0, 9)]);
        }
      }
    }
  }, [farmId]);

  // Calendar Export Functions
  const exportCalendar = useCallback((format, options) => {
    setIsExporting(true);

    try {
      const eventsToExport = filterEventsForExport(options);
      let result;

      switch (format) {
        case 'ical':
          result = generateICalFile(eventsToExport);
          downloadFile(result.content, result.filename, 'text/calendar');
          break;
        case 'google':
          result = exportToGoogleCalendar(eventsToExport);
          if (result.url) window.open(result.url, '_blank');
          break;
        case 'outlook':
          result = exportToOutlook(eventsToExport);
          downloadFile(result.content, result.filename, 'text/calendar');
          break;
        case 'csv':
          result = generateCSVFile(eventsToExport);
          downloadFile(result.content, result.filename, 'text/csv');
          break;
        case 'json':
          result = generateJSONFile(eventsToExport);
          downloadFile(result.content, result.filename, 'application/json');
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      toast.success(`Calendar exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export calendar');
    } finally {
      setIsExporting(false);
    }
  }, [allEvents]);

  const filterEventsForExport = useCallback((options) => {
    let eventsToExport = [];
    const { dateRange, eventTypes, includeCompleted } = options;

    // Get date range
    let startDate, endDate;
    const today = new Date();

    switch (dateRange) {
      case 'current_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'next_month':
        startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        break;
      case 'next_3_months':
        startDate = new Date(today);
        endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
        break;
      case 'next_6_months':
        startDate = new Date(today);
        endDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);
        break;
      case 'all':
      default:
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() + 1, 11, 31);
        break;
    }

    // Filter events by date range and options
    Object.entries(allEvents).forEach(([dateKey, events]) => {
      const eventDate = new Date(dateKey);
      if (eventDate >= startDate && eventDate <= endDate) {
        const filteredEvents = events.filter(event => {
          // Filter by event types
          if (eventTypes.length > 0 && !eventTypes.includes(event.type)) {
            return false;
          }

          // Filter by completion status
          if (!includeCompleted && event.status === 'completed') {
            return false;
          }

          return true;
        });

        eventsToExport = [...eventsToExport, ...filteredEvents];
      }
    });

    return eventsToExport.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allEvents]);

  const generateICalFile = useCallback((events) => {
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Farm Management System//Calendar Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach(event => {
      const eventDate = new Date(event.date);
      const startDateTime = event.time ?
        new Date(`${event.date}T${event.time}:00`) :
        new Date(event.date + 'T09:00:00');
      const endDateTime = new Date(startDateTime.getTime() + (event.duration || 60) * 60000);

      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${event.id}-${selectedFarm}@farm-management.com`,
        `DTSTART:${formatICalDate(startDateTime)}`,
        `DTEND:${formatICalDate(endDateTime)}`,
        `SUMMARY:${escapeICalText(event.title)}`,
        `DESCRIPTION:${escapeICalText(event.description || '')}`,
        `LOCATION:${escapeICalText(event.location || selectedFarm)}`,
        `CATEGORIES:${event.type.toUpperCase()}`,
        `STATUS:${event.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    });

    icalContent.push('END:VCALENDAR');

    return {
      content: icalContent.join('\r\n'),
      filename: `farm-calendar-${selectedFarm}-${new Date().toISOString().split('T')[0]}.ics`
    };
  }, [selectedFarm]);

  const formatICalDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeICalText = (text) => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const generateCSVFile = useCallback((events) => {
    const headers = ['Date', 'Time', 'Title', 'Description', 'Type', 'Status', 'Location', 'Priority'];
    const rows = [headers];

    events.forEach(event => {
      rows.push([
        event.date,
        event.time || '',
        event.title,
        event.description || '',
        event.type,
        event.status || 'pending',
        event.location || selectedFarm,
        event.priority || 'normal'
      ]);
    });

    const csvContent = rows.map(row =>
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    return {
      content: csvContent,
      filename: `farm-calendar-${selectedFarm}-${new Date().toISOString().split('T')[0]}.csv`
    };
  }, [selectedFarm]);

  const generateJSONFile = useCallback((events) => {
    const exportData = {
      farmId: selectedFarm,
      exportDate: new Date().toISOString(),
      eventCount: events.length,
      events: events.map(event => ({
        ...event,
        exportedAt: new Date().toISOString()
      }))
    };

    return {
      content: JSON.stringify(exportData, null, 2),
      filename: `farm-calendar-${selectedFarm}-${new Date().toISOString().split('T')[0]}.json`
    };
  }, [selectedFarm]);

  const exportToGoogleCalendar = useCallback((events) => {
    // Google Calendar URL format for single event (multiple events require API)
    if (events.length === 1) {
      const event = events[0];
      const startDate = new Date(`${event.date}T${event.time || '09:00'}:00`);
      const endDate = new Date(startDate.getTime() + (event.duration || 60) * 60000);

      const googleUrl = new URL('https://calendar.google.com/calendar/render');
      googleUrl.searchParams.set('action', 'TEMPLATE');
      googleUrl.searchParams.set('text', event.title);
      googleUrl.searchParams.set('dates',
        `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
      googleUrl.searchParams.set('details', event.description || '');
      googleUrl.searchParams.set('location', event.location || selectedFarm);

      return { url: googleUrl.toString() };
    } else {
      // For multiple events, generate ICS and let user import
      const icsData = generateICalFile(events);
      downloadFile(icsData.content, icsData.filename, 'text/calendar');
      toast.info('Multiple events exported as ICS file. Import to Google Calendar.');
      return { url: null };
    }
  }, [selectedFarm, generateICalFile]);

  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const exportToOutlook = useCallback((events) => {
    // Outlook uses ICS format
    return generateICalFile(events);
  }, [generateICalFile]);

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const { connectionStatus } = useWebSocket(handleWebSocketMessage);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchCropStages(false); // Force refresh when back online
      toast.success('Back online! Syncing calendar data...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline mode. Using cached calendar data.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-refresh calendar data
  useEffect(() => {
    if (isOnline) {
      refreshIntervalRef.current = setInterval(() => {
        fetchCropStages(true); // Use cache if available
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFarms();
    fetchCropStages();
  }, [selectedFarm, farmId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cache management
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

  // Fetch farms for dropdown (with proper data isolation)
  const fetchFarms = useCallback(async () => {
    try {
      const response = await farmAPI.getFarms();
      // Security: Only show farms user has access to
      setFarms(response.data);

      if (!selectedFarm && response.data.length > 0) {
        setSelectedFarm(farmId || response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching farms:', error);
      setFarms([]);
      setHasError(true);
      setErrorMessage(`Failed to fetch farms: ${error.message || 'Network error'}`);
    }
  }, [farmId]);

  const fetchCropStages = useCallback(async (useCache = true) => {
    if (!selectedFarm) return;

    const cacheKey = `calendar_data_${selectedFarm}`;

    try {
      // Check cache first
      if (useCache && isOnline) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setCropStages(cachedData.crops);
          setAllEvents(cachedData.events);
          return;
        }
      }

      // Only show loading if we don't have data already
      if (cropStages.length === 0 || !allEvents || Object.keys(allEvents).length === 0) {
        setLoading(true);
      }

      // Fetch farm-specific data only (prevents data leakage)
      const [cropResponse, dailyTasksResponse] = await Promise.all([
        selectedFarm
          ? farmAPI.getFarmCropStages(selectedFarm, {
              include_all_events: true,
              include_predictions: true
            })
          : farmAPI.getCropStages({
              include_all_events: true,
              include_predictions: true
            }),
        selectedFarm
          ? farmAPI.getFarmDailyTasks(selectedFarm, { history: true, upcoming: true })
          : farmAPI.getDailyTasks({ history: true, upcoming: true })
      ]);

      const crops = cropResponse.data;
      const dailyTasks = dailyTasksResponse.data || [];
      const spraySchedules = [];
      const fertigations = [];
      const workerTasks = [];
      const issueReports = [];
      const expenditures = [];
      const sales = [];
      const irrigations = [];

      setCropStages(crops);
      setDailyTasksData(dailyTasks);
      setSpraySchedulesData(spraySchedules);
      setFertigationData(fertigations);
      setWorkerTasksData(workerTasks);
      setIssueReportsData(issueReports);
      setExpendituresData(expenditures);
      setSalesData(sales);
      setIrrigationData(irrigations);

      // Generate comprehensive events map
      const events = generateAllEvents(crops, dailyTasks, spraySchedules, fertigations, workerTasks, issueReports, expenditures, sales, irrigations);

      // Set events directly (simplified for now)
      setAllEvents(events);
      setConflictAnalysis({});
      setOptimizationSuggestions([]);

      // Cache the data
      setCachedData(cacheKey, { crops, events, dailyTasks });
      setLastSyncTime(new Date());
      setDataVersion(prev => prev + 1);

    } catch (error) {
      console.error('Error fetching crop stages:', error);
      setHasError(true);
      setErrorMessage(`API Error: ${error.message || 'Failed to connect to server'}`);

      // Try cached data first if available
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setCropStages(cachedData.crops);
        setDailyTasksData(cachedData.dailyTasks || []);
        setAllEvents(cachedData.events);
        toast.info('Using cached calendar data (offline mode)');
      } else {
        // No cache available, set empty data
        setCropStages([]);
        setDailyTasksData([]);
        setAllEvents({});
        setConflictAnalysis({});
        setOptimizationSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFarm, isOnline, getCachedData, setCachedData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to add events to the events object
  const addEvent = (events, dateKey, event) => {
    if (!events[dateKey]) {
      events[dateKey] = [];
    }
    events[dateKey].push(event);
  };

  // Generate Daily Tasks calendar events - ONLY for actual tasks in database
  const generateDailyTaskEvents = (events, dailyTasks) => {
    // Only create events for actual daily tasks that exist in the database
    dailyTasks.forEach(task => {
      const dateStr = task.date.split('T')[0];

      const completedCount = [
        task.farm_hygiene,
        task.disease_pest_check,
        task.daily_crop_update,
        task.trellising,
        task.spraying,
        task.cleaning,
        task.pruning
      ].filter(Boolean).length;

      const hasWaterData = task.main_tank_ec || task.main_tank_ph || task.dripper_ec || task.dripper_ph;

      addEvent(events, dateStr, {
        id: `daily-task-${task.id}`,
        type: EVENT_TYPES.DAILY_TASK,
        title: `Daily Tasks (${completedCount}/7)`,
        description: `Farm maintenance tasks${hasWaterData ? ' + water measurements recorded' : ''}`,
        priority: 'normal',
        color: completedCount >= 5 ? 'green' : completedCount >= 3 ? 'blue' : 'orange',
        icon: completedCount >= 5 ? '✅' : '📝',
        farmId: selectedFarm,
        taskData: task,
        isCompleted: completedCount > 0
      });

      // Add water measurement event if recorded
      if (hasWaterData) {
        addEvent(events, dateStr, {
          id: `water-measurement-${task.id}`,
          type: EVENT_TYPES.WATER_MEASUREMENT,
          title: 'Water Quality Recorded',
          description: `EC/pH measurements recorded`,
          priority: 'normal',
          color: 'purple',
          icon: '💧',
          farmId: selectedFarm,
          taskData: task
        });
      }
    });
  };

  // Generate all types of events from crop data, daily tasks, spray schedules, fertigations, worker tasks, issue reports, expenditures, sales, and irrigations
  const generateAllEvents = useCallback((crops, dailyTasks = [], spraySchedules = [], fertigations = [], workerTasks = [], issueReports = [], expenditures = [], sales = [], irrigations = []) => {
    const events = {};

    crops.forEach(crop => {
      const cropStages = [
        { value: 'germination', label: 'Germination', icon: '🌱', duration: 7 },
        { value: 'seedling', label: 'Seedling', icon: '🌿', duration: 14 },
        { value: 'vegetative', label: 'Vegetative', icon: '🍃', duration: 28 },
        { value: 'flowering', label: 'Flowering', icon: '🌸', duration: 21 },
        { value: 'fruiting', label: 'Fruiting', icon: '🍅', duration: 35 },
        { value: 'harvest', label: 'Harvest', icon: '🎯', duration: 7 }
      ];

      // Add transplant event
      if (crop.transplant_date) {
        addEvent(events, crop.transplant_date, {
          id: `transplant-${crop.id}`,
          type: EVENT_TYPES.TRANSPLANT,
          title: `${crop.crop_name} Transplanted`,
          description: `${crop.crop_name} (${crop.batch_code}) transplanted`,
          crop,
          priority: 'normal',
          color: 'purple',
          icon: '🌱',
          farmId: crop.farm_id || selectedFarm
        });
      }

      // Add sowing event
      if (crop.sowing_date) {
        addEvent(events, crop.sowing_date, {
          id: `sowing-${crop.id}`,
          type: EVENT_TYPES.SOWING,
          title: `${crop.crop_name} Sown`,
          description: `${crop.crop_name} (${crop.batch_code}) seeds sown`,
          crop,
          priority: 'normal',
          color: 'brown',
          icon: '🌰',
          farmId: crop.farm_id || selectedFarm
        });
      }

      // Add stage transition events
      if (crop.stage_start_date) {
        const stageInfo = cropStages.find(s => s.value === crop.current_stage);
        addEvent(events, crop.stage_start_date, {
          id: `stage-start-${crop.id}`,
          type: EVENT_TYPES.STAGE_TRANSITION,
          title: `${crop.crop_name} - ${stageInfo?.label || crop.current_stage}`,
          description: `${crop.crop_name} (${crop.batch_code}) entered ${stageInfo?.label || crop.current_stage} stage`,
          crop,
          priority: 'normal',
          color: 'blue',
          icon: stageInfo?.icon || '📅',
          farmId: crop.farm_id || selectedFarm
        });
      }

      // Add harvest events
      if (crop.expected_harvest_date) {
        const isOverdue = new Date(crop.expected_harvest_date) < new Date();
        addEvent(events, crop.expected_harvest_date, {
          id: `harvest-${crop.id}`,
          type: EVENT_TYPES.HARVEST,
          title: `${crop.crop_name} Harvest ${isOverdue ? '(Overdue)' : ''}`,
          description: `Expected harvest for ${crop.crop_name} (${crop.batch_code})`,
          crop,
          priority: isOverdue ? 'high' : 'normal',
          color: isOverdue ? 'red' : 'green',
          icon: '🌾',
          isOverdue,
          farmId: crop.farm_id || selectedFarm
        });
      }

      // Add health check reminders
      if (crop.health_status === 'poor' || crop.health_status === 'critical') {
        const today = new Date();
        addEvent(events, today.toISOString().split('T')[0], {
          id: `health-${crop.id}`,
          type: EVENT_TYPES.HEALTH_CHECK,
          title: `${crop.crop_name} Health Check Required`,
          description: `${crop.crop_name} (${crop.batch_code}) requires immediate attention - ${crop.health_status} health`,
          crop,
          priority: 'high',
          color: 'red',
          icon: '🚨',
          farmId: crop.farm_id || selectedFarm
        });
      }

      // Add predicted stage transitions
      const transplantDate = new Date(crop.transplant_date);
      let accumulatedDays = 0;

      cropStages.forEach((stage, index) => {
        if (stage.value !== crop.current_stage) {
          accumulatedDays += stage.duration;
          const predictedDate = new Date(transplantDate);
          predictedDate.setDate(predictedDate.getDate() + accumulatedDays);

          if (predictedDate > new Date()) { // Only future predictions
            addEvent(events, predictedDate.toISOString().split('T')[0], {
              id: `prediction-${crop.id}-${stage.value}`,
              type: EVENT_TYPES.STAGE_TRANSITION,
              title: `${crop.crop_name} → ${stage.label} (Predicted)`,
              description: `Predicted transition to ${stage.label} stage`,
              crop,
              priority: 'low',
              color: 'gray',
              icon: stage.icon,
              isPrediction: true,
              farmId: crop.farm_id || selectedFarm
            });
          }
        }
      });
    });

    // Generate Daily Tasks events
    if (dailyTasks && dailyTasks.length > 0) {
      generateDailyTaskEvents(events, dailyTasks);
    }

    return events;
  }, [selectedFarm, formatDate]);


  // Generate Spray Schedule calendar events
  const generateSprayScheduleEvents = (events, spraySchedules) => {
    const today = new Date();

    spraySchedules.forEach(schedule => {
      const sprayDate = new Date(schedule.date_time);
      const sprayDateStr = sprayDate.toISOString().split('T')[0];
      const isOverdue = !schedule.is_completed && sprayDate < today;
      const isFuture = sprayDate > today;

      // Main spray application event
      if (schedule.is_completed) {
        // Completed spray application
        addEvent(events, sprayDateStr, {
          id: `spray-completed-${schedule.id}`,
          type: EVENT_TYPES.SPRAY_COMPLETED,
          title: `${schedule.product_used} Applied`,
          description: `${schedule.reason_display || schedule.reason} treatment completed on ${schedule.crop_zone}`,
          priority: 'normal',
          color: 'green',
          icon: '✅',
          farmId: selectedFarm,
          sprayData: schedule,
          isCompleted: true
        });
      } else if (isOverdue) {
        // Overdue spray application
        addEvent(events, sprayDateStr, {
          id: `spray-overdue-${schedule.id}`,
          type: EVENT_TYPES.SPRAY_SCHEDULED,
          title: `${schedule.product_used} OVERDUE`,
          description: `Overdue ${schedule.reason_display || schedule.reason} treatment for ${schedule.crop_zone}`,
          priority: 'high',
          color: 'red',
          icon: '⚠️',
          farmId: selectedFarm,
          sprayData: schedule,
          isOverdue: true
        });
      } else if (isFuture) {
        // Scheduled spray application
        addEvent(events, sprayDateStr, {
          id: `spray-scheduled-${schedule.id}`,
          type: EVENT_TYPES.SPRAY_SCHEDULED,
          title: `${schedule.product_used} Scheduled`,
          description: `${schedule.reason_display || schedule.reason} treatment for ${schedule.crop_zone}`,
          priority: 'normal',
          color: 'blue',
          icon: '🚿',
          farmId: selectedFarm,
          sprayData: schedule,
          isScheduled: true
        });
      } else {
        // Today's spray application
        addEvent(events, sprayDateStr, {
          id: `spray-today-${schedule.id}`,
          type: EVENT_TYPES.SPRAY_SCHEDULED,
          title: `${schedule.product_used} DUE TODAY`,
          description: `${schedule.reason_display || schedule.reason} treatment for ${schedule.crop_zone} - Due Today`,
          priority: 'high',
          color: 'orange',
          icon: '🔥',
          farmId: selectedFarm,
          sprayData: schedule,
          isDueToday: true
        });
      }

      // PHI (Pre-Harvest Interval) completion event
      if (schedule.is_completed && schedule.phi_log && schedule.phi_log > 0) {
        const phiCompletionDate = new Date(sprayDate);
        phiCompletionDate.setDate(phiCompletionDate.getDate() + parseInt(schedule.phi_log));
        const phiDateStr = phiCompletionDate.toISOString().split('T')[0];

        const isPHIComplete = phiCompletionDate <= today;

        addEvent(events, phiDateStr, {
          id: `phi-completion-${schedule.id}`,
          type: EVENT_TYPES.PHI_COMPLETION,
          title: isPHIComplete ? 'Harvest Safe (PHI Complete)' : 'Harvest Safe Date',
          description: `Safe to harvest ${schedule.crop_zone} - ${schedule.phi_log} days after ${schedule.product_used} application`,
          priority: isPHIComplete ? 'normal' : 'low',
          color: isPHIComplete ? 'green' : 'purple',
          icon: isPHIComplete ? '✅' : '⏳',
          farmId: selectedFarm,
          sprayData: schedule,
          isPHIEvent: true,
          isPrediction: !isPHIComplete
        });
      }

      // Next spray reminder event
      if (schedule.next_spray_reminder) {
        const reminderDate = new Date(schedule.next_spray_reminder);
        const reminderDateStr = reminderDate.toISOString().split('T')[0];
        const isReminderOverdue = reminderDate < today;
        const isReminderToday = reminderDateStr === today.toISOString().split('T')[0];

        addEvent(events, reminderDateStr, {
          id: `spray-reminder-${schedule.id}`,
          type: EVENT_TYPES.SPRAY_REMINDER,
          title: isReminderOverdue ? 'Spray Reminder OVERDUE' : isReminderToday ? 'Spray Reminder DUE' : 'Next Spray Reminder',
          description: `Follow-up ${schedule.reason_display || schedule.reason} treatment reminder for ${schedule.crop_zone}`,
          priority: isReminderOverdue || isReminderToday ? 'high' : 'normal',
          color: isReminderOverdue ? 'red' : isReminderToday ? 'orange' : 'blue',
          icon: isReminderOverdue ? '🚨' : isReminderToday ? '⏰' : '🔔',
          farmId: selectedFarm,
          sprayData: schedule,
          isReminder: true,
          isOverdue: isReminderOverdue
        });
      }
    });
  };

  // Generate Fertigation calendar events
  const generateFertigationEvents = (events, fertigations) => {
    const today = new Date();

    fertigations.forEach(fertigation => {
      // Use scheduled_date for scheduled fertigations, date_time for completed ones
      const fertigationDate = new Date(fertigation.scheduled_date || fertigation.date_time);
      const fertigationDateStr = fertigationDate.toISOString().split('T')[0];
      const isOverdue = fertigation.status === 'scheduled' && fertigationDate < today;
      const isFuture = fertigationDate > today;
      const isToday = fertigationDateStr === today.toISOString().split('T')[0];

      if (fertigation.status === 'completed') {
        // Completed fertigation events
        addEvent(events, fertigationDateStr, {
          id: `fertigation-completed-${fertigation.id}`,
          type: EVENT_TYPES.FERTIGATION_COMPLETED,
          title: `Fertigation Completed`,
          description: `Fertigation applied to ${fertigation.crop_zone_name}${fertigation.water_volume ? ` (${fertigation.water_volume}L)` : ''}`,
          priority: 'normal',
          color: 'green',
          icon: '✅',
          farmId: selectedFarm,
          fertigationData: fertigation,
          isCompleted: true
        });

        // Add water quality monitoring event if data exists
        if (fertigation.ec_before || fertigation.ph_before || fertigation.ec_after || fertigation.ph_after) {
          addEvent(events, fertigationDateStr, {
            id: `fertigation-water-quality-${fertigation.id}`,
            type: EVENT_TYPES.WATER_MEASUREMENT,
            title: 'Water Quality Monitored',
            description: `EC/pH measurements during fertigation${fertigation.ec_before ? ` (Before: EC ${fertigation.ec_before}` : ''}${fertigation.ph_before ? `, pH ${fertigation.ph_before})` : ')'}`,
            priority: 'low',
            color: 'purple',
            icon: '💧',
            farmId: selectedFarm,
            fertigationData: fertigation
          });
        }
      } else if (fertigation.status === 'scheduled') {
        if (isOverdue) {
          // Overdue scheduled fertigation
          addEvent(events, fertigationDateStr, {
            id: `fertigation-overdue-${fertigation.id}`,
            type: EVENT_TYPES.FERTIGATION_SCHEDULED,
            title: 'Fertigation OVERDUE',
            description: `Overdue fertigation for ${fertigation.crop_zone_name}`,
            priority: 'high',
            color: 'red',
            icon: '⚠️',
            farmId: selectedFarm,
            fertigationData: fertigation,
            isOverdue: true
          });
        } else if (isToday) {
          // Today's scheduled fertigation
          addEvent(events, fertigationDateStr, {
            id: `fertigation-today-${fertigation.id}`,
            type: EVENT_TYPES.FERTIGATION_SCHEDULED,
            title: 'Fertigation DUE TODAY',
            description: `Fertigation scheduled for ${fertigation.crop_zone_name} - Due Today`,
            priority: 'high',
            color: 'orange',
            icon: '🔥',
            farmId: selectedFarm,
            fertigationData: fertigation,
            isDueToday: true
          });
        } else if (isFuture) {
          // Future scheduled fertigation
          addEvent(events, fertigationDateStr, {
            id: `fertigation-scheduled-${fertigation.id}`,
            type: EVENT_TYPES.FERTIGATION_SCHEDULED,
            title: 'Fertigation Scheduled',
            description: `Scheduled fertigation for ${fertigation.crop_zone_name}`,
            priority: 'normal',
            color: 'blue',
            icon: '💧',
            farmId: selectedFarm,
            fertigationData: fertigation,
            isScheduled: true
          });
        }
      }
    });
  };

  // Generate Worker Task calendar events
  const generateWorkerTaskEvents = (events, workerTasks) => {
    const today = new Date();

    workerTasks.forEach(task => {
      const assignedDate = new Date(task.assigned_date);
      const assignedDateStr = assignedDate.toISOString().split('T')[0];

      // Task assignment event
      addEvent(events, assignedDateStr, {
        id: `worker-task-assigned-${task.id}`,
        type: EVENT_TYPES.WORKER_TASK_ASSIGNED,
        title: `Task Assigned: ${task.worker || 'Worker'}`,
        description: `${task.task_description || 'Worker task'} assigned`,
        priority: 'normal',
        color: 'blue',
        icon: '📄',
        farmId: selectedFarm,
        workerTaskData: task,
        isAssignment: true
      });

      // Task due date event (if due_date exists)
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const isOverdue = task.status !== 'completed' && dueDate < today;
        const isDueToday = dueDateStr === today.toISOString().split('T')[0] && task.status !== 'completed';
        const isFuture = dueDate > today && task.status !== 'completed';

        if (isOverdue) {
          // Overdue task
          addEvent(events, dueDateStr, {
            id: `worker-task-overdue-${task.id}`,
            type: EVENT_TYPES.WORKER_TASK_DUE,
            title: `OVERDUE: ${task.worker || 'Worker Task'}`,
            description: `Overdue task: ${task.task_description || 'Worker task'}`,
            priority: 'high',
            color: 'red',
            icon: '⚠️',
            farmId: selectedFarm,
            workerTaskData: task,
            isOverdue: true
          });
        } else if (isDueToday) {
          // Due today
          addEvent(events, dueDateStr, {
            id: `worker-task-due-today-${task.id}`,
            type: EVENT_TYPES.WORKER_TASK_DUE,
            title: `DUE TODAY: ${task.worker || 'Worker Task'}`,
            description: `Due today: ${task.task_description || 'Worker task'}`,
            priority: 'high',
            color: 'orange',
            icon: '🔥',
            farmId: selectedFarm,
            workerTaskData: task,
            isDueToday: true
          });
        } else if (isFuture) {
          // Future due date
          addEvent(events, dueDateStr, {
            id: `worker-task-due-${task.id}`,
            type: EVENT_TYPES.WORKER_TASK_DUE,
            title: `Due: ${task.worker || 'Worker Task'}`,
            description: `Due: ${task.task_description || 'Worker task'}`,
            priority: 'normal',
            color: 'yellow',
            icon: '⏰',
            farmId: selectedFarm,
            workerTaskData: task,
            isDue: true
          });
        }
      }

      // Task status events
      if (task.status === 'completed') {
        // Use due_date if available, otherwise use assigned_date for completed tasks
        const completionDateStr = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : assignedDateStr;
        addEvent(events, completionDateStr, {
          id: `worker-task-completed-${task.id}`,
          type: EVENT_TYPES.WORKER_TASK_COMPLETED,
          title: `✅ ${task.worker || 'Worker'} - Task Completed`,
          description: `Completed: ${task.task_description || 'Worker task'}${task.completion_notes ? ` - ${task.completion_notes}` : ''}`,
          priority: 'normal',
          color: 'green',
          icon: '✅',
          farmId: selectedFarm,
          workerTaskData: task,
          isCompleted: true
        });
      } else if (task.status === 'issue') {
        // Task with issues
        const issueDateStr = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : assignedDateStr;
        addEvent(events, issueDateStr, {
          id: `worker-task-issue-${task.id}`,
          type: EVENT_TYPES.WORKER_TASK_ISSUE,
          title: `⚠️ ${task.worker || 'Worker'} - Task Issue`,
          description: `Issue reported: ${task.task_description || 'Worker task'}${task.remarks ? ` - ${task.remarks}` : ''}`,
          priority: 'high',
          color: 'red',
          icon: '⚠️',
          farmId: selectedFarm,
          workerTaskData: task,
          hasIssue: true
        });
      }
    });
  };

  // Generate Issue Report calendar events
  const generateIssueReportEvents = (events, issueReports) => {
    const today = new Date();

    issueReports.forEach(issue => {
      const createdDate = new Date(issue.created_at);
      const createdDateStr = createdDate.toISOString().split('T')[0];
      const daysSinceCreated = Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24));

      // Issue creation event
      const priorityColor =
        issue.severity === 'high' ? 'red' :
        issue.severity === 'medium' ? 'orange' : 'yellow';

      const priorityLevel =
        issue.severity === 'high' ? 'high' :
        issue.severity === 'medium' ? 'normal' : 'low';

      addEvent(events, createdDateStr, {
        id: `issue-reported-${issue.id}`,
        type: EVENT_TYPES.ISSUE_REPORTED,
        title: `Issue Reported: ${issue.issue_type || 'Farm Issue'}`,
        description: `${issue.description || 'Issue reported'} in ${issue.crop_zone || 'Unknown zone'} (${issue.severity} severity)`,
        priority: priorityLevel,
        color: priorityColor,
        icon: issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : '📄',
        farmId: selectedFarm,
        issueData: issue,
        isReported: true
      });

      // Issue resolution event (if resolved)
      if (issue.status === 'resolved') {
        // Assume resolution happened on the same day if no specific resolution date
        // In a real system, you'd want a 'resolved_at' field
        addEvent(events, createdDateStr, {
          id: `issue-resolved-${issue.id}`,
          type: EVENT_TYPES.ISSUE_RESOLVED,
          title: `✅ Issue Resolved: ${issue.issue_type || 'Farm Issue'}`,
          description: `Resolved: ${issue.description || 'Issue'} in ${issue.crop_zone || 'Unknown zone'}`,
          priority: 'normal',
          color: 'green',
          icon: '✅',
          farmId: selectedFarm,
          issueData: issue,
          isResolved: true
        });
      } else {
        // Unresolved issue follow-up events
        if (issue.severity === 'high' && daysSinceCreated >= 1) {
          // High severity issues need immediate follow-up after 1 day
          const followUpDate = new Date(createdDate);
          followUpDate.setDate(followUpDate.getDate() + 1);
          const followUpDateStr = followUpDate.toISOString().split('T')[0];

          addEvent(events, followUpDateStr, {
            id: `issue-followup-high-${issue.id}`,
            type: EVENT_TYPES.ISSUE_FOLLOWUP,
            title: `🚨 URGENT Follow-up Required`,
            description: `High severity issue in ${issue.crop_zone || 'Unknown zone'} needs immediate attention - ${daysSinceCreated} days overdue`,
            priority: 'high',
            color: 'red',
            icon: '🚨',
            farmId: selectedFarm,
            issueData: issue,
            isFollowUp: true,
            isOverdue: followUpDate < today
          });
        } else if (issue.severity === 'medium' && daysSinceCreated >= 3) {
          // Medium severity issues need follow-up after 3 days
          const followUpDate = new Date(createdDate);
          followUpDate.setDate(followUpDate.getDate() + 3);
          const followUpDateStr = followUpDate.toISOString().split('T')[0];

          addEvent(events, followUpDateStr, {
            id: `issue-followup-medium-${issue.id}`,
            type: EVENT_TYPES.ISSUE_FOLLOWUP,
            title: `⚠️ Follow-up Required`,
            description: `Medium severity issue in ${issue.crop_zone || 'Unknown zone'} needs attention - ${daysSinceCreated} days since reported`,
            priority: 'normal',
            color: 'orange',
            icon: '⚠️',
            farmId: selectedFarm,
            issueData: issue,
            isFollowUp: true,
            isOverdue: followUpDate < today
          });
        } else if (issue.severity === 'low' && daysSinceCreated >= 7) {
          // Low severity issues need follow-up after 7 days
          const followUpDate = new Date(createdDate);
          followUpDate.setDate(followUpDate.getDate() + 7);
          const followUpDateStr = followUpDate.toISOString().split('T')[0];

          addEvent(events, followUpDateStr, {
            id: `issue-followup-low-${issue.id}`,
            type: EVENT_TYPES.ISSUE_FOLLOWUP,
            title: `Follow-up Reminder`,
            description: `Low severity issue in ${issue.crop_zone || 'Unknown zone'} - ${daysSinceCreated} days since reported`,
            priority: 'low',
            color: 'yellow',
            icon: '📄',
            farmId: selectedFarm,
            issueData: issue,
            isFollowUp: true,
            isOverdue: followUpDate < today
          });
        }
      }
    });
  };

  // Generate Expenditure calendar events
  const generateExpenditureEvents = (events, expenditures) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Track monthly totals for budget analysis
    const monthlyTotals = {};

    expenditures.forEach(expenditure => {
      const expenseDate = new Date(expenditure.expense_date);
      const expenseDateStr = expenseDate.toISOString().split('T')[0];
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;

      // Track monthly totals
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = 0;
      }
      monthlyTotals[monthKey] += parseFloat(expenditure.amount) || 0;

      // Determine expense category and priority
      const isLargeExpense = parseFloat(expenditure.amount) > 10000; // Adjust threshold as needed
      const priority = isLargeExpense ? 'high' : 'normal';
      const color =
        expenditure.category === 'seeds' ? 'green' :
        expenditure.category === 'fertilizers' ? 'blue' :
        expenditure.category === 'pesticides' ? 'purple' :
        expenditure.category === 'labor' ? 'yellow' :
        expenditure.category === 'equipment' ? 'orange' :
        'gray';

      // Expense recording event
      addEvent(events, expenseDateStr, {
        id: `expenditure-${expenditure.id}`,
        type: EVENT_TYPES.EXPENDITURE_RECORDED,
        title: `💰 ${expenditure.category || 'Expense'}: ₹${expenditure.amount || 0}`,
        description: `${expenditure.description || 'Farm expense'} - ${expenditure.payment_method || 'Payment method not specified'}`,
        priority: priority,
        color: color,
        icon: isLargeExpense ? '💰' : '📄',
        farmId: selectedFarm,
        expenditureData: expenditure,
        isRecorded: true
      });

      // For credit/loan payments, add payment due reminders (if applicable)
      if (expenditure.payment_method === 'credit' && expenditure.amount > 5000) {
        // Add 30-day payment reminder for large credit purchases
        const paymentDueDate = new Date(expenseDate);
        paymentDueDate.setDate(paymentDueDate.getDate() + 30);
        const paymentDueDateStr = paymentDueDate.toISOString().split('T')[0];

        addEvent(events, paymentDueDateStr, {
          id: `payment-due-${expenditure.id}`,
          type: EVENT_TYPES.PAYMENT_DUE,
          title: `📅 Payment Due: ₹${expenditure.amount}`,
          description: `Credit payment due for ${expenditure.description || 'expense'} (30 days)`,
          priority: 'high',
          color: 'red',
          icon: '📅',
          farmId: selectedFarm,
          expenditureData: expenditure,
          isPaymentDue: true,
          isOverdue: paymentDueDate < today
        });
      }
    });

    // Add monthly budget review events
    Object.entries(monthlyTotals).forEach(([monthKey, total]) => {
      const [year, month] = monthKey.split('-');
      const reviewDate = new Date(parseInt(year), parseInt(month) - 1, 1); // First day of month
      const reviewDateStr = reviewDate.toISOString().split('T')[0];

      // Only add budget review for current and past months
      if (reviewDate <= today) {
        const isCurrentMonth = reviewDate.getMonth() === currentMonth && reviewDate.getFullYear() === currentYear;
        const isHighSpending = total > 50000; // Adjust threshold as needed

        addEvent(events, reviewDateStr, {
          id: `budget-review-${monthKey}`,
          type: EVENT_TYPES.BUDGET_REVIEW,
          title: `📊 Budget Review: ₹${total.toFixed(0)}`,
          description: `Monthly spending analysis${isHighSpending ? ' - High spending alert' : ''} (${new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`,
          priority: isCurrentMonth || isHighSpending ? 'normal' : 'low',
          color: isHighSpending ? 'red' : isCurrentMonth ? 'blue' : 'gray',
          icon: isHighSpending ? '🚨' : '📊',
          farmId: selectedFarm,
          monthlyTotal: total,
          isBudgetReview: true
        });
      }
    });

    // Add upcoming budget review reminder for next month
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    addEvent(events, nextMonthStr, {
      id: `budget-review-upcoming-${currentYear}-${currentMonth + 2}`,
      type: EVENT_TYPES.BUDGET_REVIEW,
      title: '📅 Monthly Budget Review Due',
      description: 'Time to review and analyze monthly farm expenses',
      priority: 'normal',
      color: 'blue',
      icon: '📅',
      farmId: selectedFarm,
      isBudgetReview: true,
      isUpcoming: true
    });
  };

  // Generate Sales calendar events
  const generateSalesEvents = (events, sales) => {
    const today = new Date();

    sales.forEach(sale => {
      const saleDate = new Date(sale.sale_date);
      const saleDateStr = saleDate.toISOString().split('T')[0];

      // Determine sale priority and color based on amount and crop
      const saleAmount = parseFloat(sale.total_amount) || parseFloat(sale.quantity * sale.price_per_unit) || 0;
      const isLargeSale = saleAmount > 50000; // Adjust threshold as needed
      const priority = isLargeSale ? 'high' : 'normal';

      // Color coding based on payment status
      const statusColor =
        sale.payment_status === 'paid' ? 'green' :
        sale.payment_status === 'pending' ? 'orange' :
        sale.payment_status === 'overdue' ? 'red' :
        'blue';

      // Sale recording event
      addEvent(events, saleDateStr, {
        id: `sale-${sale.id}`,
        type: EVENT_TYPES.SALE_RECORDED,
        title: `💰 Sale: ${sale.crop_name || 'Crop'} - ₹${saleAmount.toFixed(0)}`,
        description: `Sold ${sale.quantity || 'N/A'} ${sale.unit || 'units'} to ${sale.buyer_name || 'Buyer'} at ₹${sale.price_per_unit || 0}/${sale.unit || 'unit'}`,
        priority: priority,
        color: statusColor,
        icon: isLargeSale ? '💰' : '📋',
        farmId: selectedFarm,
        saleData: sale,
        isRecorded: true
      });

      // Payment due date event (if payment_due_date exists)
      if (sale.payment_due_date) {
        const paymentDueDate = new Date(sale.payment_due_date);
        const paymentDueDateStr = paymentDueDate.toISOString().split('T')[0];
        const isOverdue = sale.payment_status !== 'paid' && paymentDueDate < today;
        const isDueToday = paymentDueDateStr === today.toISOString().split('T')[0] && sale.payment_status !== 'paid';
        const isFuture = paymentDueDate > today && sale.payment_status !== 'paid';

        if (sale.payment_status !== 'paid') {
          if (isOverdue) {
            // Overdue payment
            addEvent(events, paymentDueDateStr, {
              id: `sale-payment-overdue-${sale.id}`,
              type: EVENT_TYPES.SALE_PAYMENT_DUE,
              title: `🚨 OVERDUE Payment: ₹${saleAmount.toFixed(0)}`,
              description: `Overdue payment from ${sale.buyer_name || 'Buyer'} for ${sale.crop_name || 'crop'} - ${Math.ceil((today - paymentDueDate) / (1000 * 60 * 60 * 24))} days overdue`,
              priority: 'high',
              color: 'red',
              icon: '🚨',
              farmId: selectedFarm,
              saleData: sale,
              isOverdue: true
            });
          } else if (isDueToday) {
            // Due today
            addEvent(events, paymentDueDateStr, {
              id: `sale-payment-due-today-${sale.id}`,
              type: EVENT_TYPES.SALE_PAYMENT_DUE,
              title: `🔥 Payment DUE TODAY: ₹${saleAmount.toFixed(0)}`,
              description: `Payment due today from ${sale.buyer_name || 'Buyer'} for ${sale.crop_name || 'crop'}`,
              priority: 'high',
              color: 'orange',
              icon: '🔥',
              farmId: selectedFarm,
              saleData: sale,
              isDueToday: true
            });
          } else if (isFuture) {
            // Future payment due
            addEvent(events, paymentDueDateStr, {
              id: `sale-payment-due-${sale.id}`,
              type: EVENT_TYPES.SALE_PAYMENT_DUE,
              title: `📅 Payment Due: ₹${saleAmount.toFixed(0)}`,
              description: `Payment due from ${sale.buyer_name || 'Buyer'} for ${sale.crop_name || 'crop'}`,
              priority: 'normal',
              color: 'blue',
              icon: '📅',
              farmId: selectedFarm,
              saleData: sale,
              isPaymentDue: true
            });
          }
        }
      }

      // Delivery scheduling (add delivery reminder 1-2 days after sale)
      if (sale.delivery_status !== 'delivered') {
        const deliveryDate = new Date(saleDate);
        deliveryDate.setDate(deliveryDate.getDate() + 1); // Assume next day delivery
        const deliveryDateStr = deliveryDate.toISOString().split('T')[0];
        const isDeliveryOverdue = deliveryDate < today;
        const isDeliveryToday = deliveryDateStr === today.toISOString().split('T')[0];

        if (isDeliveryOverdue) {
          // Overdue delivery
          addEvent(events, deliveryDateStr, {
            id: `delivery-overdue-${sale.id}`,
            type: EVENT_TYPES.DELIVERY_SCHEDULED,
            title: `⚠️ Delivery OVERDUE: ${sale.crop_name || 'Crop'}`,
            description: `Overdue delivery to ${sale.buyer_name || 'Buyer'} - ${Math.ceil((today - deliveryDate) / (1000 * 60 * 60 * 24))} days overdue`,
            priority: 'high',
            color: 'red',
            icon: '⚠️',
            farmId: selectedFarm,
            saleData: sale,
            isOverdue: true
          });
        } else if (isDeliveryToday) {
          // Delivery due today
          addEvent(events, deliveryDateStr, {
            id: `delivery-today-${sale.id}`,
            type: EVENT_TYPES.DELIVERY_SCHEDULED,
            title: `🚚 Delivery TODAY: ${sale.crop_name || 'Crop'}`,
            description: `Deliver ${sale.quantity || 'N/A'} ${sale.unit || 'units'} to ${sale.buyer_name || 'Buyer'}`,
            priority: 'high',
            color: 'orange',
            icon: '🚚',
            farmId: selectedFarm,
            saleData: sale,
            isDueToday: true
          });
        } else if (deliveryDate > today) {
          // Future delivery
          addEvent(events, deliveryDateStr, {
            id: `delivery-scheduled-${sale.id}`,
            type: EVENT_TYPES.DELIVERY_SCHEDULED,
            title: `📦 Delivery Scheduled: ${sale.crop_name || 'Crop'}`,
            description: `Scheduled delivery to ${sale.buyer_name || 'Buyer'}`,
            priority: 'normal',
            color: 'blue',
            icon: '📦',
            farmId: selectedFarm,
            saleData: sale,
            isScheduled: true
          });
        }
      }

      // Payment confirmation for completed sales
      if (sale.payment_status === 'paid') {
        const paymentDate = sale.payment_due_date ? new Date(sale.payment_due_date) : saleDate;
        const paymentDateStr = paymentDate.toISOString().split('T')[0];

        addEvent(events, paymentDateStr, {
          id: `payment-received-${sale.id}`,
          type: EVENT_TYPES.SALE_PAYMENT_DUE,
          title: `✅ Payment Received: ₹${saleAmount.toFixed(0)}`,
          description: `Payment completed from ${sale.buyer_name || 'Buyer'} for ${sale.crop_name || 'crop'}`,
          priority: 'normal',
          color: 'green',
          icon: '✅',
          farmId: selectedFarm,
          saleData: sale,
          isCompleted: true
        });
      }
    });
  };

  // Generate Irrigation calendar events
  const generateIrrigationEvents = (events, irrigations) => {
    const today = new Date();
    const weeklyTotals = {};

    irrigations.forEach(irrigation => {
      const irrigationDate = new Date(irrigation.date);
      const irrigationDateStr = irrigationDate.toISOString().split('T')[0];
      const weekKey = getWeekKey(irrigationDate);

      // Track weekly water usage
      if (!weeklyTotals[weekKey]) {
        weeklyTotals[weekKey] = { volume: 0, count: 0 };
      }
      weeklyTotals[weekKey].volume += parseFloat(irrigation.water_volume) || 0;
      weeklyTotals[weekKey].count += 1;

      // Determine irrigation priority based on water volume and frequency
      const waterVolume = parseFloat(irrigation.water_volume) || 0;
      const isHighVolume = waterVolume > 1000; // Adjust threshold as needed
      const priority = isHighVolume ? 'high' : 'normal';

      // Color coding based on irrigation type and efficiency
      const methodColor =
        irrigation.irrigation_method === 'drip' ? 'green' :
        irrigation.irrigation_method === 'sprinkler' ? 'blue' :
        irrigation.irrigation_method === 'flood' ? 'orange' :
        'gray';

      // Irrigation application event
      addEvent(events, irrigationDateStr, {
        id: `irrigation-${irrigation.id}`,
        type: EVENT_TYPES.IRRIGATION_APPLIED,
        title: `💧 Irrigation: ${waterVolume}L`,
        description: `${irrigation.irrigation_method || 'Irrigation'} applied to ${irrigation.area || 'field'} - Duration: ${irrigation.duration_minutes || 'N/A'} min`,
        priority: priority,
        color: methodColor,
        icon: isHighVolume ? '💧' : '💦',
        farmId: selectedFarm,
        irrigationData: irrigation,
        isApplied: true
      });

      // Water quality monitoring (if pH/EC data exists)
      if (irrigation.ph_level || irrigation.ec_level) {
        addEvent(events, irrigationDateStr, {
          id: `irrigation-quality-${irrigation.id}`,
          type: EVENT_TYPES.WATER_USAGE_TRACKING,
          title: `🔬 Water Quality Check`,
          description: `Water analysis${irrigation.ph_level ? ` - pH: ${irrigation.ph_level}` : ''}${irrigation.ec_level ? `, EC: ${irrigation.ec_level}` : ''}`,
          priority: 'low',
          color: 'purple',
          icon: '🔬',
          farmId: selectedFarm,
          irrigationData: irrigation,
          isQualityCheck: true
        });
      }

      // Equipment maintenance reminder (every 30 days for each irrigation system)
      if (irrigation.irrigation_method && irrigation.equipment_used) {
        const maintenanceDate = new Date(irrigationDate);
        maintenanceDate.setDate(maintenanceDate.getDate() + 30);
        const maintenanceDateStr = maintenanceDate.toISOString().split('T')[0];

        // Only add future maintenance reminders
        if (maintenanceDate >= today) {
          addEvent(events, maintenanceDateStr, {
            id: `irrigation-maintenance-${irrigation.id}`,
            type: EVENT_TYPES.IRRIGATION_SCHEDULED,
            title: `🔧 Equipment Maintenance Due`,
            description: `${irrigation.equipment_used || 'Irrigation equipment'} maintenance reminder (${irrigation.irrigation_method} system)`,
            priority: 'normal',
            color: 'orange',
            icon: '🔧',
            farmId: selectedFarm,
            irrigationData: irrigation,
            isMaintenanceReminder: true
          });
        }
      }
    });

    // Add weekly water usage summary events
    Object.entries(weeklyTotals).forEach(([weekKey, totals]) => {
      const [year, week] = weekKey.split('-W');
      const weekStartDate = getDateFromWeek(parseInt(year), parseInt(week));
      const weekStartDateStr = weekStartDate.toISOString().split('T')[0];

      // Only add summary for completed weeks
      if (weekStartDate < today) {
        const averageVolume = totals.volume / totals.count;
        const isHighUsage = totals.volume > 5000; // Adjust threshold as needed

        addEvent(events, weekStartDateStr, {
          id: `water-usage-summary-${weekKey}`,
          type: EVENT_TYPES.WATER_USAGE_TRACKING,
          title: `📋 Weekly Water Usage: ${totals.volume.toFixed(0)}L`,
          description: `${totals.count} irrigation sessions - Avg: ${averageVolume.toFixed(0)}L per session${isHighUsage ? ' (High usage alert)' : ''}`,
          priority: isHighUsage ? 'normal' : 'low',
          color: isHighUsage ? 'red' : 'blue',
          icon: isHighUsage ? '🚨' : '📋',
          farmId: selectedFarm,
          weeklyData: totals,
          isWeeklySummary: true
        });
      }
    });

    // Add upcoming irrigation scheduling reminders (based on crop water needs)
    const nextIrrigationDate = new Date(today);
    nextIrrigationDate.setDate(nextIrrigationDate.getDate() + 3); // 3-day irrigation cycle
    const nextIrrigationDateStr = nextIrrigationDate.toISOString().split('T')[0];

    addEvent(events, nextIrrigationDateStr, {
      id: `irrigation-reminder-${nextIrrigationDateStr}`,
      type: EVENT_TYPES.IRRIGATION_SCHEDULED,
      title: '📅 Irrigation Cycle Due',
      description: 'Time to assess crop water needs and schedule next irrigation',
      priority: 'normal',
      color: 'blue',
      icon: '📅',
      farmId: selectedFarm,
      isScheduleReminder: true
    });
  };

  // Helper function to get week key (YYYY-WXX format)
  const getWeekKey = (date) => {
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  };

  // Helper function to get date from week number
  const getDateFromWeek = (year, week) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay();
    return new Date(year, 0, 1 + daysToAdd);
  };

  // Comprehensive Conflict Detection and Optimization Analysis
  const analyzeConflictsAndOptimizations = useCallback((events) => {
    const conflicts = {};
    const suggestions = [];
    const conflictEvents = { ...events };

    // Define conflict detection rules
    const conflictRules = [
      {
        name: 'spray_irrigation_conflict',
        description: 'Spray applications on irrigation days reduce effectiveness',
        check: (event1, event2) => {
          return (event1.type === EVENT_TYPES.SPRAY_SCHEDULED && event2.type === EVENT_TYPES.IRRIGATION_APPLIED) ||
                 (event1.type === EVENT_TYPES.IRRIGATION_APPLIED && event2.type === EVENT_TYPES.SPRAY_SCHEDULED);
        },
        severity: 'medium',
        suggestion: 'Schedule spray applications 24-48 hours before or after irrigation for optimal absorption'
      },
      {
        name: 'worker_overload',
        description: 'Multiple high-priority tasks assigned to workers on same day',
        check: (event1, event2) => {
          return (event1.type === EVENT_TYPES.WORKER_TASK_DUE || event1.type === EVENT_TYPES.WORKER_TASK_ASSIGNED) &&
                 (event2.type === EVENT_TYPES.WORKER_TASK_DUE || event2.type === EVENT_TYPES.WORKER_TASK_ASSIGNED) &&
                 (event1.priority === 'high' && event2.priority === 'high');
        },
        severity: 'high',
        suggestion: 'Redistribute high-priority tasks across multiple days to prevent worker burnout'
      },
      {
        name: 'spray_harvest_safety',
        description: 'Harvest scheduled before PHI completion',
        check: (event1, event2) => {
          return (event1.type === EVENT_TYPES.HARVEST && event2.type === EVENT_TYPES.SPRAY_COMPLETED) ||
                 (event1.type === EVENT_TYPES.PHI_COMPLETION && event2.type === EVENT_TYPES.HARVEST);
        },
        severity: 'critical',
        suggestion: 'Ensure minimum PHI period has passed before harvesting for food safety compliance'
      },
      {
        name: 'equipment_overuse',
        description: 'Multiple equipment-intensive tasks scheduled simultaneously',
        check: (event1, event2) => {
          return (event1.type === EVENT_TYPES.SPRAY_SCHEDULED && event2.type === EVENT_TYPES.FERTIGATION_SCHEDULED) ||
                 (event1.type === EVENT_TYPES.IRRIGATION_APPLIED && event2.type === EVENT_TYPES.SPRAY_SCHEDULED);
        },
        severity: 'medium',
        suggestion: 'Stagger equipment-intensive tasks to prevent resource conflicts and ensure proper maintenance'
      },
      {
        name: 'financial_cash_flow',
        description: 'High expenditures before expected sales income',
        check: (event1, event2) => {
          return (event1.type === EVENT_TYPES.EXPENDITURE_RECORDED && event2.type === EVENT_TYPES.SALE_PAYMENT_DUE) &&
                 (event1.expenditureData?.amount > 10000 && event2.saleData?.total_amount > event1.expenditureData?.amount);
        },
        severity: 'medium',
        suggestion: 'Consider timing large expenses after confirmed sales income for better cash flow management'
      }
    ];

    // Analyze each date for conflicts
    Object.entries(events).forEach(([dateKey, dayEvents]) => {
      if (dayEvents.length > 1) {
        const dayConflicts = [];

        // Check all event pairs for conflicts
        for (let i = 0; i < dayEvents.length; i++) {
          for (let j = i + 1; j < dayEvents.length; j++) {
            const event1 = dayEvents[i];
            const event2 = dayEvents[j];

            conflictRules.forEach(rule => {
              if (rule.check(event1, event2)) {
                const conflict = {
                  id: `conflict-${dateKey}-${i}-${j}`,
                  rule: rule.name,
                  description: rule.description,
                  severity: rule.severity,
                  events: [event1, event2],
                  suggestion: rule.suggestion,
                  date: dateKey
                };
                dayConflicts.push(conflict);

                // Add conflict visualization event
                const conflictEvent = {
                  id: `conflict-indicator-${dateKey}-${rule.name}`,
                  type: EVENT_TYPES.CONFLICT_DETECTED,
                  title: `⚠️ ${rule.severity.toUpperCase()} Conflict Detected`,
                  description: rule.description,
                  priority: rule.severity === 'critical' ? 'high' : 'normal',
                  color: rule.severity === 'critical' ? 'red' : rule.severity === 'high' ? 'orange' : 'yellow',
                  icon: rule.severity === 'critical' ? '🚨' : '⚠️',
                  farmId: selectedFarm,
                  conflictData: conflict,
                  isConflict: true
                };
                conflictEvents[dateKey].push(conflictEvent);
              }
            });
          }
        }

        if (dayConflicts.length > 0) {
          conflicts[dateKey] = dayConflicts;
        }
      }

      // Generate optimization suggestions for high-activity days
      if (dayEvents.length >= 4) {
        const highPriorityCount = dayEvents.filter(e => e.priority === 'high').length;
        if (highPriorityCount >= 2) {
          suggestions.push({
            id: `optimization-${dateKey}`,
            type: 'workload_distribution',
            date: dateKey,
            description: `High activity day with ${dayEvents.length} events (${highPriorityCount} high priority)`,
            suggestion: 'Consider redistributing some tasks to adjacent days for better workflow management',
            priority: 'medium'
          });

          // Add optimization suggestion event
          const optimizationEvent = {
            id: `optimization-${dateKey}`,
            type: EVENT_TYPES.OPTIMIZATION_SUGGESTION,
            title: '💡 Optimization Suggestion',
            description: 'High activity day - consider redistributing tasks',
            priority: 'low',
            color: 'purple',
            icon: '💡',
            farmId: selectedFarm,
            isOptimization: true
          };
          conflictEvents[dateKey].push(optimizationEvent);
        }
      }
    });

    return { conflictEvents, conflicts, suggestions };
  }, [selectedFarm, formatDate]);

  // Calendar-based Task Optimization Engine
  const generateOptimizationRecommendations = useCallback((events, crops, dailyTasks, spraySchedules, fertigations, sales) => {
    const recommendations = [];
    const today = new Date();
    const futureWeeks = 4; // Analyze next 4 weeks

    // Analyze workload distribution
    const workloadAnalysis = {};
    for (let week = 0; week < futureWeeks; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (week * 7));
      const weekKey = getWeekKey(weekStart);
      workloadAnalysis[weekKey] = { events: 0, highPriority: 0, conflicts: 0 };

      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        const dateKey = date.toISOString().split('T')[0];
        const dayEvents = events[dateKey] || [];

        workloadAnalysis[weekKey].events += dayEvents.length;
        workloadAnalysis[weekKey].highPriority += dayEvents.filter(e => e.priority === 'high').length;
        workloadAnalysis[weekKey].conflicts += dayEvents.filter(e => e.type === EVENT_TYPES.CONFLICT_DETECTED).length;
      }
    }

    // Optimization Rule 1: Workload Balancing
    const avgWorkload = Object.values(workloadAnalysis).reduce((sum, week) => sum + week.events, 0) / futureWeeks;
    Object.entries(workloadAnalysis).forEach(([weekKey, data]) => {
      if (data.events > avgWorkload * 1.5) {
        recommendations.push({
          id: `workload-${weekKey}`,
          type: 'workload_balancing',
          priority: 'medium',
          title: '📋 Workload Optimization',
          description: `Week ${weekKey} is overloaded with ${data.events} events (${data.highPriority} high priority)`,
          suggestion: 'Consider redistributing non-critical tasks to adjacent weeks',
          impact: 'Reduces worker stress and improves task completion quality',
          week: weekKey
        });
      }
    });

    // Optimization Rule 2: Crop Growth Synergy
    const cropOptimizations = analyzeCropSynergies(crops, spraySchedules, fertigations);
    recommendations.push(...cropOptimizations);

    // Optimization Rule 3: Financial Flow Optimization
    const financialOptimizations = analyzeFinancialFlow(sales, events);
    recommendations.push(...financialOptimizations);

    // Optimization Rule 4: Weather-based Scheduling
    const weatherOptimizations = analyzeWeatherCompatibility(events);
    recommendations.push(...weatherOptimizations);

    // Optimization Rule 5: Resource Efficiency
    const resourceOptimizations = analyzeResourceEfficiency(events);
    recommendations.push(...resourceOptimizations);

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }, []);

  // Recurring Event Template System
  const generateRecurringEvents = useCallback((baseEvents, templates) => {
    const recurringEvents = { ...baseEvents };
    const today = new Date();
    const futureMonths = 3; // Generate 3 months ahead

    templates.forEach(template => {
      const generatedEvents = generateEventsFromTemplate(template, today, futureMonths);

      generatedEvents.forEach(event => {
        const dateKey = event.date;
        if (!recurringEvents[dateKey]) {
          recurringEvents[dateKey] = [];
        }

        // Check if similar event already exists to avoid duplicates
        const exists = recurringEvents[dateKey].some(existing =>
          existing.type === event.type &&
          existing.title === event.title
        );

        if (!exists) {
          recurringEvents[dateKey].push({
            ...event,
            id: `${template.id}-${dateKey}`,
            isTemplateGenerated: true,
            templateId: template.id
          });
        }
      });
    });

    return recurringEvents;
  }, []);

  const generateEventsFromTemplate = (template, startDate, monthsAhead) => {
    const events = [];
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + monthsAhead);

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let shouldGenerate = false;
      let nextDate = new Date(currentDate);

      switch (template.recurrencePattern) {
        case 'daily':
          shouldGenerate = true;
          nextDate.setDate(currentDate.getDate() + template.interval);
          break;

        case 'weekly':
          if (template.daysOfWeek && template.daysOfWeek.includes(currentDate.getDay())) {
            shouldGenerate = true;
          }
          nextDate.setDate(currentDate.getDate() + 1);
          break;

        case 'monthly':
          if (currentDate.getDate() === startDate.getDate()) {
            shouldGenerate = true;
          }
          nextDate.setMonth(currentDate.getMonth() + template.interval);
          break;

        case 'custom':
          // Custom logic can be added here
          break;
      }

      if (shouldGenerate) {
        events.push({
          date: currentDate.toISOString().split('T')[0],
          type: template.eventType,
          title: template.templateData.title,
          description: template.templateData.description,
          priority: template.templateData.priority || 'normal',
          color: getColorForEventType(template.eventType),
          icon: template.templateData.icon || '📅',
          farmId: selectedFarm,
          templateData: template,
          isRecurring: true
        });
      }

      currentDate = nextDate;
    }

    return events;
  };

  const getColorForEventType = (eventType) => {
    const colorMap = {
      [EVENT_TYPES.DAILY_TASK]: 'blue',
      [EVENT_TYPES.IRRIGATION_SCHEDULED]: 'cyan',
      [EVENT_TYPES.WORKER_TASK_SCHEDULED]: 'yellow',
      [EVENT_TYPES.SPRAY_SCHEDULED]: 'purple',
      [EVENT_TYPES.FERTIGATION_SCHEDULED]: 'green'
    };
    return colorMap[eventType] || 'gray';
  };

  // Analyze crop growth synergies
  const analyzeCropSynergies = (crops, spraySchedules, fertigations) => {
    const recommendations = [];

    // Check for optimal spray-fertigation timing
    spraySchedules.forEach(spray => {
      fertigations.forEach(fertigation => {
        const sprayDate = new Date(spray.date_time);
        const fertigationDate = new Date(fertigation.scheduled_date || fertigation.date_time);
        const daysDiff = Math.abs((sprayDate - fertigationDate) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 1 && spray.crop_zone === fertigation.crop_zone_name) {
          recommendations.push({
            id: `synergy-spray-fertigation-${spray.id}-${fertigation.id}`,
            type: 'crop_synergy',
            priority: 'high',
            title: '🌱 Crop Treatment Synergy',
            description: `Spray and fertigation scheduled within 24 hours for ${spray.crop_zone}`,
            suggestion: 'Apply fertigation 2-3 days before spray for optimal nutrient absorption',
            impact: 'Improves nutrient uptake and reduces chemical waste by 15-20%'
          });
        }
      });
    });

    return recommendations;
  };

  // Analyze financial flow optimization
  const analyzeFinancialFlow = (sales, events) => {
    const recommendations = [];
    const upcomingSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate > new Date() && saleDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    });

    if (upcomingSales.length > 0) {
      const totalIncome = upcomingSales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);

      recommendations.push({
        id: 'financial-flow-optimization',
        type: 'financial_optimization',
        priority: 'medium',
        title: '💰 Cash Flow Optimization',
        description: `Expected income of ₹${totalIncome.toFixed(0)} from upcoming sales`,
        suggestion: 'Consider timing large expenses after confirmed sales for better cash flow',
        impact: 'Improves working capital and reduces financial stress'
      });
    }

    return recommendations;
  };

  // Analyze weather compatibility
  const analyzeWeatherCompatibility = (events) => {
    const recommendations = [];
    const today = new Date();

    // Look for spray applications that might be affected by weather
    Object.entries(events).forEach(([dateKey, dayEvents]) => {
      const date = new Date(dateKey);
      if (date > today) {
        const sprayEvents = dayEvents.filter(e => e.type === EVENT_TYPES.SPRAY_SCHEDULED);
        const irrigationEvents = dayEvents.filter(e => e.type === EVENT_TYPES.IRRIGATION_APPLIED);

        if (sprayEvents.length > 0 && irrigationEvents.length > 0) {
          recommendations.push({
            id: `weather-optimization-${dateKey}`,
            type: 'weather_optimization',
            priority: 'high',
            title: '☁️ Weather Compatibility Alert',
            description: `Spray and irrigation scheduled on same day (${date.toLocaleDateString()})`,
            suggestion: 'Check weather forecast - rain within 24h of spraying reduces effectiveness by 40%',
            impact: 'Prevents chemical waste and ensures optimal treatment effectiveness'
          });
        }
      }
    });

    return recommendations;
  };

  // Analyze resource efficiency
  const analyzeResourceEfficiency = (events) => {
    const recommendations = [];
    const equipmentUsage = {};

    Object.entries(events).forEach(([dateKey, dayEvents]) => {
      dayEvents.forEach(event => {
        if (event.type === EVENT_TYPES.SPRAY_SCHEDULED ||
            event.type === EVENT_TYPES.FERTIGATION_SCHEDULED ||
            event.type === EVENT_TYPES.IRRIGATION_APPLIED) {

          const equipment = event.sprayData?.equipment_used ||
                          event.fertigationData?.equipment_used ||
                          event.irrigationData?.equipment_used ||
                          'shared_equipment';

          if (!equipmentUsage[dateKey]) equipmentUsage[dateKey] = {};
          equipmentUsage[dateKey][equipment] = (equipmentUsage[dateKey][equipment] || 0) + 1;
        }
      });
    });

    // Check for equipment conflicts
    Object.entries(equipmentUsage).forEach(([dateKey, equipmentCount]) => {
      Object.entries(equipmentCount).forEach(([equipment, count]) => {
        if (count > 1) {
          recommendations.push({
            id: `resource-efficiency-${dateKey}-${equipment}`,
            type: 'resource_efficiency',
            priority: 'medium',
            title: '🔧 Equipment Efficiency',
            description: `${equipment} scheduled for ${count} tasks on ${new Date(dateKey).toLocaleDateString()}`,
            suggestion: 'Batch similar equipment tasks together to reduce setup time and improve efficiency',
            impact: 'Saves 20-30% time and reduces equipment wear'
          });
        }
      });
    });

    return recommendations;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-IN', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return date.toDateString() === todayIST.toDateString();
  };

  const hasEvents = (date) => {
    if (!date) return false;
    const dateKey = formatDate(date);
    const dayEvents = allEvents[dateKey] || [];
    return getFilteredEvents(dayEvents).length > 0;
  };

  const getDateEvents = (date) => {
    if (!date) return [];
    const dateKey = formatDate(date);
    const dayEvents = allEvents[dateKey] || [];
    return getFilteredEvents(dayEvents);
  };

  const getEventPriorityColor = (event) => {
    if (event.isOverdue) return 'bg-red-100 text-red-800 border-red-200';
    switch (event.priority) {
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return event.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
               event.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
               event.color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-200' :
               'bg-gray-100 text-gray-800 border-gray-200';
      case 'low':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Alert management
  const dismissAlert = (alertId) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    todayIST.setHours(0, 0, 0, 0);
    return date < todayIST;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentDate);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🗓️ Smart Farm Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Comprehensive crop management calendar with real-time updates
            </p>
            {lastSyncTime && (
              <p className="text-xs text-gray-500 mt-1">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
            {hasError && (
              <div className="mt-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded-lg">
                <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {errorMessage || 'API connection failed'}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row items-end lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Farm Selector */}
            {!farmId && farms.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Farm</label>
                <select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Farms</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.location}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connectionStatus === 'connected' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-blue-500' : 'bg-gray-500'
                }`}></div>
                <span className="font-medium">
                  {connectionStatus === 'connected' ? 'Live' : 'Static'}
                </span>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {['month', 'week', 'day', 'agenda'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Event Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Filter</label>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Events</option>
                <option value={EVENT_TYPES.HARVEST}>🌾 Harvests</option>
                <option value={EVENT_TYPES.STAGE_TRANSITION}>📅 Stages</option>
                <option value={EVENT_TYPES.TRANSPLANT}>🌱 Transplants</option>
                <option value={EVENT_TYPES.HEALTH_CHECK}>🚨 Health Checks</option>
                <option value={EVENT_TYPES.DAILY_TASK}>📝 Daily Tasks</option>
                <option value={EVENT_TYPES.WATER_MEASUREMENT}>💧 Water Quality</option>
                <option value={EVENT_TYPES.SPRAY_SCHEDULED}>🚿 Spray Applications</option>
                <option value={EVENT_TYPES.SPRAY_REMINDER}>🔔 Spray Reminders</option>
                <option value={EVENT_TYPES.PHI_COMPLETION}>⏳ PHI Completions</option>
                <option value={EVENT_TYPES.FERTIGATION_SCHEDULED}>💧 Fertigation</option>
                <option value={EVENT_TYPES.WORKER_TASK_ASSIGNED}>📄 Worker Tasks</option>
                <option value={EVENT_TYPES.ISSUE_REPORTED}>🚨 Issue Reports</option>
                <option value={EVENT_TYPES.EXPENDITURE_RECORDED}>💰 Expenditures</option>
                <option value={EVENT_TYPES.SALE_RECORDED}>📋 Sales & Deliveries</option>
                <option value={EVENT_TYPES.IRRIGATION_APPLIED}>💧 Irrigation</option>
                <option value={EVENT_TYPES.CONFLICT_DETECTED}>⚠️ Conflicts</option>
                <option value={EVENT_TYPES.OPTIMIZATION_SUGGESTION}>💡 Optimizations</option>
                <option value="overdue">⚠️ Overdue</option>
                <option value="upcoming">📅 Upcoming</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>

          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getMonthName(currentDate)}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week Day Headers */}
            {weekDays.map(day => (
              <div key={day} className="p-3 text-center font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {days.map((date, index) => {
              const events = getMemoizedDateEvents(date);
              const dayHasEvents = getMemoizedHasEvents(date);
              const hasOverdueEvents = events.some(event => event.isOverdue || event.priority === 'high');
              const hasHighPriorityEvents = events.some(event => event.priority === 'high');
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[80px] p-2 border transition-all duration-200 cursor-pointer
                    ${!date ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600' : ''}
                    ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    ${selectedDate === date ? 'ring-2 ring-blue-500' : ''}
                    ${hasOverdueEvents ? 'border-red-300 bg-red-50/30' : ''}
                    ${hasHighPriorityEvents && !hasOverdueEvents ? 'border-orange-300 bg-orange-50/30' : ''}
                  `}
                  onClick={() => date && setSelectedDate(selectedDate === date ? null : date)}
                >
                  {date && (
                    <>
                      <div className={`
                        text-sm font-medium mb-1
                        ${isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}
                      `}>
                        {date.getDate()}
                      </div>
                      
                      {dayHasEvents && (
                        <div className="space-y-1 max-h-16 overflow-y-auto">
                          {events.slice(0, 3).map((event, idx) => (
                            <div
                              key={idx}
                              className={`
                                text-xs px-2 py-1 rounded truncate border ${
                                  getEventPriorityColor(event)
                                } ${event.isPrediction ? 'border-dashed opacity-70' : ''}
                              `}
                              title={`${event.title} - ${event.description}`}
                            >
                              <div className="flex items-center space-x-1">
                                <span>{event.icon}</span>
                                <span className="truncate">
                                  {event.crop ? event.crop.crop_name : event.title}
                                </span>
                                {event.isOverdue && <span className="text-red-600">⚠️</span>}
                                {event.isPrediction && <span className="text-gray-400">🔮</span>}
                              </div>
                            </div>
                          ))}
                          {events.length > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 font-medium">
                              +{events.length - 3} more events
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-red-900">🚨 Active Alerts ({activeAlerts.length})</h3>
              <button
                onClick={() => setActiveAlerts([])}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Dismiss All
              </button>
            </div>
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600">{alert.timestamp.toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Date Details */}
        {selectedDate && getMemoizedDateEvents(selectedDate).length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📅 {selectedDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'Asia/Kolkata'
                })}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getMemoizedDateEvents(selectedDate).length} event(s)
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getMemoizedDateEvents(selectedDate).map((event, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200
                    ${getEventPriorityColor(event).replace('bg-', 'border-').replace('text-', '').replace('border-', '')}
                    ${event.isOverdue ? 'border-red-300 bg-red-50' :
                      event.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                      event.color === 'green' ? 'border-green-300 bg-green-50' :
                      event.color === 'blue' ? 'border-blue-300 bg-blue-50' :
                      event.color === 'purple' ? 'border-purple-300 bg-purple-50' :
                      'border-gray-300 bg-gray-50'}
                    ${event.isPrediction ? 'border-dashed opacity-75' : ''}
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{event.icon}</span>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1">
                      {event.isOverdue && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Overdue
                        </span>
                      )}
                      {event.isPrediction && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Predicted
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        event.priority === 'high' ? 'bg-red-100 text-red-800' :
                        event.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {event.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {event.description}
                  </p>

                  {event.crop && (
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p><span className="font-medium">Crop:</span> {event.crop.crop_name} ({event.crop.variety})</p>
                      <p><span className="font-medium">Batch:</span> {event.crop.batch_code}</p>
                      {event.crop.current_stage && (
                        <p><span className="font-medium">Stage:</span>
                          <span className="ml-1 capitalize">{event.crop.current_stage}</span>
                        </p>
                      )}
                      {event.crop.health_status && (
                        <p><span className="font-medium">Health:</span>
                          <span className={`ml-1 capitalize ${
                            event.crop.health_status === 'excellent' ? 'text-green-600' :
                            event.crop.health_status === 'healthy' ? 'text-green-600' :
                            event.crop.health_status === 'moderate' ? 'text-yellow-600' :
                            event.crop.health_status === 'poor' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>{event.crop.health_status}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {event.crop?.notes && (
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      <p className="font-medium text-gray-900 dark:text-white mb-1">Notes:</p>
                      <p className="text-gray-600 dark:text-gray-300">{event.crop.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comprehensive Summary Stats */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🌱</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Crops</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{cropStages.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">📅</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {Object.values(allEvents).reduce((acc, events) => {
                    return acc + events.filter(event => {
                      if (!event.crop?.expected_harvest_date) return false;
                      const harvestDate = new Date(event.crop.expected_harvest_date);
                      return harvestDate.getMonth() === currentDate.getMonth() &&
                             harvestDate.getFullYear() === currentDate.getFullYear();
                    }).length;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {Object.values(allEvents).reduce((acc, events) => {
                    return acc + events.filter(event => event.isOverdue).length;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">🚨</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">High Priority</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {Object.values(allEvents).reduce((acc, events) => {
                    return acc + events.filter(event => event.priority === 'high').length;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🔮</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Predictions</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {Object.values(allEvents).reduce((acc, events) => {
                    return acc + events.filter(event => event.isPrediction).length;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-300 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Version</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">v{dataVersion}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Event Legend - Only shows event types that actually exist */}
        {(() => {
          // Define event type display information
          const EVENT_TYPE_INFO = {
            [EVENT_TYPES.HARVEST]: { name: '🌾 Harvest Events', color: 'bg-green-100 border-green-200' },
            [EVENT_TYPES.STAGE_TRANSITION]: { name: '📅 Stage Transitions', color: 'bg-blue-100 border-blue-200' },
            [EVENT_TYPES.TRANSPLANT]: { name: '🌱 Transplants', color: 'bg-purple-100 border-purple-200' },
            [EVENT_TYPES.SOWING]: { name: '🌱 Sowing', color: 'bg-green-100 border-green-200' },
            [EVENT_TYPES.HEALTH_CHECK]: { name: '🚨 Health Checks', color: 'bg-red-100 border-red-200' },
            [EVENT_TYPES.FERTIGATION]: { name: '💧 Fertigation', color: 'bg-cyan-100 border-cyan-200' },
            [EVENT_TYPES.DAILY_TASK]: { name: '📝 Daily Tasks', color: 'bg-orange-100 border-orange-200' },
            [EVENT_TYPES.WATER_MEASUREMENT]: { name: '💧 Water Quality', color: 'bg-blue-100 border-blue-200' },
            [EVENT_TYPES.HYGIENE_CHECK]: { name: '🧼 Hygiene Checks', color: 'bg-cyan-100 border-cyan-200' },
            [EVENT_TYPES.SPRAY_SCHEDULED]: { name: '🚿 Spray Applications', color: 'bg-blue-100 border-blue-200' },
            [EVENT_TYPES.SPRAY_COMPLETED]: { name: '✅ Spray Completed', color: 'bg-green-100 border-green-200' },
            [EVENT_TYPES.SPRAY_REMINDER]: { name: '🔔 Spray Reminders', color: 'bg-indigo-100 border-indigo-200' },
            [EVENT_TYPES.PHI_COMPLETION]: { name: '⏳ PHI Completions', color: 'bg-purple-100 border-purple-200 border-dashed' },
            [EVENT_TYPES.FERTIGATION_COMPLETED]: { name: '✅ Fertigation Done', color: 'bg-cyan-100 border-cyan-200' },
            [EVENT_TYPES.FERTIGATION_SCHEDULED]: { name: '📅 Fertigation Planned', color: 'bg-cyan-100 border-cyan-200 border-dashed' },
            [EVENT_TYPES.WORKER_TASK_ASSIGNED]: { name: '📄 Worker Tasks Assigned', color: 'bg-yellow-100 border-yellow-200' },
            [EVENT_TYPES.WORKER_TASK_DUE]: { name: '⏰ Worker Tasks Due', color: 'bg-orange-100 border-orange-200' },
            [EVENT_TYPES.WORKER_TASK_COMPLETED]: { name: '✅ Worker Tasks Done', color: 'bg-green-100 border-green-200' },
            [EVENT_TYPES.WORKER_TASK_ISSUE]: { name: '⚠️ Worker Task Issues', color: 'bg-red-100 border-red-200' },
            [EVENT_TYPES.ISSUE_REPORTED]: { name: '🚨 Issue Reports', color: 'bg-red-100 border-red-200' },
            [EVENT_TYPES.EXPENDITURE_RECORDED]: { name: '💰 Expenditures', color: 'bg-green-100 border-green-200' },
            [EVENT_TYPES.SALE_SCHEDULED]: { name: '📋 Sales Scheduled', color: 'bg-blue-100 border-blue-200' },
            [EVENT_TYPES.SALE_COMPLETED]: { name: '💰 Sales Completed', color: 'bg-green-100 border-green-200' },
            [EVENT_TYPES.SALE_PAYMENT_DUE]: { name: '💳 Payment Due', color: 'bg-yellow-100 border-yellow-200' },
            [EVENT_TYPES.IRRIGATION_APPLIED]: { name: '💧 Irrigation', color: 'bg-cyan-100 border-cyan-200' },
            'conflict': { name: '⚠️ Conflicts', color: 'bg-yellow-100 border-yellow-200 border-dashed' },
            'optimization': { name: '💡 Optimizations', color: 'bg-purple-100 border-purple-200 border-dotted' },
            'prediction': { name: '🔮 Predictions', color: 'bg-gray-100 border-gray-200 border-dashed' },
            'overdue': { name: '⚠️ Overdue/High Priority', color: 'bg-orange-100 border-orange-200' }
          };

          // Find unique event types that actually exist in the data
          const existingEventTypes = new Set();

          Object.values(allEvents).forEach(dayEvents => {
            dayEvents.forEach(event => {
              existingEventTypes.add(event.type);
            });
          });

          const existingTypes = Array.from(existingEventTypes).filter(type => EVENT_TYPE_INFO[type]);

          // Only show legend if there are actual events
          if (existingTypes.length === 0) {
            return null;
          }

          return (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏷️ Event Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {existingTypes.map(eventType => {
                  const typeInfo = EVENT_TYPE_INFO[eventType];
                  return (
                    <div key={eventType} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 ${typeInfo.color} rounded`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{typeInfo.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📤 Export Calendar
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Export Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Export Format
                  </label>
                  <select
                    value={exportOptions.format}
                    onChange={(e) => setExportOptions({...exportOptions, format: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ical">📅 iCal (.ics) - Standard Calendar</option>
                    <option value="google">🗓️ Google Calendar</option>
                    <option value="outlook">📮 Outlook Calendar</option>
                    <option value="csv">📊 CSV Spreadsheet</option>
                    <option value="json">🔗 JSON Data</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range
                  </label>
                  <select
                    value={exportOptions.dateRange}
                    onChange={(e) => setExportOptions({...exportOptions, dateRange: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="current_month">📅 Current Month</option>
                    <option value="next_month">➡️ Next Month</option>
                    <option value="next_3_months">📆 Next 3 Months</option>
                    <option value="next_6_months">📅 Next 6 Months</option>
                    <option value="all">🌍 All Events</option>
                  </select>
                </div>

                {/* Event Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Types (Leave empty for all)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {Object.entries(EVENT_TYPES).map(([key, value]) => (
                      <label key={value} className="flex items-center space-x-2 text-sm py-1">
                        <input
                          type="checkbox"
                          checked={exportOptions.eventTypes.includes(value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportOptions({
                                ...exportOptions,
                                eventTypes: [...exportOptions.eventTypes, value]
                              });
                            } else {
                              setExportOptions({
                                ...exportOptions,
                                eventTypes: exportOptions.eventTypes.filter(t => t !== value)
                              });
                            }
                          }}
                          className="text-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Include Completed */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCompleted}
                      onChange={(e) => setExportOptions({...exportOptions, includeCompleted: e.target.checked})}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include completed events
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    exportCalendar(exportOptions.format, exportOptions);
                    setShowExportModal(false);
                  }}
                  disabled={isExporting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Calendar;

/*
 * Enhanced Smart Farm Calendar Features:
 *
 * 1. 🔒 SECURITY & DATA ISOLATION:
 *    - Farm-specific data filtering prevents data leakage
 *    - Role-based access control integration
 *    - Secure API calls with proper authentication
 *
 * 2. 🌍 REAL-TIME CAPABILITIES:
 *    - WebSocket integration for live updates
 *    - Auto-refresh every minute
 *    - Real-time alerts and notifications
 *    - Network status monitoring
 *
 * 3. 📅 COMPREHENSIVE EVENT MANAGEMENT:
 *    - Harvest events with overdue tracking
 *    - Stage transitions with predictions
 *    - Transplant and sowing events
 *    - Health check reminders
 *    - Custom event support
 *
 * 4. 🚀 PERFORMANCE OPTIMIZATIONS:
 *    - Smart caching with 3-minute TTL
 *    - Efficient event filtering
 *    - Optimized re-renders
 *    - Offline support with cached data
 *
 * 5. 📊 ANALYTICS & INSIGHTS:
 *    - Event priority classification
 *    - Predictive stage transitions
 *    - Health status monitoring
 *    - Performance metrics tracking
 *
 * 6. 📱 MOBILE-FIRST DESIGN:
 *    - Responsive grid layouts
 *    - Touch-friendly interactions
 *    - Adaptive UI components
 *    - Cross-device compatibility
 */