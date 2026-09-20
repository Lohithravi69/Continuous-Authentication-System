import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { RawKeyEvent } from '../types';
import { KeyRound, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

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

  // Initialize enrollment session on mount
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
    setFeedbackMsg({ type: 'error', text: 'Pasting text is disabled during behavioral enrollment.' });
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

    // Reset buffer for next step
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
        setFeedbackMsg({ type: 'success', text: `Session ${res.windows_captured}/${requiredSteps} accepted!` });
        stepStartTs.current = performance.now();

        if (res.is_ready_to_train) {
          // Trigger training One-Class SVM
          setTraining(true);
          try {
            await api.completeEnrollment(enrollSessionId);
            await refreshUser();
            setModelTrained(true);
            setFeedbackMsg({ type: 'success', text: 'Model v1.0 successfully trained and deployed!' });
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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Behavioral Biometrics Enrollment Wizard
            </h1>
            <p className="text-xs text-slate-400">
              Collects keystroke timing dynamics to train your personalized One-Class SVM baseline.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Enrollment Progress</span>
            <span className="text-sky-400 font-mono">{currentStep} of {requiredSteps} Sessions Completed</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep / requiredSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`mb-6 p-4 rounded-xl border text-xs flex items-center gap-3 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Finished / Model Ready State */}
        {modelTrained ? (
          <div className="text-center py-8 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-6 mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              Behavioral Baseline Profile Active
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto mb-6">
              Your One-Class SVM model (version <strong>v1.0</strong>) has been trained and saved. Continuous background monitoring is now enabled across your sessions.
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 mx-auto"
            >
              <span>Launch Protected Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : training ? (
          <div className="text-center py-12 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-12 h-12 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-white mb-1">
              Training One-Class SVM Profile...
            </h3>
            <p className="text-xs text-slate-400">
              Standardizing timing vectors and persisting artifact <span className="font-mono text-sky-400">user_profile_v1.0.joblib</span>
            </p>
          </div>
        ) : (
          <div>
            {/* Prompt Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 mb-5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-sky-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Type the following prompt naturally:</span>
              </div>
              <p className="text-sm font-medium text-slate-200 leading-relaxed font-mono select-none">
                "{promptText}"
              </p>
            </div>

            {/* Typing Textarea */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Typing Input Area (Timing will be measured in real time):
              </label>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onPaste={handlePaste}
                placeholder="Start typing the prompt above..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-2xl p-4 text-sm text-white placeholder-slate-600 transition-all font-mono leading-relaxed resize-none"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                <span>Keystrokes buffered: <strong className="text-sky-400">{keyEvents.current.length}</strong></span>
                <span>Quality Gate: <strong>No Paste / Low Backspace</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  keyEvents.current = [];
                  pendingKeys.current.clear();
                  backspaceCount.current = 0;
                  setInputText('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all"
              >
                Clear & Reset
              </button>

              <button
                type="button"
                disabled={loading || inputText.trim().length < 20}
                onClick={submitSessionWindow}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-sky-600/25 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Submit Session {currentStep + 1}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
