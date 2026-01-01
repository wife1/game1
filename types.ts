export enum Owner {
  NEUTRAL = 'NEUTRAL',
  PLAYER = 'PLAYER',
  AI = 'AI'
}

export interface Point {
  x: number;
  y: number;
}

export interface GameNode {
  id: string;
  position: Point;
  owner: Owner;
  strength: number;
  capacity: number; // Max strength before growth slows/stops (optional mechanic, simplified for now to just be visualization scale)
  isCapital?: boolean;
}

export interface GameEdge {
  id: string;
  source: string;
  target: string;
}

export interface GameState {
  nodes: GameNode[];
  edges: GameEdge[];
  turn: number;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  winner: Owner | null;
  logs: string[];
}

export interface Move {
  fromId: string;
  toId: string;
}

export interface AIMoveRequest {
  fromId: string;
  toId: string;
}