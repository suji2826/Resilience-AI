import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pill,
  Sparkles,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  PackageX,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
  Home,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import { api } from '../lib/api';
import { InventoryDetail as InventoryDetailType } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, Breadcrumbs, ErrorState } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';
import {
  getMedicineName,
  getMedicineCategory,
  getPhcName,
  getDistrictName,
  getStateName,
  getRiskLevel,
  getStockOutProbability,
  getNumber,
  getSupplierName,
  getRiskExplanation,
  getRecommendedAction,
  formatLastUpdated,
} from '../lib/inventoryUtils';

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

const daysColorClass = (days: number) => {
  if (days < 3) return 'text-red-500 dark:text-red-400';
  if (days < 7) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-500 dark:text-emerald-400';
};

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export const InventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<InventoryDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeHorizon, setActiveHorizon] = useState<7 | 14 | 30>(7);

  const fetchDetail = () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    api
      .getInventoryDetail(numericId)
      .then((res) => {
        if (!res || !res.id) {
          setNotFound(true);
        } else {
          setDetail(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load inventory detail:', err);
        if (
          err?.status === 404 ||
          err?.kind === 'NOT_FOUND' ||
          err?.message?.includes('404') ||
          err?.message?.toLowerCase().includes('not found')
        ) {
          setNotFound(true);
        } else {
          setError(
            typeof err?.message === 'string'
              ? err.message
              : 'Failed to load medicine inventory data. Please try again.'
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  /* ----------- Loading state ----------- */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in p-4 sm:p-6 bg-white dark:bg-navy-950 min-h-[70vh]">
        <div className="h-6 bg-slate-200 dark:bg-navy-800 rounded-lg w-48 animate-pulse" />
        <div className="h-10 bg-slate-200 dark:bg-navy-800 rounded-xl w-80 animate-pulse" />
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  /* ----------- Not-found state ----------- */
  if (notFound) {
    return (
      <div className="space-y-6 animate-fade-in p-4 sm:p-6 bg-white dark:bg-navy-950 min-h-[70vh]">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Medicine Stock', to: '/inventory' },
            { label: 'Not Found' },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center gap-5 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
            <PackageX className="w-8 h-8 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-command-text dark:text-white mb-2">
              Inventory record not found
            </h2>
            <p className="text-sm text-command-muted dark:text-slate-400 leading-relaxed">
              No inventory record exists for ID <span className="font-mono font-bold text-command-text dark:text-slate-200">#{id}</span>. It may have been removed or transferred.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tomato-500 hover:bg-tomato-600 text-white text-xs font-bold transition-all shadow-subtle"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Medicine Stock
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border text-command-text dark:text-white text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-navy-800 shadow-subtle"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------- Error state ----------- */
  if (error || !detail) {
    return (
      <div className="space-y-6 animate-fade-in p-4 sm:p-6 bg-white dark:bg-navy-950 min-h-[70vh]">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Medicine Stock', to: '/inventory' },
            { label: 'Error' },
          ]}
        />
        <div className="max-w-xl mx-auto py-12">
          <ErrorState
            message={error || 'Could not load inventory record.'}
            onRetry={fetchDetail}
          />
          <div className="flex justify-center mt-4">
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-command-muted hover:text-command-text dark:text-slate-400 dark:hover:text-white underline underline-offset-4"
            >
              Back to Medicine Stock
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Safe scalar extractions (guaranteed no direct object render)       */
  /* ------------------------------------------------------------------ */

  const medicineName = getMedicineName(detail);
  const medicineCategory = getMedicineCategory(detail);
  const phcName = getPhcName(detail);
  const districtName = getDistrictName(detail);
  const stateName = getStateName(detail);
  const riskLevel = getRiskLevel(detail);
  const stockOutProb = getStockOutProbability(detail);
  const currentStock = getNumber(detail.current_stock, 0);
  const dailyBurn = getNumber(detail.daily_consumption, 0);
  const daysRemaining = getNumber(detail.days_remaining, 0);
  const incomingStock = getNumber(detail.incoming_stock, 0);
  const supplierLeadTime = getNumber(detail.supplier_lead_time_days, 5);
  const supplierName = getSupplierName(detail);
  const unit = typeof detail.unit === 'string' && detail.unit.trim() ? detail.unit.trim() : 'units';
  const batchNumber = typeof detail.batch_number === 'string' && detail.batch_number.trim() ? detail.batch_number.trim() : 'BN-01-2026';
  const reorderLevel = typeof detail.reorder_level === 'number' ? detail.reorder_level : Math.round(dailyBurn * 14);
  const lastUpdatedFormatted = formatLastUpdated(detail.last_updated);
  const riskExplanation = getRiskExplanation(detail);
  const recommendedAction = getRecommendedAction(detail);

  // Forecast values
  const forecast7d = typeof detail.forecast_7d === 'number' ? `${detail.forecast_7d} ${unit}/day` : 'Forecast unavailable';
  const forecast14d = typeof detail.forecast_14d === 'number' ? `${detail.forecast_14d} ${unit}/day` : 'Forecast unavailable';
  const forecast30d = typeof detail.forecast_30d === 'number' ? `${detail.forecast_30d} ${unit}/day` : 'Forecast unavailable';
  const forecastTrend = typeof detail.forecast_trend === 'string' && detail.forecast_trend.trim() ? detail.forecast_trend.trim() : 'STABLE';
  const confidenceScore = typeof detail.confidence_score === 'number' ? `${(detail.confidence_score * 100).toFixed(0)}%` : '90%';

  // Safe chart data mapping
  const historicalPoints = Array.isArray(detail.historical_consumption_30d)
    ? detail.historical_consumption_30d
    : [];
  const forecastPoints = Array.isArray(detail.forecast_points_7d)
    ? detail.forecast_points_7d
    : [];

  const combinedChartData = [
    ...historicalPoints.map((h) => ({
      date: typeof h.date === 'string' ? h.date.slice(5) : 'Day',
      actual_demand: typeof h.quantity_consumed === 'number' ? h.quantity_consumed : 0,
      predicted_demand: null as number | null,
      lower_bound: null as number | null,
      upper_bound: null as number | null,
    })),
    ...forecastPoints.map((f) => ({
      date: typeof f.date === 'string' ? f.date.slice(5) : 'Day',
      actual_demand: null as number | null,
      predicted_demand: typeof f.predicted_demand === 'number' ? f.predicted_demand : null,
      lower_bound: typeof f.lower_bound === 'number' ? f.lower_bound : null,
      upper_bound: typeof f.upper_bound === 'number' ? f.upper_bound : null,
    })),
  ];

  const stockPct = currentStock > 0
    ? Math.min(100, Math.round((daysRemaining / 30) * 100))
    : 0;

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Medicine Stock', to: '/inventory' },
          { label: medicineName },
        ]}
      />

      {/* Header Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <button
            onClick={() => navigate('/inventory')}
            className="p-2.5 rounded-xl text-command-muted dark:text-slate-400 hover:text-command-text dark:hover:text-white
                       bg-slate-50 dark:bg-navy-800 border border-command-border dark:border-navy-border shadow-subtle transition-all mt-0.5"
            title="Back to Medicine Stock"
            aria-label="Back to Medicine Stock"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-navy-800 text-command-muted dark:text-slate-300 border border-command-border dark:border-navy-border">
                Inventory Detail
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-command-text dark:text-white">
                {medicineName}
              </h1>
              <Badge variant="risk" riskLevel={riskLevel} dot>
                {riskLevel} RISK ({(stockOutProb * 100).toFixed(0)}%)
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-command-muted dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-command-text dark:text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-tomato-500" />
                {phcName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {districtName}, {stateName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {medicineCategory}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                Last updated: {lastUpdatedFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/redistribution')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                       bg-tomato-500 hover:bg-tomato-600 text-white shadow-subtle transition-all"
          >
            <Truck className="w-4 h-4" />
            <span>Generate Transfer Plan</span>
          </button>
        </div>
      </div>

      {/* Summary Section: 4 KPI Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-command-muted dark:text-slate-400 mb-2.5 px-1">
          Summary &amp; Stock Runway
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Stock */}
          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Current Stock
            </span>
            <div className="text-2xl font-bold text-command-text dark:text-white font-mono mt-1">
              {formatNumber(currentStock)}{' '}
              <span className="text-xs font-normal text-command-muted dark:text-slate-400">{unit}</span>
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Batch: {batchNumber}
            </span>
            <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stockPct < 20 ? 'bg-red-500' : stockPct < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>

          {/* Daily Consumption */}
          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Daily Consumption
            </span>
            <div className="text-2xl font-bold text-command-text dark:text-white font-mono mt-1">
              {dailyBurn}{' '}
              <span className="text-xs font-normal text-command-muted dark:text-slate-400">{unit}/day</span>
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Effective 30-day average rate
            </span>
          </div>

          {/* Days of Stock */}
          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Days of Stock
            </span>
            <div className={`text-2xl font-bold font-mono mt-1 ${daysColorClass(daysRemaining)}`}>
              {daysRemaining} Days
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              {daysRemaining < 3 ? 'Critical stock-out alert' : daysRemaining < 7 ? 'Reorder window active' : 'Buffer stock safe'}
            </span>
          </div>

          {/* Incoming Stock */}
          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Incoming Stock
            </span>
            <div className="text-2xl font-bold text-command-text dark:text-white font-mono mt-1">
              {formatNumber(incomingStock)}{' '}
              <span className="text-xs font-normal text-command-muted dark:text-slate-400">{unit}</span>
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1 truncate">
              {incomingStock > 0 ? 'Transit order dispatched' : 'No pending supplier shipment'}
            </span>
          </div>
        </div>
      </div>

      {/* Risk Section: Explanation & Action */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/40
                      border border-blue-500/30 shadow-subtle space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-blue-200">
            AI Stock-Out Risk Explanation &amp; Contributing Factors
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold
                           bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">
            PREDICTIVE REASONING
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          {riskExplanation}
        </p>

        <div className="pt-2 border-t border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Recommended: {recommendedAction}</span>
          </div>
          <button
            onClick={() => navigate('/redistribution')}
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-tomato-500 hover:bg-tomato-600 text-white text-xs font-bold transition-all shadow-subtle"
          >
            Redistribute Now
          </button>
        </div>
      </div>

      {/* Forecast Section: 7D / 14D / 30D Metrics */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-command-muted dark:text-slate-400 mb-2.5 px-1">
          Forecasted Demand
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
                7-Day Forecast
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-500">EWMA</span>
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-command-text dark:text-white">
              {forecast7d}
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Trend: {forecastTrend} ({confidenceScore} Conf.)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
                14-Day Forecast
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-500">HOLT-WINTERS</span>
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-command-text dark:text-white">
              {forecast14d}
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Mid-term projected demand
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
                30-Day Forecast
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-500">SEASONAL</span>
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-command-text dark:text-white">
              {forecast30d}
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Monthly replenishment planning
            </span>
          </div>
        </div>
      </div>

      {/* Stock Parameters Section: Current Stock, Reorder Level, Incoming Stock, Lead Time */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-command-muted dark:text-slate-400 mb-2.5 px-1">
          Stock Parameters &amp; Logistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Current Stock
            </span>
            <div className="text-lg font-bold font-mono mt-1 text-command-text dark:text-white">
              {formatNumber(currentStock)} {unit}
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              On-hand usable stock
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Reorder Level
            </span>
            <div className="text-lg font-bold font-mono mt-1 text-command-text dark:text-white">
              {formatNumber(reorderLevel)} {unit}
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Safety stock threshold
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Incoming Stock
            </span>
            <div className="text-lg font-bold font-mono mt-1 text-command-text dark:text-white">
              {formatNumber(incomingStock)} {unit}
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1">
              Confirmed pipeline units
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
            <span className="text-xs font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              Lead Time
            </span>
            <div className="text-lg font-bold font-mono mt-1 text-command-text dark:text-white">
              {supplierLeadTime} Days
            </div>
            <span className="text-[11px] text-command-muted dark:text-slate-400 block mt-1 truncate">
              {supplierName}
            </span>
          </div>
        </div>
      </div>

      {/* Historical Consumption & Forecast Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-command-border dark:border-navy-border">
          <div>
            <h3 className="text-sm font-bold text-command-text dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              30-Day Historical Consumption &amp; Projected Trajectory
            </h3>
            <p className="text-xs text-command-muted dark:text-slate-400">
              Confidence interval bounds (80%–95%) with footfall cross-elasticity multiplier.
            </p>
          </div>

          {/* Horizon tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl
                          border border-command-border dark:border-navy-border text-xs">
            {([7, 14, 30] as const).map((h) => (
              <button
                key={h}
                onClick={() => setActiveHorizon(h)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeHorizon === h
                    ? 'bg-white dark:bg-navy-700 text-command-text dark:text-white shadow-subtle'
                    : 'text-command-muted dark:text-slate-400 hover:text-command-text dark:hover:text-white'
                }`}
              >
                {h}-Day{h === 7 ? ' Forecast' : ''}
              </button>
            ))}
          </div>
        </div>

        {combinedChartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-command-muted dark:text-slate-400 text-sm gap-2">
            <Activity className="w-5 h-5" />
            No historical consumption data available
          </div>
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071a33',
                    borderColor: '#1e3a5f',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actual_demand"
                  name="Actual Daily Consumption"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="predicted_demand"
                  name="Forecasted Demand"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorForecast)"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper_bound"
                  name="Upper 90% Bound"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lower_bound"
                  name="Lower 90% Bound"
                  stroke="#93c5fd"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
