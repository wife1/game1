import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, RotateCcw, BrainCircuit, User, ArrowRight, RefreshCw, Undo, X, Check, HelpCircle, Settings, Shield, Sword, Scale, ZoomIn, ZoomOut, Maximize, Save, Download, Trash2, Hexagon } from 'lucide-react';
import { GameState, GameNode, Owner, GameEdge, Point } from './types';
import { generateMap, processTurnIncome, departNode, arriveNode, getVisibleNodeIds } from './utils/gameLogic';
import { getAIMoves } from './services/geminiService';
import { Node } from './components/Node';
import { MovingUnit } from './components/MovingUnit';
import { Tooltip } from './components/Tooltip';
import { TutorialModal } from './components/TutorialModal';
import { SettingsModal } from './components/SettingsModal';
import { MAP_WIDTH, MAP_HEIGHT, COLORS } from './constants';
import { soundManager } from './utils/soundManager';

interface MovingUnitState {
  id: string;
  start: Point;
  end: Point;
  count: number;
  owner: Owner;
  targetId: string;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const SAVE_KEY = 'konquest_save_data';

const App: React.FC = () => {
  // --- State ---
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false);
  const [movingUnits, setMovingUnits] = useState<MovingUnitState[]>([]);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [fogRadius, setFogRadius] = useState(1);
  const [hasSave, setHasSave] = useState(false);
  
  // AI Settings
  const [difficulty, setDifficulty] = useState(1); // 0.5 to 2.0
  const [aggression, setAggression] = useState<'cautious' | 'balanced' | 'aggressive'>('balanced');

  // Zoom & Pan State
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const isPanning = useRef(false); // Distinguish click vs drag
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);

  // --- Initialization ---
  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
    }
    // Check for save on mount
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) setHasSave(true);

    // Initial start, using default difficulty 1
    startLevel(1, 1);
  }, []);

  // Check save availability when settings open
  useEffect(() => {
    if (showSettings) {
        setHasSave(!!localStorage.getItem(SAVE_KEY));
    }
  }, [showSettings]);

  // Wrapper to start level with specific params
  const startLevel = (lvl: number, diff: number) => {
    const { nodes, edges } = generateMap(lvl, diff);
    setGameState({
      nodes,
      edges,
      turn: 1,
      isPlayerTurn: true,
      isGameOver: false,
      winner: null,
      logs: [`Level ${lvl} started. Good luck!`]
    });
    setHistory([]);
    setSelectedNodeId(null);
    setIsProcessingAI(false);
    setUndoConfirmOpen(false);
    setMovingUnits([]);
    setTransform({ x: 0, y: 0, scale: 1 }); // Reset zoom
  };

  const handleNextLevel = () => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    startLevel(nextLevel, difficulty);
  };

  const handleRetryLevel = () => {
    startLevel(level, difficulty);
  };

  // --- Save / Load Logic ---
  const handleSaveGame = () => {
      if (!gameState) return;
      
      // Prevent saving during AI turn or processing
      if (isProcessingAI || !gameState.isPlayerTurn) {
         addLog("Cannot save during AI turn.");
         return;
      }

      const saveData = {
          level,
          gameState,
          difficulty,
          aggression,
          fogEnabled,
          fogRadius,
          timestamp: Date.now()
      };
      try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
          setHasSave(true);
          addLog("Game saved successfully.");
          soundManager.playSelect();
      } catch (e) {
          console.error("Save failed", e);
          addLog("Failed to save game.");
      }
  };

  const handleLoadGame = () => {
      // Prevent loading during AI turn to avoid state inconsistencies
      if (isProcessingAI || (gameState && !gameState.isPlayerTurn)) {
         addLog("Cannot load during AI turn.");
         return;
      }

      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return;
      
      try {
          const data = JSON.parse(saved);
          if (data.gameState && data.level) {
            setLevel(data.level);
            setDifficulty(data.difficulty ?? 1);
            setAggression(data.aggression ?? 'balanced');
            setFogEnabled(data.fogEnabled ?? true);
            setFogRadius(data.fogRadius ?? 1);
            setGameState(data.gameState);
            setHistory([]);
            setMovingUnits([]);
            setSelectedNodeId(null);
            // Reset view or keep? Let's reset to be safe
            setTransform({ x: 0, y: 0, scale: 1 });
            
            addLog("Game loaded successfully.");
            soundManager.playSelect();
            setShowSettings(false);
          }
      } catch (e) {
          console.error("Load failed", e);
          addLog("Failed to load save file.");
      }
  };

  const handleClearSave = () => {
      localStorage.removeItem(SAVE_KEY);
      setHasSave(false);
      soundManager.playSelect(); // repurpose generic click sound
  };


  // --- Helpers ---
  const addLog = (msg: string) => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, logs: [msg, ...prev.logs].slice(0, 5) };
    });
  };

  const getConnectedNodeIds = useCallback((nodeId: string): string[] => {
    if (!gameState) return [];
    return gameState.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => (e.source === nodeId ? e.target : e.source));
  }, [gameState]);

  // Calculate Fog of War visibility based on settings
  const visibleNodeIds = useMemo(() => {
    if (!gameState) return new Set<string>();
    return getVisibleNodeIds(gameState.nodes, gameState.edges, fogEnabled, fogRadius);
  }, [gameState?.nodes, gameState?.edges, fogEnabled, fogRadius]);

  // --- Zoom & Pan Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const scaleFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(Math.max(transform.scale * (direction > 0 ? scaleFactor : 1 / scaleFactor), 0.5), 4);

    // Calculate mouse position relative to SVG viewbox
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // Transform screen coordinate to SVG coordinate (0..800, 0..600 space)
    const cursor = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());

    // Zoom towards cursor: P_new = P_mouse - (P_mouse - P_old) * (scale_new / scale_old)
    const newX = cursor.x - (cursor.x - transform.x) * (newScale / transform.scale);
    const newY = cursor.y - (cursor.y - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const startPan = (clientX: number, clientY: number) => {
    isDragging.current = true;
    isPanning.current = false;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const movePan = (clientX: number, clientY: number) => {
    if (!isDragging.current || !lastMousePos.current || !svgRef.current) return;

    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;

    const dx = clientX - lastMousePos.current.x;
    const dy = clientY - lastMousePos.current.y;

    // Convert screen pixel delta to SVG unit delta
    const svgDx = dx / ctm.a;
    const svgDy = dy / ctm.d;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      isPanning.current = true;
    }

    setTransform(prev => ({
      ...prev,
      x: prev.x + svgDx,
      y: prev.y + svgDy
    }));

    lastMousePos.current = { x: clientX, y: clientY };
  };

  const endPan = () => {
    isDragging.current = false;
    lastMousePos.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Left click on background
    if (e.button === 0 || e.button === 1) {
        startPan(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      movePan(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          startPan(e.touches[0].clientX, e.touches[0].clientY);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          movePan(e.touches[0].clientX, e.touches[0].clientY);
      }
  };

  const handleZoomIn = () => {
      setTransform(prev => ({
          ...prev,
          scale: Math.min(prev.scale * 1.2, 4),
          x: prev.x - (MAP_WIDTH / 2 - prev.x) * 0.2, // Zoom towards center
          y: prev.y - (MAP_HEIGHT / 2 - prev.y) * 0.2
      }));
  };

  const handleZoomOut = () => {
      setTransform(prev => ({
          ...prev,
          scale: Math.max(prev.scale / 1.2, 0.5),
          x: prev.x + (MAP_WIDTH / 2 - prev.x) * (1 - 1/1.2), // Zoom away from center
          y: prev.y + (MAP_HEIGHT / 2 - prev.y) * (1 - 1/1.2)
      }));
  };

  const handleResetView = () => {
      setTransform({ x: 0, y: 0, scale: 1 });
  };


  // --- Interaction Handlers ---
  const handleNodeClick = (clickedId: string) => {
    // If we were dragging/panning, do not process the click
    if (isPanning.current) {
        isPanning.current = false;
        return;
    }

    if (!gameState || !gameState.isPlayerTurn || gameState.isGameOver || isProcessingAI) return;

    // Can only click visible nodes
    if (!visibleNodeIds.has(clickedId)) return;

    const clickedNode = gameState.nodes.find(n => n.id === clickedId);
    if (!clickedNode) return;

    if (selectedNodeId) {
      if (selectedNodeId === clickedId) {
        setSelectedNodeId(null);
        return;
      }

      const connectedIds = getConnectedNodeIds(selectedNodeId);
      if (connectedIds.includes(clickedId)) {
        const sourceNode = gameState.nodes.find(n => n.id === selectedNodeId);
        
        if (sourceNode && sourceNode.strength > 1) {
            // Save state to history before executing move
            setHistory(prev => [...prev, gameState]);
            setUndoConfirmOpen(false);
            
            // 1. Depart Source (Immediate update)
            const { newNodes, movingUnit } = departNode(gameState.nodes, selectedNodeId);
            
            if (movingUnit) {
                soundManager.playSelect(); // Departure sound
                
                // Update game state to show reduced strength at source
                setGameState(prev => {
                    if (!prev) return null;
                    return { ...prev, nodes: newNodes };
                });

                // 2. Spawn Visual Unit
                const newUnitId = Math.random().toString(36).substr(2, 9);
                setMovingUnits(prev => [...prev, {
                    id: newUnitId,
                    start: sourceNode.position,
                    end: clickedNode.position,
                    count: movingUnit.count,
                    owner: movingUnit.owner,
                    targetId: clickedId
                }]);
            }
        }
        
        setSelectedNodeId(null);
        return;
      }

      if (clickedNode.owner === Owner.PLAYER) {
        setSelectedNodeId(clickedId);
        soundManager.playSelect();
        return;
      }
    } else {
      if (clickedNode.owner === Owner.PLAYER) {
        setSelectedNodeId(clickedId);
        soundManager.playSelect();
      }
    }
  };

  const handleUnitArrival = (unitId: string) => {
     // Find the unit state to get details
     const unitState = movingUnits.find(u => u.id === unitId);
     if (!unitState) return;

     // Remove from visual list
     setMovingUnits(prev => prev.filter(u => u.id !== unitId));

     // Apply arrival logic to game state
     setGameState(prev => {
         if (!prev) return null;
         
         const { newNodes, log, moveType } = arriveNode(prev.nodes, unitState.targetId, {
             count: unitState.count,
             owner: unitState.owner
         });

         // Check if this arrival makes any noise (only if affecting visible nodes?)
         // We'll play sound anyway for feedback, or could restrict to visibility
         if (visibleNodeIds.has(unitState.targetId)) {
             if (moveType === 'CAPTURE') soundManager.playCapture();
             else if (moveType === 'ATTACK') soundManager.playAttack();
             else if (moveType === 'REINFORCE') soundManager.playReinforce();
         }

         // Check Win Condition
         const playerNodes = newNodes.filter(n => n.owner === Owner.PLAYER);
         const aiNodes = newNodes.filter(n => n.owner === Owner.AI);
         
         let winner = prev.winner;
         let isGameOver = prev.isGameOver;
         const finalLogs = log ? [log] : [];

         // 1. Capital Capture Check (Instant Win/Loss)
         if (!isGameOver && moveType === 'CAPTURE') {
             const targetNode = newNodes.find(n => n.id === unitState.targetId);
             if (targetNode?.isCapital) {
                 if (targetNode.owner === Owner.PLAYER) {
                     winner = Owner.PLAYER;
                     isGameOver = true;
                     finalLogs.unshift("Enemy Capital Captured! VICTORY!");
                     soundManager.playWin();
                 } else if (targetNode.owner === Owner.AI) {
                     winner = Owner.AI;
                     isGameOver = true;
                     finalLogs.unshift("Capital Lost! DEFEAT.");
                     soundManager.playLose();
                 }
             }
         }

         // 2. Annihilation Check
         if (!isGameOver) {
             if (playerNodes.length === 0) {
                winner = Owner.AI;
                isGameOver = true;
                soundManager.playLose();
             } else if (aiNodes.length === 0) {
                winner = Owner.PLAYER;
                isGameOver = true;
                soundManager.playWin();
             }
         }

         return {
             ...prev,
             nodes: newNodes,
             logs: [...finalLogs, ...prev.logs].slice(0, 5),
             winner,
             isGameOver
         };
     });
  };

  const handleUndoRequest = () => {
    soundManager.playSelect();
    setUndoConfirmOpen(true);
  };

  const handleConfirmUndo = () => {
    if (history.length === 0) return;
    soundManager.playUndo();
    const previousState = history[history.length - 1];
    setGameState(previousState);
    setHistory(prev => prev.slice(0, -1));
    setUndoConfirmOpen(false);
    setSelectedNodeId(null);
    setMovingUnits([]); // Clear any moving units on undo
  };

  const handleCancelUndo = () => {
    soundManager.playSelect();
    setUndoConfirmOpen(false);
  };

  const handleEndTurn = async () => {
    if (!gameState || gameState.isGameOver) return;
    
    soundManager.playTurnStart();

    // Clear history on turn end
    setHistory([]);
    setUndoConfirmOpen(false);
    setSelectedNodeId(null);

    // 1. Player Income
    const nodesAfterPlayerIncome = processTurnIncome(gameState.nodes);
    
    setGameState(prev => {
        if (!prev) return null;
        return {
            ...prev,
            nodes: nodesAfterPlayerIncome,
            isPlayerTurn: false
        };
    });

    // 2. AI Turn
    setIsProcessingAI(true);
    
    setTimeout(async () => {
        try {
            const aiMoves = await getAIMoves(nodesAfterPlayerIncome, gameState.edges, aggression, difficulty);
            
            // We use a local reference to nodes to calculate sequential moves for the AI's internal logic,
            // but we update the visual state (setGameState) incrementally to show the animations.
            let currentNodes = [...nodesAfterPlayerIncome];
            
            for (const move of aiMoves) {
                // Find current positions from the latest state (or local copy)
                const sourceNode = currentNodes.find(n => n.id === move.fromId);
                const targetNode = currentNodes.find(n => n.id === move.toId);
                
                if (sourceNode && targetNode && sourceNode.owner === Owner.AI && sourceNode.strength > 1) {
                     // 2a. Depart
                     const { newNodes, movingUnit } = departNode(currentNodes, move.fromId);
                     currentNodes = newNodes; // Update local tracker
                     
                     if (movingUnit) {
                         // Update Visual State for Departure
                         setGameState(prev => {
                             if (!prev) return null;
                             // We must find the node in the previous state and update it to match currentNodes
                             // This ensures the UI shows the strength drop
                             const updatedNodes = prev.nodes.map(n => 
                                 n.id === move.fromId ? { ...n, strength: 1 } : n
                             );
                             return { ...prev, nodes: updatedNodes };
                         });

                         // Spawn Visual Unit
                         const newUnitId = Math.random().toString(36).substr(2, 9);
                         setMovingUnits(prev => [...prev, {
                             id: newUnitId,
                             start: sourceNode.position,
                             end: targetNode.position,
                             count: movingUnit.count,
                             owner: movingUnit.owner,
                             targetId: move.toId
                         }]);

                         // Wait for animation (roughly)
                         await new Promise(resolve => setTimeout(resolve, 500));
                         
                         // Note: The handleUnitArrival callback will fire automatically via the MovingUnit component onTransitionEnd.
                         // However, for the AI loop to 'wait' for the result before making the NEXT decision (if it were smarter),
                         // we pause here. Since `getAIMoves` returns all moves at once, the order is pre-determined.
                         // But we still update `currentNodes` locally to ensure `departNode` checks are valid for subsequent moves.
                         
                         // Simulating arrival update on local `currentNodes` so next loop iteration is correct
                         const { newNodes: nodesAfterArrival } = arriveNode(currentNodes, move.toId, movingUnit);
                         currentNodes = nodesAfterArrival;
                     }
                }
            }
            
            // Wait for last animations to likely finish
            await new Promise(resolve => setTimeout(resolve, 200));

            // 3. AI Income & Turn End
            // We process income on the FINAL state of the nodes
            const nodesAfterAIIncome = processTurnIncome(currentNodes);
            
            setGameState(prev => {
                if (!prev) return null;

                const playerNodes = nodesAfterAIIncome.filter(n => n.owner === Owner.PLAYER);
                const aiNodes = nodesAfterAIIncome.filter(n => n.owner === Owner.AI);
                
                let winner = null;
                let isGameOver = false;

                if (playerNodes.length === 0) {
                    winner = Owner.AI;
                    isGameOver = true;
                } else if (aiNodes.length === 0) {
                    winner = Owner.PLAYER;
                    isGameOver = true;
                }

                if (winner === Owner.PLAYER) soundManager.playWin();
                if (winner === Owner.AI) soundManager.playLose();

                return {
                    ...prev,
                    nodes: nodesAfterAIIncome, // Sync final state
                    turn: prev.turn + 1,
                    isPlayerTurn: true,
                    isGameOver,
                    winner,
                    logs: ["AI completed turn.", ...prev.logs].slice(0, 5)
                };
            });

        } catch (e) {
            console.error("AI Error", e);
            addLog("AI malfunctioned (API Error). Skipping AI turn.");
             setGameState(prev => {
                if (!prev) return null;
                return { ...prev, isPlayerTurn: true, turn: prev.turn + 1 };
            });
        } finally {
            setIsProcessingAI(false);
            soundManager.playTurnStart();
        }
    }, 500);
  };

  if (apiKeyMissing) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-red-500 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">API Key Missing</h1>
          <p className="mb-4">This game requires a Gemini API key to power the opponent.</p>
          <p className="text-sm text-slate-400">Please ensure <code className="bg-slate-900 p-1 rounded">process.env.API_KEY</code> is set in your environment.</p>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="text-white">Loading...</div>;

  const playerStrength = gameState.nodes.filter(n => n.owner === Owner.PLAYER).reduce((a, b) => a + b.strength, 0);
  const aiStrength = gameState.nodes.filter(n => n.owner === Owner.AI && visibleNodeIds.has(n.id)).reduce((a, b) => a + b.strength, 0); // Only count visible AI strength
  
  const playerNodeCount = gameState.nodes.filter(n => n.owner === Owner.PLAYER).length;
  const aiNodeCount = gameState.nodes.filter(n => n.owner === Owner.AI && visibleNodeIds.has(n.id)).length; // Only count visible AI nodes

  const getAggressionIcon = () => {
      switch(aggression) {
          case 'cautious': return <Shield size={14} className="text-emerald-400" />;
          case 'aggressive': return <Sword size={14} className="text-orange-400" />;
          default: return <Scale size={14} className="text-yellow-400" />;
      }
  };
  
  // Calculate selected node strength once for the render loop
  const selectedNode = selectedNodeId ? gameState.nodes.find(n => n.id === selectedNodeId) : null;
  const incomingStrength = selectedNode ? Math.max(0, selectedNode.strength - 1) : 0;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
        
        {/* === Game Viewport (Expands to fill available space) === */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden w-full h-full">
            
            {/* Top Left: Level Info & Stats Counters */}
            <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-auto items-start">
                 
                 {/* Level Info */}
                 <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50 shadow-xl mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Level</span>
                    <span className="text-xl font-black text-white leading-none">{level}</span>
                 </div>

                 {/* Player Stat */}
                <div className="flex items-center gap-3 bg-slate-900/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/50 shadow-xl min-w-[180px]">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 shrink-0"><User size={20} /></div>
                    <div>
                         <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Player</div>
                         <div className="text-lg font-bold leading-none text-slate-200">{playerStrength} <span className="text-sm font-normal text-slate-500">units</span></div>
                         <div className="text-xs text-slate-500">{playerNodeCount} nodes</div>
                    </div>
                </div>

                 {/* AI Stat */}
                <div className="flex items-center gap-3 bg-slate-900/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/50 shadow-xl min-w-[180px]">
                    <div className={`p-2 bg-red-500/20 rounded-lg text-red-400 shrink-0 transition-colors ${isProcessingAI ? 'bg-red-500/40 animate-pulse' : ''}`}>
                         <BrainCircuit size={20} className={isProcessingAI ? "animate-spin-slow" : ""} />
                    </div>
                    <div>
                         <div className="flex items-center gap-2">
                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">HEX AI</div>
                            <div className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 flex items-center gap-1">
                                {getAggressionIcon()}
                            </div>
                         </div>
                         <div className="text-lg font-bold leading-none text-slate-200">{aiStrength} <span className="text-sm font-normal text-slate-500">units</span></div>
                         <div className="text-xs text-slate-500">{aiNodeCount} nodes</div>
                    </div>
                </div>
            </div>

            {/* Top Center Info: Turn Indicator Only */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
                 {/* Turn Indicator */}
                 <div className="bg-slate-800/90 backdrop-blur border border-slate-700 px-6 py-2 rounded-full shadow-lg text-sm font-bold text-slate-200 flex items-center gap-3">
                     {gameState.isPlayerTurn ? (
                        <> <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> <span>PLAYER TURN</span> </>
                     ) : (
                        <> <div className={`w-2.5 h-2.5 rounded-full bg-red-500 ${isProcessingAI ? 'animate-pulse' : ''} shadow-[0_0_8px_rgba(239,68,68,0.5)]`} /> 
                           <span>{isProcessingAI ? "AI THINKING..." : "AI TURN"}</span> </>
                     )}
                 </div>
            </div>

            {/* Top Right Controls: Menu & Zoom */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 pointer-events-auto z-30">
                
                {/* Menu Buttons (Moved from bottom) */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl flex flex-col">
                     <Tooltip content="Settings" position="left" className="w-full">
                        <button onClick={() => setShowSettings(true)} className="w-full p-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-b border-slate-700/50 rounded-t-xl"><Settings size={18} /></button>
                     </Tooltip>
                     <Tooltip content="Tutorial" position="left" className="w-full">
                        <button onClick={() => setShowTutorial(true)} className="w-full p-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors rounded-b-xl"><HelpCircle size={18} /></button>
                     </Tooltip>
                </div>

                {/* Zoom Controls */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl flex flex-col overflow-hidden">
                    <button onClick={handleZoomIn} className="p-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-b border-slate-700/50"><ZoomIn size={18} /></button>
                    <button onClick={handleZoomOut} className="p-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-b border-slate-700/50"><ZoomOut size={18} /></button>
                    <button onClick={handleResetView} className="p-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Maximize size={18} /></button>
                </div>
            </div>

            {/* The Map (SVG) */}
             <svg 
                ref={svgRef}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                preserveAspectRatio="xMidYMid slice" 
                className="w-full h-full block cursor-move touch-none"
                onClick={() => setSelectedNodeId(null)}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endPan}
                onMouseLeave={endPan}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={endPan}
            >
                <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="1" fill="#475569" fillOpacity="0.3" />
                    </pattern>
                </defs>

                {/* Background with Pattern - scales with zoom */}
                <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" 
                    transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`} 
                />

                {/* Content Group with Zoom/Pan Transform */}
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                    
                    {/* Edges are implicit in Hex Grid, so we only render Nodes */}
                    {gameState.nodes.map(node => {
                    const isVisible = visibleNodeIds.has(node.id);
                    // Check if node is a valid target AND if the source has enough strength to actually move
                    const isTargetable = !!(selectedNode && selectedNode.strength > 1 && 
                        selectedNodeId !== node.id && 
                        getConnectedNodeIds(selectedNodeId).includes(node.id));

                    return (
                        <Node
                            key={node.id}
                            node={node}
                            isSelected={selectedNodeId === node.id}
                            isTargetable={isTargetable}
                            isVisible={isVisible}
                            incomingStrength={incomingStrength}
                            onClick={handleNodeClick}
                            isAIThinking={isProcessingAI}
                        />
                    );
                    })}
                    
                    {/* Moving Units Layer (Rendered on top) */}
                    {movingUnits.map(unit => {
                        const isEndVisible = visibleNodeIds.has(unit.targetId);
                        const shouldRender = unit.owner === Owner.PLAYER || isEndVisible;
                        
                        if (!shouldRender) return null;

                        return (
                            <MovingUnit
                                key={unit.id}
                                {...unit}
                                onComplete={handleUnitArrival}
                            />
                        );
                    })}
                </g>
            </svg>
            
            {/* Toast / Level Overlay */}
            {gameState.turn === 1 && !gameState.isGameOver && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-[fadeOut_2s_ease-in-out_forwards] z-20">
                    <div className="text-6xl md:text-8xl font-black text-white/5 select-none whitespace-nowrap tracking-tighter">LEVEL {level}</div>
                </div>
            )}
            
            {/* Game Over Overlay (Centered) */}
             {gameState.isGameOver && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95">
                        <div className={`text-3xl font-black uppercase tracking-wider ${gameState.winner === Owner.PLAYER ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
                             {gameState.winner === Owner.PLAYER ? "Victory!" : "Defeated"}
                        </div>
                        <p className="text-slate-400">
                            {gameState.winner === Owner.PLAYER ? "Enemy capital captured. The region is yours." : "Your capital has fallen."}
                        </p>
                         {gameState.winner === Owner.PLAYER ? (
                            <button onClick={handleNextLevel} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
                                Next Level <ArrowRight size={20} />
                            </button>
                        ) : (
                            <button onClick={handleRetryLevel} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2">
                                <RotateCcw size={20} /> Retry Level
                            </button>
                        )}
                    </div>
                </div>
             )}
             
             <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-500/50 select-none pointer-events-none">
                 Scroll to Zoom • Drag to Pan • Left Click to Move
             </div>
        </div>


        {/* === Bottom Bar (HUD) === */}
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-3 md:p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40">
             <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                
                {/* Left Section: Brand (Icon) */}
                <div className="flex items-center gap-4 shrink-0">
                     <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                        <Hexagon size={24} className="text-white fill-current" />
                    </div>
                </div>

                {/* Center Section: Logs (Hidden on small, block on lg+) */}
                <div className="hidden lg:block flex-1 px-8">
                    <div className="h-10 overflow-hidden relative">
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none z-10" />
                         <div className="space-y-1 text-xs font-mono text-slate-400 flex flex-col items-center">
                            {gameState.logs.slice(0, 2).map((log, i) => (
                                <div key={i} className="truncate opacity-75 first:opacity-100 first:text-slate-300">
                                    <span className="text-slate-600 mr-2">[{gameState.turn - i > 0 ? gameState.turn - i : 1}]</span>
                                    {log}
                                </div>
                            ))}
                         </div>
                    </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                     {/* Retry */}
                     <Tooltip content="Restart">
                        <button onClick={handleRetryLevel} disabled={isProcessingAI} className="h-12 w-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors disabled:opacity-50">
                            <RotateCcw size={20} />
                        </button>
                     </Tooltip>
                     
                     {/* Undo */}
                     {!undoConfirmOpen ? (
                        <Tooltip content="Undo">
                            <button onClick={handleUndoRequest} disabled={history.length === 0 || isProcessingAI} className="h-12 w-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors disabled:opacity-50">
                                <Undo size={20} />
                            </button>
                        </Tooltip>
                     ) : (
                         <div className="h-12 flex items-center bg-slate-800 rounded-xl overflow-hidden border border-slate-700 animate-in slide-in-from-right">
                            <button onClick={handleConfirmUndo} className="h-full px-3 bg-red-600 hover:bg-red-500 text-white border-r border-red-700"><Check size={18} /></button>
                            <button onClick={handleCancelUndo} className="h-full px-3 hover:bg-slate-700 text-slate-400"><X size={18} /></button>
                         </div>
                     )}

                     {/* End Turn */}
                     <button
                        onClick={handleEndTurn}
                        disabled={!gameState.isPlayerTurn || isProcessingAI}
                        className={`h-12 px-6 rounded-xl font-bold text-sm uppercase tracking-wide flex items-center gap-2 transition-all shadow-lg
                            ${isProcessingAI 
                                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-wait' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 active:translate-y-0.5'
                            }`}
                     >
                        {isProcessingAI ? "Thinking..." : "End Turn"}
                        {!isProcessingAI && <Play size={16} fill="currentColor" />}
                     </button>
                </div>

             </div>
        </div>
      
      {/* Modals */}
      {showSettings && (
        <SettingsModal 
            onClose={() => setShowSettings(false)}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            aggression={aggression}
            setAggression={setAggression}
            fogEnabled={fogEnabled}
            setFogEnabled={setFogEnabled}
            onSave={handleSaveGame}
            onLoad={handleLoadGame}
            onClearSave={handleClearSave}
            hasSave={hasSave}
        />
      )}
      
      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}
      
    </div>
  );
};

export default App;