import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Filter, BedDouble, Users2, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { PHCItem } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';

export const PhcManagement: React.FC = () => {
  const [phcs, setPhcs] = useState<PHCItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');
  const navigate = useNavigate();

  const loadPhcs = async () => {
    try {
      setLoading(true);
      const res = await api.getPhcs({
        search: search || undefined,
        state: selectedState !== 'All' ? selectedState : undefined,
        district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
        risk: selectedRisk !== 'All' ? selectedRisk : undefined,
        tier: selectedTier !== 'All' ? selectedTier : undefined,
        limit: 100,
      });
      setPhcs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load PHCs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPhcs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedState, selectedDistrict, selectedRisk, selectedTier]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Primary Health Centre (PHC) Network
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {total} MONITORED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time facility capacity, bed occupancy rates, duty staff attendance, and risk classification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton filename="resilience-phc-network" data={phcs} />
          <button
            onClick={loadPhcs}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PHC name, code, or district..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* State Filter */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
        >
          <option value="All">All States</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Kerala">Kerala</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Telangana">Telangana</option>
          <option value="Maharashtra">Maharashtra</option>
        </select>

        {/* Risk Filter */}
        <select
          value={selectedRisk}
          onChange={(e) => setSelectedRisk(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
        >
          <option value="All">All Risk Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="LOW">Low / Normal</option>
        </select>

        {/* Tier Filter */}
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
        >
          <option value="All">All Facility Tiers</option>
          <option value="Tier-1">Tier-1 PHC</option>
          <option value="Tier-2">Tier-2 PHC</option>
          <option value="CHC">24x7 Community Health Centre (CHC)</option>
          <option value="Urban PHC">Urban Health Post</option>
        </select>
      </div>

      {/* Grid of PHC Cards */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {phcs.map((phc) => (
            <div
              key={phc.id}
              onClick={() => navigate(`/phcs/${phc.id}`)}
              className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500/50 transition-all cursor-pointer space-y-4 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 transition-colors">
                    {phc.name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {phc.district_name} District, {phc.state_name} • <span className="font-mono text-[10px]">{phc.tier}</span>
                  </div>
                </div>
                <Badge variant="risk" riskLevel={phc.risk_category} dot>
                  {phc.risk_category}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Beds</span>
                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                    {phc.occupied_beds}/{phc.total_beds} ({phc.occupancy_rate}%)
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Attendance</span>
                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                    {phc.attendance_rate}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Meds Risk</span>
                  <span className={`text-xs font-bold font-mono ${phc.medicines_at_risk > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {phc.medicines_at_risk} Meds
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 text-[11px]">
                  Catchment: ~{formatNumber(phc.catchment_population)}
                </span>
                <span className="text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Facility
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
