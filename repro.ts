
// Setup Mocks FIRST
class MockContext {
    save() { }
    restore() { }
    translate() { }
    scale() { }
    beginPath() { }
    moveTo() { }
    lineTo() { }
    arc() { }
    fill() { }
    stroke() { }
    fillRect() { }
    measureText() { return { width: 10 }; }
    fillText() { }
    strokeText() { }
    closePath() { }
    bezierCurveTo() { }
    setLineDash() { }
    roundRect() { }
    ellipse() { }
    drawImage() { }
}

class MockCanvas {
    width = 800;
    height = 600;
    style = {};
    parentElement = {
        getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 })
    };
    getContext() { return new MockContext(); }
    addEventListener() { }
    getBoundingClientRect() { return { width: 800, height: 600, left: 0, top: 0 }; }
}

// @ts-ignore
global.HTMLCanvasElement = MockCanvas;
// @ts-ignore
global.window = {
    addEventListener: () => { },
    devicePixelRatio: 1
};
// @ts-ignore
global.document = {
    createElement: () => new MockCanvas() as any
};
// @ts-ignore
global.performance = {
    now: () => Date.now()
}
// @ts-ignore
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
// @ts-ignore
global.cancelAnimationFrame = (id) => clearTimeout(id);
// @ts-ignore
global.Image = class {
    onload = null;
    src = '';
    complete = false;
};

// Start reproduction
async function runing() {
    console.log('Starting reproduction...');

    // Dynamic imports to ensure mocks are active
    const { FlowCanvas } = await import('./src/renderer/canvas');
    const { AnimationEngine } = await import('./src/animation/engine');
    const { parseDSL } = await import('./src/parser/dsl-parser');
    const { EXAMPLES } = await import('./src/examples/sample-flows');

    // 1. Setup
    const canvas = new MockCanvas() as any;
    const flowCanvas = new FlowCanvas(canvas);
    const engine = new AnimationEngine(flowCanvas);

    // 2. Load DSL
    console.log('Parsing DSL...');
    const dsl = EXAMPLES.mapic;
    const topology = parseDSL(dsl);
    console.log(`Parsed ${topology.nodes.length} nodes, ${topology.events.length} events`);

    flowCanvas.setTopology(topology);

    // 3. Run Loop
    console.log('Starting animation loop...');
    engine.isPlaying = true;
    engine.lastTime = performance.now();
    engine.initEventTimers();

    // Run 5000 frames to check for memory leaks or hangs over time
    console.log('Simulating 5000 frames...');
    const start = performance.now();

    for (let i = 0; i < 5000; i++) {
        if (i % 500 === 0) {
            console.log(`Frame ${i} - Time: ${(performance.now() - start).toFixed(2)}ms`);
        }

        const delta = 16;

        flowCanvas.updateParticles(delta, 1);
        engine.updateEventSpawning(delta);
    }

    console.log('Finished 5000 frames successfully.');
}

runing().catch(e => console.error(e));
