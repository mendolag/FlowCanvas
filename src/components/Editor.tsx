import { useState, useCallback, useEffect, useRef } from 'react';
import { useFlow } from '../context/FlowContext';
import { parseDSL, validateTopology } from '../parser/dsl-parser';
import { getExample, type ExampleName } from '../examples/sample-flows';
import type { ParseError } from '../types';

export function Editor() {
    const { dsl, setDsl, errors, setErrors, setTopology, animationRef } = useFlow();
    const [lineNumbers, setLineNumbers] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    // Initialize with default example
    useEffect(() => {
        if (!dsl) {
            const example = getExample('mapic');
            setDsl(example);
        }
    }, [dsl, setDsl]);

    // Update line numbers when DSL changes
    useEffect(() => {
        const lines = dsl.split('\n');
        setLineNumbers(lines.map((_, i) => String(i + 1)));
    }, [dsl]);

    // Parse and validate when DSL changes
    useEffect(() => {
        const updateVisualization = () => {
            const result = parseDSL(dsl);

            const allErrors: ParseError[] = [...result.errors];
            if (result.nodes.length > 0) {
                const validation = validateTopology(result);
                validation.errors.forEach(msg => {
                    allErrors.push({ line: null, message: msg });
                });
            }

            setErrors(allErrors);

            if (animationRef.current) {
                animationRef.current.reset();
            }
            setTopology(result);
        };

        const timeoutId = setTimeout(updateVisualization, 300);
        return () => clearTimeout(timeoutId);
    }, [dsl, setErrors, setTopology, animationRef]);

    const handleScroll = useCallback(() => {
        if (lineNumbersRef.current && textareaRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }, []);

    const goToLine = useCallback((lineNumber: number) => {
        if (!textareaRef.current) return;

        const lines = dsl.split('\n');
        let charIndex = 0;

        for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
            charIndex += lines[i].length + 1;
        }

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(charIndex, charIndex + lines[lineNumber - 1].length);
        textareaRef.current.scrollTop = (lineNumber - 3) * 20.8;
    }, [dsl]);

    const loadExample = useCallback((name: ExampleName) => {
        const example = getExample(name);
        setDsl(example);
    }, [setDsl]);

    const errorLines = new Set(errors.map(e => e.line));
    const nodeCount = dsl ? parseDSL(dsl).nodes.length : 0;
    const hasErrors = errors.length > 0;

    return (
        <aside className="editor-panel">
            <div className="editor-header">
                <span className="editor-title">DSL Editor</span>
                <div className="editor-status">
                    <span className={`status-dot ${hasErrors ? 'invalid' : 'valid'}`}></span>
                    <span className="status-text">
                        {hasErrors ? `${errors.length} error(s)` : nodeCount === 0 ? 'Empty' : `${nodeCount} nodes`}
                    </span>
                </div>
            </div>

            <div className="editor-container">
                <div className="line-numbers" ref={lineNumbersRef}>
                    {lineNumbers.map((num, i) => (
                        <span
                            key={i}
                            className={`line-num ${errorLines.has(i + 1) ? 'error' : ''}`}
                        >
                            {num}
                        </span>
                    ))}
                </div>
                <textarea
                    ref={textareaRef}
                    className="dsl-editor"
                    value={dsl}
                    onChange={(e) => setDsl(e.target.value)}
                    onScroll={handleScroll}
                    spellCheck={false}
                    placeholder="# Define your nodes and flows here..."
                />
            </div>

            {hasErrors && (
                <div className="error-panel">
                    <div className="error-header">
                        <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Errors</span>
                    </div>
                    <ul className="error-list">
                        {errors.map((err, i) => (
                            <li
                                key={i}
                                onClick={() => err.line && goToLine(err.line)}
                                title="Click to go to line"
                            >
                                <span className="error-line">
                                    {err.line ? `Line ${err.line}:` : 'Error:'}
                                </span>
                                {err.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="examples-bar">
                <span className="examples-label">Examples:</span>
                <button className="example-btn" onClick={() => loadExample('mapic')}>MAPIC</button>
                <button className="example-btn" onClick={() => loadExample('ecommerce')}>E-Commerce</button>
                <button className="example-btn" onClick={() => loadExample('etl')}>ETL Pipeline</button>
            </div>
        </aside>
    );
}
