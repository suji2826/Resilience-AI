import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe2,
  Lock,
  Cpu,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  PlayCircle,
  Layers,
  CheckCircle2,
  Database,
  Info,
  Server,
  Activity,
  ArrowDown,
  Clock,
  Eye,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

import { api } from '../lib/api';
import { FederatedNodeItem, FederatedRoundItem } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton } from '../components/common/CommonUI';
import { formatNumber, formatDateTime } from '../lib/utils';

// Country flag emoji / details mapping for BRICS
const COUNTRY_META: Record<string, { flag: string; city: string; region: string; color: string; border: string; bg: string }> = {
  IND: { flag: '🇮🇳', city: 'New Delhi Hub', region: 'South Asia', color: '#f97316', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  BRA: { flag: '🇧🇷', city: 'Brasília Hub', region: 'Latin America', color: '#10b981', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  RUS: { flag: '🇷🇺', city: 'Moscow Hub', region: 'Eurasia', color: '#3b82f6', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  CHN: { flag: '🇨🇳', city: 'Beijing Hub', region: 'East Asia', color: '#ef4444', border: 'border-red-500/30', bg: 'bg-red-500/10' },
  ZAF: { flag: '🇿🇦', city: 'Pretoria Hub', region: 'Southern Africa', color: '#eab308', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
};

export const FederatedAI: React.FC = () => {
  const [nodes, setNodes] = useState<FederatedNodeItem[]>([]);
  const [rounds, setRounds] = useState<FederatedRoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingPhase, setTrainingPhase] = useState<string>('');
  const [latestRoundResult, setLatestRoundResult] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<FederatedNodeItem | null>(null);
  const [selectedRound, setSelectedRound] = useState<FederatedRoundItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nodesRes, roundsRes] = await Promise.all([
        api.getFederatedNodes(),
        api.getFederatedRounds(),
      ]);
      setNodes(nodesRes);
      setRounds(roundsRes);
      if (nodesRes.length > 0 && !selectedNode) {
        setSelectedNode(nodesRes[0]);
      }
      if (roundsRes.length > 0 && !selectedRound) {
        setSelectedRound(roundsRes[roundsRes.length - 1]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load federated learning data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrainRound = async () => {
    try {
      setIsTraining(true);
      setError(null);

      // Phase 1: Local training
      setTrainingPhase('Local Edge Model Training across 5 Nodes...');
      await new Promise(r => setTimeout(r, 600));

      // Phase 2: Gradient extraction
      setTrainingPhase('Encrypting & Transmitting Weight Gradients (Zero Raw Data)...');
      await new Promise(r => setTimeout(r, 600));

      // Phase 3: Central FedAvg aggregation
      setTrainingPhase('Executing Secure Federated Averaging (FedAvg)...');
      const res = await api.trainFederatedRound(5);
      setLatestRoundResult(res);

      // Phase 4: Broadcast updated weights
      setTrainingPhase('Broadcasting Global Weights to Sovereign Edge Nodes...');
      await new Promise(r => setTimeout(r, 500));

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute federated training round');
    } finally {
      setIsTraining(false);
      setTrainingPhase('');
    }
  };

  const chartData = rounds.map(r => ({
    round: `R${r.round_number}`,
    round_full: `Round ${r.round_number}`,
    global_accuracy: r.global_aggregated_accuracy,
    divergence: typeof r.weights_divergence === 'number' ? Number((r.weights_divergence * 100).toFixed(2)) : 0,
    payload_kb: r.parameters_size_kb,
  }));

  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const totalDataPoints = nodes.reduce((acc, n) => acc + n.local_data_points, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
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
              Federated AI Mesh
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
              BRICS COLLABORATIVE INTELLIGENCE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Privacy-preserving collaborative learning across 5 sovereign edge nodes using Federated Averaging (FedAvg).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTrainRound}
            disabled={isTraining}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            <span>{isTraining ? 'Training Simulation...' : 'Trigger Training Round'}</span>
          </button>
          <ExportButton filename="federated-rounds-log" data={rounds} />
          <button
            onClick={loadData}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Synthetic Data & Privacy Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/40 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-teal-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="font-bold text-white">Federated Learning Demonstration — Synthetic Data</strong>
              <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                SIMULATION
              </span>
            </div>
            <p className="text-teal-300/90 leading-relaxed">
              <strong>Raw local healthcare data remains within each participating node in this demonstration.</strong> No individual patient telemetry or PHC transaction is ever transmitted cross-border. Only encrypted numerical gradient updates (248.5 KB parameters) are exchanged during secure aggregation.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="font-mono text-[10px] bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/30 text-teal-300">
            FedAvg v2.4
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Training In-Progress Active Indicator */}
      {isTraining && (
        <div className="p-4 rounded-2xl bg-teal-900/30 border border-teal-500/40 animate-pulse flex items-center justify-between gap-3 text-xs text-teal-300">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-teal-400 animate-spin" />
            <span className="font-bold">{trainingPhase}</span>
          </div>
          <span className="text-[10px] font-mono text-teal-400">5 Epochs / Node</span>
        </div>
      )}

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Federated Nodes</span>
            <Globe2 className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{nodes.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">5 Sovereign BRICS Hubs</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
          <div className="flex items-center justify-between text-command-muted dark:text-slate-400 text-xs mb-1">
            <span>Training Rounds</span>
            <Layers className="w-4 h-4 text-tomato-500" />
          </div>
          <p className="text-2xl font-extrabold text-command-text dark:text-white">{rounds.length}</p>
          <p className="text-[10px] text-command-muted dark:text-slate-400 mt-0.5">Iterative FedAvg Convergence</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
          <div className="flex items-center justify-between text-command-muted dark:text-slate-400 text-xs mb-1">
            <span>Global Aggregated Accuracy</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {latestRound ? `${latestRound.global_aggregated_accuracy}%` : '--'}
          </p>
          <p className="text-[10px] text-command-muted dark:text-slate-400 mt-0.5">Multi-Node Federated Metric</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle">
          <div className="flex items-center justify-between text-command-muted dark:text-slate-400 text-xs mb-1">
            <span>Aggregated Data Points</span>
            <Database className="w-4 h-4 text-tomato-500" />
          </div>
          <p className="text-2xl font-extrabold text-command-text dark:text-white">{totalDataPoints > 0 ? formatNumber(totalDataPoints) : '--'}</p>
          <p className="text-[10px] text-command-muted dark:text-slate-400 mt-0.5">Zero Records Transferred</p>
        </div>
      </div>

      {/* Privacy-Preserving Architecture Workflow Pipeline Diagram */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border">
          <div>
            <h3 className="text-sm font-bold text-command-text dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-tomato-500" />
              Federated Learning Lifecycle — Zero Raw Data Transmission
            </h3>
            <p className="text-xs text-command-muted dark:text-slate-400">
              How collective healthcare resilience intelligence converges without sharing confidential patient records.
            </p>
          </div>
          <span className="text-[10px] font-mono text-command-muted dark:text-slate-300 bg-slate-100 dark:bg-navy-800 px-2 py-1 rounded-lg border border-command-border dark:border-navy-border">
            Simulation Protocol
          </span>
        </div>

        {/* 6-step horizontal pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-stretch text-xs">
          {[
            {
              step: '01',
              title: 'Local Healthcare Data',
              desc: 'Telemetry, EHR & consumption logs remain locked on sovereign node storage.',
              badge: 'Sovereign',
              color: 'text-orange-400',
              border: 'border-orange-500/30',
            },
            {
              step: '02',
              title: 'Local Model Training',
              desc: '5 epochs run locally on each edge node (India, Brazil, Russia, China, SA).',
              badge: 'Edge Compute',
              color: 'text-blue-400',
              border: 'border-blue-500/30',
            },
            {
              step: '03',
              title: 'Model Update',
              desc: 'Only numerical gradients (248.5 KB) extracted; patient data stripped.',
              badge: 'Zero Raw Data',
              color: 'text-teal-400',
              border: 'border-teal-500/30',
            },
            {
              step: '04',
              title: 'Secure Aggregation',
              desc: 'Central coordinator applies Federated Averaging (FedAvg) over gradient weights.',
              badge: 'FedAvg v2.4',
              color: 'text-purple-400',
              border: 'border-purple-500/30',
            },
            {
              step: '05',
              title: 'Global Model',
              desc: 'Synthesized global model achieves superior accuracy across multi-country outbreak patterns.',
              badge: 'Ensemble',
              color: 'text-emerald-400',
              border: 'border-emerald-500/30',
            },
            {
              step: '06',
              title: 'Updated Local Models',
              desc: 'Optimized global weights broadcast back to strengthen each member facility.',
              badge: 'Broadcast',
              color: 'text-indigo-400',
              border: 'border-indigo-500/30',
            },
          ].map((pipelineStep, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/70 border ${pipelineStep.border} flex flex-col justify-between space-y-2`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-extrabold text-slate-400">{pipelineStep.step}</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 ${pipelineStep.color}`}>
                    {pipelineStep.badge}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{pipelineStep.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {pipelineStep.desc}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-end text-slate-400">
                {i < 5 ? <ArrowRight className="w-3.5 h-3.5 hidden md:block" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Topology & Sovereign Edge Nodes Card */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 font-mono">
              FEDERATED MESH TOPOLOGY
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              Participating Sovereign Member Nodes
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Model Version: <strong className="text-teal-300">BRICS-Resilience-FedAvg-v2.4</strong>
          </span>
        </div>

        {/* 5 Participating Nodes Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {nodes.map((node) => {
            const meta = COUNTRY_META[node.country_code] || {
              flag: '🌐',
              city: 'Edge Hub',
              region: 'International',
              color: '#14b8a6',
              border: 'border-teal-500/30',
              bg: 'bg-teal-500/10',
            };
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-xl bg-slate-900/90 border transition-all cursor-pointer space-y-2.5 ${
                  isSelected ? `${meta.border} ring-1 ring-teal-500/30 bg-slate-900` : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{meta.flag}</span>
                    <span className="font-mono text-xs font-bold text-white">{node.country_code}</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {node.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100">{node.country_name}</h4>
                  <p className="text-[10px] text-slate-400">{meta.city} • {meta.region}</p>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Local Acc:</span>
                    <span className="font-mono font-bold text-emerald-400">{node.local_accuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Data Points:</span>
                    <span className="font-mono text-slate-300">{formatNumber(node.local_data_points)}</span>
                  </div>
                </div>

                {/* Simulated Gradient Transmission Indicator */}
                {isTraining && (
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="pt-1 flex items-center gap-1 text-[9px] text-teal-400 font-mono"
                  >
                    <ArrowDown className="w-3 h-3 animate-bounce" />
                    <span>Transmitting 248 KB weights</span>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Central Aggregator Hub */}
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-blue-950/80 border border-teal-500/40 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-teal-400" />
            <span>Central Federated Coordinator — Secure FedAvg Ensembling</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="text-slate-300">
              Strategy: <strong className="text-white font-mono">Weighted FedAvg</strong>
            </span>
            <span className="text-slate-300">
              Divergence: <strong className="text-white font-mono">{latestRound ? latestRound.weights_divergence : '0.0142'}</strong>
            </span>
            <span className="text-slate-300">
              Parameter Payload: <strong className="text-white font-mono">248.5 KB</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Accuracy Progression Chart & Training Rounds Log Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart - 7 Columns */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                Collaborative Convergence Curve
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Global model accuracy gain vs weight divergence across iterations.
              </p>
            </div>
            <ExportButton filename="federated-convergence" data={chartData} />
          </div>

          <div className="w-full h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="globalAccGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="round" stroke="#64748b" fontSize={10} />
                <YAxis domain={[75, 100]} stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="global_accuracy"
                  name="Global FedAvg Accuracy %"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fill="url(#globalAccGrad)"
                  dot={{ r: 4, fill: '#14b8a6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Training Rounds Log - 5 Columns */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                Training Audit Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable record of federated sync rounds.
              </p>
            </div>
          </div>

          <div className="overflow-y-auto max-h-64 custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-2">Round</th>
                  <th className="pb-2 font-mono">Global Acc</th>
                  <th className="pb-2 font-mono">Divergence</th>
                  <th className="pb-2">Privacy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {rounds.map((r) => (
                  <tr
                    key={r.round_number}
                    onClick={() => setSelectedRound(r)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer transition-colors ${
                      selectedRound?.round_number === r.round_number ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 font-bold font-mono text-brand-500">
                      Round {r.round_number}
                    </td>
                    <td className="py-2.5 font-mono font-bold text-emerald-500">
                      {r.global_aggregated_accuracy}%
                    </td>
                    <td className="py-2.5 font-mono text-slate-400">
                      {typeof r.weights_divergence === 'number' ? r.weights_divergence.toFixed(4) : r.weights_divergence}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Zero Raw Data
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Round Detail Drawer */}
          {selectedRound && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Selected: <strong className="text-slate-700 dark:text-slate-200">Round {selectedRound.round_number}</strong></span>
                <span className="font-mono text-slate-500">{formatDateTime(selectedRound.timestamp)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedRound.node_accuracies?.map((na, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                    {na.country_code}: <strong className="text-teal-400">{na.local_accuracy}%</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
