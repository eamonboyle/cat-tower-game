import { BEST_SCORE_KEY } from './game/constants';

export function readMenuBest(): number {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
