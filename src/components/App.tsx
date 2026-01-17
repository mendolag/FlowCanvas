import { useEffect } from 'react';
import { FlowProvider, useFlow } from '../context/FlowContext';
import { Header } from './Header';
import { Editor } from './Editor';
import { Canvas } from './Canvas';

function AppContent() {
    const { togglePlayPause, animationRef } = useFlow();

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                togglePlayPause();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayPause]);

    // Auto-play on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (animationRef.current && !animationRef.current.isPlaying) {
                animationRef.current.play();
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [animationRef]);

    return (
        <div id="app">
            <Header />
            <main className="app-main">
                <Editor />
                <Canvas />
            </main>
        </div>
    );
}

export function App() {
    return (
        <FlowProvider>
            <AppContent />
        </FlowProvider>
    );
}
