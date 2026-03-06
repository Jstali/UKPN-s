import React, { useEffect, useRef } from 'react';

const SpotlightCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const syncPointer = (e) => {
      const { clientX: x, clientY: y } = e;
      
      if (cardRef.current) {
        cardRef.current.style.setProperty('--x', x.toFixed(2));
        cardRef.current.style.setProperty('--y', y.toFixed(2));
      }
    };

    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
    >
      <div className="spotlight-inner"></div>
      {children}
    </div>
  );
};

export default SpotlightCard;
