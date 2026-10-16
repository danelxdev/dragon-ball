// Teclado (WASD / flechas) y joystick táctil virtual.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.joy = null; // { ox, oy, x, y, id }
    this.onKey = null;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (this.onKey) this.onKey(k, e);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      canvas.setPointerCapture(e.pointerId);
      this.joy = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.joy && e.pointerId === this.joy.id) {
        this.joy.x = e.clientX;
        this.joy.y = e.clientY;
      }
    });
    const end = (e) => {
      if (this.joy && e.pointerId === this.joy.id) this.joy = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  axis() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (this.joy) {
      const dx = this.joy.x - this.joy.ox;
      const dy = this.joy.y - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const m = Math.min(1, d / 50);
        x = (dx / d) * m;
        y = (dy / d) * m;
        return { x, y };
      }
    }
    const d = Math.hypot(x, y);
    if (d > 0) {
      x /= d;
      y /= d;
    }
    return { x, y };
  }
}
