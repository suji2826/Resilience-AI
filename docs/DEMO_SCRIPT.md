# RESILIENCE AI — 3 to 5 Minute Live Judge Demo Script

---

## Preparation (10 Seconds Before Demo)
1. Open the web application at `http://localhost:5173`.
2. Ensure you are on the Landing Page or logged in as `National Administrator`.
3. Locate the **"Start Judge Demo (3 Min)"** button in the sidebar or header.

---

## 0:00 – 0:45 | Step 1: The Vision & National Command Center
- **Speaker**:  
  *"Judges, public healthcare networks across developing nations face a deadly paradox: essential medicines exist in abundance in one district warehouse, while a neighboring district faces complete stock-out during an outbreak.*  
  *Welcome to **RESILIENCE AI** — an AI-powered Healthcare Resilience Command Center designed to predict shortages before they become crises."*
- **Action**:  
  - Click **"Start Judge Demo (3 Min)"** or navigate to `/dashboard`.
  - Point out the **Top 7 KPIs**: 98 PHCs monitored, 3 Critical Alerts, 6 Medicines at Risk, 742 Available Beds, 91.2% Forecast Accuracy.
  - Hover over the **Interactive Geospatial India Map**: Show the red pulsing node at **Kolli Hills Tribal PHC in Namakkal District, Tamil Nadu**.

---

## 0:45 – 1:30 | Step 2 & 3: Anomaly Detection & Predictive Demand Forecasting
- **Speaker**:  
  *"Notice how our Anomaly Engine has flagged Namakkal District. Patient footfall has spiked +37.4% due to acute fever presentations.*  
  *Let's inspect the medicine inventory to see how our predictive models respond."*
- **Action**:  
  - Navigate to `/inventory` and click on **ORS (Oral Rehydration Salts)** or **Paracetamol**.
  - Show the **Days Remaining**: `2.37 days` of stock left against an accelerated burn rate of 135 units/day, while supplier lead time is 6 days.
  - Click on the item to open `/inventory/1` (Deep-Dive Forecast).
  - Highlight the **Holt-Winters 7-Day Forecast Chart**: Show the predicted demand curve and confidence interval bounds (+33% demand increase).
  - Highlight the **AI Risk Explanation**: Explain how lead-time lag creates an unavoidable supply gap without peer redistribution.

---

## 1:30 – 2:30 | Step 4 & 5: Early Warning Alert & Cross-District Redistribution Optimization
- **Speaker**:  
  *"Rather than waiting for stock depletion, our Early Warning system generates actionable alerts with grounded root-cause explainability.*  
  *More importantly, RESILIENCE AI doesn't just alert—it solves the problem."*
- **Action**:  
  - Navigate to `/redistribution`.
  - Show the **Animated Route Visualization**:
    - **Source (Surplus)**: Salem District (+2,800 verified units surplus above 14-day mandatory safety buffer).
    - **Destination (Deficit)**: Namakkal District (-1,900 units deficit).
    - **Transit Time**: ~2.5 hours via refrigerated cold-chain van.
  - Click **"Approve & Dispatch"**:
    - Show the status immediately transition to **IN_TRANSIT**.
    - Point out the generated tracking code `MED-TRK-20260830-0001` and the 4.2°C cold-chain temperature telemetry.

---

## 2:30 – 3:30 | Step 6 & 7: Emergency Simulation & BRICS Federated Learning
- **Speaker**:  
  *"Now, let's stress-test the platform under severe crisis conditions."*
- **Action**:  
  - Navigate to `/emergency`.
  - Select **"Dengue & Vector-Borne Outbreak Simulation"** and click **"Run Emergency Simulation"**.
  - Show the **BEFORE vs AFTER Telemetry**:
    - Footfall jumps from `1,240 → 1,798 patients/day` (+45%).
    - Bed occupancy saturates from `71% → 94.2%`.
    - Medicine demand multiplier accelerates to `1.85x`.
    - Critical PHCs escalate from `2 → 8 PHCs`.
  - Navigate to `/federated-ai`:
    - Point out the **5 BRICS Nodes**: India, Brazil, Russia, China, South Africa.
    - Click **"Train Federated Round"**:
    - Explain: *"Raw patient data stays 100% local on sovereign servers. Only 248.5 KB weight gradients travel to the aggregator, elevating global model accuracy from 84% to 88.4%."*

---

## 3:30 – 4:30 | Step 8: Google Gemini Resilience Copilot
- **Speaker**:  
  *"Finally, meet **Resilience Copilot**, powered by Google Gemini and grounded in our live PostgreSQL telemetry with zero hallucinations."*
- **Action**:  
  - Click the **Copilot** launcher in the header or navigate to `/copilot`.
  - Click the prompt chip: *"Why is Namakkal at high risk?"* or *"Which medicines may stock out within 7 days?"*.
  - Show the instant, grounded response with supporting metrics, affected facilities, and actionable recommendations.

---

## 4:30 – 5:00 | Conclusion & Impact
- **Speaker**:  
  *"RESILIENCE AI turns reactive healthcare shortages into proactive, predictive logistics.  
  Real prediction, real optimization, real database grounding, and real Gemini reasoning.  
  Thank you, and we look forward to your questions!"*
