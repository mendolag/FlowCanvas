# FlowCanvas

FlowCanvas is a tool for transforming DSL descriptions of streaming architectures into animated visualizations. It allows you to model data flows, subsystems, and event processing pipelines using a simple text-based domain-specific language (DSL).

## Features

- **DSL-Driven**: Define your architecture using a concise and readable syntax.
- **Animated Visualization**: Watch events flow through your system to understand data movement and timing.
- **Subsystems**: Group related components into subsystems for better organization.
- **Custom Event Paths**: Define specific paths for different event types to model complex routing logic.
- **Visual Customization**: Control shapes, colors, and sizes of nodes and events.
- **GIF Export**: Record and export your visualizations as animated GIFs to share with your team.
- **Interactive Controls**: Play/pause, speed control, and zoom/pan capabilities.

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd streamPainter
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

Start the local development server with Vite:

```bash
npm run dev
```

Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

### Building for Production

Build the project for production deployment:

```bash
npm run build
```

The output will be in the `dist` directory.

## DSL Syntax Guide

The FlowCanvas DSL allows you to define nodes, connections, and event flows.

### defining Nodes

Nodes represent components in your system (services, topics, databases, etc.). You can optionally specify coordinates.

```text
# Format: <name>: <type> [, x=<val>, y=<val>]
my-service: service, x=100, y=100
orders-topic: topic
user-db: db
```

Supported types: `service`, `topic`, `db`, `external`, `processor`.

### Defining Connections

Connect nodes to define the flow of data.

```text
# Simple connection
my-service -> orders-topic

# Chained connections
source -> process -> sink
```

### Subsystems

Group nodes into subsystems.

```text
subsystem "Payment System":
  payment-api: service
  transaction-log: topic
  
  payment-api -> transaction-log
```

### Events Configuration

Define how events look and move through the system using the `events:` block. You can specify custom paths that override the default connectivity.

```text
events:
  - name: order_created
    color: "#3b82f6"
    shape: circle
    source: my-service
    rate: 1.5
    # Optional: Explicit path definition
    path: my-service -> orders-topic -> processing-service
```

## License

[MIT](LICENSE)
