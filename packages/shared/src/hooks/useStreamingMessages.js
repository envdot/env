import { useState, useRef, useEffect, useCallback } from 'react';
import { getPlatformAdapter } from '../platform/adapterSingleton';
import { renderToText } from '../lib/ptyOutputParser';

/**
 * Hook that subscribes to PTY data and maintains a simple message list:
 * - { role: 'user', content } — from local input
 * - { role: 'assistant', content } — from PTY output, streamed as chunks
 *
 * Accumulates raw PTY data and re-renders through the virtual terminal
 * emulator on each chunk so cursor-positioning creates proper spacing.
 */
export function useStreamingMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const lastSentRef = useRef('');
  const rawAssistantRef = useRef('');       // accumulates raw PTY bytes
  const currentAssistantRef = useRef('');   // rendered plain text
  const cleanupRef = useRef([]);
  const disposedRef = useRef(false);

  // Add a user message (called from ChatMode on send)
  const addUserMessage = useCallback((content) => {
    lastSentRef.current = content;
    const msg = { id: `user-${Date.now()}`, role: 'user', content };
    setMessages(prev => [...prev, msg]);
  }, []);

  // Write text to PTY (send user input as a prompt)
  const writeToPty = useCallback((text) => {
    const adapter = getPlatformAdapter();
    adapter.cliChatbots.writePty(conversationId, text);
    setIsStreaming(true);
    // Start a new assistant message accumulator
    rawAssistantRef.current = '';
    currentAssistantRef.current = '';
  }, [conversationId]);

  // Connect to PTY and start streaming
  const connect = useCallback(async (cliCommand) => {
    const adapter = getPlatformAdapter();
    const result = await adapter.cliChatbots.startPtyStream(cliCommand, conversationId);
    if (result.success) {
      setIsConnected(true);
    }
    return result;
  }, [conversationId]);

  // Subscribe to PTY data + exit events
  useEffect(() => {
    if (!conversationId) return;

    const adapter = getPlatformAdapter();
    disposedRef.current = false;

    const unsubData = adapter.cliChatbots.onPtyData((convId, data) => {
      if (convId !== conversationId || disposedRef.current) return;

      // Accumulate raw PTY bytes, then re-render the whole buffer through
      // the virtual terminal emulator so cursor-forward etc. produce spaces.
      rawAssistantRef.current += data;
      const rendered = renderToText(rawAssistantRef.current);
      if (!rendered) return;

      // Filter echo: if the rendered text so far is just the user's last input, skip
      const lastSent = lastSentRef.current;
      if (lastSent) {
        const trimmed = rendered.trim();
        if (trimmed === lastSent || trimmed === lastSent.trim()) {
          lastSentRef.current = ''; // Only filter once
          return;
        }
      }

      // Filter bare prompt lines
      if (/^[>$❯›]\s*$/.test(rendered.trim())) return;

      currentAssistantRef.current = rendered;
      const msgId = `assistant-${conversationId}-stream`;

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.id === msgId) {
          return [...prev.slice(0, -1), { ...last, content: rendered }];
        }
        return [...prev, { id: msgId, role: 'assistant', content: rendered }];
      });

      setIsStreaming(true);
    });
    cleanupRef.current.push(unsubData);

    const unsubExit = adapter.cliChatbots.onPtyExit((convId, exitCode) => {
      if (convId !== conversationId || disposedRef.current) return;
      setIsStreaming(false);
      setIsConnected(false);

      // Finalize the current assistant message with a stable ID
      if (currentAssistantRef.current) {
        const content = currentAssistantRef.current;
        const streamId = `assistant-${conversationId}-stream`;
        const finalId = `assistant-${Date.now()}`;
        setMessages(prev =>
          prev.map(m => m.id === streamId ? { ...m, id: finalId, content } : m)
        );
        rawAssistantRef.current = '';
        currentAssistantRef.current = '';
      }
    });
    cleanupRef.current.push(unsubExit);

    return () => {
      disposedRef.current = true;
      for (const unsub of cleanupRef.current) unsub();
      cleanupRef.current = [];
    };
  }, [conversationId]);

  // Kill PTY session
  const kill = useCallback(() => {
    const adapter = getPlatformAdapter();
    adapter.cliChatbots.killPtySession(conversationId);
    setIsStreaming(false);
    setIsConnected(false);
  }, [conversationId]);

  return {
    messages,
    setMessages,
    isStreaming,
    isConnected,
    addUserMessage,
    writeToPty,
    connect,
    kill,
  };
}
