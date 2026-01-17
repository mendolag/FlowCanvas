/**
 * FlowCanvas Animation Engine
 * 
 * Handles the main animation loop for event particles.
 * Supports per-event spawn rates and specific source nodes.
 */

import type { FlowCanvas } from '../renderer/canvas';
import type { FlowEvent, EventTimer } from '../types';

export class AnimationEngine {
    canvas: FlowCanvas;
    isPlaying: boolean;
    speed: number;
    globalSpawnRate: number;
    lastTime: number;
    eventTimers: Map<string, EventTimer>;
    animationFrame: number | null;

    constructor(canvas: FlowCanvas) {
        this.canvas = canvas;
        this.isPlaying = false;
        this.speed = 1;
        this.globalSpawnRate = 2;
        this.lastTime = 0;
        this.eventTimers = new Map();
        this.animationFrame = null;
    }

    /**
     * Start the animation
     */
    play(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.lastTime = performance.now();
        this.initEventTimers();
        this.loop();
    }

    /**
     * Initialize timers for each event type
     */
    initEventTimers(): void {
        this.eventTimers.clear();

        const topology = this.canvas.topology;
        if (!topology) return;

        for (const event of topology.events) {
            const rate = event.rate || this.globalSpawnRate;
            this.eventTimers.set(event.name, {
                event,
                timeSinceLastSpawn: 1000 / rate
            });
        }
    }

    /**
     * Pause the animation
     */
    pause(): void {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Toggle play/pause
     */
    toggle(): boolean {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    /**
     * Set animation speed
     */
    setSpeed(speed: number): void {
        this.speed = Math.max(0.25, Math.min(4, speed));
    }

    /**
     * Set global event spawn rate (fallback)
     */
    setSpawnRate(rate: number): void {
        this.globalSpawnRate = Math.max(0.5, Math.min(5, rate));
    }

    /**
     * Main animation loop
     */
    loop(): void {
        if (!this.isPlaying) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.canvas.updateParticles(deltaTime, this.speed);
        this.updateEventSpawning(deltaTime);
        this.canvas.render();

        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    /**
     * Update event spawning based on per-event rates
     */
    updateEventSpawning(deltaTime: number): void {
        const topology = this.canvas.topology;
        if (!topology || topology.events.length === 0) return;

        const sourceNodes = this.canvas.getSourceNodes();
        const scaledDeltaTime = deltaTime * this.speed;

        for (const [_eventName, timer] of this.eventTimers) {
            const event = timer.event;
            const rate = event.rate || this.globalSpawnRate;
            const spawnInterval = 1000 / rate;

            timer.timeSinceLastSpawn += scaledDeltaTime;

            let spawnCount = 0;
            while (timer.timeSinceLastSpawn >= spawnInterval && spawnCount < 5) {
                this.spawnEvent(event, sourceNodes);
                timer.timeSinceLastSpawn -= spawnInterval;
                spawnCount++;
            }

            if (timer.timeSinceLastSpawn > spawnInterval) {
                timer.timeSinceLastSpawn = 0;
            }
        }
    }

    /**
     * Spawn a specific event
     */
    spawnEvent(event: FlowEvent, sourceNodes: string[]): void {
        if (sourceNodes.length === 0) return;

        let sourceNode: string;

        if (event.source) {
            if (sourceNodes.includes(event.source)) {
                sourceNode = event.source;
            } else {
                const nodeExists = this.canvas.layoutNodes.has(event.source);
                if (nodeExists) {
                    sourceNode = event.source;
                } else {
                    sourceNode = sourceNodes[Math.floor(Math.random() * sourceNodes.length)];
                }
            }
        } else {
            sourceNode = sourceNodes[Math.floor(Math.random() * sourceNodes.length)];
        }

        this.canvas.addParticle(event, sourceNode);
    }

    /**
     * Spawn a random event (for GIF export and other uses)
     */
    spawnRandomEvent(): void {
        const topology = this.canvas.topology;
        if (!topology?.events || topology.events.length === 0) return;

        const sourceNodes = this.canvas.getSourceNodes();
        if (sourceNodes.length === 0) return;

        const event = topology.events[Math.floor(Math.random() * topology.events.length)];
        this.spawnEvent(event, sourceNodes);
    }

    /**
     * Stop animation and clear all particles
     */
    stop(): void {
        this.pause();
        this.canvas.clearParticles();
        this.canvas.render();
        this.eventTimers.clear();
    }

    /**
     * Reset without stopping
     */
    reset(): void {
        this.canvas.clearParticles();
        this.initEventTimers();
    }
}
