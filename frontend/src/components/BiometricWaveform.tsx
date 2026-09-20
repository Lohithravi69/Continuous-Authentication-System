import React, { useEffect, useRef } from 'react';
import { Activity, Shield, Wifi } from 'lucide-react';

interface BiometricWaveformProps {
  activeKeys: number;
  riskScore: number;
  state: 'GREEN' | 'YELLOW' | 'RED';
}

export const BiometricWaveform: React.FC<BiometricWaveformProps> = ({
  activeKeys,
  riskScore,
  state
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      // Determine wave color & intensity based on state
      let strokeColor = '#10B981'; // Emerald (Green)
      let glowColor = 'rgba(16, 185, 129, 0.4)';
      let frequency = 0.04;
      let amplitude = 12 + Math.min(25, activeKeys * 2.5);

      if (state === 'YELLOW') {
        strokeColor = '#F59E0B'; // Amber
        glowColor = 'rgba(245, 158, 11, 0.4)';
        frequency = 0.07;
        amplitude = 20 + Math.min(25, activeKeys * 3);
      } else if (state === 'RED') {
        strokeColor = '#EF4444'; // Rose
        glowColor = 'rgba(239, 68, 68, 0.5)';
        frequency = 0.12;
        amplitude = 28;
      }

      // Draw background ambient grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 10; y < height; y += 15) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let x = 10; x < width; x += 25) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Draw glowing oscilloscope rhythm line
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = strokeColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;

      for (let x = 0; x < width; x++) {
        // Compose subtle multi-frequency wave + heartbeat spike when keys are active
        const baseSine = Math.sin(x * frequency + phase);
        const harmonic = Math.sin(x * frequency * 2.2 - phase * 1.5) * 0.4;
        
        // Spike simulation at keystroke rhythm interval
        const spikeMod = Math.exp(-Math.pow((((x + phase * 40) % (width / 2)) - (width / 4)) / 20, 2)) * 18;
        
        const y = centerY + (baseSine + harmonic) * amplitude - (activeKeys > 0 ? spikeMod : 0);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Scanline cursor point
      const cursorX = (phase * 60) % width;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cursorX, centerY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      phase += 0.04 + (state === 'RED' ? 0.04 : 0.01);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeKeys, riskScore, state]);

  return (
    <div className="ultra-glass rounded-2xl p-4 border border-slate-800/90 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Live Biometric Rhythm Waveform
          </span>
        </div>
        
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Stream: <strong>{activeKeys > 0 ? 'Active Pulse' : 'Idle'}</strong></span>
        </div>
      </div>

      <div className="relative w-full h-24 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          width={600}
          height={96}
          className="w-full h-full block"
        />
        
        {/* Real-time stats overlay */}
        <div className="absolute bottom-2 right-3 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/60 backdrop-blur-sm">
          Freq: {(24 + activeKeys * 4).toFixed(0)} Hz | Var: {(0.012 + riskScore * 0.05).toFixed(3)}
        </div>
      </div>
    </div>
  );
};
