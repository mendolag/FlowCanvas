/**
 * FlowCanvas Type Definitions
 */

// Node types
export type NodeType = 'service' | 'topic' | 'db' | 'processor' | 'external';

// Event shapes (geometric + icon-based)
export type EventShape =
    | 'circle' | 'triangle' | 'square' | 'diamond'  // Geometric
    | 'message' | 'document' | 'alert' | 'lightning' | 'package' | 'pulse' | 'key';  // Icon-based

// Connection sides
export type Side = 'left' | 'right' | 'top' | 'bottom';

// Size presets
export type SizePreset = 'small' | 'medium' | 'large';

// Node attributes
export interface NodeAttributes {
    label?: string;
    subsystem?: string;
    delay?: number;
    partitions?: number;
    transform?: EventShape;        // deprecated - use transformation
    transformColor?: string;       // deprecated - use transformation
    transformation?: string;       // reference to Transformation name
    x?: number;
    y?: number;
    [key: string]: string | number | undefined;
}

// Node definition
export interface Node {
    id: string;
    type: NodeType;
    attributes: NodeAttributes;
}

// Layout node (with calculated position)
export interface LayoutNode extends Node {
    x: number;
    y: number;
}

// Edge definition
export interface Edge {
    from: string;
    to: string;
    fromSide: Side;
    toSide: Side;
}

// Path step for event routing
export interface PathStep {
    nodeId: string;
    attributes: Record<string, string> | null;
}

// Event definition
export interface FlowEvent {
    name: string;
    label?: string;
    color: string;
    shape: EventShape;
    size: number;
    source: string | null;
    rate: number;
    path?: PathStep[];
}

// Transformation definition (input -> output event mapping)
export interface Transformation {
    name: string;
    label?: string;
    input: string;       // input event name
    output: string;      // output event name
    outputRate: number;  // ratio of outputs per input (default: 1, fanout/aggregation deferred)
    delay: number;       // ms before producing output (default: 0)
}

// Subsystem definition
export interface Subsystem {
    name: string;
    nodes: string[];
    color: string | null;
}

// Parse error
export interface ParseError {
    line: number | null;
    message: string;
}

// Topology (parsed DSL result)
export interface Topology {
    nodes: Node[];
    edges: Edge[];
    events: FlowEvent[];
    transformations: Transformation[];
    subsystems: Subsystem[];
    errors: ParseError[];
}

// Validation result
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// Point in 2D space
export interface Point {
    x: number;
    y: number;
}

// Bezier path
export interface BezierPath {
    start: Point;
    cp1: Point;
    cp2: Point;
    end: Point;
}

// Layout edge (with calculated path)
export interface LayoutEdge {
    from: string;
    to: string;
    fromPoint: Point;
    toPoint: Point;
    path: BezierPath;
}

// Particle (animated event)
export interface Particle {
    id: string;
    event: FlowEvent;
    originalEvent: FlowEvent;
    currentEdgeIndex: number;
    pathIndex: number;
    progress: number;
    x: number;
    y: number;
}

// Delayed particle (waiting at a node)
export interface DelayedParticle {
    particle: Particle;
    atNodeId: string;
    remainingDelay: number;
    totalDelay: number;
}

// Node size dimensions
export interface NodeSize {
    width: number;
    height: number;
}

// Node color scheme
export interface NodeColors {
    fill: string;
    stroke: string;
    text: string;
}

// GIF export options
export interface GifExportOptions {
    duration: number;
    fps: number;
    width: number;
    height: number;
    quality: number;
}

// Event timer for animation
export interface EventTimer {
    event: FlowEvent;
    timeSinceLastSpawn: number;
}
