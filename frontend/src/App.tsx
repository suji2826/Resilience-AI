import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import { DemoProvider } from './hooks/useDemo';
import { DashboardLayout } from './layouts/DashboardLayout';
import { CardSkeleton, LoadingSkeleton } from './components/common/CommonUI';

// Critical direct imports for immediate FCP
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

// Lazy-loaded secondary route modules for bundle splitting and performance
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const InventoryDetail = lazy(() => import('./pages/InventoryDetail').then(m => ({ default: m.InventoryDetail })));
const PhcManagement = lazy(() => import('./pages/PhcManagement').then(m => ({ default: m.PhcManagement })));
const PhcDetail = lazy(() => import('./pages/PhcDetail').then(m => ({ default: m.PhcDetail })));
const Workforce = lazy(() => import('./pages/Workforce').then(m => ({ default: m.Workforce })));
const Resources = lazy(() => import('./pages/Resources').then(m => ({ default: m.Resources })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Redistribution = lazy(() => import('./pages/Redistribution').then(m => ({ default: m.Redistribution })));
const Emergency = lazy(() => import('./pages/Emergency').then(m => ({ default: m.Emergency })));
const FederatedAI = lazy(() => import('./pages/FederatedAI').then(m => ({ default: m.FederatedAI })));
const CopilotPage = lazy(() => import('./pages/CopilotPage').then(m => ({ default: m.CopilotPage })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

const PageLoader: React.FC = () => (
  <div className="space-y-6 p-2" role="status" aria-label="Loading page telemetry">
    <CardSkeleton count={4} />
    <LoadingSkeleton rows={5} />
  </div>
);

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DemoProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Landing & Auth */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />

                {/* Command Center Dashboard Sub-tree */}
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/phcs" element={<PhcManagement />} />
                  <Route path="/phcs/:id" element={<PhcDetail />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/inventory/:id" element={<InventoryDetail />} />
                  <Route path="/workforce" element={<Workforce />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/redistribution" element={<Redistribution />} />
                  <Route path="/emergency" element={<Emergency />} />
                  <Route path="/federated-ai" element={<FederatedAI />} />
                  <Route path="/copilot" element={<CopilotPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Catch-all redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </DemoProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
