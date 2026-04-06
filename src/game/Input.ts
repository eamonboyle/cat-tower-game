/**
 * Drop: Space, or pointer down anywhere except UI controls (buttons, panels).
 */
export class Input {
  dropPressed = false;
  private root: HTMLElement;
  private onPointerDown: (e: PointerEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      const menu = this.root.querySelector('#main-menu') as HTMLElement | null;
      if (menu && !menu.hidden) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('button, [data-no-drop], .overlay, #main-menu')) {
        return;
      }
      this.dropPressed = true;
    };
    this.onKeyDown = (e: KeyboardEvent): void => {
      const menu = this.root.querySelector('#main-menu') as HTMLElement | null;
      if (menu && !menu.hidden) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.dropPressed = true;
      }
    };
    root.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
  }

  dispose(): void {
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  consumeDrop(): boolean {
    const v = this.dropPressed;
    this.dropPressed = false;
    return v;
  }
}
