import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Send, Bot, User, ShieldCheck, CheckCircle2,
  RefreshCw, AlertTriangle, Zap, Database, BarChart2, Activity, Info, FileText
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { CopilotResponse } from '../types';
import { useDemo } from '../hooks/useDemo';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  summary?: string;
  evidence?: string[];
  riskLevel?: string;
  dataLimitations?: string;
  supportingMetrics?: Record<string, any>;
  affectedPhcs?: string[];
  recommendedActions?: string[];
  isLiveGemini?: boolean;
  modelUsed?: string;
  confidence?: number;
  timestamp: string;
  isError?: boolean;
}

interface CopilotStatus {
  mode: 'LIVE_GEMINI' | 'GROUNDED_FALLBACK_DEMO';
  is_api_key_configured: boolean;
  model: string;
  grounding_source?: string;
  zero_fabrication_guarantee?: boolean;
}

const SUGGESTED_QUERIES = [
  "What are today's most critical healthcare risks?",
  "Which PHCs may face medicine stock-outs?",
  "Where should resources be redistributed?",
  "Why is this district high risk?",
  "Summarize the current emergency situation.",
  "What changed compared with yesterday?",
  "Which resource imbalance needs immediate attention?"
];

const WELCOME_MSG: Message = {
  id: 'init',
  sender: 'assistant',
  text: "Welcome to **Resilience Copilot**, your operational intelligence assistant grounded strictly in live telemetry across 98 Primary Health Centres. Select a suggested operational query or ask any question regarding network risks, stock depletion, or resource redistribution.",
  summary: "Resilience Copilot initialized and synchronized with live network telemetry.",
  evidence: [
    "Ground-truth connection active across 98 monitored PHCs",
    "Zero metric fabrication guarantee active"
  ],
  riskLevel: "INFORMATIONAL",
  dataLimitations: "Telemetry is updated continuously from field facility records; responses reflect current database state.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  recommendedActions: [
    "Ask: \"What are today's most critical healthcare risks?\"",
    "Ask: \"Which PHCs may face medicine stock-outs?\""
  ]
};

/* ── Supporting Metrics Mini-Panel ── */
const MetricsPanel: React.FC<{ metrics: Record<string, any> }> = ({ metrics }) => {
  const entries = [
    { key: 'total_monitored_phcs', label: 'Monitored PHCs', icon: <Database className="w-3 h-3" />, color: 'blue' },
    { key: 'critical_alerts_count', label: 'Critical Alerts', icon: <AlertTriangle className="w-3 h-3" />, color: 'red' },
    { key: 'medicines_at_risk', label: 'Medicines at Risk', icon: <Activity className="w-3 h-3" />, color: 'amber' },
    { key: 'bed_occupancy_rate', label: 'Bed Occupancy', icon: <BarChart2 className="w-3 h-3" />, color: 'emerald' },
    { key: 'staff_attendance_rate', label: 'Staff Attendance', icon: <Zap className="w-3 h-3" />, color: 'purple' },
  ].filter(e => metrics[e.key] !== undefined && metrics[e.key] !== null);

  if (entries.length === 0) return null;

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    red: 'bg-tomato-500/10 text-tomato-600 dark:text-tomato-400 border-tomato-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-command-border dark:border-navy-border">
      <span className="text-[10px] font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
        <Database className="w-3 h-3 text-tomato-500" /> Observed Application Data:
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {entries.map(({ key, label, icon, color }) => (
          <div key={key} className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${colorMap[color]}`}>
            {icon}
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-wide opacity-75 truncate">{label}</div>
              <div className="text-xs font-bold truncate">{String(metrics[key])}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Confidence Badge ── */
const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-tomato-500';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-command-muted dark:text-slate-400">Confidence:</span>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-navy-800 w-16 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-command-muted dark:text-slate-400">{pct}%</span>
    </div>
  );
};

/* ── Main Component ── */
export const CopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const demoQueryFiredRef = useRef(false);

  const { isDemoActive, currentStep } = useDemo();

  /* Fetch copilot mode on mount */
  useEffect(() => {
    let cancelled = false;
    api.getCopilotStatus()
      .then((s) => { if (!cancelled) setCopilotStatus(s); })
      .catch((e) => { console.warn('[Copilot Status Check]', e); })
      .finally(() => { if (!cancelled) setStatusLoading(false); });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isDemo = copilotStatus ? !copilotStatus.is_api_key_configured : false;

  const handleSend = useCallback(async (queryText?: string) => {
    const q = (queryText || inputText).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    abortRef.current = new AbortController();

    try {
      const res: CopilotResponse = await api.queryCopilot(q);
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        summary: res.summary,
        evidence: res.evidence,
        riskLevel: res.risk_level,
        dataLimitations: res.data_limitations,
        supportingMetrics: res.supporting_metrics,
        affectedPhcs: res.affected_phcs,
        recommendedActions: res.recommended_actions,
        isLiveGemini: res.is_live_gemini,
        modelUsed: res.model_used,
        confidence: res.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const isAuth = err instanceof ApiError ? err.kind === 'AUTHENTICATION_ERROR' : err?.message?.includes('credentials');
      const isNetwork = err instanceof ApiError ? err.kind === 'NETWORK_ERROR' : !navigator.onLine || err?.message?.includes('fetch');

      let userFriendlyText = 'Resilience Copilot encountered an issue processing your query. Please retry.';
      if (isAuth) {
        userFriendlyText = 'Your session could not be verified. Attempting automatic reconnection... Please retry in a moment.';
      } else if (isNetwork) {
        userFriendlyText = 'Unable to reach the Copilot telemetry service. Please ensure the backend is running on port 8000.';
      } else if (err?.message) {
        userFriendlyText = err.message;
      }

      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        sender: 'assistant',
        text: userFriendlyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  }, [inputText, loading]);

  /* Demo auto-query: fire canonical question when demo tour reaches step 9 */
  useEffect(() => {
    if (
      isDemoActive &&
      currentStep?.autoActionKey === 'COPILOT_DEMO_QUERY' &&
      !demoQueryFiredRef.current &&
      !loading
    ) {
      demoQueryFiredRef.current = true;
      const t = setTimeout(() => {
        handleSend("What are today's most critical healthcare risks?");
      }, 800);
      return () => clearTimeout(t);
    }
    if (!isDemoActive || currentStep?.autoActionKey !== 'COPILOT_DEMO_QUERY') {
      demoQueryFiredRef.current = false;
    }
  }, [isDemoActive, currentStep, loading, handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-fade-in flex flex-col h-[calc(100vh-140px)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-3 border-b border-command-border dark:border-navy-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-tomato-500 flex items-center justify-center shadow-glow-tomato text-white">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-command-text dark:text-white flex items-center gap-2 flex-wrap">
              Resilience Copilot
              {!statusLoading && (
                isDemo ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    DEMO AI MODE
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tomato-500/15 text-tomato-700 dark:text-tomato-400 border border-tomato-500/30">
                    GOOGLE GEMINI REASONING
                  </span>
                )
              )}
            </h1>
            <p className="text-xs text-command-muted dark:text-slate-400">
              Grounded AI assistant for healthcare resource allocation and supply-chain resilience.
            </p>
          </div>
        </div>
        <button
          onClick={() => { setMessages([WELCOME_MSG]); demoQueryFiredRef.current = false; }}
          className="p-2 rounded-xl text-command-muted dark:text-slate-300 hover:text-command-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-850 text-xs flex items-center gap-1 border border-command-border dark:border-navy-border transition-all"
          title="Clear Conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Chat</span>
        </button>
      </div>

      {/* ── Demo AI Mode Informational Banner ── */}
      {!statusLoading && isDemo && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shrink-0">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-amber-800 dark:text-amber-300">DEMO AI MODE</span>
            {' '}— <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">GEMINI_API_KEY</span> is not configured.
            Responses are generated by a <strong>structured heuristic engine</strong> grounded strictly in live database telemetry —
            the same facts a live Gemini response would use.{' '}
            <strong>No responses are fabricated.</strong> Every number shown is pulled directly from the operational database.
          </div>
        </div>
      )}

      {/* ── Suggested Query Chips ── */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold uppercase text-command-muted dark:text-slate-400 font-mono">Suggested:</span>
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            disabled={loading}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-navy-900 text-command-text dark:text-slate-200 border border-command-border dark:border-navy-border hover:border-tomato-500 hover:text-tomato-600 dark:hover:text-tomato-400 transition-all shadow-subtle disabled:opacity-50"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-tomato-500 flex items-center justify-center shrink-0 mt-0.5 shadow-subtle text-white">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div className="max-w-[85%] space-y-1.5">
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-tomato-500 text-white rounded-br-none shadow-subtle'
                    : msg.isError
                    ? 'bg-tomato-50 dark:bg-navy-850 text-tomato-700 dark:text-tomato-300 border border-tomato-500/30 rounded-bl-none'
                    : 'bg-slate-50 dark:bg-navy-850 text-command-text dark:text-slate-100 border border-command-border dark:border-navy-border rounded-bl-none shadow-subtle'
                }`}
              >
                {/* Visual Section: ANALYSIS (Summary & Risk) */}
                {msg.sender === 'assistant' && msg.summary && (
                  <div className="mb-3 p-3 rounded-xl bg-tomato-500/10 border border-tomato-500/25">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-tomato-600 dark:text-tomato-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> [ANALYSIS] Operational Summary
                      </span>
                      {msg.riskLevel && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider ${
                          msg.riskLevel === 'CRITICAL' ? 'bg-tomato-500/20 text-tomato-600 dark:text-tomato-400 border border-tomato-500/30' :
                          msg.riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                          msg.riskLevel === 'LOW' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                          'bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300 border border-command-border dark:border-navy-border'
                        }`}>
                          Risk: {msg.riskLevel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-command-text dark:text-white leading-relaxed">
                      {msg.summary}
                    </div>
                  </div>
                )}

                {/* Main Message Text (if no structured summary, or for user messages) */}
                {(!msg.summary || msg.sender === 'user') && (
                  <div className="whitespace-pre-line font-sans">{msg.text}</div>
                )}

                {/* Visual Section: FACTS (Grounded Evidence) */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-command-border dark:border-navy-border space-y-1.5">
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <Database className="w-3 h-3" /> [FACTS] Grounded Evidence:
                    </span>
                    <ul className="space-y-1 text-[11px] text-command-text dark:text-slate-200">
                      {msg.evidence.map((ev, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-cyan-500 font-bold">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supporting Metrics Panel */}
                {msg.supportingMetrics && Object.keys(msg.supportingMetrics).length > 0 && (
                  <MetricsPanel metrics={msg.supportingMetrics} />
                )}

                {/* Affected PHCs */}
                {msg.affectedPhcs && msg.affectedPhcs.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-command-border dark:border-navy-border flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-command-muted dark:text-slate-400 uppercase tracking-wider w-full">
                      Affected Facilities:
                    </span>
                    {msg.affectedPhcs.map((phc, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-command-text dark:text-slate-200 font-medium text-[10px] border border-command-border dark:border-navy-border"
                      >
                        {phc}
                      </span>
                    ))}
                  </div>
                )}

                {/* Visual Section: RECOMMENDATIONS */}
                {msg.recommendedActions && msg.recommendedActions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-command-border dark:border-navy-border space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> [RECOMMENDATIONS] Action Items:
                    </span>
                    <ul className="space-y-1 text-[11px] text-command-text dark:text-slate-200">
                      {msg.recommendedActions.map((act, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Visual Section: DATA LIMITATIONS */}
                {msg.dataLimitations && (
                  <div className="mt-3 pt-2 border-t border-command-border dark:border-navy-border text-[10px] text-command-muted dark:text-slate-400 flex items-start gap-1.5 italic">
                    <ShieldCheck className="w-3.5 h-3.5 text-command-muted dark:text-slate-400 shrink-0 mt-0.5" />
                    <span>[DATA LIMITATIONS]: {msg.dataLimitations}</span>
                  </div>
                )}
              </div>

              {/* Message Footer */}
              <div className="flex items-center gap-2 px-1 flex-wrap">
                <span className="text-[10px] text-command-muted dark:text-slate-400">{msg.timestamp}</span>
                {msg.sender === 'assistant' && msg.confidence !== undefined && (
                  <ConfidenceBadge confidence={msg.confidence} />
                )}
                {msg.sender === 'assistant' && msg.modelUsed && (
                  <span className="text-[9px] text-command-muted dark:text-slate-400 font-mono">· {msg.modelUsed}</span>
                )}
                {msg.sender === 'assistant' && msg.isLiveGemini === false && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    DEMO
                  </span>
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 dark:bg-navy-800 flex items-center justify-center shrink-0 mt-0.5 text-white">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-tomato-500 flex items-center justify-center shrink-0 animate-pulse text-white">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="p-4 rounded-2xl rounded-bl-none bg-slate-50 dark:bg-navy-850 text-xs text-command-muted dark:text-slate-300 flex items-center gap-2 border border-command-border dark:border-navy-border">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-tomato-500 animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-tomato-500 animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-tomato-500 animate-bounce [animation-delay:300ms]" />
              </div>
              <span>Grounding query in live database telemetry...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input Box ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle shrink-0">
        <div className="relative flex items-end gap-2">
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot about facility risk, inventory depletion, or redistribution... (Enter to send, Shift+Enter for newline)"
            disabled={loading}
            className="flex-1 pl-4 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-850 text-xs text-command-text dark:text-white placeholder-command-muted dark:placeholder-slate-400 border border-command-border dark:border-navy-border focus:outline-none focus:border-tomato-500 resize-none max-h-28 overflow-y-auto custom-scrollbar"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || loading}
            aria-label="Send message"
            className="p-2.5 rounded-xl bg-tomato-500 text-white hover:bg-tomato-600 disabled:opacity-40 transition-all shadow-subtle shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-command-muted dark:text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Decision-support only. Strictly bounded to live healthcare operational telemetry.
        </div>
      </div>
    </div>
  );
};
