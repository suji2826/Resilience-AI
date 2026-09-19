"""
RESILIENCE AI — SQLAlchemy ORM Models
======================================
Complete relational schema for the healthcare resilience platform.

Entity hierarchy:
  Country → State → District → PHC
  Medicine → Inventory (per PHC)
  MedicineConsumption, PatientFootfall (time-series per PHC)
  Bed, Staff, StaffAttendance (operational per PHC)
  Alert, Forecast, RiskScore (AI outputs per PHC + Medicine)
  RedistributionRecommendation → RedistributionTransaction
  EmergencyEvent (crisis simulations)
  FederatedNode → FederatedTrainingRound (BRICS FL)
  ModelMetric, AuditLog (observability)
  Role → User (RBAC)
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


# ---------------------------------------------------------------------------
# Helper: server-side "now" default compatible with both SQLite and Postgres
# ---------------------------------------------------------------------------
_now = lambda: datetime.utcnow()  # noqa: E731


# ===========================================================================
# AUTH / RBAC
# ===========================================================================

class Role(Base):
    """
    Application role defining a set of permissions.
    Five roles are seeded: NATIONAL_ADMIN, STATE_ADMIN, DISTRICT_ADMIN,
    PHC_ADMIN, SUPPLY_CHAIN_MANAGER.
    """
    __tablename__ = "roles"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    # Stored as JSON list, e.g. ["*"] or ["state:*", "phc:view"]
    permissions = Column(JSON, nullable=True)
    created_at  = Column(DateTime, default=_now, nullable=False)

    users = relationship("User", back_populates="role")


class User(Base):
    """
    Platform user. Scoped to a State, District, or PHC depending on role.
    """
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(120), nullable=False)
    role_id         = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    # Optional geographic scope
    state_id    = Column(Integer, ForeignKey("states.id", ondelete="SET NULL"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    phc_id      = Column(Integer, ForeignKey("phcs.id", ondelete="SET NULL"), nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)
    last_login  = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=_now, nullable=False)
    updated_at  = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    role       = relationship("Role", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


# ===========================================================================
# GEO HIERARCHY: Country → State → District → PHC
# ===========================================================================

class Country(Base):
    """
    BRICS member nations providing federated learning nodes.
    Also the root of the India geo-hierarchy.
    """
    __tablename__ = "countries"

    id             = Column(Integer, primary_key=True, index=True)
    code           = Column(String(10), unique=True, nullable=False, index=True)  # IND, BRA …
    name           = Column(String(100), nullable=False)
    is_brics_member = Column(Boolean, default=True, nullable=False)
    created_at     = Column(DateTime, default=_now, nullable=False)

    states          = relationship("State", back_populates="country")
    federated_nodes = relationship("FederatedNode", back_populates="country")


class State(Base):
    """
    Indian state. Currently: Tamil Nadu, Kerala, Karnataka, AP, Telangana, MH.
    """
    __tablename__ = "states"
    __table_args__ = (
        UniqueConstraint("country_id", "code", name="uq_state_country_code"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False)
    code       = Column(String(10), nullable=False, index=True)  # TN, KL …
    name       = Column(String(100), nullable=False)
    latitude   = Column(Float, nullable=True)
    longitude  = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_now, nullable=False)

    country   = relationship("Country", back_populates="states")
    districts = relationship("District", back_populates="state")


class District(Base):
    """
    Administrative district within a state.
    Namakkal is the crisis demo district; Salem is the surplus redistribution hub.
    """
    __tablename__ = "districts"
    __table_args__ = (
        Index("ix_district_state_name", "state_id", "name"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    state_id   = Column(Integer, ForeignKey("states.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False, index=True)
    latitude   = Column(Float, nullable=True)
    longitude  = Column(Float, nullable=True)
    population = Column(Integer, default=500_000, nullable=False)
    risk_level = Column(
        String(20),
        default="LOW",
        nullable=False,
        comment="Aggregated district risk: LOW | MEDIUM | HIGH | CRITICAL",
    )
    created_at = Column(DateTime, default=_now, nullable=False)

    state = relationship("State", back_populates="districts")
    phcs  = relationship("PHC", back_populates="district")


class PHC(Base):
    """
    Primary Health Centre — the fundamental operational unit.
    98 PHCs seeded across 26 districts in 6 Indian states.
    """
    __tablename__ = "phcs"
    __table_args__ = (
        Index("ix_phc_district_risk", "district_id", "risk_category"),
    )

    id                  = Column(Integer, primary_key=True, index=True)
    code                = Column(String(50), unique=True, index=True, nullable=False)
    name                = Column(String(150), nullable=False)
    district_id         = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"), nullable=False)
    tier                = Column(
        String(20),
        default="Tier-1",
        nullable=False,
        comment="Tier-1 | Tier-2 | CHC | Urban PHC",
    )
    latitude            = Column(Float, nullable=False)
    longitude           = Column(Float, nullable=False)
    catchment_population = Column(Integer, default=30_000, nullable=False)
    contact_phone       = Column(String(30), nullable=True)
    is_active           = Column(Boolean, default=True, nullable=False)
    current_risk_score  = Column(Float, default=0.15, nullable=False, comment="0.0–1.0")
    risk_category       = Column(
        String(20),
        default="LOW",
        nullable=False,
        comment="LOW | MEDIUM | HIGH | CRITICAL",
    )
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    district    = relationship("District", back_populates="phcs")
    inventory   = relationship("Inventory", back_populates="phc", cascade="all, delete-orphan")
    consumption = relationship("MedicineConsumption", back_populates="phc", cascade="all, delete-orphan")
    footfall    = relationship("PatientFootfall", back_populates="phc", cascade="all, delete-orphan")
    beds        = relationship("Bed", back_populates="phc", uselist=False, cascade="all, delete-orphan")
    staff       = relationship("Staff", back_populates="phc", cascade="all, delete-orphan")
    alerts      = relationship("Alert", back_populates="phc", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="phc", cascade="all, delete-orphan")


# ===========================================================================
# FORMULARY
# ===========================================================================

class Medicine(Base):
    """
    Essential medicine formulary — 22 medicines seeded covering antibiotics,
    antivirals, IV fluids, maternal health, vaccines, and NCDs.
    """
    __tablename__ = "medicines"

    id                   = Column(Integer, primary_key=True, index=True)
    code                 = Column(String(50), unique=True, index=True, nullable=False)  # MED-ORS-01
    name                 = Column(String(150), nullable=False)
    category             = Column(String(100), nullable=False)  # Antibiotics | Emergency | IV Fluids …
    unit                 = Column(String(30), default="units", nullable=False)
    unit_cost_inr        = Column(Float, default=10.0, nullable=False)
    standard_daily_demand = Column(Float, default=50.0, nullable=False)
    safety_stock_days    = Column(Integer, default=14, nullable=False)
    shelf_life_months    = Column(Integer, default=24, nullable=False)
    description          = Column(Text, nullable=True)
    created_at           = Column(DateTime, default=_now, nullable=False)

    inventory   = relationship("Inventory", back_populates="medicine")
    consumption = relationship("MedicineConsumption", back_populates="medicine")
    forecasts   = relationship("Forecast", back_populates="medicine")
    risk_scores = relationship("RiskScore", back_populates="medicine")


# ===========================================================================
# SUPPLY CHAIN
# ===========================================================================

class Supplier(Base):
    """
    State-level medical supply corporations and central warehouses.
    """
    __tablename__ = "suppliers"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(150), nullable=False)
    code             = Column(String(50), unique=True, nullable=False, index=True)
    contact_person   = Column(String(100), nullable=True)
    phone            = Column(String(30), nullable=True)
    lead_time_days   = Column(Integer, default=5, nullable=False)
    reliability_score = Column(Float, default=0.92, nullable=False, comment="0.0–1.0")
    state_coverage   = Column(String(200), default="All", nullable=False)
    created_at       = Column(DateTime, default=_now, nullable=False)


class Inventory(Base):
    """
    Current stock position of a medicine at a PHC.
    One row per (PHC, Medicine) combination.
    """
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("phc_id", "medicine_id", name="uq_inventory_phc_medicine"),
        Index("ix_inventory_phc_id", "phc_id"),
    )

    id                    = Column(Integer, primary_key=True, index=True)
    phc_id                = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    medicine_id           = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    current_stock         = Column(Integer, default=0, nullable=False)
    batch_number          = Column(String(50), nullable=True)
    expiry_date           = Column(DateTime, nullable=True)
    reorder_threshold     = Column(Integer, default=100, nullable=False)
    incoming_stock        = Column(Integer, default=0, nullable=False)
    incoming_delivery_date = Column(DateTime, nullable=True)
    supplier_id           = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    last_updated          = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    phc          = relationship("PHC", back_populates="inventory")
    medicine     = relationship("Medicine", back_populates="inventory")
    supplier     = relationship("Supplier")
    transactions = relationship("InventoryTransaction", back_populates="inventory", cascade="all, delete-orphan")


class InventoryTransaction(Base):
    """
    Immutable audit trail of every stock movement at a PHC.
    Types: CONSUMPTION | INWARD_DELIVERY | REDISTRIBUTION_OUT | REDISTRIBUTION_IN |
           WASTAGE | ADJUSTMENT
    """
    __tablename__ = "inventory_transactions"
    __table_args__ = (
        Index("ix_inv_txn_inventory_ts", "inventory_id", "timestamp"),
    )

    id               = Column(Integer, primary_key=True, index=True)
    inventory_id     = Column(Integer, ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(String(30), nullable=False)
    quantity         = Column(Integer, nullable=False)
    balance_after    = Column(Integer, nullable=False)
    notes            = Column(String(255), nullable=True)
    performed_by     = Column(String(120), nullable=True)
    timestamp        = Column(DateTime, default=_now, nullable=False, index=True)

    inventory = relationship("Inventory", back_populates="transactions")


# ===========================================================================
# TIME-SERIES OPERATIONAL DATA
# ===========================================================================

class MedicineConsumption(Base):
    """
    Daily medicine consumption record per PHC (90-day seeded history).
    Anomaly flag is set by the IQR/Z-Score anomaly detection engine.
    """
    __tablename__ = "medicine_consumption"
    __table_args__ = (
        Index("ix_consumption_phc_med_date", "phc_id", "medicine_id", "date"),
    )

    id               = Column(Integer, primary_key=True, index=True)
    phc_id           = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    medicine_id      = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    date             = Column(DateTime, nullable=False, index=True)
    quantity_consumed = Column(Integer, nullable=False)
    is_anomaly       = Column(Boolean, default=False, nullable=False)
    created_at       = Column(DateTime, default=_now, nullable=False)

    phc      = relationship("PHC", back_populates="consumption")
    medicine = relationship("Medicine", back_populates="consumption")


class PatientFootfall(Base):
    """
    Daily patient visit counts per PHC broken down by care type.
    is_surge_anomaly is flagged when a Z-Score > 2.5 surge is detected.
    """
    __tablename__ = "patient_footfall"
    __table_args__ = (
        Index("ix_footfall_phc_date", "phc_id", "date"),
    )

    id                     = Column(Integer, primary_key=True, index=True)
    phc_id                 = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    date                   = Column(DateTime, nullable=False, index=True)
    outpatient_count       = Column(Integer, default=0, nullable=False)
    inpatient_count        = Column(Integer, default=0, nullable=False)
    emergency_count        = Column(Integer, default=0, nullable=False)
    fever_respiratory_count = Column(Integer, default=0, nullable=False)
    total_footfall         = Column(Integer, default=0, nullable=False)
    is_surge_anomaly       = Column(Boolean, default=False, nullable=False)
    created_at             = Column(DateTime, default=_now, nullable=False)

    phc = relationship("PHC", back_populates="footfall")


# ===========================================================================
# FACILITY RESOURCES
# ===========================================================================

class Bed(Base):
    """
    Real-time bed census for a PHC. One row per PHC (1-to-1).
    Tracks total, occupied, ICU, oxygen, and isolation bed sub-counts.
    """
    __tablename__ = "beds"

    id               = Column(Integer, primary_key=True, index=True)
    phc_id           = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_beds       = Column(Integer, default=20, nullable=False)
    occupied_beds    = Column(Integer, default=12, nullable=False)
    available_beds   = Column(Integer, default=8, nullable=False)
    icu_beds         = Column(Integer, default=2, nullable=False)
    icu_occupied     = Column(Integer, default=1, nullable=False)
    oxygen_beds      = Column(Integer, default=6, nullable=False)
    oxygen_occupied  = Column(Integer, default=4, nullable=False)
    isolation_beds   = Column(Integer, default=4, nullable=False)
    isolation_occupied = Column(Integer, default=2, nullable=False)
    occupancy_rate   = Column(Float, default=0.60, nullable=False, comment="0.0–1.0")
    last_updated     = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    phc = relationship("PHC", back_populates="beds")


class Staff(Base):
    """
    Duty roster summary per staff category at a PHC.
    Categories: DOCTOR | NURSE | PHARMACIST | LAB_TECH | SUPPORT_STAFF
    """
    __tablename__ = "staff"
    __table_args__ = (
        UniqueConstraint("phc_id", "role_type", name="uq_staff_phc_role"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    phc_id          = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    role_type       = Column(String(50), nullable=False)
    sanctioned_count = Column(Integer, default=5, nullable=False)
    active_count    = Column(Integer, default=4, nullable=False)
    present_today   = Column(Integer, default=4, nullable=False)
    on_leave        = Column(Integer, default=0, nullable=False)
    attendance_rate = Column(Float, default=1.0, nullable=False, comment="0.0–1.0")
    last_updated    = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    phc               = relationship("PHC", back_populates="staff")
    attendance_records = relationship("StaffAttendance", back_populates="staff", cascade="all, delete-orphan")


class StaffAttendance(Base):
    """
    Daily staff attendance record (one per Staff role per day).
    """
    __tablename__ = "staff_attendance"
    __table_args__ = (
        Index("ix_staff_att_staff_date", "staff_id", "date"),
    )

    id                    = Column(Integer, primary_key=True, index=True)
    staff_id              = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False)
    date                  = Column(DateTime, nullable=False, index=True)
    scheduled             = Column(Integer, default=4, nullable=False)
    present               = Column(Integer, default=4, nullable=False)
    absent                = Column(Integer, default=0, nullable=False)
    on_leave              = Column(Integer, default=0, nullable=False)
    attendance_percentage = Column(Float, default=100.0, nullable=False)

    staff = relationship("Staff", back_populates="attendance_records")


# ===========================================================================
# AI OUTPUTS
# ===========================================================================

class Alert(Base):
    """
    Predictive early-warning alert generated by the anomaly and risk engines.
    Lifecycle: ACTIVE → ACKNOWLEDGED → RESOLVED (or DISMISSED).
    """
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_status_severity", "status", "severity"),
        Index("ix_alerts_phc_created", "phc_id", "created_at"),
    )

    id                 = Column(Integer, primary_key=True, index=True)
    alert_code         = Column(String(50), unique=True, index=True, nullable=False)
    phc_id             = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    category           = Column(String(50), nullable=False,
                                comment="CRITICAL_STOCKOUT | HIGH_DEMAND_SPIKE | LOW_BED_CAPACITY | "
                                        "STAFF_SHORTAGE | ABNORMAL_FOOTFALL | SUPPLY_DELAY | RESOURCE_IMBALANCE")
    severity           = Column(String(20), nullable=False, comment="CRITICAL | HIGH | MEDIUM | LOW")
    title              = Column(String(200), nullable=False)
    resource_name      = Column(String(100), nullable=True)
    reason             = Column(Text, nullable=False)
    prediction         = Column(Text, nullable=True)
    ai_explanation     = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    status             = Column(String(20), default="ACTIVE", nullable=False,
                                comment="ACTIVE | ACKNOWLEDGED | RESOLVED | DISMISSED")
    acknowledged_by    = Column(String(100), nullable=True)
    acknowledged_at    = Column(DateTime, nullable=True)
    resolved_by        = Column(String(100), nullable=True)
    resolved_at        = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, default=_now, index=True, nullable=False)

    phc = relationship("PHC", back_populates="alerts")


class Forecast(Base):
    """
    Point-in-time demand forecast for a (PHC, Medicine) pair.
    Generated by the Holt-Winters forecasting engine for 7/14/30-day horizons.
    """
    __tablename__ = "forecasts"
    __table_args__ = (
        Index("ix_forecast_phc_med_horizon", "phc_id", "medicine_id", "forecast_horizon_days"),
    )

    id                     = Column(Integer, primary_key=True, index=True)
    phc_id                 = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    medicine_id            = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    forecast_horizon_days  = Column(Integer, default=7, nullable=False, comment="7 | 14 | 30")
    predicted_daily_demand = Column(Float, nullable=False)
    total_forecasted_demand = Column(Float, nullable=False)
    current_avg_demand     = Column(Float, nullable=False)
    demand_change_percent  = Column(Float, default=0.0, nullable=False)
    confidence_score       = Column(Float, default=0.88, nullable=False)
    lower_bound            = Column(Float, nullable=False)
    upper_bound            = Column(Float, nullable=False)
    trend                  = Column(String(20), default="STABLE", nullable=False,
                                   comment="INCREASING | STABLE | DECREASING")
    generated_at           = Column(DateTime, default=_now, nullable=False)

    medicine = relationship("Medicine", back_populates="forecasts")


class RiskScore(Base):
    """
    Probabilistic stock-out risk assessment for a (PHC, Medicine) pair.
    Computed by the risk engine at configurable intervals.
    """
    __tablename__ = "risk_scores"
    __table_args__ = (
        Index("ix_risk_phc_med_calc", "phc_id", "medicine_id", "calculated_at"),
    )

    id                    = Column(Integer, primary_key=True, index=True)
    phc_id                = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    medicine_id           = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    stock_out_probability = Column(Float, nullable=False, comment="0.0–1.0")
    risk_level            = Column(String(20), nullable=False, comment="LOW | MEDIUM | HIGH | CRITICAL")
    days_stock_remaining  = Column(Float, nullable=False)
    current_stock         = Column(Integer, default=0, nullable=False)
    daily_consumption_rate = Column(Float, default=0.0, nullable=False)
    supplier_lead_time_days = Column(Integer, default=5, nullable=False)
    # Explainability payload: {"footfall_surge": "+37%", "lead_time": 6, …}
    contributing_factors  = Column(JSON, nullable=True)
    recommended_action    = Column(Text, nullable=True)
    confidence            = Column(Float, default=0.90, nullable=False)
    calculated_at         = Column(DateTime, default=_now, index=True, nullable=False)

    phc      = relationship("PHC", back_populates="risk_scores")
    medicine = relationship("Medicine", back_populates="risk_scores")


# ===========================================================================
# REDISTRIBUTION
# ===========================================================================

class RedistributionRecommendation(Base):
    """
    Cross-district resource transfer plan generated by the linear optimizer.
    Lifecycle: RECOMMENDED → APPROVED → IN_TRANSIT → DELIVERED (or REJECTED).
    """
    __tablename__ = "redistribution_recommendations"
    __table_args__ = (
        Index("ix_redist_rec_status_urgency", "status", "urgency"),
    )

    id                    = Column(Integer, primary_key=True, index=True)
    recommendation_code   = Column(String(50), unique=True, index=True, nullable=False)
    source_district_id    = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    dest_district_id      = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    source_phc_id         = Column(Integer, ForeignKey("phcs.id", ondelete="SET NULL"), nullable=True)
    dest_phc_id           = Column(Integer, ForeignKey("phcs.id", ondelete="SET NULL"), nullable=True)
    medicine_id           = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    recommended_quantity  = Column(Integer, nullable=False)
    source_surplus_quantity = Column(Integer, nullable=False)
    dest_deficit_quantity = Column(Integer, nullable=False)
    urgency               = Column(String(20), default="HIGH", nullable=False,
                                   comment="CRITICAL | HIGH | MEDIUM | ROUTINE")
    reason                = Column(Text, nullable=False)
    estimated_transit_hours = Column(Float, default=3.5, nullable=False)
    estimated_impact      = Column(Text, nullable=True)
    status                = Column(String(30), default="RECOMMENDED", nullable=False,
                                   comment="RECOMMENDED | APPROVED | REJECTED | IN_TRANSIT | DELIVERED")
    approved_by           = Column(String(100), nullable=True)
    approved_at           = Column(DateTime, nullable=True)
    rejected_reason       = Column(String(255), nullable=True)
    created_at            = Column(DateTime, default=_now, index=True, nullable=False)

    source_district = relationship("District", foreign_keys=[source_district_id])
    dest_district   = relationship("District", foreign_keys=[dest_district_id])
    source_phc      = relationship("PHC", foreign_keys=[source_phc_id])
    dest_phc        = relationship("PHC", foreign_keys=[dest_phc_id])
    medicine        = relationship("Medicine")
    transactions    = relationship(
        "RedistributionTransaction",
        back_populates="recommendation",
        cascade="all, delete-orphan",
    )


class RedistributionTransaction(Base):
    """
    Physical dispatch record for an approved redistribution.
    Tracks the cold-chain vehicle, temperature, and delivery timeline.
    """
    __tablename__ = "redistribution_transactions"

    id                       = Column(Integer, primary_key=True, index=True)
    recommendation_id        = Column(
        Integer,
        ForeignKey("redistribution_recommendations.id", ondelete="CASCADE"),
        nullable=False,
    )
    tracking_number          = Column(String(60), unique=True, nullable=False)
    current_status           = Column(String(30), default="DISPATCHED", nullable=False,
                                      comment="DISPATCHED | IN_TRANSIT | ARRIVED | STOCKED")
    dispatched_at            = Column(DateTime, default=_now, nullable=False)
    estimated_arrival        = Column(DateTime, nullable=True)
    delivered_at             = Column(DateTime, nullable=True)
    vehicle_details          = Column(String(100), default="Refrigerated Medical Van KA-04-E-9021")
    temperature_logged_celsius = Column(Float, default=4.2, nullable=False)
    created_at               = Column(DateTime, default=_now, nullable=False)

    recommendation = relationship("RedistributionRecommendation", back_populates="transactions")


# ===========================================================================
# EMERGENCY SIMULATION
# ===========================================================================

class EmergencyEvent(Base):
    """
    Crisis / outbreak simulation scenario.
    When is_active=True, multipliers are applied to all demand forecasts
    for the affected district.
    """
    __tablename__ = "emergency_events"

    id                       = Column(Integer, primary_key=True, index=True)
    event_type               = Column(String(50), nullable=False,
                                      comment="DENGUE_OUTBREAK | MONSOON_FLOOD | HEATWAVE_CRISIS | RESPIRATORY_SURGE")
    name                     = Column(String(150), nullable=False)
    affected_district_id     = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    is_active                = Column(Boolean, default=False, nullable=False)
    footfall_multiplier      = Column(Float, default=1.45, nullable=False)
    medicine_demand_multiplier = Column(Float, default=1.85, nullable=False)
    bed_occupancy_multiplier  = Column(Float, default=1.35, nullable=False)
    staff_strain_multiplier   = Column(Float, default=1.25, nullable=False)
    ai_situation_summary      = Column(Text, nullable=True)
    activated_at              = Column(DateTime, nullable=True)
    resolved_at               = Column(DateTime, nullable=True)
    created_at                = Column(DateTime, default=_now, nullable=False)

    affected_district = relationship("District")


# ===========================================================================
# FEDERATED LEARNING (BRICS MESH)
# ===========================================================================

class FederatedNode(Base):
    """
    A sovereign edge training node in the BRICS federated learning mesh.
    Each node trains on its own local health data and contributes only
    gradient weight vectors — never raw patient records.
    """
    __tablename__ = "federated_nodes"

    id               = Column(Integer, primary_key=True, index=True)
    country_id       = Column(Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False)
    node_name        = Column(String(100), nullable=False)
    status           = Column(String(30), default="CONNECTED", nullable=False,
                              comment="CONNECTED | TRAINING | SYNCHRONIZING | OFFLINE")
    local_data_points = Column(Integer, default=125_000, nullable=False)
    local_accuracy   = Column(Float, default=0.86, nullable=False)
    last_sync_time   = Column(DateTime, default=_now, nullable=False)
    created_at       = Column(DateTime, default=_now, nullable=False)

    country         = relationship("Country", back_populates="federated_nodes")
    training_rounds = relationship("FederatedTrainingRound", back_populates="node", cascade="all, delete-orphan")


class FederatedTrainingRound(Base):
    """
    Result of one FedAvg aggregation round across all BRICS nodes.
    One row per (round_number, node) combination.
    parameters_size_kb is the weight payload — raw data is NEVER transmitted.
    """
    __tablename__ = "federated_training_rounds"
    __table_args__ = (
        Index("ix_fed_round_node", "round_number", "node_id"),
    )

    id                        = Column(Integer, primary_key=True, index=True)
    round_number              = Column(Integer, nullable=False, index=True)
    node_id                   = Column(Integer, ForeignKey("federated_nodes.id", ondelete="CASCADE"), nullable=False)
    local_loss                = Column(Float, default=0.18, nullable=False)
    local_accuracy            = Column(Float, default=0.85, nullable=False)
    global_aggregated_accuracy = Column(Float, default=0.87, nullable=False)
    weights_divergence        = Column(Float, default=0.042, nullable=False)
    parameters_size_kb        = Column(Float, default=248.5, nullable=False)
    created_at                = Column(DateTime, default=_now, nullable=False)

    node = relationship("FederatedNode", back_populates="training_rounds")


# ===========================================================================
# OBSERVABILITY
# ===========================================================================

class ModelMetric(Base):
    """
    Stores evaluation benchmarks for each ML model.
    Populated at startup and after each training round.
    """
    __tablename__ = "model_metrics"
    __table_args__ = (
        Index("ix_model_metric_name_type", "model_name", "metric_type"),
    )

    id           = Column(Integer, primary_key=True, index=True)
    model_name   = Column(String(100), nullable=False)
    metric_type  = Column(String(50), nullable=False, comment="ACCURACY | MAE | RMSE | RECALL | F1_SCORE | EFFICIENCY")
    metric_value = Column(Float, nullable=False)
    horizon_days = Column(Integer, nullable=True)
    evaluated_at = Column(DateTime, default=_now, nullable=False)


class AuditLog(Base):
    """
    Immutable governance audit trail for every consequential action.
    Actions: USER_LOGIN | ALERT_ACKNOWLEDGED | ALERT_RESOLVED |
             REDISTRIBUTION_APPROVED | REDISTRIBUTION_REJECTED |
             EMERGENCY_SIMULATED | EMERGENCY_RESET | FEDERATED_ROUND_TRIGGERED |
             SYSTEM_INITIALIZED | INVENTORY_ADJUSTED
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_user_ts", "user_id", "timestamp"),
        Index("ix_audit_action_ts", "action", "timestamp"),
    )

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email    = Column(String(120), nullable=True)
    action        = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id   = Column(String(50), nullable=True)
    details       = Column(JSON, nullable=True)
    ip_address    = Column(String(50), default="127.0.0.1", nullable=False)
    timestamp     = Column(DateTime, default=_now, index=True, nullable=False)

    user = relationship("User", back_populates="audit_logs")
