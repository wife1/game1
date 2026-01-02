import { GoogleGenAI, Type } from "@google/genai";
import { GameNode, GameEdge, AIMoveRequest, Owner } from '../types';
import { findPath } from '../utils/gameLogic'; // Assuming gameLogic is available in same relative path structure

// Helper to check if a node is "frontline" (adjacent to enemy)
const isFrontline = (nodeId: string, nodes: GameNode[], adj: Map<string, string[]>) => {
    const neighbors = adj.get(nodeId) || [];
    return neighbors.some(nid => {
        const n = nodes.find(x => x.id === nid);
        return n && n.owner === Owner.PLAYER;
    });
};

/**
 * Fallback Heuristic AI
 * Used when the Gemini API is unavailable or rate-limited.
 * Implements basic strategy: Defense/Fortify > Attack Weakest Enemy > Expand to Weakest Neutral > Reinforce
 */
const getFallbackMoves = (nodes: GameNode[], edges: GameEdge[]): AIMoveRequest[] => {
  const moves: AIMoveRequest[] = [];
  
  // 1. Identify AI nodes that can move
  const aiNodes = nodes.filter(n => n.owner === Owner.AI && n.strength > 1);
  
  // Sort by strength descending (move biggest armies first)
  aiNodes.sort((a, b) => b.strength - a.strength);

  // Pre-build adjacency map for performance
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
  });

  // Identify Threatened AI Nodes (AI nodes adjacent to Player)
  const threatenedAiNodes = new Set<string>();
  nodes.filter(n => n.owner === Owner.AI).forEach(n => {
      if (isFrontline(n.id, nodes, adj)) {
          threatenedAiNodes.add(n.id);
      }
  });

  // Identify Player Neighbor Ids for pressure logic
  const playerNeighborIds = new Set<string>();
  nodes.filter(n => n.owner === Owner.PLAYER).forEach(pn => {
      const neighbors = adj.get(pn.id) || [];
      neighbors.forEach(nid => playerNeighborIds.add(nid));
  });

  for (const source of aiNodes) {
      const neighborIds = adj.get(source.id) || [];
      const neighbors = nodes.filter(n => neighborIds.includes(n.id));

      const isSourceThreatened = threatenedAiNodes.has(source.id);

      // --- STRATEGY 1: HOLD THE LINE (Self-Defense) ---
      if (isSourceThreatened) {
          const killableEnemies = neighbors.filter(n => n.owner === Owner.PLAYER && n.strength < source.strength);
          if (killableEnemies.length > 0) {
              killableEnemies.sort((a, b) => {
                if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
                return b.strength - a.strength;
              });
              moves.push({ fromId: source.id, toId: killableEnemies[0].id });
              continue; 
          }
          continue; 
      }

      // --- STRATEGY 2: FORTIFY (Help Neighbors) ---
      const threatenedFriendlies = neighbors.filter(n => n.owner === Owner.AI && threatenedAiNodes.has(n.id));
      if (threatenedFriendlies.length > 0) {
          threatenedFriendlies.sort((a, b) => a.strength - b.strength);
          moves.push({ fromId: source.id, toId: threatenedFriendlies[0].id });
          continue; 
      }

      // --- STRATEGY 3: ATTACK (Flanking/Offense) ---
      const enemies = neighbors.filter(n => n.owner === Owner.PLAYER);
      const killableEnemies = enemies.filter(n => n.strength < source.strength);
      if (killableEnemies.length > 0) {
          killableEnemies.sort((a, b) => {
              if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
              return b.strength - a.strength; 
          });
          moves.push({ fromId: source.id, toId: killableEnemies[0].id });
          continue; 
      }

      // --- STRATEGY 4: EXPAND (Capture Neutrals) ---
      const neutrals = neighbors.filter(n => n.owner === Owner.NEUTRAL);
      const capturableNeutrals = neutrals.filter(n => n.strength < source.strength);

      if (capturableNeutrals.length > 0) {
          capturableNeutrals.sort((a, b) => {
              const aIsThreat = playerNeighborIds.has(a.id);
              const bIsThreat = playerNeighborIds.has(b.id);
              if (aIsThreat && !bIsThreat) return -1;
              if (!aIsThreat && bIsThreat) return 1;
              return a.strength - b.strength;
          });
          moves.push({ fromId: source.id, toId: capturableNeutrals[0].id });
          continue; 
      }

      // --- STRATEGY 5: REINFORCE (Deep Move to Frontline) ---
      // If we are safe and have excess troops, find the nearest threatened node to reinforce.
      if (source.strength > 5 && !isSourceThreatened) {
          // BFS to find nearest threatened node (BFS is already optimal for unweighted distance)
          // We can't use findPath easily here without importing it or duplicating bfs. 
          // Let's implement a quick BFS search for a target.
          
          let queue = [source.id];
          let visited = new Set([source.id]);
          let bestTargetId: string | null = null;
          
          // Limit search depth to avoid full map scans
          let depth = 0;
          const MAX_DEPTH = 6; 

          while(queue.length > 0 && depth < MAX_DEPTH) {
              const levelSize = queue.length;
              for(let i=0; i<levelSize; i++) {
                  const currId = queue.shift()!;
                  if (threatenedAiNodes.has(currId) && currId !== source.id) {
                      bestTargetId = currId;
                      break;
                  }
                  
                  const nIds = adj.get(currId) || [];
                  for (const nid of nIds) {
                      if (!visited.has(nid)) {
                          const nNode = nodes.find(x => x.id === nid);
                          if (nNode && nNode.owner === Owner.AI) {
                              visited.add(nid);
                              queue.push(nid);
                          }
                      }
                  }
              }
              if (bestTargetId) break;
              depth++;
          }

          if (bestTargetId) {
              moves.push({ fromId: source.id, toId: bestTargetId });
          } else {
             // Fallback: Random shuffle to prevent stagnation if no frontline found
             const friendlies = neighbors.filter(n => n.owner === Owner.AI);
              if (friendlies.length > 0 && Math.random() > 0.5) {
                  const randomFriendly = friendlies[Math.floor(Math.random() * friendlies.length)];
                  moves.push({ fromId: source.id, toId: randomFriendly.id });
              }
          }
      }
  }

  return moves;
};

export const getAIMoves = async (
  nodes: GameNode[],
  edges: GameEdge[],
  aggression: 'cautious' | 'balanced' | 'aggressive' = 'balanced',
  difficulty: number = 1
): Promise<AIMoveRequest[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return getFallbackMoves(nodes, edges);
  }

  const ai = new GoogleGenAI({ apiKey });

  const adj: Record<string, string[]> = {};
  edges.forEach(e => {
      if (!adj[e.source]) adj[e.source] = [];
      if (!adj[e.target]) adj[e.target] = [];
      if (!adj[e.source].includes(e.target)) adj[e.source].push(e.target);
      if (!adj[e.target].includes(e.source)) adj[e.target].push(e.source);
  });

  const simplifiedState = {
    nodes: nodes.map(n => ({
       id: n.id,
       o: n.owner,
       s: n.strength,
       c: n.isCapital ? 1 : 0
    })),
    adj: adj
  };

  let aggressionPrompt = "";
  switch (aggression) {
    case 'cautious':
      aggressionPrompt = `STRATEGY: DEFENSIVE. REINFORCE front lines. EXPAND cautiously. DEFEND Capital.`;
      break;
    case 'aggressive':
      aggressionPrompt = `STRATEGY: RUSH. ATTACK PLAYER. EXPAND rapidly. MOVE FRONT.`;
      break;
    default: // balanced
      aggressionPrompt = `STRATEGY: EXPANSIONIST. EXPAND income. ATTACK weak neighbors. OPPORTUNISM.`;
      break;
  }

  let difficultyPrompt = "";
  if (difficulty < 1.0) {
    difficultyPrompt = `DIFFICULTY: EASY. Make somewhat random moves. Focus on expansion but make mistakes.`;
  } 
  else if (difficulty >= 1.5) {
    difficultyPrompt = `DIFFICULTY: HARD. Play optimally. Maximize damage. Ruthlessly exploit weakness. Anticipate player moves.`;
  } 
  else {
    difficultyPrompt = `DIFFICULTY: NORMAL. Play logically. Balance offense and defense.`;
  }

  const systemPrompt = `
    Play Konquest as 'AI'. Eliminate 'PLAYER'.
    Rules: Moves send ALL strength-1. Moving leaves the source node with 1 strength.
    Input: JSON with 'nodes' array (id, o=owner, s=strength, c=capital) and 'adj' object (id -> list of neighbor ids).
    Output: JSON moves array {fromId, toId}.
    
    Goals:
    1. Capture Nodes (My Strength > Their Strength).
    2. DEFENSE & FORTIFICATION: 
       - If an AI node is adjacent to a PLAYER node, it is THREATENED. 
       - PRIORITIZE moving units from SAFE AI nodes into THREATENED AI nodes to fortify them.
       - You can move units through friendly territory to reach a distant node.
       - DO NOT move units OUT of a threatened node unless attacking a weaker enemy.
    3. PRESSURE: When capturing Neutrals, prioritize those adjacent to PLAYER nodes.
    4. Protect Capital.
    
    ${aggressionPrompt}
    ${difficultyPrompt}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: JSON.stringify(simplifiedState),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moves: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fromId: { type: Type.STRING },
                  toId: { type: Type.STRING }
                },
                required: ["fromId", "toId"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
        return getFallbackMoves(nodes, edges);
    }
    
    const data = JSON.parse(text);
    return data.moves || [];

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return getFallbackMoves(nodes, edges);
  }
};
