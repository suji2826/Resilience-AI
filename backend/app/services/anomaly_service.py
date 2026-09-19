"""
RESILIENCE AI — Anomaly Detection Service
=========================================
Executes multivariate statistical anomaly detection over actual historical database
telemetry (PatientFootfall and MedicineConsumption).
Eliminates hardcoded calculations and returns full statistical explainability,
confidence ratings, and clinical mitigation protocols.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.entities import PatientFootfall, MedicineConsumption, PHC, Medicine, District, State
from app.ml.anomaly_detector import anomaly_detector


class AnomalyService:

    @staticmethod
    def detect_phc_footfall_anomalies(
        db: Session,
        phc_id: int,
        lookback_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Runs anomaly detection on actual patient footfall time series for a PHC.
        """
        phc = db.query(PHC).filter(PHC.id == phc_id).first()
        if not phc:
            raise ValueError(f"PHC {phc_id} not found")

        records = db.query(PatientFootfall).filter(
            PatientFootfall.phc_id == phc_id
        ).order_by(PatientFootfall.date.asc()).all()

        if len(records) < 7:
            return []

        # Analyze total footfall and fever counts
        total_ff_values = [float(r.total_footfall) for r in records]
        fever_ff_values = [float(r.fever_respiratory_count) for r in records]

        anomalies = []

        # 1. Check Total Footfall Surge
        total_res = anomaly_detector.detect_series_anomaly(
            values=total_ff_values,
            metric_name="Total Patient Footfall",
            z_threshold=2.0,
            context={
                "facility_tier": phc.tier,
                "catchment_population": phc.catchment_population
            }
        )

        if total_res["is_anomaly"]:
            latest_rec = records[-1]
            anomalies.append({
                "phc_id": phc.id,
                "phc_name": phc.name,
                "district_name": phc.district.name if phc.district else "",
                "state_name": phc.district.state.name if phc.district and phc.district.state else "",
                "date": latest_rec.date.strftime("%Y-%m-%d"),
                **total_res
            })

        # 2. Check Syndromic Fever Surge
        fever_res = anomaly_detector.detect_series_anomaly(
            values=fever_ff_values,
            metric_name="Fever & Respiratory Patient Count",
            z_threshold=2.0,
            context={
                "syndromic_surveillance_type": "Acute Febrile Illness",
                "fever_to_total_ratio": round(fever_ff_values[-1] / max(1.0, total_ff_values[-1]), 2)
            }
        )

        if fever_res["is_anomaly"]:
            latest_rec = records[-1]
            anomalies.append({
                "phc_id": phc.id,
                "phc_name": phc.name,
                "district_name": phc.district.name if phc.district else "",
                "state_name": phc.district.state.name if phc.district and phc.district.state else "",
                "date": latest_rec.date.strftime("%Y-%m-%d"),
                **fever_res
            })

        return anomalies

    @staticmethod
    def detect_phc_consumption_anomalies(
        db: Session,
        phc_id: int,
        medicine_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs anomaly detection on actual medicine consumption time series for a PHC.
        """
        phc = db.query(PHC).filter(PHC.id == phc_id).first()
        if not phc:
            raise ValueError(f"PHC {phc_id} not found")

        med_query = db.query(MedicineConsumption.medicine_id).filter(
            MedicineConsumption.phc_id == phc_id
        ).distinct()
        
        if medicine_id:
            med_query = med_query.filter(MedicineConsumption.medicine_id == medicine_id)

        med_ids = [m[0] for m in med_query.all()]
        anomalies = []

        for m_id in med_ids:
            med = db.query(Medicine).filter(Medicine.id == m_id).first()
            if not med:
                continue

            records = db.query(MedicineConsumption).filter(
                MedicineConsumption.phc_id == phc_id,
                MedicineConsumption.medicine_id == m_id
            ).order_by(MedicineConsumption.date.asc()).all()

            if len(records) < 7:
                continue

            cons_values = [float(r.quantity_consumed) for r in records]
            res = anomaly_detector.detect_series_anomaly(
                values=cons_values,
                metric_name=f"{med.name} Daily Consumption",
                z_threshold=2.0,
                context={
                    "medicine_code": med.code,
                    "category": med.category,
                    "unit": med.unit
                }
            )

            if res["is_anomaly"]:
                latest_rec = records[-1]
                anomalies.append({
                    "phc_id": phc.id,
                    "phc_name": phc.name,
                    "district_name": phc.district.name if phc.district else "",
                    "state_name": phc.district.state.name if phc.district and phc.district.state else "",
                    "medicine_id": med.id,
                    "medicine_name": med.name,
                    "medicine_category": med.category,
                    "date": latest_rec.date.strftime("%Y-%m-%d"),
                    **res
                })

        return anomalies

    @staticmethod
    def scan_network_anomalies(
        db: Session,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Scans all facilities across the database using actual telemetry to detect
        active footfall surges, syndromic fever outbreaks, and consumption spikes.
        """
        all_anomalies = []

        # 1. Query PHCs with highest recent footfall or flagged as outbreak epicenters
        phcs = db.query(PHC).order_by(PHC.current_risk_score.desc()).all()

        for p in phcs:
            if len(all_anomalies) >= limit:
                break

            # Check footfall anomalies
            ff_anoms = AnomalyService.detect_phc_footfall_anomalies(db, p.id)
            all_anomalies.extend(ff_anoms)

            # Check consumption anomalies for critical medicines
            cons_anoms = AnomalyService.detect_phc_consumption_anomalies(db, p.id)
            all_anomalies.extend(cons_anoms)

        # Sort anomalies by z-score severity descending
        all_anomalies.sort(key=lambda x: x.get("z_score", 0.0), reverse=True)
        trimmed_results = all_anomalies[:limit]

        critical_count = sum(1 for a in trimmed_results if a.get("severity") == "CRITICAL")
        high_count = sum(1 for a in trimmed_results if a.get("severity") == "HIGH")

        return {
            "total_anomalies_active": len(trimmed_results),
            "critical_count": critical_count,
            "high_count": high_count,
            "scan_timestamp": datetime.utcnow().isoformat(),
            "anomalies": trimmed_results
        }
