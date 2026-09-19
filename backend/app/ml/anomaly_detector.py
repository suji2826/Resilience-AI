import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime

class AnomalyDetector:
    """
    Multivariate Anomaly & Outlier Detection Engine for Healthcare Operations.
    Detects abnormal patient footfall spikes, syndromic fever surges, sudden medicine
    consumption acceleration, and bed capacity stress using robust statistical models:
    - Modified Z-Score using Median Absolute Deviation (MAD) for outlier robustness
    - Interquartile Range (IQR) fence violation detection
    - Rolling window variance and volatility scoring
    - Return explainable factors, confidence, and clinical/supply mitigation workflows.
    """

    def detect_series_anomaly(
        self,
        values: List[float],
        metric_name: str = "Patient Footfall",
        z_threshold: float = 2.2,
        iqr_multiplier: float = 1.75,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate if latest data point in series is an anomaly compared to historical baseline.
        Returns complete statistical explainability, confidence score, and operational actions.
        """
        if len(values) < 5:
            return {
                "is_anomaly": False,
                "anomaly_type": "INSUFFICIENT_DATA",
                "metric_name": metric_name,
                "metric_value": float(values[-1]) if values else 0.0,
                "expected_value": float(values[-1]) if values else 0.0,
                "deviation_percent": 0.0,
                "z_score": 0.0,
                "severity": "NORMAL",
                "confidence": 0.50,
                "confidence_score": 0.50,
                "contributing_factors": {
                    "history_points": len(values),
                    "minimum_required_points": 5
                },
                "recommended_action": "Continue collecting operational telemetry to establish statistical baseline.",
                "recommended_actions": [
                    "Continue collecting operational telemetry to establish statistical baseline."
                ],
                "description": "Insufficient history to reliably establish baseline parameters.",
                "timestamp": datetime.utcnow().isoformat()
            }

        series = np.array(values[:-1], dtype=float)  # Baseline points preceding latest observation
        current_val = float(values[-1])
        n = len(series)
        
        # 1. Classical Gaussian Metrics (Mean & Std Dev)
        mean_val = float(np.mean(series))
        std_val = float(np.std(series)) if float(np.std(series)) > 0 else max(1.0, mean_val * 0.1)
        gaussian_z_score = (current_val - mean_val) / std_val

        # 2. Robust Non-Parametric Metrics (Median & Median Absolute Deviation - MAD)
        median_val = float(np.median(series))
        mad = float(np.median(np.abs(series - median_val)))
        if mad > 0:
            # 0.6745 is the consistency constant for normal distribution
            modified_z_score = 0.6745 * (current_val - median_val) / mad
        else:
            modified_z_score = gaussian_z_score

        # Composite robust Z-score
        robust_z = round(float(0.6 * modified_z_score + 0.4 * gaussian_z_score), 2)
        
        # 3. Interquartile Range (IQR) Boundary Check
        q75, q25 = np.percentile(series, [75, 25])
        iqr = float(q75 - q25)
        upper_fence = float(q75 + (iqr_multiplier * max(1.0, iqr)))
        
        # Deviation Percentage
        baseline_reference = median_val if median_val > 0 else max(1.0, mean_val)
        deviation_pct = round(((current_val - baseline_reference) / baseline_reference) * 100.0, 1)

        # Anomaly Determination Rule
        # Flags as anomaly if robust Z exceeds threshold OR upper IQR fence is breached with >25% deviation
        is_anomaly = bool((robust_z > z_threshold) or (current_val > upper_fence and deviation_pct > 25.0))

        # Severity Classification
        if robust_z >= 3.5 or deviation_pct >= 65.0:
            severity = "CRITICAL"
        elif robust_z >= 2.5 or deviation_pct >= 40.0:
            severity = "HIGH"
        elif robust_z >= 1.8 or deviation_pct >= 20.0:
            severity = "MEDIUM"
        else:
            severity = "NORMAL"

        # Statistical Confidence Calculation
        # Confidence increases with sample size and distance from decision boundary
        sample_confidence_boost = min(0.15, (n / 30.0) * 0.15)
        z_certainty = min(0.20, abs(robust_z - z_threshold) * 0.1)
        base_confidence = 0.75 + sample_confidence_boost + (z_certainty if is_anomaly else 0.05)
        confidence = round(min(0.96, max(0.70, float(base_confidence))), 2)

        # Determine Specific Anomaly Category
        metric_lower = metric_name.lower()
        if "fever" in metric_lower or "footfall" in metric_lower or "respiratory" in metric_lower:
            anomaly_type = "EPIDEMIOLOGICAL_SURGE"
        elif "consumption" in metric_lower or "medicine" in metric_lower or "burn" in metric_lower:
            anomaly_type = "CONSUMPTION_SPIKE"
        elif "bed" in metric_lower or "icu" in metric_lower:
            anomaly_type = "CAPACITY_SATURATION"
        elif "staff" in metric_lower or "absence" in metric_lower:
            anomaly_type = "WORKFORCE_ATTRITION"
        else:
            anomaly_type = "OPERATIONAL_OUTLIER"

        # Contributing Factors Breakdown
        contributing_factors = {
            "current_observed_value": round(current_val, 1),
            "baseline_mean": round(mean_val, 1),
            "baseline_median": round(median_val, 1),
            "standard_deviation": round(std_val, 2),
            "median_absolute_deviation": round(mad, 2),
            "iqr_upper_threshold": round(upper_fence, 1),
            "statistical_z_score": robust_z,
            "deviation_from_baseline_percent": deviation_pct,
            "sample_size_days": n
        }
        if context:
            contributing_factors.update(context)

        # Operational & Clinical Recommended Actions
        actions = []
        if is_anomaly:
            if anomaly_type == "EPIDEMIOLOGICAL_SURGE":
                actions.append(f"Deploy Rapid Response Epidemiological Investigation team to investigate {metric_name} surge.")
                actions.append("Initiate active syndromic fever screening and vector control protocols in surrounding catchment villages.")
                actions.append("Pre-emptively order supplemental IV fluids, antipyretics, and diagnostic test kits.")
                primary_action = f"EPIDEMIC ALERT: {metric_name} surged +{deviation_pct}% (Z={robust_z}σ). Deploy rapid response surveillance and stage hydration buffers."
            elif anomaly_type == "CONSUMPTION_SPIKE":
                actions.append(f"Audit pharmacy dispensing records to rule out bulk hoarding or recording error.")
                actions.append("Check corresponding patient morbidity telemetry to verify clinical justification.")
                actions.append("Request emergency stock injection from nearest regional transit depot.")
                primary_action = f"CONSUMPTION VELOCITY SPIKE: {metric_name} accelerated +{deviation_pct}% above baseline. Authorize emergency replenishment."
            elif anomaly_type == "CAPACITY_SATURATION":
                actions.append("Activate secondary overflow observation ward.")
                actions.append("Coordinate patient referral diversion with sub-district hospital.")
                primary_action = f"CAPACITY WARNING: Bed occupancy breached threshold. Divert non-critical admissions."
            else:
                actions.append(f"Investigate anomalous outlier in {metric_name} with facility superintendent.")
                actions.append("Cross-reference with adjacent facilities to verify cluster pattern.")
                primary_action = f"Investigate statistical deviation ({round(deviation_pct, 1)}% from baseline) with facility officer."
            
            desc = (
                f"ANOMALOUS SPIKE DETECTED: {metric_name} is {deviation_pct}% above {n}-day baseline "
                f"(Observed: {round(current_val, 1)}, Expected: {round(median_val, 1)}). "
                f"Statistical Z-Score is {robust_z}σ (Confidence: {int(confidence * 100)}%)."
            )
        else:
            actions.append(f"Maintain routine monitoring of {metric_name}.")
            primary_action = f"{metric_name} operating within normal parameters ({deviation_pct}% variance)."
            desc = f"{metric_name} within normal baseline parameters ({deviation_pct}% variation, Z={robust_z}σ)."

        return {
            "is_anomaly": is_anomaly,
            "anomaly_type": anomaly_type,
            "metric_name": metric_name,
            "metric_value": round(current_val, 1),
            "expected_value": round(median_val, 1),
            "deviation_percent": deviation_pct,
            "z_score": robust_z,
            "severity": severity,
            "confidence": confidence,
            "confidence_score": confidence,
            "contributing_factors": contributing_factors,
            "recommended_action": primary_action,
            "recommended_actions": actions,
            "description": desc,
            "timestamp": datetime.utcnow().isoformat()
        }

anomaly_detector = AnomalyDetector()
