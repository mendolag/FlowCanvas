/**
 * FlowCanvas Edge Renderer
 * 
 * Renders edges (connections) between nodes with arrows.
 * Handles forward, backward, and complex routing.
 */

const EDGE_COLOR = '#94a3b8';
const EDGE_ACTIVE_COLOR = '#6366f1';
const ARROW_SIZE = 12; // Increased from 8
const NODE_GAP = 8;    // Gap between arrow tip and node

/**
 * Draw an edge between two nodes
 * Draw an edge
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} path - Pre-calculated path object
 * @param {boolean} active - Whether the edge is active
 */
export function drawEdge(ctx, path, active = false) {
    ctx.save();

    const color = active ? EDGE_ACTIVE_COLOR : EDGE_COLOR;

    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate start gap
    const startAngle = Math.atan2(path.cp1.y - path.start.y, path.cp1.x - path.start.x);
    const lineStart = {
        x: path.start.x + Math.cos(startAngle) * NODE_GAP,
        y: path.start.y + Math.sin(startAngle) * NODE_GAP
    };

    // Calculate end gap (arrow tip)
    const endAngle = Math.atan2(path.end.y - path.cp2.y, path.end.x - path.cp2.x);

    // Calculate actual end point (retracted by gap)
    const arrowTip = {
        x: path.end.x - Math.cos(endAngle) * NODE_GAP,
        y: path.end.y - Math.sin(endAngle) * NODE_GAP
    };

    // Calculate where the line should end
    const lineEnd = {
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
function drawArrowHead(ctx, tip, angle, color) {
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
export function getBezierPoint(p0, p1, p2, p3, t) {
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
export function getEdgePath(from, to, offsetIndex = 0, fromSide = 'right', toSide = 'left') {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Direction vectors for sides
    const getVector = (side) => {
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
    // Use a base distance plus a factor of the actual distance
    // Clamp it to avoid wild loops for close nodes
    let controlDist = Math.min(dist * 0.5, 150);

    // Minimum control dist to ensure curve has room to leave node
    controlDist = Math.max(controlDist, 40);

    // If "Backward" (going against the grain), increase loop size
    // e.g. Right -> Left connection but Target is to the Left of Source
    const isBackward = (fromSide === 'right' && toSide === 'left' && dx < -20);
    if (isBackward) {
        controlDist = Math.max(Math.abs(dy) * 0.5 + 50, 100);
    }

    // Apply offset for parallel edges (simple perpendicular shift not implemented yet, using dist)
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
