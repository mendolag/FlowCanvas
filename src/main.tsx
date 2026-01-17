/**
 * FlowCanvas - Main Application Entry Point (React)
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import './style.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);

console.log('🎨 FlowCanvas initialized (React)');
