import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, agronomistOnly = false, superuserOnly = false, farmUserOnly = false }) => {
  const { isAuthenticated, isAgronomist, isSuperuser, isFarmUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Route access control
  if (superuserOnly && !isSuperuser) {
    return <Navigate to="/dashboard" replace />;
  }

  if ((adminOnly || agronomistOnly) && !isAgronomist && !isSuperuser) {
    // Redirect farm users to their dashboard
    if (isFarmUser) {
      return <Navigate to="/farm-user-dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (farmUserOnly && !isFarmUser) {
    // Redirect agronomists/superusers to their dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;