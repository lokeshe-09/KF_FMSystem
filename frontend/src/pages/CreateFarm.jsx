import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { farmAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const CreateFarm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    size_in_acres: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await farmAPI.createFarm(formData);
      toast.success('Farm created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.name?.[0] || 
                       error.response?.data?.owner?.[0] || 
                       'Failed to create farm';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="card p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New Farm</h1>
              <p className="text-slate-600 font-medium">Add a new farm to your management system</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="card">
          <div className="px-8 py-6 border-b border-slate-200/60">
            <h3 className="text-xl font-bold text-slate-900">Farm Details</h3>
            <p className="text-sm text-slate-500">
              Create a new farm. You can assign users to this farm later when creating farm users.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Farm Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter farm name"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                name="location"
                id="location"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter farm location"
              />
            </div>

            <div>
              <label htmlFor="size_in_acres" className="block text-sm font-medium text-gray-700">
                Size (in Acres)
              </label>
              <input
                type="number"
                step="0.01"
                name="size_in_acres"
                id="size_in_acres"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.size_in_acres}
                onChange={handleChange}
                placeholder="Enter size in acres"
              />
            </div>


            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter farm description"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Farm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateFarm;