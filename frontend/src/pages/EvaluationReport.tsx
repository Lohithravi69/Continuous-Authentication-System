import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EvaluationReport } from '../types';
import { BarChart3, TrendingUp, ShieldCheck, Activity, RefreshCw, Award, CheckCircle2, Clock } from 'lucide-react';

export const EvaluationReportPage: React.FC = () => {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEvaluationReport();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate evaluation report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center">
        <div className="w-12 h-12 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-base font-bold text-white mb-1">
          Evaluating Biometric Models (FAR / FRR / EER)...
        </h2>
        <p className="text-xs text-slate-400">
          Running cross-user impostor testing harness and computing ROC curve.
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="glass-panel rounded-2xl p-8 border border-slate-800">
          <p className="text-rose-400 text-sm mb-4">{error || 'No evaluation data available.'}</p>
          <button
            onClick={fetchReport}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Benchmark</span>
          </button>
        </div>
      </div>
    );
  }

  const { metrics, roc_curve } = report;

  // Generate SVG path for ROC Curve
  const svgWidth = 400;
  const svgHeight = 250;
  const padding = 30;

  const points = roc_curve.map((p) => {
    const x = padding + p.fpr * (svgWidth - 2 * padding);
    const y = svgHeight - padding - p.tpr * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Biometric Evaluation & Research Benchmark
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical validation for User: <strong className="text-white">{report.username}</strong> | Model Version: <strong className="text-sky-400">{report.model_version}</strong>
          </p>
        </div>

        <button
          onClick={fetchReport}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Evaluation Harness</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-1">Equal Error Rate (EER)</div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {metrics.eer.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Balanced Operating Target</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-1">ROC-AUC Score</div>
          <div className="text-2xl font-black font-mono text-sky-400">
            {metrics.roc_auc.toFixed(3)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-sky-400" />
            <span>Discriminative Power (Max: 1.0)</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-1">Detection Delay</div>
          <div className="text-2xl font-black font-mono text-indigo-400">
            {metrics.detection_delay_sec.toFixed(0)}s
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>~2 Sliding Windows</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-1">Scoring Latency (P95)</div>
          <div className="text-2xl font-black font-mono text-violet-400">
            {metrics.scoring_latency_ms.toFixed(1)}ms
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3 text-violet-400" />
            <span>Feature Extract + SVM</span>
          </div>
        </div>

      </div>

      {/* ROC Curve Visualization & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ROC Curve Chart */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Receiver Operating Characteristic (ROC)</h3>
              <p className="text-[11px] text-slate-400">True Positive Rate (TPR) vs False Positive Rate (FPR)</p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20">
              AUC = {metrics.roc_auc.toFixed(3)}
            </span>
          </div>

          <div className="flex justify-center py-2">
            <svg width={svgWidth} height={svgHeight} className="overflow-visible">
              {/* Grid lines */}
              <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#334155" strokeWidth="1" />
              <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="#334155" strokeWidth="1" />
              
              {/* Random guessing diagonal */}
              <line 
                x1={padding} 
                y1={svgHeight - padding} 
                x2={svgWidth - padding} 
                y2={padding} 
                stroke="#475569" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
              />

              {/* ROC Curve line */}
              <polyline
                fill="none"
                stroke="#0284C7"
                strokeWidth="3"
                points={points}
              />

              {/* Axis labels */}
              <text x={svgWidth / 2} y={svgHeight - 6} fill="#94A3B8" fontSize="10" textAnchor="middle">
                False Positive Rate (FAR)
              </text>
              <text x={-svgHeight / 2} y={12} fill="#94A3B8" fontSize="10" textAnchor="middle" transform="rotate(-90)">
                True Positive Rate (1 - FRR)
              </text>
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 text-center mt-2 font-mono">
            Operating Point at Threshold 0.50: FAR = {metrics.far}% | FRR = {metrics.frr}%
          </div>
        </div>

        {/* Evaluation Summary & Defense Highlights */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-800">
            Research Evaluation Breakdown
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="font-bold text-white block mb-1">1. Impostor Rejection Power (FAR):</span>
              The One-Class SVM with calibrated RBF kernel correctly rejected cross-user impostor timing profiles with a False Acceptance Rate of <strong className="text-emerald-400">{metrics.far}%</strong> across {metrics.total_impostor_windows} evaluation windows.
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="font-bold text-white block mb-1">2. Genuine User Usability (FRR):</span>
              Genuine enrolled typing achieved a low False Rejection Rate of <strong className="text-emerald-400">{metrics.frr}%</strong>, supported by the 15-key threshold gate and 30-second strike decay mechanism.
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="font-bold text-white block mb-1">3. Privacy Compliance:</span>
              100% of benchmark telemetry was extracted and evaluated using non-reversible timing deltas without storing typed text.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
