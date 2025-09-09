import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, superuserOnly = false }) => {
  const { isAuthenticated, isAdmin, isSuperuser, loading } = useAuth();

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

  if (superuserOnly && !isSuperuser) {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isAdmin && !isSuperuser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;