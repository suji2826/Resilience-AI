/**
 * RESILIENCE AI – Static Mock Data
 * Used when the FastAPI backend is unreachable (e.g. Vercel frontend-only deployment).
 * All data is synthetic / demonstration data.
 */

export const MOCK_USER = {
  id: 1,
  email: 'national.admin@resilience.gov.in',
  full_name: 'Dr. Rajeshwar Rao',
  role: 'NATIONAL_ADMIN',
  state_id: null,
  district_id: null,
  phc_id: null,
  is_active: true,
};

export const MOCK_DASHBOARD = {
  kpis: {
    total_phcs: 98,
    critical_alerts: 7,
    medicines_at_risk: 12,
    available_beds: 1247,
    bed_occupancy_rate: 68,
    staff_on_duty: 487,
    staff_attendance_rate: 91,
  },
  map_markers: [
    { id: 1, code: 'PHC-TN-NMK-01', name: 'Kolli Hills Tribal PHC', district_name: 'Namakkal', state_name: 'Tamil Nadu', latitude: 11.2489, longitude: 78.3374, risk_category: 'CRITICAL', current_risk_score: 0.92, tier: 'Tier-1' },
    { id: 2, code: 'PHC-TN-NMK-02', name: 'Mallasamudram PHC', district_name: 'Namakkal', state_name: 'Tamil Nadu', latitude: 11.4821, longitude: 77.9621, risk_category: 'CRITICAL', current_risk_score: 0.88, tier: 'Tier-2' },
    { id: 3, code: 'PHC-TN-NMK-05', name: 'Rasipuram Model PHC', district_name: 'Namakkal', state_name: 'Tamil Nadu', latitude: 11.4580, longitude: 78.1680, risk_category: 'CRITICAL', current_risk_score: 0.94, tier: 'Tier-1' },
    { id: 4, code: 'PHC-TN-SLM-01', name: 'Valapady Central PHC', district_name: 'Salem', state_name: 'Tamil Nadu', latitude: 11.6500, longitude: 78.4100, risk_category: 'LOW', current_risk_score: 0.12, tier: 'CHC' },
    { id: 5, code: 'PHC-TN-DHP-01', name: 'Harur Block PHC', district_name: 'Dharmapuri', state_name: 'Tamil Nadu', latitude: 12.0600, longitude: 78.4900, risk_category: 'HIGH', current_risk_score: 0.72, tier: 'CHC' },
    { id: 6, code: 'PHC-KL-PLK-01', name: 'Attappadi Tribal PHC', district_name: 'Palakkad', state_name: 'Kerala', latitude: 11.0800, longitude: 76.6400, risk_category: 'HIGH', current_risk_score: 0.78, tier: 'Tier-1' },
    { id: 7, code: 'PHC-KA-BLR-01B', name: 'Sandur Mining Belt PHC', district_name: 'Ballari', state_name: 'Karnataka', latitude: 15.0800, longitude: 76.5400, risk_category: 'HIGH', current_risk_score: 0.77, tier: 'Tier-1' },
    { id: 8, code: 'PHC-AP-CTR-01', name: 'Madanapalle Block PHC', district_name: 'Chittoor', state_name: 'Andhra Pradesh', latitude: 13.5500, longitude: 78.5000, risk_category: 'HIGH', current_risk_score: 0.74, tier: 'CHC' },
    { id: 9, code: 'PHC-TG-HYD-01', name: 'Charminar Urban Health', district_name: 'Hyderabad', state_name: 'Telangana', latitude: 17.3616, longitude: 78.4747, risk_category: 'MEDIUM', current_risk_score: 0.51, tier: 'Urban PHC' },
    { id: 10, code: 'PHC-MH-NGP-01', name: 'Kamptee Model PHC', district_name: 'Nagpur', state_name: 'Maharashtra', latitude: 21.2200, longitude: 79.1900, risk_category: 'MEDIUM', current_risk_score: 0.46, tier: 'CHC' },
  ],
  top_critical_alerts: [
    { id: 1, title: 'Imminent ORS Stock-out', severity: 'CRITICAL', reason: 'Current consumption rate of 168 units/day will exhaust 399 units remaining in 2.4 days — well below the 6-day supplier lead time.', district_name: 'Namakkal', state_name: 'Tamil Nadu', alert_code: 'ALT-NMK-001' },
    { id: 2, title: 'Paracetamol Critical Shortage', severity: 'CRITICAL', reason: 'Demand surge of +41% driven by fever outbreak. 3.1 days supply remaining vs 6-day reorder lead time.', district_name: 'Namakkal', state_name: 'Tamil Nadu', alert_code: 'ALT-NMK-002' },
    { id: 3, title: 'High Bed Occupancy Alert', severity: 'HIGH', reason: 'ICU occupancy at 92% capacity. Only 2 isolation beds remain available across 3 Namakkal CHCs.', district_name: 'Namakkal', state_name: 'Tamil Nadu', alert_code: 'ALT-NMK-003' },
    { id: 4, title: 'Doxycycline Near Stock-out', severity: 'HIGH', reason: 'Anti-rickettsial demand elevated by monsoon season. 4.2 days stock vs 5-day lead time.', district_name: 'Dharmapuri', state_name: 'Tamil Nadu', alert_code: 'ALT-DHP-001' },
    { id: 5, title: 'Staff Attendance Below Threshold', severity: 'HIGH', reason: 'Only 61% doctor attendance today at Kolli Hills Tribal PHC due to monsoon-related commute disruption.', district_name: 'Namakkal', state_name: 'Tamil Nadu', alert_code: 'ALT-NMK-004' },
  ],
  medicines_at_risk: [
    { id: 1, medicine_name: 'ORS (Oral Rehydration Salts)', phc_name: 'Kolli Hills Tribal PHC', district_name: 'Namakkal', current_stock: 399, days_remaining: 2.4, risk_level: 'CRITICAL' },
    { id: 2, medicine_name: 'Paracetamol 500mg Tablets', phc_name: 'Rasipuram Model PHC', district_name: 'Namakkal', current_stock: 612, days_remaining: 3.1, risk_level: 'CRITICAL' },
    { id: 3, medicine_name: 'ORS (Oral Rehydration Salts)', phc_name: 'Vennandur Community PHC', district_name: 'Namakkal', current_stock: 480, days_remaining: 3.8, risk_level: 'CRITICAL' },
    { id: 4, medicine_name: 'Doxycycline 100mg Tablets', phc_name: 'Harur Block PHC', district_name: 'Dharmapuri', current_stock: 189, days_remaining: 4.2, risk_level: 'HIGH' },
    { id: 5, medicine_name: 'Snake Antivenom Polyvalent', phc_name: 'Attappadi Tribal PHC', district_name: 'Palakkad', current_stock: 7, days_remaining: 5.1, risk_level: 'HIGH' },
    { id: 6, medicine_name: 'Ringer\'s Lactate IV 500ml', phc_name: 'Mallasamudram PHC', district_name: 'Namakkal', current_stock: 28, days_remaining: 5.6, risk_level: 'HIGH' },
  ],
  top_redistributions: [
    {
      id: 1,
      recommendation_code: 'RDX-NMK-SLM-001',
      urgency: 'CRITICAL',
      source_district_name: 'Salem',
      source_surplus_quantity: 2800,
      dest_district_name: 'Namakkal',
      dest_deficit_quantity: 1900,
      recommended_quantity: 1900,
      estimated_transit_hours: 2.5,
      reason: 'Namakkal ORS critically depleted (2.4 days). Salem district holds 2,800 verified surplus units. Cold-chain transfer via NH-44 estimated at 2.5 hours.',
    },
    {
      id: 2,
      recommendation_code: 'RDX-NMK-CBE-002',
      urgency: 'HIGH',
      source_district_name: 'Coimbatore',
      source_surplus_quantity: 1400,
      dest_district_name: 'Namakkal',
      dest_deficit_quantity: 800,
      recommended_quantity: 800,
      estimated_transit_hours: 3.2,
      reason: 'Paracetamol shortage at Rasipuram PHC. Coimbatore district has adequate buffer stock for inter-district transfer without triggering local shortage.',
    },
  ],
  national_trends_7d: [
    { day_name: 'Mon', patient_footfall: 8420, medicine_consumption: 12100 },
    { day_name: 'Tue', patient_footfall: 9180, medicine_consumption: 13400 },
    { day_name: 'Wed', patient_footfall: 8760, medicine_consumption: 12800 },
    { day_name: 'Thu', patient_footfall: 9540, medicine_consumption: 14200 },
    { day_name: 'Fri', patient_footfall: 9820, medicine_consumption: 14900 },
    { day_name: 'Sat', patient_footfall: 7640, medicine_consumption: 11200 },
    { day_name: 'Sun', patient_footfall: 6210, medicine_consumption: 9100 },
  ],
  emergency_active: false,
  active_emergency_details: null,
};

export const MOCK_HEALTH = {
  status: 'healthy' as const,
  service: 'resilience-ai-backend',
  database: 'connected',
  env: 'demo',
  version: '1.0.0',
};
