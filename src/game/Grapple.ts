import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshToonMaterial,
  TorusGeometry,
} from 'three';
import {
  INK,
  LEMON,
  LEMON_DEEP,
  getSharedToonGradient,
} from './visualTheme';

export class Grapple {
  readonly group: Group;
  private readonly cable: Mesh;
  private readonly hook: Group;
  private cableLength = 3.2;

  constructor() {
    this.group = new Group();
    const gradientMap = getSharedToonGradient();

    const winchMat = new MeshToonMaterial({
      color: LEMON,
      gradientMap,
    });
    const bandMat = new MeshToonMaterial({
      color: LEMON_DEEP,
      gradientMap,
    });
    const darkMat = new MeshToonMaterial({
      color: INK,
      gradientMap,
    });

    const winch = new Mesh(new CylinderGeometry(0.22, 0.26, 0.28, 20), winchMat);
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, 0, 0);
    winch.castShadow = true;
    this.group.add(winch);

    const band = new Mesh(new CylinderGeometry(0.24, 0.28, 0.1, 20), bandMat);
    band.rotation.z = Math.PI / 2;
    band.position.set(0, 0, 0);
    band.castShadow = true;
    this.group.add(band);

    const cableGeo = new CylinderGeometry(0.045, 0.045, 1, 10);
    this.cable = new Mesh(cableGeo, darkMat);
    this.cable.position.set(0, -0.5, 0);
    this.group.add(this.cable);

    this.hook = new Group();
    const clawMat = new MeshToonMaterial({
      color: 0x8b7a9e,
      gradientMap,
    });
    const jaw = new Mesh(new BoxGeometry(0.14, 0.2, 0.08), clawMat);
    jaw.position.set(-0.08, -0.12, 0);
    this.hook.add(jaw);
    const jaw2 = new Mesh(new BoxGeometry(0.14, 0.2, 0.08), clawMat);
    jaw2.position.set(0.08, -0.12, 0);
    this.hook.add(jaw2);
    const ring = new Mesh(new TorusGeometry(0.1, 0.03, 10, 16), clawMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.06, 0);
    this.hook.add(ring);

    this.hook.position.set(0, -this.cableLength + 0.2, 0);
    this.group.add(this.hook);

    this.setCableLength(this.cableLength);
  }

  setCableLength(length: number): void {
    this.cableLength = length;
    this.cable.scale.set(1, length, 1);
    this.cable.position.y = -length * 0.5 - 0.1;
    this.hook.position.set(0, -length - 0.05, 0);
  }

  /** World-space attachment point under the hook (where cat center sits). */
  getDropOffsetY(): number {
    return -this.cableLength - 0.35;
  }
}
