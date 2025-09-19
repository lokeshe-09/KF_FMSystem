import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, farmAPI } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const CreateFarmUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    assigned_farms: []
  });
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getFarms();
      setFarms(response.data);
    } catch (error) {
      toast.error('Failed to fetch farms');
    } finally {
      setLoadingFarms(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFarmSelection = (farmId) => {
    const farmIdNum = parseInt(farmId);
    setFormData(prev => ({
      ...prev,
      assigned_farms: prev.assigned_farms.includes(farmIdNum)
        ? prev.assigned_farms.filter(id => id !== farmIdNum)
        : [...prev.assigned_farms, farmIdNum]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        ...formData,
        assigned_farms: formData.assigned_farms.length > 0 ? formData.assigned_farms : []
      };
      
      console.log('DEBUG: Creating farm user with data:', userData);
      await authAPI.createFarmUser(userData);
      toast.success('Farm user created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.username?.[0] || 
                       error.response?.data?.email?.[0] || 
                       'Failed to create farm user';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Create New Farm User
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create a new farm user and assign them to existing farms.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                name="username"
                id="username"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                name="phone_number"
                id="phone_number"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  id="confirm_password"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.confirm_password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assign to Farms
              </label>
              {loadingFarms ? (
                <p className="text-sm text-gray-500">Loading farms...</p>
              ) : farms.length === 0 ? (
                <p className="text-sm text-gray-500">No farms available. Create a farm first.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {farms.map((farm) => (
                    <div key={farm.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`farm-${farm.id}`}
                        checked={formData.assigned_farms.includes(farm.id)}
                        onChange={() => handleFarmSelection(farm.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`farm-${farm.id}`} className="ml-3 block text-sm text-gray-700">
                        <span className="font-medium">{farm.name}</span>
                        <span className="text-gray-500 ml-1">- {farm.location}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {formData.assigned_farms.length > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  {formData.assigned_farms.length} farm(s) selected
                </p>
              )}
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
                {loading ? 'Creating...' : 'Create Farm User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateFarmUser;