/**
 * FlowCanvas Main Canvas Controller
 * 
 * Handles canvas setup, layout calculation, rendering, and pan/zoom.
 */

import { drawNode, getNodeSize, getConnectionPoint } from './nodes';
import { drawEdge, getEdgePath, getBezierPoint } from './edges';
import type {
    Topology,
    LayoutNode,
    LayoutEdge,
    Particle,
    DelayedParticle,
    FlowEvent,
    EventShape,
    Point,
    BezierPath,
    Side,
} from '../types';

/**
 * Canvas controller class
 */
export class FlowCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    topology: Topology | null;
    layoutNodes: Map<string, LayoutNode>;
    layoutEdges: LayoutEdge[];

    particles: Particle[];
    delayedParticles: DelayedParticle[];

    // Pan and zoom state
    zoom: number;
    panX: number;
    panY: number;
    isPanning: boolean;
    lastMouseX: number;
    lastMouseY: number;
    minZoom: number;
    maxZoom: number;

    width: number;
    height: number;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d')!;
        this.topology = null;
        this.layoutNodes = new Map();
        this.layoutEdges = [];

        this.particles = [];
        this.delayedParticles = [];

        // Pan and zoom state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.minZoom = 0.25;
        this.maxZoom = 3;

        this.width = 0;
        this.height = 0;

        this.setupCanvas();
        this.setupPanZoom();
        window.addEventListener('resize', () => this.setupCanvas());
    }

    /**
     * Set up pan and zoom controls
     */
    setupPanZoom(): void {
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Zoom factor
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

            // Adjust pan to zoom towards mouse position
            const zoomChange = newZoom / this.zoom;
            this.panX = mouseX - (mouseX - this.panX) * zoomChange;
            this.panY = mouseY - (mouseY - this.panY) * zoomChange;

            this.zoom = newZoom;
            this.render();
        }, { passive: false });

        // Mouse drag for pan
        this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
            if (e.button === 0) {
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isPanning) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                this.panX += deltaX;
                this.panY += deltaY;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                this.render();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.style.cursor = 'grab';
    }

    /**
     * Reset view to fit all nodes
     */
    resetView(): void {
        if (!this.topology || this.topology.nodes.length === 0) {
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const node of this.layoutNodes.values()) {
            const size = getNodeSize(node.type);
            minX = Math.min(minX, node.x - size.width / 2);
            minY = Math.min(minY, node.y - size.height / 2);
            maxX = Math.max(maxX, node.x + size.width / 2);
            maxY = Math.max(maxY, node.y + size.height / 2);
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 60;

        const zoomX = (this.width - padding * 2) / contentWidth;
        const zoomY = (this.height - padding * 2) / contentHeight;
        this.zoom = Math.min(1, Math.min(zoomX, zoomY));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.panX = this.width / 2 - centerX * this.zoom;
        this.panY = this.height / 2 - centerY * this.zoom;

        this.render();
    }

    /**
     * Set up canvas dimensions for high DPI displays
     */
    setupCanvas(): void {
        const parent = this.canvas.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;

        if (this.topology) {
            this.calculateLayout();
            this.render();
        }
    }

    /**
     * Set the topology to render
     */
    setTopology(topology: Topology): void {
        this.topology = topology;
        this.calculateLayout();
        this.resetView();
    }

    /**
     * Calculate node positions using a simple left-to-right layout
     */
    calculateLayout(): void {
        if (!this.topology || this.topology.nodes.length === 0) {
            this.layoutNodes.clear();
            this.layoutEdges = [];
            return;
        }

        const nodes = this.topology.nodes;
        const edges = this.topology.edges;

        // Build adjacency lists
        const outgoing = new Map<string, string[]>();
        const incoming = new Map<string, string[]>();

        for (const node of nodes) {
            outgoing.set(node.id, []);
            incoming.set(node.id, []);
        }

        for (const edge of edges) {
            if (outgoing.has(edge.from) && incoming.has(edge.to)) {
                outgoing.get(edge.from)!.push(edge.to);
                incoming.get(edge.to)!.push(edge.from);
            }
        }

        // Assign levels using topological sort
        const levels = new Map<string, number>();
        const visited = new Set<string>();

        const assignLevel = (nodeId: string, level: number): void => {
            if (visited.has(nodeId)) {
                levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level));
                return;
            }
            visited.add(nodeId);
            levels.set(nodeId, level);

            for (const next of outgoing.get(nodeId) || []) {
                assignLevel(next, level + 1);
            }
        };

        // Start from source nodes
        const sources = nodes.filter(n => incoming.get(n.id)!.length === 0);
        if (sources.length === 0 && nodes.length > 0) {
            assignLevel(nodes[0].id, 0);
        }
        for (const source of sources) {
            assignLevel(source.id, 0);
        }

        // Ensure all nodes visited
        for (const node of nodes) {
            if (!visited.has(node.id)) {
                assignLevel(node.id, 0);
            }
        }

        // Group by level
        const levelGroups = new Map<number, string[]>();
        for (const [nodeId, level] of levels) {
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level)!.push(nodeId);
        }

        // Calculate positions
        const horizontalSpacing = 220;
        const verticalSpacing = 120;

        this.layoutNodes.clear();

        for (const [level, nodeIds] of levelGroups) {
            const nodeCount = nodeIds.length;
            const totalHeight = (nodeCount - 1) * verticalSpacing;
            const startY = -totalHeight / 2;

            nodeIds.forEach((nodeId, index) => {
                const node = nodes.find(n => n.id === nodeId)!;
                let x = level * horizontalSpacing;
                let y = nodeCount === 1 ? 0 : startY + index * verticalSpacing;

                // Override with manual coordinates
                if (node.attributes) {
                    if (typeof node.attributes.x === 'number') x = node.attributes.x;
                    if (typeof node.attributes.y === 'number') y = node.attributes.y;
                }

                this.layoutNodes.set(nodeId, { ...node, x, y });
            });
        }

        // Calculate edge paths
        this.layoutEdges = edges.map(edge => {
            const fromNode = this.layoutNodes.get(edge.from);
            const toNode = this.layoutNodes.get(edge.to);

            if (!fromNode || !toNode) return null;

            const fromSide = edge.fromSide || 'right';
            const toSide = edge.toSide || 'left';
            const fromPoint = getConnectionPoint(fromNode, fromSide);
            const toPoint = getConnectionPoint(toNode, toSide);

            const path = getEdgePath(fromPoint, toPoint, 0, fromSide, toSide);

            return { from: edge.from, to: edge.to, fromPoint, toPoint, path };
        }).filter((e): e is LayoutEdge => e !== null);
    }

    /**
     * Transform world coordinates to screen coordinates
     */
    worldToScreen(x: number, y: number): Point {
        return {
            x: x * this.zoom + this.panX,
            y: y * this.zoom + this.panY
        };
    }

    /**
     * Render the canvas
     */
    render(): void {
        const ctx = this.ctx;

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, this.width, this.height);

        if (!this.topology) {
            this.drawEmptyState();
            return;
        }

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this.drawGrid();
        this.drawSubsystems();

        for (const edge of this.layoutEdges) {
            drawEdge(ctx, edge.path, false);
        }

        this.drawParticles();
        this.drawDelayedParticles();

        for (const node of this.layoutNodes.values()) {
            drawNode(ctx, node);
        }

        ctx.restore();
        this.drawZoomIndicator();
    }

    /**
     * Draw zoom level indicator
     */
    drawZoomIndicator(): void {
        const ctx = this.ctx;
        const zoomPercent = Math.round(this.zoom * 100);

        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${zoomPercent}%`, this.width - 12, this.height - 12);

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Scroll to zoom • Drag to pan', this.width - 12, this.height - 26);
    }

    /**
     * Draw subtle background grid
     */
    drawGrid(): void {
        const ctx = this.ctx;
        const gridSize = 50;

        const startX = Math.floor(-this.panX / this.zoom / gridSize) * gridSize - gridSize;
        const startY = Math.floor(-this.panY / this.zoom / gridSize) * gridSize - gridSize;
        const endX = startX + (this.width / this.zoom) + gridSize * 2;
        const endY = startY + (this.height / this.zoom) + gridSize * 2;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1 / this.zoom;

        for (let x = startX; x < endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startY; y < endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    /**
     * Draw subsystem containers
     */
    drawSubsystems(): void {
        if (!this.topology?.subsystems) return;

        const ctx = this.ctx;
        const padding = 30;
        const cornerRadius = 12;
        const labelHeight = 24;

        const defaultColors = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
        ];

        this.topology.subsystems.forEach((subsystem, index) => {
            if (subsystem.nodes.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            for (const nodeId of subsystem.nodes) {
                const node = this.layoutNodes.get(nodeId);
                if (!node) continue;

                const size = getNodeSize(node.type);
                minX = Math.min(minX, node.x - size.width / 2);
                minY = Math.min(minY, node.y - size.height / 2);
                maxX = Math.max(maxX, node.x + size.width / 2);
                maxY = Math.max(maxY, node.y + size.height / 2);
            }

            if (minX === Infinity) return;

            minX -= padding;
            minY -= padding + labelHeight;
            maxX += padding;
            maxY += padding;

            const width = maxX - minX;
            const height = maxY - minY;
            const color = subsystem.color || defaultColors[index % defaultColors.length];

            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(minX, minY, width, height, cornerRadius);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.roundRect(minX, minY, width, height, cornerRadius);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = color;
            const labelWidth = ctx.measureText(subsystem.name).width + 16;
            ctx.beginPath();
            ctx.roundRect(minX + 10, minY + 8, labelWidth + 8, labelHeight, 6);
            ctx.fill();

            ctx.font = '600 13px Inter, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(subsystem.name, minX + 18, minY + 8 + labelHeight / 2);
        });
    }

    /**
     * Draw empty state message
     */
    drawEmptyState(): void {
        const ctx = this.ctx;
        ctx.font = '500 16px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Enter a DSL definition to visualize your data flow', this.width / 2, this.height / 2);
    }

    /**
     * Add a particle (event) to animate
     */
    addParticle(event: FlowEvent, startNodeId: string): Particle | null {
        let edge: LayoutEdge | undefined;
        let pathIndex = 0;

        if (event.path && event.path.length > 1) {
            if (event.path[0].nodeId === startNodeId) {
                const nextNodeId = event.path[1].nodeId;
                edge = this.layoutEdges.find(e => e.from === startNodeId && e.to === nextNodeId);
                if (!edge) {
                    edge = this.layoutEdges.find(e => e.from === startNodeId);
                }
            } else {
                const index = event.path.findIndex(p => p.nodeId === startNodeId);
                if (index >= 0 && index < event.path.length - 1) {
                    pathIndex = index;
                    const nextNodeId = event.path[index + 1].nodeId;
                    edge = this.layoutEdges.find(e => e.from === startNodeId && e.to === nextNodeId);
                }
            }
        }

        if (!edge) {
            edge = this.layoutEdges.find(e => e.from === startNodeId);
        }

        if (!edge) return null;

        const particle: Particle = {
            id: Math.random().toString(36).substr(2, 9),
            event: { ...event },
            originalEvent: event,
            currentEdgeIndex: this.layoutEdges.indexOf(edge),
            pathIndex,
            progress: 0,
            x: edge.fromPoint.x,
            y: edge.fromPoint.y
        };

        this.particles.push(particle);
        return particle;
    }

    /**
     * Update particle positions
     */
    updateParticles(deltaTime: number, speed: number = 1): Particle[] {
        const baseSpeed = 0.0008;
        const completedParticles: Particle[] = [];

        const getNextEdge = (currentParticle: Particle, nodeId: string): LayoutEdge | null => {
            if (currentParticle.event.path && currentParticle.event.path.length > 0) {
                const currentPathIndex = currentParticle.pathIndex;
                const nextPathStep = currentParticle.event.path[currentPathIndex + 1];

                if (nextPathStep && nextPathStep.nodeId === nodeId) {
                    const step = nextPathStep;
                    if (step.attributes) {
                        if (step.attributes.shape) {
                            currentParticle.event.shape = step.attributes.shape as EventShape;
                        }
                        if (step.attributes.color) {
                            currentParticle.event.color = step.attributes.color;
                        }
                    }

                    if (currentPathIndex + 2 < currentParticle.event.path.length) {
                        const nextTarget = currentParticle.event.path[currentPathIndex + 2].nodeId;
                        const edge = this.layoutEdges.find(e => e.from === nodeId && e.to === nextTarget);
                        if (edge) {
                            currentParticle.pathIndex++;
                            return edge;
                        }
                    }
                } else {
                    const index = currentParticle.event.path.findIndex(p => p.nodeId === nodeId);
                    if (index >= 0 && index < currentParticle.event.path.length - 1) {
                        const step = currentParticle.event.path[index];
                        if (step.attributes) {
                            if (step.attributes.shape) {
                                currentParticle.event.shape = step.attributes.shape as EventShape;
                            }
                            if (step.attributes.color) {
                                currentParticle.event.color = step.attributes.color;
                            }
                        }
                        const nextTarget = currentParticle.event.path[index + 1].nodeId;
                        const edge = this.layoutEdges.find(e => e.from === nodeId && e.to === nextTarget);
                        if (edge) {
                            currentParticle.pathIndex = index;
                            return edge;
                        }
                    }
                }
            }

            const outgoingEdges = this.layoutEdges.filter(e => e.from === nodeId);
            if (outgoingEdges.length > 0) {
                return outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
            }
            return null;
        };

        // Update delayed particles
        for (let i = this.delayedParticles.length - 1; i >= 0; i--) {
            const delayed = this.delayedParticles[i];
            delayed.remainingDelay -= deltaTime * speed;

            if (delayed.remainingDelay <= 0) {
                const node = this.layoutNodes.get(delayed.atNodeId);
                if (node?.attributes) {
                    if (node.attributes.transform) {
                        delayed.particle.event.shape = node.attributes.transform;
                    }
                    if (node.attributes.transformColor) {
                        delayed.particle.event.color = node.attributes.transformColor;
                    }
                }

                const nextEdge = getNextEdge(delayed.particle, delayed.atNodeId);

                if (nextEdge) {
                    delayed.particle.currentEdgeIndex = this.layoutEdges.indexOf(nextEdge);
                    delayed.particle.progress = 0;
                    this.particles.push(delayed.particle);
                } else {
                    completedParticles.push(delayed.particle);
                }
                this.delayedParticles.splice(i, 1);
            }
        }

        // Update moving particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const edge = this.layoutEdges[particle.currentEdgeIndex];

            if (!edge) {
                completedParticles.push(particle);
                this.particles.splice(i, 1);
                continue;
            }

            particle.progress += baseSpeed * deltaTime * speed;

            const { path } = edge;
            const pos = getBezierPoint(path.start, path.cp1, path.cp2, path.end, Math.min(particle.progress, 1));
            particle.x = pos.x;
            particle.y = pos.y;

            if (particle.progress >= 1) {
                const targetNodeId = edge.to;
                const targetNode = this.layoutNodes.get(targetNodeId);
                const delay = targetNode?.attributes?.delay || 0;

                if (delay > 0) {
                    this.particles.splice(i, 1);
                    this.delayedParticles.push({
                        particle,
                        atNodeId: targetNodeId,
                        remainingDelay: delay,
                        totalDelay: delay
                    });
                } else {
                    if (targetNode?.attributes) {
                        if (targetNode.attributes.transform) {
                            particle.event.shape = targetNode.attributes.transform;
                        }
                        if (targetNode.attributes.transformColor) {
                            particle.event.color = targetNode.attributes.transformColor;
                        }
                    }

                    const nextEdge = getNextEdge(particle, targetNodeId);

                    if (nextEdge) {
                        particle.currentEdgeIndex = this.layoutEdges.indexOf(nextEdge);
                        particle.progress = 0;
                    } else {
                        completedParticles.push(particle);
                        this.particles.splice(i, 1);
                    }
                }
            }
        }

        return completedParticles;
    }

    /**
     * Draw all particles
     */
    drawParticles(): void {
        const ctx = this.ctx;
        for (const particle of this.particles) {
            this.drawSingleParticle(ctx, particle.event, particle.x, particle.y);
        }
    }

    /**
     * Draw delayed particles (pulsing at nodes)
     */
    drawDelayedParticles(): void {
        const ctx = this.ctx;

        for (const delayed of this.delayedParticles) {
            const node = this.layoutNodes.get(delayed.atNodeId);
            if (!node) continue;

            const pulseProgress = 1 - (delayed.remainingDelay / delayed.totalDelay);
            const pulseScale = 0.8 + Math.sin(pulseProgress * Math.PI * 4) * 0.3;

            ctx.save();
            ctx.globalAlpha = 0.7 + Math.sin(pulseProgress * Math.PI * 2) * 0.3;
            this.drawSingleParticle(ctx, delayed.particle.event, node.x, node.y, pulseScale);
            ctx.restore();
        }
    }

    /**
     * Draw a single particle
     */
    drawSingleParticle(
        ctx: CanvasRenderingContext2D,
        event: FlowEvent,
        x: number,
        y: number,
        scale: number = 1
    ): void {
        const eventSize = event.size || 1;
        const size = 10 * eventSize * scale;

        ctx.save();
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 12 * eventSize * scale;
        ctx.fillStyle = event.color;

        switch (event.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(x, y - size / 2);
                ctx.lineTo(x + size / 2, y + size / 2);
                ctx.lineTo(x - size / 2, y + size / 2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                break;
            default:
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Get source nodes (nodes with no incoming edges)
     */
    getSourceNodes(): string[] {
        if (!this.topology) return [];

        const hasIncoming = new Set(this.topology.edges.map(e => e.to));
        return this.topology.nodes.filter(n => !hasIncoming.has(n.id)).map(n => n.id);
    }

    /**
     * Clear all particles
     */
    clearParticles(): void {
        this.particles = [];
        this.delayedParticles = [];
    }
}
