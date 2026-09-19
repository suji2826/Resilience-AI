import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  BedDouble,
  Users2,
  Pill,
  AlertTriangle,
  Phone,
  MapPin,
  TrendingUp,
  Activity,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import { api } from '../lib/api';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, Breadcrumbs } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';

export const PhcDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [phc, setPhc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getPhcDetail(parseInt(id, 10))
        .then(res => setPhc(res))
        .catch(err => console.error('Failed to load PHC detail:', err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading || !phc) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 animate-pulse" />
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'PHC Network', to: '/phcs' },
          { label: phc.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/phcs')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {phc.name}
              </h1>
              <Badge variant="risk" riskLevel={phc.risk_category} dot>
                {phc.risk_category} RISK
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Code: <span className="font-mono">{phc.code}</span> • {phc.district_name} District, {phc.state_name} • {phc.tier}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${phc.contact_phone}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 text-brand-500" />
            <span>{phc.contact_phone}</span>
          </a>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bed Capacity</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {phc.beds.occupied}/{phc.beds.total}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Occupancy Rate: <strong className={phc.beds.occupancy_rate > 85 ? "text-red-500" : "text-emerald-500"}>{phc.beds.occupancy_rate}%</strong>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workforce on Duty</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {phc.workforce.total_present}/{phc.workforce.total_sanctioned}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Attendance: <strong className="text-brand-400">{phc.workforce.attendance_rate}%</strong>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Medicines</span>
          <div className="text-2xl font-bold font-mono text-red-500 mt-1">
            {phc.critical_medicines.length} Items
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Stockout Horizon &lt; 7 Days
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catchment Population</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {formatNumber(phc.catchment_population)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Primary Care Coverage Area
          </span>
        </div>
      </div>

      {/* 14-Day Patient Footfall Trend Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              14-Day Patient Footfall &amp; Epidemic Surveillance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown of Outpatients, Inpatients, Emergencies, and Fever/Respiratory presentations.
            </p>
          </div>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={phc.footfall_history_14d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="outpatient" name="Outpatient (OPD)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fever_respiratory" name="Fever & Respiratory" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="emergency" name="Emergency" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Staff Breakdown + Critical Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Workforce Breakdown - 5 Columns */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Users2 className="w-4 h-4 text-emerald-500" />
            Duty Workforce Roster
          </h3>

          <div className="space-y-2.5">
            {phc.workforce.roles.map((r: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {r.role_type.replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-slate-400">
                    Sanctioned: {r.sanctioned} • Present: {r.present}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {r.attendance_rate}%
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {r.on_leave > 0 ? `${r.on_leave} On Leave` : 'Full Attendance'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Medicines - 7 Columns */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Pill className="w-4 h-4 text-amber-500" />
              Stockout Risk Priorities
            </h3>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400"
            >
              All Inventory
            </button>
          </div>

          <div className="space-y-2">
            {phc.critical_medicines.map((m: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {m.medicine_name}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Stock: {m.current_stock} units • Burn: {m.daily_consumption}/day
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="font-mono font-bold text-red-500">
                      {m.days_remaining}d Left
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Lead time: {m.supplier_lead_time_days}d
                    </span>
                  </div>
                  <Badge variant="risk" riskLevel={m.risk_level} dot>
                    {m.risk_level}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
