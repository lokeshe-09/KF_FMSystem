import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateFarmUser from './pages/CreateFarmUser';
import CreateFarm from './pages/CreateFarm';
import Farms from './pages/Farms';
import DailyTasks from './pages/DailyTasks';
import CropStage from './pages/CropStage';
import SpraySchedule from './pages/SpraySchedule';
import Notifications from './pages/Notifications';
import FarmNotifications from './pages/FarmNotifications';
import FarmSpecificNotifications from './pages/FarmSpecificNotifications';
import AdminNotificationManager from './pages/AdminNotificationManager';
import UserManagement from './pages/UserManagement';
import FarmUserManagement from './pages/FarmUserManagement';
import Calendar from './pages/Calendar';
import Fertigation from './pages/Fertigation';
import WorkerTaskManagement from './pages/WorkerTaskManagement';
import IssueReports from './pages/IssueReports';
import ExpenditureManagement from './pages/ExpenditureManagement';
import SaleStage from './pages/SaleStage';

// NEW: Farm-centric pages
import MyFarms from './pages/MyFarms';
import FarmUserDashboard from './pages/FarmUserDashboard';
import FarmDashboard from './pages/FarmDashboard';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
          
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin/Superuser Dashboard */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* NEW: Farm User Dashboard (shows overview of all assigned farms) */}
            <Route 
              path="/farm-user-dashboard" 
              element={
                <ProtectedRoute farmUserOnly>
                  <FarmUserDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* NEW: My Farms (farm selection page for farm users) */}
            <Route 
              path="/my-farms" 
              element={
                <ProtectedRoute farmUserOnly>
                  <MyFarms />
                </ProtectedRoute>
              } 
            />
            
            {/* NEW: Farm-specific Dashboard */}
            <Route 
              path="/farm/:farmId/dashboard" 
              element={
                <ProtectedRoute farmUserOnly>
                  <FarmDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* NEW: Farm-specific Pages (no farm dropdown needed) */}
            <Route 
              path="/farm/:farmId/daily-tasks" 
              element={
                <ProtectedRoute farmUserOnly>
                  <DailyTasks />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/crop-stages" 
              element={
                <ProtectedRoute farmUserOnly>
                  <CropStage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/spray-schedules" 
              element={
                <ProtectedRoute farmUserOnly>
                  <SpraySchedule />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/fertigations" 
              element={
                <ProtectedRoute farmUserOnly>
                  <Fertigation />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/workers" 
              element={
                <ProtectedRoute farmUserOnly>
                  <WorkerTaskManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/worker-tasks" 
              element={
                <ProtectedRoute farmUserOnly>
                  <WorkerTaskManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/issue-reports" 
              element={
                <ProtectedRoute farmUserOnly>
                  <IssueReports />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/expenditures" 
              element={
                <ProtectedRoute farmUserOnly>
                  <ExpenditureManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/sales" 
              element={
                <ProtectedRoute farmUserOnly>
                  <SaleStage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm/:farmId/notifications" 
              element={
                <ProtectedRoute farmUserOnly>
                  <FarmSpecificNotifications />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/create-user" 
              element={
                <ProtectedRoute adminOnly>
                  <CreateFarmUser />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/create-farm" 
              element={
                <ProtectedRoute adminOnly>
                  <CreateFarm />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farms" 
              element={
                <ProtectedRoute>
                  <Farms />
                </ProtectedRoute>
              } 
            />
            
            {/* Legacy routes for admin/superuser */}
            <Route 
              path="/daily-tasks" 
              element={
                <ProtectedRoute>
                  <DailyTasks />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/crop-stage" 
              element={
                <ProtectedRoute>
                  <CropStage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/spray-schedule" 
              element={
                <ProtectedRoute>
                  <SpraySchedule />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/fertigation" 
              element={
                <ProtectedRoute>
                  <Fertigation />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/worker-tasks" 
              element={
                <ProtectedRoute>
                  <WorkerTaskManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/issue-reports" 
              element={
                <ProtectedRoute>
                  <IssueReports />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/expenditure" 
              element={
                <ProtectedRoute>
                  <ExpenditureManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/sale-stage" 
              element={
                <ProtectedRoute>
                  <SaleStage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm-notifications" 
              element={
                <ProtectedRoute>
                  <FarmNotifications />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute adminOnly>
                  <Notifications />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/notification-manager" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminNotificationManager />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/user-management" 
              element={
                <ProtectedRoute superuserOnly>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farm-user-management" 
              element={
                <ProtectedRoute adminOnly>
                  <FarmUserManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;