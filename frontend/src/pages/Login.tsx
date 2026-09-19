import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('national.admin@resilience.gov.in');
  const [password, setPassword] = useState('resilience2026');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setIsLoading(true);
    try {
      await login(demoEmail, 'resilience2026');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'National Administrator', email: 'national.admin@resilience.gov.in', tag: 'Full National Oversight' },
    { role: 'State Administrator (TN)', email: 'state.tn.admin@resilience.gov.in', tag: 'Tamil Nadu State Health' },
    { role: 'District Administrator', email: 'district.namakkal@resilience.gov.in', tag: 'Namakkal DHO' },
    { role: 'PHC Administrator', email: 'phc.kollihills@resilience.gov.in', tag: 'Kolli Hills Tribal PHC' },
    { role: 'Supply Chain Manager', email: 'supply.chain@resilience.gov.in', tag: 'Salem Logistics Hub' },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 selection:bg-brand-500 selection:text-white font-sans relative overflow-hidden">
      {/* Glow Backdrop */}
      <div className="absolute w-[500px] h-[300px] bg-brand-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-tealAccent-500 flex items-center justify-center shadow-glow-blue mx-auto">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            RESILIENCE<span className="text-tealAccent-400">.AI</span>
          </h1>
          <p className="text-xs text-slate-400">
            Healthcare Supply Chain Resilience Command Center
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Official Email ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 text-xs text-slate-100 placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password / Passcode</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 text-xs text-slate-100 placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-blue transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Command Center'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Quick Demo Sign-In Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider">
                1-Click Judge Demo Accounts
              </span>
              <span className="text-tealAccent-400 font-mono text-[10px]">PRE-AUTHENTICATED</span>
            </div>

            <div className="space-y-1.5">
              {demoAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDemoQuickLogin(acc.email)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-850 transition-all flex items-center justify-between group text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-brand-400 transition-colors">
                      {acc.role}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{acc.tag}</div>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Synthetic / Demonstration Prototype • Hackathon Review
        </div>
      </div>
    </div>
  );
};
