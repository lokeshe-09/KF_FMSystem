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
import AgronomistNotificationManager from './pages/AgronomistNotificationManager';
import UserManagement from './pages/UserManagement';
import FarmUserManagement from './pages/FarmUserManagement';
import Calendar from './pages/Calendar';
import Fertigation from './pages/Fertigation';
import WorkerTaskManagement from './pages/WorkerTaskManagement';
import IssueReports from './pages/IssueReports';
import ExpenditureManagement from './pages/ExpenditureManagement';
import SaleStage from './pages/SaleStage';
import PlantDiseasePrediction from './pages/PlantDiseasePrediction';
import PlantDiseasePredictionDetail from './pages/PlantDiseasePredictionDetail';

// NEW: Farm-centric pages
import MyFarms from './pages/MyFarms';
import FarmUserDashboard from './pages/FarmUserDashboard';
import FarmDashboard from './pages/FarmDashboard';
import FarmTasks from './pages/FarmTasks';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App force-light-theme">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              },
              success: {
                style: {
                  background: '#10B981',
                  color: '#ffffff',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                  color: '#ffffff',
                },
              },
            }}
          />
          
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Agronomist/Superuser Dashboard */}
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
              path="/farm/:farmId/calendar"
              element={
                <ProtectedRoute farmUserOnly>
                  <Calendar />
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
              path="/farm/:farmId/farm-tasks"
              element={
                <ProtectedRoute farmUserOnly>
                  <FarmTasks />
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
              path="/farm/:farmId/plant-disease"
              element={
                <ProtectedRoute farmUserOnly>
                  <PlantDiseasePrediction />
                </ProtectedRoute>
              }
            />

            <Route
              path="/farm/:farmId/plant-disease/:predictionId"
              element={
                <ProtectedRoute farmUserOnly>
                  <PlantDiseasePredictionDetail />
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
                <ProtectedRoute agronomistOnly>
                  <CreateFarmUser />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/create-farm" 
              element={
                <ProtectedRoute agronomistOnly>
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
            
            {/* Legacy routes for agronomist/superuser */}
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
                <ProtectedRoute agronomistOnly>
                  <Notifications />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/agronomist/notification-manager" 
              element={
                <ProtectedRoute agronomistOnly>
                  <AgronomistNotificationManager />
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
                <ProtectedRoute agronomistOnly>
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