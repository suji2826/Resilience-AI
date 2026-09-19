import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  Server,
  Database,
  Moon,
  Sun,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { api } from '../lib/api';

export const Settings: React.FC = () => {
  const { user, role, switchDemoRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [copilotStatus, setCopilotStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getCopilotStatus()
      .then((res) => setCopilotStatus(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              System Settings &amp; Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Platform configurations, connected telemetry status, authentication tokens, and theme controls.
            </p>
          </div>
        </div>
      </div>

      {/* User Session Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Active Identity &amp; RBAC Scope</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AUTHENTICATED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Official Name</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{user?.full_name || 'Dr. Rajeshwar Rao'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Email ID</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{user?.email || 'national.admin@resilience.gov.in'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Role Permission</span>
            <span className="font-mono font-bold text-brand-500">{role.replace('_', ' ')}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Assigned Facility / Jurisdiction</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {role === 'NATIONAL_ADMIN' ? 'All-India National Oversight' :
               role === 'STATE_ADMIN' ? 'Tamil Nadu State' :
               role === 'DISTRICT_ADMIN' ? 'Namakkal District' :
               role === 'PHC_ADMIN' ? 'Kolli Hills Tribal PHC' : 'Regional Supply Depots'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* AI Telemetry & Copilot Status */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Intelligence Engine &amp; Gemini Integration</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {copilotStatus?.mode || 'LIVE_GEMINI'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Google Gemini API Key</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {copilotStatus?.is_api_key_configured ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured &amp; Active
                </span>
              ) : (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Demo Heuristic Fallback (Ground-truth DB telemetry)
                </span>
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Underlying Model</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {copilotStatus?.model || 'gemini-1.5-pro-latest'}
            </span>
          </div>
        </div>
      </div>

      {/* Interface Preferences */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Display &amp; Appearance</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Dark / Light Mode</div>
            <div className="text-slate-400 text-[11px]">Currently active: {theme === 'dark' ? 'Dark Theme (Command Center)' : 'Light Theme'}</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-100 dark:hover:bg-slate-750 transition-all"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch to Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Switch to Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
