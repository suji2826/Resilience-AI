"""
RESILIENCE AI — Synthetic Healthcare Dataset Generation System
================================================================
Deterministic, statistically grounded generator for healthcare supply-chain resilience simulation.

Key Capabilities:
  - Deterministic random generation using configurable seed (default: 42)
  - 98 Primary Health Centres across 26 Districts and 6 Indian States
  - 22 Essential WHO/NLEM Medicines spanning 8 therapeutic classes
  - 90-day time-series telemetry (Patient Footfall & Medicine Consumption)
  - Explicit 'Synthetic / Demonstration Data' provenance labels
  - Epidemiological surge modeling for Namakkal outbreak & Salem surplus hub
  - 5 BRICS Federated Learning nodes with FedAvg weight history
  - Multi-horizon forecasts (7D, 14D, 30D) and probabilistic risk scores
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
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

logger = logging.getLogger(__name__)

SYNTHETIC_DATA_DISCLAIMER = (
    "DEMONSTRATION DATA ONLY: Generated synthetically for healthcare supply chain resilience research. "
    "Not real patient records or official government clinical data."
)


class SyntheticDataGenerator:
    """
    Deterministic synthetic healthcare data generator.
    """

    def __init__(
        self,
        seed: int = 42,
        history_days: int = 90,
        outbreak_district: str = "Namakkal",
        surplus_district: str = "Salem",
        reference_time: Optional[datetime] = None,
    ):
        self.seed = seed
        self.history_days = history_days
        self.outbreak_district = outbreak_district
        self.surplus_district = surplus_district
        self.now = reference_time or datetime.utcnow()
        self.rng = random.Random(seed)

    def generate_all(self, db: Session, verbose: bool = True) -> Dict[str, int]:
        """
        Execute full database generation pipeline.
        Returns a dictionary of entity counts created.
        """
        if verbose:
            print(f"\n[SYNTHETIC-GEN] Initializing dataset generator (seed={self.seed}, history={self.history_days}d)...")

        # 1. Roles & Permissions
        roles = self._generate_roles(db)
        if verbose:
            print(f"  [+] Seeded {len(roles)} RBAC Roles")

        # 2. Countries (BRICS)
        countries = self._generate_countries(db)
        if verbose:
            print(f"  [+] Seeded {len(countries)} Countries (BRICS Mesh)")

        # 3. States & Districts
        states, districts = self._generate_geography(db, countries["IND"])
        if verbose:
            print(f"  [+] Seeded {len(states)} States and {len(districts)} Districts")

        # 4. Primary Health Centres (PHCs)
        phcs = self._generate_phcs(db, districts)
        if verbose:
            print(f"  [+] Seeded {len(phcs)} Primary Health Centres")

        # 5. Formulary (Medicines) & Suppliers
        medicines = self._generate_medicines(db)
        suppliers = self._generate_suppliers(db)
        if verbose:
            print(f"  [+] Seeded {len(medicines)} Essential Medicines and {len(suppliers)} Suppliers")

        # 6. Users & Demo Accounts
        users = self._generate_users(db, roles, states, districts, phcs)
        if verbose:
            print(f"  [+] Seeded {len(users)} Demo Accounts")

        # 7. Facility Operations (Beds, Staff, Attendance)
        beds_count, staff_count, att_count = self._generate_facility_operations(db, phcs)
        if verbose:
            print(f"  [+] Seeded {beds_count} Beds, {staff_count} Staff categories, {att_count} Attendance records")

        # 8. Time-Series Telemetry (Footfall & Medicine Consumption)
        ff_count, mc_count = self._generate_timeseries(db, phcs, medicines)
        if verbose:
            print(f"  [+] Seeded {ff_count} Patient Footfall records and {mc_count} Consumption entries ({self.history_days}D)")

        # 9. Inventory, Risk Scores, and Demand Forecasts
        inv_count, risk_count, fc_count = self._generate_inventory_and_ai_metrics(db, phcs, medicines, suppliers[0])
        if verbose:
            print(f"  [+] Seeded {inv_count} Inventory batches, {risk_count} Risk scores, {fc_count} Forecast curves")

        # 10. Early Warning Alerts
        alerts = self._generate_alerts(db, phcs)
        if verbose:
            print(f"  [+] Seeded {len(alerts)} Early Warning Alerts")

        # 11. Cross-District Redistribution Plans
        redist_count = self._generate_redistribution(db, districts, phcs, medicines)
        if verbose:
            print(f"  [+] Seeded {redist_count} Resource Redistribution Plans & Cold-Chain Transfers")

        # 12. Crisis / Outbreak Simulations
        events = self._generate_emergency_scenarios(db, districts)
        if verbose:
            print(f"  [+] Seeded {len(events)} Emergency Outbreak Scenarios")

        # 13. Federated Learning (BRICS Mesh)
        fn_count, fr_count = self._generate_federated_mesh(db, countries)
        if verbose:
            print(f"  [+] Seeded {fn_count} Federated Nodes and {fr_count} Training Rounds")

        # 14. Model Benchmark Metrics & Audit Log
        metrics_count = self._generate_model_metrics(db)
        audit = self._generate_audit_log(db)
        if verbose:
            print(f"  [+] Seeded {metrics_count} Benchmark Metrics and Initial System Audit Log")

        db.commit()

        summary = {
            "phcs": len(phcs),
            "districts": len(districts),
            "states": len(states),
            "medicines": len(medicines),
            "inventory_records": inv_count,
            "consumption_records": mc_count,
            "footfall_records": ff_count,
            "alerts": len(alerts),
            "federated_rounds": fr_count,
        }
        if verbose:
            print(f"[SYNTHETIC-GEN] Successfully generated deterministic dataset in database.\n")

        return summary

    # -----------------------------------------------------------------------
    # 1. Roles
    # -----------------------------------------------------------------------
    def _generate_roles(self, db: Session) -> Dict[str, Role]:
        roles_data = [
            ("NATIONAL_ADMIN", "National Healthcare Administrator with full cross-border & inter-state oversight", ["*"]),
            ("STATE_ADMIN", "State Health Department Director overseeing state districts", ["state:*", "phc:view", "redistribution:approve"]),
            ("DISTRICT_ADMIN", "District Health Officer (DHO) managing district inventory and alerts", ["district:*", "phc:*", "redistribution:request"]),
            ("PHC_ADMIN", "Medical Officer in-charge of Primary Health Centre operations", ["phc:self", "inventory:update", "beds:update"]),
            ("SUPPLY_CHAIN_MANAGER", "Logistics & Procurement Officer for medical stock redistribution", ["inventory:*", "redistribution:*", "suppliers:*"]),
        ]
        roles_dict = {}
        for name, desc, perms in roles_data:
            r = Role(name=name, description=desc, permissions=perms)
            db.add(r)
            db.flush()
            roles_dict[name] = r
        return roles_dict

    # -----------------------------------------------------------------------
    # 2. Countries (BRICS)
    # -----------------------------------------------------------------------
    def _generate_countries(self, db: Session) -> Dict[str, Country]:
        countries_data = [
            ("IND", "India", True),
            ("BRA", "Brazil", True),
            ("RUS", "Russia", True),
            ("CHN", "China", True),
            ("ZAF", "South Africa", True),
        ]
        countries_dict = {}
        for code, name, brics in countries_data:
            c = Country(code=code, name=name, is_brics_member=brics)
            db.add(c)
            db.flush()
            countries_dict[code] = c
        return countries_dict

    # -----------------------------------------------------------------------
    # 3. Geography: States & Districts
    # -----------------------------------------------------------------------
    def _generate_geography(self, db: Session, india: Country) -> Tuple[Dict[str, State], Dict[str, District]]:
        states_data = [
            ("TN", "Tamil Nadu", 11.1271, 78.6569),
            ("KL", "Kerala", 10.8505, 76.2711),
            ("KA", "Karnataka", 15.3173, 75.7139),
            ("AP", "Andhra Pradesh", 15.9129, 79.7400),
            ("TG", "Telangana", 18.1124, 79.0193),
            ("MH", "Maharashtra", 19.7515, 75.7139),
        ]
        states_dict = {}
        for code, name, lat, lng in states_data:
            s = State(country_id=india.id, code=code, name=name, latitude=lat, longitude=lng)
            db.add(s)
            db.flush()
            states_dict[code] = s

        districts_data = [
            # Tamil Nadu
            ("TN", "Salem", 11.6643, 78.1460, 3480000, "LOW"),
            ("TN", "Namakkal", 11.2189, 78.1674, 1720000, "CRITICAL"),
            ("TN", "Coimbatore", 11.0168, 76.9558, 3458000, "LOW"),
            ("TN", "Erode", 11.3410, 77.7172, 2250000, "MEDIUM"),
            ("TN", "Chennai", 13.0827, 80.2707, 7088000, "MEDIUM"),
            ("TN", "Madurai", 9.9252, 78.1198, 3038000, "LOW"),
            ("TN", "Dharmapuri", 12.1211, 78.1582, 1506000, "HIGH"),
            ("TN", "Tiruchirappalli", 10.7905, 78.7047, 2722000, "LOW"),
            # Kerala
            ("KL", "Ernakulam", 9.9816, 76.2999, 3282000, "LOW"),
            ("KL", "Kozhikode", 11.2588, 75.7804, 3086000, "MEDIUM"),
            ("KL", "Thiruvananthapuram", 8.5241, 76.9366, 3301000, "LOW"),
            ("KL", "Palakkad", 10.7867, 76.6548, 2809000, "HIGH"),
            # Karnataka
            ("KA", "Bengaluru Urban", 12.9716, 77.5946, 9621000, "MEDIUM"),
            ("KA", "Mysuru", 12.2958, 76.6394, 3001000, "LOW"),
            ("KA", "Belagavi", 15.8497, 74.4977, 4779000, "LOW"),
            ("KA", "Ballari", 15.1394, 76.9214, 2452000, "HIGH"),
            # Andhra Pradesh
            ("AP", "Visakhapatnam", 17.6868, 83.2185, 4290000, "LOW"),
            ("AP", "Krishna", 16.6103, 80.7214, 4517000, "MEDIUM"),
            ("AP", "Guntur", 16.3067, 80.4365, 4887000, "LOW"),
            ("AP", "Chittoor", 13.2172, 79.1003, 4174000, "HIGH"),
            # Telangana
            ("TG", "Hyderabad", 17.3850, 78.4867, 6809000, "MEDIUM"),
            ("TG", "Warangal", 17.9689, 79.5941, 3512000, "LOW"),
            ("TG", "Karimnagar", 18.4386, 79.1288, 1005000, "LOW"),
            # Maharashtra
            ("MH", "Pune", 18.5204, 73.8567, 9429000, "LOW"),
            ("MH", "Nagpur", 21.1458, 79.0882, 4653000, "MEDIUM"),
            ("MH", "Nashik", 19.9975, 73.7898, 6107000, "LOW"),
        ]
        districts_dict = {}
        for st_code, name, lat, lng, pop, risk in districts_data:
            st = states_dict[st_code]
            d = District(state_id=st.id, name=name, latitude=lat, longitude=lng, population=pop, risk_level=risk)
            db.add(d)
            db.flush()
            districts_dict[name] = d

        return states_dict, districts_dict

    # -----------------------------------------------------------------------
    # 4. Primary Health Centres (PHCs)
    # -----------------------------------------------------------------------
    def _generate_phcs(self, db: Session, districts_dict: Dict[str, District]) -> List[PHC]:
        phc_definitions = [
            # Namakkal (Target Outbreak & Shortage district)
            ("Namakkal", [
                ("PHC-TN-NMK-01", "Kolli Hills Tribal PHC", "Tier-1", 11.2489, 78.3374, 38000, "CRITICAL", 0.92),
                ("PHC-TN-NMK-02", "Mallasamudram PHC", "Tier-2", 11.4821, 77.9621, 42000, "CRITICAL", 0.88),
                ("PHC-TN-NMK-03", "Mohanur 24x7 CHC", "CHC", 11.0667, 78.1333, 65000, "HIGH", 0.81),
                ("PHC-TN-NMK-04", "Paramathi Urban PHC", "Urban PHC", 11.1340, 77.9890, 48000, "HIGH", 0.79),
                ("PHC-TN-NMK-05", "Rasipuram Model PHC", "Tier-1", 11.4580, 78.1680, 52000, "CRITICAL", 0.94),
                ("PHC-TN-NMK-06", "Sendamangalam PHC", "Tier-2", 11.2870, 78.2380, 39000, "HIGH", 0.76),
                ("PHC-TN-NMK-07", "Tiruchengode Rural PHC", "Tier-1", 11.3800, 77.8900, 56000, "HIGH", 0.74),
                ("PHC-TN-NMK-08", "Vennandur Community PHC", "Tier-2", 11.5120, 78.1020, 34000, "CRITICAL", 0.89),
            ]),
            # Salem (Surplus District for cross-district redistribution)
            ("Salem", [
                ("PHC-TN-SLM-01", "Valapady Central PHC", "CHC", 11.6500, 78.4100, 55000, "LOW", 0.12),
                ("PHC-TN-SLM-02", "Omalur Model PHC", "Tier-1", 11.7400, 78.0400, 49000, "LOW", 0.15),
                ("PHC-TN-SLM-03", "Tharamangalam PHC", "Tier-2", 11.7000, 77.9800, 41000, "LOW", 0.14),
                ("PHC-TN-SLM-04", "Attur Taluk PHC", "CHC", 11.5900, 78.6000, 68000, "LOW", 0.10),
                ("PHC-TN-SLM-05", "Sankari Rural PHC", "Tier-1", 11.4800, 77.8700, 46000, "LOW", 0.16),
                ("PHC-TN-SLM-06", "Yercaud Hill PHC", "Tier-2", 11.7700, 78.2000, 28000, "LOW", 0.18),
                ("PHC-TN-SLM-07", "Mecheri Community PHC", "Tier-1", 11.8300, 77.9400, 44000, "LOW", 0.11),
                ("PHC-TN-SLM-08", "Kadayampatti PHC", "Tier-2", 11.8600, 78.1300, 36000, "LOW", 0.13),
            ]),
            # Coimbatore
            ("Coimbatore", [
                ("PHC-TN-CBE-01", "Pollachi Rural PHC", "CHC", 10.6600, 77.0100, 62000, "LOW", 0.15),
                ("PHC-TN-CBE-02", "Sulur Model PHC", "Tier-1", 11.0200, 77.1200, 51000, "LOW", 0.19),
                ("PHC-TN-CBE-03", "Mettupalayam PHC", "CHC", 11.3000, 76.9400, 58000, "LOW", 0.14),
                ("PHC-TN-CBE-04", "Thondamuthur PHC", "Tier-2", 10.9800, 76.8300, 37000, "LOW", 0.17),
                ("PHC-TN-CBE-05", "Annur Community PHC", "Tier-1", 11.2300, 77.1400, 43000, "LOW", 0.20),
            ]),
            # Erode
            ("Erode", [
                ("PHC-TN-ERD-01", "Bhavani Taluk PHC", "CHC", 11.4400, 77.6800, 54000, "MEDIUM", 0.45),
                ("PHC-TN-ERD-02", "Gobichettipalayam PHC", "Tier-1", 11.4500, 77.4300, 48000, "MEDIUM", 0.42),
                ("PHC-TN-ERD-03", "Perundurai Model PHC", "Tier-1", 11.2700, 77.5800, 46000, "LOW", 0.22),
                ("PHC-TN-ERD-04", "Sathyamangalam Hill PHC", "Tier-2", 11.5000, 77.2400, 33000, "MEDIUM", 0.49),
            ]),
            # Chennai
            ("Chennai", [
                ("PHC-TN-CHN-01", "Alandur Urban PHC", "Urban PHC", 12.9975, 80.2005, 72000, "MEDIUM", 0.48),
                ("PHC-TN-CHN-02", "Tondiarpet Health Center", "Urban PHC", 13.1250, 80.2900, 85000, "MEDIUM", 0.52),
                ("PHC-TN-CHN-03", "Tambaram Community PHC", "CHC", 12.9249, 80.1000, 68000, "LOW", 0.25),
                ("PHC-TN-CHN-04", "Madhavaram Model PHC", "Urban PHC", 13.1480, 80.2310, 64000, "LOW", 0.28),
            ]),
            # Madurai
            ("Madurai", [
                ("PHC-TN-MDU-01", "Usilampatti Taluk PHC", "CHC", 9.9600, 77.7900, 57000, "LOW", 0.18),
                ("PHC-TN-MDU-02", "Melur Rural PHC", "Tier-1", 10.0300, 78.3300, 49000, "LOW", 0.16),
                ("PHC-TN-MDU-03", "Vadipatti Model PHC", "Tier-2", 10.0800, 77.9200, 38000, "LOW", 0.21),
            ]),
            # Dharmapuri
            ("Dharmapuri", [
                ("PHC-TN-DHP-01", "Harur Block PHC", "CHC", 12.0600, 78.4900, 61000, "HIGH", 0.72),
                ("PHC-TN-DHP-02", "Pennagaram Rural PHC", "Tier-1", 12.1300, 77.9000, 44000, "HIGH", 0.69),
                ("PHC-TN-DHP-03", "Palacode Model PHC", "Tier-2", 12.3000, 78.0800, 41000, "HIGH", 0.75),
            ]),
            # Tiruchirappalli
            ("Tiruchirappalli", [
                ("PHC-TN-TRC-01", "Manapparai Taluk PHC", "CHC", 10.6000, 78.4100, 59000, "LOW", 0.19),
                ("PHC-TN-TRC-02", "Musiri Rural PHC", "Tier-1", 10.9300, 78.4400, 47000, "LOW", 0.15),
                ("PHC-TN-TRC-03", "Lalgudi Model PHC", "Tier-2", 10.8700, 78.8100, 42000, "LOW", 0.17),
            ]),
            # Kerala - Ernakulam
            ("Ernakulam", [
                ("PHC-KL-EKM-01", "Aluva Model PHC", "Tier-1", 10.1076, 76.3516, 52000, "LOW", 0.12),
                ("PHC-KL-EKM-02", "Mattancherry Urban PHC", "Urban PHC", 9.9578, 76.2571, 48000, "LOW", 0.14),
                ("PHC-KL-EKM-03", "Kothamangalam CHC", "CHC", 10.0610, 76.6234, 61000, "LOW", 0.11),
                ("PHC-KL-EKM-04", "Angamaly Community PHC", "Tier-1", 10.1960, 76.3860, 45000, "LOW", 0.16),
            ]),
            # Kerala - Kozhikode
            ("Kozhikode", [
                ("PHC-KL-KKD-01", "Vadakara Block PHC", "CHC", 11.6000, 75.5900, 56000, "MEDIUM", 0.44),
                ("PHC-KL-KKD-02", "Koyilandy Model PHC", "Tier-1", 11.4300, 75.7000, 49000, "MEDIUM", 0.41),
                ("PHC-KL-KKD-03", "Feroke Community PHC", "Tier-2", 11.1900, 75.8400, 39000, "MEDIUM", 0.46),
            ]),
            # Kerala - Palakkad
            ("Palakkad", [
                ("PHC-KL-PLK-01", "Attappadi Tribal PHC", "Tier-1", 11.0800, 76.6400, 32000, "HIGH", 0.78),
                ("PHC-KL-PLK-02", "Chittur Taluk PHC", "CHC", 10.6900, 76.7100, 51000, "HIGH", 0.71),
                ("PHC-KL-PLK-03", "Mannarkkad Model PHC", "Tier-2", 10.9800, 76.4500, 43000, "HIGH", 0.74),
            ]),
            # Kerala - Thiruvananthapuram
            ("Thiruvananthapuram", [
                ("PHC-KL-TVM-01", "Nedumangad Block PHC", "CHC", 8.6000, 77.0000, 58000, "LOW", 0.15),
                ("PHC-KL-TVM-02", "Neyyattinkara PHC", "Tier-1", 8.4000, 77.0800, 51000, "LOW", 0.18),
                ("PHC-KL-TVM-03", "Attingal Model PHC", "Tier-2", 8.6900, 76.8100, 44000, "LOW", 0.13),
            ]),
            # Karnataka - Bengaluru Urban
            ("Bengaluru Urban", [
                ("PHC-KA-BLR-01", "Yelahanka Model PHC", "CHC", 13.1007, 77.5963, 76000, "MEDIUM", 0.42),
                ("PHC-KA-BLR-02", "Kengeri Urban PHC", "Urban PHC", 12.9177, 77.4838, 68000, "LOW", 0.22),
                ("PHC-KA-BLR-03", "Hoskote Rural PHC", "Tier-1", 13.0700, 77.7980, 54000, "MEDIUM", 0.38),
                ("PHC-KA-BLR-04", "Anekal Community PHC", "Tier-1", 12.7100, 77.6970, 59000, "LOW", 0.26),
                ("PHC-KA-BLR-05", "KR Puram Urban Health", "Urban PHC", 13.0100, 77.7000, 82000, "MEDIUM", 0.49),
            ]),
            # Karnataka - Mysuru
            ("Mysuru", [
                ("PHC-KA-MYS-01", "Nanjangud Block PHC", "CHC", 12.1200, 76.6800, 57000, "LOW", 0.14),
                ("PHC-KA-MYS-02", "Hunsur Model PHC", "Tier-1", 12.3100, 76.2900, 46000, "LOW", 0.19),
                ("PHC-KA-MYS-03", "T Narasipura PHC", "Tier-2", 12.2100, 76.9000, 39000, "LOW", 0.16),
            ]),
            # Karnataka - Belagavi
            ("Belagavi", [
                ("PHC-KA-BLG-01", "Gokak Taluk PHC", "CHC", 16.1600, 74.8200, 62000, "LOW", 0.20),
                ("PHC-KA-BLG-02", "Chikkodi Model PHC", "Tier-1", 16.4300, 74.5900, 48000, "LOW", 0.17),
                ("PHC-KA-BLG-03", "Bailhongal Rural PHC", "Tier-2", 15.8100, 74.8500, 41000, "LOW", 0.15),
            ]),
            # Karnataka - Ballari
            ("Ballari", [
                ("PHC-KA-BLR-01B", "Sandur Mining Belt PHC", "Tier-1", 15.0800, 76.5400, 45000, "HIGH", 0.77),
                ("PHC-KA-BLR-02B", "Siruguppa Rural PHC", "Tier-2", 15.6300, 76.8900, 39000, "HIGH", 0.72),
                ("PHC-KA-BLR-03B", "Hosapete CHC", "CHC", 15.2700, 76.3900, 64000, "HIGH", 0.68),
            ]),
            # Andhra Pradesh - Visakhapatnam
            ("Visakhapatnam", [
                ("PHC-AP-VSK-01", "Anakapalle Block PHC", "CHC", 17.6900, 83.0000, 63000, "LOW", 0.18),
                ("PHC-AP-VSK-02", "Bheemunipatnam PHC", "Tier-1", 17.8900, 83.4500, 47000, "LOW", 0.15),
                ("PHC-AP-VSK-03", "Paderu Tribal PHC", "Tier-2", 18.0800, 82.6600, 36000, "MEDIUM", 0.35),
            ]),
            # Andhra Pradesh - Krishna
            ("Krishna", [
                ("PHC-AP-KRN-01", "Gudivada Model PHC", "CHC", 16.4400, 80.9900, 58000, "MEDIUM", 0.44),
                ("PHC-AP-KRN-02", "Machilipatnam Urban PHC", "Urban PHC", 16.1800, 81.1300, 52000, "MEDIUM", 0.48),
                ("PHC-AP-KRN-03", "Nuzvid Rural PHC", "Tier-1", 16.7800, 80.8400, 46000, "LOW", 0.24),
            ]),
            # Andhra Pradesh - Guntur
            ("Guntur", [
                ("PHC-AP-GNT-01", "Tenali Taluk PHC", "CHC", 16.2400, 80.6400, 61000, "LOW", 0.17),
                ("PHC-AP-GNT-02", "Narasaraopet Model PHC", "Tier-1", 16.2300, 80.0500, 49000, "LOW", 0.19),
                ("PHC-AP-GNT-03", "Bapatla Coastal PHC", "Tier-2", 15.9000, 80.4600, 42000, "LOW", 0.22),
            ]),
            # Andhra Pradesh - Chittoor
            ("Chittoor", [
                ("PHC-AP-CTR-01", "Madanapalle Block PHC", "CHC", 13.5500, 78.5000, 65000, "HIGH", 0.74),
                ("PHC-AP-CTR-02", "Srikalahasti Model PHC", "Tier-1", 13.7500, 79.7000, 48000, "HIGH", 0.71),
                ("PHC-AP-CTR-03", "Punganur Rural PHC", "Tier-2", 13.3600, 78.5800, 39000, "HIGH", 0.76),
            ]),
            # Telangana - Hyderabad
            ("Hyderabad", [
                ("PHC-TG-HYD-01", "Charminar Urban Health", "Urban PHC", 17.3616, 78.4747, 88000, "MEDIUM", 0.51),
                ("PHC-TG-HYD-02", "Secunderabad Model PHC", "Urban PHC", 17.4399, 78.4983, 82000, "LOW", 0.25),
                ("PHC-TG-HYD-03", "Golconda Community PHC", "CHC", 17.3833, 78.4011, 74000, "MEDIUM", 0.47),
                ("PHC-TG-HYD-04", "Kukatpally Urban PHC", "Urban PHC", 17.4849, 78.4138, 79000, "LOW", 0.29),
            ]),
            # Telangana - Warangal
            ("Warangal", [
                ("PHC-TG-WGL-01", "Hanamkonda Model PHC", "CHC", 18.0100, 79.5600, 59000, "LOW", 0.16),
                ("PHC-TG-WGL-02", "Jangaon Rural PHC", "Tier-1", 17.7200, 79.1600, 46000, "LOW", 0.18),
                ("PHC-TG-WGL-03", "Narsampet Community PHC", "Tier-2", 17.9200, 79.8900, 38000, "LOW", 0.20),
            ]),
            # Telangana - Karimnagar
            ("Karimnagar", [
                ("PHC-TG-KRM-01", "Huzurabad Block PHC", "CHC", 18.1900, 79.3800, 53000, "LOW", 0.15),
                ("PHC-TG-KRM-02", "Jammikunta Model PHC", "Tier-1", 18.2800, 79.4600, 44000, "LOW", 0.19),
                ("PHC-TG-KRM-03", "Manakondur Rural PHC", "Tier-2", 18.4000, 79.2000, 37000, "LOW", 0.17),
            ]),
            # Maharashtra - Pune
            ("Pune", [
                ("PHC-MH-PUN-01", "Shirur Taluk PHC", "CHC", 18.8200, 74.3700, 64000, "LOW", 0.14),
                ("PHC-MH-PUN-02", "Hadapsar Model Health", "Urban PHC", 18.5000, 73.9300, 81000, "LOW", 0.18),
                ("PHC-MH-PUN-03", "Baramati Rural PHC", "CHC", 18.1500, 74.5800, 58000, "LOW", 0.12),
                ("PHC-MH-PUN-04", "Junnar Hill PHC", "Tier-1", 19.2000, 73.8700, 42000, "LOW", 0.19),
                ("PHC-MH-PUN-05", "Khed Community PHC", "Tier-2", 18.8500, 73.9000, 45000, "LOW", 0.16),
            ]),
            # Maharashtra - Nagpur
            ("Nagpur", [
                ("PHC-MH-NGP-01", "Kamptee Model PHC", "CHC", 21.2200, 79.1900, 60000, "MEDIUM", 0.46),
                ("PHC-MH-NGP-02", "Katol Rural PHC", "Tier-1", 21.2700, 78.5800, 48000, "MEDIUM", 0.42),
                ("PHC-MH-NGP-03", "Umred Community PHC", "Tier-2", 20.8500, 79.3200, 41000, "MEDIUM", 0.49),
            ]),
            # Maharashtra - Nashik
            ("Nashik", [
                ("PHC-MH-NSK-01", "Sinnar Block PHC", "CHC", 19.8500, 74.0000, 56000, "LOW", 0.17),
                ("PHC-MH-NSK-02", "Trimbak Tribal PHC", "Tier-1", 19.9300, 73.5300, 39000, "LOW", 0.21),
                ("PHC-MH-NSK-03", "Niphad Model PHC", "Tier-2", 20.0800, 74.1100, 46000, "LOW", 0.15),
            ]),
        ]

        all_phcs = []
        for dist_name, phc_list in phc_definitions:
            district_obj = districts_dict[dist_name]
            for code, name, tier, lat, lng, pop, risk_cat, risk_sc in phc_list:
                phc = PHC(
                    code=code,
                    name=name,
                    district_id=district_obj.id,
                    tier=tier,
                    latitude=lat,
                    longitude=lng,
                    catchment_population=pop,
                    contact_phone=f"+91-44-{self.rng.randint(2000000, 9999999)}",
                    is_active=True,
                    current_risk_score=risk_sc,
                    risk_category=risk_cat,
                )
                db.add(phc)
                db.flush()
                all_phcs.append(phc)

        return all_phcs

    # -----------------------------------------------------------------------
    # 5. Formulary (Medicines) & Suppliers
    # -----------------------------------------------------------------------
    def _generate_medicines(self, db: Session) -> Dict[str, Medicine]:
        medicines_data = [
            ("MED-ORS-01", "ORS (Oral Rehydration Salts)", "Emergency / Gastro", "sachets", 6.50, 120.0, 14, 36, "WHO formula glucose electrolyte sachet for dehydration and diarrheal illness."),
            ("MED-PCM-02", "Paracetamol 500mg Tablets", "Analgesics & Antipyretic", "tablets", 1.20, 250.0, 14, 24, "First-line antipyretic and analgesic for fever and pain management."),
            ("MED-AMX-03", "Amoxicillin 500mg Capsules", "Antibiotics", "capsules", 4.80, 80.0, 14, 24, "Broad-spectrum penicillin antibiotic for bacterial infections."),
            ("MED-ART-04", "Artesunate 60mg Injection", "Antimalarial", "vials", 110.0, 15.0, 21, 24, "Intravenous antimalarial for severe falciparum malaria treatment."),
            ("MED-DOX-05", "Doxycycline 100mg Tablets", "Antibiotics", "tablets", 3.20, 45.0, 14, 36, "Tetracycline class antibiotic for vector-borne infections, scrub typhus, leptospirosis."),
            ("MED-NS-06", "Normal Saline 0.9% IV 500ml", "IV Fluids", "bottles", 32.0, 60.0, 14, 36, "Isotonic crystalloid fluid for emergency volume resuscitation and dilution."),
            ("MED-RL-07", "Ringer's Lactate IV 500ml", "IV Fluids", "bottles", 35.0, 55.0, 14, 36, "Balanced fluid replacement for shock, dehydration, dengue plasma leakage."),
            ("MED-INS-08", "Human Insulin (Regular) 40IU/ml", "Endocrine", "vials", 145.0, 12.0, 21, 24, "Fast-acting glycemic control for diabetic ketoacidosis and inpatient stabilization."),
            ("MED-MET-09", "Metformin 500mg Tablets", "NCD / Endocrine", "tablets", 1.50, 110.0, 14, 36, "First-line oral biguanide anti-diabetic medication."),
            ("MED-AZI-10", "Azithromycin 500mg Tablets", "Antibiotics", "tablets", 12.0, 35.0, 14, 24, "Macrolide antibiotic for acute respiratory tract infections."),
            ("MED-CIP-11", "Ciprofloxacin 500mg Tablets", "Antibiotics", "tablets", 3.50, 40.0, 14, 36, "Fluoroquinolone for urinary and severe gastrointestinal infections."),
            ("MED-CTX-12", "Ceftriaxone 1g Injection", "Antibiotics", "vials", 48.0, 25.0, 14, 24, "Third-generation cephalosporin for severe sepsis, pneumonia, meningitis."),
            ("MED-SAL-13", "Salbutamol Inhaler 100mcg", "Respiratory", "inhalers", 85.0, 18.0, 14, 24, "Short-acting beta-2 agonist for acute bronchospasm and asthma relief."),
            ("MED-OXY-14", "Oxytocin 10IU Injection", "Maternal Health", "ampoules", 18.50, 20.0, 21, 24, "Essential uterotonic for active management of third-stage labor and PPH prevention."),
            ("MED-IFA-15", "Iron & Folic Acid Tablets", "Maternal Health", "tablets", 0.80, 200.0, 14, 36, "Prophylactic and therapeutic anemia management for pregnant women and adolescents."),
            ("MED-ARV-16", "Anti-Rabies Vaccine (ARV)", "Vaccines / Emergency", "vials", 320.0, 8.0, 30, 24, "Post-exposure prophylaxis for animal bite management."),
            ("MED-ASV-17", "Snake Antivenom Polyvalent", "Emergency / Critical", "vials", 580.0, 5.0, 30, 24, "Life-saving polyvalent antivenom for venomous snakebite envenomation."),
            ("MED-METO-18", "Metoprolol 50mg Tablets", "Cardiovascular", "tablets", 2.40, 60.0, 14, 36, "Cardioselective beta-blocker for hypertension and ischemic heart disease."),
            ("MED-PAN-19", "Pantoprazole 40mg Tablets", "Gastrointestinal", "tablets", 2.10, 95.0, 14, 36, "Proton pump inhibitor for peptic ulcers, acid reflux, stress ulcer prophylaxis."),
            ("MED-ZNC-20", "Zinc Sulfate 20mg Tablets", "Pediatric", "tablets", 1.10, 85.0, 14, 36, "Adjunct treatment for childhood acute diarrhea management."),
            ("MED-OSE-21", "Oseltamivir 75mg Capsules", "Antiviral", "capsules", 45.0, 15.0, 21, 24, "Neuraminidase inhibitor for influenza and seasonal viral outbreaks."),
            ("MED-DEX-22", "Dexamethasone 4mg/ml Injection", "Corticosteroids", "vials", 14.0, 22.0, 14, 36, "High-potency anti-inflammatory corticosteroid for acute respiratory distress & anaphylaxis."),
        ]
        medicines_dict = {}
        for code, name, cat, unit, cost, std_dem, safety, shelf, desc in medicines_data:
            m = Medicine(
                code=code,
                name=name,
                category=cat,
                unit=unit,
                unit_cost_inr=cost,
                standard_daily_demand=std_dem,
                safety_stock_days=safety,
                shelf_life_months=shelf,
                description=desc,
            )
            db.add(m)
            db.flush()
            medicines_dict[code] = m
        return medicines_dict

    def _generate_suppliers(self, db: Session) -> List[Supplier]:
        suppliers_data = [
            ("Tamil Nadu Medical Services Corp (TNMSC)", "SUP-TNMSC-01", "Dr. A. Raman", "+91-44-2819-0200", 4, 0.96, "Tamil Nadu"),
            ("Kerala Medical Services Corp Ltd (KMSCL)", "SUP-KMSCL-02", "Smt. L. Nair", "+91-471-247-1080", 5, 0.94, "Kerala"),
            ("Karnataka State Drugs Logistics", "SUP-KSDL-03", "Shri. R. Patil", "+91-80-2228-4100", 5, 0.91, "Karnataka"),
            ("Haffkine Bio-Pharmaceutical Corp", "SUP-HAFF-04", "Dr. V. Deshmukh", "+91-22-2412-9220", 6, 0.93, "Maharashtra"),
            ("National Central Medical Stores Depot", "SUP-CMSD-05", "Dr. K. Sharma", "+91-11-2306-1200", 7, 0.89, "All India"),
        ]
        suppliers_list = []
        for name, code, contact, phone, lead_time, rel, cov in suppliers_data:
            sup = Supplier(
                name=name,
                code=code,
                contact_person=contact,
                phone=phone,
                lead_time_days=lead_time,
                reliability_score=rel,
                state_coverage=cov,
            )
            db.add(sup)
            db.flush()
            suppliers_list.append(sup)
        return suppliers_list

    # -----------------------------------------------------------------------
    # 6. Users & Demo Accounts
    # -----------------------------------------------------------------------
    def _generate_users(
        self,
        db: Session,
        roles_dict: Dict[str, Role],
        states_dict: Dict[str, State],
        districts_dict: Dict[str, District],
        all_phcs: List[PHC],
    ) -> List[User]:
        demo_users = [
            ("national.admin@resilience.gov.in", "Dr. Rajeshwar Rao", "NATIONAL_ADMIN", None, None, None),
            ("state.tn.admin@resilience.gov.in", "Dr. K. Radhakrishnan", "STATE_ADMIN", states_dict["TN"].id, None, None),
            ("district.namakkal@resilience.gov.in", "Dr. S. Meenakshi", "DISTRICT_ADMIN", states_dict["TN"].id, districts_dict["Namakkal"].id, None),
            ("phc.kollihills@resilience.gov.in", "Dr. Arvind Kumar", "PHC_ADMIN", states_dict["TN"].id, districts_dict["Namakkal"].id, all_phcs[0].id),
            ("supply.chain@resilience.gov.in", "T. Venkataraman", "SUPPLY_CHAIN_MANAGER", states_dict["TN"].id, districts_dict["Salem"].id, None),
        ]
        users = []
        for email, full_name, role_name, st_id, dist_id, phc_id in demo_users:
            u = User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash("resilience2026"),
                role_id=roles_dict[role_name].id,
                state_id=st_id,
                district_id=dist_id,
                phc_id=phc_id,
                is_active=True,
            )
            db.add(u)
            users.append(u)
        db.flush()
        return users

    # -----------------------------------------------------------------------
    # 7. Facility Operations: Beds, Staff, Attendance
    # -----------------------------------------------------------------------
    def _generate_facility_operations(self, db: Session, all_phcs: List[PHC]) -> Tuple[int, int, int]:
        beds_count = 0
        staff_count = 0
        att_count = 0

        for phc in all_phcs:
            is_crisis = (phc.district.name == self.outbreak_district)
            is_surplus = (phc.district.name == self.surplus_district)

            # Bed capacities
            if phc.tier == "CHC":
                tot_beds = 30
            elif phc.tier == "Tier-1":
                tot_beds = 20
            elif phc.tier == "Urban PHC":
                tot_beds = 24
            else:
                tot_beds = 16

            if is_crisis:
                occ_rate = self.rng.uniform(0.86, 0.96)
            elif is_surplus:
                occ_rate = self.rng.uniform(0.40, 0.58)
            else:
                occ_rate = self.rng.uniform(0.50, 0.78)

            occ_beds = int(tot_beds * occ_rate)
            avail_beds = tot_beds - occ_beds
            icu_tot = 4 if phc.tier == "CHC" else 2
            icu_occ = min(icu_tot, int(icu_tot * occ_rate + 0.5))
            oxy_tot = 8 if phc.tier == "CHC" else 6
            oxy_occ = min(oxy_tot, int(oxy_tot * occ_rate))
            iso_tot = 4
            iso_occ = min(iso_tot, int(iso_tot * occ_rate))

            bed = Bed(
                phc_id=phc.id,
                total_beds=tot_beds,
                occupied_beds=occ_beds,
                available_beds=avail_beds,
                icu_beds=icu_tot,
                icu_occupied=icu_occ,
                oxygen_beds=oxy_tot,
                oxygen_occupied=oxy_occ,
                isolation_beds=iso_tot,
                isolation_occupied=iso_occ,
                occupancy_rate=round(occ_beds / tot_beds, 3),
            )
            db.add(bed)
            beds_count += 1

            # Staff categories & today's attendance
            staff_roles = [
                ("DOCTOR", 3 if phc.tier == "CHC" else 2),
                ("NURSE", 8 if phc.tier == "CHC" else 5),
                ("PHARMACIST", 2 if phc.tier == "CHC" else 1),
                ("LAB_TECH", 2 if phc.tier == "CHC" else 1),
                ("SUPPORT_STAFF", 4 if phc.tier == "CHC" else 3),
            ]
            for role_type, sanctioned in staff_roles:
                if is_crisis and role_type in ["DOCTOR", "NURSE"]:
                    present = max(1, sanctioned - self.rng.randint(1, 2))
                else:
                    present = sanctioned if self.rng.random() > 0.15 else max(1, sanctioned - 1)
                leave = sanctioned - present
                att_rate = round(present / sanctioned, 2)

                st = Staff(
                    phc_id=phc.id,
                    role_type=role_type,
                    sanctioned_count=sanctioned,
                    active_count=sanctioned,
                    present_today=present,
                    on_leave=leave,
                    attendance_rate=att_rate,
                )
                db.add(st)
                db.flush()
                staff_count += 1

                att = StaffAttendance(
                    staff_id=st.id,
                    date=self.now.replace(hour=8, minute=0, second=0, microsecond=0),
                    scheduled=sanctioned,
                    present=present,
                    absent=0,
                    on_leave=leave,
                    attendance_percentage=att_rate * 100.0,
                )
                db.add(att)
                att_count += 1

        return beds_count, staff_count, att_count

    # -----------------------------------------------------------------------
    # 8. Time-Series: Footfall & Medicine Consumption
    # -----------------------------------------------------------------------
    def _generate_timeseries(
        self,
        db: Session,
        all_phcs: List[PHC],
        medicines_dict: Dict[str, Medicine],
    ) -> Tuple[int, int]:
        ff_count = 0
        mc_count = 0
        med_list = list(medicines_dict.values())

        for phc in all_phcs:
            is_crisis = (phc.district.name == self.outbreak_district)
            base_outpatients = 120 if phc.tier == "CHC" else 80

            for day_offset in range(self.history_days, -1, -1):
                rec_date = (self.now - timedelta(days=day_offset)).replace(hour=17, minute=0, second=0, microsecond=0)
                dow = rec_date.weekday()
                dow_mult = 1.2 if dow in [0, 1] else (0.75 if dow == 6 else 1.0)

                # Simulate exponential surge during outbreak window
                if is_crisis and day_offset <= 14:
                    surge_mult = 1.35 + (14 - day_offset) * 0.03
                    is_surge = True
                else:
                    surge_mult = 1.0
                    is_surge = False

                opd = int(base_outpatients * dow_mult * surge_mult * self.rng.uniform(0.9, 1.15))
                ipd = int(opd * 0.12 * surge_mult)
                emg = int(opd * 0.08 * surge_mult)
                fever = int(opd * (0.42 if is_surge else 0.18) * self.rng.uniform(0.95, 1.1))
                total = opd + ipd + emg

                pf = PatientFootfall(
                    phc_id=phc.id,
                    date=rec_date,
                    outpatient_count=opd,
                    inpatient_count=ipd,
                    emergency_count=emg,
                    fever_respiratory_count=fever,
                    total_footfall=total,
                    is_surge_anomaly=is_surge,
                )
                db.add(pf)
                ff_count += 1

                # Daily consumption per medicine
                for med in med_list:
                    std_demand = med.standard_daily_demand
                    if phc.tier == "CHC":
                        std_demand *= 1.4
                    elif phc.tier == "Tier-2":
                        std_demand *= 0.8

                    is_fever_med = med.code in ["MED-ORS-01", "MED-PCM-02", "MED-RL-07", "MED-NS-06", "MED-DOX-05"]
                    if is_crisis and day_offset <= 14 and is_fever_med:
                        med_surge = 1.4 + (14 - day_offset) * 0.04
                        is_anom = True
                    else:
                        med_surge = 1.0
                        is_anom = False

                    qty = max(1, int(std_demand * med_surge * self.rng.uniform(0.85, 1.18)))
                    mc = MedicineConsumption(
                        phc_id=phc.id,
                        medicine_id=med.id,
                        date=rec_date,
                        quantity_consumed=qty,
                        is_anomaly=is_anom,
                    )
                    db.add(mc)
                    mc_count += 1

        return ff_count, mc_count

    # -----------------------------------------------------------------------
    # 9. Inventory, Risk Scores, and Demand Forecasts
    # -----------------------------------------------------------------------
    def _generate_inventory_and_ai_metrics(
        self,
        db: Session,
        all_phcs: List[PHC],
        medicines_dict: Dict[str, Medicine],
        supplier_obj: Supplier,
    ) -> Tuple[int, int, int]:
        inv_count = 0
        risk_count = 0
        fc_count = 0
        med_list = list(medicines_dict.values())

        for phc in all_phcs:
            is_crisis = (phc.district.name == self.outbreak_district)
            is_surplus = (phc.district.name == self.surplus_district)

            for med in med_list:
                std_demand = med.standard_daily_demand
                if phc.tier == "CHC":
                    std_demand *= 1.4
                elif phc.tier == "Tier-2":
                    std_demand *= 0.8

                is_fever_med = med.code in ["MED-ORS-01", "MED-PCM-02", "MED-RL-07", "MED-NS-06", "MED-DOX-05"]
                daily_burn = std_demand * (1.6 if (is_crisis and is_fever_med) else 1.0)

                if is_crisis and is_fever_med:
                    days_stock = self.rng.uniform(1.8, 3.2)
                    curr_stock = int(daily_burn * days_stock)
                    incoming = 0
                    lead_time = 6
                    prob = self.rng.uniform(0.88, 0.96)
                    r_level = "CRITICAL"
                elif is_surplus and is_fever_med:
                    days_stock = self.rng.uniform(26.0, 36.0)
                    curr_stock = int(daily_burn * days_stock)
                    incoming = 500
                    lead_time = 4
                    prob = self.rng.uniform(0.04, 0.12)
                    r_level = "LOW"
                else:
                    days_stock = self.rng.uniform(8.0, 22.0)
                    curr_stock = int(daily_burn * days_stock)
                    incoming = self.rng.choice([0, 100, 200])
                    lead_time = self.rng.randint(3, 6)
                    if days_stock < 4:
                        r_level = "CRITICAL"
                        prob = 0.85
                    elif days_stock < 7:
                        r_level = "HIGH"
                        prob = 0.65
                    elif days_stock < 12:
                        r_level = "MEDIUM"
                        prob = 0.38
                    else:
                        r_level = "LOW"
                        prob = 0.10

                inv = Inventory(
                    phc_id=phc.id,
                    medicine_id=med.id,
                    current_stock=curr_stock,
                    batch_number=f"BN-{med.code[-3:]}-{self.rng.randint(100, 999)}",
                    expiry_date=self.now + timedelta(days=med.shelf_life_months * 30),
                    reorder_threshold=int(std_demand * med.safety_stock_days),
                    incoming_stock=incoming,
                    incoming_delivery_date=self.now + timedelta(days=lead_time) if incoming > 0 else None,
                    supplier_id=supplier_obj.id,
                    last_updated=self.now,
                )
                db.add(inv)
                inv_count += 1

                # Risk Score
                rs = RiskScore(
                    phc_id=phc.id,
                    medicine_id=med.id,
                    stock_out_probability=round(prob, 2),
                    risk_level=r_level,
                    days_stock_remaining=round(days_stock, 1),
                    current_stock=curr_stock,
                    daily_consumption_rate=round(daily_burn, 1),
                    supplier_lead_time_days=lead_time,
                    contributing_factors={
                        "footfall_surge": "+37%" if (is_crisis and is_fever_med) else "+4%",
                        "daily_consumption_rate": round(daily_burn, 1),
                        "days_remaining": round(days_stock, 1),
                        "lead_time_days": lead_time,
                        "safety_buffer_depleted": days_stock < med.safety_stock_days,
                    },
                    recommended_action=(
                        f"Initiate priority redistribution transfer of {int(daily_burn * 12)} units from Salem District surplus"
                        if r_level in ["CRITICAL", "HIGH"]
                        else "Maintain standard routine replenishment schedule."
                    ),
                    confidence=0.91 if is_crisis else 0.88,
                    calculated_at=self.now,
                )
                db.add(rs)
                risk_count += 1

                # Demand Forecast (7D)
                fc_7d = daily_burn * (1.18 if (is_crisis and is_fever_med) else 1.02)
                fc = Forecast(
                    phc_id=phc.id,
                    medicine_id=med.id,
                    forecast_horizon_days=7,
                    predicted_daily_demand=round(fc_7d, 1),
                    total_forecasted_demand=round(fc_7d * 7, 1),
                    current_avg_demand=round(daily_burn, 1),
                    demand_change_percent=round(((fc_7d - daily_burn) / daily_burn) * 100, 1),
                    confidence_score=0.89,
                    lower_bound=round(fc_7d * 0.88, 1),
                    upper_bound=round(fc_7d * 1.15, 1),
                    trend="INCREASING" if (is_crisis and is_fever_med) else "STABLE",
                    generated_at=self.now,
                )
                db.add(fc)
                fc_count += 1

        return inv_count, risk_count, fc_count

    # -----------------------------------------------------------------------
    # 10. Alerts
    # -----------------------------------------------------------------------
    def _generate_alerts(self, db: Session, all_phcs: List[PHC]) -> List[Alert]:
        alerts_seed = [
            ("ALT-NMK-001", all_phcs[0].id, "CRITICAL_STOCKOUT", "CRITICAL", "Imminent Stock-out: ORS (Oral Rehydration Salts)", "ORS (Oral Rehydration Salts)",
             "Current inventory of ORS sachets is down to 2.37 days of supply against a +37% outpatient surge.",
             "Complete stock-out projected in 58 hours without emergency transfer.",
             "Kolli Hills PHC has experienced a surge of acute gastroenteritis and fever cases. Daily consumption escalated from 45 to 135 sachets/day while supplier replenishment lead time is 6 days.",
             "Approve immediate redistribution transfer of 1,900 ORS sachets from Salem Valapady Central PHC."),
            
            ("ALT-NMK-002", all_phcs[1].id, "HIGH_DEMAND_SPIKE", "HIGH", "Demand Surge: Paracetamol 500mg", "Paracetamol 500mg Tablets",
             "Fever patient footfall has jumped 44% in Mallasamudram PHC over the past 5 days.",
             "Stock depletion predicted within 3.6 days at current burn rate.",
             "Epidemiological correlation indicates local viral fever/dengue cluster in Mallasamudram block.",
             "Dispatch supplementary buffer stock of 4,000 tablets from district reserve."),

            ("ALT-NMK-003", all_phcs[0].id, "LOW_BED_CAPACITY", "CRITICAL", "Bed Capacity Overload: 95% Occupancy", "Inpatient Beds",
             "Occupancy has reached 19 out of 20 beds with 4 fever patients in observation queue.",
             "Potential diversion required within 12 hours if admission rate persists.",
             "Inpatient admissions have risen 2.4x due to seasonal mosquito vector activity.",
             "Authorize activation of temporary 6-bed observation ward and alert Mohanur 24x7 CHC."),

            ("ALT-DHP-001", all_phcs[22].id, "STAFF_SHORTAGE", "HIGH", "Medical Officer Shortage on Duty", "Duty Doctors",
             "2 out of 3 sanctioned doctors on emergency leave during seasonal peak.",
             "Consultation wait time increased to 64 minutes.",
             "Staff absenteeism combined with high footfall creates operational bottleneck.",
             "Deploy mobile medical team doctor from Dharmapuri DH."),

            ("ALT-PLK-001", all_phcs[32].id, "CRITICAL_STOCKOUT", "HIGH", "Anti-Rabies Vaccine (ARV) Low Stock", "Anti-Rabies Vaccine",
             "Current stock is 6 vials with 3 dog bite cases presenting daily.",
             "Stock-out expected in 48 hours.",
             "Supply consignment delayed from state central warehouse.",
             "Requisition emergency inter-district transfer from Ernakulam Aluva PHC."),
        ]
        alerts = []
        for code, phc_id, cat, sev, title, res, reason, pred, ai_exp, rec_act in alerts_seed:
            alt = Alert(
                alert_code=code,
                phc_id=phc_id,
                category=cat,
                severity=sev,
                title=title,
                resource_name=res,
                reason=reason,
                prediction=pred,
                ai_explanation=ai_exp,
                recommended_action=rec_act,
                status="ACTIVE",
                created_at=self.now,
            )
            db.add(alt)
            alerts.append(alt)
        return alerts

    # -----------------------------------------------------------------------
    # 11. Cross-District Redistribution Plans
    # -----------------------------------------------------------------------
    def _generate_redistribution(
        self,
        db: Session,
        districts_dict: Dict[str, District],
        all_phcs: List[PHC],
        medicines_dict: Dict[str, Medicine],
    ) -> int:
        ors_med = medicines_dict["MED-ORS-01"]
        pcm_med = medicines_dict["MED-PCM-02"]
        salem_dist = districts_dict["Salem"]
        namakkal_dist = districts_dict["Namakkal"]

        rec1 = RedistributionRecommendation(
            recommendation_code="REC-2026-SLM-NMK-01",
            source_district_id=salem_dist.id,
            dest_district_id=namakkal_dist.id,
            source_phc_id=all_phcs[8].id,
            dest_phc_id=all_phcs[0].id,
            medicine_id=ors_med.id,
            recommended_quantity=1900,
            source_surplus_quantity=2800,
            dest_deficit_quantity=1900,
            urgency="HIGH",
            reason="Severe ORS deficit in Kolli Hills PHC (2.3 days remaining, risk 92%) with acute fever surge. Salem district maintains 2,800 units of verified surplus stock above safety threshold.",
            estimated_transit_hours=2.5,
            estimated_impact="Prevents imminent stock-out in Namakkal district for 14 days and stabilizes 38,000 catchment population.",
            status="RECOMMENDED",
            created_at=self.now,
        )
        db.add(rec1)

        rec2 = RedistributionRecommendation(
            recommendation_code="REC-2026-CBE-ERD-02",
            source_district_id=districts_dict["Coimbatore"].id,
            dest_district_id=districts_dict["Erode"].id,
            source_phc_id=all_phcs[16].id,
            dest_phc_id=all_phcs[21].id,
            medicine_id=pcm_med.id,
            recommended_quantity=3200,
            source_surplus_quantity=5400,
            dest_deficit_quantity=3000,
            urgency="MEDIUM",
            reason="Pre-emptive buffer transfer of Paracetamol 500mg prior to projected weekend peak demand in Erode Bhavani sector.",
            estimated_transit_hours=1.8,
            estimated_impact="Maintains 18-day buffer in Bhavani PHC without depleting Coimbatore safety reserve.",
            status="RECOMMENDED",
            created_at=self.now,
        )
        db.add(rec2)
        return 2

    # -----------------------------------------------------------------------
    # 12. Crisis / Outbreak Simulations
    # -----------------------------------------------------------------------
    def _generate_emergency_scenarios(self, db: Session, districts_dict: Dict[str, District]) -> List[EmergencyEvent]:
        events = [
            EmergencyEvent(
                event_type="DENGUE_OUTBREAK",
                name="Vector-Borne Outbreak Simulation (Dengue & Acute Viral Surge)",
                affected_district_id=districts_dict["Namakkal"].id,
                is_active=False,
                footfall_multiplier=1.45,
                medicine_demand_multiplier=1.85,
                bed_occupancy_multiplier=1.35,
                staff_strain_multiplier=1.25,
                ai_situation_summary="Simulated seasonal vector surge modeled on historical dengue epidemiological vectors. Triggers +45% footfall spike, +85% demand surge for ORS/Paracetamol/IV fluids, and bed occupancy saturation across 8 PHCs in Namakkal district.",
                created_at=self.now,
            ),
            EmergencyEvent(
                event_type="MONSOON_FLOOD",
                name="Monsoon Flash Flood & Water Contamination Emergency",
                affected_district_id=districts_dict["Ernakulam"].id,
                is_active=False,
                footfall_multiplier=1.60,
                medicine_demand_multiplier=2.10,
                bed_occupancy_multiplier=1.50,
                staff_strain_multiplier=1.30,
                ai_situation_summary="Simulated coastal monsoon inundation and drinking water contamination. Triggers acute surge in waterborne gastrointestinal illnesses, leptospirosis, and demand for doxycycline/antidiarrheal packs.",
                created_at=self.now,
            ),
            EmergencyEvent(
                event_type="HEATWAVE_CRISIS",
                name="Extreme Summer Heatwave & Dehydration Emergency",
                affected_district_id=districts_dict["Karimnagar"].id,
                is_active=False,
                footfall_multiplier=1.35,
                medicine_demand_multiplier=1.70,
                bed_occupancy_multiplier=1.25,
                staff_strain_multiplier=1.15,
                ai_situation_summary="Simulated 44.5C extreme temperature heatwave index. Elevated dehydration admissions, heat exhaustion presentations, and severe IV fluid / ORS consumption velocity.",
                created_at=self.now,
            ),
            EmergencyEvent(
                event_type="RESPIRATORY_SURGE",
                name="Seasonal Acute Respiratory Viral Outbreak",
                affected_district_id=districts_dict["Pune"].id,
                is_active=False,
                footfall_multiplier=1.50,
                medicine_demand_multiplier=1.90,
                bed_occupancy_multiplier=1.40,
                staff_strain_multiplier=1.20,
                ai_situation_summary="Simulated airborne seasonal influenza & RSV cluster. Substantial escalation in bronchodilator inhalers, antibiotics, azithromycin, and oxygen bed occupancy.",
                created_at=self.now,
            ),
        ]
        for ev in events:
            db.add(ev)
        return events

    # -----------------------------------------------------------------------
    # 13. Federated Learning (BRICS Mesh)
    # -----------------------------------------------------------------------
    def _generate_federated_mesh(self, db: Session, countries_dict: Dict[str, Country]) -> Tuple[int, int]:
        brics_nodes_data = [
            ("IND", "India ICMR Resilience Node (Hub)", "CONNECTED", 142000, 0.88),
            ("BRA", "Brazil Fiocruz Health Intelligence Node", "CONNECTED", 118000, 0.84),
            ("RUS", "Russia MinZdrav Medical Logistics Node", "CONNECTED", 96000, 0.83),
            ("CHN", "China CCDC Epidemic Intelligence Node", "CONNECTED", 215000, 0.89),
            ("ZAF", "South Africa SAMRC Healthcare Node", "CONNECTED", 84000, 0.81),
        ]
        fed_nodes_list = []
        for c_code, n_name, status, dpoints, acc in brics_nodes_data:
            c_obj = countries_dict[c_code]
            fn = FederatedNode(
                country_id=c_obj.id,
                node_name=n_name,
                status=status,
                local_data_points=dpoints,
                local_accuracy=acc,
                last_sync_time=self.now - timedelta(minutes=45),
                created_at=self.now,
            )
            db.add(fn)
            db.flush()
            fed_nodes_list.append(fn)

        round_configs = [
            (1, 0.862, 0.058, 248.5, [0.84, 0.81, 0.83, 0.86, 0.80]),
            (2, 0.884, 0.041, 248.5, [0.87, 0.84, 0.85, 0.89, 0.83]),
        ]
        rounds_count = 0
        for r_num, glob_acc, div, sz, node_accs in round_configs:
            for idx, fn in enumerate(fed_nodes_list):
                ftr = FederatedTrainingRound(
                    round_number=r_num,
                    node_id=fn.id,
                    local_loss=round(1.0 - node_accs[idx] * 0.9, 3),
                    local_accuracy=node_accs[idx],
                    global_aggregated_accuracy=glob_acc,
                    weights_divergence=div,
                    parameters_size_kb=sz,
                    created_at=self.now - timedelta(hours=(3 - r_num) * 12),
                )
                db.add(ftr)
                rounds_count += 1

        return len(fed_nodes_list), rounds_count

    # -----------------------------------------------------------------------
    # 14. Model Benchmark Metrics & Audit Log
    # -----------------------------------------------------------------------
    def _generate_model_metrics(self, db: Session) -> int:
        metrics_data = [
            ("DemandForecaster_HoltWinters_v2", "MAE", 4.12, 7),
            ("DemandForecaster_HoltWinters_v2", "RMSE", 6.84, 7),
            ("DemandForecaster_HoltWinters_v2", "ACCURACY", 0.912, 7),
            ("StockoutRiskProbabilisticClassifier", "RECALL", 0.948, 14),
            ("StockoutRiskProbabilisticClassifier", "F1_SCORE", 0.924, 14),
            ("FootfallAnomalyDetector_IQR_ZScore", "ACCURACY", 0.965, None),
            ("RedistributionLinearOptimizer", "EFFICIENCY", 0.938, None),
        ]
        for mname, mtype, mval, hor in metrics_data:
            mm = ModelMetric(
                model_name=mname,
                metric_type=mtype,
                metric_value=mval,
                horizon_days=hor,
                evaluated_at=self.now,
            )
            db.add(mm)
        return len(metrics_data)

    def _generate_audit_log(self, db: Session) -> AuditLog:
        al = AuditLog(
            user_email="system@resilience.gov.in",
            action="SYSTEM_INITIALIZED",
            resource_type="SYSTEM",
            resource_id="0",
            details={
                "message": "Resilience AI Command Center synthetic healthcare database initialized with 98 PHCs, 22 essential medicines, and 90-day time-series history.",
                "provenance": SYNTHETIC_DATA_DISCLAIMER,
                "generator_seed": self.seed,
            },
            timestamp=self.now,
        )
        db.add(al)
        return al


# ---------------------------------------------------------------------------
# CLI Execution
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="RESILIENCE AI -- Synthetic Healthcare Dataset Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed (default: 42)")
    parser.add_argument("--days", type=int, default=90, help="Days of historical time-series to generate (default: 90)")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate database tables prior to generation")
    args = parser.parse_args()

    from app.db.session import SessionLocal, engine, Base
    from app.db.init_db import create_tables, _truncate_all_tables

    if args.reset:
        create_tables(drop_first=True)
    else:
        create_tables(drop_first=False)

    db = SessionLocal()
    try:
        _truncate_all_tables(db)
        generator = SyntheticDataGenerator(seed=args.seed, history_days=args.days)
        generator.generate_all(db, verbose=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
