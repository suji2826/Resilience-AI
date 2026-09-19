import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Sparkles, Shield, Flame, UserCheck, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Database } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenCopilot: () => void;
  isEmergencyActive?: boolean;
}

type SystemHealthState = 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'CHECKING';

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenCopilot,
  isEmergencyActive = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, role, switchDemoRole } = useAuth();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<SystemHealthState>('CHECKING');
  const [healthDetails, setHealthDetails] = useState<string>('Verifying connectivity...');
  const navigate = useNavigate();
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Periodic real health verification
  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const res = await api.getHealth();
        if (cancelled) return;
        if (res.status === 'healthy') {
          setHealthStatus('HEALTHY');
          setHealthDetails(`Connected to ${res.service} (v${res.version}) · Database ${res.database}`);
        } else {
          setHealthStatus('DEGRADED');
          setHealthDetails(`Service degraded: Database is ${res.database || 'unreachable'}`);
        }
      } catch (err: any) {
        if (cancelled) return;
        setHealthStatus('OFFLINE');
        setHealthDetails('Backend telemetry service is unreachable. Verify port 8000.');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    if (isRoleMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isRoleMenuOpen]);

  const rolesList: { id: UserRole; name: string; desc: string }[] = [
    { id: 'NATIONAL_ADMIN', name: 'National Administrator', desc: 'Full inter-state oversight' },
    { id: 'STATE_ADMIN', name: 'State Administrator (TN)', desc: 'Tamil Nadu health director' },
    { id: 'DISTRICT_ADMIN', name: 'District Administrator', desc: 'Namakkal DHO' },
    { id: 'PHC_ADMIN', name: 'PHC Administrator', desc: 'Kolli Hills Tribal PHC' },
    { id: 'SUPPLY_CHAIN_MANAGER', name: 'Supply Chain Manager', desc: 'Logistics officer' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-navy-900 border-b border-command-border dark:border-navy-border px-4 lg:px-6 flex items-center justify-between transition-colors shadow-subtle">
      {/* Left: Mobile Hamburger & Live Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-xl text-command-muted dark:text-command-darkMuted hover:text-command-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-850 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <span className="text-xs font-bold text-command-text dark:text-white uppercase tracking-wider">
            National Command Center
          </span>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border transition-all cursor-help"
            title={healthDetails}
          >
            {healthStatus === 'HEALTHY' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">SYSTEM HEALTHY</span>
              </>
            )}
            {healthStatus === 'DEGRADED' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700 dark:text-amber-400 font-bold">SYSTEM DEGRADED</span>
              </>
            )}
            {healthStatus === 'OFFLINE' && (
              <>
                <span className="w-2 h-2 rounded-full bg-tomato-500" />
                <span className="text-tomato-600 dark:text-tomato-400 font-bold">BACKEND OFFLINE</span>
              </>
            )}
            {healthStatus === 'CHECKING' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                <span className="text-slate-600 dark:text-slate-300">CHECKING STATUS</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-300 border border-command-border dark:border-navy-border">
            SYNTHETIC DEMO DATA
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Emergency Simulator Status Pill */}
        {isEmergencyActive && (
          <button
            onClick={() => navigate('/emergency')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tomato-50 dark:bg-tomato-950/40 border border-tomato-500/40 text-tomato-600 dark:text-tomato-400 text-xs font-bold animate-pulse"
          >
            <Flame className="w-3.5 h-3.5 text-tomato-500" />
            <span>CRISIS SIM ACTIVE</span>
          </button>
        )}

        {/* Resilience Copilot Quick Launcher Button */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-tomato-50 dark:bg-navy-800 text-tomato-600 dark:text-tomato-400 border border-tomato-200 dark:border-navy-border hover:bg-tomato-100 dark:hover:bg-navy-850 transition-all shadow-subtle"
        >
          <Sparkles className="w-3.5 h-3.5 text-tomato-500" />
          <span className="hidden md:inline">Resilience Copilot</span>
          <span className="md:hidden">Copilot</span>
        </button>

        {/* Role Switcher Dropdown */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            aria-haspopup="listbox"
            aria-expanded={isRoleMenuOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-navy-800 text-command-text dark:text-white border border-command-border dark:border-navy-border hover:bg-slate-200 dark:hover:bg-navy-850 transition-all focus-visible:ring-2 focus-visible:ring-tomato-500 focus-visible:ring-offset-1"
          >
            <UserCheck className="w-3.5 h-3.5 text-tomato-500" />
            <span className="hidden sm:inline font-mono text-[11px]">
              {role.replace('_', ' ')}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isRoleMenuOpen && (
            <div role="listbox" className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-elevated p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Role Context (RBAC Demo)
              </div>
              <div className="space-y-1">
                {rolesList.map((r) => (
                  <button
                    key={r.id}
                    role="option"
                    aria-selected={role === r.id}
                    onClick={() => {
                      switchDemoRole(r.id);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                      role === r.id
                        ? 'bg-tomato-500/10 text-tomato-600 dark:text-tomato-400 font-bold border border-tomato-500/20'
                        : 'text-command-text dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800'
                    }`}
                  >
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Shortcut */}
        <button
          onClick={() => navigate('/settings')}
          aria-label="System Settings"
          title="Settings & System Status"
          className="p-2 rounded-xl text-command-muted dark:text-command-darkMuted hover:text-command-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 border border-command-border dark:border-navy-border transition-all focus-visible:ring-2 focus-visible:ring-tomato-500 focus-visible:ring-offset-1"
        >
          <Shield className="w-4 h-4 text-tomato-500" />
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2 rounded-xl text-command-muted dark:text-command-darkMuted hover:text-command-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 border border-command-border dark:border-navy-border transition-all focus-visible:ring-2 focus-visible:ring-tomato-500 focus-visible:ring-offset-1"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};
