import React, { useState, useEffect, useRef } from 'react';

const AnimatedCounter = ({ value }) => {
  const end = parseInt(value) || 0;
  const prevRef = useRef(end);
  const [count, setCount] = useState(end);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // On first mount, just set the value without animation
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setCount(end);
      prevRef.current = end;
      return;
    }

    const prev = prevRef.current;
    const diff = end - prev;
    
    // No change, don't animate
    if (diff === 0) return;

    prevRef.current = end;

    // Animate from previous value to new value
    const duration = 400;
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
