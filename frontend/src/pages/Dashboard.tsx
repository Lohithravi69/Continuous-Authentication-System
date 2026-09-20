import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useKeystrokeCollector } from '../hooks/useKeystrokeCollector';
import { TelemetryDiagnostics } from '../components/TelemetryDiagnostics';
import { BiometricWaveform } from '../components/BiometricWaveform';
import { api } from '../services/api';
import { AuditLogItem } from '../types';
import { 
  FileText, Shield, Sparkles, Terminal, RefreshCw, AlertTriangle, 
  CheckCircle2, Clock, History, Cpu, UserX, KeyRound, Lock
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, sessionId, handleTelemetryResult, latestTelemetry } = useAuth();
  const { activeWindowKeys, isIdle, windowIndex } = useKeystrokeCollector();
  
  const [editorText, setEditorText] = useState(
    "Welcome to the Protected Continuous Biometrics Workspace.\n\nType freely inside this document. As you type, the background telemetry engine passively measures your keystroke dwell and flight intervals in 5-second sliding windows.\n\nTry typing naturally to maintain a verified Green status, or try typing with very slow, erratic pauses to simulate an impostor and observe the Risk Engine trigger Step-Up verification."
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [simulatingImpostor, setSimulatingImpostor] = useState(false);

  const fetchLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs.slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  // Simulator: inject synthetic anomalous window to demonstrate Step-Up trigger to examiners
  const simulateImpostorAttack = async () => {
    if (!sessionId) return;
    setSimulatingImpostor(true);
    
    // Generate synthetic slow erratic keystrokes
    const events = [];
    const now = performance.now();
    for (let i = 0; i < 20; i++) {
      const down = now + i * 380;
      const up = down + 300; // abnormally long dwell
      events.push({ key: `Key${String.fromCharCode(65 + (i % 26))}`, down_ts: Math.round(down), up_ts: Math.round(up) });
    }

    try {
      const res = await api.sendTelemetryWindow(sessionId, windowIndex + 99, events, 5000);
      handleTelemetryResult(res);
      fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingImpostor(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 cyber-grid">
      
      {/* Top Telemetry Diagnostics HUD */}
      <TelemetryDiagnostics
        activeKeys={activeWindowKeys}
        isIdle={isIdle}
        windowIndex={windowIndex}
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Protected Document Editor & Live Waveform */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Live Biometric Rhythm Waveform */}
          <BiometricWaveform
            activeKeys={activeWindowKeys}
            riskScore={latestTelemetry?.risk_score ?? 0.08}
            state={latestTelemetry?.state || 'GREEN'}
          />

          {/* Protected Document Pad */}
          <div className="ultra-glass rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Protected Enterprise Document Console</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Continuous Biometric Shield Active
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={12}
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="Type naturally inside this protected pad to evaluate keystroke timing in real-time..."
                className="w-full bg-slate-950/80 border border-slate-800/90 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-2xl p-5 text-sm text-slate-100 placeholder-slate-600 transition-all font-sans leading-relaxed resize-none shadow-inner"
              />
              
              <div className="absolute bottom-3 right-4 font-mono text-[11px] text-slate-500 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
                Characters: {editorText.length}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Zero text stored: timing intervals are extracted anonymously.</span>
              </div>

              {/* Examiner Attack Simulation Tool */}
              <button
                onClick={simulateImpostorAttack}
                disabled={simulatingImpostor}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600/20 to-red-600/20 border border-rose-500/40 hover:border-rose-500/80 text-rose-200 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-950/40 hover:scale-105"
              >
                {simulatingImpostor ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                ) : (
                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Simulate Impostor Takeover (Examiner Demo)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Security Policy Engine Status & Audit Trail */}
        <div className="space-y-5">
          
          {/* Zero-Trust Policy Engine Info Card */}
          <div className="ultra-glass rounded-3xl p-6 border border-white/5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Shield className="w-4 h-4" />
              </div>
              <span>Zero-Trust Security Parameters</span>
            </h3>
            
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Algorithm:</span>
                <span className="text-cyan-400 font-bold">One-Class SVM (RBF)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Profile Version:</span>
                <span className="text-white font-bold">{user?.model_version || 'v1.0'}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Green / Yellow Cutoff:</span>
                <span className="text-emerald-400 font-bold">&lt; 0.40 Risk</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Strike Decay:</span>
                <span className="text-slate-200 font-bold">-1 strike / 30s Clean</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Lockout Limit:</span>
                <span className="text-rose-400 font-bold">3 Step-Up Fails</span>
              </div>
            </div>
          </div>

          {/* Audit Logs Feed */}
          <div className="ultra-glass rounded-3xl p-6 border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <History className="w-4 h-4" />
                </div>
                <span>Security Audit Trail</span>
              </h3>
              <button 
                onClick={fetchLogs} 
                className="text-xs text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No security events logged yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono flex items-start justify-between gap-2 hover:border-slate-700 transition-all"
                  >
                    <div>
                      <span className={`font-bold ${
                        log.event_type.includes('LOCK') || log.event_type.includes('STEPUP') 
                          ? 'text-rose-400' 
                          : log.event_type.includes('WARN') 
                            ? 'text-amber-400' 
                            : 'text-cyan-400'
                      }`}>
                        {log.event_type}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
