"""
RESILIENCE AI — Models Package
================================
Re-exports all ORM entities so the rest of the codebase can do:

    from app.models import PHC, Inventory, Alert, ...

rather than importing from the long dotted path each time.
"""
from app.models.entities import (
    Role,
    User,
    Country,
    State,
    District,
    PHC,
    Medicine,
    Supplier,
    Inventory,
    InventoryTransaction,
    MedicineConsumption,
    PatientFootfall,
    Bed,
    Staff,
    StaffAttendance,
    Alert,
    Forecast,
    RiskScore,
    RedistributionRecommendation,
    RedistributionTransaction,
    EmergencyEvent,
    FederatedNode,
    FederatedTrainingRound,
    ModelMetric,
    AuditLog,
)

__all__ = [
    "Role",
    "User",
    "Country",
    "State",
    "District",
    "PHC",
    "Medicine",
    "Supplier",
    "Inventory",
    "InventoryTransaction",
    "MedicineConsumption",
    "PatientFootfall",
    "Bed",
    "Staff",
    "StaffAttendance",
    "Alert",
    "Forecast",
    "RiskScore",
    "RedistributionRecommendation",
    "RedistributionTransaction",
    "EmergencyEvent",
    "FederatedNode",
    "FederatedTrainingRound",
    "ModelMetric",
    "AuditLog",
]
