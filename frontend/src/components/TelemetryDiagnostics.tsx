import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Gauge, Zap, Clock, Shield, AlertTriangle } from 'lucide-react';

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

  const getRiskColor = (r: number) => {
    if (r < 0.40) return 'text-emerald-400 bg-emerald-500';
    if (r <= 0.70) return 'text-amber-400 bg-amber-500';
    return 'text-rose-400 bg-rose-500';
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Live Behavioral Diagnostics
            </h3>
            <p className="text-[11px] text-slate-400">
              Continuous 5s window timing evaluator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {captureEnabled ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Listener Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              PAUSED
            </span>
          )}
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        
        {/* Risk Meter */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Risk Score (0.0 - 1.0)</span>
            <Shield className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-white flex items-baseline gap-1">
            <span className={getRiskColor(risk).split(' ')[0]}>
              {(risk * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500">
              ({state})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getRiskColor(risk).split(' ')[1]}`}
              style={{ width: `${Math.min(100, risk * 100)}%` }}
            />
          </div>
        </div>

        {/* Speedometer WPM */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Typing Speed</span>
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-sky-400 flex items-baseline gap-1">
            {features ? features.wpm.toFixed(0) : '--'}
            <span className="text-[10px] text-slate-500">WPM</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {features ? `${features.n_keystrokes} keys in 5s` : 'Waiting for buffer...'}
          </div>
        </div>

        {/* Dwell Time Mean */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Hold Time (Dwell)</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-indigo-400 flex items-baseline gap-1">
            {features ? `${features.dwell_mean_ms.toFixed(0)}` : '--'}
            <span className="text-[10px] text-slate-500">ms</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            σ = {features ? `${features.dwell_std_ms.toFixed(1)}ms` : '--'}
          </div>
        </div>

        {/* Flight Time Mean */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Transition (Flight)</span>
            <Zap className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-violet-400 flex items-baseline gap-1">
            {features ? `${features.flight_dd_mean_ms.toFixed(0)}` : '--'}
            <span className="text-[10px] text-slate-500">ms (DD)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            UD = {features ? `${features.flight_ud_mean_ms.toFixed(0)}ms` : '--'}
          </div>
        </div>

      </div>

      {/* Footer Bar with Gate Status and Strike Badges */}
      <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 font-mono text-slate-300">
          <span>Window #{windowIndex}</span>
          <span>• Buffer: <strong className="text-white">{activeKeys}</strong> / 15 keys</span>
          {isIdle && (
            <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              IDLE (Below 15-key threshold)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium text-[11px]">Security Strikes:</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full border transition-all ${
              strikes >= 1 ? 'bg-amber-500 border-amber-400 shadow-sm shadow-amber-500/50' : 'bg-slate-800 border-slate-700'
            }`} />
            <span className={`w-3 h-3 rounded-full border transition-all ${
              strikes >= 2 ? 'bg-rose-500 border-rose-400 shadow-sm shadow-rose-500/50' : 'bg-slate-800 border-slate-700'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};
