import { useEffect, useRef, useCallback } from 'react';
import { FlowCanvas } from '../renderer/canvas';
import { AnimationEngine } from '../animation/engine';
import { useFlow } from '../context/FlowContext';

export function useFlowCanvas(canvasElement: HTMLCanvasElement | null) {
    const { canvasRef, animationRef, topology, setTopology } = useFlow();
    const initialized = useRef(false);

    // Initialize canvas and animation engine
    useEffect(() => {
        if (!canvasElement || initialized.current) return;

        const flowCanvas = new FlowCanvas(canvasElement);
        const engine = new AnimationEngine(flowCanvas);

        canvasRef.current = flowCanvas;
        animationRef.current = engine;
        initialized.current = true;

        return () => {
            engine.stop();
        };
    }, [canvasElement, canvasRef, animationRef]);

    // Update topology when it changes
    useEffect(() => {
        if (canvasRef.current && topology) {
            canvasRef.current.setTopology(topology);
        }
    }, [topology, canvasRef]);

    const play = useCallback(() => {
        if (animationRef.current) {
            animationRef.current.play();
        }
    }, [animationRef]);

    const pause = useCallback(() => {
        if (animationRef.current) {
            animationRef.current.pause();
        }
    }, [animationRef]);

    return {
        canvas: canvasRef.current,
        animation: animationRef.current,
        play,
        pause,
    };
}
