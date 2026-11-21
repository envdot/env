import { useState, useRef, useEffect, useCallback } from 'react';
import { getPlatformAdapter } from '../platform/adapterSingleton';
import { stripAnsi, parseOutput } from '../lib/ptyOutputParser';

/**
 * Hook that subscribes to PTY data, parses output, and manages
 * an interactive state machine for CLI slash command flows.
 *
 * States: idle → loading → menu | text → loading → … → done
 */
export function usePtyOutput(conversationId, slashCmd) {
  const [state, setState] = useState('loading');
  const [parsedOutput, setParsedOutput] = useState(null);
  const [rawText, setRawText] = useState('');

  const bufferRef = useRef('');
  const idleTimerRef = useRef(null);
  const cleanupRef = useRef([]);
  const disposedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  // Process the accumulated buffer
  const processBuffer = useCallback(() => {
    if (disposedRef.current) return;

    const raw = bufferRef.current;
    if (!raw.trim()) return;

    const rendered = stripAnsi(raw);
    setRawText(rendered);

    const parsed = parseOutput(rendered, slashCmd);

    if (parsed.type === 'menu') {
      setParsedOutput(parsed);
      setState('menu');
    } else if (parsed.type === 'text') {
      // Grace period: during the first 3 seconds, don't show text output —
      // the CLI might still be loading and the menu hasn't arrived yet.
      // This prevents flashing the startup banner before the actual menu shows.
      const elapsed = Date.now() - mountedAtRef.current;
      if (elapsed < 3000) {
        // Schedule another check — the menu data might arrive soon
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(processBuffer, 1000);
        return;
      }
      setParsedOutput(parsed);
      setState('text');
    }
    // 'empty' — stay in loading, more output may come
  }, [slashCmd]);

  // Subscribe to PTY data + exit events on mount
  useEffect(() => {
    const adapter = getPlatformAdapter();
    disposedRef.current = false;
    mountedAtRef.current = Date.now();

    const unsubData = adapter.cliChatbots.onPtyData((convId, data) => {
      if (convId !== conversationId || disposedRef.current) return;

      bufferRef.current += data;

      // Reset idle timer — wait for output to settle before parsing
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(processBuffer, 800);
    });
    cleanupRef.current.push(unsubData);

    const unsubExit = adapter.cliChatbots.onPtyExit((convId, exitCode) => {
      if (convId !== conversationId || disposedRef.current) return;
      clearTimeout(idleTimerRef.current);
      processBuffer();
      setState('done');
    });
    cleanupRef.current.push(unsubExit);

    return () => {
      disposedRef.current = true;
      clearTimeout(idleTimerRef.current);
      for (const unsub of cleanupRef.current) unsub();
      cleanupRef.current = [];
    };
  }, [conversationId, processBuffer]);

  // Select a menu option by index (0-based)
  const selectOption = useCallback((index) => {
    const adapter = getPlatformAdapter();
    const downArrow = '\x1b[B';
    const enter = '\r';
    const keystrokes = downArrow.repeat(index) + enter;

    bufferRef.current = '';
    setRawText('');
    setParsedOutput(null);
    setState('loading');
    mountedAtRef.current = Date.now(); // Reset grace period for next menu

    adapter.cliChatbots.writePty(conversationId, keystrokes);
  }, [conversationId]);

  // Send Escape to cancel
  const sendEscape = useCallback(() => {
    const adapter = getPlatformAdapter();
    bufferRef.current = '';
    setState('done');
    adapter.cliChatbots.writePty(conversationId, '\x1b');
  }, [conversationId]);

  return { state, parsedOutput, selectOption, sendEscape, rawText };
}
