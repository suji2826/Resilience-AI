"""
RESILIENCE AI — Resource & Workforce Repository
================================================
Database queries for hospital bed utilization (ICU, Oxygen, Isolation) and workforce attendance.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import Bed, Staff, StaffAttendance, PHC, District, State


class ResourceRepository:

    @staticmethod
    def get_bed_resources(db: Session) -> Dict[str, Any]:
        # Overall Summary
        bed_stats = db.query(
            func.sum(Bed.total_beds).label("total"),
            func.sum(Bed.occupied_beds).label("occupied"),
            func.sum(Bed.available_beds).label("available"),
            func.sum(Bed.icu_beds).label("icu_total"),
            func.sum(Bed.icu_occupied).label("icu_occupied"),
            func.sum(Bed.oxygen_beds).label("oxy_total"),
            func.sum(Bed.oxygen_occupied).label("oxy_occupied"),
            func.sum(Bed.isolation_beds).label("iso_total"),
            func.sum(Bed.isolation_occupied).label("iso_occupied"),
        ).first()

        tot = int(bed_stats.total or 0)
        occ = int(bed_stats.occupied or 0)
        avail = int(bed_stats.available or 0)
        icu_tot = int(bed_stats.icu_total or 0)
        icu_occ = int(bed_stats.icu_occupied or 0)
        oxy_tot = int(bed_stats.oxy_total or 0)
        oxy_occ = int(bed_stats.oxy_occupied or 0)
        iso_tot = int(bed_stats.iso_total or 0)
        iso_occ = int(bed_stats.iso_occupied or 0)

        summary = {
            "total_beds": tot,
            "occupied_beds": occ,
            "available_beds": avail,
            "overall_occupancy_rate": round((occ / tot * 100.0), 1) if tot > 0 else 0.0,
            "icu_total": icu_tot,
            "icu_occupied": icu_occ,
            "icu_occupancy_rate": round((icu_occ / icu_tot * 100.0), 1) if icu_tot > 0 else 0.0,
            "oxygen_total": oxy_tot,
            "oxygen_occupied": oxy_occ,
            "oxygen_occupancy_rate": round((oxy_occ / oxy_tot * 100.0), 1) if oxy_tot > 0 else 0.0,
            "isolation_total": iso_tot,
            "isolation_occupied": iso_occ,
            "isolation_occupancy_rate": round((iso_occ / iso_tot * 100.0), 1) if iso_tot > 0 else 0.0,
        }

        # District-level bed breakdown
        district_data = db.query(
            District.id.label("dist_id"),
            District.name.label("dist_name"),
            State.name.label("state_name"),
            func.sum(Bed.total_beds).label("d_total"),
            func.sum(Bed.occupied_beds).label("d_occupied"),
            func.sum(Bed.available_beds).label("d_available"),
            func.sum(Bed.icu_beds).label("d_icu"),
            func.sum(Bed.oxygen_beds).label("d_oxy")
        ).join(State, State.id == District.state_id)\
         .join(PHC, PHC.district_id == District.id)\
         .join(Bed, Bed.phc_id == PHC.id)\
         .group_by(District.id, District.name, State.name)\
         .order_by(District.name.asc())\
         .all()

        district_capacity = []
        for d in district_data:
            dtot = int(d.d_total or 0)
            docc = int(d.d_occupied or 0)
            drate = round((docc / dtot * 100.0), 1) if dtot > 0 else 0.0
            district_capacity.append({
                "district_id": d.dist_id,
                "district_name": d.dist_name,
                "state_name": d.state_name,
                "total_beds": dtot,
                "occupied_beds": docc,
                "available_beds": int(d.d_available or 0),
                "icu_beds": int(d.d_icu or 0),
                "oxygen_beds": int(d.d_oxy or 0),
                "occupancy_rate": drate,
                "status": "CRITICAL" if drate > 90.0 else ("WARNING" if drate > 75.0 else "HEALTHY")
            })

        return {
            "summary": summary,
            "district_capacity": district_capacity
        }

    @staticmethod
    def get_workforce_resources(db: Session) -> Dict[str, Any]:
        # Overall Summary
        staff_stats = db.query(
            func.sum(Staff.sanctioned_count).label("sanctioned"),
            func.sum(Staff.present_today).label("present"),
            func.sum(Staff.on_leave).label("leave")
        ).first()

        sanctioned = int(staff_stats.sanctioned or 0)
        present = int(staff_stats.present or 0)
        on_leave = int(staff_stats.leave or 0)
        attendance_rate = round((present / sanctioned * 100.0), 1) if sanctioned > 0 else 0.0

        # Role Breakdown
        role_stats = db.query(
            Staff.role_type,
            func.sum(Staff.sanctioned_count).label("sanc"),
            func.sum(Staff.present_today).label("pres"),
            func.sum(Staff.on_leave).label("leav")
        ).group_by(Staff.role_type).all()

        roles_list = []
        for r in role_stats:
            r_sanc = int(r.sanc or 0)
            r_pres = int(r.pres or 0)
            roles_list.append({
                "role_type": r.role_type,
                "display_name": r.role_type.replace("_", " ").title(),
                "sanctioned": r_sanc,
                "present": r_pres,
                "on_leave": int(r.leav or 0),
                "attendance_rate": round((r_pres / r_sanc * 100.0), 1) if r_sanc > 0 else 0.0
            })

        # District Workforce Matrix
        district_data = db.query(
            District.id.label("dist_id"),
            District.name.label("dist_name"),
            State.name.label("state_name"),
            func.count(PHC.id.distinct()).label("phcs_count"),
            func.sum(Staff.sanctioned_count).label("d_sanc"),
            func.sum(Staff.present_today).label("d_pres"),
            func.sum(Staff.on_leave).label("d_leav")
        ).join(State, State.id == District.state_id)\
         .join(PHC, PHC.district_id == District.id)\
         .join(Staff, Staff.phc_id == PHC.id)\
         .group_by(District.id, District.name, State.name)\
         .order_by(District.name.asc())\
         .all()

        district_workforce = []
        for d in district_data:
            dsanc = int(d.d_sanc or 0)
            dpres = int(d.d_pres or 0)
            drate = round((dpres / dsanc * 100.0), 1) if dsanc > 0 else 0.0
            district_workforce.append({
                "district_id": d.dist_id,
                "district_name": d.dist_name,
                "state_name": d.state_name,
                "phcs_count": d.phcs_count,
                "sanctioned_staff": dsanc,
                "present_staff": dpres,
                "on_leave": int(d.d_leav or 0),
                "attendance_rate": drate,
                "status": "CRITICAL" if drate < 75.0 else ("WARNING" if drate < 85.0 else "OPTIMAL")
            })

        return {
            "summary": {
                "total_staff_sanctioned": sanctioned,
                "total_staff_present": present,
                "total_on_leave": on_leave,
                "overall_attendance_rate": attendance_rate,
                "districts_with_shortages": sum(1 for d in district_workforce if d["attendance_rate"] < 82.0)
            },
            "role_breakdown": roles_list,
            "district_workforce": district_workforce
        }
