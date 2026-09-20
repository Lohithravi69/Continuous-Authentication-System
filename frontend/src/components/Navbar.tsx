import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, LogOut, BarChart3, LayoutDashboard, KeyRound, Radio } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'enrollment' | 'evaluation';
  setCurrentTab: (tab: 'dashboard' | 'enrollment' | 'evaluation') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout, latestTelemetry } = useAuth();

  const getStatusBadge = () => {
    if (!user?.has_model) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Profile Inactive • Setup Required</span>
        </div>
      );
    }

    const state = latestTelemetry?.state || 'GREEN';
    if (state === 'GREEN') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/15">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Shield Active ({user.model_version || 'v1.0'})</span>
        </div>
      );
    } else if (state === 'YELLOW') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-200 border border-amber-500/40 shadow-md shadow-amber-500/20 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Warning: Strike {latestTelemetry?.strike_count}/2</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/50 shadow-lg shadow-rose-500/30 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Step-Up Challenge</span>
        </div>
      );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#070D1B]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo & Cyber Tag */}
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30 group-hover:scale-105 transition-all">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#070D1B]" />
          </div>

          <div>
            <div className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
              <span>Keystroke Sentinel</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                PROD v2.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Privacy-Preserving Zero-Trust Continuous Biometrics
            </div>
          </div>
        </div>

        {/* Center Modern Navigation Pills */}
        {user && (
          <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-inner">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>

            <button
              onClick={() => setCurrentTab('enrollment')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'enrollment'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enrollment Hub</span>
            </button>

            {user.has_model && (
              <button
                onClick={() => setCurrentTab('evaluation')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'evaluation'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Biometrics EER & ROC</span>
              </button>
            )}
          </nav>
        )}

        {/* User Identity Info & Quick Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800/80">
              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                  {user.username}
                </span>
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
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
