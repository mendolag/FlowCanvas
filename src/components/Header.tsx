import { useFlow } from '../context/FlowContext';
import { getExample, type ExampleName } from '../examples/sample-flows';
import { useState, useCallback } from 'react';
import { exportGif, downloadBlob } from '../export/gif-exporter';

export function Header() {
    const {
        isPlaying, speed, spawnRate,
        togglePlayPause, setSpeed, setSpawnRate,
        resetView, reload, setDsl,
        canvasRef, animationRef
    } = useFlow();
    const [isExporting, setIsExporting] = useState(false);

    const loadExample = useCallback((name: ExampleName) => {
        const example = getExample(name);
        setDsl(example);
    }, [setDsl]);

    const handleExport = useCallback(async () => {
        if (!canvasRef.current || !animationRef.current) return;

        setIsExporting(true);

        try {
            const blob = await exportGif(canvasRef.current, animationRef.current, {
                duration: 4000,
                fps: 20,
                width: 1280,
                height: 720,
                quality: 5
            }, () => { });

            downloadBlob(blob, 'flowcanvas-animation.gif');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [canvasRef, animationRef]);

    return (
        <header className="app-header">
            <div className="header-left">
                <div className="logo">
                    <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                    <span className="logo-text">FlowCanvas</span>
                </div>
            </div>

            <div className="header-center">
                {/* Playback controls */}
                <button
                    className={`header-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={togglePlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    <svg className={`icon play-icon ${isPlaying ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    <svg className={`icon pause-icon ${!isPlaying ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                    </svg>
                </button>

                <button className="header-btn secondary" onClick={resetView} title="Fit to View">
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                </button>

                <button className="header-btn secondary" onClick={reload} title="Reload Visualization">
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </button>

                <div className="header-divider"></div>

                {/* Speed slider */}
                <div className="header-slider">
                    <label>Speed</label>
                    <input
                        type="range"
                        min="0.25"
                        max="4"
                        step="0.25"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    />
                    <span>{speed}x</span>
                </div>

                {/* Rate slider */}
                <div className="header-slider">
                    <label>Rate</label>
                    <input
                        type="range"
                        min="0.5"
                        max="5"
                        step="0.5"
                        value={spawnRate}
                        onChange={(e) => setSpawnRate(parseFloat(e.target.value))}
                    />
                    <span>{spawnRate}/s</span>
                </div>

                <div className="header-divider"></div>
            </div>

            <div className="header-right">
                <button
                    className="header-btn export-btn"
                    onClick={handleExport}
                    disabled={isExporting}
                    title="Export GIF"
                >
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>{isExporting ? 'Exporting...' : 'Export GIF'}</span>
                </button>
            </div>
        </header>
    );
}
