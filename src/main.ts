import './style.css';
import RAPIER from '@dimforge/rapier2d-compat';
import { Game } from './game/Game';
import { HUD } from './game/HUD';
import { readMenuBest } from './menuBest';

async function main(): Promise<void> {
  await RAPIER.init();

  const app = document.querySelector<HTMLElement>('#app');
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const mainMenu = document.querySelector<HTMLElement>('#main-menu');
  const btnPlay = document.querySelector<HTMLButtonElement>('#btn-play');
  const menuBestEl = document.querySelector<HTMLElement>('#menu-best');

  if (!app || !canvas || !mainMenu) {
    throw new Error('Missing #app, #game-canvas, or #main-menu');
  }

  if (menuBestEl) {
    menuBestEl.textContent = String(readMenuBest());
  }

  const showMainMenu = (): void => {
    app.classList.add('app--menu');
    mainMenu.hidden = false;
    mainMenu.removeAttribute('aria-hidden');
    canvas.inert = true;
    canvas.tabIndex = -1;
  };

  const hud = new HUD(app);
  const game = new Game(canvas, hud, app, () => {
    showMainMenu();
    hud.loadBest();
    btnPlay?.focus();
  });

  const loop = (): void => {
    game.tick();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  btnPlay?.addEventListener('click', () => {
    app.classList.remove('app--menu');
    mainMenu.hidden = true;
    mainMenu.setAttribute('aria-hidden', 'true');
    canvas.removeAttribute('inert');
    canvas.tabIndex = 0;
    game.start();
    canvas.focus();
  });
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:1rem;color:#fff">Failed to start: ${String(err)}</p>`;
});
