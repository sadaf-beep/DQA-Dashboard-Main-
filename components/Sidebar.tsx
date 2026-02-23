
import React from 'react';
import { User, UserRole } from '../types';
import { APP_NAME } from '../constants';

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  connectionStatus?: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  storageUsageMB?: number;
  onRefresh?: () => void;
  unreadCount?: number; // Added prop
}

const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  activeTab, 
  onTabChange, 
  onLogout, 
  connectionStatus = 'CONNECTED',
  storageUsageMB,
  onRefresh,
  unreadCount = 0
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'tasks', label: 'Task Board', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'inventory', label: 'Inventory Data', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  ];

  // Only add Operational Analytics for Managers
  if (user.role === UserRole.MANAGER) {
      menuItems.push({ 
        id: 'analytics', 
        label: 'Operational Analytics', 
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2' 
      });
  }

  menuItems.push({ id: 'invoices', label: 'Studio Invoice', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' });

  // Only add Management tab for Managers
  if (user.role === UserRole.MANAGER) {
      menuItems.push({ 
          id: 'agent-management', 
          label: 'DQA Agent', 
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' 
      });
  }

  menuItems.push({ id: 'onboarding', label: 'Onboarding Alert', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' });

  // All users can edit profile
  menuItems.push({ 
    id: 'profile', 
    label: 'My Profile', 
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' 
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full fixed left-0 top-0 z-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            {APP_NAME}
            </div>
        </div>

        {/* Notification Bell Area */}
        <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700 mb-2">
            <div className="text-xs font-semibold text-slate-400 pl-1">Notifications</div>
            <div className="relative">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        {/* Connection Status Indicator */}
        <div className="flex items-center justify-between gap-2 mb-4 px-2 bg-slate-800/50 py-2 rounded-lg">
             <div className="flex items-center gap-2">
                 <div className={`w-2.5 h-2.5 rounded-full ${
                     connectionStatus === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                     connectionStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                 }`}></div>
                 <span className={`text-[10px] font-bold uppercase tracking-wider ${
                     connectionStatus === 'CONNECTED' ? 'text-emerald-400' : 
                     connectionStatus === 'CONNECTING' ? 'text-amber-400' : 'text-red-400'
                 }`}>
                     {connectionStatus === 'CONNECTED' ? 'Live Sync' : connectionStatus}
                 </span>
             </div>
             {onRefresh && (
               <button onClick={onRefresh} className="text-slate-400 hover:text-white transition-colors" title="Force Sync">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               </button>
             )}
        </div>

        {storageUsageMB !== undefined && (
          <div className="px-2 mb-3">
             <div className="flex justify-between text-[10px] text-slate-500 mb-1">
               <span>Mem Usage</span>
               <span>{storageUsageMB.toFixed(2)} MB</span>
             </div>
             <div className="w-full bg-slate-800 rounded-full h-1">
               <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${Math.min((storageUsageMB / 50) * 100, 100)}%` }}></div>
             </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 px-2 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors" onClick={() => onTabChange('profile')}>
          {user.avatar ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-700 object-cover" /> : 
             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs">{user.name.charAt(0)}</div>}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">
              {user.role.toLowerCase()}
            </p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
