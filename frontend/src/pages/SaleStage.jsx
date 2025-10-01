import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const SaleStage = () => {
  const { farmId } = useParams();
  
  // Check if we're in farm-specific mode for complete database isolation
  const inFarmMode = Boolean(farmId);
  const [loading, setLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  
  // Data states
  const [sales, setSales] = useState([]);
  const [farms, setFarms] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    payment_status: '',
    crop_name: '',
    buyer_name: '',
    date_from: '',
    date_to: '',
    farm: ''
  });
  
  // Form states
  const [saleForm, setSaleForm] = useState({
    crop_name: '',
    batch_code: '',
    quantity_sold: '',
    unit: 'kg',
    price_per_unit: '',
    buyer_name: '',
    buyer_contact: '',
    buyer_address: '',
    sale_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    payment_due_date: '',
    amount_received: '0',
    quality_grade: '',
    transportation_cost: '0',
    commission_amount: '0',
    notes: '',
    invoice_number: '',
    farm: ''
  });

  // Payment status options
  const paymentStatusOptions = [
    { value: 'pending', label: 'Pending', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'partial', label: 'Partial', color: 'text-blue-600 bg-blue-100' },
    { value: 'completed', label: 'Completed', color: 'text-green-600 bg-green-100' },
    { value: 'overdue', label: 'Overdue', color: 'text-red-600 bg-red-100' },
  ];

  // Unit options
  const unitOptions = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'gram', label: 'Gram (g)' },
    { value: 'ton', label: 'Ton' },
    { value: 'piece', label: 'Piece' },
    { value: 'box', label: 'Box' },
    { value: 'bag', label: 'Bag' },
    { value: 'crate', label: 'Crate' },
    { value: 'bunch', label: 'Bunch' },
  ];

  useEffect(() => {
    if (inFarmMode) {
      // In farm-specific mode, set farmId automatically and don't fetch farms list
      setSaleForm(prev => ({ ...prev, farm: farmId }));
      setFilters(prev => ({ ...prev, farm: farmId }));
      fetchSales();
    } else {
      // In admin mode, fetch farms list and sales
      fetchFarms();
      fetchSales();
    }
    fetchAnalytics();
  }, [farmId, inFarmMode]);

  // Set default farm when farms are loaded
  useEffect(() => {
    if (farms.length > 0 && !saleForm.farm) {
      setSaleForm(prev => ({ ...prev, farm: farms[0].id }));
    }
  }, [farms]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data || []);
    } catch (error) {
      console.error('Failed to fetch farms:', error);
      setFarms([]);
    }
  };

  const fetchSales = async (newFilters = {}) => {
    try {
      setSalesLoading(true);
      const combinedFilters = { ...filters, ...newFilters };
      const cleanFilters = Object.fromEntries(
        Object.entries(combinedFilters).filter(([_, value]) => value !== '')
      );
      
      let response;
      if (inFarmMode) {
        // Use farm-specific API for complete database isolation
        console.log(`DEBUG: Fetching sales for farm ${farmId} only`);
        response = await farmAPI.getFarmSales(farmId, cleanFilters);
      } else {
        // Use general API for admin mode
        response = await farmAPI.getSales(cleanFilters);
      }
      
      setSales(response.data || []);
      setFilters(combinedFilters);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      if (sales.length === 0 && error.response?.status !== 404) {
        setSales([]);
      }
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await farmAPI.getSaleAnalytics();
      setAnalytics(response.data || { 
        total_sales_amount: 0, 
        total_transactions: 0, 
        total_amount_received: 0,
        total_pending_amount: 0,
        payment_completion_rate: 0
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics({ 
        total_sales_amount: 0, 
        total_transactions: 0, 
        total_amount_received: 0,
        total_pending_amount: 0,
        payment_completion_rate: 0,
        payment_status_breakdown: [],
        crop_breakdown: [],
        top_buyers: []
      });
    }
  };

  const handleAddSale = async () => {
    // Basic validation - only check required fields
    if (!saleForm.crop_name.trim()) {
      toast.error('Please enter crop name');
      return;
    }
    if (!saleForm.batch_code.trim()) {
      toast.error('Please enter batch code');
      return;
    }
    if (!saleForm.buyer_name.trim()) {
      toast.error('Please enter buyer name');
      return;
    }
    if (!saleForm.sale_date) {
      toast.error('Please select sale date');
      return;
    }
    // Only validate farm selection if not in farm mode (where farm is determined by URL)
    if (!inFarmMode && !saleForm.farm) {
      toast.error('Please select a farm');
      return;
    }
    
    // Only validate quantity and price if they are provided
    if (saleForm.quantity_sold && saleForm.quantity_sold <= 0) {
      toast.error('Quantity sold must be greater than zero');
      return;
    }
    if (saleForm.price_per_unit && saleForm.price_per_unit <= 0) {
      toast.error('Price per unit must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      
      // Clean the form data - convert empty strings to null for numeric fields
      const cleanedData = {
        ...saleForm,
        quantity_sold: saleForm.quantity_sold || null,
        price_per_unit: saleForm.price_per_unit || null,
        amount_received: saleForm.amount_received || 0,
        transportation_cost: saleForm.transportation_cost || 0,
        commission_amount: saleForm.commission_amount || 0,
        buyer_contact: saleForm.buyer_contact || null,
        buyer_address: saleForm.buyer_address || null,
        quality_grade: saleForm.quality_grade || null,
        notes: saleForm.notes || null,
        invoice_number: saleForm.invoice_number || null,
        payment_due_date: saleForm.payment_due_date || null,
      };

      // In farm mode, remove the farm field since it's determined by URL parameter
      if (inFarmMode) {
        delete cleanedData.farm;
      }
      
      let response;
      if (inFarmMode) {
        // Use farm-specific API for complete database isolation
        console.log(`DEBUG: Creating sale for farm ${farmId} only`);
        response = await farmAPI.createFarmSale(farmId, cleanedData);
      } else {
        // Use general API for admin mode
        response = await farmAPI.createSale(cleanedData);
      }
      toast.success('Sale added successfully');
      setShowAddModal(false);
      resetForm();
      fetchSales();
      fetchAnalytics();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.non_field_errors?.[0] ||
                          'Failed to add sale';
      toast.error(errorMessage);
      console.error('Failed to add sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSale = async () => {
    try {
      setLoading(true);
      if (inFarmMode && farmId) {
        // Use farm-specific API for complete database isolation
        await farmAPI.updateFarmSale(farmId, editingSale.id, saleForm);
      } else {
        // Use legacy API for backward compatibility
        await farmAPI.updateSale(editingSale.id, saleForm);
      }
      toast.success('Sale updated successfully');
      setShowEditModal(false);
      setEditingSale(null);
      resetForm();
      fetchSales();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update sale');
      console.error('Failed to update sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) {
      return;
    }

    try {
      await farmAPI.deleteSale(saleId);
      toast.success('Sale deleted successfully');
      fetchSales();
      fetchAnalytics();
    } catch (error) {
      toast.error('Failed to delete sale');
      console.error('Failed to delete sale:', error);
    }
  };

  const resetForm = () => {
    setSaleForm({
      crop_name: '',
      batch_code: '',
      quantity_sold: '',
      unit: 'kg',
      price_per_unit: '',
      buyer_name: '',
      buyer_contact: '',
      buyer_address: '',
      sale_date: new Date().toISOString().split('T')[0],
      payment_status: 'pending',
      payment_due_date: '',
      amount_received: '0',
      quality_grade: '',
      transportation_cost: '0',
      commission_amount: '0',
      notes: '',
      invoice_number: '',
      farm: farms.length > 0 ? farms[0].id : ''
    });
  };

  const clearFilters = () => {
    const resetFilters = { payment_status: '', crop_name: '', buyer_name: '', date_from: '', date_to: '', farm: '' };
    setFilters(resetFilters);
    fetchSales(resetFilters);
  };

  const openEditModal = (sale) => {
    setEditingSale(sale);
    setSaleForm({
      crop_name: sale.crop_name,
      batch_code: sale.batch_code,
      quantity_sold: sale.quantity_sold,
      unit: sale.unit,
      price_per_unit: sale.price_per_unit,
      buyer_name: sale.buyer_name,
      buyer_contact: sale.buyer_contact || '',
      buyer_address: sale.buyer_address || '',
      sale_date: sale.sale_date,
      payment_status: sale.payment_status,
      payment_due_date: sale.payment_due_date || '',
      amount_received: sale.amount_received,
      quality_grade: sale.quality_grade || '',
      transportation_cost: sale.transportation_cost || '0',
      commission_amount: sale.commission_amount || '0',
      notes: sale.notes || '',
      invoice_number: sale.invoice_number || '',
      farm: sale.farm
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    const statusOption = paymentStatusOptions.find(option => option.value === status);
    return statusOption ? (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusOption.color}`}>
        {statusOption.label}
      </span>
    ) : status;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Sale Stage Management</h1>
              <p className="text-slate-600">Track and manage all your crop sales and revenue</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
            >
              Add New Sale
            </button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 font-medium">Total Sales</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{analytics.total_sales_amount?.toLocaleString() || 0}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 font-medium">Amount Received</p>
                  <p className="text-2xl font-bold text-blue-700">₹{analytics.total_amount_received?.toLocaleString() || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💵</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 font-medium">Pending Payment</p>
                  <p className="text-2xl font-bold text-amber-700">₹{analytics.total_pending_amount?.toLocaleString() || 0}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 font-medium">Total Sales</p>
                  <p className="text-2xl font-bold text-purple-700">{analytics.total_transactions || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Filters */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-medium text-slate-900 mb-5">Filter Sales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {/* Payment Status Dropdown */}
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">Payment Status</label>
              <select
                value={filters.payment_status}
                onChange={(e) => fetchSales({ ...filters, payment_status: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              >
                <option value="">All Statuses</option>
                {paymentStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Crop Name */}
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">Crop Name</label>
              <input
                type="text"
                placeholder="Search crops..."
                value={filters.crop_name}
                onChange={(e) => setFilters({ ...filters, crop_name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && fetchSales()}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              />
            </div>

            {/* Buyer Name */}
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">Buyer Name</label>
              <input
                type="text"
                placeholder="Search buyers..."
                value={filters.buyer_name}
                onChange={(e) => setFilters({ ...filters, buyer_name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && fetchSales()}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              />
            </div>

            {/* From Date */}
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => fetchSales({ ...filters, date_from: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              />
            </div>

            {/* To Date */}
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-2">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => fetchSales({ ...filters, date_to: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
              />
            </div>

            {/* Hide farm filter in farm-specific mode - complete database isolation */}
            {!inFarmMode && (
              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-2">Farm</label>
                <select
                  value={filters.farm}
                  onChange={(e) => fetchSales({ ...filters, farm: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-colors"
                >
                  <option value="">All Farms</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => fetchSales()}
              className="px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
              disabled={salesLoading}
            >
              {salesLoading ? 'Filtering...' : 'Apply Filters'}
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Sales Records */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
          <div className="p-6 border-b border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-800">Sale Records</h2>
          </div>

          {salesLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <p className="mt-2 text-slate-600">Loading sales...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">No sales found</h3>
              <p className="text-slate-500 mb-4">Start tracking your crop sales by adding your first sale.</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Add First Sale
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Crop & Batch</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity & Price</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Buyer Details</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sale Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200/60">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{sale.crop_name}</p>
                          <p className="text-sm text-slate-500">Batch: {sale.batch_code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {sale.quantity_sold ? `${sale.quantity_sold} ${sale.unit_display}` : 'N/A'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {sale.price_per_unit ? `₹${sale.price_per_unit}/unit` : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{sale.buyer_name}</p>
                          {sale.buyer_contact && (
                            <p className="text-sm text-slate-500">{sale.buyer_contact}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900">{sale.sale_date_display}</p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(sale.payment_status)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{sale.total_amount_display}</p>
                          <p className="text-sm text-slate-500">Received: ₹{sale.amount_received}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(sale)}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSale(sale.id)}
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

        {/* Add Sale Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[440px] sm:max-w-[480px] md:max-w-[520px] w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-in fade-in-0 zoom-in-95">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 border-b border-emerald-600/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">💰</span>
                    <h3 className="text-lg font-semibold">Add New Sale</h3>
                  </div>
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
              
              {/* Scrollable Form Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="p-6 space-y-5">
                  {/* Crop Details Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>🌾</span>
                      <span>Crop Details</span>
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Crop Name *</label>
                      <input
                        type="text"
                        value={saleForm.crop_name}
                        onChange={(e) => setSaleForm({ ...saleForm, crop_name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        placeholder="e.g., Tomatoes"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Batch Code *</label>
                      <input
                        type="text"
                        value={saleForm.batch_code}
                        onChange={(e) => setSaleForm({ ...saleForm, batch_code: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        placeholder="e.g., TOM-2025-001"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity Sold</label>
                        <input
                          type="number"
                          step="0.001"
                          value={saleForm.quantity_sold}
                          onChange={(e) => setSaleForm({ ...saleForm, quantity_sold: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                          placeholder="100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Unit</label>
                        <div className="relative">
                          <select
                            value={saleForm.unit}
                            onChange={(e) => setSaleForm({ ...saleForm, unit: e.target.value })}
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                          >
                            {unitOptions.map(option => (
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
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Price per Unit (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={saleForm.price_per_unit}
                        onChange={(e) => setSaleForm({ ...saleForm, price_per_unit: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        placeholder="50.00"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Sale Date *</label>
                      <input
                        type="date"
                        value={saleForm.sale_date}
                        onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Buyer Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>🤝</span>
                      <span>Buyer Information</span>
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Buyer Name *</label>
                      <input
                        type="text"
                        value={saleForm.buyer_name}
                        onChange={(e) => setSaleForm({ ...saleForm, buyer_name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        placeholder="ABC Traders"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Buyer Contact</label>
                      <input
                        type="text"
                        value={saleForm.buyer_contact}
                        onChange={(e) => setSaleForm({ ...saleForm, buyer_contact: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Buyer Address</label>
                      <textarea
                        value={saleForm.buyer_address}
                        onChange={(e) => setSaleForm({ ...saleForm, buyer_address: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                        placeholder="Enter buyer's address"
                      />
                    </div>
                  </div>

                  {/* Payment Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>💳</span>
                      <span>Payment Details</span>
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Payment Status</label>
                      <div className="relative">
                        <select
                          value={saleForm.payment_status}
                          onChange={(e) => setSaleForm({ ...saleForm, payment_status: e.target.value })}
                          className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
                        >
                          {paymentStatusOptions.map(option => (
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount Received (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={saleForm.amount_received}
                          onChange={(e) => setSaleForm({ ...saleForm, amount_received: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Due Date</label>
                        <input
                          type="date"
                          value={saleForm.payment_due_date}
                          onChange={(e) => setSaleForm({ ...saleForm, payment_due_date: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Hide farm selection in farm-specific mode - complete database isolation */}
                    {!inFarmMode && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Farm *</label>
                        <div className="relative">
                          <select
                            value={saleForm.farm}
                            onChange={(e) => setSaleForm({ ...saleForm, farm: e.target.value })}
                            className="w-full px-4 py-3 pr-10 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 appearance-none cursor-pointer"
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
                    )}
                    
                    {/* Show farm info in farm-specific mode */}
                    {inFarmMode && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Farm</label>
                        <div className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800 font-medium">
                          🏡 Farm Context Mode - Auto-assigned
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Additional Info</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Quality Grade</label>
                        <input
                          type="text"
                          value={saleForm.quality_grade}
                          onChange={(e) => setSaleForm({ ...saleForm, quality_grade: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                          placeholder="A-Grade"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Invoice Number</label>
                        <input
                          type="text"
                          value={saleForm.invoice_number}
                          onChange={(e) => setSaleForm({ ...saleForm, invoice_number: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                          placeholder="INV-2025-001"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Transportation (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={saleForm.transportation_cost}
                          onChange={(e) => setSaleForm({ ...saleForm, transportation_cost: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Commission (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={saleForm.commission_amount}
                          onChange={(e) => setSaleForm({ ...saleForm, commission_amount: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-0 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                      <textarea
                        value={saleForm.notes}
                        onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-400/50 focus:shadow-sm transition-all duration-200 resize-none"
                        placeholder="Enter any additional notes about this sale"
                        style={{ minHeight: '80px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
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
                    onClick={handleAddSale}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-sm font-medium hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Adding Sale...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>💰</span>
                        <span>Add Sale</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Sale Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Edit Sale</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSale(null);
                      resetForm();
                    }}
                    className="text-white hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form fields for edit modal */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Crop Name *</label>
                  <input
                    type="text"
                    value={saleForm.crop_name}
                    onChange={(e) => setSaleForm({ ...saleForm, crop_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Tomatoes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Batch Code *</label>
                  <input
                    type="text"
                    value={saleForm.batch_code}
                    onChange={(e) => setSaleForm({ ...saleForm, batch_code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TOM-2025-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantity Sold</label>
                  <input
                    type="number"
                    step="0.001"
                    value={saleForm.quantity_sold}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity_sold: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 100 (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                  <select
                    value={saleForm.unit}
                    onChange={(e) => setSaleForm({ ...saleForm, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {unitOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saleForm.price_per_unit}
                    onChange={(e) => setSaleForm({ ...saleForm, price_per_unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 50.00 (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sale Date *</label>
                  <input
                    type="date"
                    value={saleForm.sale_date}
                    onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Buyer Name *</label>
                  <input
                    type="text"
                    value={saleForm.buyer_name}
                    onChange={(e) => setSaleForm({ ...saleForm, buyer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ABC Traders"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Buyer Contact</label>
                  <input
                    type="text"
                    value={saleForm.buyer_contact}
                    onChange={(e) => setSaleForm({ ...saleForm, buyer_contact: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., +91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Status</label>
                  <select
                    value={saleForm.payment_status}
                    onChange={(e) => setSaleForm({ ...saleForm, payment_status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {paymentStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount Received (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saleForm.amount_received}
                    onChange={(e) => setSaleForm({ ...saleForm, amount_received: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Due Date</label>
                  <input
                    type="date"
                    value={saleForm.payment_due_date}
                    onChange={(e) => setSaleForm({ ...saleForm, payment_due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quality Grade</label>
                  <input
                    type="text"
                    value={saleForm.quality_grade}
                    onChange={(e) => setSaleForm({ ...saleForm, quality_grade: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., A-Grade, Premium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    value={saleForm.invoice_number}
                    onChange={(e) => setSaleForm({ ...saleForm, invoice_number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., INV-2025-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Transportation Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saleForm.transportation_cost}
                    onChange={(e) => setSaleForm({ ...saleForm, transportation_cost: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Commission Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saleForm.commission_amount}
                    onChange={(e) => setSaleForm({ ...saleForm, commission_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Buyer Address</label>
                  <textarea
                    value={saleForm.buyer_address}
                    onChange={(e) => setSaleForm({ ...saleForm, buyer_address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter buyer's address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={saleForm.notes}
                    onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any additional notes about this sale"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 p-6 border-t border-slate-200/60">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSale(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSale}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? '🔄 Updating Sale...' : '💾 Update Sale'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SaleStage;