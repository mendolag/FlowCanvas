/**
 * FlowCanvas DSL Parser
 * 
 * Parses a simple DSL format into a structured topology object.
 * 
 * DSL Format:
 * - Node definitions: name: type[, attribute=value]
 *   - delay=500 (ms delay for events passing through)
 *   - transform=circle|triangle|square (changes event shape)
 *   - transformColor=#hex (changes event color)
 *   - subsystem=name (group nodes into a named subsystem)
 * - Flow connections: node1 -> node2 -> node3
 * - Subsystem definitions:
 *   subsystem "Name":
 *     node1: type
 *     node2: type
 * - Event definitions (YAML-like):
 *   events:
 *     - name: eventName
 *       color: "#hex"
 *       shape: circle|triangle|square
 *       size: small|medium|large (or number like 0.5-2)
 *       source: nodeName (which node spawns this event)
 *       rate: 2 (events per second, optional)
 */

const NODE_TYPES = ['service', 'topic', 'db', 'processor', 'external'];
const EVENT_SHAPES = ['circle', 'triangle', 'square'];

/**
 * Parse the DSL text into a topology object
 * @param {string} dsl - The DSL text to parse
 * @returns {{ nodes: Array, edges: Array, events: Array, subsystems: Array, errors: Array }}
 */
export function parseDSL(dsl) {
    const result = {
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
    const nodeMap = new Map();
    const subsystemMap = new Map();
    let inEventsBlock = false;
    let inSubsystemBlock = false;
    let currentSubsystem = null;
    let currentEvent = null;

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
                        const type = parts[0];
                        const attributes = { subsystem: currentSubsystem.name };

                        if (NODE_TYPES.includes(type)) {
                            // Parse attributes
                            for (let j = 1; j < parts.length; j++) {
                                const attr = parts[j];
                                const eqIndex = attr.indexOf('=');
                                if (eqIndex > 0) {
                                    const key = attr.substring(0, eqIndex).trim();
                                    let value = attr.substring(eqIndex + 1).trim();

                                    if (key === 'delay' || key === 'partitions') {
                                        attributes[key] = parseInt(value, 10);
                                    } else if (key === 'transform') {
                                        if (EVENT_SHAPES.includes(value)) {
                                            attributes.transform = value;
                                        }
                                    } else if (key === 'transformColor') {
                                        attributes.transformColor = value.replace(/['"]/g, '');
                                    } else if (key === 'x' || key === 'y') {
                                        attributes[key] = parseInt(value, 10);
                                    } else {
                                        attributes[key] = isNaN(value) ? value : Number(value);
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
                    result.events.push(currentEvent);
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
                if (EVENT_SHAPES.includes(shape)) {
                    currentEvent.shape = shape;
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
                        const attributes = {};

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
                    result.events.push(currentEvent);
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
                let fromSide = 'right';
                let toSide = 'left';

                // Parse explicit sides (node:side)
                if (from.includes(':')) {
                    const [name, side] = from.split(':');
                    from = name.trim();
                    const validSides = ['top', 'bottom', 'left', 'right'];
                    if (validSides.includes(side.trim())) {
                        fromSide = side.trim();
                    }
                }

                if (to.includes(':')) {
                    const [name, side] = to.split(':');
                    to = name.trim();
                    const validSides = ['top', 'bottom', 'left', 'right'];
                    if (validSides.includes(side.trim())) {
                        toSide = side.trim();
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
            const type = parts[0];
            const attributes = {};

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
                    let value = attr.substring(eqIndex + 1).trim();

                    // Handle special attributes
                    if (key === 'delay' || key === 'partitions') {
                        attributes[key] = parseInt(value, 10);
                    } else if (key === 'transform') {
                        if (EVENT_SHAPES.includes(value)) {
                            attributes.transform = value;
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
                        subsystemMap.get(attributes.subsystem).nodes.push(nodeName);
                    } else if (key === 'x' || key === 'y') {
                        attributes[key] = parseInt(value, 10);
                    } else {
                        attributes[key] = isNaN(value) ? value : Number(value);
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
        result.events.push(currentEvent);
    }

    // Convert maps to arrays
    result.nodes = Array.from(nodeMap.values());
    result.subsystems = Array.from(subsystemMap.values());

    // Add default events if none defined
    if (result.events.length === 0) {
        result.events.push(
            { name: 'event', color: '#6366f1', shape: 'circle', size: 1, source: null, rate: 2 }
        );
    }

    return result;
}

/**
 * Validate a topology structure
 * @param {{ nodes: Array, edges: Array, events: Array, subsystems: Array }} topology
 * @returns {{ valid: boolean, errors: Array }}
 */
export function validateTopology(topology) {
    const errors = [];
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
