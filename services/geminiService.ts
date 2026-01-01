import { GoogleGenAI, Type } from "@google/genai";
import { GameNode, GameEdge, AIMoveRequest, Owner } from '../types';

/**
 * Fallback Heuristic AI
 * Used when the Gemini API is unavailable or rate-limited.
 * Implements basic strategy: Attack Weakest Enemy > Expand to Weakest Neutral (preferring Player neighbors) > Reinforce Randomly
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

  // Identify nodes that are adjacent to the PLAYER
  // Capturing these puts pressure on the player
  const playerNeighborIds = new Set<string>();
  nodes.filter(n => n.owner === Owner.PLAYER).forEach(pn => {
      const neighbors = adj.get(pn.id) || [];
      neighbors.forEach(nid => playerNeighborIds.add(nid));
  });

  for (const source of aiNodes) {
      const neighborIds = adj.get(source.id) || [];
      const neighbors = nodes.filter(n => neighborIds.includes(n.id));

      // Strategy A: Attack Killable Enemies (High Priority)
      const enemies = neighbors.filter(n => n.owner === Owner.PLAYER);
      const killableEnemies = enemies.filter(n => n.strength < source.strength);
      
      if (killableEnemies.length > 0) {
          // Prioritize Capital, then strongest enemy we can beat (to reduce their threat)
          killableEnemies.sort((a, b) => {
              if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
              return b.strength - a.strength; 
          });
          moves.push({ fromId: source.id, toId: killableEnemies[0].id });
          continue; // Unit used
      }

      // Strategy B: Capture Neutrals (Expansion)
      const neutrals = neighbors.filter(n => n.owner === Owner.NEUTRAL);
      const capturableNeutrals = neutrals.filter(n => n.strength < source.strength);

      if (capturableNeutrals.length > 0) {
          // Priority 1: Nodes that touch the Player (Pressure)
          // Priority 2: Lowest strength (Cheapest expansion)
          capturableNeutrals.sort((a, b) => {
              const aIsThreat = playerNeighborIds.has(a.id);
              const bIsThreat = playerNeighborIds.has(b.id);
              
              if (aIsThreat && !bIsThreat) return -1;
              if (!aIsThreat && bIsThreat) return 1;
              
              return a.strength - b.strength;
          });
          moves.push({ fromId: source.id, toId: capturableNeutrals[0].id });
          continue; // Unit used
      }

      // Strategy D: Reinforce / Move Frontline
      // If no attacks, move to a friendly node. Ideally one that has enemy neighbors.
      const friendlies = neighbors.filter(n => n.owner === Owner.AI);
      if (friendlies.length > 0 && source.strength > 5) {
          // Try to find a friendly neighbor that is next to an enemy
          const frontLineFriendly = friendlies.find(f => {
               const fNeighbors = adj.get(f.id) || [];
               return nodes.some(n => fNeighbors.includes(n.id) && n.owner === Owner.PLAYER);
          });

          if (frontLineFriendly) {
              moves.push({ fromId: source.id, toId: frontLineFriendly.id });
          } else {
              // Random movement to prevent stagnation
              if (Math.random() > 0.5) {
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
  
  // Immediate fallback if no key
  if (!apiKey) {
    // console.warn("No API Key available. Using heuristic AI.");
    return getFallbackMoves(nodes, edges);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Optimization: Build Adjacency List separately to reduce JSON token count
  // Nested objects in the previous version caused large payloads.
  const adj: Record<string, string[]> = {};
  edges.forEach(e => {
      if (!adj[e.source]) adj[e.source] = [];
      if (!adj[e.target]) adj[e.target] = [];
      // Use Set logic implicitly by checking inclusion or just allow dupes (Game logic handles dupes fine, but let's be clean)
      if (!adj[e.source].includes(e.target)) adj[e.source].push(e.target);
      if (!adj[e.target].includes(e.source)) adj[e.target].push(e.source);
  });

  // Minimized state representation
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
  if (difficulty <= 0.5) {
    difficultyPrompt = `DIFFICULTY: EASY. Make random moves.`;
  } else if (difficulty >= 1.5) {
    difficultyPrompt = `DIFFICULTY: HARD. Maximize damage.`;
  } else {
    difficultyPrompt = `DIFFICULTY: NORMAL. Play logically.`;
  }

  const systemPrompt = `
    Play Konquest as 'AI'. Eliminate 'PLAYER'.
    Rules: Moves send ALL strength-1.
    Input: JSON with 'nodes' array (id, o=owner, s=strength, c=capital) and 'adj' object (id -> list of neighbor ids).
    Output: JSON moves array {fromId, toId}.
    
    Goals:
    1. Capture Nodes (My Strength > Their Strength).
    2. PRESSURE: When capturing Neutrals, prioritize those adjacent to PLAYER nodes (use 'adj' to check neighbors).
    3. Reinforce Front.
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
    const msg = error.message || '';
    
    // Check for Quota limits
    const isQuota = msg.includes('429') || 
                    error.status === 'RESOURCE_EXHAUSTED' || 
                    (error.error && error.error.code === 429);

    // Check for Network/Server errors (XHR, 500, RPC failed)
    // These are often transient or payload-related.
    const isNetworkOrServer = msg.includes('xhr error') || 
                              msg.includes('500') || 
                              msg.includes('Rpc failed') ||
                              msg.includes('Failed to fetch');

    if (isQuota) {
        console.warn("Gemini Quota Exceeded. Using Fallback AI.");
    } else if (isNetworkOrServer) {
        console.warn("Gemini Connection Error (XHR/RPC). Using Fallback AI.");
    } else {
        console.error("Gemini API Error:", error);
    }
    
    return getFallbackMoves(nodes, edges);
  }
};