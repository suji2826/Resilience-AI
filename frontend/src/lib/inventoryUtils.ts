import { RiskLevel } from '../types';

/**
 * Robust scalar extractors for inventory items.
 * Prevents React from ever crashing with "Objects are not valid as a React child"
 * even if backend returns nested objects or unexpected types.
 */

export const getMedicineName = (item: any): string => {
  if (!item) return 'Unknown Medicine';
  if (typeof item.medicine_name === 'string' && item.medicine_name.trim()) {
    return item.medicine_name.trim();
  }
  if (typeof item.medicine === 'object' && item.medicine !== null) {
    if (typeof item.medicine.name === 'string' && item.medicine.name.trim()) {
      return item.medicine.name.trim();
    }
  }
  if (typeof item.medicine === 'string' && item.medicine.trim()) {
    return item.medicine.trim();
  }
  if (typeof item.name === 'string' && item.name.trim()) {
    return item.name.trim();
  }
  return 'Unknown Medicine';
};

export const getMedicineCategory = (item: any): string => {
  if (!item) return 'General';
  if (typeof item.medicine_category === 'string' && item.medicine_category.trim()) {
    return item.medicine_category.trim();
  }
  if (typeof item.medicine === 'object' && item.medicine !== null) {
    if (typeof item.medicine.category === 'string' && item.medicine.category.trim()) {
      return item.medicine.category.trim();
    }
  }
  if (typeof item.category === 'string' && item.category.trim()) {
    return item.category.trim();
  }
  return 'General';
};

export const getPhcName = (item: any): string => {
  if (!item) return 'Primary Health Centre';
  if (typeof item.phc_name === 'string' && item.phc_name.trim()) {
    return item.phc_name.trim();
  }
  if (typeof item.phc === 'object' && item.phc !== null) {
    if (typeof item.phc.name === 'string' && item.phc.name.trim()) {
      return item.phc.name.trim();
    }
  }
  if (typeof item.phc === 'string' && item.phc.trim()) {
    return item.phc.trim();
  }
  return 'Primary Health Centre';
};

export const getDistrictName = (item: any): string => {
  if (!item) return 'District';
  if (typeof item.district_name === 'string' && item.district_name.trim()) {
    return item.district_name.trim();
  }
  if (typeof item.district === 'object' && item.district !== null) {
    if (typeof item.district.name === 'string' && item.district.name.trim()) {
      return item.district.name.trim();
    }
  }
  if (typeof item.phc === 'object' && item.phc !== null) {
    if (typeof item.phc.district === 'object' && item.phc.district !== null) {
      if (typeof item.phc.district.name === 'string') return item.phc.district.name.trim();
    }
    if (typeof item.phc.district_name === 'string') return item.phc.district_name.trim();
  }
  if (typeof item.district === 'string' && item.district.trim()) {
    return item.district.trim();
  }
  return 'District';
};

export const getStateName = (item: any): string => {
  if (!item) return 'India';
  if (typeof item.state_name === 'string' && item.state_name.trim()) {
    return item.state_name.trim();
  }
  if (typeof item.state === 'object' && item.state !== null) {
    if (typeof item.state.name === 'string' && item.state.name.trim()) {
      return item.state.name.trim();
    }
  }
  if (typeof item.state === 'string' && item.state.trim()) {
    return item.state.trim();
  }
  return 'India';
};

export const getRiskLevel = (item: any): RiskLevel => {
  if (!item) return 'LOW';
  let raw: any = item.risk_level ?? item.risk;
  if (typeof raw === 'object' && raw !== null) {
    raw = raw.level ?? raw.status ?? raw.tier ?? 'LOW';
  }
  if (typeof raw === 'string') {
    const upper = raw.toUpperCase();
    if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
      return upper as RiskLevel;
    }
  }
  return 'LOW';
};

export const getStockOutProbability = (item: any): number => {
  if (!item) return 0;
  let prob = item.stock_out_probability ?? item.stockout_probability;
  if (typeof prob === 'object' && prob !== null) {
    prob = prob.score ?? prob.probability ?? prob.value;
  }
  if (typeof prob === 'number' && !isNaN(prob)) {
    return Math.max(0, Math.min(1, prob));
  }
  if (typeof prob === 'string') {
    const parsed = parseFloat(prob);
    if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
  }
  return 0;
};

export const getNumber = (val: any, fallback = 0): number => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof val === 'object' && val !== null) {
    const num = val.value ?? val.amount ?? val.count ?? val.total;
    if (typeof num === 'number' && !isNaN(num)) return num;
  }
  return fallback;
};

export const getSupplierName = (item: any): string => {
  if (!item) return 'Central State Depot';
  if (typeof item.supplier_name === 'string' && item.supplier_name.trim()) {
    return item.supplier_name.trim();
  }
  if (typeof item.supplier === 'object' && item.supplier !== null) {
    if (typeof item.supplier.name === 'string' && item.supplier.name.trim()) {
      return item.supplier.name.trim();
    }
  }
  if (typeof item.supplier === 'string' && item.supplier.trim()) {
    return item.supplier.trim();
  }
  return 'Central State Depot';
};

export const getRiskExplanation = (detail: any): string => {
  if (!detail) return 'Stock-out risk evaluated from live consumption rate and buffer levels.';
  
  const exp = detail.ai_risk_explanation ?? detail.explainability_summary ?? detail.risk_explanation;
  if (typeof exp === 'string' && exp.trim()) {
    return exp.trim();
  }

  // If explanation is an object (like contributing_factors dictionary)
  if (typeof exp === 'object' && exp !== null) {
    if (typeof exp.explainability_summary === 'string' && exp.explainability_summary.trim()) {
      return exp.explainability_summary.trim();
    }
    if (typeof exp.summary === 'string' && exp.summary.trim()) {
      return exp.summary.trim();
    }
    if (typeof exp.message === 'string' && exp.message.trim()) {
      return exp.message.trim();
    }
    const factors: string[] = [];
    if (exp.days_remaining !== undefined) factors.push(`${exp.days_remaining} days remaining`);
    if (exp.effective_daily_burn !== undefined) factors.push(`burn rate of ${exp.effective_daily_burn} units/day`);
    if (exp.supplier_lead_time_days !== undefined) factors.push(`supplier lead time of ${exp.supplier_lead_time_days} days`);
    if (exp.lead_time_deficit_days && Number(exp.lead_time_deficit_days) > 0) {
      factors.push(`lead time deficit of ${exp.lead_time_deficit_days} days`);
    }
    if (factors.length > 0) {
      return `Critical risk evaluation factors: ${factors.join(', ')}. Immediate buffer replenishment recommended.`;
    }
  }

  // Fallback to factors if available
  const factors = detail.contributing_factors;
  if (typeof factors === 'object' && factors !== null) {
    const list: string[] = [];
    if (factors.days_remaining !== undefined) list.push(`${factors.days_remaining} days stock left`);
    if (factors.effective_daily_burn !== undefined) list.push(`burn rate of ${factors.effective_daily_burn} units/day`);
    if (list.length > 0) {
      return `AI Risk Analysis: ${list.join(', ')}.`;
    }
  }

  return 'Stock-out risk is continuously evaluated based on historical burn velocity, local footfall trends, and supplier replenishment window.';
};

export const getRecommendedAction = (detail: any): string => {
  if (!detail) return 'Monitor stock depletion rate.';
  const rec = detail.recommended_action ?? detail.action;
  if (typeof rec === 'string' && rec.trim()) return rec.trim();
  if (Array.isArray(detail.recommended_actions) && detail.recommended_actions.length > 0) {
    const first = detail.recommended_actions[0];
    if (typeof first === 'string') return first;
  }
  return 'Review stock replenishment options via regional redistribution.';
};

export const formatLastUpdated = (timestamp?: string | null): string => {
  if (!timestamp) return '—';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};
