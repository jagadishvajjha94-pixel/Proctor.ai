'use client';

import { useEffect, useState } from 'react';

/**
 * Countdown timer. Calls onEnd when seconds reach 0.
 * No server; client-only state. Scaling: single source of truth in parent for exam end.
 */
export default function Timer({ totalSeconds, onEnd }) {
  const [seconds, setSeconds] = useState(totalSeconds);

  useEffect(() => {
    setSeconds(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onEnd?.();
      return;
    }
    const t = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds, onEnd]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const str = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;

  return (
    <div className="timer" role="timer" aria-live="polite">
      <span className="font-mono text-lg font-bold">{str}</span>
      <style jsx>{`
        .timer {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          background: #1e293b;
          color: #f8fafc;
        }
      `}</style>
    </div>
  );
}
