import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Search, Filter, AlertTriangle, ArrowUpDown, ChevronRight, Download, RefreshCw, PackageX } from 'lucide-react';
import { api } from '../lib/api';
import { InventoryItem } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton, ExportButton, ErrorState } from '../components/common/CommonUI';
import { formatNumber } from '../lib/utils';
import {
  getMedicineName,
  getMedicineCategory,
  getPhcName,
  getDistrictName,
  getStateName,
  getRiskLevel,
  getStockOutProbability,
  getNumber,
} from '../lib/inventoryUtils';

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInventory({
        search: search || undefined,
        risk: selectedRisk !== 'All' ? selectedRisk : undefined,
        district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        limit: 100,
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(typeof res?.total === 'number' ? res.total : (res?.items?.length || 0));
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setError(typeof err?.message === 'string' ? err.message : 'Failed to load medicine inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedRisk, selectedDistrict, selectedCategory]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-command-text dark:text-white">
              Medicine Inventory &amp; Stock-Out Risk
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
              {total} ENTRIES
            </span>
          </div>
          <p className="text-xs sm:text-sm text-command-muted dark:text-slate-400 mt-1">
            Real-time stock depletion velocity, supplier lead time gaps, and predictive stock-out risk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton filename="resilience-medicine-inventory" data={items} />
          <button
            onClick={loadInventory}
            className="p-2.5 rounded-xl text-command-muted dark:text-slate-400 hover:text-command-text dark:hover:text-white bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle transition-all"
            title="Refresh Inventory"
            aria-label="Refresh Inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine, PHC name, or district..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-800 text-command-text dark:text-white placeholder-slate-400 border border-command-border dark:border-navy-border focus:outline-none focus:border-tomato-500 transition-colors"
          />
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-command-muted dark:text-slate-400 font-medium">Risk:</span>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-800 text-command-text dark:text-white border border-command-border dark:border-navy-border focus:outline-none focus:border-tomato-500"
          >
            <option value="All">All Risk Levels</option>
            <option value="CRITICAL">Critical (&lt; 3 Days)</option>
            <option value="HIGH">High (3-7 Days)</option>
            <option value="MEDIUM">Medium (7-14 Days)</option>
            <option value="LOW">Low (&gt; 14 Days)</option>
          </select>
        </div>

        {/* District Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-command-muted dark:text-slate-400 font-medium">District:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-800 text-command-text dark:text-white border border-command-border dark:border-navy-border focus:outline-none focus:border-tomato-500"
          >
            <option value="All">All Districts</option>
            <option value="Namakkal">Namakkal (Crisis Focus)</option>
            <option value="Salem">Salem (Surplus Hub)</option>
            <option value="Coimbatore">Coimbatore</option>
            <option value="Erode">Erode</option>
            <option value="Ernakulam">Ernakulam</option>
            <option value="Bengaluru Urban">Bengaluru Urban</option>
            <option value="Pune">Pune</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-command-border dark:border-navy-border shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={8} />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={loadInventory} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <PackageX className="w-10 h-10 text-command-muted dark:text-slate-500" />
            <div className="text-sm font-bold text-command-text dark:text-white">
              No inventory records match your filter criteria
            </div>
            <p className="text-xs text-command-muted dark:text-slate-400">
              Try resetting the search query or risk filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-navy-850 text-[10px] uppercase font-bold text-command-muted dark:text-slate-400 border-b border-command-border dark:border-navy-border">
                <tr>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">PHC &amp; District</th>
                  <th className="py-3 px-4 font-mono">Current Stock</th>
                  <th className="py-3 px-4 font-mono">Daily Burn</th>
                  <th className="py-3 px-4 font-mono">Days Remaining</th>
                  <th className="py-3 px-4 font-mono">7D Forecast</th>
                  <th className="py-3 px-4 font-mono">Lead Time</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {items.map((item) => {
                  const medicineName = getMedicineName(item);
                  const medicineCategory = getMedicineCategory(item);
                  const phcName = getPhcName(item);
                  const districtName = getDistrictName(item);
                  const stateName = getStateName(item);
                  const riskLevel = getRiskLevel(item);
                  const stockOutProb = getStockOutProbability(item);
                  const currentStock = getNumber(item.current_stock, 0);
                  const dailyBurn = getNumber(item.daily_consumption, 0);
                  const daysRemaining = getNumber(item.days_remaining, 0);
                  const forecast7d = typeof item.forecasted_demand_7d === 'number' ? item.forecasted_demand_7d : Math.round(dailyBurn * 7.5);
                  const leadTime = getNumber(item.supplier_lead_time_days, 5);
                  const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'units';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/inventory/${item.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-navy-800/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-bold text-command-text dark:text-white group-hover:text-tomato-500 transition-colors">
                        <div>{medicineName}</div>
                        <span className="text-[10px] text-command-muted dark:text-slate-400 font-mono">
                          {medicineCategory}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-command-text dark:text-slate-300">
                        <div className="font-semibold">{phcName}</div>
                        <div className="text-[10px] text-command-muted dark:text-slate-400">{districtName}, {stateName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-command-text dark:text-slate-200">
                        {formatNumber(currentStock)} <span className="text-[10px] text-command-muted dark:text-slate-400">{unit}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-command-text dark:text-slate-300">
                        {dailyBurn} /day
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={daysRemaining < 3.0 ? "text-red-500 dark:text-red-400" : daysRemaining < 7.0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"}>
                          {daysRemaining} days
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-command-text dark:text-slate-300">
                        {forecast7d}
                      </td>
                      <td className="py-3 px-4 font-mono text-command-text dark:text-slate-300">
                        {leadTime} days
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="risk" riskLevel={riskLevel} dot>
                          {riskLevel} ({(stockOutProb * 100).toFixed(0)}%)
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="p-1.5 rounded-lg text-command-muted dark:text-slate-400 group-hover:text-tomato-500 group-hover:bg-tomato-500/10 transition-colors"
                          aria-label={`View ${medicineName}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
