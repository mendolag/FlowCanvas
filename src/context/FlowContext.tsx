import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Topology, ParseError } from '../types';
import { FlowCanvas } from '../renderer/canvas';
import { AnimationEngine } from '../animation/engine';

interface FlowContextType {
    // State
    dsl: string;
    topology: Topology | null;
    errors: ParseError[];
    isPlaying: boolean;
    speed: number;
    spawnRate: number;

    // Canvas refs (for direct access)
    canvasRef: React.RefObject<FlowCanvas | null>;
    animationRef: React.RefObject<AnimationEngine | null>;

    // Actions
    setDsl: (dsl: string) => void;
    setTopology: (topology: Topology) => void;
    setErrors: (errors: ParseError[]) => void;
    setIsPlaying: (playing: boolean) => void;
    togglePlayPause: () => void;
    setSpeed: (speed: number) => void;
    setSpawnRate: (rate: number) => void;
    resetView: () => void;
    reload: () => void;
}

const FlowContext = createContext<FlowContextType | null>(null);

export function useFlow(): FlowContextType {
    const context = useContext(FlowContext);
    if (!context) {
        throw new Error('useFlow must be used within a FlowProvider');
    }
    return context;
}

interface FlowProviderProps {
    children: ReactNode;
}

export function FlowProvider({ children }: FlowProviderProps) {
    const [dsl, setDsl] = useState('');
    const [topology, setTopology] = useState<Topology | null>(null);
    const [errors, setErrors] = useState<ParseError[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeedState] = useState(1);
    const [spawnRate, setSpawnRateState] = useState(2);

    const canvasRef = useRef<FlowCanvas | null>(null);
    const animationRef = useRef<AnimationEngine | null>(null);

    const togglePlayPause = useCallback(() => {
        if (animationRef.current) {
            const playing = animationRef.current.toggle();
            setIsPlaying(playing);
        }
    }, []);

    const setSpeed = useCallback((newSpeed: number) => {
        setSpeedState(newSpeed);
        if (animationRef.current) {
            animationRef.current.setSpeed(newSpeed);
        }
    }, []);

    const setSpawnRate = useCallback((rate: number) => {
        setSpawnRateState(rate);
        if (animationRef.current) {
            animationRef.current.setSpawnRate(rate);
        }
    }, []);

    const resetView = useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.resetView();
        }
    }, []);

    const reload = useCallback(() => {
        if (animationRef.current) {
            animationRef.current.reset();
        }
        if (canvasRef.current && topology) {
            canvasRef.current.setTopology(topology);
        }
    }, [topology]);

    const value: FlowContextType = {
        dsl,
        topology,
        errors,
        isPlaying,
        speed,
        spawnRate,
        canvasRef,
        animationRef,
        setDsl,
        setTopology,
        setErrors,
        setIsPlaying,
        togglePlayPause,
        setSpeed,
        setSpawnRate,
        resetView,
        reload,
    };

    return (
        <FlowContext.Provider value={value}>
            {children}
        </FlowContext.Provider>
    );
}
