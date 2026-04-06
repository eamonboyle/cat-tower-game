import {
  BackSide,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
} from 'three';
import {
  BUBBLE_PINK_DEEP,
  FUR_PRESETS,
  INK,
  getSharedToonGradient,
} from './visualTheme';

const bodyGeo = new BoxGeometry(0.88, 0.52, 0.5);
const headGeo = new SphereGeometry(0.28, 20, 18);
const earGeo = new BoxGeometry(0.12, 0.18, 0.08);
const snoutGeo = new BoxGeometry(0.2, 0.14, 0.12);
const whiskerGeo = new CylinderGeometry(0.022, 0.022, 0.35, 6);

const POSES = [
  { head: [0.42, 0.22, 0] as const, tailZ: 0.45, tailY: -0.05 },
  { head: [0.4, 0.28, 0.05] as const, tailZ: 0.65, tailY: -0.12 },
  { head: [0.44, 0.18, -0.04] as const, tailZ: 0.35, tailY: 0.02 },
];

function randomFur(): Color {
  const hex = FUR_PRESETS[Math.floor(Math.random() * FUR_PRESETS.length)]!;
  return new Color(hex);
}

function addInkOutline(group: Group, mesh: Mesh, scale = 1.045): void {
  const outline = new Mesh(
    mesh.geometry,
    new MeshBasicMaterial({ color: INK, side: BackSide }),
  );
  outline.scale.setScalar(scale);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.castShadow = false;
  outline.receiveShadow = false;
  group.add(outline);
}

/**
 * Procedural cat silhouette for stacking. Collider stays axis-aligned box in physics.
 * Toy-box style: candy fur, chunky ink outlines, toon shading.
 */
export function createCatMesh(): Group {
  const fur = randomFur();
  const dark = fur.clone().multiplyScalar(0.62);
  dark.lerp(new Color(INK), 0.08);
  const pose = POSES[Math.floor(Math.random() * POSES.length)]!;
  const gradientMap = getSharedToonGradient();

  const group = new Group();

  const bodyMat = new MeshToonMaterial({
    color: fur,
    gradientMap,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0, 0);
  body.castShadow = true;
  addInkOutline(group, body, 1.042);
  group.add(body);

  const headMat = new MeshToonMaterial({
    color: fur,
    gradientMap,
  });
  const head = new Mesh(headGeo, headMat);
  head.position.set(pose.head[0], pose.head[1], pose.head[2]);
  head.castShadow = true;
  addInkOutline(group, head, 1.038);
  group.add(head);

  const earMat = new MeshToonMaterial({
    color: dark,
    gradientMap,
  });
  const earL = new Mesh(earGeo, earMat);
  earL.position.set(0.52, 0.48, 0.1);
  earL.castShadow = true;
  addInkOutline(group, earL, 1.06);
  group.add(earL);
  const earR = new Mesh(earGeo, earMat);
  earR.position.set(0.52, 0.48, -0.1);
  earR.castShadow = true;
  addInkOutline(group, earR, 1.06);
  group.add(earR);

  const snoutMat = new MeshToonMaterial({
    color: 0xfff5eb,
    gradientMap,
  });
  const snout = new Mesh(snoutGeo, snoutMat);
  snout.position.set(0.62, 0.12, 0);
  snout.castShadow = true;
  addInkOutline(group, snout, 1.08);
  group.add(snout);

  const eyeWhiteGeo = new SphereGeometry(0.072, 12, 10);
  const eyeWhiteMat = new MeshToonMaterial({
    color: 0xffffff,
    gradientMap,
  });
  const pupilGeo = new SphereGeometry(0.045, 10, 8);
  const pupilMat = new MeshToonMaterial({
    color: INK,
    gradientMap,
  });
  const glintGeo = new SphereGeometry(0.018, 6, 6);
  const glintMat = new MeshToonMaterial({ color: 0xffffff, gradientMap });

  for (const z of [0.12, -0.12]) {
    const ew = new Mesh(eyeWhiteGeo, eyeWhiteMat);
    ew.position.set(0.56, 0.26, z);
    group.add(ew);
    const p = new Mesh(pupilGeo, pupilMat);
    p.position.set(0.6, 0.27, z);
    group.add(p);
    const g = new Mesh(glintGeo, glintMat);
    g.position.set(0.62, 0.3, z + (z > 0 ? 0.02 : -0.02));
    group.add(g);
  }

  const cheekGeo = new SphereGeometry(0.055, 8, 8);
  const cheekMat = new MeshToonMaterial({
    color: BUBBLE_PINK_DEEP,
    gradientMap,
  });
  const cheekL = new Mesh(cheekGeo, cheekMat);
  cheekL.position.set(0.48, 0.1, 0.22);
  group.add(cheekL);
  const cheekR = new Mesh(cheekGeo, cheekMat);
  cheekR.position.set(0.48, 0.1, -0.22);
  group.add(cheekR);

  const whiskerMat = new MeshToonMaterial({
    color: INK,
    gradientMap,
  });
  for (let i = 0; i < 3; i++) {
    const w = new Mesh(whiskerGeo, whiskerMat);
    w.rotation.z = Math.PI / 2;
    w.rotation.y = (i - 1) * 0.15;
    w.position.set(0.72, 0.08 + i * 0.05, 0.14);
    group.add(w);
    const w2 = new Mesh(whiskerGeo, whiskerMat);
    w2.rotation.z = Math.PI / 2;
    w2.rotation.y = (i - 1) * 0.15;
    w2.position.set(0.72, 0.08 + i * 0.05, -0.14);
    group.add(w2);
  }

  const tailGeo = new BoxGeometry(0.1, 0.42, 0.1);
  const tail = new Mesh(tailGeo, earMat);
  tail.position.set(-0.48, pose.tailY, 0);
  tail.rotation.z = pose.tailZ;
  tail.castShadow = true;
  addInkOutline(group, tail, 1.06);
  group.add(tail);

  group.rotation.order = 'ZXY';
  return group;
}
