/**
 * FlowCanvas - Main Application Entry Point
 */

import './style.css';
import { parseDSL, validateTopology } from './parser/dsl-parser.js';
import { FlowCanvas } from './renderer/canvas.js';
import { AnimationEngine } from './animation/engine.js';
import { exportGif, downloadBlob } from './export/gif-exporter.js';
import { getExample } from './examples/sample-flows.js';

// DOM Elements
const dslEditor = document.getElementById('dslEditor');
const lineNumbers = document.getElementById('lineNumbers');
const editorStatus = document.getElementById('editorStatus');
const errorPanel = document.getElementById('errorPanel');
const errorList = document.getElementById('errorList');
const flowCanvas = document.getElementById('flowCanvas');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const reloadBtn = document.getElementById('reloadBtn');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const spawnSlider = document.getElementById('spawnSlider');
const spawnValue = document.getElementById('spawnValue');
const exportGifBtn = document.getElementById('exportGifBtn');
const viewBtns = document.querySelectorAll('.view-btn');
const exampleBtns = document.querySelectorAll('.example-btn');

// Initialize canvas and animation
const canvas = new FlowCanvas(flowCanvas);
const animation = new AnimationEngine(canvas);

// Track current errors for line highlighting
let currentErrors = [];

// Debounce helper
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Update line numbers
function updateLineNumbers() {
  const lines = dslEditor.value.split('\n');
  const errorLines = new Set(currentErrors.map(e => e.line));

  lineNumbers.innerHTML = lines.map((_, i) => {
    const lineNum = i + 1;
    const isError = errorLines.has(lineNum);
    return `<span class="line-num${isError ? ' error' : ''}">${lineNum}</span>`;
  }).join('');
}

// Sync line numbers scroll with editor
function syncScroll() {
  lineNumbers.scrollTop = dslEditor.scrollTop;
}

// Parse and update visualization
function updateVisualization() {
  const dsl = dslEditor.value;
  const result = parseDSL(dsl);

  // Update status indicator
  const statusDot = editorStatus.querySelector('.status-dot');
  const statusText = editorStatus.querySelector('.status-text');

  // Combine parser errors with validation errors
  const allErrors = [...result.errors];
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
function goToLine(lineNumber) {
  if (!lineNumber) return;

  const lines = dslEditor.value.split('\n');
  let charIndex = 0;

  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    charIndex += lines[i].length + 1; // +1 for newline
  }

  dslEditor.focus();
  dslEditor.setSelectionRange(charIndex, charIndex + lines[lineNumber - 1].length);

  // Scroll to show the line
  const lineHeight = 20.8; // Match CSS
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
  const li = e.target.closest('li');
  if (li && li.dataset.line) {
    goToLine(parseInt(li.dataset.line, 10));
  }
});

// Play/Pause button
playPauseBtn.addEventListener('click', () => {
  const isPlaying = animation.toggle();
  playPauseBtn.classList.toggle('playing', isPlaying);
  playPauseBtn.querySelector('.play-icon').classList.toggle('hidden', isPlaying);
  playPauseBtn.querySelector('.pause-icon').classList.toggle('hidden', !isPlaying);
});

// Reset view button
resetViewBtn.addEventListener('click', () => {
  canvas.resetView();
});

// Reload button
reloadBtn.addEventListener('click', () => {
  updateVisualization();

  // Visual feedback (spin icon)
  const icon = reloadBtn.querySelector('.icon');
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

// View toggle
viewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    viewBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    canvas.setDetailLevel(btn.dataset.view === 'detailed');
  });
});

// Example buttons
exampleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const example = getExample(btn.dataset.example);
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

  const progressBar = overlay.querySelector('.export-progress-bar');

  try {
    const blob = await exportGif(canvas, animation, {
      duration: 4000,
      fps: 20,
      width: 1280,
      height: 720,
      quality: 5 // Lower is better quality (1-30)
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
dslEditor.value = getExample('simple');
updateLineNumbers();
updateVisualization();

// Auto-play after a short delay
setTimeout(() => {
  animation.play();
  playPauseBtn.classList.add('playing');
  playPauseBtn.querySelector('.play-icon').classList.add('hidden');
  playPauseBtn.querySelector('.pause-icon').classList.remove('hidden');
}, 500);

console.log('🎨 FlowCanvas initialized');
