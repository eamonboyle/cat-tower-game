import type { OrthographicCamera } from 'three';
import { PLATFORM_TOP_Y } from './constants';

const SMOOTH = 6;
const MIN_CENTER_Y = 3.2;
const ABOVE_STACK = 2.4;

export class CameraRig {
  private targetY = MIN_CENTER_Y;

  setStackTopY(worldY: number): void {
    const want = Math.max(MIN_CENTER_Y, worldY + ABOVE_STACK);
    this.targetY = want;
  }

  reset(): void {
    this.targetY = MIN_CENTER_Y;
  }

  update(camera: OrthographicCamera, dt: number): void {
    const k = 1 - Math.exp(-SMOOTH * dt);
    camera.position.y += (this.targetY - camera.position.y) * k;
    camera.lookAt(0, camera.position.y, 0);
  }
}

export function initialCameraY(): number {
  return MIN_CENTER_Y;
}

export function stackBaselineY(): number {
  return PLATFORM_TOP_Y + 0.35;
}
