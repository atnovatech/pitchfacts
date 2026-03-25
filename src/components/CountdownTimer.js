import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ targetDate, compact = false }) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ started: true });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.started) return <span style={{ color: '#00c851', fontSize: '12px' }}>● Live</span>;

  if (compact) {
    return (
      <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="countdown">
      {timeLeft.days > 0 && (
        <>
          <div className="countdown-unit">
            <div className="num">{timeLeft.days}</div>
            <div className="label">days</div>
          </div>
          <span className="countdown-sep">:</span>
        </>
      )}
      <div className="countdown-unit">
        <div className="num">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="label">hrs</div>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-unit">
        <div className="num">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="label">min</div>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-unit">
        <div className="num">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="label">sec</div>
      </div>
    </div>
  );
}