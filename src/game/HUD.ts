import {
  BEST_SCORE_KEY,
  HINT_DISMISSED_KEY,
  MUTE_KEY,
} from './constants';

export type GameOverReason = 'stack' | 'fall' | 'out';

const GAME_OVER_REASON_COPY: Record<GameOverReason, string> = {
  stack: 'Each new cat must land higher on the tower than the last.',
  fall: 'You fell off the bottom!',
  out: 'You fell off the side!',
};

export class HUD {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private bestEl: HTMLElement;
  private pauseOverlay: HTMLElement;
  private gameOverEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private finalBestEl: HTMLElement;
  private newBestEl: HTMLElement;
  private goReasonEl: HTMLElement;
  private toastEl: HTMLElement;
  private hintBar: HTMLElement;
  private menuBestEl: HTMLElement | null;
  private canvas: HTMLCanvasElement;
  private onRestart?: () => void;
  private onPauseToggle?: () => void;
  private onMuteToggle?: (muted: boolean) => void;
  private onQuitToMainMenu?: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.scoreEl = root.querySelector('#hud-score')!;
    this.bestEl = root.querySelector('#hud-best')!;
    this.pauseOverlay = root.querySelector('#pause-overlay')!;
    this.gameOverEl = root.querySelector('#gameover')!;
    this.finalScoreEl = root.querySelector('#go-score')!;
    this.finalBestEl = root.querySelector('#go-best')!;
    this.newBestEl = root.querySelector('#go-newbest')!;
    this.goReasonEl = root.querySelector('#go-reason')!;
    this.toastEl = root.querySelector('#score-toast')!;
    this.hintBar = root.querySelector('#hint-bar')!;
    this.menuBestEl = root.querySelector('#menu-best');
    this.canvas = root.querySelector('#game-canvas')!;

    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.btn-mute');
      if (!btn) return;
      e.stopPropagation();
      const next = btn.getAttribute('aria-pressed') !== 'true';
      this.root.querySelectorAll('.btn-mute').forEach((b) => {
        b.setAttribute('aria-pressed', String(next));
        b.textContent = next ? '🔇' : '🔊';
      });
      this.onMuteToggle?.(next);
    });

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

    const pauseRestart = root.querySelector('#btn-pause-restart');
    pauseRestart?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onRestart?.();
    });

    const pauseMainMenu = root.querySelector('#btn-pause-mainmenu');
    pauseMainMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onQuitToMainMenu?.();
    });

    const goRestart = root.querySelector('#go-restart');
    goRestart?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onRestart?.();
    });

    const hintDismiss = root.querySelector('#hint-dismiss');
    hintDismiss?.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem(HINT_DISMISSED_KEY, '1');
      this.hintBar.hidden = true;
    });

    this.syncMuteButton();
    this.syncHintBar();
  }

  setCallbacks(
    onRestart: () => void,
    onPauseToggle: () => void,
    onMuteToggle: (muted: boolean) => void,
    onQuitToMainMenu?: () => void,
  ): void {
    this.onRestart = onRestart;
    this.onPauseToggle = onPauseToggle;
    this.onMuteToggle = onMuteToggle;
    this.onQuitToMainMenu = onQuitToMainMenu;
  }

  private syncMuteButton(): void {
    const muted = localStorage.getItem(MUTE_KEY) === '1';
    this.root.querySelectorAll('.btn-mute').forEach((b) => {
      b.setAttribute('aria-pressed', String(muted));
      b.textContent = muted ? '🔇' : '🔊';
    });
  }

  private syncHintBar(): void {
    this.hintBar.hidden = localStorage.getItem(HINT_DISMISSED_KEY) === '1';
  }

  setScore(n: number): void {
    this.scoreEl.textContent = String(n);
  }

  showToast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    this.toastEl.classList.remove('toast-pop');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('toast-pop');
    window.setTimeout(() => {
      this.toastEl.hidden = true;
    }, 900);
  }

  loadBest(): number {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    const best = Number.isFinite(n) ? n : 0;
    this.bestEl.textContent = String(best);
    if (this.menuBestEl) this.menuBestEl.textContent = String(best);
    return best;
  }

  saveBestIfNeeded(score: number): number {
    const prev = this.getStoredBest();
    const next = Math.max(prev, score);
    if (next !== prev) {
      localStorage.setItem(BEST_SCORE_KEY, String(next));
    }
    this.bestEl.textContent = String(next);
    if (this.menuBestEl) this.menuBestEl.textContent = String(next);
    return next;
  }

  getBest(): number {
    return this.getStoredBest();
  }

  private getStoredBest(): number {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  setPhase(phase: 'playing' | 'paused' | 'gameover'): void {
    const paused = phase === 'paused';
    const over = phase === 'gameover';
    this.pauseOverlay.hidden = !paused;
    this.gameOverEl.hidden = !over;

    this.pauseOverlay.setAttribute('aria-hidden', String(!paused));
    this.gameOverEl.setAttribute('aria-hidden', String(!over));

    if (!over) {
      this.goReasonEl.hidden = true;
    }

    const block = paused || over;
    this.canvas.inert = block;
    if (block) {
      this.canvas.removeAttribute('tabindex');
    } else {
      this.canvas.setAttribute('tabindex', '0');
    }
  }

  showGameOver(
    score: number,
    best: number,
    isNewBest: boolean,
    reason: GameOverReason,
  ): void {
    this.finalScoreEl.textContent = String(score);
    this.finalBestEl.textContent = String(best);
    this.newBestEl.hidden = !isNewBest;
    this.goReasonEl.textContent = GAME_OVER_REASON_COPY[reason];
    this.goReasonEl.hidden = false;
    this.setPhase('gameover');
  }
}
