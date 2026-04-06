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
- [ ] Mobile safe-area tweaks (optional)
- [ ] Sound effects (optional)
