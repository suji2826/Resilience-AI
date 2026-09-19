import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple

class DemandForecaster:
    """
    Multi-horizon Demand Forecasting Engine for Essential Medicines.
    Combines Exponential Weighted Moving Average (EWMA), Day-of-Week Seasonality,
    and Patient Footfall Cross-Elasticity with confidence interval estimation,
    contributing factor breakdown, and actionable operations recommendations.
    """

    def __init__(self, alpha: float = 0.35, confidence_level: float = 0.90):
        self.alpha = alpha
        self.confidence_level = confidence_level

    def forecast_demand(
        self,
        historical_consumption: List[int],
        historical_footfall: List[int],
        forecast_horizon_days: int = 7,
        emergency_multiplier: float = 1.0
    ) -> Dict[str, Any]:
        """
        Generate forecast for N days ahead based on historical series with full explainability.
        """
        if not historical_consumption:
            default_daily = 50.0 * emergency_multiplier
            total_fc = default_daily * forecast_horizon_days
            return {
                "predicted_daily_demand": round(default_daily, 1),
                "total_forecasted_demand": round(total_fc, 1),
                "current_avg_demand": 50.0,
                "demand_change_percent": 0.0,
                "confidence_score": 0.85,
                "confidence": 0.85,
                "confidence_level": "MODERATE",
                "lower_bound": round(40.0 * emergency_multiplier, 1),
                "upper_bound": round(60.0 * emergency_multiplier, 1),
                "trend": "STABLE",
                "daily_points": [],
                "contributing_factors": {
                    "baseline_daily_consumption": 50.0,
                    "footfall_elasticity_factor": 1.0,
                    "trend_growth_rate_percent": 0.0,
                    "volatility_cv": 0.15,
                    "emergency_multiplier": emergency_multiplier,
                    "seasonality_impact": "NORMAL",
                    "sample_history_days": 0
                },
                "recommended_action": "Maintain baseline replenishment schedule with standard buffer stock.",
                "recommended_actions": [
                    "Maintain baseline replenishment schedule with standard buffer stock.",
                    "Verify telemetry logging at local facility to establish dynamic historical baseline."
                ],
                "explainability_summary": "Default statistical baseline used due to lack of historical consumption records."
            }

        series = np.array(historical_consumption, dtype=float)
        n = len(series)
        
        # 1. Base Exponential Smoothing (EWMA)
        ewma = series[0]
        for val in series[1:]:
            ewma = self.alpha * val + (1 - self.alpha) * ewma

        # 2. Footfall Correlation & Elasticity
        if len(historical_footfall) >= 7 and len(historical_consumption) >= 7:
            ff_recent = float(np.mean(historical_footfall[-7:]))
            ff_prior = float(np.mean(historical_footfall[-30:-7])) if len(historical_footfall) >= 30 else float(np.mean(historical_footfall))
            footfall_elasticity = (ff_recent / max(1.0, ff_prior)) if ff_prior > 0 else 1.0
            # Medicine demand typically has ~0.65-0.85 elasticity with patient footfall
            demand_elasticity_factor = 1.0 + 0.75 * (footfall_elasticity - 1.0)
        else:
            footfall_elasticity = 1.0
            demand_elasticity_factor = 1.0

        # 3. Trend estimation over recent 14 days vs prior 14 days
        if n >= 28:
            recent_avg = float(np.mean(series[-14:]))
            prior_avg = float(np.mean(series[-28:-14]))
            trend_rate = (recent_avg - prior_avg) / max(1.0, prior_avg)
        elif n >= 14:
            recent_avg = float(np.mean(series[-7:]))
            prior_avg = float(np.mean(series[-14:-7]))
            trend_rate = (recent_avg - prior_avg) / max(1.0, prior_avg)
        else:
            recent_avg = float(np.mean(series))
            prior_avg = recent_avg
            trend_rate = 0.0

        current_baseline = float(np.mean(series[-7:])) if n >= 7 else float(np.mean(series))
        
        # 4. Standard Error, Volatility & Variance
        residuals = series - np.mean(series)
        std_err = float(np.std(residuals)) if len(residuals) > 1 else (current_baseline * 0.15)
        volatility_cv = round(std_err / max(1.0, current_baseline), 3)
        z_score = 1.645  # 90% confidence interval

        # 5. Project Daily Points across the requested Horizon
        now = datetime.utcnow()
        daily_points = []
        forecast_sum = 0.0

        for d in range(1, forecast_horizon_days + 1):
            future_date = now + timedelta(days=d)
            dow = future_date.weekday()
            # DOW seasonality (Mondays/Tuesdays +15%, Sundays -20%)
            dow_weight = 1.15 if dow in [0, 1] else (0.80 if dow == 6 else 1.0)
            
            # Cumulative trend dampening
            step_trend = 1.0 + (trend_rate * (d / 14.0))
            predicted_day = ewma * step_trend * demand_elasticity_factor * dow_weight * emergency_multiplier
            predicted_day = max(1.0, predicted_day)
            
            # Uncertainty expands with forecast horizon sqrt(d)
            horizon_std = std_err * np.sqrt(d) * 0.6
            lower = max(0.0, predicted_day - z_score * horizon_std)
            upper = predicted_day + z_score * horizon_std

            daily_points.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "day_name": future_date.strftime("%a"),
                "predicted_demand": round(float(predicted_day), 1),
                "lower_bound": round(float(lower), 1),
                "upper_bound": round(float(upper), 1)
            })
            forecast_sum += predicted_day

        predicted_daily_avg = forecast_sum / forecast_horizon_days
        demand_change_pct = ((predicted_daily_avg - current_baseline) / max(1.0, current_baseline)) * 100.0

        if demand_change_pct > 12.0:
            trend_desc = "INCREASING"
        elif demand_change_pct < -12.0:
            trend_desc = "DECREASING"
        else:
            trend_desc = "STABLE"

        # Model confidence is higher when variance is lower and data history is longer
        base_confidence = min(0.96, 0.75 + (min(n, 90) / 90.0) * 0.18 - (std_err / max(1.0, current_baseline)) * 0.08)
        confidence_score = round(max(0.70, float(base_confidence)), 2)
        confidence_tier = "HIGH" if confidence_score >= 0.85 else ("MODERATE" if confidence_score >= 0.75 else "LOW")

        # Contributing factors breakdown
        contributing_factors = {
            "baseline_daily_consumption": round(current_baseline, 1),
            "smoothed_ewma_base": round(float(ewma), 1),
            "footfall_elasticity_factor": round(float(demand_elasticity_factor), 3),
            "trend_growth_rate_percent": round(float(trend_rate * 100.0), 1),
            "volatility_cv": volatility_cv,
            "emergency_multiplier": emergency_multiplier,
            "seasonality_impact": "WEEKDAY_PEAK" if dow_weight > 1.0 else "STANDARD",
            "sample_history_days": n
        }

        # Context-aware recommended operational actions
        actions = []
        if emergency_multiplier > 1.0:
            actions.append(f"Emergency surge active ({emergency_multiplier}x): Trigger priority supply depot dispatch of {int(forecast_sum * 1.25)} units.")
            actions.append("Pre-position hydration and therapeutic buffers at primary treatment stations.")
            primary_action = f"Emergency surge active: Order {int(forecast_sum * 1.25)} units immediate replenishment."
        elif trend_desc == "INCREASING":
            order_qty = int(forecast_sum * 1.20)
            actions.append(f"Demand accelerating by {round(demand_change_pct, 1)}%: Advance procurement order by {order_qty} units.")
            actions.append("Audit secondary buffer stock at district transit warehouse.")
            primary_action = f"Advance replenishment order: Requisition {order_qty} units to protect against demand surge."
        elif trend_desc == "DECREASING":
            actions.append(f"Demand contracting by {abs(round(demand_change_pct, 1))}%: Adjust requisition batch to avoid overstocking.")
            actions.append("Inspect near-expiry inventory batches for possible redistribution.")
            primary_action = "Throttle next replenishment batch to prevent capital lockup and expiration."
        else:
            actions.append(f"Demand trajectory stable: Maintain regular replenishment order of {int(forecast_sum)} units.")
            actions.append("Conduct weekly stock audit against standard 14-day safety threshold.")
            primary_action = f"Maintain regular replenishment cadence ({int(forecast_sum)} units for next {forecast_horizon_days} days)."

        explainability_summary = (
            f"Forecast predicts daily demand of {round(predicted_daily_avg, 1)} units ({trend_desc} trend, {round(demand_change_pct, 1)}% vs baseline) "
            f"over a {forecast_horizon_days}-day horizon with {int(confidence_score * 100)}% model confidence. "
            f"Key drivers include {n}-day consumption history (EWMA: {round(float(ewma), 1)}), "
            f"patient footfall elasticity factor ({round(demand_elasticity_factor, 2)}x), and emergency multiplier ({emergency_multiplier}x)."
        )

        return {
            "predicted_daily_demand": round(float(predicted_daily_avg), 1),
            "total_forecasted_demand": round(float(forecast_sum), 1),
            "current_avg_demand": round(float(current_baseline), 1),
            "demand_change_percent": round(float(demand_change_pct), 1),
            "confidence_score": confidence_score,
            "confidence": confidence_score,
            "confidence_level": confidence_tier,
            "lower_bound": round(float(daily_points[0]["lower_bound"]), 1),
            "upper_bound": round(float(daily_points[0]["upper_bound"]), 1),
            "trend": trend_desc,
            "daily_points": daily_points,
            "contributing_factors": contributing_factors,
            "recommended_action": primary_action,
            "recommended_actions": actions,
            "explainability_summary": explainability_summary
        }

forecaster = DemandForecaster()
