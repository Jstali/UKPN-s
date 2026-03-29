import React, { useState, useEffect, useRef } from 'react';

const AnimatedCounter = ({ value }) => {
  const end = parseInt(value) || 0;
  const prevRef = useRef(null);
  const [count, setCount] = useState(end);

  useEffect(() => {
    const prev = prevRef.current ?? end;
    prevRef.current = end;

    // Only animate on first mount (prev === end) or when value increases/decreases
    // Use a short animation (400ms) so it doesn't feel like "running"
    const duration = 400;
    const diff = end - prev;
    if (diff === 0) return;

    const increment = diff / (duration / 16);
    let current = prev;

    const timer = setInterval(() => {
      current += increment;
      const done = diff > 0 ? current >= end : current <= end;
      if (done) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [end]);

  return <span>{count}</span>;
};

export default AnimatedCounter;
