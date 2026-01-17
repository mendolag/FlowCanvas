/**
 * Icon utilities for FlowCanvas
 * 
 * Provides SVG icon rendering to canvas context using Lucide icons.
 */

import type { NodeType, EventShape } from '../types';

// Lucide icon SVG paths (simplified for canvas rendering)
// These are the d attributes from Lucide SVG icons
const ICON_PATHS: Record<string, { paths: string[]; viewBox: string }> = {
    // Node icons
    server: {
        viewBox: '0 0 24 24',
        paths: [
            'M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z',
            'M2 17a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2z',
            'M6 10h.01', 'M6 18h.01'
        ]
    },
    messageSquare: {
        viewBox: '0 0 24 24',
        paths: [
            'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
        ]
    },
    database: {
        viewBox: '0 0 24 24',
        paths: [
            'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3z',
            'M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3',
            'M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5'
        ]
    },
    cog: {
        viewBox: '0 0 24 24',
        paths: [
            'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
            'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
            'M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41',
            'M2 12h2', 'M20 12h2', 'M4.93 19.07l1.41-1.41', 'M17.66 6.34l1.41-1.41'
        ]
    },
    cloud: {
        viewBox: '0 0 24 24',
        paths: [
            'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'
        ]
    },
    // Event icons
    mail: {
        viewBox: '0 0 24 24',
        paths: [
            'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
            'M22 6l-10 7L2 6'
        ]
    },
    fileText: {
        viewBox: '0 0 24 24',
        paths: [
            'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
            'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'
        ]
    },
    alertTriangle: {
        viewBox: '0 0 24 24',
        paths: [
            'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
            'M12 9v4', 'M12 17h.01'
        ]
    },
    zap: {
        viewBox: '0 0 24 24',
        paths: [
            'M13 2L3 14h9l-1 8 10-12h-9l1-8z'
        ]
    },
    box: {
        viewBox: '0 0 24 24',
        paths: [
            'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
            'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'
        ]
    },
    activity: {
        viewBox: '0 0 24 24',
        paths: [
            'M22 12h-4l-3 9L9 3l-3 9H2'
        ]
    }
};

// Map node types to icons
const NODE_ICONS: Record<NodeType, string> = {
    service: 'server',
    topic: 'messageSquare',
    db: 'database',
    processor: 'cog',
    external: 'cloud'
};

// Map event shapes to icons (for non-basic shapes)
const EVENT_ICONS: Record<string, string> = {
    message: 'mail',
    document: 'fileText',
    alert: 'alertTriangle',
    lightning: 'zap',
    package: 'box',
    pulse: 'activity'
};

// Cache for loaded icon images
const iconCache = new Map<string, HTMLImageElement>();

/**
 * Create an SVG string from icon paths
 */
function createSvgString(iconName: string, color: string = 'currentColor', strokeWidth: number = 2): string {
    const icon = ICON_PATHS[iconName];
    if (!icon) return '';

    const pathElements = icon.paths.map(d =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    ).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="24" height="24">${pathElements}</svg>`;
}

/**
 * Get or create an icon image for canvas rendering
 */
export function getIconImage(iconName: string, color: string = '#ffffff'): HTMLImageElement | null {
    const cacheKey = `${iconName}-${color}`;

    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey)!;
    }

    const svgString = createSvgString(iconName, color);
    if (!svgString) return null;

    const img = new Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
    iconCache.set(cacheKey, img);

    return img;
}

/**
 * Draw an icon to canvas context
 */
export function drawIcon(
    ctx: CanvasRenderingContext2D,
    iconName: string,
    x: number,
    y: number,
    size: number,
    color: string = '#ffffff'
): void {
    const img = getIconImage(iconName, color);
    if (!img || !img.complete) {
        // Fallback: schedule redraw when loaded
        if (img) {
            img.onload = () => {
                // Icon loaded, will be drawn on next render
            };
        }
        return;
    }

    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

/**
 * Get icon name for a node type
 */
export function getNodeIcon(nodeType: NodeType): string {
    return NODE_ICONS[nodeType] || 'server';
}

/**
 * Get icon name for an event shape (for non-geometric shapes)
 */
export function getEventIcon(shape: EventShape | string): string | null {
    return EVENT_ICONS[shape] || null;
}

/**
 * Check if a shape is icon-based
 */
export function isIconShape(shape: EventShape | string): boolean {
    return shape in EVENT_ICONS;
}

/**
 * Preload all icons for faster rendering
 */
export function preloadIcons(): void {
    const colors = ['#ffffff', '#000000', '#6366f1', '#06b6d4', '#8b5cf6', '#f59e0b', '#64748b'];

    Object.keys(ICON_PATHS).forEach(iconName => {
        colors.forEach(color => {
            getIconImage(iconName, color);
        });
    });
}

// Preload on module load
preloadIcons();
