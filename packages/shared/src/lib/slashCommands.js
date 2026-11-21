/**
 * Slash command utilities.
 *
 * Command categories:
 * - 'local'       — handled entirely by the app UI
 * - 'interactive' — app owns the UI (modal)
 */

/** Commands the app handles locally */
export const LOCAL_COMMANDS = [
  { name: 'clear', description: 'Clear conversation history', category: 'local' },
  { name: 'compact', description: 'Compact conversation context', category: 'local' },
];

/** Commands that open app-owned modals */
export const INTERACTIVE_COMMANDS = [
  { name: 'model', description: 'Switch the current model', category: 'interactive' },
  { name: 'mcp', description: 'Manage MCP servers', category: 'interactive' },
];

/** All built-in commands */
export const ALL_COMMANDS = [...LOCAL_COMMANDS, ...INTERACTIVE_COMMANDS]
  .sort((a, b) => a.name.localeCompare(b.name));

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
 * Look up a command by name from a commands list.
 */
export function findCommand(commands, name) {
  return commands.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
}
