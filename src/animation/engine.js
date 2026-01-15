/**
 * FlowCanvas Animation Engine
 * 
 * Handles the main animation loop for event particles.
 * Now supports per-event spawn rates and specific source nodes.
 */

export class AnimationEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.isPlaying = false;
        this.speed = 1;
        this.globalSpawnRate = 2; // Fallback events per second
        this.lastTime = 0;
        this.eventTimers = new Map(); // Per-event spawn timers
        this.animationFrame = null;
    }

    /**
     * Start the animation
     */
    play() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.lastTime = performance.now();
        this.initEventTimers();
        this.loop();
    }

    /**
     * Initialize timers for each event type
     */
    initEventTimers() {
        this.eventTimers.clear();

        const topology = this.canvas.topology;
        if (!topology) return;

        for (const event of topology.events) {
            const rate = event.rate || this.globalSpawnRate;
            this.eventTimers.set(event.name, {
                event,
                // Start with timer full so first event spawns immediately
                timeSinceLastSpawn: 1000 / rate
            });
        }
    }

    /**
     * Pause the animation
     */
    pause() {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Toggle play/pause
     * @returns {boolean} - New playing state
     */
    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    /**
     * Set animation speed
     * @param {number} speed - Speed multiplier (0.25 - 4)
     */
    setSpeed(speed) {
        this.speed = Math.max(0.25, Math.min(4, speed));
    }

    /**
     * Set global event spawn rate (fallback)
     * @param {number} rate - Events per second
     */
    setSpawnRate(rate) {
        this.globalSpawnRate = Math.max(0.5, Math.min(5, rate));
    }

    /**
     * Main animation loop
     */
    loop() {
        if (!this.isPlaying) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update particles
        this.canvas.updateParticles(deltaTime, this.speed);

        // Spawn new events based on their individual rates
        this.updateEventSpawning(deltaTime);

        // Render
        this.canvas.render();

        // Continue loop
        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    /**
     * Update event spawning based on per-event rates
     */
    updateEventSpawning(deltaTime) {
        const topology = this.canvas.topology;
        if (!topology || topology.events.length === 0) return;

        const sourceNodes = this.canvas.getSourceNodes();
        // Scale time by speed so spawning matches particle movement
        const scaledDeltaTime = deltaTime * this.speed;

        for (const [eventName, timer] of this.eventTimers) {
            const event = timer.event;
            const rate = event.rate || this.globalSpawnRate;
            // Rate = events per second. Interval = 1000ms / rate
            const spawnInterval = 1000 / rate;

            timer.timeSinceLastSpawn += scaledDeltaTime;

            // Use while loop to catch up if we missed frames, 
            // but limit to preventing infinite loops/explosions on huge lag
            let spawnCount = 0;
            while (timer.timeSinceLastSpawn >= spawnInterval && spawnCount < 5) {
                this.spawnEvent(event, sourceNodes);
                timer.timeSinceLastSpawn -= spawnInterval;
                spawnCount++;
            }

            // If we are still way behind (lag spike), just reset to avoid mega-burst
            if (timer.timeSinceLastSpawn > spawnInterval) {
                timer.timeSinceLastSpawn = 0;
            }
        }
    }

    /**
     * Spawn a specific event
     * @param {Object} event - Event definition
     * @param {Array} sourceNodes - Available source nodes
     */
    spawnEvent(event, sourceNodes) {
        if (sourceNodes.length === 0) return;

        // Determine which source node to use
        let sourceNode;

        if (event.source) {
            // Use specified source if it exists and is a valid source
            if (sourceNodes.includes(event.source)) {
                sourceNode = event.source;
            } else {
                // If specified source exists but isn't a true source (has incoming edges),
                // still allow spawning from it
                const nodeExists = this.canvas.layoutNodes.has(event.source);
                if (nodeExists) {
                    sourceNode = event.source;
                } else {
                    // Fallback to random source
                    sourceNode = sourceNodes[Math.floor(Math.random() * sourceNodes.length)];
                }
            }
        } else {
            // Random source node
            sourceNode = sourceNodes[Math.floor(Math.random() * sourceNodes.length)];
        }

        this.canvas.addParticle(event, sourceNode);
    }

    /**
     * Spawn a random event (for GIF export and other uses)
     * No parameters needed - picks random event and source
     */
    spawnRandomEvent() {
        const topology = this.canvas.topology;
        if (!topology || !topology.events || topology.events.length === 0) return;

        const sourceNodes = this.canvas.getSourceNodes();
        if (sourceNodes.length === 0) return;

        // Pick a random event type
        const event = topology.events[Math.floor(Math.random() * topology.events.length)];
        this.spawnEvent(event, sourceNodes);
    }

    /**
     * Stop animation and clear all particles
     */
    stop() {
        this.pause();
        this.canvas.clearParticles();
        this.canvas.render();
        this.eventTimers.clear();
    }

    /**
     * Reset without stopping
     */
    reset() {
        this.canvas.clearParticles();
        this.initEventTimers();
    }
}
