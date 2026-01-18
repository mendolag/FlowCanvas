/**
 * FlowCanvas Node Renderer
 * 
 * Renders different node shapes based on type:
 * - service: Rounded rectangle with server icon
 * - topic: Horizontal pipe with message icon
 * - db: Vertical cylinder with database icon
 * - processor: Hexagon with cog icon
 * - external: Cloud shape with cloud icon
 */

import type { NodeType, NodeColors, NodeSize, Side, Point, LayoutNode } from '../types';
import { drawIcon, getNodeIcon } from './icons';
import { drawShape } from './shapes';

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

    // Use label if available, otherwise fall back to id
    const displayLabel = (attributes?.label as string) || id;

    ctx.save();

    // Draw the base shape
    drawShape(ctx, type, x, y, size.width, size.height, colors);

    // Draw specific content on top
    switch (type) {
        case 'service':
            drawServiceContent(ctx, x, y, size, colors, displayLabel);
            break;
        case 'topic':
            drawTopicContent(ctx, x, y, size, colors, displayLabel, attributes.partitions);
            break;
        case 'db':
            drawDatabaseContent(ctx, x, y, size, colors, displayLabel);
            break;
        case 'processor':
            drawProcessorContent(ctx, x, y, size, colors, displayLabel);
            break;
        case 'external':
            drawExternalContent(ctx, x, y, size, colors, displayLabel);
            break;
        default:
            drawServiceContent(ctx, x, y, size, colors, displayLabel);
    }

    ctx.restore();
}

/**
 * Draw service node content (icon + label)
 */
function drawServiceContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    const { width } = size;

    // Icon on left side
    const iconSize = 18;
    const iconX = x - width / 2 + 20;
    drawIcon(ctx, getNodeIcon('service'), iconX, y, iconSize, colors.text);

    // Label (shifted right)
    drawLabel(ctx, x + 10, y, label, colors.text, width - 45);
}

/**
 * Draw topic node content (label + partitions)
 */
function drawTopicContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string,
    partitions?: number
): void {
    const { width, height } = size;

    // Label
    drawLabel(ctx, x, y, label, colors.text);

    // Partitions badge
    if (partitions) {
        // Position relative to the "standard" pipe shape
        const badgeX = x + width / 2; // Right edge
        const badgeY = y - height / 2; // Top edge

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
 * Draw database node content (label)
 */
function drawDatabaseContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    // Label (shifted down slightly to avoid top cylinder rim)
    drawLabel(ctx, x, y + 5, label, colors.text);
}

/**
 * Draw processor node content (label)
 */
function drawProcessorContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
    drawLabel(ctx, x, y, label, colors.text);
}

/**
 * Draw external node content (label)
 */
function drawExternalContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: NodeSize,
    colors: NodeColors,
    label: string
): void {
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
    color: string,
    maxWidth: number = 100
): void {
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate long labels
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
