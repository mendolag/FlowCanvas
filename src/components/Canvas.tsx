import { useRef, useEffect } from 'react';
import { useFlowCanvas } from '../hooks/useFlowCanvas';
import { useFlow } from '../context/FlowContext';

export function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isPlaying, animationRef } = useFlow();

    // Initialize canvas
    useFlowCanvas(canvasRef.current);

    // Auto-play on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (animationRef.current && !animationRef.current.isPlaying) {
                animationRef.current.play();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [animationRef]);

    return (
        <section className="canvas-panel">
            <canvas ref={canvasRef} id="flowCanvas" />
        </section>
    );
}
