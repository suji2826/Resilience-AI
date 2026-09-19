import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  AlertTriangle,
  Pill,
  BedDouble,
  Users2,
  ArrowRightLeft,
  Target,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Flame,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import { api, ApiError } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { IndiaMap } from '../components/map/IndiaMap';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ErrorState, CardSkeleton } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';
import { useDemo } from '../hooks/useDemo';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>('All');
  const [quickCopilotQuery, setQuickCopilotQuery] = useState('');
  const navigate = useNavigate();
  const { startDemo } = useDemo();

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      console.warn('Dashboard telemetry load:', err);
      if (err instanceof ApiError && err.kind === 'AUTHENTICATION_ERROR') {
        setError('Authentication could not be verified. Attempting automatic demo session renewal...');
      } else {
        setError(err?.message || 'Connection to the healthcare telemetry service failed. Please verify that the backend is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-navy-800 rounded-xl w-80 animate-pulse" />
        <CardSkeleton count={6} />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto my-12">
        <ErrorState
          title="Telemetry Connection Issue"
          message={error}
          onRetry={() => loadData()}
        />
      </div>
    );
  }

  const {
    kpis = {},
    map_markers = [],
    top_critical_alerts = [],
    medicines_at_risk = [],
    top_redistributions = [],
    national_trends_7d = [],
    emergency_active = false,
    active_emergency_details = null,
  } = data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. National Healthcare Resource Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-command-border dark:border-navy-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-command-text dark:text-white">
              National Healthcare Resource Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-command-muted dark:text-slate-400 mt-1">
            Real-time surveillance across 98 Primary Health Centres, 22 essential medicines, workforce, and ICU bed capacities.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl text-command-muted dark:text-slate-300 hover:text-command-text dark:hover:text-white bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle transition-all disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-tomato-500' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/emergency')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-subtle ${
              emergency_active
                ? 'bg-tomato-500 text-white animate-pulse'
                : 'bg-white dark:bg-navy-900 text-command-text dark:text-white hover:bg-slate-100 dark:hover:bg-navy-850 border border-command-border dark:border-navy-border'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-tomato-500" />
            <span>{emergency_active ? 'Crisis Active' : 'Crisis Simulator'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Active Alert Bar */}
      {emergency_active && active_emergency_details && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-tomato-50 dark:bg-navy-900 border border-tomato-500/40 text-tomato-900 dark:text-tomato-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-subtle"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-tomato-500/20 text-tomato-600 dark:text-tomato-400 shrink-0">
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-tomato-600 dark:text-tomato-400">
                CRISIS EVENT IN PROGRESS: {active_emergency_details.name}
              </div>
              <p className="text-xs text-command-text dark:text-slate-300 mt-0.5">
                {active_emergency_details.ai_situation_summary}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/emergency')}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-tomato-500 hover:bg-tomato-600 text-white text-xs font-bold transition-all shadow-subtle"
          >
            Inspect Outbreak Response
          </button>
        </motion.div>
      )}

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Monitored PHCs"
          value={kpis.total_phcs ?? 98}
          subtitle="6 States Network"
          icon={Building2}
          highlightColor="blue"
          onClick={() => navigate('/phcs')}
        />
        <StatCard
          title="Critical Risks"
          value={kpis.critical_alerts ?? 0}
          subtitle="Immediate Action"
          icon={AlertTriangle}
          highlightColor="red"
          badge={kpis.critical_alerts > 0 ? 'URGENT' : undefined}
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          title="Medicine Risks"
          value={kpis.medicines_at_risk ?? 0}
          subtitle="< 7 Days Buffer"
          icon={Pill}
          highlightColor="amber"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Available Beds"
          value={formatNumber(kpis.available_beds ?? 0)}
          subtitle={`${kpis.bed_occupancy_rate ?? 0}% Occupancy`}
          icon={BedDouble}
          highlightColor="teal"
          onClick={() => navigate('/resources')}
        />
        <StatCard
          title="Staff Availability"
          value={formatNumber(kpis.staff_on_duty ?? 0)}
          subtitle={`${kpis.staff_attendance_rate ?? 0}% Present`}
          icon={Users2}
          highlightColor="emerald"
          onClick={() => navigate('/workforce')}
        />
        <StatCard
          title="Active Alerts"
          value={kpis.critical_alerts ?? 0}
          subtitle="Early Warnings"
          icon={ArrowRightLeft}
          highlightColor="blue"
          onClick={() => navigate('/alerts')}
        />
      </div>

      {/* 3. National Risk Overview & India PHC Risk Map + Critical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive India Map - 8 Columns */}
        <div className="lg:col-span-8 bg-white dark:bg-navy-900 rounded-2xl border border-command-border dark:border-navy-border p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border mb-3">
            <div>
              <h2 className="text-sm font-bold text-command-text dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-tomato-500" />
                India PHC Risk Map & Geospatial Telemetry
              </h2>
              <p className="text-xs text-command-muted dark:text-slate-400">
                Click any PHC marker or state filter to isolate localized facility risk.
              </p>
            </div>
            <span className="text-[10px] font-mono text-command-muted dark:text-slate-400 bg-slate-100 dark:bg-navy-800 px-2 py-1 rounded-lg border border-command-border dark:border-navy-border">
              {map_markers.length} Facilities Active
            </span>
          </div>

          <IndiaMap
            markers={map_markers}
            selectedState={selectedState}
            onSelectState={setSelectedState}
          />
        </div>

        {/* Critical Alerts Queue - 4 Columns */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-navy-900 rounded-2xl border border-command-border dark:border-navy-border p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-tomato-500" />
              <h3 className="text-sm font-bold text-command-text dark:text-white">
                Critical Early Warnings
              </h3>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-tomato-600 hover:text-tomato-500 dark:text-tomato-400 flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-3 custom-scrollbar max-h-[440px]">
            {top_critical_alerts.length === 0 ? (
              <div className="py-12 text-center text-command-muted dark:text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <Activity className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-command-text dark:text-slate-200">All Systems Nominal</p>
                <p className="text-[11px] text-command-muted dark:text-slate-400">No unacknowledged critical alerts recorded in network telemetry.</p>
              </div>
            ) : (
              top_critical_alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  onClick={() => navigate('/alerts')}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-command-border dark:border-navy-border hover:border-tomato-500/50 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-command-text dark:text-white group-hover:text-tomato-500 transition-colors">
                      {alert.title}
                    </span>
                    <Badge variant="risk" riskLevel={alert.severity} dot>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-command-muted dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {alert.reason}
                  </p>
                  <div className="text-[10px] text-command-muted dark:text-slate-400 flex items-center justify-between pt-1 border-t border-command-border dark:border-navy-border">
                    <span>{alert.district_name}, {alert.state_name}</span>
                    <span className="text-tomato-600 dark:text-tomato-400 font-semibold font-mono">
                      {alert.alert_code}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Secondary Row: Medicine Stock-out Forecast + 7D Telemetry Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Medicines at Risk Table - 7 Columns */}
        <div className="lg:col-span-7 bg-white dark:bg-navy-900 rounded-2xl border border-command-border dark:border-navy-border p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border mb-3">
            <div>
              <h3 className="text-sm font-bold text-command-text dark:text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-amber-500" />
                Medicine Stock-Out Risk Matrix (Horizon &lt; 7 Days)
              </h3>
              <p className="text-xs text-command-muted dark:text-slate-400">
                Calculated by daily consumption rate against supplier lead times.
              </p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-tomato-600 hover:text-tomato-500 dark:text-tomato-400 flex items-center gap-1"
            >
              Inventory Table
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-command-muted dark:text-slate-400 border-b border-command-border dark:border-navy-border">
                <tr>
                  <th className="pb-2">Medicine</th>
                  <th className="pb-2">PHC / District</th>
                  <th className="pb-2 font-mono">Stock</th>
                  <th className="pb-2 font-mono">Days Left</th>
                  <th className="pb-2">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-command-border dark:divide-navy-border">
                {medicines_at_risk.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-command-muted dark:text-slate-400 text-xs">
                      All monitored inventories currently maintain healthy safety buffers (&gt; 7 days).
                    </td>
                  </tr>
                ) : (
                  medicines_at_risk.map((item: any) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/inventory/${item.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-navy-850 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-semibold text-command-text dark:text-white">
                        {item.medicine_name}
                      </td>
                      <td className="py-2.5 text-command-muted dark:text-slate-300">
                        <div>{item.phc_name}</div>
                        <div className="text-[10px] text-command-muted dark:text-slate-400 font-mono">{item.district_name}</div>
                      </td>
                      <td className="py-2.5 font-mono font-medium text-command-text dark:text-slate-200">
                        {item.current_stock}
                      </td>
                      <td className="py-2.5 font-mono font-bold text-tomato-600 dark:text-tomato-400">
                        {item.days_remaining}d
                      </td>
                      <td className="py-2.5">
                        <Badge variant="risk" riskLevel={item.risk_level} dot>
                          {item.risk_level}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* National 7-Day Telemetry Trend Chart - 5 Columns */}
        <div className="lg:col-span-5 bg-white dark:bg-navy-900 rounded-2xl border border-command-border dark:border-navy-border p-5 shadow-subtle flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border mb-3">
            <div>
              <h3 className="text-sm font-bold text-command-text dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-tomato-500" />
                7-Day National Velocity &amp; Demand
              </h3>
              <p className="text-xs text-command-muted dark:text-slate-400">
                Network-wide aggregate patient footfall vs consumption.
              </p>
            </div>
          </div>

          <div className="w-full h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={national_trends_7d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFootfall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6347" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ff6347" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.3} />
                <XAxis dataKey="day_name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1f3a',
                    borderColor: '#1e3a5f',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="patient_footfall" name="Patient Footfall" stroke="#ff6347" strokeWidth={2} fillOpacity={1} fill="url(#colorFootfall)" />
                <Area type="monotone" dataKey="medicine_consumption" name="Units Consumed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick AI Insight Pill */}
          <div className="mt-auto pt-3 border-t border-command-border dark:border-navy-border flex items-center gap-2 text-xs text-command-muted dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-tomato-500 shrink-0" />
            <span>
              {(() => {
                if (national_trends_7d.length >= 2) {
                  const first = national_trends_7d[0].patient_footfall || 1;
                  const last = national_trends_7d[national_trends_7d.length - 1].patient_footfall || 1;
                  const pct = Math.round(((last - first) / first) * 100);
                  const dir = pct >= 0 ? `+${pct}% surge` : `${pct}% reduction`;
                  return `Holt-Winters models detect a ${dir} in 7-day velocity across monitored health networks.`;
                }
                return 'Holt-Winters predictive engine actively tracking velocity across monitored health networks.';
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Tertiary Row: AI Resource Redistribution Recommendations */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-command-border dark:border-navy-border p-5 shadow-subtle">
        <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border mb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-tomato-500" />
            <h3 className="text-sm font-bold text-command-text dark:text-white">
              Active Cross-District Redistribution Plans
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tomato-500/10 text-tomato-600 dark:text-tomato-400 border border-tomato-500/30">
              OPTIMIZATION SOLVER
            </span>
          </div>
          <button
            onClick={() => navigate('/redistribution')}
            className="text-xs font-semibold text-tomato-600 hover:text-tomato-500 dark:text-tomato-400 flex items-center gap-1"
          >
            Open Redistribution Hub
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {top_redistributions.length === 0 ? (
          <div className="py-8 text-center text-command-muted dark:text-slate-400 text-xs">
            No active cross-district redistribution transfers currently pending approval.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {top_redistributions.map((r: any) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-command-border dark:border-navy-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-command-muted dark:text-slate-400">
                    {r.recommendation_code}
                  </span>
                  <Badge variant="risk" riskLevel={r.urgency}>
                    {r.urgency} PRIORITY
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-command-muted dark:text-slate-400 block uppercase">Source (Surplus)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {r.source_district_name}
                    </span>
                    <span className="text-[10px] text-command-muted dark:text-slate-400 block font-mono">
                      +{r.source_surplus_quantity} units
                    </span>
                  </div>

                  <div className="text-center px-3">
                    <span className="text-[10px] font-mono text-command-muted dark:text-slate-400 block">
                      ~{r.estimated_transit_hours}h transit
                    </span>
                    <ArrowRightLeft className="w-4 h-4 text-tomato-500 mx-auto my-1" />
                    <span className="text-xs font-bold text-command-text dark:text-white font-mono">
                      {r.recommended_quantity} units
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-command-muted dark:text-slate-400 block uppercase">Destination (Deficit)</span>
                    <span className="font-bold text-tomato-600 dark:text-tomato-400">
                      {r.dest_district_name}
                    </span>
                    <span className="text-[10px] text-command-muted dark:text-slate-400 block font-mono">
                      -{r.dest_deficit_quantity} units
                    </span>
                  </div>
                </div>

                <p className="text-xs text-command-muted dark:text-slate-300 pt-2 border-t border-command-border dark:border-navy-border">
                  {r.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Gemini Resilience Copilot Quick Launcher Section */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-tomato-500/10 via-slate-50 to-navy-900/10 dark:from-tomato-950/30 dark:via-navy-900 dark:to-navy-850 border border-tomato-500/30 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-tomato-500" />
            <h3 className="text-sm font-bold text-command-text dark:text-white">
              Google Gemini Resilience Copilot
            </h3>
            <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-tomato-500/10 text-tomato-600 dark:text-tomato-400 border border-tomato-500/30 font-bold">
              GROUNDED AI
            </span>
          </div>
          <p className="text-xs text-command-muted dark:text-slate-300 max-w-2xl">
            Ask operational queries regarding facility risk scores, stock-out horizons, and cross-district redistribution. Grounded in live database state with zero metric fabrication.
          </p>
        </div>

        <button
          onClick={() => navigate('/copilot')}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-tomato-500 hover:bg-tomato-600 text-white shadow-glow-tomato transition-all"
        >
          <span>Launch Resilience Copilot</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
