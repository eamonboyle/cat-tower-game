import './style.css';
import RAPIER from '@dimforge/rapier2d-compat';
import { Game } from './game/Game';
import { HUD } from './game/HUD';

async function main(): Promise<void> {
  await RAPIER.init();

  const app = document.querySelector<HTMLElement>('#app');
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!app || !canvas) {
    throw new Error('Missing #app or #game-canvas');
  }

  canvas.focus();

  // HUD queries overlays (#pause-overlay, #gameover) that are siblings of #hud under #app.
  const hud = new HUD(app);
  const game = new Game(canvas, hud);

  const loop = (): void => {
    game.tick();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:1rem;color:#fff">Failed to start: ${String(err)}</p>`;
});
