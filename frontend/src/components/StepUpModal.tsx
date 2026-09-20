import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldAlert, KeyRound, AlertOctagon, CheckCircle2, Lock, Sparkles } from 'lucide-react';

export const StepUpModal: React.FC = () => {
  const { sessionId, isStepUpOpen, unlockAfterStepUp, triggerLockout } = useAuth();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  if (!isStepUpOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !sessionId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.verifyStepUp(sessionId, inputVal);
      if (res.success) {
        setInputVal('');
        unlockAfterStepUp();
      } else {
        setAttemptsRemaining(res.attempts_remaining);
        if (res.session_locked || res.attempts_remaining <= 0) {
          triggerLockout();
        } else {
          setErrorMsg(res.message || `Verification failed. ${res.attempts_remaining} attempt(s) left.`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Laser aperture glow effect */}
      <div className="w-full max-w-md ultra-glass rounded-3xl p-6 sm:p-8 border border-rose-500/50 shadow-2xl shadow-rose-950/70 relative overflow-hidden">
        
        {/* Glowing top laser warning line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-lg shadow-rose-500/80" />

        {/* Ambient Red Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Step-Up Identity Verification
            </h2>
            <div className="text-xs text-rose-400 font-mono font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Behavioral Anomaly Threshold Exceeded</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5 text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            The continuous security layer detected unusual typing dynamics that deviate from your enrolled baseline profile.
          </p>
          <div className="flex items-center gap-2 text-cyan-300 font-mono text-[11px] bg-cyan-950/40 p-2 rounded-xl border border-cyan-500/20">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Telemetry is PAUSED during verification to isolate challenge input.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Enter Account Password or Challenge Phrase:
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Enter password or 'verify identity'"
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Tip for defense demo: enter your password or <strong className="font-mono text-cyan-400">verify identity</strong></span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3">
            <span className="text-xs font-mono text-slate-400">
              Attempts: <strong className="text-rose-400 font-bold">{attemptsRemaining}</strong> / 3 left
            </span>

            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xl shadow-rose-600/30 flex items-center gap-2 hover:scale-105"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Verify & Resume</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
