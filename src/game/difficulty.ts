import {
  GRAPPLE_AMP_MAX,
  GRAPPLE_SPEED,
  GRAPPLE_SPEED_MAX,
  GRAPPLE_X_AMPLITUDE,
} from './constants';

/**
 * Ramp grapple difficulty as score increases (capped).
 */
export function grappleSpeedForScore(score: number): number {
  const t = Math.min(1, score / 35);
  return GRAPPLE_SPEED + t * (GRAPPLE_SPEED_MAX - GRAPPLE_SPEED);
}

export function grappleAmplitudeForScore(score: number): number {
  const t = Math.min(1, score / 50);
  return GRAPPLE_X_AMPLITUDE + t * (GRAPPLE_AMP_MAX - GRAPPLE_X_AMPLITUDE);
}
