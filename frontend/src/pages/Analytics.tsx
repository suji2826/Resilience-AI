import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Activity,
  BedDouble,
  Pill,
  RefreshCw,
  Users,
  Truck,
  AlertTriangle,
  ChevronDown,
  Info,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  ReferenceLine,
} from 'recharts';

import { api } from '../lib/api';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskDimension {
  score: number;
  level: string;
  [key: string]: any;
}

interface RiskAnalytics {
  stock_out_risk: RiskDimension;
  demand_anomaly: RiskDimension;
  bed_capacity_risk: RiskDimension;
  workforce_risk: RiskDimension;
  supply_chain_risk: RiskDimension;
  explainability: string[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs max-w-[220px]">
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300">{p.name}</span>
          </span>
          <span className="font-mono font-bold text-slate-100">
            {typeof p.value === 'number' ? formatNumber(Math.round(p.value)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ForecastCustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const main = payload.find((p: any) => p.dataKey === 'predicted_demand' || p.dataKey === 'actual_demand');
  const lower = payload.find((p: any) => p.dataKey === 'lower_bound');
  const upper = payload.find((p: any) => p.dataKey === 'upper_bound');
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {main && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">{main.name}</span>
          <span className="font-mono font-bold text-slate-100">{Math.round(main.value)} units</span>
        </div>
      )}
      {lower && upper && (
        <p className="text-slate-500 mt-1">
          CI: {Math.round(lower.value)} – {Math.round(upper.value)}
        </p>
      )}
    </div>
  );
};

function riskLevelColor(level: string) {
  switch (level) {
    case 'CRITICAL': return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', bar: '#ef4444' };
    case 'HIGH': return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', bar: '#f97316' };
    case 'MEDIUM': return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: '#f59e0b' };
    default: return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: '#10b981' };
  }
}

interface RiskGaugeProps {
  label: string;
  icon: React.ReactNode;
  dimension: RiskDimension;
  subtitle?: string;
}

const RiskGaugeCard: React.FC<RiskGaugeProps> = ({ label, icon, dimension, subtitle }) => {
  const colors = riskLevelColor(dimension.level);
  const pct = Math.min(100, Math.max(0, dimension.score));
  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-[#111827] border ${colors.border} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={colors.text}>{icon}</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
          {dimension.level}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{pct.toFixed(1)}</span>
        <span className="text-xs text-slate-400 mb-1">/ 100 risk score</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: colors.bar }}
        />
      </div>
      {subtitle && <p className="text-[10px] text-slate-400 mt-2">{subtitle}</p>}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Analytics: React.FC = () => {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [state, setState] = useState<string>('All');
  const [district, setDistrict] = useState<string>('All');
  const [medicine, setMedicine] = useState<string>('All');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastHorizon, setForecastHorizon] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRiskTab, setActiveRiskTab] = useState<string>('stock_out_risk');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAnalytics(
        rangeDays,
        state !== 'All' ? state : undefined,
        district !== 'All' ? district : undefined,
        medicine !== 'All' ? medicine : undefined
      );
      setAnalyticsData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [rangeDays, state, district, medicine]);

  const loadForecast = useCallback(async () => {
    try {
      setForecastLoading(true);
      const res = await api.getForecast(undefined, undefined, forecastHorizon);
      setForecastData(res);
    } catch {
      setForecastData(null);
    } finally {
      setForecastLoading(false);
    }
  }, [forecastHorizon]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { loadForecast(); }, [loadForecast]);

  // ─── Merged chart data for forecast ───
  const chartData = React.useMemo(() => {
    if (!forecastData) return [];
    const historical = (forecastData.historical_points_30d || []).map((h: any) => ({
      date: h.date,
      actual_demand: h.actual_demand,
      is_anomaly: h.is_anomaly,
      type: 'historical',
    }));
    const forecast = (forecastData.forecast_points || []).map((f: any) => ({
      date: f.date,
      predicted_demand: f.predicted_demand,
      lower_bound: f.lower_bound,
      upper_bound: f.upper_bound,
      type: 'forecast',
    }));
    return [...historical, ...forecast];
  }, [forecastData]);

  const riskAnalytics: RiskAnalytics | null = analyticsData?.risk_analytics ?? null;

  const riskTabs = [
    { key: 'stock_out_risk', label: 'Stock-Out', icon: <Pill className="w-3.5 h-3.5" /> },
    { key: 'demand_anomaly', label: 'Demand Anomaly', icon: <Activity className="w-3.5 h-3.5" /> },
    { key: 'bed_capacity_risk', label: 'Bed Capacity', icon: <BedDouble className="w-3.5 h-3.5" /> },
    { key: 'workforce_risk', label: 'Workforce', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'supply_chain_risk', label: 'Supply Chain', icon: <Truck className="w-3.5 h-3.5" /> },
  ];

  const activeRisk = riskAnalytics?.[activeRiskTab as keyof RiskAnalytics] as RiskDimension | undefined;

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{error}</p>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const { time_series = [], category_distribution = [], district_matrix = [] } = analyticsData || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Analytics &amp; Forecasting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multi-horizon demand forecasting, risk analytics, and epidemiological trend analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  rangeDays === days
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <ExportButton filename={`resilience-analytics-${rangeDays}d`} data={time_series} />

          <button
            onClick={loadAnalytics}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Risk Analytics — 5 Gauge Cards */}
      {riskAnalytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <RiskGaugeCard
            label="Stock-Out Risk"
            icon={<Pill className="w-4 h-4" />}
            dimension={riskAnalytics.stock_out_risk}
            subtitle={`${riskAnalytics.stock_out_risk.critical_medicines_count} critical, ${riskAnalytics.stock_out_risk.high_risk_medicines_count} high`}
          />
          <RiskGaugeCard
            label="Demand Anomaly"
            icon={<Activity className="w-4 h-4" />}
            dimension={riskAnalytics.demand_anomaly}
            subtitle={`${riskAnalytics.demand_anomaly.anomaly_events_count} anomaly events`}
          />
          <RiskGaugeCard
            label="Bed Capacity"
            icon={<BedDouble className="w-4 h-4" />}
            dimension={riskAnalytics.bed_capacity_risk}
            subtitle={`${riskAnalytics.bed_capacity_risk.occupancy_percentage}% occupied`}
          />
          <RiskGaugeCard
            label="Workforce"
            icon={<Users className="w-4 h-4" />}
            dimension={riskAnalytics.workforce_risk}
            subtitle={`${riskAnalytics.workforce_risk.attendance_percentage}% attendance`}
          />
          <RiskGaugeCard
            label="Supply Chain"
            icon={<Truck className="w-4 h-4" />}
            dimension={riskAnalytics.supply_chain_risk}
            subtitle={`${riskAnalytics.supply_chain_risk.lead_time_deficit_count} lead-time deficits`}
          />
        </div>
      )}

      {/* Risk Explainability Panel */}
      {riskAnalytics?.explainability && riskAnalytics.explainability.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
              AI Risk Explainability — Why are these risks elevated?
            </h3>
          </div>
          <ul className="space-y-1.5">
            {riskAnalytics.explainability.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900/60 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                  {i + 1}
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Demand Forecast Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Demand Forecast — Multi-Horizon Prediction
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical consumption + {forecastHorizon}-day ahead EWMA forecast with 90% confidence interval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Horizon selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              {[7, 14, 30].map((h) => (
                <button
                  key={h}
                  onClick={() => setForecastHorizon(h)}
                  disabled={forecastLoading}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                    forecastHorizon === h
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {h}D
                </button>
              ))}
            </div>
            {forecastData && (
              <ExportButton
                filename={`forecast-${forecastHorizon}d`}
                data={forecastData.forecast_points || []}
                label="Export"
              />
            )}
          </div>
        </div>

        {/* Forecast KPI Strip */}
        {forecastData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '7D Forecast', value: `${forecastData.forecast_7d_daily?.toFixed(1)} units/day`, sub: `Total: ${forecastData.forecast_7d_total?.toFixed(0)}` },
              { label: '14D Forecast', value: `${forecastData.forecast_14d_daily?.toFixed(1)} units/day`, sub: `Total: ${forecastData.forecast_14d_total?.toFixed(0)}` },
              { label: '30D Forecast', value: `${forecastData.forecast_30d_daily?.toFixed(1)} units/day`, sub: `Total: ${forecastData.forecast_30d_total?.toFixed(0)}` },
              { label: 'Confidence', value: `${((forecastData.confidence_score || 0) * 100).toFixed(0)}%`, sub: forecastData.confidence_level },
            ].map((kpi, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">{kpi.label}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{kpi.value}</p>
                <p className="text-[10px] text-slate-400">{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trend badge */}
        {forecastData && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              {forecastData.trend === 'INCREASING' ? (
                <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              ) : forecastData.trend === 'DECREASING' ? (
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {forecastData.trend} trend
              </span>
              {forecastData.demand_change_percent !== undefined && (
                <span className={`font-mono font-bold ${
                  forecastData.demand_change_percent > 0 ? 'text-orange-400' : 'text-emerald-400'
                }`}>
                  ({forecastData.demand_change_percent > 0 ? '+' : ''}{forecastData.demand_change_percent?.toFixed(1)}%)
                </span>
              )}
            </div>
            {forecastData.emergency_active && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold">
                ⚠ EMERGENCY ACTIVE: {forecastData.emergency_details}
              </span>
            )}
            {forecastData.medicine_name && (
              <span className="text-xs text-slate-400">
                Medicine: <span className="font-semibold text-slate-600 dark:text-slate-300">{forecastData.medicine_name}</span>
                {' '}@ <span className="font-semibold text-slate-600 dark:text-slate-300">{forecastData.phc_name}</span>
              </span>
            )}
          </div>
        )}

        {/* Forecast Chart */}
        {forecastLoading ? (
          <div className="h-72 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip content={<ForecastCustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {/* Confidence band */}
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  name="Upper CI"
                  stroke="none"
                  fill="#8b5cf6"
                  fillOpacity={0.12}
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="lower_bound"
                  name="Lower CI"
                  stroke="none"
                  fill="#8b5cf6"
                  fillOpacity={0.0}
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="actual_demand"
                  name="Actual Consumption"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#actualGrad)"
                  connectNulls={false}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted_demand"
                  name="Forecast"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls={false}
                />
                <ReferenceLine
                  x={forecastData?.historical_points_30d?.slice(-1)?.[0]?.date}
                  stroke="#64748b"
                  strokeDasharray="4 2"
                  label={{ value: 'Forecast Start', fontSize: 10, fill: '#64748b', position: 'insideTopRight' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-500">
            No forecast data available for the selected combination.
          </div>
        )}

        {/* Explainability Summary */}
        {forecastData?.explainability_summary && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-400">{forecastData.explainability_summary}</p>
          </div>
        )}

        {/* Recommended Actions */}
        {forecastData?.recommended_actions && forecastData.recommended_actions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Recommended Actions</p>
            <ul className="space-y-1">
              {forecastData.recommended_actions.map((action: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contributing Factors */}
        {forecastData?.contributing_factors && (
          <details className="group">
            <summary className="text-xs font-semibold text-slate-500 cursor-pointer flex items-center gap-1 select-none">
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              Model Contributing Factors
            </summary>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(forecastData.contributing_factors).map(([k, v]: [string, any]) => (
                <div key={k} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[10px]">
                  <p className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {typeof v === 'number' ? v.toFixed(3) : String(v)}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Primary Chart: Footfall & Fever Surge */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              {rangeDays}-Day Patient Footfall &amp; Acute Febrile Surge Correlation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Surge in fever/respiratory visits pre-dates medicine stock depletion by 4–6 days.
            </p>
          </div>
          <ExportButton filename={`footfall-${rangeDays}d`} data={time_series} />
        </div>

        {time_series.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500">
            No footfall data available for this period.
          </div>
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={time_series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotalFF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFever" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="total_footfall" name="Total Patient Volume" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotalFF)" dot={false} />
                <Area type="monotone" dataKey="fever_cases" name="Fever / Outbreak Cases" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFever)" dot={false} />
                <Area type="monotone" dataKey="medicine_consumption" name="Medicine Consumption" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" fillOpacity={1} fill="url(#colorCons)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grid: Category Distribution + District Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Category Distribution */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Pill className="w-4 h-4 text-teal-500" />
            Medicine Formulary by Category
          </h3>

          {category_distribution.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No category data available.</p>
          ) : (
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={category_distribution} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={9} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Medicines" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* District Risk Matrix */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              District Risk &amp; Vulnerability Matrix
            </h3>
            <ExportButton filename="district-risk-matrix" data={district_matrix} />
          </div>

          {district_matrix.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No district data available.</p>
          ) : (
            <div className="overflow-x-auto max-h-72 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="pb-2 pr-4">District</th>
                    <th className="pb-2 pr-4">State</th>
                    <th className="pb-2 pr-4 font-mono">PHCs</th>
                    <th className="pb-2 pr-4 font-mono text-right">Meds at Risk</th>
                    <th className="pb-2 pr-4 font-mono text-right">Population</th>
                    <th className="pb-2">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {district_matrix.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                      <td className="py-2.5 pr-4 font-bold text-slate-900 dark:text-slate-100">
                        {d.district_name}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">{d.state_name}</td>
                      <td className="py-2.5 pr-4 font-mono text-slate-600 dark:text-slate-300">{d.phcs_monitored}</td>
                      <td className="py-2.5 pr-4 font-mono font-bold text-right">
                        <span className={d.medicines_at_risk > 5 ? 'text-red-500' : d.medicines_at_risk > 2 ? 'text-orange-500' : 'text-slate-400'}>
                          {d.medicines_at_risk}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-right text-slate-500">
                        {d.population ? formatNumber(d.population) : '—'}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="risk" riskLevel={d.risk_level as any}>
                          {d.risk_level}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Risk Deep-Dive Tab Panel */}
      {riskAnalytics && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Risk Analytics — Detailed Breakdown
          </h3>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {riskTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRiskTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeRiskTab === tab.key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          {activeRisk && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(activeRisk)
                .filter(([k]) => k !== 'level' && k !== 'explainability')
                .map(([k, v]: [string, any]) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide capitalize">
                      {k.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {typeof v === 'number' ? (
                        v > 1000 ? formatNumber(Math.round(v)) :
                        Number.isInteger(v) ? v :
                        v.toFixed(1)
                      ) : String(v)}
                    </p>
                  </div>
                ))}
              <div className="col-span-full">
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500">Risk Level:</p>
                  <Badge variant="risk" riskLevel={activeRisk.level as any}>{activeRisk.level}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
