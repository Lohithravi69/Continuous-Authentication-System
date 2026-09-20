import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldAlert, KeyRound, AlertOctagon, CheckCircle2, Lock } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/60 relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Subtle red background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Step-Up Identity Verification
            </h2>
            <div className="text-xs text-rose-400/90 font-medium">
              Behavioral anomaly threshold exceeded
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mb-5 text-xs text-slate-300 leading-relaxed">
          <p className="mb-2">
            The continuous security layer detected unusual typing dynamics that deviate from your enrolled profile.
          </p>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Telemetry is PAUSED during verification to isolate challenge input.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tip for defense demo: enter your password or <span className="font-mono text-sky-400">verify identity</span>
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-slate-400">
              Attempts: <strong className="text-rose-400">{attemptsRemaining}</strong> / 3 left
            </span>

            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>Verify & Resume</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
