import RAPIER, { type RigidBody } from '@dimforge/rapier2d-compat';
import {
  CAT_PHYSICS_HALF_H,
  CAT_PHYSICS_HALF_W,
  CAT_PHYSICS_OFFSET_X,
  CAT_PHYSICS_OFFSET_Y,
  GRAVITY,
  PHYSICS_DT,
  PLATFORM_HALF_HEIGHT,
  PLATFORM_HALF_WIDTH,
  PLATFORM_TOP_Y,
} from './constants';

export class PhysicsWorld {
  readonly world: RAPIER.World;
  readonly baseBody: RigidBody;

  constructor() {
    this.world = new RAPIER.World(GRAVITY);
    this.world.integrationParameters.dt = PHYSICS_DT;

    const baseDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      0,
      PLATFORM_TOP_Y - PLATFORM_HALF_HEIGHT,
    );
    this.baseBody = this.world.createRigidBody(baseDesc);
    const baseCollider = RAPIER.ColliderDesc.cuboid(
      PLATFORM_HALF_WIDTH,
      PLATFORM_HALF_HEIGHT,
    )
      .setFriction(1.35)
      .setRestitution(0.02);
    this.world.createCollider(baseCollider, this.baseBody);
  }

  spawnDynamicCat(x: number, y: number): RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setLinearDamping(0.28)
      .setAngularDamping(2.2);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      CAT_PHYSICS_HALF_W,
      CAT_PHYSICS_HALF_H,
    )
      .setTranslation(CAT_PHYSICS_OFFSET_X, CAT_PHYSICS_OFFSET_Y)
      .setFriction(1.45)
      .setRestitution(0.04);
    this.world.createCollider(colliderDesc, body);
    return body;
  }

  step(): void {
    this.world.step();
  }

  removeCat(body: RigidBody): void {
    if (!body.isValid()) return;
    this.world.removeRigidBody(body);
  }
}
