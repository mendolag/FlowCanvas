
/**
 * Polyfill for CanvasRenderingContext2D.roundRect
 * Required for older browsers (e.g., Safari < 16, Chrome < 99)
 */
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (
        x: number,
        y: number,
        w: number,
        h: number,
        radii: number | DOMPointInit | (number | DOMPointInit)[] = 0
    ) {
        if (typeof radii === 'number') {
            radii = { x: radii, y: radii };
        } else if (Array.isArray(radii)) {
            // Simplified: use first radius for all corners if array
            const r = typeof radii[0] === 'number' ? radii[0] : (radii[0] as DOMPointInit)?.x || 0;
            radii = { x: r, y: r };
        }

        // Default to 0 if something went wrong
        const r = (radii as DOMPointInit).x || 0;

        // Clamp radius
        const maxRadius = Math.min(Math.abs(w), Math.abs(h)) / 2;
        const radius = Math.min(Math.max(r, 0), maxRadius);

        this.moveTo(x + radius, y);
        this.lineTo(x + w - radius, y);
        this.quadraticCurveTo(x + w, y, x + w, y + radius);
        this.lineTo(x + w, y + h - radius);
        this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        this.lineTo(x + radius, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
    };
}
