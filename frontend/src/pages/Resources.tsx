import React, { useState, useEffect } from 'react';
import { BedDouble, Activity, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';

export const Resources: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadResources = async () => {
    try {
      setLoading(true);
      const res = await api.getResources();
      setData(res);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 animate-pulse" />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const { summary, district_capacity } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Bed Capacity &amp; Resource Utilization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time inpatient capacity, ICU bed saturation, oxygen beds, and isolation ward analytics across PHCs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton filename="resilience-bed-capacity" data={district_capacity} />
          <button
            onClick={loadResources}
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
          title="Total Beds"
          value={formatNumber(summary.total_beds)}
          subtitle={`${summary.available_beds} Available`}
          icon={BedDouble}
          highlightColor="blue"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${summary.overall_occupancy_rate}%`}
          subtitle="Network Average"
          icon={Activity}
          highlightColor={summary.overall_occupancy_rate > 80 ? 'red' : 'emerald'}
        />
        <StatCard
          title="ICU Beds"
          value={`${summary.icu_occupied} / ${summary.icu_total}`}
          subtitle={`${summary.icu_occupancy_rate}% Occupancy`}
          icon={ShieldAlert}
          highlightColor="amber"
        />
        <StatCard
          title="Oxygen Beds"
          value={`${summary.oxygen_occupied} / ${summary.oxygen_total}`}
          subtitle={`${summary.oxygen_occupancy_rate}% Occupancy`}
          icon={CheckCircle2}
          highlightColor="teal"
        />
      </div>

      {/* District Capacity Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            District-Level Bed Utilization Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 font-mono">Total Beds</th>
                <th className="py-3 px-4 font-mono">Occupied</th>
                <th className="py-3 px-4 font-mono">Available</th>
                <th className="py-3 px-4 font-mono">ICU Beds</th>
                <th className="py-3 px-4 font-mono">Oxygen Beds</th>
                <th className="py-3 px-4 font-mono">Occupancy %</th>
                <th className="py-3 px-4">Capacity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {district_capacity.map((d: any) => (
                <tr key={d.district_id} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {d.district_name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {d.state_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {d.total_beds}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {d.occupied_beds}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-500 font-semibold">
                    {d.available_beds}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {d.icu_beds}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {d.oxygen_beds}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={d.occupancy_rate > 90 ? 'text-red-500' : d.occupancy_rate > 75 ? 'text-amber-500' : 'text-emerald-500'}>
                      {d.occupancy_rate}%
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
