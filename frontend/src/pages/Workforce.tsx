import React, { useState, useEffect } from 'react';
import { Users2, ShieldAlert, CheckCircle2, UserCheck, AlertTriangle, ArrowUpDown, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';

export const Workforce: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkforce = async () => {
    try {
      setLoading(true);
      const res = await api.getWorkforce();
      setData(res);
    } catch (err) {
      console.error('Failed to load workforce:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkforce();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 animate-pulse" />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const { summary, role_breakdown, district_workforce } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Workforce Intelligence &amp; Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time duty roster monitoring, doctor/nurse shortages, and attendance rate analytics across PHCs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton filename="resilience-workforce" data={district_workforce} />
          <button
            onClick={loadWorkforce}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Sanctioned Posts"
          value={formatNumber(summary.total_staff_sanctioned)}
          subtitle="Medical & Allied Staff"
          icon={Users2}
          highlightColor="blue"
        />
        <StatCard
          title="Present Today"
          value={formatNumber(summary.total_staff_present)}
          subtitle="On Duty Shifts"
          icon={UserCheck}
          highlightColor="emerald"
        />
        <StatCard
          title="Attendance Rate"
          value={`${summary.overall_attendance_rate}%`}
          subtitle="Network Average"
          icon={CheckCircle2}
          highlightColor="teal"
        />
        <StatCard
          title="Shortage Hotspots"
          value={summary.districts_with_shortages}
          subtitle="Attendance < 82%"
          icon={AlertTriangle}
          highlightColor="red"
          badge={summary.districts_with_shortages > 0 ? "ATTENTION" : undefined}
        />
      </div>

      {/* Role Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {role_breakdown.map((r: any, i: number) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {r.display_name}
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {r.present} / {r.sanctioned}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Attendance:</span>
              <span className={`font-bold font-mono ${r.attendance_rate < 80 ? 'text-red-500' : 'text-emerald-500'}`}>
                {r.attendance_rate}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* District Workforce Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            District-Level Workforce Attendance Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 font-mono">PHCs</th>
                <th className="py-3 px-4 font-mono">Sanctioned</th>
                <th className="py-3 px-4 font-mono">Present</th>
                <th className="py-3 px-4 font-mono">On Leave</th>
                <th className="py-3 px-4 font-mono">Attendance %</th>
                <th className="py-3 px-4">Staffing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {district_workforce.map((d: any) => (
                <tr key={d.district_id} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {d.district_name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {d.state_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {d.phcs_count}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {d.sanctioned_staff}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {d.present_staff}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                    {d.on_leave}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={d.attendance_rate < 75 ? 'text-red-500' : d.attendance_rate < 85 ? 'text-amber-500' : 'text-emerald-500'}>
                      {d.attendance_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="risk" riskLevel={d.status === 'CRITICAL' ? 'CRITICAL' : d.status === 'WARNING' ? 'HIGH' : 'LOW'}>
                      {d.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
