import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useParams } from 'react-router-dom';

// SVG Icons as components
const DashboardIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ProfileIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TasksIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const SprayIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1M13 21h4a2 2 0 002-2v-4a2 2 0 00-2-2h-4m0-4h4a2 2 0 012 2v4a2 2 0 01-2 2h-4m0-4V9a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const NotificationIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
  </svg>
);

const FarmIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const CropStageIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CalendarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FertigationIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const WorkerTaskIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IssueReportIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ExpenditureIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SaleStageIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const PlantDiseaseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isSuperuser, isFarmUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { farmId } = useParams();
  
  // Check if we're in farm-specific mode
  const inFarmMode = farmId && location.pathname.includes(`/farm/${farmId}`);

  // Farm-specific navigation (when in /farm/:farmId/* routes)
  const farmNavigation = [
    { name: 'Farm Dashboard', href: `/farm/${farmId}/dashboard`, icon: DashboardIcon, show: true },
    { name: 'Daily Tasks', href: `/farm/${farmId}/daily-tasks`, icon: TasksIcon, show: true },
    { name: 'Crop Stages', href: `/farm/${farmId}/crop-stages`, icon: CropStageIcon, show: true },
    { name: 'Plant Disease Prediction', href: `/farm/${farmId}/plant-disease`, icon: PlantDiseaseIcon, show: true },
    { name: 'Smart Calendar', href: `/farm/${farmId}/calendar`, icon: CalendarIcon, show: true },
    { name: 'Spray Schedule', href: `/farm/${farmId}/spray-schedules`, icon: SprayIcon, show: true },
    { name: 'Fertigation', href: `/farm/${farmId}/fertigations`, icon: FertigationIcon, show: true },
    { name: 'Worker Tasks', href: `/farm/${farmId}/worker-tasks`, icon: WorkerTaskIcon, show: true },
    { name: 'Issue Reports', href: `/farm/${farmId}/issue-reports`, icon: IssueReportIcon, show: true },
    { name: 'Expenditures', href: `/farm/${farmId}/expenditures`, icon: ExpenditureIcon, show: true },
    { name: 'Sales', href: `/farm/${farmId}/sales`, icon: SaleStageIcon, show: true },
    { name: 'Notifications', href: `/farm/${farmId}/notifications`, icon: NotificationIcon, show: true },
  ];

  // General farm user navigation (when not in farm-specific mode)
  const farmUserNavigation = [
    { name: 'Farm Dashboard', href: '/farm-user-dashboard', icon: DashboardIcon, show: true },
    { name: 'My Farms', href: '/my-farms', icon: FarmIcon, show: true },
    { name: 'Smart Calendar', href: '/calendar', icon: CalendarIcon, show: true },
    { name: 'My Notifications', href: '/farm-notifications', icon: NotificationIcon, show: true },
    { name: 'Profile', href: '/profile', icon: ProfileIcon, show: true },
  ];

  // Admin/Superuser navigation (legacy)
  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon, show: true },
    { name: 'Daily Tasks', href: '/daily-tasks', icon: TasksIcon, show: !isAdmin && !isSuperuser },
    { name: 'Crop Stage', href: '/crop-stage', icon: CropStageIcon, show: !isAdmin && !isSuperuser },
    { name: 'Smart Calendar', href: '/calendar', icon: CalendarIcon, show: true },
    { name: 'Spray Schedule', href: '/spray-schedule', icon: SprayIcon, show: !isAdmin && !isSuperuser },
    { name: 'Fertigation', href: '/fertigation', icon: FertigationIcon, show: !isAdmin && !isSuperuser },
    { name: 'Worker Tasks', href: '/worker-tasks', icon: WorkerTaskIcon, show: !isAdmin && !isSuperuser },
    { name: 'Issue Reports', href: '/issue-reports', icon: IssueReportIcon, show: !isAdmin && !isSuperuser },
    { name: 'Expenditure', href: '/expenditure', icon: ExpenditureIcon, show: !isAdmin && !isSuperuser },
    { name: 'Sale Stage', href: '/sale-stage', icon: SaleStageIcon, show: !isAdmin && !isSuperuser },
    { name: 'Notifications', href: '/farm-notifications', icon: NotificationIcon, show: !isAdmin && !isSuperuser },
    { name: 'Admin Notifications', href: '/notifications', icon: NotificationIcon, show: isAdmin && !isSuperuser },
    { name: 'Send Notifications', href: '/admin/notification-manager', icon: NotificationIcon, show: isAdmin && !isSuperuser },
    { name: 'User Management', href: '/user-management', icon: UserIcon, show: isSuperuser },
    { name: 'Farm User Management', href: '/farm-user-management', icon: UserIcon, show: isAdmin && !isSuperuser },
    { name: 'Create Farm', href: '/create-farm', icon: FarmIcon, show: isAdmin && !isSuperuser },
    { name: 'Create Farm User', href: '/create-user', icon: UserIcon, show: isAdmin && !isSuperuser },
    { name: 'All Farms', href: '/farms', icon: FarmIcon, show: isAdmin || isSuperuser },
    { name: 'My Farms', href: '/farms', icon: FarmIcon, show: !isAdmin && !isSuperuser },
  ].filter(item => item.show);

  // Determine which navigation to use
  let navigation;
  if (isFarmUser) {
    // Farm users get farm-specific navigation when in farm mode, otherwise general farm user navigation
    navigation = inFarmMode ? farmNavigation : farmUserNavigation;
  } else {
    // Admins and superusers always get admin navigation
    navigation = adminNavigation;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Desktop layout */}
      <div className="hidden lg:flex">
        {/* Desktop sidebar */}
        <div className="w-72 xl:w-80 flex flex-col fixed inset-y-0 z-50 bg-white shadow-xl border-r border-slate-200/60">
          {/* Logo Section - Fixed at top */}
          <div className="flex items-center flex-shrink-0 px-4 lg:px-6 py-4 lg:py-6 border-b border-slate-200/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-slate-800 leading-tight">Farm Management</h1>
                <p className="text-xs lg:text-sm text-slate-500 font-medium">Professional Dashboard</p>
              </div>
            </div>
          </div>

          {/* Farm Context Header (when in farm mode) - Fixed */}
          {inFarmMode && isFarmUser && (
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200/60">
              <div className="px-3 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Current Farm</p>
                    <p className="text-sm font-medium text-blue-900">Farm Context Mode</p>
                  </div>
                  <a
                    href="/my-farms"
                    className="inline-flex items-center px-2 py-1 border border-blue-200 text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Navigation Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
            <nav className="px-4 space-y-2">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98] ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <IconComponent className={`mr-4 h-5 w-5 transition-colors duration-200 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                    }`} />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75 flex-shrink-0"></div>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* User Profile Section - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-slate-200/60 bg-white">
            <div className="flex items-center p-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{user.username}</p>
                <p className="text-xs text-slate-500 capitalize flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    isSuperuser ? 'bg-purple-400' : user.user_type === 'admin' ? 'bg-emerald-400' : 'bg-blue-400'
                  }`}></span>
                  {isSuperuser ? 'Superuser' : user.user_type}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-2 inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop main content */}
        <div className="pl-72 xl:pl-80 flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden">
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="min-h-full py-6 lg:py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-95"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate">Farm Management</h1>
                {inFarmMode && (
                  <p className="text-xs text-slate-500 font-medium truncate">Farm Dashboard</p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {inFarmMode && isFarmUser && (
              <a
                href="/my-farms"
                className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                title="Back to My Farms"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold text-white">
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile main content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full py-3 sm:py-4 md:py-6">
            <div className="px-3 sm:px-4 md:px-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-600/75 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="relative flex-1 flex flex-col max-w-xs sm:max-w-sm w-full bg-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-10 sm:-mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full text-white hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Logo Section */}
            <div className="flex items-center flex-shrink-0 px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-200/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-800">Farm Management</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Professional Dashboard</p>
                </div>
              </div>
            </div>
            
            {/* Mobile Farm Context Header (when in farm mode) */}
            {inFarmMode && isFarmUser && (
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 mx-4 rounded-lg mb-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Current Farm</p>
                    <p className="text-sm font-medium text-blue-900">Farm Context Mode</p>
                  </div>
                  <a
                    href="/my-farms"
                    className="inline-flex items-center px-3 py-1.5 border border-blue-200 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to My Farms
                  </a>
                </div>
              </div>
            )}

            {/* Mobile Navigation */}
            <div className="flex-1 h-0 pt-2 pb-4 overflow-y-auto">
              <nav className="px-3 sm:px-4 space-y-1 sm:space-y-2">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium rounded-xl transition-all duration-200 ease-in-out min-h-[44px] ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <IconComponent className={`mr-3 sm:mr-4 h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-200 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                      }`} />
                      <span className="truncate flex-1">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75 flex-shrink-0"></div>
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>
            
            {/* Mobile User Profile Section */}
            <div className="flex-shrink-0 border-t border-slate-200/60">
              <div className="flex items-center p-3 sm:p-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-slate-700 truncate">{user.username}</p>
                  <p className="text-xs sm:text-sm text-slate-500 capitalize flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      isSuperuser ? 'bg-purple-400' : user.user_type === 'admin' ? 'bg-emerald-400' : 'bg-blue-400'
                    }`}></span>
                    {isSuperuser ? 'Superuser' : user.user_type}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="ml-2 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px]"
                  title="Logout"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;