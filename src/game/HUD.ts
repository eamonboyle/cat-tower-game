import { BEST_SCORE_KEY } from './constants';

export class HUD {
  private scoreEl: HTMLElement;
  private bestEl: HTMLElement;
  private pauseOverlay: HTMLElement;
  private gameOverEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private finalBestEl: HTMLElement;
  private onRestart?: () => void;
  private onPauseToggle?: () => void;

  constructor(root: HTMLElement) {
    this.scoreEl = root.querySelector('#hud-score')!;
    this.bestEl = root.querySelector('#hud-best')!;
    this.pauseOverlay = root.querySelector('#pause-overlay')!;
    this.gameOverEl = root.querySelector('#gameover')!;
    this.finalScoreEl = root.querySelector('#go-score')!;
    this.finalBestEl = root.querySelector('#go-best')!;

    const pauseBtn = root.querySelector('#btn-pause');
    pauseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onPauseToggle?.();
    });

    const resumeBtn = root.querySelector('#btn-resume');
    resumeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onPauseToggle?.();
    });

    const goRestart = root.querySelector('#go-restart');
    goRestart?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onRestart?.();
    });
  }

  setCallbacks(onRestart: () => void, onPauseToggle: () => void): void {
    this.onRestart = onRestart;
    this.onPauseToggle = onPauseToggle;
  }

  setScore(n: number): void {
    this.scoreEl.textContent = String(n);
  }

  loadBest(): number {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    const best = Number.isFinite(n) ? n : 0;
    this.bestEl.textContent = String(best);
    return best;
  }

  saveBestIfNeeded(score: number): number {
    const prev = this.getStoredBest();
    const next = Math.max(prev, score);
    if (next !== prev) {
      localStorage.setItem(BEST_SCORE_KEY, String(next));
    }
    this.bestEl.textContent = String(next);
    return next;
  }

  private getStoredBest(): number {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  setPhase(phase: 'playing' | 'paused' | 'gameover'): void {
    this.pauseOverlay.hidden = phase !== 'paused';
    this.gameOverEl.hidden = phase !== 'gameover';
  }

  showGameOver(score: number, best: number): void {
    this.finalScoreEl.textContent = String(score);
    this.finalBestEl.textContent = String(best);
    this.setPhase('gameover');
  }
}
