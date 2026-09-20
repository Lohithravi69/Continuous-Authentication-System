import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SecurityBanner } from './components/SecurityBanner';
import { StepUpModal } from './components/StepUpModal';
import { LockScreen } from './components/LockScreen';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { EnrollmentWizard } from './pages/EnrollmentWizard';
import { EvaluationReportPage } from './pages/EvaluationReport';

const AppContent: React.FC = () => {
  const { user, loading, isLocked } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'enrollment' | 'evaluation'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 1. If session is locked, display terminal lock screen
  if (isLocked) {
    return <LockScreen />;
  }

  // 2. Unauthenticated views
  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  // 3. Authenticated views
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <SecurityBanner />
      <StepUpModal />

      <main className="flex-1">
        {/* Model Readiness Guard: If user hasn't enrolled yet, force enrollment tab */}
        {!user.has_model || currentTab === 'enrollment' ? (
          <EnrollmentWizard onComplete={() => setCurrentTab('dashboard')} />
        ) : currentTab === 'evaluation' ? (
          <EvaluationReportPage />
        ) : (
          <Dashboard />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/40 py-4 text-center text-xs text-slate-500">
        Privacy-Preserving Continuous Keystroke Dynamics Authentication • FYP Defense Release v2.0
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
