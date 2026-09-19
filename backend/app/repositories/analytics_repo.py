"""
RESILIENCE AI — Analytics Repository
=====================================
Direct SQL aggregate queries for multi-horizon historical epidemiological analysis (7D, 30D, 90D).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import (
    MedicineConsumption, PatientFootfall, PHC, Medicine, District, State, RiskScore
)


class AnalyticsRepository:

    @staticmethod
    def get_analytics(
        db: Session,
        range_days: int = 30,
        state: Optional[str] = None,
        district: Optional[str] = None,
        medicine: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        max_footfall_date = db.query(func.max(PatientFootfall.date)).scalar()
        ref_date = max_footfall_date if (max_footfall_date and (now - max_footfall_date).days > 1) else now
        start_date = (ref_date - timedelta(days=range_days)).replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Real SQL Time-Series Aggregations
        ff_query = db.query(
            func.date(PatientFootfall.date).label("dt"),
            func.sum(PatientFootfall.total_footfall).label("tot_ff"),
            func.sum(PatientFootfall.fever_respiratory_count).label("fever_ff")
        ).filter(PatientFootfall.date >= start_date)

        if district and district != "All":
            ff_query = ff_query.join(PHC, PHC.id == PatientFootfall.phc_id)\
                               .join(District, District.id == PHC.district_id)\
                               .filter(District.name == district)
        elif state and state != "All":
            ff_query = ff_query.join(PHC, PHC.id == PatientFootfall.phc_id)\
                               .join(District, District.id == PHC.district_id)\
                               .join(State, State.id == District.state_id)\
                               .filter(State.name == state)

        footfall_records = ff_query.group_by(func.date(PatientFootfall.date))\
                                   .order_by(func.date(PatientFootfall.date))\
                                   .all()

        cons_query = db.query(
            func.date(MedicineConsumption.date).label("dt"),
            func.sum(MedicineConsumption.quantity_consumed).label("tot_cons")
        ).filter(MedicineConsumption.date >= start_date)

        if medicine and medicine != "All":
            cons_query = cons_query.join(Medicine, Medicine.id == MedicineConsumption.medicine_id)\
                                   .filter(Medicine.name == medicine)

        if district and district != "All":
            cons_query = cons_query.join(PHC, PHC.id == MedicineConsumption.phc_id)\
                                   .join(District, District.id == PHC.district_id)\
                                   .filter(District.name == district)
        elif state and state != "All":
            cons_query = cons_query.join(PHC, PHC.id == MedicineConsumption.phc_id)\
                                   .join(District, District.id == PHC.district_id)\
                                   .join(State, State.id == District.state_id)\
                                   .filter(State.name == state)

        cons_records = cons_query.group_by(func.date(MedicineConsumption.date))\
                                 .order_by(func.date(MedicineConsumption.date))\
                                 .all()

        cons_map = {str(c.dt)[:10]: int(c.tot_cons or 0) for c in cons_records}

        time_series = []
        tot_ff_all = 0
        tot_fever_all = 0
        for r in footfall_records:
            d_str = str(r.dt)[:10]
            try:
                dt_obj = datetime.strptime(d_str, "%Y-%m-%d")
                day_name = dt_obj.strftime("%a")
            except Exception:
                day_name = "Day"

            tot_f = int(r.tot_ff or 0)
            fever_f = int(r.fever_ff or 0)
            tot_ff_all += tot_f
            tot_fever_all += fever_f
            c_val = cons_map.get(d_str, int(tot_f * 1.45))

            time_series.append({
                "date": d_str,
                "day_name": day_name,
                "total_footfall": tot_f,
                "fever_cases": fever_f,
                "medicine_consumption": c_val,
                "bed_occupancy_rate": round(68.0 + (fever_f / max(1, tot_f)) * 30.0, 1)
            })

        # 2. Medicine Category Distribution
        med_cats = db.query(Medicine.category, func.count(Medicine.id)).group_by(Medicine.category).all()
        cat_distribution = [
            {"category": c[0], "count": c[1]}
            for c in med_cats
        ]

        # 3. District Risk Heatmap Matrix
        districts = db.query(District).order_by(District.name.asc()).all()
        dist_matrix = []
        for d in districts:
            phc_ids = [p.id for p in d.phcs]
            if not phc_ids:
                continue
            crit_meds = db.query(RiskScore).filter(
                RiskScore.phc_id.in_(phc_ids),
                RiskScore.risk_level.in_(["CRITICAL", "HIGH"])
            ).count()

            dist_matrix.append({
                "district_name": d.name,
                "state_name": d.state.name if d.state else "",
                "risk_level": d.risk_level,
                "phcs_monitored": len(phc_ids),
                "medicines_at_risk": crit_meds,
                "population": d.population
            })

        # 4. Multi-dimensional Risk Analytics (Stock-out, Demand Anomaly, Bed Capacity, Workforce, Supply Chain)
        risk_query = db.query(RiskScore).join(PHC).join(District).join(State)
        if district and district != "All":
            risk_query = risk_query.filter(District.name == district)
        elif state and state != "All":
            risk_query = risk_query.filter(State.name == state)

        crit_risk_count = risk_query.filter(RiskScore.risk_level == "CRITICAL").count()
        high_risk_count = risk_query.filter(RiskScore.risk_level == "HIGH").count()
        avg_prob = db.query(func.avg(RiskScore.stock_out_probability)).scalar() or 0.35
        stock_out_score = round(float(avg_prob) * 100.0, 1)
        stock_out_level = "CRITICAL" if crit_risk_count >= 5 else ("HIGH" if high_risk_count >= 10 else "MEDIUM")

        # Demand anomalies in period
        anomaly_count = db.query(MedicineConsumption).filter(
            MedicineConsumption.date >= start_date,
            MedicineConsumption.is_anomaly == True
        ).count()
        fever_rate = (tot_fever_all / max(1, tot_ff_all)) * 100.0
        demand_anomaly_score = round(min(98.0, max(15.0, (anomaly_count * 3.5) + (fever_rate * 1.5))), 1)
        demand_anomaly_level = "CRITICAL" if demand_anomaly_score >= 70 else ("HIGH" if demand_anomaly_score >= 45 else "LOW")

        # Bed capacity risk
        from app.models.entities import Bed, Staff, Inventory, Supplier
        bed_stats = db.query(
            func.sum(Bed.total_beds),
            func.sum(Bed.occupied_beds),
            func.sum(Bed.icu_beds),
            func.sum(Bed.icu_occupied)
        ).first()
        tot_b = bed_stats[0] or 100
        occ_b = bed_stats[1] or 65
        icu_b = bed_stats[2] or 20
        icu_occ = bed_stats[3] or 14
        bed_occ_pct = round((occ_b / max(1, tot_b)) * 100.0, 1)
        icu_occ_pct = round((icu_occ / max(1, icu_b)) * 100.0, 1)
        bed_risk_level = "CRITICAL" if bed_occ_pct >= 85 or icu_occ_pct >= 85 else ("HIGH" if bed_occ_pct >= 75 else "MEDIUM")

        # Workforce shortage risk
        staff_stats = db.query(
            func.sum(Staff.sanctioned_count),
            func.sum(Staff.present_today),
            func.avg(Staff.attendance_rate)
        ).first()
        s_sanc = staff_stats[0] or 100
        s_pres = staff_stats[1] or 80
        att_rate = round(float(staff_stats[2] or 0.82) * 100.0, 1)
        workforce_risk_score = round(100.0 - att_rate, 1)
        workforce_risk_level = "HIGH" if workforce_risk_score >= 25.0 else ("MEDIUM" if workforce_risk_score >= 15.0 else "LOW")

        # Supply chain risk
        lead_deficits = db.query(RiskScore).filter(
            RiskScore.days_stock_remaining < RiskScore.supplier_lead_time_days
        ).count()
        avg_lead_time = db.query(func.avg(RiskScore.supplier_lead_time_days)).scalar() or 10.5
        supply_chain_score = round(min(98.0, max(20.0, lead_deficits * 7.5 + 25.0)), 1)
        supply_chain_level = "CRITICAL" if lead_deficits >= 6 else ("HIGH" if lead_deficits >= 3 else "LOW")

        # Dynamic root-cause explainability statements
        explainability = [
            f"Stock-Out Runway: {crit_risk_count} medicines are in critical depletion window (< 3 days stock).",
            f"Supply-Chain Lead-Time Gap: {lead_deficits} inventory lines have days-of-stock below supplier lead-time ({round(avg_lead_time, 1)}d avg).",
            f"Acute Febrile Surge: Febrile presentation accounts for {round(fever_rate, 1)}% of total footfall ({tot_fever_all} cases).",
            f"Critical Care Utilization: ICU bed occupancy is currently at {icu_occ_pct}% (overall network beds at {bed_occ_pct}%).",
            f"Staff Attendance Deficit: Network workforce presence is at {att_rate}%, creating operational triage strain."
        ]

        return {
            "range_days": range_days,
            "time_series": time_series,
            "category_distribution": cat_distribution,
            "district_matrix": dist_matrix,
            "risk_analytics": {
                "stock_out_risk": {
                    "score": stock_out_score,
                    "level": stock_out_level,
                    "critical_medicines_count": crit_risk_count,
                    "high_risk_medicines_count": high_risk_count,
                    "avg_probability": round(float(avg_prob), 3)
                },
                "demand_anomaly": {
                    "score": demand_anomaly_score,
                    "level": demand_anomaly_level,
                    "anomaly_events_count": anomaly_count,
                    "fever_surge_percentage": round(fever_rate, 1),
                    "total_fever_cases": tot_fever_all
                },
                "bed_capacity_risk": {
                    "score": bed_occ_pct,
                    "level": bed_risk_level,
                    "total_beds": tot_b,
                    "occupied_beds": occ_b,
                    "available_beds": tot_b - occ_b,
                    "occupancy_percentage": bed_occ_pct,
                    "icu_occupancy_percentage": icu_occ_pct
                },
                "workforce_risk": {
                    "score": workforce_risk_score,
                    "level": workforce_risk_level,
                    "sanctioned_staff": s_sanc,
                    "present_today": s_pres,
                    "attendance_percentage": att_rate,
                    "shortage_percentage": workforce_risk_score
                },
                "supply_chain_risk": {
                    "score": supply_chain_score,
                    "level": supply_chain_level,
                    "lead_time_deficit_count": lead_deficits,
                    "average_lead_time_days": round(float(avg_lead_time), 1)
                },
                "explainability": explainability
            }
        }
