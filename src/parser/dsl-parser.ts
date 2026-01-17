/**
 * FlowCanvas DSL Parser
 * 
 * Parses a simple DSL format into a structured topology object.
 */

import type {
    Node,
    NodeType,
    NodeAttributes,
    Edge,
    Side,
    FlowEvent,
    EventShape,
    PathStep,
    Subsystem,
    ParseError,
    Topology,
    ValidationResult,
} from '../types';

const NODE_TYPES: readonly NodeType[] = ['service', 'topic', 'db', 'processor', 'external'];
const EVENT_SHAPES: readonly EventShape[] = ['circle', 'triangle', 'square'];
const VALID_SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right'];

// Internal types for parsing state
interface ParserSubsystem {
    name: string;
    nodes: string[];
    color: string | null;
}

interface ParserEvent {
    name: string;
    color: string;
    shape: EventShape;
    size: number;
    source: string | null;
    rate: number;
    path?: PathStep[];
}

/**
 * Parse the DSL text into a topology object
 */
export function parseDSL(dsl: string): Topology {
    const result: Topology = {
        nodes: [],
        edges: [],
        events: [],
        subsystems: [],
        errors: []
    };

    if (!dsl || !dsl.trim()) {
        return result;
    }

    const lines = dsl.split('\n');
    const nodeMap = new Map<string, Node>();
    const subsystemMap = new Map<string, ParserSubsystem>();
    let inEventsBlock = false;
    let inSubsystemBlock = false;
    let currentSubsystem: ParserSubsystem | null = null;
    let currentEvent: ParserEvent | null = null;

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        // Check for subsystem block start: subsystem "Name":
        const subsystemMatch = trimmed.match(/^subsystem\s+["'](.+)["']\s*:$/);
        if (subsystemMatch) {
            if (currentSubsystem) {
                subsystemMap.set(currentSubsystem.name, currentSubsystem);
            }
            currentSubsystem = {
                name: subsystemMatch[1],
                nodes: [],
                color: null
            };
            inSubsystemBlock = true;
            inEventsBlock = false;
            continue;
        }

        // Check for events block start
        if (trimmed === 'events:') {
            if (currentSubsystem) {
                subsystemMap.set(currentSubsystem.name, currentSubsystem);
                currentSubsystem = null;
            }
            inEventsBlock = true;
            inSubsystemBlock = false;
            continue;
        }

        // Parse subsystem block contents
        if (inSubsystemBlock && currentSubsystem) {
            // Check if line is indented (part of subsystem)
            if (line.startsWith('  ') || line.startsWith('\t')) {
                // Parse subsystem color attribute
                if (trimmed.startsWith('color:')) {
                    currentSubsystem.color = trimmed.substring(6).trim().replace(/['"]/g, '');
                    continue;
                }

                // Parse node definition within subsystem
                if (trimmed.includes(':') && !trimmed.includes('->')) {
                    const colonIndex = trimmed.indexOf(':');
                    const nodeName = trimmed.substring(0, colonIndex).trim();
                    const definition = trimmed.substring(colonIndex + 1).trim();

                    if (nodeName && definition) {
                        const parts = definition.split(',').map(p => p.trim());
                        const type = parts[0] as NodeType;
                        const attributes: NodeAttributes = { subsystem: currentSubsystem.name };

                        if (NODE_TYPES.includes(type)) {
                            // Parse attributes
                            for (let j = 1; j < parts.length; j++) {
                                const attr = parts[j];
                                const eqIndex = attr.indexOf('=');
                                if (eqIndex > 0) {
                                    const key = attr.substring(0, eqIndex).trim();
                                    const value = attr.substring(eqIndex + 1).trim();

                                    if (key === 'delay' || key === 'partitions') {
                                        attributes[key] = parseInt(value, 10);
                                    } else if (key === 'transform') {
                                        if (EVENT_SHAPES.includes(value as EventShape)) {
                                            attributes.transform = value as EventShape;
                                        }
                                    } else if (key === 'transformColor') {
                                        attributes.transformColor = value.replace(/['"]/g, '');
                                    } else if (key === 'x' || key === 'y') {
                                        attributes[key] = parseInt(value, 10);
                                    } else {
                                        const numVal = Number(value);
                                        attributes[key] = isNaN(numVal) ? value : numVal;
                                    }
                                }
                            }

                            nodeMap.set(nodeName, { id: nodeName, type, attributes });
                            currentSubsystem.nodes.push(nodeName);
                        } else {
                            result.errors.push({
                                line: lineNum,
                                message: `Unknown node type "${type}" in subsystem`
                            });
                        }
                    }
                    continue;
                }
            } else {
                // Line not indented - end subsystem block
                subsystemMap.set(currentSubsystem.name, currentSubsystem);
                currentSubsystem = null;
                inSubsystemBlock = false;
            }
        }

        // Parse events block
        if (inEventsBlock) {
            // Event list item start
            if (trimmed.startsWith('- name:')) {
                if (currentEvent) {
                    result.events.push(currentEvent as FlowEvent);
                }
                const name = trimmed.substring(7).trim();
                currentEvent = {
                    name,
                    color: '#6366f1',
                    shape: 'circle',
                    size: 1,
                    source: null,
                    rate: 2
                };
                continue;
            }

            // Event properties
            if (currentEvent && trimmed.startsWith('color:')) {
                currentEvent.color = trimmed.substring(6).trim().replace(/['"]/g, '');
                continue;
            }

            if (currentEvent && trimmed.startsWith('shape:')) {
                const shape = trimmed.substring(6).trim();
                if (EVENT_SHAPES.includes(shape as EventShape)) {
                    currentEvent.shape = shape as EventShape;
                } else {
                    result.errors.push({
                        line: lineNum,
                        message: `Invalid shape "${shape}". Use: ${EVENT_SHAPES.join(', ')}`
                    });
                }
                continue;
            }

            const sourceMatch = trimmed.match(/^source\s*:\s*(.+)$/);
            if (currentEvent && sourceMatch) {
                currentEvent.source = sourceMatch[1].trim();
                continue;
            }

            const rateMatch = trimmed.match(/^rate\s*:\s*(.+)$/);
            if (currentEvent && rateMatch) {
                const rate = parseFloat(rateMatch[1].trim());
                if (!isNaN(rate) && rate > 0) {
                    currentEvent.rate = rate;
                }
                continue;
            }

            if (currentEvent && trimmed.startsWith('size:')) {
                const sizeValue = trimmed.substring(5).trim();
                if (sizeValue === 'small') {
                    currentEvent.size = 0.6;
                } else if (sizeValue === 'medium') {
                    currentEvent.size = 1;
                } else if (sizeValue === 'large') {
                    currentEvent.size = 1.5;
                } else {
                    const numSize = parseFloat(sizeValue);
                    if (!isNaN(numSize) && numSize > 0) {
                        currentEvent.size = Math.max(0.3, Math.min(3, numSize));
                    }
                }
                continue;
            }

            if (currentEvent && trimmed.startsWith('path:')) {
                const pathStr = trimmed.substring(5).trim();
                const segments = pathStr.split('->').map(s => s.trim());

                currentEvent.path = segments.map(segment => {
                    // Check for attributes in brackets: NodeName[key=value]
                    const match = segment.match(/^([a-zA-Z0-9_\-]+)\s*\[(.*)\]$/);
                    if (match) {
                        const nodeId = match[1];
                        const attrStr = match[2];
                        const attributes: Record<string, string> = {};

                        attrStr.split(',').forEach(pair => {
                            const [key, val] = pair.split('=').map(p => p.trim());
                            if (key && val) {
                                attributes[key] = val.replace(/['"]/g, '');
                            }
                        });

                        return { nodeId, attributes };
                    } else {
                        return { nodeId: segment, attributes: null };
                    }
                });

                if (currentEvent.path.length <= 1) {
                    delete currentEvent.path;
                }
                continue;
            }

            // If line doesn't start with whitespace or dash, we're done with events
            if (!line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('-')) {
                if (currentEvent) {
                    result.events.push(currentEvent as FlowEvent);
                    currentEvent = null;
                }
                inEventsBlock = false;
            } else {
                continue;
            }
        }

        // Parse flow connections (contains ->)
        if (trimmed.includes('->')) {
            const parts = trimmed.split('->').map(p => p.trim());

            for (let j = 0; j < parts.length - 1; j++) {
                let from = parts[j];
                let to = parts[j + 1];
                let fromSide: Side = 'right';
                let toSide: Side = 'left';

                // Parse explicit sides (node:side)
                if (from.includes(':')) {
                    const [name, side] = from.split(':');
                    from = name.trim();
                    if (VALID_SIDES.includes(side.trim() as Side)) {
                        fromSide = side.trim() as Side;
                    }
                }

                if (to.includes(':')) {
                    const [name, side] = to.split(':');
                    to = name.trim();
                    if (VALID_SIDES.includes(side.trim() as Side)) {
                        toSide = side.trim() as Side;
                    }
                }

                if (!from || !to) {
                    result.errors.push({
                        line: lineNum,
                        message: 'Invalid flow connection syntax'
                    });
                    continue;
                }

                // Create nodes if they don't exist (as generic service type)
                if (!nodeMap.has(from)) {
                    nodeMap.set(from, { id: from, type: 'service', attributes: {} });
                }
                if (!nodeMap.has(to)) {
                    nodeMap.set(to, { id: to, type: 'service', attributes: {} });
                }

                // Add edge with connection points
                result.edges.push({ from, to, fromSide, toSide });
            }
            continue;
        }

        // Parse node definitions (contains :) - outside subsystem
        if (trimmed.includes(':') && !inSubsystemBlock) {
            const colonIndex = trimmed.indexOf(':');
            const nodeName = trimmed.substring(0, colonIndex).trim();
            const definition = trimmed.substring(colonIndex + 1).trim();

            if (!nodeName) {
                result.errors.push({
                    line: lineNum,
                    message: 'Node name cannot be empty'
                });
                continue;
            }

            // Parse type and attributes
            const parts = definition.split(',').map(p => p.trim());
            const type = parts[0] as NodeType;
            const attributes: NodeAttributes = {};

            if (!NODE_TYPES.includes(type)) {
                result.errors.push({
                    line: lineNum,
                    message: `Unknown node type "${type}". Use: ${NODE_TYPES.join(', ')}`
                });
                continue;
            }

            // Parse attributes (key=value pairs)
            for (let j = 1; j < parts.length; j++) {
                const attr = parts[j];
                const eqIndex = attr.indexOf('=');
                if (eqIndex > 0) {
                    const key = attr.substring(0, eqIndex).trim();
                    const value = attr.substring(eqIndex + 1).trim();

                    // Handle special attributes
                    if (key === 'delay' || key === 'partitions') {
                        attributes[key] = parseInt(value, 10);
                    } else if (key === 'transform') {
                        if (EVENT_SHAPES.includes(value as EventShape)) {
                            attributes.transform = value as EventShape;
                        }
                    } else if (key === 'transformColor') {
                        attributes.transformColor = value.replace(/['"]/g, '');
                    } else if (key === 'subsystem') {
                        attributes.subsystem = value.replace(/['"]/g, '');
                        // Add to subsystem if it exists
                        if (!subsystemMap.has(attributes.subsystem)) {
                            subsystemMap.set(attributes.subsystem, {
                                name: attributes.subsystem,
                                nodes: [],
                                color: null
                            });
                        }
                        subsystemMap.get(attributes.subsystem)!.nodes.push(nodeName);
                    } else if (key === 'x' || key === 'y') {
                        attributes[key] = parseInt(value, 10);
                    } else {
                        const numVal = Number(value);
                        attributes[key] = isNaN(numVal) ? value : numVal;
                    }
                }
            }

            nodeMap.set(nodeName, { id: nodeName, type, attributes });
        }
    }

    // Don't forget the last subsystem/event if we ended in a block
    if (currentSubsystem) {
        subsystemMap.set(currentSubsystem.name, currentSubsystem);
    }
    if (currentEvent) {
        result.events.push(currentEvent as FlowEvent);
    }

    // Convert maps to arrays
    result.nodes = Array.from(nodeMap.values());
    result.subsystems = Array.from(subsystemMap.values());

    // Add default events if none defined
    if (result.events.length === 0) {
        result.events.push({
            name: 'event',
            color: '#6366f1',
            shape: 'circle',
            size: 1,
            source: null,
            rate: 2
        });
    }

    return result;
}

/**
 * Validate a topology structure
 */
export function validateTopology(topology: Topology): ValidationResult {
    const errors: string[] = [];
    const nodeIds = new Set(topology.nodes.map(n => n.id));

    // Check that all edges reference valid nodes
    for (const edge of topology.edges) {
        if (!nodeIds.has(edge.from)) {
            errors.push(`Edge references unknown node: ${edge.from}`);
        }
        if (!nodeIds.has(edge.to)) {
            errors.push(`Edge references unknown node: ${edge.to}`);
        }
    }

    // Check that event sources reference valid nodes
    for (const event of topology.events) {
        if (event.source && !nodeIds.has(event.source)) {
            errors.push(`Event "${event.name}" references unknown source: ${event.source}`);
        }
    }

    // Check that subsystem nodes exist
    for (const subsystem of topology.subsystems || []) {
        for (const nodeId of subsystem.nodes) {
            if (!nodeIds.has(nodeId)) {
                errors.push(`Subsystem "${subsystem.name}" references unknown node: ${nodeId}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
