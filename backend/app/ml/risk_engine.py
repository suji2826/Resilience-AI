import math
from typing import Dict, Any, List

class StockoutRiskEngine:
    """
    Stock-out Risk Assessment and Probabilistic Classification Engine.
    Combines inventory depletion velocity, supplier lead times, buffer margins,
    and outbreak demand acceleration to compute risk scores, confidence,
    contributing factors, and actionable operational mitigation workflows.
    """

    def calculate_risk(
        self,
        current_stock: int,
        daily_consumption: float,
        safety_stock_days: int = 14,
        supplier_lead_time_days: int = 5,
        incoming_stock: int = 0,
        footfall_surge_pct: float = 0.0,
        emergency_multiplier: float = 1.0
    ) -> Dict[str, Any]:
        
        # Effective consumption adjusted for surge and footfall correlation
        effective_daily_rate = max(0.5, daily_consumption * emergency_multiplier * (1.0 + (footfall_surge_pct / 100.0) * 0.7))
        
        # Days remaining before complete stock depletion
        days_remaining = current_stock / effective_daily_rate if effective_daily_rate > 0 else 999.0
        
        # Lead time gap: if days remaining is less than lead time to receive new stock
        lead_time_gap = supplier_lead_time_days - days_remaining
        
        # Calculate Risk Score (0.0 to 1.0) using sigmoid logistic curve
        # Key inflection points: when days_remaining <= supplier_lead_time_days
        if days_remaining <= 0:
            risk_score = 1.0
        elif days_remaining <= 2.5:
            risk_score = 0.95 - (days_remaining * 0.03)
        elif days_remaining <= supplier_lead_time_days:
            # Dangerous window: will stock out before replenishment arrives
            risk_score = 0.75 + (0.15 * (1.0 - (days_remaining / supplier_lead_time_days)))
        elif days_remaining <= safety_stock_days:
            # Buffer erosion window
            risk_score = 0.35 + (0.35 * (1.0 - ((days_remaining - supplier_lead_time_days) / max(1, (safety_stock_days - supplier_lead_time_days)))))
        else:
            # Healthy stock
            risk_score = max(0.02, 0.30 * (1.0 - min(1.0, (days_remaining - safety_stock_days) / 20.0)))

        # Discount risk slightly if incoming delivery is confirmed before stockout
        if incoming_stock > 0 and days_remaining > 2.0:
            risk_score = max(0.05, risk_score * 0.75)

        risk_score = round(min(0.99, max(0.01, float(risk_score))), 2)

        # Categorize risk tier
        if risk_score >= 0.80:
            risk_level = "CRITICAL"
        elif risk_score >= 0.60:
            risk_level = "HIGH"
        elif risk_score >= 0.30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Contributing factors for explainability
        factors = {
            "days_remaining": round(days_remaining, 1),
            "effective_daily_burn": round(effective_daily_rate, 1),
            "supplier_lead_time_days": supplier_lead_time_days,
            "safety_stock_target_days": safety_stock_days,
            "footfall_surge_percent": f"+{round(footfall_surge_pct, 1)}%" if footfall_surge_pct > 0 else f"{round(footfall_surge_pct, 1)}%",
            "incoming_stock_units": incoming_stock,
            "lead_time_deficit_days": max(0.0, round(lead_time_gap, 1)),
            "emergency_demand_multiplier": emergency_multiplier,
            "safety_buffer_deficit_units": max(0, int((safety_stock_days * effective_daily_rate) - current_stock))
        }

        # Detailed operational actions
        actions = []
        if risk_level == "CRITICAL":
            transfer_req = int(effective_daily_rate * 14)
            actions.append(f"Authorize emergency cross-district redistribution of {transfer_req} units from nearest surplus warehouse.")
            actions.append("Place facility pharmacy on strict ration dispensing protocol.")
            actions.append("Issue high-priority notification to State Health Mission Supply Logistics desk.")
            primary_action = f"URGENT: Stockout in {round(days_remaining, 1)} days! Authorize immediate cross-district redistribution transfer of {transfer_req} units from nearest surplus hub."
        elif risk_level == "HIGH":
            actions.append(f"Expedite pending supplier order (lead time: {supplier_lead_time_days} days).")
            actions.append("Verify inter-PHC loan availability within same district.")
            actions.append("Monitor daily consumption velocity twice daily.")
            primary_action = f"Expedite supplier delivery order (lead time: {supplier_lead_time_days} days) and review secondary regional buffer reserves."
        elif risk_level == "MEDIUM":
            reorder_window = max(1, int(days_remaining - supplier_lead_time_days))
            actions.append(f"Trigger standard procurement re-order within {reorder_window} days.")
            actions.append("Confirm supplier order processing schedule.")
            primary_action = f"Trigger routine re-order replenishment batch within {reorder_window} days."
        else:
            actions.append(f"Maintain standard replenishment cycle ({round(days_remaining, 1)} days of supply on-hand).")
            actions.append("Review expiry batch dates to ensure FIFO compliance.")
            primary_action = f"Inventory healthy ({round(days_remaining, 1)} days of supply). Maintain standard monitoring cycle."

        confidence = round(0.90 + (0.05 if incoming_stock > 0 else 0.0) - (0.04 if footfall_surge_pct > 30 else 0.0), 2)
        confidence = min(0.95, confidence)

        explainability_summary = (
            f"Evaluated stockout probability is {int(risk_score * 100)}% ({risk_level} risk) with {round(days_remaining, 1)} days of runway "
            f"at effective burn rate of {round(effective_daily_rate, 1)} units/day. "
            f"{'Supplier lead time gap of ' + str(round(lead_time_gap, 1)) + ' days creates acute stockout window.' if lead_time_gap > 0 else 'Stock runway exceeds supplier replenishment lead time.'} "
            f"Confidence in risk assessment is {int(confidence * 100)}%."
        )

        return {
            "stock_out_probability": risk_score,
            "risk_level": risk_level,
            "days_stock_remaining": round(days_remaining, 2),
            "effective_daily_rate": round(effective_daily_rate, 1),
            "contributing_factors": factors,
            "recommended_action": primary_action,
            "recommended_actions": actions,
            "confidence": confidence,
            "confidence_score": confidence,
            "explainability_summary": explainability_summary
        }

risk_engine = StockoutRiskEngine()
