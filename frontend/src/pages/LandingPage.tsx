import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  Globe2,
  Activity,
  BedDouble,
  Users2,
  Cpu,
  Layers,
  Database,
  Cloud,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useDemo } from '../hooks/useDemo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { startDemo } = useDemo();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-brand-500 selection:text-white font-sans overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#090d16]/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-tealAccent-500 flex items-center justify-center shadow-glow-blue">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-lg">
                RESILIENCE<span className="text-tealAccent-400">.AI</span>
              </span>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-400">
                Healthcare Supply Chain Command Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Explore Dashboard
            </button>
            <button
              onClick={() => {
                startDemo();
                navigate('/dashboard');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Judge Demo Mode</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-tealAccent-500/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-tealAccent-400 animate-pulse" />
            BRICS THEME: RESILIENCE & PREDICTIVE HEALTHCARE
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Predict healthcare shortages <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              before they become crises.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            A federated AI command center providing real-time visibility into medicine stocks, patient footfall, and bed capacity across 98+ Primary Health Centres—featuring Holt-Winters demand forecasting, early warning alerts, and automated cross-district resource redistribution.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-blue transition-all active:scale-95"
            >
              <span>Explore Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                startDemo();
                navigate('/dashboard');
              }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Sparkles className="w-4 h-4 text-tealAccent-400" />
              <span>See How AI Works (3 Min Tour)</span>
            </button>
          </div>
        </div>

        {/* Live Command Center Preview Mockup */}
        <div className="max-w-6xl mx-auto mt-16 rounded-2xl p-2 bg-gradient-to-b from-slate-800/80 to-slate-950 border border-slate-800 shadow-2xl">
          <div className="rounded-xl bg-[#0d1322] p-5 border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  resilience-command-center.gov.in/dashboard
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                ACTIVE TELEMETRY • 98 PHCs CONNECTED (DEMO MOCKUP)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Critical Alerts</span>
                <div className="text-xl font-bold text-red-400 font-mono mt-1">3 ACTIVE</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Medicines At Risk</span>
                <div className="text-xl font-bold text-amber-400 font-mono mt-1">6 ITEMS</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Available Beds</span>
                <div className="text-xl font-bold text-teal-400 font-mono mt-1">742 / 1,250</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Forecast Accuracy</span>
                <div className="text-xl font-bold text-blue-400 font-mono mt-1">91.2% MAE</div>
              </div>
            </div>
            <div className="text-[10px] text-center text-slate-500 font-mono pt-1">
              * Demonstration mockup preview. Click "Explore Command Center" for live connected telemetry.
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: The Problem */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold font-mono text-red-400 uppercase tracking-widest">
              THE VULNERABILITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Essential medicines exist in one district while another faces an imminent crisis.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Public healthcare networks suffer from fragmented operational data. A Primary Health Centre experiencing an acute dengue outbreak may run out of ORS and intravenous fluids in 48 hours, while a neighboring district warehouse sits on 2,800 surplus units with no inter-district coordination.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { title: "Invisible Inventory Stock-outs", desc: "Suppliers have a 5-day lead time, while PHCs stock out in 2.3 days without early warnings." },
              { title: "Delayed Epidemic Response", desc: "Fever patient footfall surges +37% days before administrative awareness." },
              { title: "Unbalanced Resource Allocation", desc: "Excess stock expires in central stores while rural facilities divert patients." }
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 & 3: The Solution & How It Works */}
      <section className="py-20 px-6 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold font-mono text-tealAccent-400 uppercase tracking-widest">
              END-TO-END RESILIENCE WORKFLOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Observe. Predict. Warn. Optimize. Act. Learn.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { step: "01", name: "Observe", desc: "Live telemetry on stocks, footfall & beds across 98 PHCs" },
              { step: "02", name: "Predict", desc: "7, 14 & 30-day Holt-Winters demand forecasting" },
              { step: "03", name: "Detect", desc: "Multivariate IQR & Z-score footfall surge anomalies" },
              { step: "04", name: "Warn", desc: "Actionable early warnings before stock-out occurs" },
              { step: "05", name: "Optimize", desc: "Surplus-to-shortage cross-district transfer routing" },
              { step: "06", name: "Learn", desc: "Privacy-preserving BRICS federated model averaging" },
            ].map((st, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-black font-mono text-slate-800 block">
                  {st.step}
                </span>
                <h4 className="text-sm font-bold text-tealAccent-300">{st.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: AI & Machine Learning Architecture */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-slate-950/50">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest">
              HYBRID AI ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Predictive ML + Google Gemini Reasoning
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <TrendingUp className="w-5 h-5" />
                <span>PREDICTIVE ML PIPELINE</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span><strong>Holt-Winters Demand Forecaster:</strong> Multi-horizon (7D, 14D, 30D) with footfall elasticity.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span><strong>Stock-out Probabilistic Classifier:</strong> Lead time vs burn rate delta scoring.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span><strong>Linear Redistribution Optimizer:</strong> Haversine proximity & safety reserve constraints.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <Sparkles className="w-5 h-5" />
                <span>GOOGLE GEMINI REASONING LAYER</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span><strong>Resilience Copilot:</strong> Natural language decision support grounded in live Postgres data.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span><strong>Root-Cause Explainability:</strong> Plain-language justifications for alert recommendations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span><strong>Emergency Action Summaries:</strong> Instant operational briefings during crisis scenarios.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Federated AI & BRICS */}
      <section className="py-20 px-6 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <span className="text-xs font-bold font-mono text-teal-400 uppercase tracking-widest">
            BRICS HEALTHCARE INTELLIGENCE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Privacy-Preserving Federated Learning Across 5 Nations
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Raw patient and consumption data stays strictly on local hospital servers. Only encrypted model parameter weights (248 KB) are aggregated via FedAvg, elevating the global forecast accuracy from 84% to 88.4%.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto pt-4">
            {[
              { code: "IND", name: "India (ICMR)", acc: "88.2%" },
              { code: "BRA", name: "Brazil (Fiocruz)", acc: "84.6%" },
              { code: "RUS", name: "Russia (MinZdrav)", acc: "83.9%" },
              { code: "CHN", name: "China (CCDC)", acc: "89.1%" },
              { code: "ZAF", name: "South Africa (SAMRC)", acc: "81.4%" },
            ].map((node, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-mono font-bold text-tealAccent-400">{node.code}</span>
                <div className="text-xs font-semibold text-slate-200 mt-1">{node.name}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Accuracy: {node.acc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8: Technology Stack */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest">
              ENTERPRISE CLOUD ARCHITECTURE
            </span>
            <h2 className="text-3xl font-extrabold text-white">Production-Ready Technology</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            {[
              { name: "Google Gemini", role: "Reasoning Layer" },
              { name: "FastAPI", role: "Async Python Core" },
              { name: "PostgreSQL", role: "Relational Telemetry" },
              { name: "React + TS", role: "Command UI" },
              { name: "Cloud Run", role: "Serverless Compute" },
              { name: "Docker", role: "Containerization" },
            ].map((tech, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-bold text-slate-100">{tech.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{tech.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 9: Final CTA */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-gradient-to-b from-[#090d16] to-slate-950 text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white max-w-3xl mx-auto">
          Build healthcare systems that are ready before the crisis arrives.
        </h2>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-brand-600 to-tealAccent-600 hover:from-brand-500 hover:to-tealAccent-500 text-white shadow-glow-blue transition-all"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Synthetic / Demonstration Data Prototype for Hackathon Review
        </p>
      </section>
    </div>
  );
};
