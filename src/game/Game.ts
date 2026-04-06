import type { RigidBody } from '@dimforge/rapier2d-compat';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { GameAudio } from './Audio';
import { createCatMesh } from './Cat';
import { CameraRig, initialCameraY, stackBaselineY } from './CameraRig';
import {
  CAT_HALF_H,
  CENTER_BONUS_DIST,
  COMBO_CAP,
  FOREGROUND_Z,
  KILL_Y,
  MIN_STACK_RISE,
  OUT_X,
  PLATFORM_TOP_Y,
  REST_ANG_EPS,
  REST_FRAMES_NEEDED,
  REST_LIN_EPS,
} from './constants';
import { grappleAmplitudeForScore, grappleSpeedForScore } from './difficulty';
import { Grapple } from './Grapple';
import type { HUD } from './HUD';
import { Input } from './Input';
import { clearAllParticles, spawnLandBurst, updateParticles } from './Particles';
import { PhysicsWorld } from './PhysicsWorld';
import {
  BUILDING_PRESETS,
  INK,
  LEMON_DEEP,
  MINT_DEEP,
  SKY,
} from './visualTheme';

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
  private hasStarted = false;
  private notifyQuitToMainMenu?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    hud: HUD,
    app: HTMLElement,
    notifyQuitToMainMenu?: () => void,
  ) {
    this.notifyQuitToMainMenu = notifyQuitToMainMenu;
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
    this.scene.fog = new Fog(0xc4e9ff, 10, 48);

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

    const ambient = new AmbientLight(0xf0f4ff, 0.55);
    this.scene.add(ambient);
    const sun = new DirectionalLight(0xfff8e8, 1.35);
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
      () => this.leaveToMainMenu(),
    );

    window.addEventListener('keydown', this.onGlobalKey);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  /** Begin first run (call from main menu after Play). */
  start(): void {
    if (this.hasStarted) return;
    this.hasStarted = true;
    this.lastT = performance.now();
    this.input.consumeDrop();
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
      if (!this.hasStarted) return;
      e.preventDefault();
      this.togglePause();
    }
  };

  private togglePause(): void {
    if (!this.hasStarted) return;
    if (this.phase === 'gameover') return;
    this.phase = this.phase === 'paused' ? 'playing' : 'paused';
    this.hud.setPhase(this.phase);
  }

  /** Clear stack and reset run state without spawning a new cat (used when leaving to main menu). */
  private clearRun(): void {
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
    this.camera.position.x = 0;
    this.camera.lookAt(0, this.camera.position.y, 0);
  }

  private restart(): void {
    this.clearRun();
    this.spawnHeldCat();
  }

  private leaveToMainMenu(): void {
    if (!this.hasStarted) return;
    this.clearRun();
    clearAllParticles(this.scene);
    this.hasStarted = false;
    this.lastT = performance.now();
    this.input.consumeDrop();
    this.notifyQuitToMainMenu?.();
  }

  private addBaseVisual(): void {
    const topMat = new MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.55,
      metalness: 0.05,
    });
    const top = new Mesh(new BoxGeometry(5.8, 0.15, 1.2), topMat);
    top.position.set(0, 0.08, FOREGROUND_Z);
    top.receiveShadow = true;
    top.castShadow = true;
    top.renderOrder = 1;
    this.scene.add(top);

    const rimMat = new MeshStandardMaterial({
      color: MINT_DEEP,
      roughness: 0.45,
    });
    const rim = new Mesh(new BoxGeometry(5.95, 0.06, 1.32), rimMat);
    rim.position.set(0, 0.01, FOREGROUND_Z);
    rim.receiveShadow = true;
    rim.castShadow = true;
    rim.renderOrder = 1;
    this.scene.add(rim);

    const barMat = new MeshStandardMaterial({
      color: INK,
      roughness: 0.75,
    });
    const bar = new Mesh(new BoxGeometry(5.9, 0.22, 1.25), barMat);
    bar.position.set(0, -0.18, FOREGROUND_Z);
    bar.receiveShadow = true;
    bar.renderOrder = 1;
    this.scene.add(bar);

    const stripeMat = new MeshStandardMaterial({
      color: LEMON_DEEP,
      roughness: 0.5,
      emissive: LEMON_DEEP,
      emissiveIntensity: 0.08,
    });
    const stripe = new Mesh(new BoxGeometry(5.92, 0.04, 1.26), stripeMat);
    stripe.position.set(0, -0.29, FOREGROUND_Z);
    stripe.receiveShadow = true;
    stripe.renderOrder = 1;
    this.scene.add(stripe);
  }

  private addBackground(): void {
    const skyUniforms = {
      topColor: { value: new Color(0xbae6fd) },
      bottomColor: { value: new Color(0xfbcfe8) },
    };
    const skyMat = new ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          vec3 c = mix(bottomColor, topColor, vUv.y);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      side: DoubleSide,
    });
    const sky = new Mesh(new PlaneGeometry(48, 28), skyMat);
    sky.position.set(0, 8, -14);
    sky.renderOrder = -10;
    this.backgroundRoot.add(sky);

    for (let i = 0; i < 14; i++) {
      const w = 0.55 + Math.random() * 1.1;
      const h = 2.2 + Math.random() * 9;
      const pastel = BUILDING_PRESETS[i % BUILDING_PRESETS.length]!;
      const cityMat = new MeshStandardMaterial({
        color: pastel,
        roughness: 0.88,
        metalness: 0.02,
      });
      const b = new Mesh(new BoxGeometry(w, h, 0.45), cityMat);
      b.position.set(-12 + i * 1.75 + Math.random() * 0.35, h * 0.5 - 1.2, -12);
      b.renderOrder = -10;
      b.castShadow = true;
      this.backgroundRoot.add(b);
    }

    const groundMat = new MeshStandardMaterial({
      color: new Color(SKY).multiplyScalar(0.55),
      roughness: 1,
    });
    const ground = new Mesh(new PlaneGeometry(56, 14), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -2.4, -12);
    ground.renderOrder = -11;
    this.backgroundRoot.add(ground);
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
      const pending = this.pendingBody;
      const t = pending.translation();
      const others = this.placed.filter((p) => p.body !== pending);
      const newTop = t.y + CAT_HALF_H;
      let maxOtherTop = PLATFORM_TOP_Y;
      for (const p of others) {
        maxOtherTop = Math.max(maxOtherTop, p.body.translation().y + CAT_HALF_H);
      }
      const isFirstCat = others.length === 0;
      const validStack =
        isFirstCat || newTop >= maxOtherTop + MIN_STACK_RISE;

      if (!validStack) {
        this.pendingBody = null;
        this.pendingMaxSpeed = 0;
        this.restFrames = 0;
        this.gameOver();
        return;
      }

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
    if (!this.hasStarted) {
      return;
    }

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
