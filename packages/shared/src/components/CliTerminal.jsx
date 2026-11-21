import React, { useCallback } from 'react';
import { getPlatformAdapter } from '../platform/adapterSingleton';
import { useStore } from '../store/store';
import { usePtyOutput } from '../hooks/usePtyOutput';
import PixelLoader from './PixelLoader';

/**
 * Renders CLI slash command output inline as a normal chat message:
 * - Interactive menus → clickable option buttons
 * - Plain text → formatted text
 * - Loading → small spinner
 * No container/header/window — just content that flows in the chat.
 */
export default function CliCommandOutput({ conversationId, command, slashCmd, onExit }) {
  const { state, parsedOutput, selectOption, sendEscape, rawText } = usePtyOutput(conversationId, slashCmd);

  const handleCancel = useCallback(() => {
    sendEscape();
    const adapter = getPlatformAdapter();
    adapter.cliChatbots.killPtySession(conversationId);
    useStore.getState().clearActivePtySession(conversationId);
    onExit?.(0);
  }, [conversationId, onExit, sendEscape]);

  if (state === 'loading') {
    return <div className="cli-inline-loading"><PixelLoader /></div>;
  }

  if (state === 'menu' && parsedOutput?.type === 'menu') {
    return (
      <div className="cli-inline-menu">
        {parsedOutput.title && <div className="cli-inline-menu-title">{parsedOutput.title}</div>}
        {parsedOutput.subtitle && <div className="cli-inline-menu-subtitle">{parsedOutput.subtitle}</div>}
        <div className="cli-inline-menu-options">
          {parsedOutput.options.map((opt, i) => (
            <button key={i} className="cli-inline-option" onClick={() => selectOption(i)}>
              <span className="cli-inline-option-num">{i + 1}.</span>
              <span className="cli-inline-option-label">{opt.label}</span>
              {opt.description && <span className="cli-inline-option-desc">— {opt.description}</span>}
            </button>
          ))}
        </div>
        <button className="cli-inline-cancel" onClick={handleCancel}>Cancel</button>
      </div>
    );
  }

  if (state === 'text' || state === 'done') {
    const content = parsedOutput?.content || rawText;
    if (!content) return null;
    return <pre className="cli-inline-text">{content}</pre>;
  }

  return null;
}
