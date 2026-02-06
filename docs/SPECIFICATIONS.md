# FlowCanvas DSL v2 Specifications

This document outlines the complete specifications for FlowCanvas, a DSL-driven visualization tool for streaming architectures.

---

## Overview

FlowCanvas transforms text-based DSL descriptions into animated visualizations of data flows, subsystems, and event processing pipelines.

### Key Features

- **DSL-Driven**: Define architecture using concise, readable syntax
- **Animated Visualization**: Watch events flow through the system
- **Subsystems**: Group related components for organization
- **Custom Event Paths**: Define specific paths for complex routing
- **Visual Customization**: Control shapes, colors, and sizes
- **GIF Export**: Record and export visualizations as animated GIFs
- **Interactive Controls**: Play/pause, speed control, zoom/pan

---

## DSL Syntax

### Block Types

The DSL uses a block-based format with four main block types:

| Block Type | Purpose |
|------------|---------|
| `event` | Define event appearance (shape, color, size) |
| `transformation` | Define input→output event mappings |
| `node` | Define system components |
| `subsystem` | Group related nodes |
| `flow` | Define event paths through the system |

---

## Event Definitions

```text
event EventName {
    label: "Display Label"
    color: "#hex"
    shape: <shape>
    size: <size>
}
```

### Event Shapes

| Category | Shapes |
|----------|--------|
| **Geometric** | `circle`, `triangle`, `square`, `diamond` |
| **Icon-Based** | `message`, `document`, `alert`, `lightning`, `package`, `pulse`, `key` |

### Size Presets

- `small`
- `medium`
- `large`

---

## Transformation Definitions

Transformations define how events change as they pass through nodes:

```text
transformation TransformName {
    label: "Display Label"
    input: InputEventName
    output: OutputEventName
    delay: 500  # milliseconds
}
```

---

## Node Definitions

```text
node NodeName {
    label: "Display Label"
    type: <node_type>
    position: (x, y)
    delay: 300              # optional: processing delay in ms
    transformation: Name    # optional: reference to transformation
}
```

### Node Types

| Type | Visual | Use Case |
|------|--------|----------|
| `service` | Rounded rectangle | Backend services, APIs |
| `topic` | Pill/pipe shape | Message queues, Kafka topics |
| `db` | Cylinder | Databases, storage |
| `processor` | Hexagon | Data processing units |
| `external` | Cloud | External systems, gateways |

---

## Subsystem Definitions

Group related nodes into visual subsystems:

```text
subsystem "Subsystem Name" {
    nodes: [Node1, Node2, Node3]
    color: "#hex"
}
```

---

## Flow Definitions

Flows define event paths through the system and implicitly create edges:

```text
flow FlowName {
    label: "Flow Description"
    event: EventName
    source: SourceNode
    rate: 1.5               # events per second
    path: NodeA -> NodeB -> NodeC
}
```
}

### Path Syntax with Connection Sides

Specify connection sides using single-letter shorthand:
-   **Prefix**: Inbound side (where the edge enters)
-   **Suffix**: Outbound side (where the edge leaves)

Format: `[in]:Node:[out]`

```text
path: NodeA:r -> l:NodeB:r -> l:NodeC
```

-   `NodeA` exits from Right (`:r`)
-   `NodeB` enters from Left (`l:`), exits from Right (`:r`)
-   `NodeC` enters from Left (`l:`)

#### Valid Sides
-   `l`, `left`
-   `r`, `right`
-   `t`, `top`
-   `b`, `bottom`

---

## Complete Example

```text
# Event definitions
event OrderCreated {
    label: "Order Created"
    color: "#3b82f6"
    shape: document
    size: medium
}

event PaymentProcessed {
    label: "Payment Processed"
    color: "#10b981"
    shape: package
    size: medium
}

# Transformation
transformation ProcessPayment {
    label: "Process Payment"
    input: OrderCreated
    output: PaymentProcessed
    delay: 500
}

# Nodes
node WebGateway {
    label: "Web Gateway"
    type: external
    position: (0, 100)
}

node PaymentSvc {
    label: "Payment Service"
    type: service
    position: (400, 100)
    transformation: ProcessPayment
}

node OrdersDB {
    label: "Orders Database"
    type: db
    position: (400, 250)
}

# Subsystem
subsystem "Backend Services" {
    nodes: [PaymentSvc, OrdersDB]
    color: "#6366f1"
}

# Flow
flow OrderFlow {
    label: "Order Processing Flow"
    event: OrderCreated
    source: WebGateway
    rate: 1.5
    path: WebGateway:r -> l:PaymentSvc:b -> t:OrdersDB
}
```

---

## Type Definitions Summary

### Core Types

| Type | Values |
|------|--------|
| `NodeType` | `service`, `topic`, `db`, `processor`, `external` |
| `EventShape` | `circle`, `triangle`, `square`, `diamond`, `message`, `document`, `alert`, `lightning`, `package`, `pulse`, `key` |
| `Side` | `left`, `right`, `top`, `bottom` |
| `SizePreset` | `small`, `medium`, `large` |

### Node Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `label` | string | Display label |
| `subsystem` | string | Parent subsystem name |
| `delay` | number | Processing delay (ms) |
| `partitions` | number | Partition count |
| `transformation` | string | Reference to transformation |
| `x`, `y` | number | Position coordinates |

### Flow Event Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Event identifier |
| `label` | string | Display label |
| `color` | string | Hex color code |
| `shape` | EventShape | Visual shape |
| `size` | number | Size value |
| `source` | string | Source node ID |
| `rate` | number | Spawn rate (events/sec) |
| `path` | PathStep[] | Event routing path |

---

## Animation Engine

### Particle Properties

Events animate as "particles" moving along paths:

- **Progress**: 0.0 to 1.0 along current edge
- **Edge Index**: Current segment in multi-hop path
- **Delay**: Wait time at nodes with delay/transformation

### GIF Export Options

| Option | Default | Description |
|--------|---------|-------------|
| `duration` | - | Recording length (ms) |
| `fps` | - | Frames per second |
| `width` | - | Export width (px) |
| `height` | - | Export height (px) |
| `quality` | - | GIF quality setting |

---

## Getting Started

### Prerequisites

- Node.js v14+
- npm

### Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
```
