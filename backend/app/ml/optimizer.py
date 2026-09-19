import math
import uuid
from typing import List, Dict, Any, Tuple
from datetime import datetime

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in kilometers between two lat/lon coordinates."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

class RedistributionOptimizer:
    """
    Cross-District Healthcare Resource Redistribution Optimization Engine.
    Minimizes aggregate stockout risk across PHC networks while respecting:
    - Source safety stock preservation constraints (Source must retain >= 14 days of supply).
    - Proximity & logistics transit time minimization (Haversine distance routing).
    - Priority-based shortage severity matching.
    - Full explainability: contributing factors, optimization cost weights, and dispatch checklists.
    """

    def generate_recommendations(
        self,
        nodes: List[Dict[str, Any]],  # List of district/PHC medicine inventories
        safety_stock_target_days: int = 14,
        avg_transport_speed_kmh: float = 45.0
    ) -> List[Dict[str, Any]]:
        """
        Input nodes format:
        {
          "district_id": int,
          "district_name": str,
          "phc_id": int,
          "phc_name": str,
          "latitude": float,
          "longitude": float,
          "medicine_id": int,
          "medicine_name": str,
          "current_stock": int,
          "daily_burn": float,
          "days_remaining": float,
          "risk_level": str,
          "catchment_population": int
        }
        """
        # Group inventory nodes by medicine
        medicines = {}
        for n in nodes:
            med_id = n["medicine_id"]
            if med_id not in medicines:
                medicines[med_id] = []
            medicines[med_id].append(n)

        recommendations = []

        for med_id, med_nodes in medicines.items():
            deficits = []
            surpluses = []

            for node in med_nodes:
                daily_burn = max(1.0, float(node.get("daily_burn", 50.0)))
                stock = int(node.get("current_stock", 0))
                days_rem = stock / daily_burn

                safety_stock_units = int(daily_burn * safety_stock_target_days)

                # Deficit condition: less than 7 days runway or marked CRITICAL/HIGH
                if days_rem < 7.0 or node.get("risk_level") in ["CRITICAL", "HIGH"]:
                    needed = int(daily_burn * safety_stock_target_days) - stock
                    if needed > 0:
                        urgency_multiplier = 1.6 if node.get("risk_level") == "CRITICAL" else 1.2
                        urgency_score = (10.0 - min(9.0, days_rem)) * urgency_multiplier
                        deficits.append({
                            **node,
                            "daily_burn": daily_burn,
                            "deficit_qty": needed,
                            "days_remaining": days_rem,
                            "urgency_score": urgency_score
                        })
                # Surplus condition: more than safety stock + 4 days cushion
                elif days_rem > (safety_stock_target_days + 4.0):
                    available_surplus = stock - safety_stock_units
                    if available_surplus >= 100:
                        surpluses.append({
                            **node,
                            "daily_burn": daily_burn,
                            "available_surplus": available_surplus,
                            "safety_stock_units": safety_stock_units,
                            "remaining_after": stock - available_surplus
                        })

            # Sort deficits by urgency score (descending)
            deficits.sort(key=lambda x: x["urgency_score"], reverse=True)

            for def_node in deficits:
                if not surpluses:
                    break

                # Multi-criteria optimization cost function
                # Combines geographic distance, surplus capacity buffer, and intra-district preference
                best_source = None
                best_cost = float('inf')
                best_idx = -1
                best_dist = 0.0

                for idx, sur_node in enumerate(surpluses):
                    # Prevent transferring to oneself
                    if sur_node["phc_id"] == def_node["phc_id"]:
                        continue

                    dist_km = haversine_distance_km(
                        sur_node["latitude"], sur_node["longitude"],
                        def_node["latitude"], def_node["longitude"]
                    )
                    
                    # Penalty discount for intra-district transfers (faster logistics)
                    district_factor = 0.75 if sur_node["district_id"] == def_node["district_id"] else 1.0

                    # Cost function: distance weighted by district affinity and log surplus
                    cost = (dist_km * district_factor) / math.log(max(10, sur_node["available_surplus"]))
                    
                    if cost < best_cost and sur_node["available_surplus"] >= 50:
                        best_cost = cost
                        best_source = sur_node
                        best_idx = idx
                        best_dist = dist_km

                if best_source:
                    transfer_qty = min(def_node["deficit_qty"], best_source["available_surplus"])
                    # Round to logistical packaging increments of 50 units
                    transfer_qty = max(50, (transfer_qty // 50) * 50)
                    
                    transit_hours = round(max(0.5, (best_dist / avg_transport_speed_kmh) + 0.5), 1)

                    urgency = "CRITICAL" if def_node["days_remaining"] < 3.0 else ("HIGH" if def_node["days_remaining"] < 6.0 else "MEDIUM")

                    # Calculate runway impact
                    dest_burn = def_node["daily_burn"]
                    dest_days_after = round((def_node["current_stock"] + transfer_qty) / dest_burn, 1)
                    source_burn = best_source["daily_burn"]
                    source_days_after = round((best_source["current_stock"] - transfer_qty) / max(1.0, source_burn), 1)

                    # Model confidence: higher when transit is short and source surplus is large
                    distance_penalty = min(0.15, (best_dist / 300.0) * 0.15)
                    confidence = round(max(0.75, min(0.96, 0.92 - distance_penalty + (0.04 if best_source["available_surplus"] > 500 else 0.0))), 2)

                    # Explainable contributing factors
                    contributing_factors = {
                        "source_surplus_units": best_source["available_surplus"],
                        "source_days_remaining_after_transfer": source_days_after,
                        "source_safety_stock_threshold_days": safety_stock_target_days,
                        "dest_deficit_units": def_node["deficit_qty"],
                        "dest_days_remaining_before": round(def_node["days_remaining"], 1),
                        "dest_days_remaining_after": dest_days_after,
                        "distance_km": best_dist,
                        "estimated_transit_hours": transit_hours,
                        "intra_district_transfer": best_source["district_id"] == def_node["district_id"],
                        "optimization_cost_score": round(best_cost, 2),
                        "urgency_score": round(def_node["urgency_score"], 2)
                    }

                    # Step-by-step logistics directives
                    actions = [
                        f"Authorize digital transfer manifest for {transfer_qty} units of {def_node['medicine_name']}.",
                        f"Dispatch GPS-tracked logistics vehicleKA/TN route ({best_dist} km, ~{transit_hours}h transit).",
                        f"Ensure temperature-controlled cold chain maintenance at 2-8°C during transit if applicable.",
                        f"Confirm receipt at {def_node['phc_name']} pharmacy desk within 2 hours of estimated arrival."
                    ]

                    unique_suffix = uuid.uuid4().hex[:6].upper()
                    rec_code = f"REC-{datetime.utcnow().strftime('%Y%m%d')}-{best_source['district_name'][:3].upper()}-{def_node['district_name'][:3].upper()}-{len(recommendations)+1:02d}-{unique_suffix}"

                    rec = {
                        "recommendation_code": rec_code,
                        "source_district_id": best_source["district_id"],
                        "source_district_name": best_source["district_name"],
                        "source_phc_id": best_source["phc_id"],
                        "source_phc_name": best_source["phc_name"],
                        "source_surplus_quantity": best_source["available_surplus"],
                        "dest_district_id": def_node["district_id"],
                        "dest_district_name": def_node["district_name"],
                        "dest_phc_id": def_node["phc_id"],
                        "dest_phc_name": def_node["phc_name"],
                        "medicine_id": def_node["medicine_id"],
                        "medicine_name": def_node["medicine_name"],
                        "recommended_quantity": int(transfer_qty),
                        "dest_deficit_quantity": def_node["deficit_qty"],
                        "urgency": urgency,
                        "estimated_transit_hours": transit_hours,
                        "distance_km": best_dist,
                        "confidence": confidence,
                        "confidence_score": confidence,
                        "contributing_factors": contributing_factors,
                        "recommended_action": f"Transfer {transfer_qty} units of {def_node['medicine_name']} from {best_source['phc_name']} to {def_node['phc_name']} ({best_dist} km, ~{transit_hours}h).",
                        "recommended_actions": actions,
                        "reason": f"Severe deficit in {def_node['phc_name']} ({round(def_node['days_remaining'], 1)} days runway). {best_source['district_name']} retains {best_source['available_surplus']} units surplus above mandatory safety stock.",
                        "estimated_impact": f"Eliminates stock-out risk in {def_node['phc_name']} for {int(dest_days_after)} days and stabilizes clinical care for ~{def_node.get('catchment_population', 35000):,} citizens.",
                        "status": "RECOMMENDED"
                    }
                    recommendations.append(rec)

                    # Deduct transferred surplus to maintain safety buffer invariants
                    best_source["available_surplus"] -= transfer_qty
                    if best_source["available_surplus"] < 50:
                        surpluses.pop(best_idx)

        return recommendations

optimizer = RedistributionOptimizer()
