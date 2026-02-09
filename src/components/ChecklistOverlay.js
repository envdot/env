import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';

/**
 * ChecklistOverlay — minimal floating progress indicator.
 * Rendered via portal to document.body so it floats above everything.
 * Draggable by the header bar.
 */
function ChecklistOverlay({ onClose }) {
  const { checklistSteps, clearChecklist } = useStore();
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null });
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    const rect = dragRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const total = checklistSteps.length;
  const done = checklistSteps.filter(s => s.status === 'done' || s.status === 'skipped').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // Always fixed positioning since we portal to body
  const posStyle = position.x !== null
    ? { left: position.x, top: position.y, right: 'auto' }
    : {};

  let content;

  if (total === 0 && minimized) {
    content = (
      <div ref={dragRef} className="checklist-overlay checklist-overlay-minimized" style={posStyle} onClick={() => setMinimized(false)}>
        <div className="checklist-overlay-header checklist-drag-handle" onMouseDown={handleMouseDown}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
          </svg>
          <span className="checklist-overlay-title-mini">No steps</span>
        </div>
      </div>
    );
  } else if (total === 0) {
    content = (
      <div ref={dragRef} className="checklist-overlay" style={posStyle}>
        <div className="checklist-overlay-header checklist-drag-handle" onMouseDown={handleMouseDown}>
          <span className="checklist-overlay-title">Checklist</span>
          <div className="checklist-overlay-header-actions">
            <button className="checklist-overlay-btn" onClick={() => setMinimized(true)} title="Minimize">{'\u2013'}</button>
            <button className="checklist-overlay-btn" onClick={onClose} title="Close">{'\u00D7'}</button>
          </div>
        </div>
        <div className="checklist-overlay-body">
          <p className="checklist-empty-msg">Steps will appear here as the AI works through the plan.</p>
        </div>
      </div>
    );
  } else if (minimized) {
    content = (
      <div ref={dragRef} className="checklist-overlay checklist-overlay-minimized" style={posStyle} onClick={() => setMinimized(false)}>
        <div className="checklist-overlay-header checklist-drag-handle" onMouseDown={handleMouseDown}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
          </svg>
          <span className="checklist-overlay-title-mini">{done}/{total}</span>
          <div className="checklist-mini-progress">
            <div className="checklist-mini-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div ref={dragRef} className="checklist-overlay" style={posStyle}>
        <div className="checklist-overlay-header checklist-drag-handle" onMouseDown={handleMouseDown}>
          <span className="checklist-overlay-title">Checklist</span>
          <span className="checklist-overlay-count">{done}/{total}</span>
          <div className="checklist-overlay-header-actions">
            {done === total && total > 0 && (
              <span className="checklist-status-done">{'\u2713'}</span>
            )}
            <button className="checklist-overlay-btn" onClick={() => { clearChecklist(); }} title="Clear">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button className="checklist-overlay-btn" onClick={() => setMinimized(true)} title="Minimize">{'\u2013'}</button>
            <button className="checklist-overlay-btn" onClick={onClose} title="Close">{'\u00D7'}</button>
          </div>
        </div>
        <div className="checklist-progress-bar">
          <div className="checklist-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="checklist-overlay-body">
          {checklistSteps.map((step) => {
            const icon = step.status === 'done' ? '\u2713'
              : step.status === 'error' ? '\u2717'
              : step.status === 'running' ? '\u21BB'
              : step.status === 'skipped' ? '\u2192'
              : '\u25CB';
            const cls = step.status === 'done' ? 'cl-done'
              : step.status === 'error' ? 'cl-error'
              : step.status === 'running' ? 'cl-running'
              : step.status === 'skipped' ? 'cl-skipped'
              : 'cl-pending';
            return (
              <div key={step.id} className={`cl-step ${cls}`}>
                <span className={`cl-step-icon ${cls}`}>{icon}</span>
                <span className="cl-step-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return ReactDOM.createPortal(content, document.body);
}

export default ChecklistOverlay;
