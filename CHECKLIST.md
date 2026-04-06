# Cat Tower — implementation checklist

## Phase 1 — Scaffold

- [x] Vite + TypeScript project
- [x] Dependencies: `three`, `@dimforge/rapier2d-compat`, `@types/three`
- [x] `CHECKLIST.md` created

## Phase 2 — Scene & camera

- [x] WebGL renderer, resize handling
- [x] Orthographic camera (side view)
- [x] Lights + background / simple environment

## Phase 3 — Physics

- [x] Await `RAPIER.init()` before world creation
- [x] Rapier 2D world with gravity
- [x] Static base platform + optional ground
- [x] Mesh ↔ rigid body sync for placed cats

## Phase 4 — Grapple & drop

- [x] Grapple ping-pong horizontal motion
- [x] Held cat (visual only) follows grapple until drop
- [x] Click / Space to drop → spawn dynamic body at release position
- [x] Rest detection (velocity thresholds + frame count) before next cat

## Phase 5 — Rules & persistence

- [x] Score increments on successful settle
- [x] Best score in `localStorage`
- [x] Game over (fall below kill line or off sides)
- [x] Restart clears stack and resets run

## Phase 6 — HUD & polish

- [x] Score + best display
- [x] Pause (button + Escape) and overlay
- [x] Game over panel + restart
- [x] Procedural cat meshes (body / head / ears)
- [x] Camera follow stack (smooth)
- [x] Mobile safe-area tweaks (optional)
- [x] Sound effects (optional)

## Phase 7 — Polish roadmap

- [x] Held-cat depth / HUD overlay accessibility (`inert`, `aria-hidden`)
- [x] Screen shake, particles on land, Web Audio SFX, mute, reduced-motion guard
- [x] Difficulty ramp; centered bonus + combo scoring; score toasts
- [x] PCF soft shadows, fog, parallax background, toon cats + eyes/whiskers
- [x] Nunito typography, score pills, pause SVG, hint bar, pause restart, safe-area CSS

## Phase 8 — Main menu

- [x] Full-screen main menu with hero (`public/menu-hero.svg`), Play, best score, mute
- [x] Defer `Game.restart()` / `tick()` until Play; `#app.app--menu` hides gameplay HUD
- [x] `Game.start()`, `hasStarted`, input/menu guards
