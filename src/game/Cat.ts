import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshToonMaterial,
  SphereGeometry,
} from 'three';

const bodyGeo = new BoxGeometry(0.88, 0.52, 0.5);
const headGeo = new SphereGeometry(0.28, 12, 10);
const earGeo = new BoxGeometry(0.12, 0.18, 0.08);
const snoutGeo = new BoxGeometry(0.2, 0.14, 0.12);
const whiskerGeo = new CylinderGeometry(0.02, 0.02, 0.35, 4);

function randomPastel(): Color {
  const h = Math.random();
  const s = 0.38 + Math.random() * 0.22;
  const l = 0.52 + Math.random() * 0.18;
  return new Color().setHSL(h, s, l);
}

const POSES = [
  { head: [0.42, 0.22, 0] as const, tailZ: 0.45, tailY: -0.05 },
  { head: [0.4, 0.28, 0.05] as const, tailZ: 0.65, tailY: -0.12 },
  { head: [0.44, 0.18, -0.04] as const, tailZ: 0.35, tailY: 0.02 },
];

/**
 * Procedural cat silhouette for stacking. Collider stays axis-aligned box in physics.
 */
export function createCatMesh(): Group {
  const fur = randomPastel();
  const dark = fur.clone().multiplyScalar(0.5);
  const pose = POSES[Math.floor(Math.random() * POSES.length)]!;

  const group = new Group();

  const bodyMat = new MeshToonMaterial({ color: fur });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0, 0);
  body.castShadow = true;
  group.add(body);

  const headMat = new MeshToonMaterial({ color: fur });
  const head = new Mesh(headGeo, headMat);
  head.position.set(pose.head[0], pose.head[1], pose.head[2]);
  head.castShadow = true;
  group.add(head);

  const earMat = new MeshToonMaterial({ color: dark });
  const earL = new Mesh(earGeo, earMat);
  earL.position.set(0.52, 0.48, 0.1);
  earL.castShadow = true;
  group.add(earL);
  const earR = new Mesh(earGeo, earMat);
  earR.position.set(0.52, 0.48, -0.1);
  earR.castShadow = true;
  group.add(earR);

  const snoutMat = new MeshToonMaterial({
    color: 0xfff5eb,
    emissive: 0x332211,
    emissiveIntensity: 0.08,
  });
  const snout = new Mesh(snoutGeo, snoutMat);
  snout.position.set(0.62, 0.12, 0);
  snout.castShadow = true;
  group.add(snout);

  const eyeMat = new MeshToonMaterial({ color: 0x1a1510 });
  const eyeGeo = new SphereGeometry(0.06, 8, 8);
  const eyeL = new Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.58, 0.26, 0.12);
  group.add(eyeL);
  const eyeR = new Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.58, 0.26, -0.12);
  group.add(eyeR);

  const whiskerMat = new MeshToonMaterial({ color: 0xeeeeee });
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
  group.add(tail);

  group.rotation.order = 'ZXY';
  return group;
}
