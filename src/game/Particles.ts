import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
  Scene,
} from 'three';

type Burst = { t: number; points: Points; life: number; vel: Float32Array };

const bursts: Burst[] = [];

export function spawnLandBurst(
  scene: Scene,
  x: number,
  y: number,
  z: number,
  intensity: number,
): void {
  const n = Math.min(28, 10 + Math.floor(intensity * 0.6));
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const c = new Color();
  for (let i = 0; i < n; i++) {
    positions[i * 3] = x + (Math.random() - 0.5) * 0.35;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.15;
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.15;
    vel[i * 3] = (Math.random() - 0.5) * 2.2;
    vel[i * 3 + 1] = 1.2 + Math.random() * 2.5;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    const hueRoll = Math.random();
    if (hueRoll < 0.33) {
      c.setHSL(0.92 + Math.random() * 0.06, 0.75, 0.58 + Math.random() * 0.15);
    } else if (hueRoll < 0.66) {
      c.setHSL(0.55 + Math.random() * 0.08, 0.8, 0.55 + Math.random() * 0.12);
    } else {
      c.setHSL(0.08 + Math.random() * 0.06, 0.88, 0.55 + Math.random() * 0.15);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  const mat = new PointsMaterial({
    size: 0.11 + intensity * 0.003,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const pts = new Points(geo, mat);
  pts.renderOrder = 5;
  scene.add(pts);
  bursts.push({ t: 0, points: pts, life: 0.55, vel });
}

export function clearAllParticles(scene: Scene): void {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    const g = b.points.geometry as BufferGeometry;
    const mat = b.points.material as PointsMaterial;
    scene.remove(b.points);
    g.dispose();
    mat.dispose();
    bursts.splice(i, 1);
  }
}

export function updateParticles(scene: Scene, dt: number): void {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.t += dt;
    const g = b.points.geometry as BufferGeometry;
    const pos = g.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let j = 0; j < arr.length; j += 3) {
      arr[j] += b.vel[j] * dt;
      arr[j + 1] += b.vel[j + 1] * dt;
      arr[j + 2] += b.vel[j + 2] * dt;
    }
    pos.needsUpdate = true;
    const mat = b.points.material as PointsMaterial;
    mat.opacity = Math.max(0, 0.95 * (1 - b.t / b.life));
    if (b.t >= b.life) {
      scene.remove(b.points);
      g.dispose();
      mat.dispose();
      bursts.splice(i, 1);
    }
  }
}
