import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GameNode, Owner } from '../types';
import { COLORS, HEX_SIZE, HOVER_COLORS } from '../constants';
import { User, Shield, Swords, Zap, Crown, Castle, Check, X } from 'lucide-react';

interface NodeProps {
  node: GameNode;
  isSelected: boolean;
  isTargetable: boolean;
  isVisible: boolean;
  incomingStrength: number;
  isAIThinking?: boolean;
  isAttack?: boolean;
  onClick: (id: string) => void;
}

export const Node: React.FC<NodeProps> = ({ node, isSelected, isTargetable, isVisible, incomingStrength, isAIThinking, isAttack, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [bumpScale, setBumpScale] = useState(1);
  const [showRipple, setShowRipple] = useState(false);
  const [isReinforced, setIsReinforced] = useState(false);
  
  const prevStrength = useRef(node.strength);
  const prevOwner = useRef(node.owner);

  // Generate a stable random delay for this node's animations to create a "shimmering" effect for the AI
  const animationDelay = useMemo(() => Math.random() * 2000, []);

  useEffect(() => {
    const strengthChanged = node.strength !== prevStrength.current;
    const ownerChanged = node.owner !== prevOwner.current;

    if (strengthChanged || ownerChanged) {
      const increased = node.strength > prevStrength.current;
      
      // Trigger animations only if visible
      if (isVisible) {
          // Icon Bump
          setBumpScale(1.3);
          const timer = setTimeout(() => {
            setBumpScale(1);
          }, 150);

          // Reinforcement Animation (Same owner, strength increased)
          if (!ownerChanged && increased) {
             setIsReinforced(false);
             // Force reflow for restart
             requestAnimationFrame(() => setIsReinforced(true));
             const t2 = setTimeout(() => setIsReinforced(false), 400); // Match CSS animation duration
          }

          // Ripple Effect (Any increase)
          if (increased) {
            setShowRipple(false); 
            requestAnimationFrame(() => setShowRipple(true));
          }
          
          return () => {
              clearTimeout(timer);
              // We don't clear t2 usually to ensure animation plays out, but in clean up it's fine.
          };
      }
      
      prevStrength.current = node.strength;
      prevOwner.current = node.owner;
    }
  }, [node.strength, node.owner, isVisible]);

  // Combat Prediction Logic
  // Only applies if node is targetable and it is an attack (Enemy or Neutral)
  const canConquer = incomingStrength > node.strength;
  
  // AI Thinking Visualization
  const isAIThinkingNode = isAIThinking && node.owner === Owner.AI && isVisible;

  // Visual Properties for "Fog of War"
  const fill = isVisible 
    ? (isHovered ? HOVER_COLORS[node.owner] : COLORS[node.owner]) 
    : '#1e293b'; // Slate 800 for Fog
  
  const getStroke = () => {
      if (!isVisible) return '#334155'; // Slate 700 for Fog Border
      
      // Combat Prediction Overlay (Attack on Enemy or Neutral)
      if (isHovered && isTargetable && incomingStrength > 0 && isAttack) {
          return canConquer ? '#4ade80' : '#ef4444'; 
      }

      if (isSelected) return 'white';
      if (isTargetable) return 'rgba(255, 255, 255, 0.7)';
      return 'rgba(0,0,0,0.4)';
  };
  
  const stroke = getStroke();
  
  const strokeWidth = (isHovered && isTargetable && incomingStrength > 0 && isAttack) ? 4 : (isSelected ? 4 : isTargetable ? 3 : 2);
  const opacity = isVisible ? 1 : 0.3;
  const cursor = isVisible ? 'pointer' : 'default';

  // Hexagon Geometry (Flat-topped)
  const points = [];
  const size = HEX_SIZE - 2; 
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i;
    const angle_rad = Math.PI / 180 * angle_deg;
    points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
  }
  const pointsString = points.join(' ');

  const getTooltipText = () => {
    if (!isVisible) return "";
    
    let typeLabel = "Node";
    if (node.isCapital) typeLabel = "Capital";
    
    let ownerLabel = "Neutral";
    if (node.owner === Owner.PLAYER) ownerLabel = "Blue";
    if (node.owner === Owner.AI) ownerLabel = "Red";

    const title = `${ownerLabel} ${typeLabel}`;
    
    const income = node.isCapital ? 5 : 1;
    let baseText = `${title}\nStrength: ${node.strength}\n${node.owner !== Owner.NEUTRAL ? `Generates +${income} unit/turn` : "Capture to grow"}`;
    
    // Combat Preview
    if (isHovered && isTargetable && incomingStrength > 0 && isAttack) {
        const result = canConquer ? "VICTORY GUARANTEED" : "ATTACK WILL FAIL";
        const remaining = canConquer ? (incomingStrength - node.strength) : (node.strength - incomingStrength);
        baseText += `\n\n[COMBAT PREVIEW]\n${result}\nResult: ${remaining} units left`;
    }

    return baseText;
  };

  const UnitIcon = () => {
    const props = { size: 20, color: "white", strokeWidth: 2.5, className: "drop-shadow-sm" };
    
    // Capital / Castle Node (Overrides all others)
    if (node.isCapital) {
       return <Castle {...props} fill="rgba(255,255,255,0.3)" />;
    }

    // Tier 5: King (21+ units)
    if (node.strength > 20) {
       return <Crown {...props} fill="rgba(255,255,255,0.3)" />;
    }

    // Tier 4: Strong (16-20 units)
    if (node.strength > 15) {
       return <Zap {...props} fill="rgba(255,255,255,0.3)" />;
    }

    // Tier 3: Elite (11-15 units)
    if (node.strength > 10) {
       return <Swords {...props} fill="rgba(255,255,255,0.3)" />;
    }

    // Tier 2: Heavy (6-10 units)
    if (node.strength > 5) {
       return <Shield {...props} fill="rgba(255,255,255,0.3)" />;
    }

    // Tier 1: Pawn (<= 5 units)
    return <User {...props} fill="rgba(255,255,255,0.3)" />;
  };

  return (
    <g 
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onClick={(e) => {
        if (!isVisible) return;
        e.stopPropagation();
        onClick(node.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
          cursor,
          opacity,
          transition: 'opacity 0.7s ease-in-out, transform 0.2s ease-out' 
      }}
    >
      {isVisible && <title>{getTooltipText()}</title>}

      {/* Ripple Effect (Only if visible) */}
      {showRipple && isVisible && (
        <polygon
            key={`ripple-${node.strength}`} 
            points={pointsString}
            fill="none"
            stroke="white"
            className="animate-ripple pointer-events-none"
        />
      )}

      {/* Outer Glow for selection */}
      {isSelected && isVisible && (
        <polygon
          points={pointsString}
          fill="none"
          stroke="white"
          strokeOpacity={0.5}
          strokeWidth={strokeWidth + 4}
          className="animate-pulse"
        />
      )}

      {/* Main Hexagon Body */}
      <polygon
        points={pointsString}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className={`transition-colors duration-200 ${isReinforced ? 'animate-growth' : (isAIThinkingNode ? 'animate-ai-thinking' : '')}`}
        style={{ animationDelay: isAIThinkingNode ? `${animationDelay}ms` : '0ms' }}
      />

      {/* Soldier Unit (Only show if Visible) */}
      {isVisible && (
          <g 
            transform={`scale(${bumpScale})`} 
            style={{ 
                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                pointerEvents: 'none' 
            }}
          >
            {/* Centered Icon */}
            <g transform="translate(-10, -20)">
                <UnitIcon />
            </g>

            {/* Combat Prediction Icon Overlay (Visible on Attack) */}
            {isHovered && isTargetable && incomingStrength > 0 && isAttack && (
                <g transform="translate(14, -22)" className="animate-pulse">
                   <circle r="9" fill={canConquer ? "#4ade80" : "#ef4444"} stroke="white" strokeWidth="1.5" />
                   <g transform="translate(-6, -6)">
                       {canConquer ? <Check size={12} color="white" strokeWidth={4} /> : <X size={12} color="white" strokeWidth={4} />}
                   </g>
                </g>
            )}

            {/* Strength Count */}
            <text
                y="14"
                textAnchor="middle"
                fill="white"
                fontSize="12px"
                fontWeight="900"
                style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}
            >
                {node.strength}
            </text>
          </g>
      )}
    </g>
  );
};