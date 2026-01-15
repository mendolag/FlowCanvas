/**
 * FlowCanvas GIF Exporter
 * 
 * Captures canvas frames and exports as GIF using gif.js library.
 */

import GIF from 'gif.js';

/**
 * Export the canvas animation as a GIF
 * @param {FlowCanvas} flowCanvas - The canvas instance
 * @param {AnimationEngine} animationEngine - The animation engine
 * @param {Object} options - Export options
 * @param {Function} onProgress - Progress callback (0-1)
 * @returns {Promise<Blob>} - The GIF blob
 */
export async function exportGif(flowCanvas, animationEngine, options = {}, onProgress = () => { }) {
    const {
        duration = 3000, // Total duration in ms
        fps = 20,
        width = 800,
        height = 450,
        quality = 10 // 1-30, lower is better
    } = options;

    return new Promise((resolve, reject) => {
        // Create a temporary canvas for recording
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // Create GIF encoder
        const gif = new GIF({
            workers: 2,
            quality,
            width,
            height,
            workerScript: '/gif.worker.js'
        });

        // Calculate frames
        const frameInterval = 1000 / fps;
        const totalFrames = Math.ceil(duration / frameInterval);
        let currentFrame = 0;

        // Store original state
        const wasPlaying = animationEngine.isPlaying;
        const originalSpeed = animationEngine.speed;

        // Reset animation for clean recording
        animationEngine.reset();
        animationEngine.setSpeed(1);

        // Capture frames
        const captureFrame = () => {
            if (currentFrame >= totalFrames) {
                // Finalize GIF
                gif.on('finished', (blob) => {
                    // Restore original state
                    animationEngine.setSpeed(originalSpeed);
                    if (wasPlaying) {
                        animationEngine.play();
                    }
                    resolve(blob);
                });

                gif.render();
                return;
            }

            // Update animation
            if (currentFrame > 0) {
                flowCanvas.updateParticles(frameInterval, 1);

                // Spawn events at appropriate rate
                if (currentFrame % Math.floor(fps / animationEngine.globalSpawnRate) === 0) {
                    animationEngine.spawnRandomEvent();
                }
            } else {
                // Spawn initial events
                for (let i = 0; i < 3; i++) {
                    animationEngine.spawnRandomEvent();
                }
            }

            // Render to main canvas
            flowCanvas.render();

            // Copy to temp canvas with scaling
            tempCtx.fillStyle = '#f8fafc';
            tempCtx.fillRect(0, 0, width, height);

            // Scale and center
            const scale = Math.min(width / flowCanvas.width, height / flowCanvas.height);
            const offsetX = (width - flowCanvas.width * scale) / 2;
            const offsetY = (height - flowCanvas.height * scale) / 2;

            tempCtx.drawImage(
                flowCanvas.canvas,
                0, 0, flowCanvas.canvas.width, flowCanvas.canvas.height,
                offsetX, offsetY, flowCanvas.width * scale, flowCanvas.height * scale
            );

            // Add frame to GIF
            gif.addFrame(tempCtx, { copy: true, delay: frameInterval });

            currentFrame++;
            onProgress(currentFrame / totalFrames);

            // Use setTimeout for non-blocking
            setTimeout(captureFrame, 0);
        };

        // Start capturing
        captureFrame();
    });
}

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - Filename
 */
export function downloadBlob(blob, filename = 'flowcanvas-animation.gif') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
