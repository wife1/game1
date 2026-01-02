import { GameNode, GameEdge, Owner, GameState, Point } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, HEX_SIZE, HEX_SPACING_X, HEX_SPACING_Y } from '../constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface HexCoord {
  q: number;
  r: number;
}

export type MoveResultType = 'REINFORCE' | 'ATTACK' | 'CAPTURE' | null;

// Convert axial (q,r) to pixel (x,y) for Flat-topped hexes
const hexToPixel = (q: number, r: number): Point => {
  const x = HEX_SPACING_X * q;
  const y = HEX_SPACING_Y * (r + q / 2);
  // Center on map
  return {
    x: x + MAP_WIDTH / 2,
    y: y + MAP_HEIGHT / 2
  };
};

const getHexNeighbors = (q: number, r: number): HexCoord[] => {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  return directions.map(d => ({ q: q + d.q, r: r + d.r }));
};

export const generateMap = (level: number = 1, difficulty: number = 1): { nodes: GameNode[], edges: GameEdge[] } => {
  const nodes: GameNode[] = [];
  const edges: GameEdge[] = [];
  const occupied = new Set<string>(); // "q,r" strings

  // Scaling
  const nodeCount = Math.min(80, 20 + Math.floor((level - 1) * 0.5));
  const playerStartStrength = 20;
  
  // AI Strength Calculation:
  // Base: 20 + 1 per level (Linear scaling)
  // Multiplier: Controlled by difficulty setting (0.5 - 2.0)
  const baseAiStrength = 20 + (level - 1);
  const aiStartStrength = Math.max(5, Math.floor(baseAiStrength * difficulty));

  // 1. Generate Hex Grid (Breadth-First / Random Expansion)
  // Start at center
  const startHex = { q: 0, r: 0 };
  const hexes: HexCoord[] = [startHex];
  occupied.add(`0,0`);

  // Frontier for expansion
  let frontier: HexCoord[] = [startHex];

  while (hexes.length < nodeCount && frontier.length > 0) {
    // Pick a random hex from the frontier to expand from (makes it blobby)
    const index = Math.floor(Math.random() * frontier.length);
    const current = frontier[index];

    // Get neighbors
    const neighbors = getHexNeighbors(current.q, current.r);
    
    // Shuffle neighbors to keep growth random
    const shuffledNeighbors = neighbors.sort(() => Math.random() - 0.5);

    let added = false;
    for (const n of shuffledNeighbors) {
      const key = `${n.q},${n.r}`;
      if (!occupied.has(key)) {
        // Ensure within bounds (approximate check to keep it on screen)
        const px = hexToPixel(n.q, n.r);
        if (px.x > 50 && px.x < MAP_WIDTH - 50 && px.y > 50 && px.y < MAP_HEIGHT - 50) {
            occupied.add(key);
            hexes.push(n);
            frontier.push(n);
            added = true;
            break; // Add one per iteration
        }
      }
    }

    // If we couldn't add a neighbor (stuck or bad luck), remove from frontier
    // Note: In a strict BFS we shift, but here we pick random to make it irregular.
    // To ensure termination if stuck, we might remove `current` if all neighbors taken.
    const allOccupied = neighbors.every(n => occupied.has(`${n.q},${n.r}`));
    if (allOccupied) {
        frontier.splice(index, 1);
    }
  }

  // 2. Convert Hexes to GameNodes
  const hexMap = new Map<string, string>(); // "q,r" -> nodeId

  hexes.forEach(hex => {
    const id = generateId();
    const pos = hexToPixel(hex.q, hex.r);
    hexMap.set(`${hex.q},${hex.r}`, id);
    
    nodes.push({
      id,
      position: pos,
      owner: Owner.NEUTRAL,
      strength: Math.floor(Math.random() * 10) + 1,
      capacity: 100
    });
  });

  // 3. Generate Edges based on Hex Adjacency
  // Since we built it contiguously, we just check neighbors for every hex
  const edgeSet = new Set<string>(); // "id1-id2" to avoid dupes

  hexes.forEach(hex => {
    const uId = hexMap.get(`${hex.q},${hex.r}`)!;
    const neighbors = getHexNeighbors(hex.q, hex.r);

    neighbors.forEach(n => {
      const vId = hexMap.get(`${n.q},${n.r}`);
      if (vId) {
        // Create edge if not exists
        const key1 = `${uId}-${vId}`;
        const key2 = `${vId}-${uId}`;
        if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
          edges.push({
            id: generateId(),
            source: uId,
            target: vId
          });
          edgeSet.add(key1);
        }
      }
    });
  });

  // 4. Assign Start Positions (Furthest apart)
  const sortedByX = [...nodes].sort((a, b) => a.position.x - b.position.x);
  
  if (sortedByX.length > 0) {
    const playerNode = sortedByX[0];
    const aiNode = sortedByX[sortedByX.length - 1];

    playerNode.owner = Owner.PLAYER;
    playerNode.strength = playerStartStrength;
    playerNode.isCapital = true; 
    playerNode.capitalOwner = Owner.PLAYER;

    aiNode.owner = Owner.AI;
    aiNode.strength = aiStartStrength;
    aiNode.isCapital = true; // Mark AI start as Capital
    aiNode.capitalOwner = Owner.AI;
  }

  return { nodes, edges };
};

export const getVisibleNodeIds = (
  nodes: GameNode[], 
  edges: GameEdge[], 
  fogEnabled: boolean = true, 
  radius: number = 1,
  observer: Owner = Owner.PLAYER
): Set<string> => {
  // If fog is disabled, return all node IDs
  if (!fogEnabled) {
    return new Set(nodes.map(n => n.id));
  }

  const visible = new Set<string>();
  
  // 1. Identify all observer nodes (Player or AI) and initialize Queue
  const observerNodes = nodes.filter(n => n.owner === observer);
  const queue: {id: string, depth: number}[] = observerNodes.map(n => ({ id: n.id, depth: 0 }));
  
  // Mark own nodes as visible immediately
  observerNodes.forEach(n => visible.add(n.id));
  
  // 2. Build Adjacency List for fast lookup
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });
  
  // 3. BFS to find nodes within radius
  // visited set tracks nodes we've already added to the queue to avoid cycles
  const visited = new Set<string>(observerNodes.map(n => n.id));
  
  let head = 0;
  while(head < queue.length) {
      const { id, depth } = queue[head++];
      
      // If we are already at the max radius, we don't need to check neighbors
      if (depth >= radius) continue;
      
      const neighbors = adj.get(id) || [];
      for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
              visited.add(neighborId);
              visible.add(neighborId);
              queue.push({ id: neighborId, depth: depth + 1 });
          }
      }
  }

  return visible;
};

export const processTurnIncome = (nodes: GameNode[]): GameNode[] => {
  return nodes.map(node => {
    if (node.owner !== Owner.NEUTRAL) {
      // Capital nodes produce +5, others +1
      const income = node.isCapital ? 5 : 1;
      return { ...node, strength: node.strength + income };
    }
    return node;
  });
};

export const findPath = (
    nodes: GameNode[], 
    edges: GameEdge[], 
    startId: string, 
    endId: string, 
    owner: Owner
): Point[] | null => {
    // 1. Build Adjacency List
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)?.push(e.target);
        adj.get(e.target)?.push(e.source);
    });

    // 2. BFS
    // Queue stores { id, path: [list of node IDs] }
    const queue: {id: string, path: string[]}[] = [{ id: startId, path: [startId] }];
    const visited = new Set<string>([startId]);

    while(queue.length > 0) {
        const { id, path } = queue.shift()!;
        
        if (id === endId) {
            // Found it. Map IDs to Points.
            return path
                .map(pid => nodes.find(n => n.id === pid)?.position)
                .filter(p => p !== undefined) as Point[];
        }

        const neighbors = adj.get(id) || [];
        for (const nid of neighbors) {
            if (!visited.has(nid)) {
                const node = nodes.find(n => n.id === nid);
                // Valid traversal: Node must exist.
                // It must be owned by the mover (friendly territory) OR it must be the final destination (attack/move to).
                // Note: If attacking, you can only move to adjacent enemy. 
                // But this logic allows traversing own nodes to reach a distant own node (reinforce).
                if (node && (node.owner === owner || nid === endId)) {
                    visited.add(nid);
                    queue.push({ id: nid, path: [...path, nid] });
                }
            }
        }
    }
    return null;
};

export interface MovingUnitData {
  count: number;
  owner: Owner;
}

// Phase 1: Departure
// Returns updated nodes (source depleted) and the unit data that is moving
export const departNode = (
  nodes: GameNode[], 
  fromId: string
): { newNodes: GameNode[], movingUnit: MovingUnitData | null } => {
  const sourceIndex = nodes.findIndex(n => n.id === fromId);
  if (sourceIndex === -1) return { newNodes: nodes, movingUnit: null };

  const source = { ...nodes[sourceIndex] };
  
  if (source.strength <= 1) return { newNodes: nodes, movingUnit: null };

  const movingStrength = source.strength - 1;
  source.strength = 1;

  const newNodes = [...nodes];
  newNodes[sourceIndex] = source;

  return { 
    newNodes, 
    movingUnit: { count: movingStrength, owner: source.owner } 
  };
};

// Phase 2: Arrival
// Returns updated nodes (target resolved), log, and event type
export const arriveNode = (
  nodes: GameNode[],
  toId: string,
  unit: MovingUnitData
): { newNodes: GameNode[], log: string | null, moveType: MoveResultType } => {
  const targetIndex = nodes.findIndex(n => n.id === toId);
  if (targetIndex === -1) return { newNodes: nodes, log: null, moveType: null };

  const target = { ...nodes[targetIndex] };
  let log = '';
  let moveType: MoveResultType = null;

  if (unit.owner === target.owner) {
    target.strength += unit.count;
    log = `${unit.owner === Owner.PLAYER ? 'Blue' : 'Red'} reinforced with ${unit.count}.`;
    moveType = 'REINFORCE';
  } else {
    if (unit.count > target.strength) {
      const remaining = unit.count - target.strength;
      target.owner = unit.owner;
      
      // Calculate final strength (including possible aggression bonuses)
      let finalStrength = remaining;
      let bonusMsg = '';

      // AI Aggression Bonus: Reward attacking play
      if (unit.owner === Owner.AI) {
          const bonus = 2; // +2 Strength on Capture
          finalStrength += bonus;
          bonusMsg = ` (+${bonus} Fury)`;
      }

      target.strength = finalStrength;
      log = `${unit.owner === Owner.PLAYER ? 'Blue' : 'Red'} captured a node!${bonusMsg}`;
      moveType = 'CAPTURE';
    } else {
      target.strength -= unit.count;
      log = `${unit.owner === Owner.PLAYER ? 'Blue' : 'Red'} attacked!`;
      moveType = 'ATTACK';
    }
  }

  const newNodes = [...nodes];
  newNodes[targetIndex] = target;

  return { newNodes, log, moveType };
};