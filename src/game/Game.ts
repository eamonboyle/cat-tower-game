import type { RigidBody } from '@dimforge/rapier2d-compat';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { createCatMesh } from './Cat';
import { CameraRig, initialCameraY, stackBaselineY } from './CameraRig';
import {
  GRAPPLE_SPEED,
  GRAPPLE_X_AMPLITUDE,
  KILL_Y,
  OUT_X,
  REST_ANG_EPS,
  REST_FRAMES_NEEDED,
  REST_LIN_EPS,
} from './constants';
import { Grapple } from './Grapple';
import type { HUD } from './HUD';
import { Input } from './Input';
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

  private phase: 'playing' | 'paused' | 'gameover' = 'playing';
  private placed: Placed[] = [];
  private heldCat: Group | null = null;
  private pendingBody: RigidBody | null = null;
  private restFrames = 0;
  private score = 0;
  private time = 0;
  private lastT = performance.now();

  constructor(canvas: HTMLCanvasElement, hud: HUD) {
    this.hud = hud;
    hud.loadBest();

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xff9a4a, 1);
    this.renderer.shadowMap.enabled = true;

    this.scene = new Scene();
    this.scene.background = new Color(0xff9a4a);

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

    const ambient = new AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const sun = new DirectionalLight(0xfff2dc, 1.1);
    sun.position.set(4, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    this.scene.add(sun);

    this.addBackground();

    this.physics = new PhysicsWorld();
    this.cameraRig = new CameraRig();
    this.grapple = new Grapple();
    this.grapple.group.position.z = 0.15;
    this.grapple.group.traverse((o) => {
      if (o instanceof Mesh) o.renderOrder = 1;
    });
    this.scene.add(this.grapple.group);

    this.input = new Input(canvas);

    this.addBaseVisual();

    hud.setCallbacks(
      () => this.restart(),
      () => this.togglePause(),
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
    this.time = 0;
    this.phase = 'playing';
    this.hud.setScore(0);
    this.hud.setPhase('playing');
    this.cameraRig.reset();
    this.camera.position.y = initialCameraY();
    this.camera.lookAt(0, this.camera.position.y, 0);
    this.spawnHeldCat();
  }

  private addBaseVisual(): void {
    const mat = new MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.9 });
    const top = new Mesh(new BoxGeometry(5.8, 0.15, 1.2), mat);
    top.position.set(0, 0.08, 0.15);
    top.receiveShadow = true;
    top.castShadow = true;
    top.renderOrder = 1;
    this.scene.add(top);

    const stripe = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
    const bar = new Mesh(new BoxGeometry(5.9, 0.22, 1.25), stripe);
    bar.position.set(0, -0.18, 0.15);
    bar.receiveShadow = true;
    bar.renderOrder = 1;
    this.scene.add(bar);
  }

  private addBackground(): void {
    const skyMat = new MeshStandardMaterial({
      color: 0xff7a3d,
      roughness: 1,
      emissive: 0x331100,
      emissiveIntensity: 0.15,
    });
    const sky = new Mesh(new PlaneGeometry(40, 24), skyMat);
    sky.position.set(0, 8, -14);
    sky.renderOrder = -10;
    this.scene.add(sky);

    const cityMat = new MeshStandardMaterial({ color: 0xd45a28, roughness: 1 });
    for (let i = 0; i < 12; i++) {
      const w = 0.6 + Math.random() * 1.2;
      const h = 2 + Math.random() * 8;
      const b = new Mesh(new BoxGeometry(w, h, 0.4), cityMat);
      b.position.set(-10 + i * 1.8 + Math.random() * 0.3, h * 0.5 - 1, -12);
      b.renderOrder = -10;
      this.scene.add(b);
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
    cat.position.z = 0.15;
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
    return Math.sin(this.time * GRAPPLE_SPEED) * GRAPPLE_X_AMPLITUDE;
  }

  private updateGrappleVisual(): void {
    const gx = this.grappleX();
    const gy = this.grappleWorldY();
    this.grapple.group.position.set(gx, gy, 0.15);
  }

  private syncPlacedMeshes(): void {
    for (const p of this.placed) {
      if (!p.body.isValid()) continue;
      const t = p.body.translation();
      const r = p.body.rotation();
      p.mesh.position.set(t.x, t.y, 0.15);
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

    const x = this.heldCat.position.x;
    const y = this.heldCat.position.y;
    const body = this.physics.spawnDynamicCat(x, y);
    this.placed.push({ mesh: this.heldCat, body });
    this.heldCat = null;
    this.pendingBody = body;
    this.restFrames = 0;
  }

  private updateHeldCat(): void {
    if (!this.heldCat) return;
    const gx = this.grappleX();
    const gy = this.grappleWorldY() + this.grapple.getDropOffsetY();
    this.heldCat.position.set(gx, gy, 0);
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

  private updatePendingSettle(): void {
    if (!this.pendingBody || !this.pendingBody.isValid()) {
      this.pendingBody = null;
      return;
    }

    const lv = this.pendingBody.linvel();
    const speed = Math.hypot(lv.x, lv.y);
    const av = Math.abs(this.pendingBody.angvel());

    if (speed < REST_LIN_EPS && av < REST_ANG_EPS) {
      this.restFrames += 1;
    } else {
      this.restFrames = 0;
    }

    if (this.restFrames >= REST_FRAMES_NEEDED) {
      this.score += 1;
      this.hud.setScore(this.score);
      this.pendingBody = null;
      this.restFrames = 0;
      this.spawnHeldCat();
    }
  }

  private gameOver(): void {
    this.phase = 'gameover';
    const best = this.hud.saveBestIfNeeded(this.score);
    this.hud.showGameOver(this.score, best);
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
        this.cameraRig.setStackTopY(this.highestStackY());
        this.cameraRig.update(this.camera, dt);
        this.renderer.render(this.scene, this.camera);
        return;
      }

      this.updatePendingSettle();
      this.cameraRig.setStackTopY(this.highestStackY());
      this.cameraRig.update(this.camera, dt);
    } else if (this.phase === 'paused') {
      this.updateGrappleVisual();
      this.updateHeldCat();
      this.cameraRig.update(this.camera, dt);
    } else {
      this.cameraRig.update(this.camera, dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
