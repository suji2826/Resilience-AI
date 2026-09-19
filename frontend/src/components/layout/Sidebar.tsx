import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Pill,
  Users2,
  BedDouble,
  BellRing,
  ArrowRightLeft,
  Flame,
  Globe2,
  Sparkles,
  BarChart3,
  ShieldCheck,
  PlayCircle,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../../hooks/useDemo';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'PHC Network', path: '/phcs', icon: Building2 },
  { name: 'Medicine Stock', path: '/inventory', icon: Pill },
  { name: 'Workforce', path: '/workforce', icon: Users2 },
  { name: 'Beds & Capacity', path: '/resources', icon: BedDouble },
  { name: 'Early Warning', path: '/alerts', icon: BellRing },
  { name: 'Redistribution', path: '/redistribution', icon: ArrowRightLeft },
  { name: 'Emergency Mode', path: '/emergency', icon: Flame },
  { name: 'Federated AI', path: '/federated-ai', icon: Globe2 },
  { name: 'Resilience Copilot', path: '/copilot', icon: Sparkles },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: SettingsIcon },
];

export const Sidebar: React.FC<{ isOpen: boolean; onClose?: () => void }> = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const { startDemo, isDemoActive } = useDemo();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 bg-navy-950/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-navy-950 border-r border-command-border dark:border-navy-border flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-command-border dark:border-navy-border">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-tomato-500 flex items-center justify-center shadow-subtle text-white">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-command-text dark:text-white text-base">
                RESILIENCE<span className="text-tomato-500">.AI</span>
              </span>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-command-muted dark:text-slate-400">
                Command Center
              </span>
            </div>
          </NavLink>
        </div>

        {/* 1-Click Judge Demo Launcher */}
        <div className="p-3">
          <button
            onClick={startDemo}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-subtle active:scale-95 ${
              isDemoActive
                ? 'bg-amber-500 text-navy-950 animate-pulse'
                : 'bg-tomato-500 hover:bg-tomato-600 text-white shadow-glow-tomato'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            {isDemoActive ? 'Demo Tour Active' : 'Start Judge Demo (3 Min)'}
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          <div className="text-[10px] font-bold text-command-muted dark:text-slate-400 uppercase tracking-widest px-3 py-1">
            Operational Modules
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-tomato-500 text-white shadow-subtle font-bold dark:bg-tomato-600'
                    : 'text-command-muted dark:text-slate-300 hover:text-command-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-command-muted dark:text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.name === 'Resilience Copilot' && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-tomato-500/10 text-tomato-500 dark:text-tomato-400'
                  }`}>
                    AI
                  </span>
                )}
                {item.name === 'Federated AI' && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    BRICS
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Role Card & Footer */}
        <div className="p-3 border-t border-command-border dark:border-navy-border bg-slate-50 dark:bg-navy-900/60 space-y-2">
          <div className="p-2.5 rounded-xl bg-white dark:bg-navy-850 border border-command-border dark:border-navy-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-command-text dark:text-white truncate max-w-[140px]">
                {user?.full_name || 'Dr. Rajeshwar Rao'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-command-muted dark:text-slate-400">
              <span className="font-mono text-tomato-600 dark:text-tomato-400 font-semibold">
                {role.replace('_', ' ')}
              </span>
              <span>Level 1</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (onClose) onClose();
              logout();
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-command-muted dark:text-slate-400 hover:text-tomato-600 dark:hover:text-tomato-400 hover:bg-slate-100 dark:hover:bg-navy-850 border border-transparent transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
