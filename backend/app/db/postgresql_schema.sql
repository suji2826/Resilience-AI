-- ==============================================================================
-- RESILIENCE AI — Native PostgreSQL 15+ Production Schema DDL
-- ==============================================================================
-- Project: RESILIENCE AI
-- Tagline: "Predict healthcare shortages before they become crises."
-- Compatible with: PostgreSQL 14+, Google Cloud SQL PostgreSQL, TimescaleDB
-- ==============================================================================

BEGIN;

-- Enable UUID & Crypto extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. AUTHENTICATION & RBAC
-- ==============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    permissions JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_roles_name ON roles(name);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    state_id INTEGER,
    district_id INTEGER,
    phc_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_login TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- ==============================================================================
-- 2. GEOGRAPHIC HIERARCHY (BRICS & INDIA)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_brics_member BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_countries_code ON countries(code);

CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    CONSTRAINT uq_state_country_code UNIQUE (country_id, code)
);

CREATE INDEX IF NOT EXISTS ix_states_code ON states(code);

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    population INTEGER DEFAULT 500000 NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'LOW' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_districts_name ON districts(name);
CREATE INDEX IF NOT EXISTS ix_district_state_name ON districts(state_id, name);

CREATE TABLE IF NOT EXISTS phcs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    tier VARCHAR(20) DEFAULT 'Tier-1' NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    catchment_population INTEGER DEFAULT 30000 NOT NULL,
    contact_phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    current_risk_score DOUBLE PRECISION DEFAULT 0.15 NOT NULL,
    risk_category VARCHAR(20) DEFAULT 'LOW' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_phcs_code ON phcs(code);
CREATE INDEX IF NOT EXISTS ix_phc_district_risk ON phcs(district_id, risk_category);

-- Add Foreign Keys to users now that geo tables exist
ALTER TABLE users 
    ADD CONSTRAINT fk_users_state FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_users_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_users_phc FOREIGN KEY (phc_id) REFERENCES phcs(id) ON DELETE SET NULL;

-- ==============================================================================
-- 3. FORMULARY & SUPPLY CHAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(30) DEFAULT 'units' NOT NULL,
    unit_cost_inr DOUBLE PRECISION DEFAULT 10.0 NOT NULL,
    standard_daily_demand DOUBLE PRECISION DEFAULT 50.0 NOT NULL,
    safety_stock_days INTEGER DEFAULT 14 NOT NULL,
    shelf_life_months INTEGER DEFAULT 24 NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_medicines_code ON medicines(code);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    lead_time_days INTEGER DEFAULT 5 NOT NULL,
    reliability_score DOUBLE PRECISION DEFAULT 0.92 NOT NULL,
    state_coverage VARCHAR(200) DEFAULT 'All' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_suppliers_code ON suppliers(code);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    current_stock INTEGER DEFAULT 0 NOT NULL,
    batch_number VARCHAR(50),
    expiry_date TIMESTAMP WITHOUT TIME ZONE,
    reorder_threshold INTEGER DEFAULT 100 NOT NULL,
    incoming_stock INTEGER DEFAULT 0 NOT NULL,
    incoming_delivery_date TIMESTAMP WITHOUT TIME ZONE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    CONSTRAINT uq_inventory_phc_medicine UNIQUE (phc_id, medicine_id)
);

CREATE INDEX IF NOT EXISTS ix_inventory_phc_id ON inventory(phc_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL,
    quantity INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    notes VARCHAR(255),
    performed_by VARCHAR(120),
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_inv_txn_inventory_ts ON inventory_transactions(inventory_id, timestamp);

-- ==============================================================================
-- 4. TIME-SERIES TELEMETRY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS medicine_consumption (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    quantity_consumed INTEGER NOT NULL,
    is_anomaly BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_consumption_phc_med_date ON medicine_consumption(phc_id, medicine_id, date);

CREATE TABLE IF NOT EXISTS patient_footfall (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    outpatient_count INTEGER DEFAULT 0 NOT NULL,
    inpatient_count INTEGER DEFAULT 0 NOT NULL,
    emergency_count INTEGER DEFAULT 0 NOT NULL,
    fever_respiratory_count INTEGER DEFAULT 0 NOT NULL,
    total_footfall INTEGER DEFAULT 0 NOT NULL,
    is_surge_anomaly BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_footfall_phc_date ON patient_footfall(phc_id, date);

-- ==============================================================================
-- 5. FACILITY CAPACITY & WORKFORCE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER UNIQUE NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    total_beds INTEGER DEFAULT 20 NOT NULL,
    occupied_beds INTEGER DEFAULT 12 NOT NULL,
    available_beds INTEGER DEFAULT 8 NOT NULL,
    icu_beds INTEGER DEFAULT 2 NOT NULL,
    icu_occupied INTEGER DEFAULT 1 NOT NULL,
    oxygen_beds INTEGER DEFAULT 6 NOT NULL,
    oxygen_occupied INTEGER DEFAULT 4 NOT NULL,
    isolation_beds INTEGER DEFAULT 4 NOT NULL,
    isolation_occupied INTEGER DEFAULT 2 NOT NULL,
    occupancy_rate DOUBLE PRECISION DEFAULT 0.60 NOT NULL,
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    role_type VARCHAR(50) NOT NULL,
    sanctioned_count INTEGER DEFAULT 5 NOT NULL,
    active_count INTEGER DEFAULT 4 NOT NULL,
    present_today INTEGER DEFAULT 4 NOT NULL,
    on_leave INTEGER DEFAULT 0 NOT NULL,
    attendance_rate DOUBLE PRECISION DEFAULT 1.0 NOT NULL,
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    CONSTRAINT uq_staff_phc_role UNIQUE (phc_id, role_type)
);

CREATE TABLE IF NOT EXISTS staff_attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    scheduled INTEGER DEFAULT 4 NOT NULL,
    present INTEGER DEFAULT 4 NOT NULL,
    absent INTEGER DEFAULT 0 NOT NULL,
    on_leave INTEGER DEFAULT 0 NOT NULL,
    attendance_percentage DOUBLE PRECISION DEFAULT 100.0 NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_staff_att_staff_date ON staff_attendance(staff_id, date);

-- ==============================================================================
-- 6. AI FORECASTS, RISK & ALERTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    alert_code VARCHAR(50) UNIQUE NOT NULL,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    resource_name VARCHAR(100),
    reason TEXT NOT NULL,
    prediction TEXT,
    ai_explanation TEXT,
    recommended_action TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_alerts_code ON alerts(alert_code);
CREATE INDEX IF NOT EXISTS ix_alerts_status_severity ON alerts(status, severity);
CREATE INDEX IF NOT EXISTS ix_alerts_phc_created ON alerts(phc_id, created_at);

CREATE TABLE IF NOT EXISTS forecasts (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    forecast_horizon_days INTEGER DEFAULT 7 NOT NULL,
    predicted_daily_demand DOUBLE PRECISION NOT NULL,
    total_forecasted_demand DOUBLE PRECISION NOT NULL,
    current_avg_demand DOUBLE PRECISION NOT NULL,
    demand_change_percent DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    confidence_score DOUBLE PRECISION DEFAULT 0.88 NOT NULL,
    lower_bound DOUBLE PRECISION NOT NULL,
    upper_bound DOUBLE PRECISION NOT NULL,
    trend VARCHAR(20) DEFAULT 'STABLE' NOT NULL,
    generated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_forecast_phc_med_horizon ON forecasts(phc_id, medicine_id, forecast_horizon_days);

CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    phc_id INTEGER NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    stock_out_probability DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    days_stock_remaining DOUBLE PRECISION NOT NULL,
    current_stock INTEGER DEFAULT 0 NOT NULL,
    daily_consumption_rate DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    supplier_lead_time_days INTEGER DEFAULT 5 NOT NULL,
    contributing_factors JSONB,
    recommended_action TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.90 NOT NULL,
    calculated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_risk_phc_med_calc ON risk_scores(phc_id, medicine_id, calculated_at);

-- ==============================================================================
-- 7. REDISTRIBUTION & CRISIS SIMULATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS redistribution_recommendations (
    id SERIAL PRIMARY KEY,
    recommendation_code VARCHAR(50) UNIQUE NOT NULL,
    source_district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    dest_district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    source_phc_id INTEGER REFERENCES phcs(id) ON DELETE SET NULL,
    dest_phc_id INTEGER REFERENCES phcs(id) ON DELETE SET NULL,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    recommended_quantity INTEGER NOT NULL,
    source_surplus_quantity INTEGER NOT NULL,
    dest_deficit_quantity INTEGER NOT NULL,
    urgency VARCHAR(20) DEFAULT 'HIGH' NOT NULL,
    reason TEXT NOT NULL,
    estimated_transit_hours DOUBLE PRECISION DEFAULT 3.5 NOT NULL,
    estimated_impact TEXT,
    status VARCHAR(30) DEFAULT 'RECOMMENDED' NOT NULL,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    rejected_reason VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_redist_code ON redistribution_recommendations(recommendation_code);
CREATE INDEX IF NOT EXISTS ix_redist_rec_status_urgency ON redistribution_recommendations(status, urgency);

CREATE TABLE IF NOT EXISTS redistribution_transactions (
    id SERIAL PRIMARY KEY,
    recommendation_id INTEGER NOT NULL REFERENCES redistribution_recommendations(id) ON DELETE CASCADE,
    tracking_number VARCHAR(60) UNIQUE NOT NULL,
    current_status VARCHAR(30) DEFAULT 'DISPATCHED' NOT NULL,
    dispatched_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    estimated_arrival TIMESTAMP WITHOUT TIME ZONE,
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    vehicle_details VARCHAR(100) DEFAULT 'Refrigerated Medical Van KA-04-E-9021',
    temperature_logged_celsius DOUBLE PRECISION DEFAULT 4.2 NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    affected_district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    footfall_multiplier DOUBLE PRECISION DEFAULT 1.45 NOT NULL,
    medicine_demand_multiplier DOUBLE PRECISION DEFAULT 1.85 NOT NULL,
    bed_occupancy_multiplier DOUBLE PRECISION DEFAULT 1.35 NOT NULL,
    staff_strain_multiplier DOUBLE PRECISION DEFAULT 1.25 NOT NULL,
    ai_situation_summary TEXT,
    activated_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

-- ==============================================================================
-- 8. FEDERATED LEARNING & OBSERVABILITY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS federated_nodes (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    node_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'CONNECTED' NOT NULL,
    local_data_points INTEGER DEFAULT 125000 NOT NULL,
    local_accuracy DOUBLE PRECISION DEFAULT 0.86 NOT NULL,
    last_sync_time TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE TABLE IF NOT EXISTS federated_training_rounds (
    id SERIAL PRIMARY KEY,
    round_number INTEGER NOT NULL,
    node_id INTEGER NOT NULL REFERENCES federated_nodes(id) ON DELETE CASCADE,
    local_loss DOUBLE PRECISION DEFAULT 0.18 NOT NULL,
    local_accuracy DOUBLE PRECISION DEFAULT 0.85 NOT NULL,
    global_aggregated_accuracy DOUBLE PRECISION DEFAULT 0.87 NOT NULL,
    weights_divergence DOUBLE PRECISION DEFAULT 0.042 NOT NULL,
    parameters_size_kb DOUBLE PRECISION DEFAULT 248.5 NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_fed_round_node ON federated_training_rounds(round_number, node_id);

CREATE TABLE IF NOT EXISTS model_metrics (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    horizon_days INTEGER,
    evaluated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_model_metric_name_type ON model_metrics(model_name, metric_type);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(120),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1' NOT NULL,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_audit_user_ts ON audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS ix_audit_action_ts ON audit_logs(action, timestamp);

COMMIT;
