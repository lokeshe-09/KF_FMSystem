import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const FarmUserManagement = () => {
  const { user, isAgronomist } = useAuth();
  const [farmUsers, setFarmUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  });

  useEffect(() => {
    if (isAgronomist) {
      fetchFarmUsers();
    }
  }, [isAgronomist]);

  const fetchFarmUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getFarmUsers();
      setFarmUsers(response.data);
    } catch (error) {
      console.error('Error fetching farm users:', error);
      toast.error('Failed to load farm users');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setResetLoading(true);
      const response = await authAPI.resetUserPassword(selectedUser.id, {
        new_password: newPassword
      });
      
      toast.success(response.data.message);
      setShowResetModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      const message = error.response?.data?.error || 'Failed to reset password';
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleEditUser = async () => {
    try {
      const response = await authAPI.updateFarmUser(selectedUser.id, editData);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchFarmUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      const message = error.response?.data?.error || 'Failed to update user';
      toast.error(message);
    }
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setShowResetModal(true);
    setNewPassword('');
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || ''
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAgronomist) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h3>
          <p className="text-slate-500">Only agronomists can access this page.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-slate-600 font-medium">Loading farm users...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="card p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Farm User Management</h1>
              <p className="text-slate-600 font-medium">
                Manage and update farm users under your administration
              </p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Total Farm Users
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{farmUsers.length}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-blue-50 px-2 py-1 rounded-full">
                Workers
              </div>
            </div>
          </div>
          
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Active Users
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {farmUsers.filter(u => u.is_active).length}
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                Active
              </div>
            </div>
          </div>

          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Recent Logins
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {farmUsers.filter(u => u.last_login && new Date(u.last_login) > new Date(Date.now() - 7*24*60*60*1000)).length}
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-amber-50 px-2 py-1 rounded-full">
                7 Days
              </div>
            </div>
          </div>
        </div>

        {/* Farm Users List */}
        <div className="card">
          <div className="px-8 py-6 border-b border-slate-200/60">
            <h3 className="text-xl font-bold text-slate-900">Farm Users</h3>
          </div>

          <div className="p-8">
            {farmUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No farm users found</h4>
                <p className="text-slate-500">No farm users are currently assigned to your farms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmUsers.map((farmUser) => (
                      <tr key={farmUser.id} className="group">
                        <td>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {farmUser.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{farmUser.username}</p>
                              <p className="text-xs text-slate-500">
                                {farmUser.first_name || farmUser.last_name 
                                  ? `${farmUser.first_name} ${farmUser.last_name}`.trim() 
                                  : 'No name provided'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="text-sm text-slate-600">
                              {farmUser.email || 'No email'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {farmUser.phone_number || 'No phone'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            farmUser.is_active 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {farmUser.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">
                            {farmUser.last_login ? formatDate(farmUser.last_login) : 'Never'}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">
                            {formatDate(farmUser.date_joined)}
                          </span>
                        </td>
                        <td>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(farmUser)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                              title="Edit User"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => openResetModal(farmUser)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200"
                              title="Reset Password"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Reset Password
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
        </div>

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/75 backdrop-blur-sm">
            <div className="card max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
                    <p className="text-sm text-slate-600">
                      Edit details for {selectedUser?.username}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      value={editData.first_name}
                      onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                      className="form-input"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      value={editData.last_name}
                      onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                      className="form-input"
                      placeholder="Enter last name"
                    />
                  </div>

                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="form-input"
                      placeholder="Enter email"
                    />
                  </div>

                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      value={editData.phone_number}
                      onChange={(e) => setEditData({...editData, phone_number: e.target.value})}
                      className="form-input"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleEditUser}
                      className="btn-primary flex-1"
                    >
                      Update User
                    </button>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/75 backdrop-blur-sm">
            <div className="card max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1221 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                    <p className="text-sm text-slate-600">
                      Reset password for {selectedUser?.username}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      placeholder="Enter new password (min 8 characters)"
                      minLength={8}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handlePasswordReset}
                      disabled={resetLoading || !newPassword || newPassword.length < 8}
                      className="btn-primary flex-1"
                    >
                      {resetLoading ? (
                        <>
                          <div className="loading-spinner w-4 h-4 mr-2"></div>
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowResetModal(false);
                        setSelectedUser(null);
                        setNewPassword('');
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
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

export default FarmUserManagement;