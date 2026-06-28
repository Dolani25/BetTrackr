import React, { useMemo } from 'react';

const WavyProgress = ({ progress = 0, size = "9vh", color = "#e3001b", trackColor = "rgba(0,0,0,0.05)" }) => {
  const numWaves = 10;
  const radius = 42;
  const center = 50;
  const steps = 300; // High resolution for smooth line

  const { pathData, pathLength } = useMemo(() => {
    let dStr = "";
    let len = 0;
    let lx = 0, ly = 0;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      // Irregular but closing wave.
      // 12 and 5 are integers so they perfectly loop around 2*PI
      const r = radius 
        + 2.5 * Math.sin(12 * angle) 
        + 1.5 * Math.cos(5 * angle);
      
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      
      if (i === 0) {
        dStr += `M ${x} ${y} `;
      } else {
        dStr += `L ${x} ${y} `;
        len += Math.sqrt(Math.pow(x - lx, 2) + Math.pow(y - ly, 2));
      }
      lx = x;
      ly = y;
    }
    dStr += " Z";
    return { pathData: dStr, pathLength: len };
  }, [radius]);

  const strokeDashoffset = pathLength - (progress / 100) * pathLength;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" style={{
        transform: 'rotate(-90deg)',
        display: 'block'
      }}>
        {/* Track */}
        <path d={pathData} fill="none" stroke={trackColor} strokeWidth="4" />
        
        {/* Progress */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={color} 
          strokeWidth="4" 
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
        />
      </svg>
    </div>
  );
};

export default WavyProgress;
