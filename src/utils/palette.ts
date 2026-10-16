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
    weight: '#9d7bff', food: '#ff9f43', water: '#38bdf8',
    protein: '#ff5c8a', carbs: '#ffd166', fat: '#4ade80',
    ink: '#f5f5fa', muted: '#8e8e9e', grid: 'rgba(255,255,255,0.06)', track: 'rgba(255,255,255,0.08)', surface: '#16161e',
  },
  light: {
    weight: '#7c5cf5', food: '#f5851e', water: '#0ea5e9',
    protein: '#ec4878', carbs: '#eab308', fat: '#22c55e',
    ink: '#111116', muted: '#6c6c78', grid: 'rgba(0,0,0,0.06)', track: 'rgba(0,0,0,0.07)', surface: '#ffffff',
  },
};
export const paletteFor = (t: Theme): Palette => palettes[t];
