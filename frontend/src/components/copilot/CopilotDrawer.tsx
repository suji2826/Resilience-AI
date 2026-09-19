import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, X, Bot, User, ShieldCheck, CheckCircle2,
  AlertTriangle, Database, Activity, BarChart2, Zap
} from 'lucide-react';
import { api } from '../../lib/api';
import { CopilotResponse } from '../../types';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
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
}

const SUGGESTED_PROMPTS = [
  "Which PHCs are at highest risk?",
  "Which medicines may stock out within 7 days?",
  "Where should resources be redistributed?",
  "Which districts currently have the highest demand?",
  "Summarize today's national healthcare situation.",
  "What changed during the current emergency?"
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'assistant',
  text: "Greetings Commander. I am **Resilience Copilot**, grounded directly in your live healthcare telemetry and supply chain database. How can I assist your operational decisions today?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  recommendedActions: [
    "Ask: 'Which PHCs are at highest risk?'",
    "Ask: 'Which medicines may stock out within 7 days?'"
  ]
};

/* ── Supporting Metrics Panel ── */
const DrawerMetricsPanel: React.FC<{ metrics: Record<string, any> }> = ({ metrics }) => {
  const entries = [
    { key: 'total_monitored_phcs', label: 'Monitored PHCs', icon: <Database className="w-3 h-3" />, color: 'blue' },
    { key: 'critical_alerts_count', label: 'Critical Alerts', icon: <AlertTriangle className="w-3 h-3" />, color: 'red' },
    { key: 'medicines_at_risk', label: 'Meds at Risk', icon: <Activity className="w-3 h-3" />, color: 'amber' },
    { key: 'bed_occupancy_rate', label: 'Bed Occupancy', icon: <BarChart2 className="w-3 h-3" />, color: 'emerald' },
    { key: 'staff_attendance_rate', label: 'Staff Attend.', icon: <Zap className="w-3 h-3" />, color: 'purple' },
  ].filter(e => metrics[e.key] !== undefined && metrics[e.key] !== null);

  if (entries.length === 0) return null;

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
        <Database className="w-3 h-3" /> Observed Application Data:
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map(({ key, label, icon, color }) => (
          <div key={key} className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${colorMap[color]}`}>
            {icon}
            <div className="min-w-0">
              <div className="text-[8px] font-semibold uppercase opacity-70 truncate">{label}</div>
              <div className="text-[11px] font-bold truncate">{String(metrics[key])}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Fetch copilot status whenever drawer opens */
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.getCopilotStatus()
      .then(s => { if (!cancelled) setCopilotStatus(s); })
      .catch(() => { /* non-blocking */ });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [isOpen]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const isDemo = copilotStatus ? !copilotStatus.is_api_key_configured : false;

  const handleSendMessage = useCallback(async (queryText?: string) => {
    const query = (queryText || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      const res: CopilotResponse = await api.queryCopilot(query);
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
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
      const isNetwork = !navigator.onLine || err?.message?.includes('fetch');
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: isNetwork
          ? "Unable to reach the Copilot backend. Please check connection and verify backend is running on port 8000."
          : `Copilot error: ${err?.message || 'Failed to process operational query.'} Please retry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-white dark:bg-[#0c1222] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-glow-blue">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    Resilience Copilot
                    {isDemo ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        DEMO AI MODE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        GEMINI-GROUNDED
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Decision-Support Intelligence for Healthcare Commanders
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Chips */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 overflow-x-auto custom-scrollbar flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Suggested:
              </span>
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:text-brand-500 transition-all shadow-xs shrink-0 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="max-w-[85%] space-y-1.5">
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                          : msg.isError
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 rounded-bl-none'
                          : 'bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-line font-sans">{msg.text}</div>

                      {/* Supporting Metrics */}
                      {msg.supportingMetrics && Object.keys(msg.supportingMetrics).length > 0 && (
                        <DrawerMetricsPanel metrics={msg.supportingMetrics} />
                      )}

                      {/* Affected PHCs */}
                      {msg.affectedPhcs && msg.affectedPhcs.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-750 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full">
                            Affected Facilities:
                          </span>
                          {msg.affectedPhcs.map((phc, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 font-medium text-[10px] border border-blue-500/20"
                            >
                              {phc}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {msg.recommendedActions && msg.recommendedActions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-750 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Recommended Actions:
                          </span>
                          <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                            {msg.recommendedActions.map((act, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Message Footer */}
                    <div className="flex items-center gap-2 px-1 flex-wrap">
                      <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      {msg.sender === 'assistant' && msg.confidence !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Conf:</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {Math.round(msg.confidence * 100)}%
                          </span>
                        </div>
                      )}
                      {msg.sender === 'assistant' && msg.modelUsed && (
                        <span className="text-[9px] text-slate-500 font-mono">· {msg.modelUsed}</span>
                      )}
                      {msg.sender === 'assistant' && msg.isLiveGemini === false && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          DEMO
                        </span>
                      )}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-bl-none bg-slate-100 dark:bg-slate-850 text-xs text-slate-500 flex items-center gap-2 border border-slate-200 dark:border-slate-800">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span>Analyzing live telemetry and synthesizing response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <div className="relative flex items-end gap-2">
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Copilot about facility risk, inventory, or redistribution... (Enter to send)"
                  disabled={isLoading}
                  className="flex-1 pl-4 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand-500 transition-colors resize-none max-h-24 overflow-y-auto custom-scrollbar"
                  style={{ minHeight: '40px' }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 transition-all shadow-sm shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Decision-support only. Requires authorized human review for medical deployment.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
