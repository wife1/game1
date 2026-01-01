import React, { useEffect, useState, useRef } from 'react';
import { Point, Owner } from '../types';
import { COLORS } from '../constants';
import { User, Shield, Swords, Zap, Crown } from 'lucide-react';

interface MovingUnitProps {
  id: string;
  start: Point;
  end: Point;
  count: number;
  owner: Owner;
  onComplete: (id: string) => void;
}

export const MovingUnit: React.FC<MovingUnitProps> = ({ id, start, end, count, owner, onComplete }) => {
  const [position, setPosition] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);
  const completedRef = useRef(false);

  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(id);
  };

  useEffect(() => {
    // Trigger animation in the next frame to ensure the browser registers the start position
    const animFrame = requestAnimationFrame(() => {
      setHasStarted(true);
      setPosition(end);
    });

    // Safety fallback: Ensure onComplete is called even if transitionEnd fails
    const timer = setTimeout(handleComplete, 600); // 500ms duration + 100ms buffer

    // Clean up animation frame if unmounted quickly
    return () => {
        cancelAnimationFrame(animFrame);
        clearTimeout(timer);
    };
  }, [end]);

  const duration = 500; // ms

  const getUnitIcon = () => {
    const iconProps = { size: 14, color: "white", strokeWidth: 3 };
    
    // Tier 5: King (21+ units)
    if (count > 20) return <Crown {...iconProps} />;
    
    // Tier 4: Strong (16-20 units)
    if (count > 15) return <Zap {...iconProps} />;

    // Tier 3: Elite (11-15 units)
    if (count > 10) return <Swords {...iconProps} />;

    // Tier 2: Heavy (6-10 units)
    if (count > 5) return <Shield {...iconProps} />;

    // Tier 1: Pawn (<= 5 units)
    return <User {...iconProps} />;
  };

  return (
    <g
      className="pointer-events-none"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: hasStarted ? `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
      }}
      onTransitionEnd={handleComplete}
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
  );
};