import React, { useState, useEffect } from 'react';
import { farmAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Farms = () => {
  const { isAgronomist } = useAuth();
  const [farms, setFarms] = useState([]);
  const [farmUsers, setFarmUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditFarmModal, setShowEditFarmModal] = useState(false);
  const [activeTab, setActiveTab] = useState('farms');
  const [editingUser, setEditingUser] = useState(null);
  const [editingFarm, setEditingFarm] = useState(null);
  const [availableFarms, setAvailableFarms] = useState([]);

  useEffect(() => {
    fetchFarms();
    if (isAgronomist) {
      fetchFarmUsers();
    }
  }, [isAgronomist]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
      setAvailableFarms(response.data);
    } catch (error) {
      toast.error('Failed to fetch farms');
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmUsers = async () => {
    try {
      const response = await authAPI.getFarmUsers();
      setFarmUsers(response.data);
    } catch (error) {
      console.error('Error fetching farm users:', error);
    }
  };

  const handleViewDetails = (farm) => {
    setSelectedFarm(farm);
    setShowModal(true);
  };

  const handleEditFarm = (farm) => {
    setSelectedFarm(farm);
    setEditingFarm({
      name: farm.name,
      location: farm.location,
      size_in_acres: farm.size_in_acres,
      description: farm.description || ''
    });
    setShowEditFarmModal(true);
  };

  const handleUpdateFarm = async (e) => {
    e.preventDefault();
    try {
      await farmAPI.updateFarm(selectedFarm.id, editingFarm);
      toast.success('Farm updated successfully');
      fetchFarms();
      setShowEditFarmModal(false);
      setSelectedFarm(null);
      setEditingFarm(null);
    } catch (error) {
      toast.error('Failed to update farm');
      console.error('Error updating farm:', error);
    }
  };

  const handleDeleteFarm = async (farmId) => {
    if (!window.confirm('Are you sure you want to delete this farm?')) {
      return;
    }

    try {
      await farmAPI.deleteFarm(farmId);
      toast.success('Farm deleted successfully');
      fetchFarms();
      fetchFarmUsers();
    } catch (error) {
      toast.error('Failed to delete farm');
      console.error('Error deleting farm:', error);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setEditingUser({ ...user, assigned_farm: user.assigned_farms?.[0]?.id || '' });
    setShowUserModal(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateFarmUser(selectedUser.id, editingUser);
      toast.success('Farm user updated successfully');
      fetchFarmUsers();
      setShowUserModal(false);
    } catch (error) {
      toast.error('Failed to update farm user');
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this farm user?')) {
      return;
    }

    try {
      await authAPI.deleteFarmUser(userId);
      toast.success('Farm user deleted successfully');
      fetchFarmUsers();
    } catch (error) {
      toast.error('Failed to delete farm user');
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">
                        {isAgronomist ? 'Farm Management' : 'My Farms'}
                      </h1>
                      <p className="text-slate-600 mt-1">
                        {isAgronomist 
                          ? 'Manage farms and farm users across your organization' 
                          : 'View and access your assigned farm locations'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 mt-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {farms.length} {farms.length === 1 ? 'Farm' : 'Farms'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {farms.filter(f => f.is_active).length} Active
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">
                        {farms.reduce((sum, farm) => sum + parseFloat(farm.size_in_acres || 0), 0).toFixed(1)} Total Acres
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Tabs */}
          {isAgronomist && (
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'farms', label: 'Farms', count: farms.length, icon: '🏡' },
                    { key: 'users', label: 'Farm Users', count: farmUsers.length, icon: '👥' }
                  ].map(({ key, label, count, icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                        activeTab === key
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <span className="mr-2">{icon}</span>
                      {label}
                      {count > 0 && (
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
          )}

          {/* Farms Grid */}
          {(activeTab === 'farms' || !isAgronomist) && (
            <>
              {farms.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-12">
                    <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Farms Available</h3>
                    <p className="text-slate-500 text-lg mb-6">
                      {isAgronomist ? 'Get started by creating your first farm.' : 'No farms have been assigned to you yet. Contact your agronomist.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {farms.map((farm) => (
                    <div 
                      key={farm.id} 
                      className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 transform hover:-translate-y-1"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">{farm.name}</h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          farm.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {farm.is_active ? '✓ Active' : '✗ Inactive'}
                        </span>
                      </div>

                      {/* Farm Details */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-slate-600">
                          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm font-medium">{farm.location}</span>
                        </div>
                        
                        <div className="flex items-center text-slate-600">
                          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium">{farm.size_in_acres} acres</span>
                        </div>
                        
                        <div className="flex items-center text-slate-600">
                          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium">{new Date(farm.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}</span>
                        </div>

                        {isAgronomist && farm.owner_details && (
                          <div className="flex items-center text-slate-600">
                            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-medium">Owner: {farm.owner_details.username}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleViewDetails(farm)}
                          className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                        
                        {isAgronomist && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditFarm(farm)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFarm(farm.id)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transform hover:scale-105 transition-all duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        {activeTab === 'users' && isAgronomist && (
          <>
            {farmUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No farm users</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new farm user.</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {farmUsers.map((user) => (
                    <li key={user.id}>
                      <div className="px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-secondary-100 rounded-full flex items-center justify-center">
                              <svg className="h-6 w-6 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                            </div>
                            <div className="text-sm text-gray-500">
                              @{user.username} • {user.email}
                              {user.assigned_farms?.length > 0 && (
                                <span> • Assigned to {user.assigned_farms.length} farm(s)</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              Created: {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Farm Details Modal */}
        {showModal && selectedFarm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200/60 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-t-2xl px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedFarm.name}</h3>
                      <p className="text-emerald-100">Farm Details & Information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Farm Name</label>
                          <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">{selectedFarm.name}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
                          <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold ${
                            selectedFarm.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedFarm.is_active ? '✓ Active' : '✗ Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location & Size
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Location</label>
                          <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">{selectedFarm.location}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Size</label>
                          <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">{selectedFarm.size_in_acres} acres</p>
                        </div>
                      </div>
                    </div>

                    {selectedFarm.description && (
                      <div className="bg-slate-50 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          Description
                        </h4>
                        <p className="text-sm text-slate-700 bg-white rounded-lg px-4 py-3 leading-relaxed">{selectedFarm.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {isAgronomist && selectedFarm.owner_details && (
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Owner Information
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Full Name</label>
                            <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">
                              {selectedFarm.owner_details.first_name} {selectedFarm.owner_details.last_name}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Username</label>
                            <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">{selectedFarm.owner_details.username}</p>
                          </div>
                          {selectedFarm.owner_details.email && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email</label>
                              <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">{selectedFarm.owner_details.email}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-emerald-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Creation Details
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Created Date</label>
                          <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">
                            {new Date(selectedFarm.created_at).toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Created Time</label>
                          <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">
                            {new Date(selectedFarm.created_at).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                        </div>
                        {selectedFarm.created_by_details && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Created By</label>
                            <p className="text-sm font-medium text-slate-900 bg-white rounded-lg px-3 py-2">{selectedFarm.created_by_details.username}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Quick Stats
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center bg-white rounded-lg p-3">
                          <div className="text-2xl font-bold text-emerald-600">{selectedFarm.size_in_acres}</div>
                          <div className="text-xs font-medium text-slate-500">Total Acres</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.floor((Date.now() - new Date(selectedFarm.created_at)) / (1000 * 60 * 60 * 24))}
                          </div>
                          <div className="text-xs font-medium text-slate-500">Days Active</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Farm Modal */}
        {showEditFarmModal && selectedFarm && editingFarm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit Farm Details</h3>
                  <button
                    onClick={() => {
                      setShowEditFarmModal(false);
                      setSelectedFarm(null);
                      setEditingFarm(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleUpdateFarm} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Farm Name</label>
                    <input
                      type="text"
                      value={editingFarm.name}
                      onChange={(e) => setEditingFarm({...editingFarm, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={editingFarm.location}
                      onChange={(e) => setEditingFarm({...editingFarm, location: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Size (in acres)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingFarm.size_in_acres}
                      onChange={(e) => setEditingFarm({...editingFarm, size_in_acres: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={editingFarm.description}
                      onChange={(e) => setEditingFarm({...editingFarm, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Optional description..."
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditFarmModal(false);
                        setSelectedFarm(null);
                        setEditingFarm(null);
                      }}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Update Farm
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* User Edit Modal */}
        {showUserModal && selectedUser && editingUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit Farm User</h3>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleEditUser} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        value={editingUser.first_name}
                        onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        value={editingUser.last_name}
                        onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Farm</label>
                    <select
                      value={editingUser.assigned_farm}
                      onChange={(e) => setEditingUser({...editingUser, assigned_farm: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">No farm assigned</option>
                      {availableFarms.map((farm) => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name} - {farm.location}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default Farms;