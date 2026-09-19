import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertTriangle, Activity, Bed, Users, ShieldAlert, X, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapMarkerItem, RiskLevel } from '../../types';
import { Badge } from '../common/Badge';
import { getRiskBadgeClass, getRiskDotColor } from '../../lib/utils';

interface IndiaMapProps {
  markers: MapMarkerItem[];
  selectedState?: string;
  onSelectState?: (state: string) => void;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({ markers, selectedState = 'All', onSelectState }) => {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarkerItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const navigate = useNavigate();

  // Geo bounds for India projection on canvas (approx lat: 8.0 to 22.0, lon: 73.0 to 84.0)
  const minLat = 8.0;
  const maxLat = 22.0;
  const minLng = 73.0;
  const maxLng = 84.0;

  const projectCoords = (lat: number, lng: number) => {
    // Map to 0-100% SVG coordinate space
    const x = ((lng - minLng) / (maxLng - minLng)) * 80 + 10;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 80 + 10;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const filteredMarkers = markers.filter(m => {
    if (selectedState !== 'All' && m.state_name !== selectedState) return false;
    if (activeFilter === 'CRITICAL' && m.risk_category !== 'CRITICAL') return false;
    if (activeFilter === 'HIGH' && m.risk_category !== 'HIGH') return false;
    if (activeFilter === 'LOW' && m.risk_category !== 'LOW') return false;
    return true;
  });

  return (
    <div className="relative bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm overflow-hidden flex flex-col">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              National Healthcare Geospatial Intelligence
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              LIVE NETWORK
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any PHC marker to inspect telemetry, bed saturation, and stock-out predictions.
          </p>
        </div>

        {/* Risk Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {['All', 'CRITICAL', 'HIGH', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveFilter(lvl)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeFilter === lvl
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {lvl === 'All' ? 'All (98)' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Map Graphic Canvas */}
      <div className="relative w-full h-[420px] lg:h-[480px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

        {/* State outlines / Geo styling */}
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <radialGradient id="glowRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowTeal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Stylized State Regional Polygons */}
          <path
            d="M 45 68 L 62 65 L 58 88 L 48 94 Z"
            fill="#1e293b"
            fillOpacity="0.35"
            stroke="#334155"
            strokeWidth="0.3"
            strokeDasharray="1 1"
          />
          <text x="50" y="80" fill="#475569" fontSize="2.8" fontWeight="600" textAnchor="middle">
            TAMIL NADU
          </text>

          <path
            d="M 36 70 L 44 68 L 46 92 L 40 94 Z"
            fill="#1e293b"
            fillOpacity="0.35"
            stroke="#334155"
            strokeWidth="0.3"
            strokeDasharray="1 1"
          />
          <text x="39" y="82" fill="#475569" fontSize="2.5" fontWeight="600" textAnchor="middle">
            KERALA
          </text>

          <path
            d="M 28 45 L 48 42 L 52 64 L 32 68 Z"
            fill="#1e293b"
            fillOpacity="0.35"
            stroke="#334155"
            strokeWidth="0.3"
            strokeDasharray="1 1"
          />
          <text x="38" y="55" fill="#475569" fontSize="2.8" fontWeight="600" textAnchor="middle">
            KARNATAKA
          </text>

          <path
            d="M 50 48 L 78 45 L 68 68 L 52 64 Z"
            fill="#1e293b"
            fillOpacity="0.35"
            stroke="#334155"
            strokeWidth="0.3"
            strokeDasharray="1 1"
          />
          <text x="64" y="56" fill="#475569" fontSize="2.8" fontWeight="600" textAnchor="middle">
            ANDHRA / TELANGANA
          </text>

          <path
            d="M 22 20 L 52 18 L 48 42 L 24 45 Z"
            fill="#1e293b"
            fillOpacity="0.35"
            stroke="#334155"
            strokeWidth="0.3"
            strokeDasharray="1 1"
          />
          <text x="35" y="32" fill="#475569" fontSize="2.8" fontWeight="600" textAnchor="middle">
            MAHARASHTRA
          </text>
        </svg>

        {/* PHC Markers */}
        <div className="absolute inset-0">
          {filteredMarkers.map((marker) => {
            const { x, y } = projectCoords(marker.latitude, marker.longitude);
            const isCrit = marker.risk_category === 'CRITICAL';
            const isHigh = marker.risk_category === 'HIGH';
            const color = getRiskDotColor(marker.risk_category);

            return (
              <div
                key={marker.phc_id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                onClick={() => setSelectedMarker(marker)}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                {/* Pulse ring for critical/high */}
                {(isCrit || isHigh) && (
                  <span
                    className={`absolute -inset-2 rounded-full animate-ping opacity-75 ${
                      isCrit ? 'bg-red-500' : 'bg-orange-500'
                    }`}
                  />
                )}

                {/* Marker Dot */}
                <div
                  style={{ backgroundColor: color }}
                  className={`relative rounded-full border-2 border-slate-950 transition-all transform group-hover:scale-150 ${
                    isCrit ? 'w-4 h-4 shadow-glow-red ring-2 ring-red-500/50' : isHigh ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5 opacity-90'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Hover Tooltip */}
        {hoveredMarker && (
          <div
            style={{
              left: `${projectCoords(hoveredMarker.latitude, hoveredMarker.longitude).x}%`,
              top: `${projectCoords(hoveredMarker.latitude, hoveredMarker.longitude).y - 8}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-xl text-white shadow-xl text-xs space-y-1 min-w-[180px]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-100 truncate">{hoveredMarker.phc_name}</span>
              <span
                style={{ color: getRiskDotColor(hoveredMarker.risk_category) }}
                className="font-mono text-[10px] font-bold"
              >
                {hoveredMarker.risk_category}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>District:</span>
              <span className="text-slate-200 font-medium">{hoveredMarker.district_name}</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Bed Occupancy:</span>
              <span className="text-slate-200 font-mono font-medium">{hoveredMarker.bed_occupancy_rate}%</span>
            </div>
            {hoveredMarker.stock_out_medicines_count > 0 && (
              <div className="text-[10px] text-red-400 font-semibold flex items-center gap-1 pt-0.5">
                <AlertTriangle className="w-3 h-3" />
                {hoveredMarker.stock_out_medicines_count} medicines at risk
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-xl text-[11px] text-slate-300 flex items-center gap-3 shadow-md z-20">
          <span className="text-slate-500 font-medium">Risk Status:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-semibold">Critical Pulse</span>
          </div>
        </div>
      </div>

      {/* Selected PHC Slide-out Drawer */}
      <AnimatePresence>
        {selectedMarker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedMarker.phc_name}
                </h4>
                <Badge variant="risk" riskLevel={selectedMarker.risk_category} dot>
                  {selectedMarker.risk_category} RISK
                </Badge>
                <span className="text-xs font-mono text-slate-500">
                  ({selectedMarker.phc_code})
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedMarker.district_name} District, {selectedMarker.state_name} • Coords: {selectedMarker.latitude.toFixed(3)}°N, {selectedMarker.longitude.toFixed(3)}°E
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400 block text-[10px]">Bed Occupancy</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {selectedMarker.bed_occupancy_rate}%
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400 block text-[10px]">Staff Attendance</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {selectedMarker.staff_attendance_rate}%
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400 block text-[10px]">Stockout Risk</span>
                <span className="font-bold text-red-500 dark:text-red-400 font-mono">
                  {selectedMarker.stock_out_medicines_count} Meds
                </span>
              </div>

              <button
                onClick={() => navigate(`/phcs/${selectedMarker.phc_id}`)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-all"
              >
                Inspect PHC
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedMarker(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
