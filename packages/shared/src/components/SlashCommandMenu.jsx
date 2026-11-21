import React, { useEffect, useRef } from 'react';

function SlashCommandMenu({ commands, selectedIndex, onSelect, menuRef }) {
  const itemRefs = useRef([]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (commands.length === 0) return null;

  return (
    <div className="slash-command-menu" ref={menuRef}>
      {commands.map((cmd, index) => (
        <div
          key={cmd.name}
          ref={el => itemRefs.current[index] = el}
          className={`slash-command-item ${index === selectedIndex ? 'selected' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent textarea blur
            onSelect(index);
          }}
        >
          <span className="slash-command-name">/{cmd.name}</span>
          <span className="slash-command-desc">{cmd.description}</span>
        </div>
      ))}
    </div>
  );
}

export default SlashCommandMenu;
