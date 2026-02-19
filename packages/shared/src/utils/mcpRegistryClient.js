/**
 * MCP Registry Client
 * Loads servers from local JSON data (synced from mcp.so)
 */

import serverData from '../data/mcp-servers.json';

// Cache for processed servers
let cachedServers = null;

/**
 * Get all servers from the local registry
 */
export function getServers() {
  if (!cachedServers) {
    cachedServers = serverData.servers.map(normalizeServer);
  }
  return cachedServers;
}

/**
 * Get registry metadata
 */
export function getRegistryInfo() {
  return {
    lastUpdated: serverData.lastUpdated,
    source: serverData.source,
    count: serverData.count
  };
}

/**
 * Search servers by query string
 */
export function searchServers(query, limit = 50, offset = 0) {
  const servers = getServers();

  if (!query || !query.trim()) {
    return {
      servers: servers.slice(offset, offset + limit),
      total: servers.length,
      hasMore: offset + limit < servers.length
    };
  }

  const q = query.toLowerCase().trim();
  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.author?.toLowerCase().includes(q) ||
    s.tags?.some(t => t.toLowerCase().includes(q)) ||
    s.category?.toLowerCase().includes(q)
  );

  return {
    servers: filtered.slice(offset, offset + limit),
    total: filtered.length,
    hasMore: offset + limit < filtered.length
  };
}

/**
 * Get a server by its ID
 */
export function getServerById(id) {
  return getServers().find(s => s.id === id);
}

/**
 * Get servers by category
 */
export function getServersByCategory(category) {
  return getServers().filter(s => s.category === category);
}

/**
 * Get featured servers
 */
export function getFeaturedServers() {
  return getServers().filter(s => s.featured);
}

/**
 * Get all unique categories
 */
export function getCategories() {
  const categories = new Set(getServers().map(s => s.category).filter(Boolean));
  return Array.from(categories).sort();
}

/**
 * Normalize server data to ConnectorItem format for the UI
 */
function normalizeServer(server) {
  // Determine profile based on install command and other factors
  let profile = 'manual';

  const hasInstall = server.install && server.install.command;
  const hasRemote = false; // mcp.so servers are typically local

  // Check for host app keywords
  const hostAppKeywords = ['blender', 'vscode', 'cursor', 'figma', 'unity', 'obsidian', 'photoshop', 'maya', 'sublime', 'jetbrains'];
  const nameLower = (server.name || '').toLowerCase();
  const descLower = (server.description || '').toLowerCase();
  const idLower = (server.id || '').toLowerCase();
  const hostApp = hostAppKeywords.find(kw =>
    nameLower.includes(kw) || descLower.includes(kw) || idLower.includes(kw)
  );

  if (hostApp) {
    profile = 'host_app_attach';
  } else if (hasInstall) {
    profile = 'local_tool';
  }

  // Build install command string
  let installCommand = null;
  let runCommand = null;
  let args = [];

  if (server.install) {
    const cmd = server.install.command;
    const installArgs = server.install.args || [];

    if (cmd === 'uvx') {
      runCommand = 'uvx';
      args = installArgs;
      installCommand = `uvx ${installArgs.join(' ')}`;
    } else if (cmd === 'npx') {
      runCommand = 'npx';
      args = installArgs;
      installCommand = `npx ${installArgs.join(' ')}`;
    } else if (cmd === 'pip') {
      installCommand = `pip ${installArgs.join(' ')}`;
      runCommand = 'python';
      args = ['-m', installArgs[installArgs.length - 1]];
    } else if (cmd === 'npm') {
      installCommand = `npm ${installArgs.join(' ')}`;
      runCommand = 'npx';
      args = [installArgs[installArgs.length - 1]];
    } else {
      installCommand = `${cmd} ${installArgs.join(' ')}`;
      runCommand = cmd;
      args = installArgs;
    }
  }

  return {
    id: server.id,
    name: server.name,
    description: server.description || '',
    iconUrl: server.icon || server.authorAvatar || null,
    source: 'mcp.so',

    profile,
    verified: server.featured,
    useCount: 0,

    // Author info
    author: server.author,
    authorAvatar: server.authorAvatar,

    // Remote config (typically not available for mcp.so servers)
    remoteEndpoint: null,
    authType: 'none',

    // Local config
    installCommand,
    runCommand,
    args,

    // Host app config
    hostApp,
    pluginRequired: !!hostApp,

    hasRemote: false,
    hasLocal: !!hasInstall,

    // Extra fields
    github: server.github,
    category: server.category,
    tags: server.tags || [],
    featured: server.featured,

    raw: server
  };
}

// Legacy exports for compatibility with old API
export async function fetchServers(options = {}) {
  const { search = '', limit = 50, cursor = null } = options;
  const offset = cursor ? parseInt(cursor, 10) : 0;

  const result = searchServers(search, limit, offset);

  return {
    servers: result.servers.map(s => s.raw),
    nextCursor: result.hasMore ? String(offset + limit) : null,
    total: result.total
  };
}

export function normalizeRegistryServer(serverWrapper) {
  // Handle both wrapped and unwrapped server data
  const server = serverWrapper.server || serverWrapper;
  return normalizeServer(server);
}
