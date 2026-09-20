import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export const SecurityBanner: React.FC = () => {
  const { user, latestTelemetry } = useAuth();

  if (!user || !user.has_model) {
    return null;
  }

  const state = latestTelemetry?.state || 'GREEN';
  const risk = latestTelemetry?.risk_score ?? 0.08;
  const strikes = latestTelemetry?.strike_count ?? 0;
  const decision = latestTelemetry?.decision || 'ALLOW';

  if (state === 'GREEN') {
    return (
      <div className="w-full bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-emerald-950/60 border-b border-emerald-500/30 px-4 sm:px-8 py-2.5 text-xs text-emerald-200 flex items-center justify-between backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Continuous Identity Verified
            </span>
            <span className="hidden md:inline text-emerald-400/80 font-mono text-[11px]">
              • Risk Index: {(risk * 100).toFixed(1)}% | One-Class SVM {user.model_version || 'v1.0'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-emerald-400/90 hidden sm:inline">Engine: ALLOW</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            0 / 2 Strikes
          </span>
        </div>
      </div>
    );
  }

  if (state === 'YELLOW') {
    return (
      <div className="w-full bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-amber-950/70 border-b border-amber-500/50 px-4 sm:px-8 py-2.5 text-xs text-amber-200 flex items-center justify-between backdrop-blur-md shadow-lg shadow-amber-950/40 animate-pulse-subtle">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="absolute w-5 h-5 rounded-full bg-amber-400/50 animate-ping" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-100 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Anomaly Warning: Keystroke Variance Shift Detected
            </span>
            <span className="hidden md:inline text-amber-300/80 text-[11px]">
              (Risk: {(risk * 100).toFixed(1)}% • Clean typing decays strike in 30s)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-3 py-1 rounded-lg bg-amber-500/30 text-amber-100 font-extrabold border border-amber-500/50 animate-pulse">
            Strike {strikes} of 2 Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-rose-950/80 via-slate-900/90 to-rose-950/80 border-b border-rose-500/60 px-4 sm:px-8 py-3 text-xs text-rose-200 flex items-center justify-between backdrop-blur-md shadow-2xl shadow-rose-950/80 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-500" />
          <span className="absolute w-6 h-6 rounded-full bg-rose-500/60 animate-ping" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-rose-100 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            CRITICAL BEHAVIORAL ANOMALY — STEP-UP CHALLENGE ENGAGED
          </span>
          <span className="hidden md:inline text-rose-300 font-mono text-[11px]">
            (Risk: {(risk * 100).toFixed(1)}% | Decision: STEP_UP)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="px-3 py-1 rounded-lg bg-rose-500/30 text-rose-100 font-extrabold border border-rose-500/60">
          Telemetry PAUSED
        </span>
      </div>
    </div>
  );
};
