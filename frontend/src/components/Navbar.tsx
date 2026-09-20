import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, LogOut, BarChart3, LayoutDashboard, KeyRound } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'enrollment' | 'evaluation';
  setCurrentTab: (tab: 'dashboard' | 'enrollment' | 'evaluation') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout, latestTelemetry } = useAuth();

  const getStatusBadge = () => {
    if (!user?.has_model) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <KeyRound className="w-3.5 h-3.5" />
          Enrollment Pending
        </span>
      );
    }

    const state = latestTelemetry?.state || 'GREEN';
    if (state === 'GREEN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Continuous Shield Active ({user.model_version || 'v1.0'})
        </span>
      );
    } else if (state === 'YELLOW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          Warning: Strike {latestTelemetry?.strike_count}/2
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5" />
          Step-Up Challenge Required
        </span>
      );
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base text-white tracking-tight flex items-center gap-2">
              Keystroke Sentinel
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                FYP Core
              </span>
            </div>
            <div className="text-xs text-slate-400 hidden sm:block">
              Privacy-Preserving Continuous Behavioral Authentication
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('enrollment')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'enrollment'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Enrollment Wizard</span>
            </button>

            {user.has_model && (
              <button
                onClick={() => setCurrentTab('evaluation')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  currentTab === 'evaluation'
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Biometric Metrics (EER/ROC)</span>
              </button>
            )}
          </nav>
        )}

        {/* User Info & Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => logout()}
                title="Logout"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

      </div>
    </header>
  );
};
