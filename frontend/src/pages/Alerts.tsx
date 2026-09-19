import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { AlertItem } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton } from '../components/common/CommonUI';
import { formatDateTime } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const { user } = useAuth();

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        severity: severityFilter !== 'All' ? severityFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
      });
      setAlerts(res);
      if (res.length > 0 && !selectedAlert) {
        setSelectedAlert(res[0]);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter, categoryFilter]);

  const handleAction = async (id: number, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    try {
      await api.updateAlert(id, action, user?.full_name || 'Admin');
      loadAlerts();
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Early Warning Intelligence &amp; Alerts
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20">
              {alerts.length} ALERTS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Predictive warnings generated prior to stock-outs, demand surges, or capacity collapse with AI explainability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton filename="resilience-early-warnings" data={alerts} />
          <button
            onClick={loadAlerts}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'All'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
        >
          <option value="All">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
        >
          <option value="All">All Alert Categories</option>
          <option value="CRITICAL_STOCKOUT">Critical Stock-out</option>
          <option value="HIGH_DEMAND_SPIKE">High Demand Spike</option>
          <option value="LOW_BED_CAPACITY">Low Bed Capacity</option>
          <option value="STAFF_SHORTAGE">Staff Shortage</option>
          <option value="ABNORMAL_FOOTFALL">Abnormal Footfall</option>
        </select>
      </div>

      {/* Split View: List on Left (5 Cols), Detail Inspection on Right (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No active alerts matching the selected filters.
            </div>
          ) : (
            alerts.map((alt) => {
              const isSelected = selectedAlert?.id === alt.id;
              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlert(alt)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 border-brand-500 shadow-md ring-1 ring-brand-500/20'
                      : 'bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                      {alt.title}
                    </span>
                    <Badge variant="risk" riskLevel={alt.severity} dot>
                      {alt.severity}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {alt.reason}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {alt.phc_name} ({alt.district_name})
                    </span>
                    <span className="font-mono text-[10px] text-brand-500 font-bold">
                      {alt.alert_code}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail Card */}
        <div className="lg:col-span-7">
          {selectedAlert ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="risk" riskLevel={selectedAlert.severity} dot>
                      {selectedAlert.severity} SEVERITY
                    </Badge>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {selectedAlert.alert_code}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedAlert.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedAlert.phc_name} • {selectedAlert.district_name} District, {selectedAlert.state_name}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedAlert.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleAction(selectedAlert.id, 'acknowledge')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                    >
                      Acknowledge
                    </button>
                  )}
                  {selectedAlert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleAction(selectedAlert.id, 'resolve')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Reason & Prediction Section */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                    Operational Reason:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed text-xs">
                    {selectedAlert.reason}
                  </p>
                </div>

                {selectedAlert.prediction && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                      Predictive Impact Model:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {selectedAlert.prediction}
                    </p>
                  </div>
                )}
              </div>

              {/* AI Grounded Explanation Card */}
              {selectedAlert.ai_explanation && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900/60 border border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>AI ROOT-CAUSE EXPLANATION</span>
                  </div>
                  <p className="text-xs text-blue-100 leading-relaxed font-sans">
                    {selectedAlert.ai_explanation}
                  </p>
                </div>
              )}

              {/* Recommended Action Card */}
              {selectedAlert.recommended_action && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>RECOMMENDED OPERATIONAL ACTION</span>
                  </div>
                  <p className="text-xs text-emerald-100 font-semibold leading-relaxed">
                    {selectedAlert.recommended_action}
                  </p>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Created: {formatDateTime(selectedAlert.created_at)}</span>
                <span>Status: <strong className="text-slate-300">{selectedAlert.status}</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Select an alert from the queue to inspect full telemetry and AI recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
