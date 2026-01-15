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
    ctx.lineWidth = active ? 4 : 3; // Increased from 3/2
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate angle at the end of the curve (tangent from cp2 to end)
    const angle = Math.atan2(path.end.y - path.cp2.y, path.end.x - path.cp2.x);

    // Calculate actual end point (retracted by gap)
    // The arrow tip will be here
    const arrowTip = {
        x: path.end.x - Math.cos(angle) * NODE_GAP,
        y: path.end.y - Math.sin(angle) * NODE_GAP
    };

    // Calculate where the line should end (slightly inside the arrow to avoid gaps)
    // We don't need to subtract ARROW_SIZE fullly because the arrow covers the line
    const lineEnd = {
        x: arrowTip.x - Math.cos(angle) * (ARROW_SIZE / 2),
        y: arrowTip.y - Math.sin(angle) * (ARROW_SIZE / 2)
    };

    ctx.beginPath();
    ctx.moveTo(path.start.x, path.start.y);
    ctx.bezierCurveTo(
        path.cp1.x, path.cp1.y,
        path.cp2.x, path.cp2.y,
        lineEnd.x, lineEnd.y
    );
    ctx.stroke();

    // Draw arrow head at the tip position
    drawArrowHead(ctx, arrowTip, angle, color);

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

    if (isBackward) {
        // Back-edge: "Squared" style path for straighter look
        // Go down/up, then accross, then to target
        const midY = from.y + (to.y - from.y) / 2;
        const loopHeight = 60 + offset; // Push it out a bit

        // If nodes are close vertically, we need to go around more
        if (absDy < 50) {
            const goUp = from.y > to.y;
            const yPass = goUp ? from.y - loopHeight : from.y + loopHeight;

            return {
                start: from,
                cp1: { x: from.x + 30, y: yPass },
                cp2: { x: to.x - 30, y: yPass },
                end: to
            };
        } else {
            // S-shape for backward
            return {
                start: from,
                cp1: { x: from.x, y: from.y + dy / 2 },
                cp2: { x: to.x, y: to.y - dy / 2 },
                end: to
            };
        }
    } else if (isVertical) {
        // Vertical connection - Straighter
        const controlDist = Math.min(absDy * 0.3, 40); // Reduced factor from 0.5

        return {
            start: from,
            cp1: { x: from.x, y: from.y + (dy > 0 ? controlDist : -controlDist) },
            cp2: { x: to.x, y: to.y + (dy > 0 ? -controlDist : controlDist) },
            end: to
        };
    } else {
        // Horizontal connection (Forward) - Straighter
        const controlDist = Math.min(absDx * 0.3, 50); // Reduced factor from 0.5

        return {
            start: from,
            cp1: { x: from.x + controlDist, y: from.y },
            cp2: { x: to.x - controlDist, y: to.y },
            end: to
        };
    }
}
