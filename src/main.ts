/**
 * FlowCanvas - Main Application Entry Point
 */

import './style.css';
import { parseDSL, validateTopology } from './parser/dsl-parser';
import { FlowCanvas } from './renderer/canvas';
import { AnimationEngine } from './animation/engine';
import { exportGif, downloadBlob } from './export/gif-exporter';
import { getExample } from './examples/sample-flows';
import type { ParseError } from './types';

// DOM Elements
const dslEditor = document.getElementById('dslEditor') as HTMLTextAreaElement;
const lineNumbers = document.getElementById('lineNumbers') as HTMLDivElement;
const editorStatus = document.getElementById('editorStatus') as HTMLDivElement;
const errorPanel = document.getElementById('errorPanel') as HTMLDivElement;
const errorList = document.getElementById('errorList') as HTMLUListElement;
const flowCanvas = document.getElementById('flowCanvas') as HTMLCanvasElement;
const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
const resetViewBtn = document.getElementById('resetViewBtn') as HTMLButtonElement;
const reloadBtn = document.getElementById('reloadBtn') as HTMLButtonElement;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValue = document.getElementById('speedValue') as HTMLSpanElement;
const spawnSlider = document.getElementById('spawnSlider') as HTMLInputElement;
const spawnValue = document.getElementById('spawnValue') as HTMLSpanElement;
const exportGifBtn = document.getElementById('exportGifBtn') as HTMLButtonElement;
const exampleBtns = document.querySelectorAll('.example-btn') as NodeListOf<HTMLButtonElement>;

// Initialize canvas and animation
const canvas = new FlowCanvas(flowCanvas);
const animation = new AnimationEngine(canvas);

// Track current errors for line highlighting
let currentErrors: ParseError[] = [];

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: unknown[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
}

// Update line numbers
function updateLineNumbers(): void {
    const lines = dslEditor.value.split('\n');
    const errorLines = new Set(currentErrors.map(e => e.line));

    lineNumbers.innerHTML = lines.map((_, i) => {
        const lineNum = i + 1;
        const isError = errorLines.has(lineNum);
        return `<span class="line-num${isError ? ' error' : ''}">${lineNum}</span>`;
    }).join('');
}

// Sync line numbers scroll with editor
function syncScroll(): void {
    lineNumbers.scrollTop = dslEditor.scrollTop;
}

// Parse and update visualization
function updateVisualization(): void {
    const dsl = dslEditor.value;
    const result = parseDSL(dsl);

    // Update status indicator
    const statusDot = editorStatus.querySelector('.status-dot') as HTMLElement;
    const statusText = editorStatus.querySelector('.status-text') as HTMLElement;

    // Combine parser errors with validation errors
    const allErrors: ParseError[] = [...result.errors];
    if (result.nodes.length > 0) {
        const validation = validateTopology(result);
        validation.errors.forEach(msg => {
            allErrors.push({ line: null, message: msg });
        });
    }

    currentErrors = allErrors;

    if (allErrors.length > 0) {
        statusDot.classList.add('invalid');
        statusText.textContent = `${allErrors.length} error(s)`;

        // Show error panel
        errorPanel.classList.remove('hidden');
        errorList.innerHTML = allErrors.map(err => `
      <li data-line="${err.line || ''}" title="Click to go to line">
        <span class="error-line">${err.line ? `Line ${err.line}:` : 'Error:'}</span>
        ${err.message}
      </li>
    `).join('');
    } else if (result.nodes.length === 0) {
        statusDot.classList.remove('invalid');
        statusText.textContent = 'Empty';
        errorPanel.classList.add('hidden');
    } else {
        statusDot.classList.remove('invalid');
        statusText.textContent = `${result.nodes.length} nodes`;
        errorPanel.classList.add('hidden');
    }

    // Update line numbers to show error highlights
    updateLineNumbers();

    // Reset animation and update canvas
    animation.reset();
    canvas.setTopology(result);
}

// Go to specific line in editor
function goToLine(lineNumber: number): void {
    if (!lineNumber) return;

    const lines = dslEditor.value.split('\n');
    let charIndex = 0;

    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
        charIndex += lines[i].length + 1;
    }

    dslEditor.focus();
    dslEditor.setSelectionRange(charIndex, charIndex + lines[lineNumber - 1].length);

    // Scroll to show the line
    const lineHeight = 20.8;
    dslEditor.scrollTop = (lineNumber - 3) * lineHeight;
}

// Debounced version for typing
const debouncedUpdate = debounce(updateVisualization, 300);

// Event Listeners
dslEditor.addEventListener('input', () => {
    updateLineNumbers();
    debouncedUpdate();
});

dslEditor.addEventListener('scroll', syncScroll);

// Click on error to go to line
errorList.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (li?.dataset.line) {
        goToLine(parseInt(li.dataset.line, 10));
    }
});

// Play/Pause button
playPauseBtn.addEventListener('click', () => {
    const isPlaying = animation.toggle();
    playPauseBtn.classList.toggle('playing', isPlaying);
    playPauseBtn.querySelector('.play-icon')?.classList.toggle('hidden', isPlaying);
    playPauseBtn.querySelector('.pause-icon')?.classList.toggle('hidden', !isPlaying);
});

// Reset view button
resetViewBtn.addEventListener('click', () => {
    canvas.resetView();
});

// Reload button
reloadBtn.addEventListener('click', () => {
    updateVisualization();

    // Visual feedback (spin icon)
    const icon = reloadBtn.querySelector('.icon') as HTMLElement;
    icon.style.transition = 'transform 0.5s ease';
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
    }, 500);
});

// Speed slider
speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    animation.setSpeed(speed);
    speedValue.textContent = `${speed}x`;
});

// Spawn rate slider
spawnSlider.addEventListener('input', () => {
    const rate = parseFloat(spawnSlider.value);
    animation.setSpawnRate(rate);
    spawnValue.textContent = `${rate}/s`;
});

// Example buttons
exampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const example = getExample(btn.dataset.example || 'mapic');
        dslEditor.value = example;
        updateLineNumbers();
        updateVisualization();
    });
});

// Export GIF button
exportGifBtn.addEventListener('click', async () => {
    // Create progress overlay
    const overlay = document.createElement('div');
    overlay.className = 'export-overlay';
    overlay.innerHTML = `
    <div class="export-modal">
      <h3>Exporting GIF...</h3>
      <div class="export-progress">
        <div class="export-progress-bar" style="width: 0%"></div>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);

    const progressBar = overlay.querySelector('.export-progress-bar') as HTMLDivElement;

    try {
        const blob = await exportGif(canvas, animation, {
            duration: 4000,
            fps: 20,
            width: 1280,
            height: 720,
            quality: 5
        }, (progress) => {
            progressBar.style.width = `${progress * 100}%`;
        });

        downloadBlob(blob, 'flowcanvas-animation.gif');
    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
    } finally {
        document.body.removeChild(overlay);
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space to toggle play/pause (only if not focused on editor)
    if (e.code === 'Space' && document.activeElement !== dslEditor) {
        e.preventDefault();
        playPauseBtn.click();
    }
});

// Initialize with sample topology
dslEditor.value = getExample('mapic');
updateLineNumbers();
updateVisualization();

// Auto-play after a short delay
setTimeout(() => {
    animation.play();
    playPauseBtn.classList.add('playing');
    playPauseBtn.querySelector('.play-icon')?.classList.add('hidden');
    playPauseBtn.querySelector('.pause-icon')?.classList.remove('hidden');
}, 500);

console.log('🎨 FlowCanvas initialized');
