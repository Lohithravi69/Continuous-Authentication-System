import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';

export const SecurityBanner: React.FC = () => {
  const { user, latestTelemetry } = useAuth();

  if (!user || !user.has_model) {
    return null;
  }

  const state = latestTelemetry?.state || 'GREEN';
  const risk = latestTelemetry?.risk_score ?? 0.12;
  const strikes = latestTelemetry?.strike_count ?? 0;
  const decision = latestTelemetry?.decision || 'ALLOW';

  if (state === 'GREEN') {
    return (
      <div className="w-full bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2 text-xs sm:text-sm text-emerald-300 flex items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Security Active — Verified Normal Behavior
          </span>
          <span className="hidden md:inline text-emerald-400/80">
            (Risk Score: {risk.toFixed(2)} | Model: {user.model_version || 'v1.0'})
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-emerald-400/90">Decision: {decision}</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            0 / 2 Strikes
          </span>
        </div>
      </div>
    );
  }

  if (state === 'YELLOW') {
    return (
      <div className="w-full bg-amber-950/50 border-b border-amber-500/40 px-4 py-2.5 text-xs sm:text-sm text-amber-200 flex items-center justify-between shadow-md transition-all duration-300 animate-pulse-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold text-amber-100 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Security Warning: Typing Pattern Variance Detected
          </span>
          <span className="hidden md:inline text-amber-300/80">
            (Risk Score: {risk.toFixed(2)} — Sustained normal typing will decay strike in 30s)
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-bold border border-amber-500/40 animate-pulse">
            Strike {strikes} of 2
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-rose-950/60 border-b border-rose-500/50 px-4 py-2.5 text-xs sm:text-sm text-rose-200 flex items-center justify-between shadow-lg shadow-rose-950/50 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <span className="font-bold text-rose-100 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          High Anomaly Detected — Step-Up Verification Challenge Required
        </span>
        <span className="hidden md:inline text-rose-300/80">
          (Risk Score: {risk.toFixed(2)} | Action: STEP_UP)
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="px-2.5 py-0.5 rounded bg-rose-500/30 text-rose-200 font-bold border border-rose-500/40">
          Telemetry PAUSED
        </span>
      </div>
    </div>
  );
};
