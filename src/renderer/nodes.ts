/**
 * FlowCanvas Node Renderer
 * 
 * Renders different node shapes based on type:
 * - service: Rounded rectangle
 * - topic: Horizontal pipe (cylinder on side)
 * - db: Vertical cylinder
 * - processor: Hexagon
 * - external: Cloud shape
 */

import type { NodeType, NodeColors, NodeSize, Side, Point, LayoutNode } from '../types';

// Node colors by type
const NODE_COLORS: Record<NodeType, NodeColors> = {
    service: { fill: '#6366f1', stroke: '#4f46e5', text: '#ffffff' },
    topic: { fill: '#06b6d4', stroke: '#0891b2', text: '#ffffff' },
    db: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#ffffff' },
    processor: { fill: '#f59e0b', stroke: '#d97706', text: '#ffffff' },
    external: { fill: '#64748b', stroke: '#475569', text: '#ffffff' }
};

// Node dimensions
const NODE_SIZE: Record<NodeType, NodeSize> = {
    service: { width: 120, height: 50 },
    topic: { width: 140, height: 40 },
    db: { width: 80, height: 70 },
    processor: { width: 100, height: 60 },
    external: { width: 120, height: 50 }
};

/**
 * Get node dimensions for a type
 */
export function getNodeSize(type: NodeType): NodeSize {
    return NODE_SIZE[type] || NODE_SIZE.service;
}

/**
 * Get node colors for a type
 */
export function getNodeColors(type: NodeType): NodeColors {
    return NODE_COLORS[type] || NODE_COLORS.service;
}

/**
 * Draw a node on the canvas
 */
export function drawNode(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
    const { type, x, y, id, attributes } = node;
    const size = getNodeSize(type);
    const colors = getNodeColors(type);

    ctx.save();

    switch (type) {
        case 'service':
            drawService(ctx, x, y, size, colors, id);
            break;
        case 'topic':
            drawTopic(ctx, x, y, size, colors, id, attributes.partitions);
            break;
        case 'db':
            drawDatabase(ctx, x, y, size, colors, id);
            break;
        case 'processor':
            drawProcessor(ctx, x, y, size, colors, id);
            break;
        case 'external':
            drawExternal(ctx, x, y, size, colors, id);
            break;
        default:
            drawService(ctx, x, y, size, colors, id);
    }

    ctx.restore();
}

/**
 * Draw a service node (rounded rectangle)
 */
function drawService(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    const { width, height } = size;
    const radius = 8;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, radius);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Reset shadow for border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    drawLabel(ctx, x, y, label, colors.text);
}

/**
 * Draw a topic node (horizontal pipe)
 */
function drawTopic(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string,
    partitions?: number
): void {
    const { width, height } = size;
    const capWidth = 12;
    const bodyWidth = width - capWidth * 2;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Left cap (ellipse)
    ctx.beginPath();
    ctx.ellipse(x - bodyWidth / 2, y, capWidth, height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.stroke;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Main body (rectangle)
    ctx.beginPath();
    ctx.rect(x - bodyWidth / 2, y - height / 2, bodyWidth, height);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Right cap (ellipse)
    ctx.beginPath();
    ctx.ellipse(x + bodyWidth / 2, y, capWidth, height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Border on body
    ctx.beginPath();
    ctx.moveTo(x - bodyWidth / 2, y - height / 2);
    ctx.lineTo(x + bodyWidth / 2, y - height / 2);
    ctx.moveTo(x - bodyWidth / 2, y + height / 2);
    ctx.lineTo(x + bodyWidth / 2, y + height / 2);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    drawLabel(ctx, x, y, label, colors.text);

    // Partitions badge
    if (partitions) {
        const badgeX = x + bodyWidth / 2 + capWidth - 8;
        const badgeY = y - height / 2 - 5;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = colors.fill;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${partitions}`, badgeX, badgeY);
    }
}

/**
 * Draw a database node (vertical cylinder)
 */
function drawDatabase(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    const { width, height } = size;
    const capHeight = 12;
    const bodyHeight = height - capHeight;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Main body
    ctx.beginPath();
    ctx.rect(x - width / 2, y - height / 2 + capHeight / 2, width, bodyHeight);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Bottom ellipse
    ctx.beginPath();
    ctx.ellipse(x, y + height / 2 - capHeight / 2, width / 2, capHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top ellipse
    ctx.beginPath();
    ctx.ellipse(x, y - height / 2 + capHeight / 2, width / 2, capHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Side borders
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y - height / 2 + capHeight / 2);
    ctx.lineTo(x - width / 2, y + height / 2 - capHeight / 2);
    ctx.moveTo(x + width / 2, y - height / 2 + capHeight / 2);
    ctx.lineTo(x + width / 2, y + height / 2 - capHeight / 2);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    drawLabel(ctx, x, y + 5, label, colors.text);
}

/**
 * Draw a processor node (hexagon)
 */
function drawProcessor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    const { width, height } = size;
    const sideWidth = width * 0.2;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Hexagon path
    ctx.beginPath();
    ctx.moveTo(x - width / 2 + sideWidth, y - height / 2);
    ctx.lineTo(x + width / 2 - sideWidth, y - height / 2);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width / 2 - sideWidth, y + height / 2);
    ctx.lineTo(x - width / 2 + sideWidth, y + height / 2);
    ctx.lineTo(x - width / 2, y);
    ctx.closePath();

    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    drawLabel(ctx, x, y, label, colors.text);
}

/**
 * Draw an external system node (cloud-like shape)
 */
function drawExternal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    const { width, height } = size;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Simplified cloud using overlapping circles
    ctx.beginPath();

    // Base ellipse
    ctx.ellipse(x, y + 5, width / 2, height / 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Top bumps
    ctx.beginPath();
    ctx.arc(x - width / 4, y - 5, height / 3, 0, Math.PI * 2);
    ctx.arc(x + width / 6, y - 8, height / 2.8, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Label
    drawLabel(ctx, x, y + 5, label, colors.text);
}

/**
 * Draw a label centered at position
 */
function drawLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
): void {
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate long labels
    const maxWidth = 100;
    let displayText = text;
    if (ctx.measureText(text).width > maxWidth) {
        while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
        }
        displayText += '...';
    }

    ctx.fillText(displayText, x, y);
}

/**
 * Get the connection point on a node's edge
 */
export function getConnectionPoint(node: LayoutNode, side: Side): Point {
    const size = getNodeSize(node.type);

    switch (side) {
        case 'top':
            return { x: node.x, y: node.y - size.height / 2 };
        case 'bottom':
            return { x: node.x, y: node.y + size.height / 2 };
        case 'left':
            return { x: node.x - size.width / 2, y: node.y };
        case 'right':
        default:
            return { x: node.x + size.width / 2, y: node.y };
    }
}
