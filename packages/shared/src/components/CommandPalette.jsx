import React, { useEffect, useRef } from 'react';

/**
 * Command palette overlay — opens instantly on '/' keypress.
 * Purely local, zero PTY interaction. Filters as user types.
 * Arrow keys + Enter or click to select. Escape to close.
 */
function CommandPalette({ commands, selectedIndex, onSelect, menuRef }) {
  const itemRefs = useRef([]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (commands.length === 0) return null;

  return (
    <div className="command-palette" ref={menuRef}>
      {commands.map((cmd, index) => (
        <div
          key={cmd.name}
          ref={el => itemRefs.current[index] = el}
          className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent textarea blur
            onSelect(index);
          }}
        >
          <span className="command-palette-name">/{cmd.name}</span>
          <span className="command-palette-desc">{cmd.description}</span>
          {cmd.category === 'interactive' && (
            <span className="command-palette-badge">opens modal</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default CommandPalette;
