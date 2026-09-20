import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RawKeyEvent } from '../types';
import { KeyRound, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, RefreshCw, ShieldCheck, Fingerprint, Zap } from 'lucide-react';

interface EnrollmentWizardProps {
  onComplete: () => void;
}

const ENROLLMENT_PROMPTS = [
  "Session 1 of 3: Continuous authentication uses keystroke timing biometrics to verify legitimate user identity without interrupting active productivity.",
  "Session 2 of 3: Privacy preserving security protects against session hijacking and physical unauthorized access by analyzing typing rhythms in the background.",
  "Session 3 of 3: Machine learning models extract dwell time and flight transitions to construct a personal behavioral signature for zero trust defense."
];

export const EnrollmentWizard: React.FC<EnrollmentWizardProps> = ({ onComplete }) => {
  const { refreshUser } = useAuth();
  
  const [enrollSessionId, setEnrollSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [requiredSteps, setRequiredSteps] = useState<number>(3);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [training, setTraining] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [modelTrained, setModelTrained] = useState<boolean>(false);

  const keyEvents = useRef<RawKeyEvent[]>([]);
  const pendingKeys = useRef<Map<string, number>>(new Map());
  const stepStartTs = useRef<number>(performance.now());
  const backspaceCount = useRef<number>(0);
  const pasteDetected = useRef<boolean>(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await api.startEnrollment();
        setEnrollSessionId(res.enroll_session_id);
        setCurrentStep(res.windows_captured);
        setRequiredSteps(res.required_windows);
        stepStartTs.current = performance.now();
      } catch (err: any) {
        setFeedbackMsg({ type: 'error', text: err.message || 'Failed to start enrollment.' });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace') {
      backspaceCount.current += 1;
    }

    const code = e.code || `Key${e.key.toUpperCase()}`;
    if (!pendingKeys.current.has(code)) {
      pendingKeys.current.set(code, performance.now());
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const code = e.code || `Key${e.key.toUpperCase()}`;
    const down = pendingKeys.current.get(code);
    if (down !== undefined) {
      const up = performance.now();
      pendingKeys.current.delete(code);
      keyEvents.current.push({
        key: code,
        down_ts: Math.round(down),
        up_ts: Math.round(up)
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    pasteDetected.current = true;
    setFeedbackMsg({ type: 'error', text: 'Pasting text is disabled during behavioral calibration.' });
  };

  const submitSessionWindow = async () => {
    if (!enrollSessionId || keyEvents.current.length < 15) {
      setFeedbackMsg({ type: 'error', text: 'Please type more text before submitting this session window.' });
      return;
    }

    setLoading(true);
    setFeedbackMsg(null);

    const durationMs = Math.round(performance.now() - stepStartTs.current);
    const events = [...keyEvents.current];
    const backspaces = backspaceCount.current;
    const paste = pasteDetected.current;

    keyEvents.current = [];
    pendingKeys.current.clear();
    backspaceCount.current = 0;
    pasteDetected.current = false;
    setInputText('');

    try {
      const res = await api.submitEnrollWindow(
        enrollSessionId,
        currentStep + 1,
        events,
        durationMs,
        backspaces,
        paste
      );

      if (res.quality === 'ACCEPT') {
        setCurrentStep(res.windows_captured);
        setFeedbackMsg({ type: 'success', text: `Session ${res.windows_captured}/${requiredSteps} accepted & calibrated!` });
        stepStartTs.current = performance.now();

        if (res.is_ready_to_train) {
          setTraining(true);
          try {
            await api.completeEnrollment(enrollSessionId);
            await refreshUser();
            setModelTrained(true);
            setFeedbackMsg({ type: 'success', text: 'One-Class SVM model successfully trained and deployed!' });
          } catch (err: any) {
            setFeedbackMsg({ type: 'error', text: err.message || 'Model training failed.' });
          } finally {
            setTraining(false);
          }
        }
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Window rejected. Please type smoothly.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to submit enrollment window.' });
    } finally {
      setLoading(false);
    }
  };

  const promptText = ENROLLMENT_PROMPTS[Math.min(currentStep, ENROLLMENT_PROMPTS.length - 1)];

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 cyber-grid">
      <div className="ultra-glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Glow & Cyber Aperture */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 border border-cyan-400/30">
            <Fingerprint className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Behavioral Biometrics Calibration
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              3-Session Keystroke Dynamic Profiling & One-Class SVM Synthesis
            </p>
          </div>
        </div>

        {/* 3 Step Progress Indicators */}
        <div className="mb-8 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold mb-3">
            <span className="text-slate-300 font-mono">Calibration Progress</span>
            <span className="text-cyan-400 font-mono font-bold">{currentStep} of {requiredSteps} Sessions Completed</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {[0, 1, 2].map((idx) => (
              <div 
                key={idx} 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  idx < currentStep 
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-500 shadow-md shadow-cyan-500/40' 
                    : idx === currentStep 
                      ? 'bg-cyan-500/30 border border-cyan-400/50 animate-pulse' 
                      : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`mb-6 p-4 rounded-2xl border text-xs flex items-center gap-3 shadow-lg ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
        )}

        {/* Finished / Model Ready State */}
        {modelTrained ? (
          <div className="text-center py-10 bg-gradient-to-b from-emerald-950/30 to-slate-950/80 border border-emerald-500/40 rounded-3xl p-8 mb-6 shadow-2xl shadow-emerald-950/50">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 mb-5 shadow-2xl shadow-emerald-500/30 animate-pulse">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-white mb-2 tracking-tight">
              Behavioral Profile Synthesis Complete
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
              Your personalized One-Class SVM model (version <strong className="text-cyan-400">v1.0</strong>) is active. Continuous background monitoring will now evaluate your live sessions silently.
            </p>
            <button
              onClick={onComplete}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 mx-auto hover:scale-105"
            >
              <span>Enter Protected Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : training ? (
          <div className="text-center py-16 bg-slate-950/80 border border-slate-800 rounded-3xl p-8">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <Zap className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto" />
            </div>
            <h3 className="text-lg font-extrabold text-white mb-1">
              Training Behavioral Anomaly Profile...
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Fitting One-Class SVM RBF hyper-parameters on enrolled vectors
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Prompt Box */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-inner">
              <div className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Type the following prompt naturally:</span>
              </div>
              <p className="text-sm font-medium text-slate-200 leading-relaxed font-mono select-none bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                "{promptText}"
              </p>
            </div>

            {/* Typing Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Calibration Pad (Keystroke dwell & flight times are recorded):
              </label>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onPaste={handlePaste}
                placeholder="Start typing the prompt above..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-2xl p-4 text-sm text-white placeholder-slate-600 transition-all font-mono leading-relaxed resize-none shadow-inner"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                <span>Keystrokes buffered: <strong className="text-cyan-400">{keyEvents.current.length}</strong></span>
                <span>Gate: <strong>Zero Paste / Natural Variance</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  keyEvents.current = [];
                  pendingKeys.current.clear();
                  backspaceCount.current = 0;
                  setInputText('');
                }}
                className="px-5 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all"
              >
                Clear Buffer
              </button>

              <button
                type="button"
                disabled={loading || inputText.trim().length < 20}
                onClick={submitSessionWindow}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 transition-all flex items-center gap-2 hover:scale-105"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Calibrate Session {currentStep + 1}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
