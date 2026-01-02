import React, { useEffect, useState, useRef } from 'react';
import { Point, Owner } from '../types';
import { COLORS } from '../constants';
import { User, Shield, Swords, Zap, Crown } from 'lucide-react';

interface MovingUnitProps {
  id: string;
  path: Point[];
  count: number;
  owner: Owner;
  onComplete: (id: string) => void;
}

export const MovingUnit: React.FC<MovingUnitProps> = ({ id, path, count, owner, onComplete }) => {
  const [position, setPosition] = useState(path[0]);
  const startTimeRef = useRef<number | null>(null);
  const reqRef = useRef<number | null>(null);
  
  // Total duration based on path length (hops)
  // 500ms per hop, max 2000ms
  const segmentDuration = 400;
  const totalDuration = Math.min((path.length - 1) * segmentDuration, 2000); 

  useEffect(() => {
    const animate = (time: number) => {
        if (!startTimeRef.current) startTimeRef.current = time;
        const elapsed = time - startTimeRef.current;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        // Calculate current position along polyline
        // Total segments = path.length - 1
        const totalSegments = path.length - 1;
        
        if (totalSegments > 0) {
            // Which segment are we on?
            const currentSegmentFloat = progress * totalSegments;
            const segmentIndex = Math.min(Math.floor(currentSegmentFloat), totalSegments - 1);
            const segmentProgress = currentSegmentFloat - segmentIndex;
            
            const p1 = path[segmentIndex];
            const p2 = path[segmentIndex + 1];
            
            const newX = p1.x + (p2.x - p1.x) * segmentProgress;
            const newY = p1.y + (p2.y - p1.y) * segmentProgress;
            
            setPosition({ x: newX, y: newY });
        }

        if (progress < 1) {
            reqRef.current = requestAnimationFrame(animate);
        } else {
            onComplete(id);
        }
    };

    reqRef.current = requestAnimationFrame(animate);

    return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [path, totalDuration, id, onComplete]);

  const getUnitIcon = () => {
    const iconProps = { size: 14, color: "white", strokeWidth: 3 };
    if (count > 20) return <Crown {...iconProps} />;
    if (count > 15) return <Zap {...iconProps} />;
    if (count > 10) return <Swords {...iconProps} />;
    if (count > 5) return <Shield {...iconProps} />;
    return <User {...iconProps} />;
  };

  // Generate Path Line points string
  const polylinePoints = path.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <g className="pointer-events-none">
      {/* Visual Path Trail */}
      <polyline 
        points={polylinePoints}
        fill="none"
        stroke={COLORS[owner]}
        strokeWidth={2}
        strokeDasharray="4 4"
        opacity={0.6}
      />
      
      {/* Markers for Intermediate Points (excluding start/end to avoid clutter under unit/target) */}
      {path.slice(1, -1).map((p, i) => (
          <circle 
            key={i}
            cx={p.x} 
            cy={p.y} 
            r={3} 
            fill={COLORS[owner]} 
            opacity={0.5} 
          />
      ))}

      {/* The Moving Unit */}
      <g
        transform={`translate(${position.x}, ${position.y})`}
        style={{ willChange: 'transform' }}
      >
        {/* Outer Glow / Background Circle */}
        <circle 
          r={14} 
          fill={COLORS[owner]} 
          stroke="white" 
          strokeWidth={1.5} 
          className="drop-shadow-lg"
        />
        
        {/* Unit Icon Centered */}
        <g transform="translate(-7, -7)">
          {getUnitIcon()}
        </g>
        
        {/* Unit Count Badge (Top Right) */}
        <g transform="translate(8, -8)">
          <circle r={7} fill="#1e293b" stroke={COLORS[owner]} strokeWidth={1} />
          <text
            y={2.5}
            textAnchor="middle"
            fill="white"
            fontSize="9px"
            fontWeight="bold"
          >
            {count}
          </text>
        </g>
      </g>
    </g>
  );
};
