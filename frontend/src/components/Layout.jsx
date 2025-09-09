import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

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

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isSuperuser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon, show: true },
    { name: 'Profile', href: '/profile', icon: ProfileIcon, show: true },
    { name: 'Daily Tasks', href: '/daily-tasks', icon: TasksIcon, show: !isAdmin && !isSuperuser },
    { name: 'Crop Stage', href: '/crop-stage', icon: CropStageIcon, show: !isAdmin && !isSuperuser },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon, show: !isAdmin && !isSuperuser },
    { name: 'Spray Schedule', href: '/spray-schedule', icon: SprayIcon, show: !isAdmin && !isSuperuser },
    { name: 'Fertigation', href: '/fertigation', icon: FertigationIcon, show: !isAdmin && !isSuperuser },
    { name: 'Worker Tasks', href: '/worker-tasks', icon: WorkerTaskIcon, show: !isAdmin && !isSuperuser },
    { name: 'Issue Reports', href: '/issue-reports', icon: IssueReportIcon, show: !isAdmin && !isSuperuser },
    { name: 'Expenditure', href: '/expenditure', icon: ExpenditureIcon, show: !isAdmin && !isSuperuser },
    { name: 'Sale Stage', href: '/sale-stage', icon: SaleStageIcon, show: !isAdmin && !isSuperuser },
    { name: 'Notifications', href: '/farm-notifications', icon: NotificationIcon, show: !isAdmin && !isSuperuser },
    { name: 'Admin Notifications', href: '/notifications', icon: NotificationIcon, show: isAdmin && !isSuperuser },
    { name: 'User Management', href: '/user-management', icon: UserIcon, show: isSuperuser },
    { name: 'Farm User Management', href: '/farm-user-management', icon: UserIcon, show: isAdmin && !isSuperuser },
    { name: 'Create Farm', href: '/create-farm', icon: FarmIcon, show: isAdmin && !isSuperuser },
    { name: 'Create Farm User', href: '/create-user', icon: UserIcon, show: isAdmin && !isSuperuser },
    { name: 'All Farms', href: '/farms', icon: FarmIcon, show: isAdmin || isSuperuser },
    { name: 'My Farms', href: '/farms', icon: FarmIcon, show: !isAdmin && !isSuperuser },
  ].filter(item => item.show);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 z-50">
        <div className="flex-1 flex flex-col min-h-0 bg-white shadow-xl border-r border-slate-200/60">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-slate-200/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Farm Management</h1>
                <p className="text-xs text-slate-500 font-medium">Professional Dashboard</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <nav className="flex-1 px-4 space-y-2">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <IconComponent className={`mr-4 h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                    }`} />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75"></div>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>
          
          {/* User Profile Section */}
          <div className="flex-shrink-0 border-t border-slate-200/60">
            <div className="flex items-center p-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
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
                className="ml-2 inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 flex items-center h-16 px-4 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
          <button
            type="button"
            className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ml-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-800">Farm Management</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 flex flex-col flex-1">
        <main className="flex-1 min-h-0">
          <div className="h-full py-6 lg:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
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
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full text-white hover:bg-white/20 transition-colors duration-200"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Mobile Logo Section */}
            <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-slate-200/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Farm Management</h1>
                  <p className="text-xs text-slate-500 font-medium">Professional Dashboard</p>
                </div>
              </div>
            </div>
            
            {/* Mobile Navigation */}
            <div className="flex-1 h-0 pt-6 pb-4 overflow-y-auto">
              <nav className="px-4 space-y-2">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <IconComponent className={`mr-4 h-5 w-5 transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                      }`} />
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75"></div>
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>
            
            {/* Mobile User Profile Section */}
            <div className="flex-shrink-0 border-t border-slate-200/60">
              <div className="flex items-center p-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
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
                  className="ml-2 inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  title="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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