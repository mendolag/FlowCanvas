/**
 * FlowCanvas Node Shapes Library
 * 
 * Provides generators for "downloaded" standard shapes.
 * These functions generate pixel-perfect SVG paths for specific dimensions without distortion.
 */

import type { NodeType } from '../types';

/**
 * Generate a rounded rectangle path (Service)
 */
function getServicePath(width: number, height: number): string {
    const r = 8; // Fixed corner radius
    const w = width;
    const h = height;
    // Standard SVG path for rounded rect
    return `
        M ${r} 0 
        H ${w - r} 
        Q ${w} 0 ${w} ${r} 
        V ${h - r} 
        Q ${w} ${h} ${w - r} ${h} 
        H ${r} 
        Q 0 ${h} 0 ${h - r} 
        V ${r} 
        Q 0 0 ${r} 0 
        Z
    `;
}

/**
 * Generate a pill/pipe path (Topic)
 */
function getTopicPath(width: number, height: number): string {
    const r = height / 2; // Radius is half height for perfect semicircles
    const w = width;
    const h = height;

    // Left arc + Top line + Right arc + Bottom line
    return `
        M ${r} 0
        H ${w - r}
        A ${r} ${r} 0 0 1 ${w - r} ${h}
        H ${r}
        A ${r} ${r} 0 0 1 ${r} 0
        Z
    `;
    // Note: We also need internal lines for the "pipe" effect, but strictly the shape contour is this.
    // The renderer might draw extra details on top.
}

/**
 * Generate a cylinder path (Database)
 */
function getDatabasePath(width: number, height: number): string {
    const rx = width / 2;
    const ry = 10; // Vertical radius for the ellipses (perspective)
    const h = height;

    // Cylinder body + bottom ellipse
    // Use cubic beziers for ellipses approx if needed, or A commands
    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y

    // Outline: Left vertical -> Bottom Arc -> Right vertical -> Top Arc
    return `
        M 0 ${ry}
        V ${h - ry}
        A ${rx} ${ry} 0 0 0 ${width} ${h - ry}
        V ${ry}
        A ${rx} ${ry} 0 0 0 0 ${ry}
        Z
        
        M 0 ${ry}
        A ${rx} ${ry} 0 0 1 ${width} ${ry}
        A ${rx} ${ry} 0 0 1 0 ${ry}
    `;
    // This creates the full outline + the top lid.
    // The previous implementation had 3 parts: body, top, bottom.
    // A single path is cleaner for fill, but we might want the stroke on top.
}

/**
 * Generate a hexagon path (Processor)
 */
function getProcessorPath(width: number, height: number): string {
    const w = width;
    const h = height;
    const offset = w * 0.15; // 15% offset for pointy ends

    return `
        M ${offset} 0
        H ${w - offset}
        L ${w} ${h / 2}
        L ${w - offset} ${h}
        H ${offset}
        L 0 ${h / 2}
        Z
    `;
}

/**
 * Generate a cloud path (External)
 */
function getCloudPath(width: number, height: number): string {
    const w = width;
    const h = height;

    // Proportional sizing for cloud bumps
    const bumpR = h * 0.4;

    // A nice simple cloud shape made of 3-4 arcs
    // Start bottom-left
    return `
        M ${w * 0.2} ${h * 0.8}
        
        // Bottom-Left to Bottom-Right Line (flat base)
        L ${w * 0.8} ${h * 0.8}
        
        // Right Bump
        A ${bumpR * 0.8} ${bumpR * 0.8} 0 0 0 ${w} ${h * 0.5}
        
        // Top-Right Bump (large)
        A ${bumpR} ${bumpR} 0 0 0 ${w * 0.6} 0
        
        // Top-Left Bump (medium)
        A ${bumpR * 0.8} ${bumpR * 0.8} 0 0 0 ${w * 0.2} ${h * 0.3}
        
        // Left Bump
        A ${bumpR * 0.7} ${bumpR * 0.7} 0 0 0 ${w * 0.2} ${h * 0.8}
        
        Z
    `;
}

// Map node types to generator functions
const SHAPE_GENERATORS: Record<NodeType, (w: number, h: number) => string> = {
    service: getServicePath,
    topic: getTopicPath,
    db: getDatabasePath,
    processor: getProcessorPath,
    external: getCloudPath
};

/**
 * Draw a shape defined by an SVG path string, parameterized for dimensions.
 */
export function drawShape(
    ctx: CanvasRenderingContext2D,
    nodeType: NodeType,
    x: number, // Center x
    y: number, // Center y
    width: number,
    height: number,
    colors: { fill: string; stroke: string }
): void {
    const generator = SHAPE_GENERATORS[nodeType] || getServicePath;
    const pathString = generator(width, height);

    if (!pathString) return;

    ctx.save();

    // Translate to center so we can draw relative to top-left (-w/2, -h/2)
    ctx.translate(x, y);
    ctx.translate(-width / 2, -height / 2);

    const path = new Path2D(pathString);

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Fill
    ctx.fillStyle = colors.fill;
    ctx.fill(path);

    // Reset shadow for stroke
    ctx.shadowColor = 'transparent';

    // Stroke
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.5; // Fixed fine line width
    ctx.stroke(path);

    ctx.restore();
}
