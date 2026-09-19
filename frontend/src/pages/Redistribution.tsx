import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightLeft,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Thermometer,
  Package,
  AlertTriangle,
  CheckCheck,
  Info,
  Zap,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import { RedistributionItem, RedistributionStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton, ConfirmationDialog } from '../components/common/CommonUI';
import { formatNumber, formatDateTime } from '../lib/utils';

// ─── Status helpers ────────────────────────────────────────────────────────────

function statusBadge(s: string) {
  switch (s) {
    case 'RECOMMENDED': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'APPROVED':    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'IN_TRANSIT':  return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'DELIVERED':   return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'REJECTED':    return 'bg-red-500/10 text-red-400 border-red-500/30';
    default:            return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
}

function statusLabel(s: string) {
  switch (s) {
    case 'RECOMMENDED': return 'Pending Review';
    case 'APPROVED':    return 'Approved';
    case 'IN_TRANSIT':  return 'In Transit';
    case 'DELIVERED':   return 'Delivered';
    case 'REJECTED':    return 'Rejected';
    default:            return s;
  }
}

// ─── Source→Destination Animated Route Card ───────────────────────────────────

const RouteFlowCard: React.FC<{ rec: RedistributionItem }> = ({ rec }) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">

        {/* Source Node */}
        <div className="md:col-span-4 p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> SOURCE — SURPLUS HUB
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-base font-extrabold text-white">
            {rec.source_district_name}
          </div>
          <div className="text-xs text-slate-400">
            Available Surplus: <strong className="text-emerald-400 font-mono">+{formatNumber(rec.source_surplus_quantity)} units</strong>
          </div>
          <div className="text-[10px] text-slate-500">Safety buffer preserved (&gt;14 days retained)</div>
        </div>

        {/* Transit Spine */}
        <div className="md:col-span-4 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400">
            <Clock className="w-3.5 h-3.5" />
            ~{rec.estimated_transit_hours}h Lead Time
          </div>

          <div className="w-full relative h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: ['-20%', '120%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
              className="absolute w-12 h-2 bg-gradient-to-r from-emerald-500 via-blue-400 to-purple-500 rounded-full"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 font-mono bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            {formatNumber(rec.recommended_quantity)} UNITS DISPATCHING
          </div>

          {rec.tracking_number && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Thermometer className="w-3 h-3 text-teal-400" />
              <span>4.2°C Cold Chain |</span>
              <span className="font-mono text-brand-400">{rec.tracking_number}</span>
            </div>
          )}
        </div>

        {/* Destination Node */}
        <div className="md:col-span-4 p-4 rounded-xl bg-slate-900 border border-red-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> DESTINATION — CRITICAL DEFICIT
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-base font-extrabold text-white">
            {rec.dest_district_name}
          </div>
          <div className="text-xs text-slate-400">
            Critical Deficit: <strong className="text-red-400 font-mono">-{formatNumber(rec.dest_deficit_quantity)} units</strong>
          </div>
          <div className="text-[10px] text-slate-500">Stock-out risk without this transfer</div>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  rec: RedistributionItem;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onComplete: (id: number) => void;
  actionLoading: number | null;
  actionError: string | null;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ rec, onApprove, onReject, onComplete, actionLoading, actionError }) => {
  const isLoading = actionLoading === rec.id;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-brand-500">{rec.recommendation_code}</span>
            <Badge variant="risk" riskLevel={rec.urgency}>{rec.urgency}</Badge>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusBadge(rec.status)}`}>
              {statusLabel(rec.status)}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Transfer {formatNumber(rec.recommended_quantity)} units of <span className="text-brand-500">{rec.medicine_name}</span>
          </h2>
          {rec.medicine_category && (
            <p className="text-xs text-slate-400 mt-0.5">{rec.medicine_category}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {rec.status === 'RECOMMENDED' && (
            <>
              <button
                onClick={() => onReject(rec.id)}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-500/10 hover:text-red-500 transition-all disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 inline mr-1" />Reject
              </button>
              <button
                onClick={() => onApprove(rec.id)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 active:scale-95"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve &amp; Dispatch
              </button>
            </>
          )}
          {(rec.status === 'IN_TRANSIT' || rec.status === 'APPROVED') && (
            <button
              onClick={() => onComplete(rec.id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all disabled:opacity-50 active:scale-95"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Mark Received
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Animated Route */}
      <RouteFlowCard rec={rec} />

      {/* Reason & Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3" /> Algorithmic Rationale
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{rec.reason}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
            <Info className="w-3 h-3" /> Projected Clinical Impact
          </span>
          <p className="text-xs text-emerald-900 dark:text-emerald-300 font-medium leading-relaxed">
            {rec.estimated_impact || 'Reduces risk of stock-out at destination facility and maintains patient care continuity.'}
          </p>
        </div>
      </div>

      {/* Delivery meta */}
      {rec.approved_at && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {rec.approved_by && <span>Approved by: <strong className="text-slate-700 dark:text-slate-300">{rec.approved_by}</strong></span>}
          {rec.approved_at && <span>Approved: <strong className="text-slate-700 dark:text-slate-300">{formatDateTime(rec.approved_at)}</strong></span>}
        </div>
      )}
    </div>
  );
};

// ─── Queue Row ────────────────────────────────────────────────────────────────

interface QueueRowProps {
  rec: RedistributionItem;
  isSelected: boolean;
  onSelect: () => void;
  onApprove: (id: number) => void;
  onComplete: (id: number) => void;
  actionLoading: number | null;
}

const QueueRow: React.FC<QueueRowProps> = ({ rec, isSelected, onSelect, onApprove, onComplete, actionLoading }) => (
  <tr
    onClick={onSelect}
    className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer transition-colors ${
      isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-inset ring-blue-500/20' : ''
    }`}
  >
    <td className="py-3 px-4 font-mono font-bold text-brand-500 text-xs">{rec.recommendation_code}</td>
    <td className="py-3 px-4 font-bold text-xs text-slate-900 dark:text-slate-100">{rec.medicine_name}</td>
    <td className="py-3 px-4 text-xs text-emerald-500 font-semibold">
      {rec.source_district_name} <span className="font-mono">(+{rec.source_surplus_quantity})</span>
    </td>
    <td className="py-3 px-4 text-xs text-red-500 font-semibold">
      {rec.dest_district_name} <span className="font-mono">(-{rec.dest_deficit_quantity})</span>
    </td>
    <td className="py-3 px-4 font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
      {formatNumber(rec.recommended_quantity)}
    </td>
    <td className="py-3 px-4 font-mono text-xs text-slate-500">~{rec.estimated_transit_hours}h</td>
    <td className="py-3 px-4">
      <Badge variant="risk" riskLevel={rec.urgency}>{rec.urgency}</Badge>
    </td>
    <td className="py-3 px-4">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusBadge(rec.status)}`}>
        {statusLabel(rec.status)}
      </span>
    </td>
    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
      {rec.status === 'RECOMMENDED' && (
        <button
          onClick={() => onApprove(rec.id)}
          disabled={actionLoading === rec.id}
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {(rec.status === 'IN_TRANSIT' || rec.status === 'APPROVED') && (
        <button
          onClick={() => onComplete(rec.id)}
          disabled={actionLoading === rec.id}
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
        >
          Received
        </button>
      )}
      {rec.status !== 'RECOMMENDED' && rec.status !== 'IN_TRANSIT' && rec.status !== 'APPROVED' && (
        <span className="text-[10px] font-mono text-slate-400">{statusLabel(rec.status)}</span>
      )}
    </td>
  </tr>
);

// ─── Main Component ────────────────────────────────────────────────────────────

type TabKey = 'RECOMMENDED' | 'IN_TRANSIT' | 'DELIVERED' | 'REJECTED' | 'URGENT';

export const Redistribution: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RedistributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRec, setSelectedRec] = useState<RedistributionItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('RECOMMENDED');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingApprovalItem, setPendingApprovalItem] = useState<RedistributionItem | null>(null);

  const requestApprove = (id: number) => {
    const item = recommendations.find(r => r.id === id) || (selectedRec?.id === id ? selectedRec : null);
    if (item) setPendingApprovalItem(item);
    else handleApprove(id);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRedistributions();
      setRecommendations(res);
      if (res.length > 0 && !selectedRec) {
        setSelectedRec(res[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load redistributions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await api.approveRedistribution(id);
      await loadData();
      if (selectedRec?.id === id) {
        setSelectedRec(prev => prev ? { ...prev, status: 'IN_TRANSIT', tracking_number: res.tracking_number } : null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve redistribution');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    setActionError(null);
    try {
      await api.rejectRedistribution(id, 'Rejected by administrator');
      await loadData();
      if (selectedRec?.id === id) {
        setSelectedRec(prev => prev ? { ...prev, status: 'REJECTED' } : null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject redistribution');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: number) => {
    setActionLoading(id);
    setActionError(null);
    try {
      await api.completeRedistribution(id);
      await loadData();
      if (selectedRec?.id === id) {
        setSelectedRec(prev => prev ? { ...prev, status: 'DELIVERED' } : null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark redistribution complete');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    try {
      await api.generateRedistributions();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Computed KPIs ──
  const pending = recommendations.filter(r => r.status === 'RECOMMENDED');
  const inTransit = recommendations.filter(r => r.status === 'IN_TRANSIT' || r.status === 'APPROVED');
  const completed = recommendations.filter(r => r.status === 'DELIVERED');
  const rejected = recommendations.filter(r => r.status === 'REJECTED');
  const urgent = recommendations.filter(r => r.urgency === 'CRITICAL');

  const tabMap: Record<TabKey, RedistributionItem[]> = {
    RECOMMENDED: pending,
    IN_TRANSIT: inTransit,
    DELIVERED: completed,
    REJECTED: rejected,
    URGENT: urgent,
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: 'RECOMMENDED', label: 'Pending Review', icon: <Clock className="w-3.5 h-3.5" />, count: pending.length, color: 'text-amber-400' },
    { key: 'IN_TRANSIT',  label: 'In Transit',     icon: <Truck className="w-3.5 h-3.5" />, count: inTransit.length, color: 'text-purple-400' },
    { key: 'DELIVERED',   label: 'Completed',      icon: <CheckCheck className="w-3.5 h-3.5" />, count: completed.length, color: 'text-emerald-400' },
    { key: 'REJECTED',    label: 'Rejected',        icon: <XCircle className="w-3.5 h-3.5" />, count: rejected.length, color: 'text-red-400' },
    { key: 'URGENT',      label: 'Urgent',          icon: <AlertTriangle className="w-3.5 h-3.5" />, count: urgent.length, color: 'text-red-400' },
  ];

  const activeList = tabMap[activeTab];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64 animate-pulse" />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Resource Redistribution
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
              LINEAR OPTIMIZER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Algorithmic surplus-to-deficit matching across PHC networks with safety stock constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateFresh}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-all disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isGenerating ? 'Optimizing…' : 'Run Fresh Optimizer'}
          </button>
          <ExportButton filename="resilience-redistributions" data={recommendations} />
          <button
            onClick={loadData}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending Review',  value: pending.length,   icon: <Clock className="w-4 h-4 text-amber-400" />,   bg: 'border-amber-500/30' },
          { label: 'In Transit',      value: inTransit.length, icon: <Truck className="w-4 h-4 text-purple-400" />,  bg: 'border-purple-500/30' },
          { label: 'Completed',       value: completed.length, icon: <CheckCheck className="w-4 h-4 text-emerald-400" />, bg: 'border-emerald-500/30' },
          { label: 'Rejected',        value: rejected.length,  icon: <XCircle className="w-4 h-4 text-red-400" />,   bg: 'border-red-500/30' },
          { label: 'Urgent (CRIT)',   value: urgent.length,    icon: <AlertTriangle className="w-4 h-4 text-red-500" />, bg: 'border-red-500/40' },
        ].map((kpi, i) => (
          <div key={i} className={`p-4 rounded-2xl bg-white dark:bg-[#111827] border ${kpi.bg} shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">{kpi.icon}<span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">{kpi.label}</span></div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Selected Recommendation Detail Panel */}
      {selectedRec && (
        <DetailPanel
          rec={selectedRec}
          onApprove={requestApprove}
          onReject={handleReject}
          onComplete={handleComplete}
          actionLoading={actionLoading}
          actionError={actionError}
        />
      )}

      {/* Tab Navigation + Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="flex flex-wrap gap-1 p-3 border-b border-slate-100 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={activeTab === tab.key ? '' : tab.color}>{tab.icon}</span>
              {tab.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        {activeList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No redistribution records in <strong className="text-slate-300 font-mono">{activeTab}</strong> state.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Source (Surplus)</th>
                  <th className="py-3 px-4">Destination (Deficit)</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {activeList.map((rec) => (
                  <QueueRow
                    key={rec.id}
                    rec={rec}
                    isSelected={selectedRec?.id === rec.id}
                    onSelect={() => setSelectedRec(rec)}
                    onApprove={requestApprove}
                    onComplete={handleComplete}
                    actionLoading={actionLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!pendingApprovalItem}
        title="Authorize Inter-Facility Redistribution?"
        message={`Authorize dispatch of ${formatNumber(pendingApprovalItem?.recommended_quantity || 0)} units of ${pendingApprovalItem?.medicine_name} from ${pendingApprovalItem?.source_district_name} to ${pendingApprovalItem?.dest_district_name}? Estimated transit: ~${pendingApprovalItem?.estimated_transit_hours} hours under cold chain protocol.`}
        confirmLabel="Approve & Dispatch"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={() => {
          if (pendingApprovalItem) {
            const id = pendingApprovalItem.id;
            setPendingApprovalItem(null);
            handleApprove(id);
          }
        }}
        onCancel={() => setPendingApprovalItem(null)}
      />
    </div>
  );
};
