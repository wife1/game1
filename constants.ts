import { Owner } from './types';

export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;

// Hexagon Configuration
export const HEX_SIZE = 35; // Outer radius
export const HEX_WIDTH = 2 * HEX_SIZE;
export const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

// Spacing for Flat-topped hexes
export const HEX_SPACING_X = (3 / 2) * HEX_SIZE;
export const HEX_SPACING_Y = Math.sqrt(3) * HEX_SIZE;

export const COLORS = {
  [Owner.NEUTRAL]: '#94a3b8', // Slate 400
  [Owner.PLAYER]: '#3b82f6', // Blue 500
  [Owner.AI]: '#ef4444',     // Red 500
};

export const HOVER_COLORS = {
  [Owner.NEUTRAL]: '#cbd5e1',
  [Owner.PLAYER]: '#60a5fa',
  [Owner.AI]: '#f87171',
};