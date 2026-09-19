import pytest
import numpy as np
from app.ml.forecasting import forecaster

def test_demand_forecasting_basic():
    # 30-day baseline consumption with average 50 units/day
    history_cons = [50 + int(5 * np.sin(i)) for i in range(30)]
    history_ff = [100 + int(10 * np.sin(i)) for i in range(30)]

    fc_7 = forecaster.forecast_demand(history_cons, history_ff, forecast_horizon_days=7)
    
    assert fc_7["predicted_daily_demand"] > 0
    assert fc_7["total_forecasted_demand"] > 0
    assert fc_7["confidence_score"] >= 0.70
    assert len(fc_7["daily_points"]) == 7
    assert fc_7["daily_points"][0]["lower_bound"] <= fc_7["daily_points"][0]["predicted_demand"] <= fc_7["daily_points"][0]["upper_bound"]

def test_demand_forecasting_emergency_surge():
    history_cons = [100] * 30
    history_ff = [200] * 30
    
    # 1.85x emergency surge multiplier (e.g. Dengue outbreak)
    fc_emergency = forecaster.forecast_demand(history_cons, history_ff, forecast_horizon_days=7, emergency_multiplier=1.85)
    
    assert fc_emergency["predicted_daily_demand"] > 160.0
    assert fc_emergency["trend"] == "INCREASING"
