import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';

const bodyGeo = new BoxGeometry(0.88, 0.52, 0.5);
const headGeo = new SphereGeometry(0.28, 12, 10);
const earGeo = new BoxGeometry(0.12, 0.18, 0.08);
const snoutGeo = new BoxGeometry(0.2, 0.14, 0.12);

function randomPastel(): Color {
  const h = Math.random();
  const s = 0.35 + Math.random() * 0.25;
  const l = 0.55 + Math.random() * 0.2;
  return new Color().setHSL(h, s, l);
}

/**
 * Procedural cat silhouette for stacking. Collider should match CAT_HALF_W / CAT_HALF_H in constants.
 */
export function createCatMesh(): Group {
  const fur = randomPastel();
  const dark = fur.clone().multiplyScalar(0.55);

  const group = new Group();

  const bodyMat = new MeshStandardMaterial({ color: fur, roughness: 0.65 });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0, 0);
  body.castShadow = true;
  group.add(body);

  const headMat = new MeshStandardMaterial({ color: fur, roughness: 0.6 });
  const head = new Mesh(headGeo, headMat);
  head.position.set(0.42, 0.22, 0);
  head.castShadow = true;
  group.add(head);

  const earMat = new MeshStandardMaterial({ color: dark, roughness: 0.7 });
  const earL = new Mesh(earGeo, earMat);
  earL.position.set(0.52, 0.48, 0.1);
  earL.castShadow = true;
  group.add(earL);
  const earR = new Mesh(earGeo, earMat);
  earR.position.set(0.52, 0.48, -0.1);
  earR.castShadow = true;
  group.add(earR);

  const snoutMat = new MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.8 });
  const snout = new Mesh(snoutGeo, snoutMat);
  snout.position.set(0.62, 0.12, 0);
  snout.castShadow = true;
  group.add(snout);

  const tailGeo = new BoxGeometry(0.1, 0.42, 0.1);
  const tail = new Mesh(tailGeo, earMat);
  tail.position.set(-0.48, -0.05, 0);
  tail.rotation.z = 0.45;
  tail.castShadow = true;
  group.add(tail);

  group.rotation.order = 'ZXY';
  return group;
}
