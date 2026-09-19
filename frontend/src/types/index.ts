export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type RedistributionStatus = 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'DELIVERED';
export type UserRole = 'NATIONAL_ADMIN' | 'STATE_ADMIN' | 'DISTRICT_ADMIN' | 'PHC_ADMIN' | 'SUPPLY_CHAIN_MANAGER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  state_id?: number | null;
  district_id?: number | null;
  phc_id?: number | null;
}

export interface DashboardKPIs {
  total_phcs: number;
  critical_alerts: number;
  medicines_at_risk: number;
  available_beds: number;
  total_beds: number;
  bed_occupancy_rate: number;
  staff_on_duty: number;
  staff_attendance_rate: number;
  active_redistributions: number;
  forecast_accuracy: number;
}

export interface MapMarkerItem {
  phc_id: number;
  phc_code: string;
  phc_name: string;
  district_id: number;
  district_name: string;
  state_name: string;
  latitude: float;
  longitude: float;
  risk_category: RiskLevel;
  risk_score: number;
  bed_occupancy_rate: number;
  staff_attendance_rate: number;
  stock_out_medicines_count: number;
  fever_surge: boolean;
}

type float = number;

export interface AlertItem {
  id: number;
  alert_code: string;
  phc_id: number;
  phc_name: string;
  district_name: string;
  state_name: string;
  category: string;
  severity: RiskLevel;
  title: string;
  resource_name?: string;
  reason: string;
  prediction?: string;
  ai_explanation?: string;
  recommended_action?: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  phc_id?: number;
  phc_name?: string;
  phc?: any;
  district_name?: string;
  district?: any;
  state_name?: string;
  state?: any;
  medicine_id?: number;
  medicine_code?: string;
  medicine_name?: string;
  medicine?: any;
  medicine_category?: string;
  unit?: string;
  unit_cost_inr?: number;
  current_stock: number;
  daily_consumption: number;
  days_remaining: number;
  forecasted_demand_7d?: number;
  incoming_stock?: number;
  supplier_lead_time_days?: number;
  risk_level: RiskLevel | any;
  stock_out_probability: number;
  last_updated?: string;
}

export interface InventoryDetail extends InventoryItem {
  batch_number?: string;
  reorder_level?: number;
  forecast_7d?: number;
  forecast_14d?: number;
  forecast_30d?: number;
  total_forecast_7d?: number;
  forecast_trend?: string;
  confidence_score?: number;
  forecast_points_7d?: Array<{
    date: string;
    day_name?: string;
    predicted_demand?: number;
    lower_bound?: number;
    upper_bound?: number;
  }>;
  supplier_name?: string;
  supplier?: any;
  ai_risk_explanation?: string | Record<string, any>;
  recommended_action?: string;
  recommended_actions?: string[];
  historical_consumption_30d?: Array<{
    date: string;
    quantity_consumed?: number;
    is_anomaly?: boolean;
  }>;
  contributing_factors?: Record<string, any>;
}

export interface PHCItem {
  id: number;
  code: string;
  name: string;
  district_id: number;
  district_name: string;
  state_name: string;
  tier: string;
  latitude: number;
  longitude: number;
  catchment_population: number;
  contact_phone: string;
  is_active: boolean;
  current_risk_score: number;
  risk_category: RiskLevel;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  attendance_rate: number;
  medicines_at_risk: number;
  active_alerts: number;
}

export interface RedistributionItem {
  id: number;
  recommendation_code: string;
  source_district_id: number;
  source_district_name: string;
  source_phc_id?: number;
  source_surplus_quantity: number;
  dest_district_id: number;
  dest_district_name: string;
  dest_phc_id?: number;
  dest_deficit_quantity: number;
  medicine_id: number;
  medicine_name: string;
  medicine_category?: string;
  recommended_quantity: number;
  urgency: RiskLevel;
  reason: string;
  estimated_transit_hours: number;
  estimated_impact: string;
  status: RedistributionStatus;
  approved_by?: string;
  approved_at?: string;
  tracking_number?: string;
  vehicle_details?: string;
  temperature_logged_celsius?: number;
  created_at: string;
}

export interface FederatedNodeItem {
  id: number;
  node_name: string;
  country_code: string;
  country_name: string;
  status: string;
  local_data_points: number;
  local_accuracy: number;
  last_sync_time: string;
}

export interface FederatedRoundItem {
  round_number: number;
  global_aggregated_accuracy: number;
  weights_divergence: number;
  parameters_size_kb: number;
  timestamp: string;
  node_accuracies: Array<{
    node_name: string;
    country_code: string;
    local_accuracy: number;
    local_loss: number;
  }>;
}

export interface CopilotResponse {
  answer: string;
  supporting_metrics?: Record<string, any>;
  affected_phcs?: string[];
  recommended_actions?: string[];
  confidence: number;
  is_live_gemini: boolean;
  model_used?: string;
  summary?: string;
  evidence?: string[];
  risk_level?: string;
  data_limitations?: string;
}

