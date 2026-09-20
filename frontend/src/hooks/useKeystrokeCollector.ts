import { useEffect, useRef, useState, useCallback } from 'react';
import { RawKeyEvent, TelemetryResponse } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useKeystrokeCollector() {
  const { sessionId, user, captureEnabled, handleTelemetryResult, isLocked } = useAuth();
  const [activeWindowKeys, setActiveWindowKeys] = useState<number>(0);
  const [windowIndex, setWindowIndex] = useState<number>(1);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  
  const pendingDownMap = useRef<Map<string, number>>(new Map());
  const completedEvents = useRef<RawKeyEvent[]>([]);
  const windowStartTs = useRef<number>(performance.now());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 🛑 CRITICAL: If capture is disabled (e.g. Step-Up modal open) or locked, IGNORE ALL KEYS
    if (!captureEnabled || isLocked || !sessionId || !user?.has_model) {
      return;
    }

    // Ignore pure modifier presses
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }

    const code = e.code || `Key${e.key.toUpperCase()}`;
    if (!pendingDownMap.current.has(code)) {
      pendingDownMap.current.set(code, performance.now());
    }
  }, [captureEnabled, isLocked, sessionId, user?.has_model]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!captureEnabled || isLocked || !sessionId || !user?.has_model) {
      return;
    }

    const code = e.code || `Key${e.key.toUpperCase()}`;
    const downTs = pendingDownMap.current.get(code);
    
    if (downTs !== undefined) {
      const upTs = performance.now();
      pendingDownMap.current.delete(code);
      
      const evt: RawKeyEvent = {
        key: code,
        down_ts: Math.round(downTs),
        up_ts: Math.round(upTs)
      };

      completedEvents.current.push(evt);
      setActiveWindowKeys(completedEvents.current.length);
    }
  }, [captureEnabled, isLocked, sessionId, user?.has_model]);

  // Flush 5-second active window
  const flushWindow = useCallback(async () => {
    if (!captureEnabled || isLocked || !sessionId || !user?.has_model) {
      return;
    }

    const events = [...completedEvents.current];
    completedEvents.current = [];
    setActiveWindowKeys(0);
    
    const durationMs = Math.round(performance.now() - windowStartTs.current);
    windowStartTs.current = performance.now();

    // 15-Key Gate Check: If < 15 keys, flag as IDLE without sending heavy payload
    if (events.length < 15) {
      setIsIdle(true);
      return;
    }

    setIsIdle(false);
    try {
      const res = await api.sendTelemetryWindow(sessionId, windowIndex, events, durationMs);
      handleTelemetryResult(res);
      setWindowIndex(prev => prev + 1);
    } catch (err) {
      console.error('Telemetry dispatch error:', err);
    }
  }, [captureEnabled, isLocked, sessionId, user?.has_model, windowIndex, handleTelemetryResult]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 5-second continuous flush interval
    const interval = setInterval(() => {
      flushWindow();
    }, 5000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
    };
  }, [handleKeyDown, handleKeyUp, flushWindow]);

  return {
    activeWindowKeys,
    isIdle,
    windowIndex
  };
}
