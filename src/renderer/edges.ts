/**
 * FlowCanvas Edge Renderer
 * 
 * Renders edges (connections) between nodes with arrows.
 * Handles forward, backward, and complex routing.
 */

import type { Point, BezierPath, Side } from '../types';

const EDGE_COLOR = '#94a3b8';
const EDGE_ACTIVE_COLOR = '#6366f1';
const ARROW_SIZE = 12;
const NODE_GAP = 8;

/**
 * Draw an edge between two nodes
 */
export function drawEdge(
    ctx: CanvasRenderingContext2D,
    path: BezierPath,
    active: boolean = false
): void {
    ctx.save();

    const color = active ? EDGE_ACTIVE_COLOR : EDGE_COLOR;

    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate start gap
    const startAngle = Math.atan2(path.cp1.y - path.start.y, path.cp1.x - path.start.x);
    const lineStart: Point = {
        x: path.start.x + Math.cos(startAngle) * NODE_GAP,
        y: path.start.y + Math.sin(startAngle) * NODE_GAP
    };

    // Calculate end gap (arrow tip)
    const endAngle = Math.atan2(path.end.y - path.cp2.y, path.end.x - path.cp2.x);

    // Calculate actual end point (retracted by gap)
    const arrowTip: Point = {
        x: path.end.x - Math.cos(endAngle) * NODE_GAP,
        y: path.end.y - Math.sin(endAngle) * NODE_GAP
    };

    // Calculate where the line should end
    const lineEnd: Point = {
        x: arrowTip.x - Math.cos(endAngle) * (ARROW_SIZE / 2),
        y: arrowTip.y - Math.sin(endAngle) * (ARROW_SIZE / 2)
    };

    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.bezierCurveTo(
        path.cp1.x, path.cp1.y,
        path.cp2.x, path.cp2.y,
        lineEnd.x, lineEnd.y
    );
    ctx.stroke();

    drawArrowHead(ctx, arrowTip, endAngle, color);

    ctx.restore();
}

/**
 * Draw an arrow head
 */
function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    tip: Point,
    angle: number,
    color: string
): void {
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(
        tip.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
        tip.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        tip.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
        tip.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

/**
 * Get a point along a bezier curve
 */
export function getBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
}

/**
 * Calculate the path points for an edge
 */
export function getEdgePath(
    from: Point,
    to: Point,
    offsetIndex: number = 0,
    fromSide: Side = 'right',
    toSide: Side = 'left'
): BezierPath {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Direction vectors for sides
    const getVector = (side: Side): Point => {
        switch (side) {
            case 'left': return { x: -1, y: 0 };
            case 'right': return { x: 1, y: 0 };
            case 'top': return { x: 0, y: -1 };
            case 'bottom': return { x: 0, y: 1 };
            default: return { x: 1, y: 0 };
        }
    };

    const startDir = getVector(fromSide);
    const endDir = getVector(toSide);

    // Calculate control point distance
    let controlDist = Math.min(dist * 0.5, 150);
    controlDist = Math.max(controlDist, 40);

    // If "Backward" (going against the grain), increase loop size
    const isBackward = (fromSide === 'right' && toSide === 'left' && dx < -20);
    if (isBackward) {
        controlDist = Math.max(Math.abs(dy) * 0.5 + 50, 100);
    }

    // Apply offset for parallel edges
    if (offsetIndex > 0) {
        controlDist += offsetIndex * 20;
    }

    return {
        start: from,
        cp1: { x: from.x + startDir.x * controlDist, y: from.y + startDir.y * controlDist },
        cp2: { x: to.x + endDir.x * controlDist, y: to.y + endDir.y * controlDist },
        end: to
    };
}
