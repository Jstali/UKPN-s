import React, { useEffect, useRef } from 'react';
import './ClickSpark.css';

const ClickSpark = ({ 
  children, 
  sparkColor = '#fff', 
  sparkSize = 10, 
  sparkRadius = 15, 
  sparkCount = 8,
  duration = 400 
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Create sparks
      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'click-spark';
        
        const angle = (360 / sparkCount) * i;
        const radian = (angle * Math.PI) / 180;
        const endX = x + Math.cos(radian) * sparkRadius;
        const endY = y + Math.sin(radian) * sparkRadius;

        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        spark.style.width = `${sparkSize}px`;
        spark.style.height = `${sparkSize}px`;
        spark.style.background = sparkColor;
        spark.style.setProperty('--end-x', `${endX - x}px`);
        spark.style.setProperty('--end-y', `${endY - y}px`);
        spark.style.animationDuration = `${duration}ms`;

        container.appendChild(spark);

        // Remove spark after animation
        setTimeout(() => {
          spark.remove();
        }, duration);
      }
    };

    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

  return (
    <div ref={containerRef} className="click-spark-container">
      {children}
    </div>
  );
};

export default ClickSpark;
