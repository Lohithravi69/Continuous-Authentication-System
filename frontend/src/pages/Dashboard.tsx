import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useKeystrokeCollector } from '../hooks/useKeystrokeCollector';
import { TelemetryDiagnostics } from '../components/TelemetryDiagnostics';
import { api } from '../services/api';
import { AuditLogItem } from '../types';
import { 
  FileText, Shield, Sparkles, Terminal, RefreshCw, AlertTriangle, 
  CheckCircle2, Clock, History, Cpu, UserX
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, sessionId, handleTelemetryResult } = useAuth();
  const { activeWindowKeys, isIdle, windowIndex } = useKeystrokeCollector();
  
  const [editorText, setEditorText] = useState(
    "Welcome to the Protected Workspace.\n\nType freely inside this pad. As you type, the background telemetry engine continuously buffers your keystroke intervals in 5-second sliding windows.\n\nTry typing normally to maintain a Green security status, or try typing with very slow, erratic pauses to simulate an impostor and observe the Risk Engine in action."
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
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  // Simulator helper: inject synthetic anomalous window to demonstrate Step-Up trigger to examiners
  const simulateImpostorAttack = async () => {
    if (!sessionId) return;
    setSimulatingImpostor(true);
    
    // Generate synthetic slow erratic keystrokes
    const events = [];
    const now = performance.now();
    for (let i = 0; i < 20; i++) {
      const down = now + i * 360;
      const up = down + 280; // abnormally long dwell
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Telemetry Diagnostics Widget */}
      <TelemetryDiagnostics
        activeKeys={activeWindowKeys}
        isIdle={isIdle}
        windowIndex={windowIndex}
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Protected Interactive Workspace & Text Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Continuous Protected Document Editor</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Live Typing Protected
              </span>
            </div>

            <textarea
              rows={12}
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder="Type anything here to test behavioral monitoring..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 transition-all font-sans leading-relaxed resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Typing events are monitored in rolling 5s intervals.</span>
              </div>

              {/* Examiner Attack Simulation Button */}
              <button
                onClick={simulateImpostorAttack}
                disabled={simulatingImpostor}
                className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                {simulatingImpostor ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserX className="w-3.5 h-3.5" />
                )}
                <span>Simulate Impostor Attack (Examiner Demo)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Audit Logs & Security Information */}
        <div className="space-y-4">
          
          {/* Security Governance Card */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Zero-Trust Policy Guard</span>
            </h3>
            
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Model Algorithm:</span>
                <span className="font-mono text-sky-400 font-bold">One-Class SVM</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Model Version:</span>
                <span className="font-mono text-white font-bold">{user?.model_version || 'v1.0'}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Green / Yellow Threshold:</span>
                <span className="font-mono text-emerald-400 font-bold">&lt; 0.40 Risk</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Strike Decay Period:</span>
                <span className="font-mono text-slate-200 font-bold">-1 per 30s Clean</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Lockout Limit:</span>
                <span className="font-mono text-rose-400 font-bold">3 Step-Up Fails</span>
              </div>
            </div>
          </div>

          {/* Audit Logs Feed */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Security Audit Trail</span>
              </h3>
              <button 
                onClick={fetchLogs} 
                className="text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No security events logged yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className={`font-bold ${
                        log.event_type.includes('LOCK') || log.event_type.includes('STEPUP') 
                          ? 'text-rose-400' 
                          : log.event_type.includes('WARN') 
                            ? 'text-amber-400' 
                            : 'text-sky-400'
                      }`}>
                        {log.event_type}
                      </span>
                      <div className="text-[10px] text-slate-500">
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
