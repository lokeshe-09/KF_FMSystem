import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { user, isSuperuser } = useAuth();
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user?.is_superuser) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, agronomistsResponse] = await Promise.all([
        authAPI.getAllUsers(),
        authAPI.getAgronomists()
      ]);

      setUsers(usersResponse.data || []);
      setAdmins(agronomistsResponse.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Set empty arrays instead of showing error to user
      setUsers([]);
      setAdmins([]);
      // Only show error if user is authenticated and has permission
      if (user?.is_superuser) {
        console.warn('Failed to load user data. Please check backend connectivity.');
      }
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

  const openResetModal = (user) => {
    setSelectedUser(user);
    setShowResetModal(true);
    setNewPassword('');
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'admins':
        return admins;
      case 'farm_users':
        return users.filter(u => u.user_type === 'farm_user');
      default:
        return users;
    }
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-slate-600 font-medium">Loading users...</p>
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-600 font-medium">
                Manage and reset passwords for agronomist and farm users
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Total Users
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{users.length}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-blue-50 px-2 py-1 rounded-full">
                All
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
                    Agronomist Users
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{admins.length}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                Agronomists
              </div>
            </div>
          </div>

          <div className="stats-card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Farm Users
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {users.filter(u => u.user_type === 'farm_user').length}
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-amber-50 px-2 py-1 rounded-full">
                Workers
              </div>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="card">
          <div className="px-8 py-6 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">User List</h3>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1">
                {[
                  { key: 'all', label: 'All Users', count: users.length },
                  { key: 'admins', label: 'Agronomists', count: admins.length },
                  { key: 'farm_users', label: 'Farm Users', count: users.filter(u => u.user_type === 'farm_user').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === tab.key
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8">
            {getCurrentData().length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No users found</h4>
                <p className="text-slate-500">No users match the selected criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Last Login</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentData().map((userData) => (
                      <tr key={userData.id} className="group">
                        <td>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {userData.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{userData.username}</p>
                              <p className="text-xs text-slate-500">
                                {userData.first_name || userData.last_name 
                                  ? `${userData.first_name} ${userData.last_name}`.trim() 
                                  : 'No name provided'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            userData.user_type === 'agronomist'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {userData.user_type === 'agronomist' ? 'Agronomist' : 'Farm User'}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">
                            {userData.email || 'No email'}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">
                            {userData.last_login ? formatDate(userData.last_login) : 'Never'}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-600 text-sm">
                            {formatDate(userData.date_joined)}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => openResetModal(userData)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200"
                            title="Reset Password"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/75 backdrop-blur-sm">
            <div className="card max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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

export default UserManagement;