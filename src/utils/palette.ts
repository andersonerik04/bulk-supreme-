import type { Theme } from '@/db/types';

/**
 * Resolved colors for SVG/Recharts, mirroring the CSS tokens in index.css.
 * SVG presentation attributes don't reliably resolve CSS variables on iOS Safari,
 * so charts and rings use these concrete values instead.
 */
type Keys = 'weight' | 'food' | 'water' | 'protein' | 'carbs' | 'fat' | 'ink' | 'muted' | 'grid' | 'track' | 'surface';
export type Palette = Record<Keys, string>;

const palettes: Record<Theme, Palette> = {
  dark: {
    weight: '#f2f1ec', food: '#d4ff3a', water: '#9cd6ff',
    protein: '#d4ff3a', carbs: '#bebeb6', fat: '#696964',
    ink: '#f2f1ec', muted: '#888882', grid: 'rgba(255,255,255,0.06)', track: 'rgba(255,255,255,0.08)', surface: '#0e0e0e',
  },
  light: {
    weight: '#0b0b0b', food: '#708c00', water: '#288cc8',
    protein: '#708c00', carbs: '#96968e', fat: '#464642',
    ink: '#0b0b0b', muted: '#70706a', grid: 'rgba(0,0,0,0.06)', track: 'rgba(0,0,0,0.07)', surface: '#ffffff',
  },
};

export const paletteFor = (t: Theme): Palette => palettes[t];
