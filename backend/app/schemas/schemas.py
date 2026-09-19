from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    phc_id: Optional[int] = None
    is_active: bool

# --- Geography & PHC Schemas ---
class PHCBase(BaseModel):
    id: int
    code: str
    name: str
    district_id: int
    district_name: str
    state_name: str
    tier: str
    latitude: float
    longitude: float
    catchment_population: int
    current_risk_score: float
    risk_category: str
    is_active: bool

class PHCDetailOut(PHCBase):
    total_beds: int
    occupied_beds: int
    available_beds: int
    occupancy_rate: float
    total_staff_present: int
    total_staff_sanctioned: int
    attendance_rate: float
    active_alerts_count: int
    medicines_at_risk_count: int
    recent_footfall_daily: List[Dict[str, Any]]
    critical_medicines: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]

# --- Inventory & Medicine Schemas ---
class MedicineOut(BaseModel):
    id: int
    code: str
    name: str
    category: str
    unit: str
    unit_cost_inr: float
    standard_daily_demand: float
    safety_stock_days: int

class InventoryItemOut(BaseModel):
    id: int
    phc_id: int
    phc_name: str
    district_name: str
    state_name: str
    medicine_id: int
    medicine_name: str
    medicine_category: str
    current_stock: int
    daily_consumption: float
    days_remaining: float
    forecasted_demand_7d: float
    incoming_stock: int
    supplier_lead_time_days: int
    risk_level: str
    stock_out_probability: float
    last_updated: datetime

class InventoryDetailOut(InventoryItemOut):
    historical_consumption_30d: List[Dict[str, Any]]
    forecast_7d: float
    forecast_14d: float
    forecast_30d: float
    forecast_trend: str
    confidence_score: float
    supplier_name: Optional[str] = None
    ai_risk_explanation: str
    recommended_action: str

# --- Forecasting & ML Schemas ---
class ForecastPoint(BaseModel):
    date: str
    predicted_demand: float
    lower_bound: float
    upper_bound: float

class ForecastOut(BaseModel):
    medicine_name: str
    phc_name: str
    current_avg_daily_demand: float
    forecast_7d: float
    forecast_14d: float
    forecast_30d: float
    demand_change_percent: float
    confidence: float
    trend: str
    forecast_points: List[ForecastPoint]

# --- Risk Engine Schemas ---
class RiskScoreOut(BaseModel):
    id: int
    phc_name: str
    district_name: str
    medicine_name: str
    stock_out_probability: float
    risk_level: str
    days_stock_remaining: float
    current_stock: int
    daily_consumption_rate: float
    supplier_lead_time_days: int
    contributing_factors: Dict[str, Any]
    recommended_action: str
    confidence: float

# --- Anomaly Schemas ---
class AnomalyOut(BaseModel):
    phc_id: int
    phc_name: str
    district_name: str
    anomaly_type: str # FOOTFALL_SURGE, CONSUMPTION_SPIKE, STAFF_ABSENTEEISM, BED_PRESSURE
    metric_value: float
    expected_value: float
    deviation_percent: float
    z_score: float
    severity: str
    description: str
    timestamp: datetime

# --- Alert Schemas ---
class AlertOut(BaseModel):
    id: int
    alert_code: str
    phc_id: int
    phc_name: str
    district_name: str
    state_name: str
    category: str
    severity: str
    title: str
    resource_name: Optional[str] = None
    reason: str
    prediction: Optional[str] = None
    ai_explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    status: str
    created_at: datetime

class AlertActionRequest(BaseModel):
    action: str # acknowledge, resolve, dismiss
    user_name: Optional[str] = "Admin User"
    notes: Optional[str] = None

# --- Workforce Schemas ---
class WorkforceSummaryOut(BaseModel):
    total_staff_sanctioned: int
    total_staff_present: int
    total_on_leave: int
    overall_attendance_rate: float
    shortage_alerts_count: int
    role_breakdown: List[Dict[str, Any]]
    district_workforce: List[Dict[str, Any]]

# --- Resources & Bed Schemas ---
class ResourceCapacityOut(BaseModel):
    total_beds: int
    occupied_beds: int
    available_beds: int
    overall_occupancy_rate: float
    icu_total: int
    icu_occupied: int
    icu_occupancy_rate: float
    oxygen_total: int
    oxygen_occupied: int
    oxygen_occupancy_rate: float
    isolation_total: int
    isolation_occupied: int
    isolation_occupancy_rate: float
    critical_phcs_count: int
    capacity_distribution: List[Dict[str, Any]]

# --- Redistribution Schemas ---
class RedistributionRecommendationOut(BaseModel):
    id: int
    recommendation_code: str
    source_district_id: int
    source_district_name: str
    source_surplus_quantity: int
    dest_district_id: int
    dest_district_name: str
    dest_deficit_quantity: int
    medicine_id: int
    medicine_name: str
    recommended_quantity: int
    urgency: str
    reason: str
    estimated_transit_hours: float
    estimated_impact: str
    status: str
    created_at: datetime
    tracking_number: Optional[str] = None

class RedistributionActionRequest(BaseModel):
    user_name: Optional[str] = "Admin User"
    notes: Optional[str] = None

# --- Emergency Simulation Schemas ---
class EmergencySimulationRequest(BaseModel):
    event_type: str # DENGUE_OUTBREAK, MONSOON_FLOOD, HEATWAVE_CRISIS, RESPIRATORY_SURGE
    affected_district_name: Optional[str] = "Namakkal"
    intensity_multiplier: Optional[float] = 1.6

class EmergencySimulationResponse(BaseModel):
    event_id: int
    event_type: str
    event_name: str
    affected_district: str
    status: str
    before_metrics: Dict[str, Any]
    after_metrics: Dict[str, Any]
    new_critical_alerts_count: int
    new_redistributions_count: int
    ai_situation_summary: str
    recommended_emergency_actions: List[str]

# --- Federated AI Schemas ---
class FederatedNodeOut(BaseModel):
    id: int
    node_name: str
    country_code: str
    country_name: str
    status: str
    local_data_points: int
    local_accuracy: float
    last_sync_time: datetime

class FederatedRoundOut(BaseModel):
    round_number: int
    node_accuracies: List[Dict[str, Any]]
    global_aggregated_accuracy: float
    weights_divergence: float
    parameters_size_kb: float
    timestamp: datetime

class TrainRoundRequest(BaseModel):
    epochs_per_node: Optional[int] = 5
    aggregation_strategy: Optional[str] = "FedAvg"

# --- Gemini Copilot Schemas ---
class CopilotQueryRequest(BaseModel):
    query: str
    context_filters: Optional[Dict[str, Any]] = None

class CopilotQueryResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    answer: str
    supporting_metrics: Optional[Dict[str, Any]] = None
    affected_phcs: Optional[List[str]] = None
    recommended_actions: Optional[List[str]] = None
    confidence: float = 0.94
    is_live_gemini: bool = False
    model_used: Optional[str] = "Grounded Heuristic Fallback"
    # Structured response fields for hackathon-grade operational intelligence
    summary: Optional[str] = None
    evidence: Optional[List[str]] = None
    risk_level: Optional[str] = None
    data_limitations: Optional[str] = None

# --- Dashboard Schemas ---
class DashboardKPIs(BaseModel):
    total_phcs: int
    critical_alerts: int
    medicines_at_risk: int
    available_beds: int
    total_beds: int
    bed_occupancy_rate: float
    staff_on_duty: int
    staff_attendance_rate: float
    active_redistributions: int
    forecast_accuracy: float

class NationalMapItem(BaseModel):
    phc_id: int
    phc_code: str
    phc_name: str
    district_id: int
    district_name: str
    state_name: str
    latitude: float
    longitude: float
    risk_category: str # LOW, MEDIUM, HIGH, CRITICAL
    risk_score: float
    bed_occupancy_rate: float
    staff_attendance_rate: float
    stock_out_medicines_count: int
    fever_surge: bool

class DashboardSummary(BaseModel):
    kpis: DashboardKPIs
    map_markers: List[NationalMapItem]
    top_critical_alerts: List[AlertOut]
    medicines_at_risk: List[InventoryItemOut]
    top_redistributions: List[RedistributionRecommendationOut]
    national_trends_7d: List[Dict[str, Any]]
    emergency_active: bool
    active_emergency_details: Optional[Dict[str, Any]] = None
