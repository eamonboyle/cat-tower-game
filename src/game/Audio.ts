import { MUTE_KEY } from './constants';

/**
 * Simple Web Audio beeps — no external assets.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    const stored = localStorage.getItem(MUTE_KEY);
    this.muted = stored === '1';
  }

  setMuted(m: boolean): void {
    this.muted = m;
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Unlock audio after user gesture (required by some browsers). */
  resume(): void {
    if (this.muted) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    void this.ctx.resume();
  }

  private beep(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  playDrop(): void {
    this.beep(220, 0.06, 'square', 0.06);
  }

  playLand(impact: number): void {
    const t = Math.min(1, impact / 25);
    const gain = 0.05 + t * 0.1;
    this.beep(120 + t * 80, 0.08, 'triangle', gain);
  }

  playScore(points: number): void {
    const base = 440 + Math.min(points, 8) * 40;
    this.beep(base, 0.07, 'sine', 0.07);
  }

  playGameOver(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    [180, 160, 140].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      g.gain.value = 0.06;
      const t0 = ctx.currentTime + i * 0.12;
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.2);
    });
  }
}
