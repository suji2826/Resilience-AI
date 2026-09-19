import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface DemoStep {
  stepIndex: number;
  title: string;
  badge: string;
  route: string;
  description: string;
  highlightText: string;
  actionButtonText?: string;
  /** Key used by pages to trigger an automatic action (e.g. copilot auto-query) */
  autoActionKey?: string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    stepIndex: 1,
    title: "1. National Healthcare Command Center",
    badge: "OBSERVE",
    route: "/dashboard",
    description: "Real-time telemetry across 98 Primary Health Centres (PHCs) and 22 essential medicines across 6 Indian states. Notice the critical pulse in Namakkal District, Tamil Nadu.",
    highlightText: "98 PHCs Monitored • 22 Essential Medicines • 6 States • Live Bed & Inventory Telemetry",
    actionButtonText: "Inspect Medicine Risk →"
  },
  {
    stepIndex: 2,
    title: "2. Medicine Stock-out Risk Matrix",
    badge: "PREDICT",
    route: "/inventory",
    description: "The Predictive Risk Engine flags ORS Sachet and Paracetamol in Namakkal District at CRITICAL risk. Only 2.37 days of supply remain — but the supplier lead time is 6 days.",
    highlightText: "ORS Sachet · 2.37 Days Remaining · 92% Stock-out Probability · 6-Day Lead Time",
    actionButtonText: "Open Deep-Dive ML Forecast →"
  },
  {
    stepIndex: 3,
    title: "3. Multi-Horizon ML Demand Forecast",
    badge: "ML FORECAST",
    route: "/inventory/1",
    description: "Holt-Winters time-series model with footfall cross-elasticity predicts a +33% demand surge in ORS over the next 7 days, with 89% confidence interval bounds shown.",
    highlightText: "Current Burn Rate: 135 units/day → Projected: 180 units/day · Confidence: 89%",
    actionButtonText: "Review Early Warning Alerts →"
  },
  {
    stepIndex: 4,
    title: "4. Real-time Early Warning Alerts",
    badge: "WARN",
    route: "/alerts",
    description: "An alert fires before the stock-out occurs. AI root-cause explainability attributes the risk to a +37% footfall surge and supplier lead-time lag — actionable before a crisis happens.",
    highlightText: "ALT-NMK-001 · Imminent ORS Stock-out · Kolli Hills Tribal PHC · +37% Footfall Surge",
    actionButtonText: "Open AI Redistribution Optimizer →"
  },
  {
    stepIndex: 5,
    title: "5. AI-Powered Resource Redistribution",
    badge: "OPTIMIZE",
    route: "/redistribution",
    description: "The Linear Redistribution Optimizer identifies 2,800 units of verified ORS surplus in adjacent Salem District and formulates an optimal 1,900-unit transfer. Click 'Approve & Dispatch' to authorize.",
    highlightText: "Source: Salem (2,800 Surplus) → Dest: Namakkal (1,900 Deficit) · ~2.5h Cold-Chain Transit",
    actionButtonText: "Trigger Dengue Emergency →"
  },
  {
    stepIndex: 6,
    title: "6. Dengue Outbreak Emergency Simulator",
    badge: "EMERGENCY RESPONSE",
    route: "/emergency",
    description: "Select 'Dengue & Vector-Borne' scenario and click 'Trigger Simulation'. The engine applies +85% demand multipliers and recalculates risk across all Namakkal PHCs in real time.",
    highlightText: "Dengue Outbreak · Demand Multiplier: +85% · Bed Occupancy: 94% · Auto Telemetry Recalc",
    actionButtonText: "View Impact Changes →"
  },
  {
    stepIndex: 7,
    title: "7. Crisis Demand & Resource Changes",
    badge: "IMPACT ANALYSIS",
    route: "/emergency",
    description: "Scroll down to the 'Before vs After' telemetry panel. Every metric — ORS demand, bed occupancy, staff load — has recalculated in real time based on the active crisis multipliers.",
    highlightText: "Before: 135 units/day ORS · After: 250 units/day · Before: 67% beds · After: 94% beds",
    actionButtonText: "Explore BRICS Federated AI →"
  },
  {
    stepIndex: 8,
    title: "8. Privacy-Preserving BRICS Federated AI",
    badge: "LEARN (BRICS)",
    route: "/federated-ai",
    description: "Collaborative ML training across 5 BRICS nations. Each node trains on its own local patient data. Only encrypted model weights — never raw records — are shared via FedAvg aggregation.",
    highlightText: "FedAvg Aggregation · 5 Nodes · 248.5 KB Parameters · 88.4% Global Accuracy · Zero Raw Data Transfer",
    actionButtonText: "Query Gemini Copilot →"
  },
  {
    stepIndex: 9,
    title: "9. Google Gemini Resilience Copilot",
    badge: "GEN-AI REASONING",
    route: "/copilot",
    description: "The Copilot auto-queries: 'What are today's most critical healthcare risks?' Every fact in the response is grounded in live database telemetry — no hallucination possible.",
    highlightText: "Query: 'What are today's most critical healthcare risks?' · Grounded in PostgreSQL Live Telemetry",
    actionButtonText: "Data Sovereignty Explanation →",
    autoActionKey: "COPILOT_DEMO_QUERY"
  },
  {
    stepIndex: 10,
    title: "10. Data Sovereignty & Privacy Guarantee",
    badge: "PRIVACY",
    route: "/federated-ai",
    description: "Raw patient records from Namakkal's 98 PHCs never leave India. Only model weight gradients are shared. This is why federated learning is critical for BRICS healthcare collaboration.",
    highlightText: "Raw Data: Stays Local in India · Shared: Encrypted Gradient Weights Only · Compliance: DPDP Act 2023",
    actionButtonText: "Finish Demo Tour ✓"
  },
];

interface DemoContextType {
  isDemoActive: boolean;
  currentStepIndex: number;
  currentStep: DemoStep;
  startDemo: () => void;
  stopDemo: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const navigate = useNavigate();

  const currentStep = DEMO_STEPS.find(s => s.stepIndex === currentStepIndex) || DEMO_STEPS[0];

  const startDemo = () => {
    setIsDemoActive(true);
    setCurrentStepIndex(1);
    navigate(DEMO_STEPS[0].route);
  };

  const stopDemo = () => {
    setIsDemoActive(false);
  };

  const goToStep = (index: number) => {
    const step = DEMO_STEPS.find(s => s.stepIndex === index);
    if (step) {
      setCurrentStepIndex(index);
      navigate(step.route);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < DEMO_STEPS.length) {
      goToStep(currentStepIndex + 1);
    } else {
      stopDemo();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 1) {
      goToStep(currentStepIndex - 1);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoActive,
        currentStepIndex,
        currentStep,
        startDemo,
        stopDemo,
        nextStep,
        prevStep,
        goToStep
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used within DemoProvider');
  return context;
};
