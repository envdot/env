/**
 * Slash command utilities.
 * Commands are detected dynamically from the installed CLI at runtime.
 * Local commands (handled by the app) are merged in.
 */

/** Commands the app handles locally regardless of CLI */
export const LOCAL_COMMANDS = [
  { name: 'clear', description: 'Clear conversation history', local: true },
  { name: 'model', description: 'Switch the current model', local: true },
];

/**
 * Filter a commands array by a search string (text after the `/`).
 */
export function filterCommands(commands, query) {
  if (!commands || commands.length === 0) return [];
  if (!query) return commands;
  const q = query.toLowerCase();
  return commands.filter(cmd => cmd.name.toLowerCase().startsWith(q));
}

/**
 * Merge native CLI commands with local app commands.
 * Local commands override native ones with the same name.
 */
export function mergeWithLocalCommands(nativeCommands) {
  const localNames = new Set(LOCAL_COMMANDS.map(c => c.name));
  const filtered = (nativeCommands || []).filter(c => !localNames.has(c.name));
  return [...LOCAL_COMMANDS, ...filtered].sort((a, b) => a.name.localeCompare(b.name));
}
