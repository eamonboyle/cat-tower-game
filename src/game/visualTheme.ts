import { CanvasTexture, LinearFilter } from 'three';

/** Matches playful UI sticker palette (see style.css) */
export const INK = 0x3d2f4a;
export const BUBBLE_PINK = 0xff6b9d;
export const BUBBLE_PINK_DEEP = 0xe84a84;
export const SKY = 0x7dd3fc;
export const SKY_DEEP = 0x38bdf8;
export const LEMON = 0xfde047;
export const LEMON_DEEP = 0xeab308;
export const MINT = 0x6ee7b7;
export const MINT_DEEP = 0x34d399;
export const CREAM = 0xfffbeb;
export const PEACH = 0xfb923c;
export const LAVENDER = 0xc4b5fd;

/** Saturated fur options — each cat picks one */
export const FUR_PRESETS = [
  BUBBLE_PINK,
  SKY,
  MINT,
  LEMON_DEEP,
  LAVENDER,
  PEACH,
  0xf472b6,
  0x67e8f9,
] as const;

/** Background building pastels */
export const BUILDING_PRESETS = [
  0xf9a8d4,
  0x93c5fd,
  0x86efac,
  0xfde68a,
  0xc4b5fd,
  0xfbbf24,
  0x67e8f9,
  0xfbcfe8,
] as const;

let toonGradient: CanvasTexture | null = null;

/** Shared cel-shading ramp for MeshToonMaterial */
export function getSharedToonGradient(): CanvasTexture {
  if (!toonGradient) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 8, 0);
    g.addColorStop(0, '#3a3a48');
    g.addColorStop(0.35, '#7a7a8a');
    g.addColorStop(0.65, '#c4c4d4');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 1);
    toonGradient = new CanvasTexture(canvas);
    toonGradient.minFilter = LinearFilter;
    toonGradient.magFilter = LinearFilter;
  }
  return toonGradient;
}
