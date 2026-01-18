/**
 * FlowCanvas DSL v2 Parser
 * 
 * Parses the new block-based DSL format into a structured topology object.
 * 
 * Syntax:
 *   event Name { label: "..."; color: "..."; shape: "..."; size: "..."; }
 *   transformation Name { label: "..."; input: Event; output: Event; delay: N; }
 *   node Name { label: "..."; type: service; position: (X, Y); transformation: T; }
 *   subsystem "Name" { nodes: [A, B]; color: "..."; }
 *   flow Name { event: E; source: N; rate: R; path: A -> B[T] -> C; }
 *   A -> B -> C  (shorthand edge definitions)
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
    Transformation,
    ParseError,
    Topology,
    ValidationResult,
} from '../types';

const NODE_TYPES: readonly NodeType[] = ['service', 'topic', 'db', 'processor', 'external'];
const EVENT_SHAPES: readonly EventShape[] = [
    'circle', 'triangle', 'square', 'diamond',
    'message', 'document', 'alert', 'lightning', 'package', 'pulse', 'key'
];
const VALID_SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right'];

/**
 * Parse the DSL text into a topology object
 */
export function parseDSL(dsl: string): Topology {
    const result: Topology = {
        nodes: [],
        edges: [],
        events: [],
        transformations: [],
        subsystems: [],
        errors: []
    };

    if (!dsl || !dsl.trim()) {
        return result;
    }

    const nodeMap = new Map<string, Node>();
    const eventMap = new Map<string, FlowEvent>();
    const transformationMap = new Map<string, Transformation>();
    const subsystemMap = new Map<string, Subsystem>();
    const flowEvents: FlowEvent[] = [];

    // Tokenize and parse blocks
    const content = dsl;
    let pos = 0;
    let lineNum = 1;

    const skipWhitespace = () => {
        while (pos < content.length) {
            if (content[pos] === '\n') {
                lineNum++;
                pos++;
            } else if (/\s/.test(content[pos])) {
                pos++;
            } else if (content[pos] === '#') {
                // Skip comment to end of line
                while (pos < content.length && content[pos] !== '\n') pos++;
            } else {
                break;
            }
        }
    };

    const parseIdentifier = (): string => {
        skipWhitespace();
        let id = '';
        while (pos < content.length && /[a-zA-Z0-9_\-]/.test(content[pos])) {
            id += content[pos++];
        }
        return id;
    };

    const parseString = (): string => {
        skipWhitespace();
        if (content[pos] !== '"' && content[pos] !== "'") return '';
        const quote = content[pos++];
        let str = '';
        while (pos < content.length && content[pos] !== quote) {
            str += content[pos++];
        }
        pos++; // skip closing quote
        return str;
    };

    const parseNumber = (): number => {
        skipWhitespace();
        let numStr = '';
        if (content[pos] === '-') numStr += content[pos++];
        while (pos < content.length && /[0-9.]/.test(content[pos])) {
            numStr += content[pos++];
        }
        return parseFloat(numStr) || 0;
    };

    const parseBlock = (): Record<string, string | number | string[]> => {
        skipWhitespace();
        const block: Record<string, string | number | string[]> = {};

        if (content[pos] !== '{') return block;
        pos++; // skip {

        while (pos < content.length) {
            skipWhitespace();
            if (content[pos] === '}') {
                pos++;
                break;
            }

            const key = parseIdentifier();
            if (!key) {
                pos++;
                continue;
            }

            skipWhitespace();
            if (content[pos] === ':') pos++;
            skipWhitespace();

            // Check for array
            if (content[pos] === '[') {
                pos++; // skip [
                const arr: string[] = [];
                while (pos < content.length && content[pos] !== ']') {
                    skipWhitespace();
                    // Check bounds/end again after whitespace
                    if (pos >= content.length || content[pos] === ']') break;

                    const item = parseIdentifier();
                    if (item) {
                        arr.push(item);
                    } else {
                        // If we couldn't parse an identifier and it's not a closing bracket,
                        // we MUST advance pos to avoid infinite loop.
                        // This handles invalid characters inside arrays.
                        if (content[pos] !== ']') {
                            pos++;
                        }
                    }

                    skipWhitespace();
                    if (content[pos] === ',') pos++;
                }
                if (pos < content.length) pos++; // skip ]
                block[key] = arr;
            }
            // Check for position tuple (x, y)
            else if (content[pos] === '(') {
                pos++; // skip (
                const x = parseNumber();
                skipWhitespace();
                if (content[pos] === ',') pos++;
                const y = parseNumber();
                skipWhitespace();
                if (content[pos] === ')') pos++;
                block['x'] = x;
                block['y'] = y;
            }
            // Check for string
            else if (content[pos] === '"' || content[pos] === "'") {
                block[key] = parseString();
            }
            // Check for number or identifier
            else {
                const value = parseIdentifier();
                const numValue = parseFloat(value);
                block[key] = isNaN(numValue) ? value : numValue;
            }

            skipWhitespace();
            if (content[pos] === ';') pos++;
        }

        return block;
    };

    const parsePath = (pathStr: string): PathStep[] => {
        const steps: PathStep[] = [];
        const segments = pathStr.split('->').map(s => s.trim());

        for (const segment of segments) {
            if (!segment) continue;

            // Check for attributes: NodeName[key=value, ...]
            const match = segment.match(/^([a-zA-Z0-9_\-]+)(?::([a-z]+))?\s*(?:\[(.+)\])?$/);
            if (match) {
                const nodeId = match[1];
                const attributes: Record<string, string> = {};

                if (match[3]) {
                    // Parse attributes
                    match[3].split(',').forEach(pair => {
                        const [key, val] = pair.split('=').map(p => p.trim());
                        if (key && val) {
                            attributes[key] = val.replace(/['"]/g, '');
                        } else if (key && !val) {
                            // Just a name (transformation reference)
                            attributes['transformation'] = key;
                        }
                    });
                }

                steps.push({
                    nodeId,
                    attributes: Object.keys(attributes).length > 0 ? attributes : null
                });
            }
        }

        return steps;
    };

    // Main parse loop
    while (pos < content.length) {
        skipWhitespace();
        if (pos >= content.length) break;

        const startLine = lineNum;
        const keyword = parseIdentifier();

        if (!keyword) {
            pos++;
            continue;
        }

        try {
            switch (keyword) {
                case 'event': {
                    const name = parseIdentifier();
                    const block = parseBlock();
                    const event: FlowEvent = {
                        name,
                        label: (block.label as string) || undefined,
                        color: (block.color as string) || '#6366f1',
                        shape: (EVENT_SHAPES.includes(block.shape as EventShape)
                            ? block.shape as EventShape : 'circle'),
                        size: typeof block.size === 'number' ? block.size :
                            block.size === 'small' ? 0.6 :
                                block.size === 'large' ? 1.5 : 1,
                        source: null,
                        rate: 2
                    };
                    eventMap.set(name, event);
                    break;
                }

                case 'transformation': {
                    const name = parseIdentifier();
                    const block = parseBlock();
                    const transformation: Transformation = {
                        name,
                        label: (block.label as string) || undefined,
                        input: (block.input as string) || '',
                        output: (block.output as string) || '',
                        outputRate: typeof block.outputRate === 'number' ? block.outputRate : 1,
                        delay: typeof block.delay === 'number' ? block.delay : 0
                    };
                    transformationMap.set(name, transformation);
                    break;
                }

                case 'node': {
                    const name = parseIdentifier();
                    const block = parseBlock();
                    const nodeType = NODE_TYPES.includes(block.type as NodeType)
                        ? block.type as NodeType : 'service';

                    const attributes: NodeAttributes = {
                        label: block.label as string,
                        x: block.x as number,
                        y: block.y as number,
                        delay: block.delay as number,
                        transformation: block.transformation as string,
                        subsystem: block.subsystem as string,
                    };

                    // Clean undefined values
                    Object.keys(attributes).forEach(key => {
                        if (attributes[key] === undefined) delete attributes[key];
                    });

                    nodeMap.set(name, {
                        id: name,
                        type: nodeType,
                        attributes
                    });
                    break;
                }

                case 'subsystem': {
                    const name = parseString() || parseIdentifier();
                    const block = parseBlock();
                    const subsystem: Subsystem = {
                        name,
                        nodes: (block.nodes as string[]) || [],
                        color: (block.color as string) || null
                    };
                    subsystemMap.set(name, subsystem);
                    break;
                }

                case 'flow': {
                    const name = parseIdentifier();
                    const block = parseBlock();

                    // Get the base event
                    const baseEventName = block.event as string;
                    const baseEvent = eventMap.get(baseEventName);

                    // Parse path from remaining content in block
                    // For now, path is parsed separately below

                    const flowEvent: FlowEvent = {
                        name: name,
                        label: (block.label as string) || undefined,
                        color: baseEvent?.color || '#6366f1',
                        shape: baseEvent?.shape || 'circle',
                        size: baseEvent?.size || 1,
                        source: (block.source as string) || null,
                        rate: typeof block.rate === 'number' ? block.rate : 2,
                        path: undefined // Will be parsed from path property
                    };

                    flowEvents.push(flowEvent);
                    break;
                }

                default: {
                    // Could be edge shorthand: NodeA -> NodeB -> NodeC
                    // Or node definition: NodeName: type, attr=value
                    skipWhitespace();

                    // Check for edge definition (->)
                    if (content.slice(pos, pos + 2) === '->' ||
                        content.slice(pos).match(/^:?[a-z]*\s*->/)) {

                        // Rewind and parse full line as edge
                        let edgeLine = keyword;
                        while (pos < content.length && content[pos] !== '\n') {
                            edgeLine += content[pos++];
                        }

                        const parts = edgeLine.split('->').map(p => p.trim());
                        for (let j = 0; j < parts.length - 1; j++) {
                            let from = parts[j];
                            let to = parts[j + 1];
                            let fromSide: Side = 'right';
                            let toSide: Side = 'left';

                            // Parse sides
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

                            // Remove any trailing attributes from 'to'
                            to = to.split('[')[0].trim();

                            if (from && to) {
                                // Create nodes if they don't exist
                                if (!nodeMap.has(from)) {
                                    nodeMap.set(from, { id: from, type: 'service', attributes: {} });
                                }
                                if (!nodeMap.has(to)) {
                                    nodeMap.set(to, { id: to, type: 'service', attributes: {} });
                                }
                                result.edges.push({ from, to, fromSide, toSide });
                            }
                        }
                    }
                    // Check for colon (node definition)
                    else if (content[pos] === ':') {
                        pos++; // skip :
                        skipWhitespace();

                        let defLine = '';
                        while (pos < content.length && content[pos] !== '\n') {
                            defLine += content[pos++];
                        }

                        const parts = defLine.split(',').map(p => p.trim());
                        const nodeType = NODE_TYPES.includes(parts[0] as NodeType)
                            ? parts[0] as NodeType : 'service';

                        const attributes: NodeAttributes = {};
                        for (let j = 1; j < parts.length; j++) {
                            const [key, val] = parts[j].split('=').map(p => p.trim());
                            if (key && val) {
                                if (key === 'delay' || key === 'x' || key === 'y' || key === 'partitions') {
                                    attributes[key] = parseInt(val, 10);
                                } else if (key === 'label' || key === 'transformation' || key === 'subsystem') {
                                    attributes[key] = val.replace(/['"]/g, '');
                                } else if (key === 'transform' && EVENT_SHAPES.includes(val as EventShape)) {
                                    attributes.transform = val as EventShape;
                                } else if (key === 'transformColor') {
                                    attributes.transformColor = val.replace(/['"]/g, '');
                                } else {
                                    const numVal = parseFloat(val);
                                    attributes[key] = isNaN(numVal) ? val : numVal;
                                }
                            }
                        }

                        // Handle subsystem reference
                        if (attributes.subsystem) {
                            const subName = attributes.subsystem as string;
                            if (!subsystemMap.has(subName)) {
                                subsystemMap.set(subName, { name: subName, nodes: [], color: null });
                            }
                            subsystemMap.get(subName)!.nodes.push(keyword);
                        }

                        nodeMap.set(keyword, { id: keyword, type: nodeType, attributes });
                    }
                    break;
                }
            }
        } catch (e) {
            result.errors.push({
                line: startLine,
                message: `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`
            });
        }
    }

    // Handle old-style events: block and subsystem blocks
    // Re-parse for backwards compatibility with indented blocks
    const lines = dsl.split('\n');
    let inEventsBlock = false;
    let inSubsystemBlock = false;
    let currentSubsystemName: string | null = null;
    let currentEvent: Partial<FlowEvent> | null = null;

    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) continue;

        // Subsystem block start
        const subsysMatch = trimmed.match(/^subsystem\s+["'](.+)["']\s*:$/);
        if (subsysMatch) {
            currentSubsystemName = subsysMatch[1];
            if (!subsystemMap.has(currentSubsystemName)) {
                subsystemMap.set(currentSubsystemName, {
                    name: currentSubsystemName,
                    nodes: [],
                    color: null
                });
            }
            inSubsystemBlock = true;
            inEventsBlock = false;
            continue;
        }

        // Events block start
        if (trimmed === 'events:') {
            inEventsBlock = true;
            inSubsystemBlock = false;
            currentSubsystemName = null;
            continue;
        }

        // Inside subsystem block
        if (inSubsystemBlock && currentSubsystemName && (line.startsWith('  ') || line.startsWith('\t'))) {
            if (trimmed.startsWith('color:')) {
                const sub = subsystemMap.get(currentSubsystemName);
                if (sub) sub.color = trimmed.substring(6).trim().replace(/['"]/g, '');
                continue;
            }

            const colonIdx = trimmed.indexOf(':');
            if (colonIdx > 0 && !trimmed.includes('->')) {
                const nodeName = trimmed.substring(0, colonIdx).trim();
                const def = trimmed.substring(colonIdx + 1).trim();
                const parts = def.split(',').map(p => p.trim());
                const nodeType = NODE_TYPES.includes(parts[0] as NodeType) ? parts[0] as NodeType : 'service';

                const attrs: NodeAttributes = { subsystem: currentSubsystemName };
                for (let j = 1; j < parts.length; j++) {
                    const [key, val] = parts[j].split('=').map(p => p.trim());
                    if (key && val) {
                        if (['delay', 'x', 'y', 'partitions'].includes(key)) {
                            attrs[key] = parseInt(val, 10);
                        } else if (key === 'label') {
                            attrs.label = val.replace(/['"]/g, '');
                        } else if (key === 'transformation') {
                            attrs.transformation = val.replace(/['"]/g, '');
                        } else if (key === 'transform' && EVENT_SHAPES.includes(val as EventShape)) {
                            attrs.transform = val as EventShape;
                        } else if (key === 'transformColor') {
                            attrs.transformColor = val.replace(/['"]/g, '');
                        } else {
                            const numVal = parseFloat(val);
                            attrs[key] = isNaN(numVal) ? val : numVal;
                        }
                    }
                }

                nodeMap.set(nodeName, { id: nodeName, type: nodeType, attributes: attrs });
                subsystemMap.get(currentSubsystemName)!.nodes.push(nodeName);
            }
            continue;
        } else if (inSubsystemBlock && !line.startsWith('  ') && !line.startsWith('\t') && trimmed) {
            inSubsystemBlock = false;
            currentSubsystemName = null;
        }

        // Inside events block
        if (inEventsBlock) {
            if (trimmed.startsWith('- name:')) {
                if (currentEvent && currentEvent.name) {
                    flowEvents.push(currentEvent as FlowEvent);
                }
                currentEvent = {
                    name: trimmed.substring(7).trim(),
                    color: '#6366f1',
                    shape: 'circle',
                    size: 1,
                    source: null,
                    rate: 2
                };
                continue;
            }

            if (currentEvent) {
                if (trimmed.startsWith('label:')) {
                    currentEvent.label = trimmed.substring(6).trim().replace(/['"]/g, '');
                } else if (trimmed.startsWith('color:')) {
                    currentEvent.color = trimmed.substring(6).trim().replace(/['"]/g, '');
                } else if (trimmed.startsWith('shape:')) {
                    const shape = trimmed.substring(6).trim();
                    if (EVENT_SHAPES.includes(shape as EventShape)) {
                        currentEvent.shape = shape as EventShape;
                    }
                } else if (trimmed.startsWith('size:')) {
                    const sizeVal = trimmed.substring(5).trim();
                    currentEvent.size = sizeVal === 'small' ? 0.6 :
                        sizeVal === 'large' ? 1.5 :
                            parseFloat(sizeVal) || 1;
                } else if (trimmed.startsWith('source:')) {
                    currentEvent.source = trimmed.substring(7).trim();
                } else if (trimmed.startsWith('rate:')) {
                    currentEvent.rate = parseFloat(trimmed.substring(5).trim()) || 2;
                } else if (trimmed.startsWith('path:')) {
                    currentEvent.path = parsePath(trimmed.substring(5).trim());
                }
            }

            if (!line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('-') && trimmed) {
                if (currentEvent && currentEvent.name) {
                    flowEvents.push(currentEvent as FlowEvent);
                    currentEvent = null;
                }
                inEventsBlock = false;
            }
            continue;
        }
    }

    // Push final event if any
    if (currentEvent && currentEvent.name) {
        flowEvents.push(currentEvent as FlowEvent);
    }

    // Build result
    result.nodes = Array.from(nodeMap.values());
    result.events = flowEvents.length > 0 ? flowEvents : Array.from(eventMap.values());
    result.transformations = Array.from(transformationMap.values());
    result.subsystems = Array.from(subsystemMap.values());

    // Add default event if none
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
    const eventNames = new Set(topology.events.map(e => e.name));
    const transformationNames = new Set(topology.transformations.map(t => t.name));

    // Check edges reference valid nodes
    for (const edge of topology.edges) {
        if (!nodeIds.has(edge.from)) {
            errors.push(`Edge references unknown node: ${edge.from}`);
        }
        if (!nodeIds.has(edge.to)) {
            errors.push(`Edge references unknown node: ${edge.to}`);
        }
    }

    // Check event sources
    for (const event of topology.events) {
        if (event.source && !nodeIds.has(event.source)) {
            errors.push(`Event "${event.name}" references unknown source: ${event.source}`);
        }
    }

    // Check transformation references
    for (const trans of topology.transformations) {
        if (trans.input && !eventNames.has(trans.input)) {
            errors.push(`Transformation "${trans.name}" references unknown input event: ${trans.input}`);
        }
        if (trans.output && !eventNames.has(trans.output)) {
            errors.push(`Transformation "${trans.name}" references unknown output event: ${trans.output}`);
        }
    }

    // Check node transformation references
    for (const node of topology.nodes) {
        if (node.attributes.transformation && !transformationNames.has(node.attributes.transformation)) {
            errors.push(`Node "${node.id}" references unknown transformation: ${node.attributes.transformation}`);
        }
    }

    // Check subsystem nodes
    for (const subsystem of topology.subsystems) {
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
