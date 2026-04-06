export class Input {
  dropPressed = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  consumeDrop(): boolean {
    const v = this.dropPressed;
    this.dropPressed = false;
    return v;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (e.target !== this.canvas) return;
    this.dropPressed = true;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.dropPressed = true;
    }
  };
}
