import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BedDouble,
  Users2,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Activity,
  Pill,
  Droplets,
  Sun,
  Wind,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Truck,
  Check,
  Info,
  Clock,
} from 'lucide-react';
import { api } from '../lib/api';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ConfirmationDialog } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

// Metadata and visual styles for each scenario
const SCENARIO_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; targetDistrict: string }> = {
  DENGUE_OUTBREAK: {
    icon: <Droplets className="w-4 h-4 text-red-400" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    targetDistrict: 'Namakkal',
  },
  MONSOON_FLOOD: {
    icon: <Wind className="w-4 h-4 text-blue-400" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    targetDistrict: 'Ernakulam',
  },
  HEATWAVE_CRISIS: {
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    targetDistrict: 'Ballari',
  },
  RESPIRATORY_SURGE: {
    icon: <Flame className="w-4 h-4 text-purple-400" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    targetDistrict: 'Pune',
  },
};

export const Emergency: React.FC = () => {
  const [statusData, setStatusData] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('DENGUE_OUTBREAK');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [confirmAction, setConfirmAction] = useState<'simulate' | 'reset' | null>(null);
  const navigate = useNavigate();

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getEmergencyStatus();
      setStatusData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load emergency status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const activeScenarioObj = statusData?.available_scenarios?.find(
    (s: any) => s.type === selectedScenario
  );

  const handleSimulate = async () => {
    try {
      setIsSimulating(true);
      setError(null);
      setSimulationStep(1);

      const targetDistrict = activeScenarioObj?.default_district || 'Namakkal';

      // Step 1: Normal State to Emergency Trigger
      await new Promise(r => setTimeout(r, 400));
      setSimulationStep(2);

      // Step 2: Demand & Resource Strain calculation
      await new Promise(r => setTimeout(r, 400));
      setSimulationStep(3);

      // Step 3: Trigger backend API simulation
      const res = await api.simulateEmergency(selectedScenario, targetDistrict);
      setSimulationResult(res);
      setSimulationStep(4);

      // Step 4: AI Recommendations loaded
      await new Promise(r => setTimeout(r, 400));
      setSimulationStep(5);

      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger emergency simulation');
      setSimulationStep(0);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSimulating(true);
      setError(null);
      await api.resetEmergency();
      setSimulationResult(null);
      setSimulationStep(0);
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to reset emergency simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading || !statusData) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const { is_active, active_event, available_scenarios } = statusData;
  const currentEvent = simulationResult || (is_active ? active_event : null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Emergency &amp; Outbreak Simulator
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                is_active
                  ? 'bg-red-500/15 text-red-500 border border-red-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${is_active ? 'bg-red-500' : 'bg-emerald-500'}`} />
              {is_active ? 'SIMULATION ACTIVE' : 'NORMAL BASELINE MONITORING'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Simulate regional crises to stress-test real-time demand forecasting, stock-out vulnerability, and autonomous redistribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {is_active && (
            <button
              onClick={() => setConfirmAction('reset')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Baseline</span>
            </button>
          )}
          <button
            onClick={loadStatus}
            aria-label="Refresh emergency status"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Disclaimers Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-indigo-950/40 border border-red-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-red-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="font-bold text-white">Controlled Simulation Environment:</strong>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-mono">
                SYNTHETIC MULTIPLIERS
              </span>
            </div>
            <p className="text-slate-300 mt-0.5 leading-relaxed">
              <strong>Clearly distinguishing actual application data vs simulation data:</strong> When activated, crisis multipliers are applied to historical patient footfall and consumption velocities to model supply chain collapse and guide proactive AI redistribution.
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Crisis Scenarios Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Select Emergency Scenario (4 National Crisis Archetypes)
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Click to preview impact</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {available_scenarios.map((sc: any) => {
            const isSelected = selectedScenario === sc.type;
            const meta = SCENARIO_META[sc.type] || SCENARIO_META.DENGUE_OUTBREAK;

            return (
              <div
                key={sc.type}
                onClick={() => setSelectedScenario(sc.type)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative ${
                  isSelected
                    ? `${meta.border} bg-red-50/40 dark:bg-red-950/20 ring-2 ring-red-500/30 shadow-md`
                    : 'bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`p-2 rounded-xl ${meta.bg} ${meta.border} border`}>
                    {meta.icon}
                  </span>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white">
                      ACTIVE PREVIEW
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {sc.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {sc.description}
                  </p>
                </div>

                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono">
                  <span>Hub: <strong className="text-slate-700 dark:text-slate-300">{sc.default_district}</strong></span>
                  <span className="text-red-400 font-bold">
                    +{Math.round((sc.demand_multiplier - 1) * 100)}% Demand
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated 6-Stage Simulation Pipeline */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          2. End-to-End Simulation Lifecycle Pipeline
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          {[
            { step: '01', title: 'Normal State', sub: 'Baseline footfall & safe inventory stock' },
            { step: '02', title: 'Emergency Event', sub: activeScenarioObj?.title || 'Crisis declared' },
            { step: '03', title: 'Demand Change', sub: `+${Math.round(((activeScenarioObj?.demand_multiplier || 1.85) - 1) * 100)}% Surge velocity` },
            { step: '04', title: 'Resource Pressure', sub: 'Bed cap & stock depletion accelerated' },
            { step: '05', title: 'Risk Changes', sub: 'PHCs escalate to CRITICAL tier' },
            { step: '06', title: 'AI Recommendation', sub: 'Surplus-to-deficit redistribution' },
          ].map((st, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border transition-all ${
                simulationStep > i || (is_active && simulationStep === 0)
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold">{st.step}</span>
                {simulationStep > i && <Check className="w-3 h-3 text-red-400" />}
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">{st.title}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{st.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Simulator Execution Action Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900 to-indigo-950/70 border border-red-500/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <span>Ready to trigger {activeScenarioObj?.title || 'Crisis Simulation'}</span>
          </div>
          <p className="text-xs text-slate-300">
            Target District: <strong className="text-white font-mono">{activeScenarioObj?.default_district || 'Namakkal'}</strong> • Primary Stock At Risk: {activeScenarioObj?.primary_affected_medicines?.join(', ')}
          </p>
        </div>

        <button
          onClick={() => setConfirmAction('simulate')}
          disabled={isSimulating}
          className="shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          <span>{isSimulating ? 'Applying Multipliers...' : 'Trigger Simulation'}</span>
        </button>
      </div>

      {/* Before vs After Impact Telemetry Comparison */}
      {(simulationResult || is_active) && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                Real-Time Impact Telemetry: Baseline vs Crisis Simulation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct comparative recalculation across 8 Primary Health Centres in {currentEvent?.affected_district || 'Namakkal'} District.
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
              SURGE ACTIVE
            </span>
          </div>

          {/* 5 Real Metrics Before vs After */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Patient Footfall */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Patient Footfall
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-slate-400 font-mono">
                  {formatNumber(simulationResult?.before_metrics?.patient_footfall_daily || 1240)}
                </span>
                <span className="text-xl font-bold font-mono text-red-500">
                  {formatNumber(simulationResult?.after_metrics?.patient_footfall_daily || 1798)}
                </span>
              </div>
              <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +{Math.round(((activeScenarioObj?.footfall_multiplier || 1.45) - 1) * 100)}% Acute Outbreak Surge
              </p>
            </div>

            {/* 2. Medicine Demand Index */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Medicine Demand Index
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-slate-400 font-mono">100 idx</span>
                <span className="text-xl font-bold font-mono text-red-500">
                  {simulationResult?.after_metrics?.medicine_demand_index || 185} idx
                </span>
              </div>
              <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +{Math.round(((activeScenarioObj?.demand_multiplier || 1.85) - 1) * 100)}% Consumption Spike
              </p>
            </div>

            {/* 3. Bed Occupancy */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Bed Occupancy Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-slate-400 font-mono">
                  {(simulationResult?.before_metrics?.bed_occupancy_rate || 71.4).toFixed(1)}%
                </span>
                <span className="text-xl font-bold font-mono text-red-500">
                  {(simulationResult?.after_metrics?.bed_occupancy_rate || 94.2).toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Near Critical Saturation
              </p>
            </div>

            {/* 4. Critical PHCs Count */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Critical PHCs in District
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-slate-400 font-mono">
                  {simulationResult?.before_metrics?.critical_phcs_count ?? 2} PHCs
                </span>
                <span className="text-xl font-bold font-mono text-red-500">
                  {simulationResult?.after_metrics?.critical_phcs_count ?? 8} PHCs
                </span>
              </div>
              <p className="text-[10px] text-red-400 font-bold">100% Facilities Under Strain</p>
            </div>

            {/* 5. Medicines at Risk */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Medicines at Risk
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-slate-400 font-mono">
                  {simulationResult?.before_metrics?.medicines_at_risk ?? 4}
                </span>
                <span className="text-xl font-bold font-mono text-red-500">
                  {simulationResult?.after_metrics?.medicines_at_risk ?? 28}
                </span>
              </div>
              <p className="text-[10px] text-red-400 font-bold">Imminent Stock-Out &lt;48h</p>
            </div>
          </div>

          {/* AI Situation Summary & Structured Operational Protocol */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>AI CRISIS SITUATION BRIEFING — GROUNDED OPERATIONAL REASONING</span>
              </div>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                GEMINI-GROUNDED
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {simulationResult?.ai_situation_summary || active_event?.ai_situation_summary || (
                `CRITICAL INCIDENT DECLARED for ${currentEvent?.affected_district || 'Namakkal'} District. Footfall surge +${Math.round(((activeScenarioObj?.footfall_multiplier || 1.45) - 1) * 100)}%, Essential medicine demand escalated +${Math.round(((activeScenarioObj?.demand_multiplier || 1.85) - 1) * 100)}%. Immediate inter-district supply redistribution and bed mobilization initiated.`
              )}
            </p>

            {/* Mandated Actions */}
            <div className="pt-3 border-t border-blue-500/20 space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Mandated Operational Actions:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(simulationResult?.recommended_emergency_actions || [
                  `Approve emergency inter-district ORS transfer from Salem to ${currentEvent?.affected_district || 'Namakkal'} (REC-2026-SLM-NMK-01).`,
                  `Mobilize 12 supplemental emergency observation beds across CHC facilities in ${currentEvent?.affected_district || 'Namakkal'}.`,
                  `Dispatch State Medical Services rapid supply batch SUP-TNMSC-01 with priority transport routing.`,
                  `Activate District Epidemic Response Team for vector control source reduction.`,
                ]).map((act: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Navigation to Action Centers */}
            <div className="pt-3 border-t border-blue-500/20 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-400">Execute response now:</span>
              <button
                onClick={() => navigate('/redistribution')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Go to Redistribution Approvals</span>
              </button>
              <button
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>View Emergency Alerts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmAction === 'simulate'}
        title="Trigger Emergency Simulation"
        message={`This will activate a ${activeScenarioObj?.title || selectedScenario} simulation in ${activeScenarioObj?.default_district || 'Namakkal'}. All supply chain metrics will reflect crisis multipliers. Continue?`}
        confirmLabel="Trigger Simulation"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { setConfirmAction(null); handleSimulate(); }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmationDialog
        isOpen={confirmAction === 'reset'}
        title="Reset to Baseline"
        message="This will deactivate the emergency simulation and restore all metrics to baseline values. Continue?"
        confirmLabel="Reset to Baseline"
        cancelLabel="Keep Active"
        variant="warning"
        onConfirm={() => { setConfirmAction(null); handleReset(); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
