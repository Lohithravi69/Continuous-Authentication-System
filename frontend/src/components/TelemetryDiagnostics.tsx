import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Gauge, Zap, Clock, Shield, Radio, Layers } from 'lucide-react';

interface TelemetryDiagnosticsProps {
  activeKeys: number;
  isIdle: boolean;
  windowIndex: number;
}

export const TelemetryDiagnostics: React.FC<TelemetryDiagnosticsProps> = ({
  activeKeys,
  isIdle,
  windowIndex
}) => {
  const { latestTelemetry, captureEnabled } = useAuth();

  const risk = latestTelemetry?.risk_score ?? 0.08;
  const strikes = latestTelemetry?.strike_count ?? 0;
  const state = latestTelemetry?.state || 'GREEN';
  const features = latestTelemetry?.features;

  const getRiskStyles = (r: number) => {
    if (r < 0.40) return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      tagBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      label: 'Verified Genuine'
    };
    if (r <= 0.70) return {
      text: 'text-amber-400',
      bg: 'bg-amber-500',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/25',
      tagBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      label: 'Elevated Risk (Strike +1)'
    };
    return {
      text: 'text-rose-400',
      bg: 'bg-rose-500',
      border: 'border-rose-500/50',
      glow: 'shadow-rose-500/30',
      tagBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
      label: 'Anomaly (Step-Up Locked)'
    };
  };

  const riskStyle = getRiskStyles(risk);

  return (
    <div className="ultra-glass rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
      
      {/* Top neon scanner line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Behavioral Telemetry HUD</span>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 font-bold border border-cyan-500/30">
                5s Sliding Window
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live non-reversible feature extraction and One-Class SVM scoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {captureEnabled ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Telemetry Ingesting</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Listener PAUSED</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of 4 Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        
        {/* Risk Score Gauge */}
        <div className={`p-4 rounded-2xl bg-slate-950/70 border ${riskStyle.border} shadow-lg ${riskStyle.glow} transition-all duration-300 relative overflow-hidden group`}>
          <div className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Risk Index [0.0 - 1.0]</span>
            <Shield className={`w-4 h-4 ${riskStyle.text}`} />
          </div>
          
          <div className="text-2xl font-black font-mono tracking-tight flex items-baseline gap-2">
            <span className={riskStyle.text}>
              {(risk * 100).toFixed(1)}%
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${riskStyle.tagBg}`}>
              {state}
            </span>
          </div>

          <div className="w-full bg-slate-900 h-2.5 rounded-full mt-3 overflow-hidden p-0.5 border border-slate-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${riskStyle.bg}`}
              style={{ width: `${Math.min(100, Math.max(5, risk * 100))}%` }}
            />
          </div>
        </div>

        {/* WPM Speedometer */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Typing Velocity</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400 flex items-baseline gap-1.5">
            {features ? features.wpm.toFixed(0) : '--'}
            <span className="text-xs text-slate-500 font-sans font-medium">WPM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{features ? `${features.n_keystrokes} keys analyzed` : 'Awaiting keystrokes...'}</span>
          </div>
        </div>

        {/* Hold Time (Dwell) */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Dwell Hold Time (T_hold)</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-400 flex items-baseline gap-1.5">
            {features ? `${features.dwell_mean_ms.toFixed(0)}` : '--'}
            <span className="text-xs text-slate-500 font-sans font-medium">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Variance σ = {features ? `${features.dwell_std_ms.toFixed(1)}ms` : '--'}
          </div>
        </div>

        {/* Flight Time (Transition) */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Flight Interval (T_DD)</span>
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black font-mono text-violet-400 flex items-baseline gap-1.5">
            {features ? `${features.flight_dd_mean_ms.toFixed(0)}` : '--'}
            <span className="text-xs text-slate-500 font-sans font-medium">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Up-to-Down = {features ? `${features.flight_ud_mean_ms.toFixed(0)}ms` : '--'}
          </div>
        </div>

      </div>

      {/* Footer Info & Strike Badges */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 font-mono text-slate-300">
          <span className="text-slate-400">Window <strong className="text-white">#{windowIndex}</strong></span>
          <span>• Buffer: <strong className="text-cyan-400">{activeKeys}</strong> / 15 keystrokes</span>
          {isIdle && (
            <span className="text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30">
              IDLE (Zero penalty below 15 keys)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Security Strikes:</span>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full border transition-all ${
              strikes >= 1 
                ? 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-500/60 scale-110' 
                : 'bg-slate-800 border-slate-700'
            }`} title="Strike 1 / 2" />
            <div className={`w-4 h-4 rounded-full border transition-all ${
              strikes >= 2 
                ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/70 scale-110' 
                : 'bg-slate-800 border-slate-700'
            }`} title="Strike 2 / 2" />
          </div>
        </div>
      </div>

    </div>
  );
};
