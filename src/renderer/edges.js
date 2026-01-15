/**
 * FlowCanvas Edge Renderer
 * 
 * Renders edges (connections) between nodes with arrows.
 * Handles forward, backward, and complex routing.
 */

const EDGE_COLOR = '#94a3b8';
const EDGE_ACTIVE_COLOR = '#6366f1';
const ARROW_SIZE = 8;

/**
 * Draw an edge between two nodes
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} from - Start point {x, y}
 * @param {Object} to - End point {x, y}
 * @param {boolean} active - Whether the edge is active (event passing through)
 * @param {number} offsetIndex - Offset for parallel edges (0 = no offset)
 */
/**
 * Draw an edge between two nodes
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} from - Start point {x, y}
 * @param {Object} to - End point {x, y}
 * @param {boolean} active - Whether the edge is active (event passing through)
 * @param {number} offsetIndex - Offset for parallel edges (0 = no offset)
 */
export function drawEdge(ctx, from, to, active = false, offsetIndex = 0) {
    ctx.save();

    const color = active ? EDGE_ACTIVE_COLOR : EDGE_COLOR;
    const path = getEdgePath(from, to, offsetIndex);

    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path.start.x, path.start.y);
    ctx.bezierCurveTo(
        path.cp1.x, path.cp1.y,
        path.cp2.x, path.cp2.y,
        path.end.x - ARROW_SIZE, path.end.y
    );
    ctx.stroke();

    // Draw arrow head
    drawArrowHead(ctx, { x: path.end.x - ARROW_SIZE, y: path.end.y }, path.end, color);

    ctx.restore();
}

/**
 * Draw an arrow head
 */
function drawArrowHead(ctx, from, to, color) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
        to.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
        to.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        to.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
        to.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6)
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
 * Calculate the path points for an edge (used for animation)
 * Handles forward, backward, and vertical edges
 * @param {Object} from - Start node position {x, y}
 * @param {Object} to - End node position {x, y}
 * @param {number} offsetIndex - Optional offset index
 * @returns {{ start: Object, cp1: Object, cp2: Object, end: Object }}
 */
export function getEdgePath(from, to, offsetIndex = 0) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Offset calculation
    const offset = offsetIndex * 15;

    // Determine primary direction
    // Check if essentially vertical (within 60 degrees of vertical) or perfectly aligned
    const isVertical = absDy > absDx * 0.5;
    const isBackward = dx < -20; // Only backward if significantly to the left

    if (isBackward && !isVertical) {
        // Back-edge: curve around (Slightly reduced height for straighter look)
        const loopHeight = 30 + absDy * 0.2 + offset;
        const goUp = from.y > to.y;
        const yOffset = goUp ? -loopHeight : loopHeight;

        return {
            start: from,
            cp1: { x: from.x + 20, y: from.y + yOffset },
            cp2: { x: to.x - 20, y: to.y + yOffset },
            end: to
        };
    } else if (isVertical) {
        // Vertical connection
        // Control points should extend vertically from start and end
        // Distance depends on length but capped to keep it tight
        const controlDist = Math.min(absDy * 0.5, 60);

        return {
            start: from,
            cp1: { x: from.x, y: from.y + (dy > 0 ? controlDist : -controlDist) },
            cp2: { x: to.x, y: to.y + (dy > 0 ? -controlDist : controlDist) },
            end: to
        };
    } else {
        // Horizontal connection (Forward)
        // Control points extend horizontally
        const controlDist = Math.min(absDx * 0.5, 60);

        return {
            start: from,
            cp1: { x: from.x + controlDist, y: from.y },
            cp2: { x: to.x - controlDist, y: to.y },
            end: to
        };
    }
}
