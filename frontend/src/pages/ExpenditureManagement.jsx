import React, { useState, useEffect } from 'react';
import { farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const ExpenditureManagement = () => {
  const [loading, setLoading] = useState(false);
  const [expendituresLoading, setExpendituresLoading] = useState(false);
  
  // Data states
  const [expenditures, setExpenditures] = useState([]);
  const [farms, setFarms] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpenditure, setEditingExpenditure] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    payment_method: '',
    date_from: '',
    date_to: '',
    farm: ''
  });
  
  // Form states
  const [expenditureForm, setExpenditureForm] = useState({
    expense_title: '',
    category: '',
    amount: '',
    payment_method: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    bill_number: '',
    vendor_name: '',
    farm: ''
  });

  // Categories and Payment Methods
  const categories = [
    { value: 'seeds_plants', label: '🌱 Seeds/Plants' },
    { value: 'fertilizers', label: '💩 Fertilizers' },
    { value: 'pesticides', label: '🐛 Pesticides/Chemicals' },
    { value: 'equipment', label: '🔧 Equipment/Tools' },
    { value: 'labor', label: '👷 Labor' },
    { value: 'irrigation', label: '💧 Irrigation/Water' },
    { value: 'fuel', label: '⛽ Fuel' },
    { value: 'maintenance', label: '🔨 Maintenance' },
    { value: 'transportation', label: '🚚 Transportation' },
    { value: 'utilities', label: '💡 Utilities' },
    { value: 'packaging', label: '📦 Packaging' },
    { value: 'marketing', label: '📢 Marketing' },
    { value: 'others', label: '📂 Others' },
  ];

  const paymentMethods = [
    { value: 'cash', label: '💵 Cash' },
    { value: 'bank_transfer', label: '🏦 Bank Transfer' },
    { value: 'upi', label: '📱 UPI' },
    { value: 'credit_card', label: '💳 Credit Card' },
    { value: 'debit_card', label: '💳 Debit Card' },
    { value: 'cheque', label: '📝 Cheque' },
    { value: 'others', label: '📂 Others' },
  ];

  useEffect(() => {
    fetchExpenditures();
    fetchFarms();
    fetchAnalytics();
  }, []);

  // Set default farm when farms are loaded
  useEffect(() => {
    if (farms.length > 0 && !expenditureForm.farm) {
      setExpenditureForm(prev => ({ ...prev, farm: farms[0].id }));
    }
  }, [farms]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data || []);
    } catch (error) {
      console.error('Failed to fetch farms:', error);
      setFarms([]); // Set empty array to avoid UI errors
    }
  };

  const fetchExpenditures = async (newFilters = {}) => {
    try {
      setExpendituresLoading(true);
      const combinedFilters = { ...filters, ...newFilters };
      const cleanFilters = Object.fromEntries(
        Object.entries(combinedFilters).filter(([_, value]) => value !== '')
      );
      const response = await farmAPI.getExpenditures(cleanFilters);
      setExpenditures(response.data || []);
      setFilters(combinedFilters);
    } catch (error) {
      console.error('Failed to fetch expenditures:', error);
      // Only show error if it's not a network issue and not initial load
      if (expenditures.length === 0 && error.response?.status !== 404) {
        // Don't show error toast for empty data - just log it
        setExpenditures([]);
      }
    } finally {
      setExpendituresLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await farmAPI.getExpenditureAnalytics();
      setAnalytics(response.data || { total_expenditure: 0, total_transactions: 0, avg_expenditure: 0 });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set default analytics to avoid UI errors
      setAnalytics({ 
        total_expenditure: 0, 
        total_transactions: 0, 
        avg_expenditure: 0,
        category_breakdown: [],
        payment_method_breakdown: []
      });
    }
  };

  const handleAddExpenditure = async () => {
    // Form validation
    if (!expenditureForm.expense_title.trim()) {
      toast.error('Please enter expense title');
      return;
    }
    if (!expenditureForm.category) {
      toast.error('Please select a category');
      return;
    }
    if (!expenditureForm.amount || expenditureForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!expenditureForm.payment_method) {
      toast.error('Please select a payment method');
      return;
    }
    if (!expenditureForm.expense_date) {
      toast.error('Please select expense date');
      return;
    }
    if (!expenditureForm.farm) {
      toast.error('Please select a farm');
      return;
    }

    try {
      setLoading(true);
      const response = await farmAPI.createExpenditure(expenditureForm);
      toast.success('Expenditure added successfully');
      setShowAddModal(false);
      resetForm();
      fetchExpenditures();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add expenditure');
      console.error('Failed to add expenditure:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExpenditure = async () => {
    try {
      setLoading(true);
      await farmAPI.updateExpenditure(editingExpenditure.id, expenditureForm);
      toast.success('Expenditure updated successfully');
      setShowEditModal(false);
      setEditingExpenditure(null);
      resetForm();
      fetchExpenditures();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update expenditure');
      console.error('Failed to update expenditure:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpenditure = async (expenditureId) => {
    if (!window.confirm('Are you sure you want to delete this expenditure?')) {
      return;
    }
    
    try {
      await farmAPI.deleteExpenditure(expenditureId);
      toast.success('Expenditure deleted successfully');
      fetchExpenditures();
      fetchAnalytics();
    } catch (error) {
      toast.error('Failed to delete expenditure');
      console.error('Failed to delete expenditure:', error);
    }
  };

  const resetForm = () => {
    setExpenditureForm({
      expense_title: '',
      category: '',
      amount: '',
      payment_method: '',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
      bill_number: '',
      vendor_name: '',
      farm: farms.length > 0 ? farms[0].id : ''
    });
  };

  const clearFilters = () => {
    const resetFilters = { category: '', payment_method: '', date_from: '', date_to: '', farm: '' };
    setFilters(resetFilters);
    fetchExpenditures(resetFilters);
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  const getPaymentMethodLabel = (paymentValue) => {
    const payment = paymentMethods.find(pm => pm.value === paymentValue);
    return payment ? payment.label : paymentValue;
  };

  if (loading && !expenditures.length) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-slate-600">Loading expenditure management...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenditure Management</h1>
          <p className="text-gray-600">Track and manage all your farm expenses</p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Total Expenditure</h3>
                  <p className="text-2xl font-bold">₹{analytics.total_expenditure}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Total Transactions</h3>
                  <p className="text-2xl font-bold">{analytics.total_transactions}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Average Transaction</h3>
                  <p className="text-2xl font-bold">₹{analytics.average_transaction}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">This Month</h3>
                  <p className="text-lg font-bold">Track expenses</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Expenditure Records</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add New Expenditure
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select 
                className="input" 
                value={filters.category}
                onChange={(e) => fetchExpenditures({category: e.target.value})}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select 
                className="input"
                value={filters.payment_method}
                onChange={(e) => fetchExpenditures({payment_method: e.target.value})}
              >
                <option value="">All Payment Methods</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>

              <input 
                type="date" 
                className="input" 
                placeholder="From Date" 
                value={filters.date_from}
                onChange={(e) => fetchExpenditures({date_from: e.target.value})} 
              />

              <input 
                type="date" 
                className="input" 
                placeholder="To Date" 
                value={filters.date_to}
                onChange={(e) => fetchExpenditures({date_to: e.target.value})} 
              />

              <select 
                className="input" 
                value={filters.farm}
                onChange={(e) => fetchExpenditures({farm: e.target.value})}
              >
                <option value="">All Farms</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            {(filters.category || filters.payment_method || filters.date_from || filters.date_to || filters.farm) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filters.category && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Category: {getCategoryLabel(filters.category)}
                  </span>
                )}
                {filters.payment_method && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Payment: {getPaymentMethodLabel(filters.payment_method)}
                  </span>
                )}
                {filters.date_from && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    From: {new Date(filters.date_from).toLocaleDateString()}
                  </span>
                )}
                {filters.date_to && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    To: {new Date(filters.date_to).toLocaleDateString()}
                  </span>
                )}
                {filters.farm && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Farm: {farms.find(f => f.id == filters.farm)?.name}
                  </span>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-xs text-red-600 hover:text-red-800 underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expenditures Table */}
        <div className="card">
          <div className="overflow-x-auto">
            {expendituresLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loading-spinner"></div>
                <p className="ml-4 text-slate-600">Loading expenditures...</p>
              </div>
            ) : expenditures.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenditures found</h3>
                <p className="text-gray-500 mb-6">
                  {Object.values(filters).some(filter => filter !== '')
                    ? "No expenditures match your current filters. Try adjusting your search criteria."
                    : "Start tracking your farm expenses by adding your first expenditure."}
                </p>
                {Object.values(filters).some(filter => filter !== '') ? (
                  <button 
                    onClick={clearFilters}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary"
                  >
                    Add First Expenditure
                  </button>
                )}
              </div>
            ) : (
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Farm</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenditures.map((expenditure) => (
                    <tr key={expenditure.id}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-900">{expenditure.expense_title}</p>
                          {expenditure.vendor_name && (
                            <p className="text-sm text-gray-500">Vendor: {expenditure.vendor_name}</p>
                          )}
                          {expenditure.bill_number && (
                            <p className="text-xs text-gray-400">Bill: {expenditure.bill_number}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {getCategoryLabel(expenditure.category)}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold text-green-600">₹{expenditure.amount}</p>
                      </td>
                      <td>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          {getPaymentMethodLabel(expenditure.payment_method)}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm">{new Date(expenditure.expense_date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">
                            {Math.ceil((new Date() - new Date(expenditure.expense_date)) / (1000 * 60 * 60 * 24))} days ago
                          </p>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm">{expenditure.farm_name}</p>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setEditingExpenditure(expenditure);
                              setExpenditureForm({
                                expense_title: expenditure.expense_title,
                                category: expenditure.category,
                                amount: expenditure.amount,
                                payment_method: expenditure.payment_method,
                                expense_date: expenditure.expense_date,
                                notes: expenditure.notes || '',
                                bill_number: expenditure.bill_number || '',
                                vendor_name: expenditure.vendor_name || '',
                                farm: expenditure.farm
                              });
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteExpenditure(expenditure.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Add Expenditure Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 sm:mx-auto shadow-2xl transform animate-scaleIn overflow-hidden max-h-[90vh]">
              
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  Add New Expenditure
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                
                {/* Expense Title */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Expense Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of expense"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.expense_title}
                    onChange={(e) => setExpenditureForm({...expenditureForm, expense_title: e.target.value})}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.category}
                    onChange={(e) => setExpenditureForm({...expenditureForm, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                      value={expenditureForm.amount}
                      onChange={(e) => setExpenditureForm({...expenditureForm, amount: e.target.value})}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.payment_method}
                    onChange={(e) => setExpenditureForm({...expenditureForm, payment_method: e.target.value})}
                    required
                  >
                    <option value="">Select Payment Method</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.value} value={pm.value}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expense Date */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Expense Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.expense_date}
                    onChange={(e) => setExpenditureForm({...expenditureForm, expense_date: e.target.value})}
                    required
                  />
                </div>

                {/* Select Farm */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Select Farm <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.farm}
                    onChange={(e) => setExpenditureForm({...expenditureForm, farm: e.target.value})}
                    required
                  >
                    <option value="">Select Farm</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        🌾 {farm.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="Supplier/Vendor name"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.vendor_name}
                    onChange={(e) => setExpenditureForm({...expenditureForm, vendor_name: e.target.value})}
                  />
                </div>

                {/* Bill Number */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Bill Number
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice/Bill number"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.bill_number}
                    onChange={(e) => setExpenditureForm({...expenditureForm, bill_number: e.target.value})}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Notes
                  </label>
                  <textarea
                    placeholder="Additional notes or details"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md resize-none"
                    rows={2}
                    value={expenditureForm.notes}
                    onChange={(e) => setExpenditureForm({...expenditureForm, notes: e.target.value})}
                  />
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddExpenditure} 
                    disabled={!expenditureForm.expense_title || !expenditureForm.category || !expenditureForm.amount || !expenditureForm.payment_method || !expenditureForm.farm || loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-medium rounded-full hover:from-green-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-green-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? 'Adding...' : '💰 Add Expenditure'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Edit Expenditure Modal */}
        {showEditModal && editingExpenditure && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 sm:mx-auto shadow-2xl transform animate-scaleIn overflow-hidden max-h-[90vh]">
              
              {/* Sticky Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  Edit Expenditure
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExpenditure(null);
                    resetForm();
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                
                {/* Expense Title */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Expense Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of expense"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.expense_title}
                    onChange={(e) => setExpenditureForm({...expenditureForm, expense_title: e.target.value})}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.category}
                    onChange={(e) => setExpenditureForm({...expenditureForm, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                      value={expenditureForm.amount}
                      onChange={(e) => setExpenditureForm({...expenditureForm, amount: e.target.value})}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.payment_method}
                    onChange={(e) => setExpenditureForm({...expenditureForm, payment_method: e.target.value})}
                    required
                  >
                    <option value="">Select Payment Method</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.value} value={pm.value}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expense Date */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Expense Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.expense_date}
                    onChange={(e) => setExpenditureForm({...expenditureForm, expense_date: e.target.value})}
                    required
                  />
                </div>

                {/* Vendor Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="Supplier/Vendor name"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.vendor_name}
                    onChange={(e) => setExpenditureForm({...expenditureForm, vendor_name: e.target.value})}
                  />
                </div>

                {/* Bill Number */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Bill Number
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice/Bill number"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md"
                    value={expenditureForm.bill_number}
                    onChange={(e) => setExpenditureForm({...expenditureForm, bill_number: e.target.value})}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-600">
                    Notes
                  </label>
                  <textarea
                    placeholder="Additional notes or details"
                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 focus:bg-white focus:shadow-lg transition-all duration-200 hover:shadow-md resize-none"
                    rows={2}
                    value={expenditureForm.notes}
                    onChange={(e) => setExpenditureForm({...expenditureForm, notes: e.target.value})}
                  />
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpenditure(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateExpenditure} 
                    disabled={!expenditureForm.expense_title || !expenditureForm.category || !expenditureForm.amount || !expenditureForm.payment_method || loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-400 to-indigo-400 text-white font-medium rounded-full hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? 'Updating...' : '✏️ Update Expenditure'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default ExpenditureManagement;