import { useState, useCallback, useRef } from 'react';
import { filterCommands, ALL_COMMANDS } from '../lib/slashCommands';

/**
 * Hook for slash command menu state and keyboard navigation.
 * Uses the built-in command list (local + interactive).
 */
export function useSlashCommands() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  const allCommands = ALL_COMMANDS;
  const filteredCommands = filterCommands(allCommands, filter);

  // Call from textarea onChange — detects `/` at start of input
  const handleInputChange = useCallback((value) => {
    if (value === '/') {
      setIsOpen(true);
      setFilter('');
      setSelectedIndex(0);
    } else if (value.startsWith('/') && !value.includes(' ')) {
      setIsOpen(true);
      setFilter(value.slice(1));
      setSelectedIndex(0);
    } else {
      if (isOpen) {
        setIsOpen(false);
        setFilter('');
      }
    }
  }, [isOpen]);

  // Call from textarea onKeyDown BEFORE the component's own handler.
  // Returns { consumed: true } if the event was handled by the menu.
  // Returns { consumed: true, command } if a command was selected.
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return { consumed: false };

    const cmds = filterCommands(allCommands, filter);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, cmds.length - 1));
      return { consumed: true };
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      return { consumed: true };
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (cmds.length > 0) {
        e.preventDefault();
        const cmd = cmds[Math.min(selectedIndex, cmds.length - 1)];
        return { consumed: true, command: cmd };
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return { consumed: true };
    }
    return { consumed: false };
  }, [isOpen, filter, selectedIndex, allCommands]);

  const selectCommand = useCallback((index) => {
    const cmds = filterCommands(allCommands, filter);
    return cmds[index] || null;
  }, [filter, allCommands]);

  const close = useCallback(() => {
    setIsOpen(false);
    setFilter('');
    setSelectedIndex(0);
  }, []);

  return {
    isOpen,
    filteredCommands,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    selectCommand,
    close,
    menuRef,
  };
}
