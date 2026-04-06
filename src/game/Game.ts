import type { RigidBody } from '@dimforge/rapier2d-compat';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { GameAudio } from './Audio';
import { createCatMesh } from './Cat';
import { CameraRig, initialCameraY, stackBaselineY } from './CameraRig';
import {
  CENTER_BONUS_DIST,
  COMBO_CAP,
  FOREGROUND_Z,
  KILL_Y,
  OUT_X,
  REST_ANG_EPS,
  REST_FRAMES_NEEDED,
  REST_LIN_EPS,
} from './constants';
import { grappleAmplitudeForScore, grappleSpeedForScore } from './difficulty';
import { Grapple } from './Grapple';
import type { HUD } from './HUD';
import { Input } from './Input';
import { spawnLandBurst, updateParticles } from './Particles';
import { PhysicsWorld } from './PhysicsWorld';

type Placed = { mesh: Group; body: RigidBody };

export class Game {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: OrthographicCamera;
  private physics: PhysicsWorld;
  private cameraRig: CameraRig;
  private grapple: Grapple;
  private input: Input;
  private hud: HUD;
  private audio: GameAudio;
  private backgroundRoot: Group;
  private reducedMotion = false;

  private phase: 'playing' | 'paused' | 'gameover' = 'playing';
  private placed: Placed[] = [];
  private heldCat: Group | null = null;
  private pendingBody: RigidBody | null = null;
  private restFrames = 0;
  private score = 0;
  private combo = 0;
  private time = 0;
  private lastT = performance.now();
  private pendingMaxSpeed = 0;
  private shake = 0;

  constructor(canvas: HTMLCanvasElement, hud: HUD, app: HTMLElement) {
    this.hud = hud;
    this.audio = new GameAudio();
    hud.loadBest();

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.scene = new Scene();
    this.scene.fog = new Fog(0xff9a4a, 12, 52);

    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const frustum = 11;
    this.camera = new OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      80,
    );
    this.camera.position.set(0, initialCameraY(), 10);
    this.camera.lookAt(0, this.camera.position.y, 0);

    const ambient = new AmbientLight(0xffffff, 0.42);
    this.scene.add(ambient);
    const sun = new DirectionalLight(0xfff5e0, 1.45);
    sun.position.set(5, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0002;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    this.backgroundRoot = new Group();
    this.scene.add(this.backgroundRoot);
    this.addBackground();

    this.physics = new PhysicsWorld();
    this.cameraRig = new CameraRig();
    this.grapple = new Grapple();
    this.grapple.group.position.z = FOREGROUND_Z;
    this.grapple.group.traverse((o) => {
      if (o instanceof Mesh) o.renderOrder = 1;
    });
    this.scene.add(this.grapple.group);

    this.input = new Input(app);

    this.addBaseVisual();

    hud.setCallbacks(
      () => this.restart(),
      () => this.togglePause(),
      (muted) => {
        this.audio.setMuted(muted);
      },
    );

    window.addEventListener('keydown', this.onGlobalKey);
    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.restart();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onGlobalKey);
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.renderer.dispose();
  }

  private onGlobalKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      e.preventDefault();
      this.togglePause();
    }
  };

  private togglePause(): void {
    if (this.phase === 'gameover') return;
    this.phase = this.phase === 'paused' ? 'playing' : 'paused';
    this.hud.setPhase(this.phase);
  }

  private restart(): void {
    for (const p of this.placed) {
      this.physics.removeCat(p.body);
      this.scene.remove(p.mesh);
    }
    this.placed = [];
    if (this.heldCat) {
      this.scene.remove(this.heldCat);
      this.heldCat = null;
    }
    this.pendingBody = null;
    this.restFrames = 0;
    this.score = 0;
    this.combo = 0;
    this.time = 0;
    this.pendingMaxSpeed = 0;
    this.shake = 0;
    this.phase = 'playing';
    this.hud.setScore(0);
    this.hud.setPhase('playing');
    this.cameraRig.reset();
    this.camera.position.set(0, initialCameraY(), 10);
    this.camera.lookAt(0, this.camera.position.y, 0);
    this.spawnHeldCat();
  }

  private addBaseVisual(): void {
    const mat = new MeshStandardMaterial({ color: 0x6b5344, roughness: 0.82 });
    const top = new Mesh(new BoxGeometry(5.8, 0.15, 1.2), mat);
    top.position.set(0, 0.08, FOREGROUND_Z);
    top.receiveShadow = true;
    top.castShadow = true;
    top.renderOrder = 1;
    this.scene.add(top);

    const stripe = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
    const bar = new Mesh(new BoxGeometry(5.9, 0.22, 1.25), stripe);
    bar.position.set(0, -0.18, FOREGROUND_Z);
    bar.receiveShadow = true;
    bar.renderOrder = 1;
    this.scene.add(bar);
  }

  private addBackground(): void {
    const skyMat = new MeshStandardMaterial({
      color: 0xff7a3d,
      roughness: 1,
      emissive: 0x441800,
      emissiveIntensity: 0.12,
    });
    const sky = new Mesh(new PlaneGeometry(48, 28), skyMat);
    sky.position.set(0, 8, -14);
    sky.renderOrder = -10;
    this.backgroundRoot.add(sky);

    const cityMat = new MeshStandardMaterial({ color: 0xc84e20, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const w = 0.55 + Math.random() * 1.1;
      const h = 2.2 + Math.random() * 9;
      const b = new Mesh(new BoxGeometry(w, h, 0.45), cityMat);
      b.position.set(-12 + i * 1.75 + Math.random() * 0.35, h * 0.5 - 1.2, -12);
      b.renderOrder = -10;
      b.castShadow = true;
      this.backgroundRoot.add(b);
    }
  }

  private onResize = (): void => {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth;
    const h = Math.max(canvas.clientHeight, 1);
    const aspect = w / h;
    const frustum = 11;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private spawnHeldCat(): void {
    if (this.heldCat) return;
    const cat = createCatMesh();
    cat.position.z = FOREGROUND_Z;
    cat.traverse((o) => {
      if (o instanceof Mesh) o.renderOrder = 1;
    });
    this.scene.add(cat);
    this.heldCat = cat;
  }

  private grappleWorldY(): number {
    return this.camera.position.y + this.camera.top * 0.78;
  }

  private grappleX(): number {
    const sp = grappleSpeedForScore(this.score);
    const amp = grappleAmplitudeForScore(this.score);
    return Math.sin(this.time * sp) * amp;
  }

  private updateGrappleVisual(): void {
    const gx = this.grappleX();
    const gy = this.grappleWorldY();
    this.grapple.group.position.set(gx, gy, FOREGROUND_Z);
  }

  private syncPlacedMeshes(): void {
    for (const p of this.placed) {
      if (!p.body.isValid()) continue;
      const t = p.body.translation();
      const r = p.body.rotation();
      p.mesh.position.set(t.x, t.y, FOREGROUND_Z);
      p.mesh.rotation.z = r;
    }
  }

  private highestStackY(): number {
    let maxY = stackBaselineY();
    for (const p of this.placed) {
      if (!p.body.isValid()) continue;
      maxY = Math.max(maxY, p.body.translation().y + 0.35);
    }
    return maxY;
  }

  private tryDrop(): void {
    if (this.phase !== 'playing') return;
    if (this.pendingBody !== null) return;
    if (!this.heldCat) return;

    void this.audio.resume();
    this.audio.playDrop();

    const x = this.heldCat.position.x;
    const y = this.heldCat.position.y;
    const body = this.physics.spawnDynamicCat(x, y);
    this.placed.push({ mesh: this.heldCat, body });
    this.heldCat = null;
    this.pendingBody = body;
    this.restFrames = 0;
    this.pendingMaxSpeed = 0;
  }

  private updateHeldCat(): void {
    if (!this.heldCat) return;
    const gx = this.grappleX();
    const gy = this.grappleWorldY() + this.grapple.getDropOffsetY();
    this.heldCat.position.set(gx, gy, FOREGROUND_Z);
  }

  private checkFail(): boolean {
    const bodies = this.pendingBody
      ? [...this.placed.map((p) => p.body), this.pendingBody]
      : this.placed.map((p) => p.body);

    for (const b of bodies) {
      if (!b.isValid()) continue;
      const t = b.translation();
      if (t.y < KILL_Y) return true;
      if (Math.abs(t.x) > OUT_X) return true;
    }
    return false;
  }

  private addShake(amount: number): void {
    if (this.reducedMotion) return;
    this.shake = Math.min(0.55, this.shake + amount);
  }

  private applyCameraShake(dt: number): void {
    if (this.shake < 0.002) {
      this.shake = 0;
      this.camera.position.x = 0;
      return;
    }
    this.camera.position.x = (Math.random() - 0.5) * 2 * this.shake;
    this.shake *= Math.exp(-dt * 16);
  }

  private updateParallax(): void {
    const dy = this.camera.position.y - initialCameraY();
    this.backgroundRoot.position.y = dy * 0.075;
  }

  private updatePendingSettle(): void {
    if (!this.pendingBody || !this.pendingBody.isValid()) {
      this.pendingBody = null;
      return;
    }

    const lv = this.pendingBody.linvel();
    const speed = Math.hypot(lv.x, lv.y);
    const av = Math.abs(this.pendingBody.angvel());
    this.pendingMaxSpeed = Math.max(this.pendingMaxSpeed, speed);

    if (speed < REST_LIN_EPS && av < REST_ANG_EPS) {
      this.restFrames += 1;
    } else {
      this.restFrames = 0;
    }

    if (this.restFrames >= REST_FRAMES_NEEDED) {
      const t = this.pendingBody.translation();
      const centerX =
        this.placed.length >= 2
          ? this.placed[this.placed.length - 2]!.body.translation().x
          : 0;
      const dist = Math.abs(t.x - centerX);
      const centered = dist < CENTER_BONUS_DIST;

      let points = 1;
      if (centered) {
        this.combo += 1;
        points += 1;
        points += Math.min(this.combo - 1, COMBO_CAP);
      } else {
        this.combo = 0;
      }

      this.score += points;
      this.hud.setScore(this.score);
      this.hud.showToast(`+${points}`);

      const impact = this.pendingMaxSpeed;
      this.audio.playLand(impact);
      this.audio.playScore(points);

      if (!this.reducedMotion) {
        this.addShake(Math.min(0.38, 0.05 + impact * 0.022));
        spawnLandBurst(this.scene, t.x, t.y, FOREGROUND_Z, impact);
      }

      this.pendingBody = null;
      this.pendingMaxSpeed = 0;
      this.restFrames = 0;
      this.spawnHeldCat();
    }
  }

  private gameOver(): void {
    const prevBest = this.hud.getBest();
    this.phase = 'gameover';
    const best = this.hud.saveBestIfNeeded(this.score);
    const isNewBest = this.score > prevBest;
    this.hud.showGameOver(this.score, best, isNewBest);
    this.audio.playGameOver();
  }

  tick(): void {
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    dt = Math.min(dt, 0.1);

    if (this.phase === 'playing') {
      this.time += dt;
      this.updateGrappleVisual();
      this.updateHeldCat();

      if (this.input.consumeDrop()) {
        this.tryDrop();
      }

      this.physics.step();
      this.syncPlacedMeshes();

      if (this.checkFail()) {
        this.gameOver();
        this.camera.position.x = 0;
        this.cameraRig.setStackTopY(this.highestStackY());
        this.cameraRig.update(this.camera, dt);
        this.applyCameraShake(dt);
        this.updateParallax();
        updateParticles(this.scene, dt);
        this.renderer.render(this.scene, this.camera);
        return;
      }

      this.updatePendingSettle();
      this.cameraRig.setStackTopY(this.highestStackY());
      this.camera.position.x = 0;
      this.cameraRig.update(this.camera, dt);
      this.applyCameraShake(dt);
      this.updateParallax();
      updateParticles(this.scene, dt);
    } else if (this.phase === 'paused') {
      this.updateGrappleVisual();
      this.updateHeldCat();
      this.camera.position.x = 0;
      this.cameraRig.update(this.camera, dt);
      this.applyCameraShake(dt);
      this.updateParallax();
    } else {
      this.camera.position.x = 0;
      this.cameraRig.update(this.camera, dt);
      this.applyCameraShake(dt);
      this.updateParallax();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
