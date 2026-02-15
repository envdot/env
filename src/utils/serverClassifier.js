/**
 * Server Classifier
 * Classifies MCP servers into Connection Profiles using heuristics
 */

import { ConnectionProfile, AuthType } from '../types/connectionProfiles';

/**
 * Known host applications that have MCP integrations
 */
const HOST_APP_KEYWORDS = [
  'blender', 'vscode', 'visual studio code', 'jetbrains', 'intellij', 'pycharm',
  'unity', 'unreal', 'godot', 'figma', 'photoshop', 'illustrator', 'adobe',
  'maya', 'cinema4d', '3ds max', 'houdini', 'zbrush', 'substance',
  'obsidian', 'notion', 'raycast', 'alfred', 'cursor', 'windsurf'
];

/**
 * Patterns that indicate a remote/cloud service
 */
const CLOUD_PATTERNS = [
  /https?:\/\//i,
  /\.com|\.io|\.ai|\.dev/i,
  /api[_-]?key/i,
  /oauth/i,
  /bearer/i,
  /token/i
];

/**
 * Patterns that indicate a local tool
 */
const LOCAL_PATTERNS = [
  /^npx\s/i,
  /^node\s/i,
  /^python[3]?\s/i,
  /^uv\s/i,
  /^uvx\s/i,
  /^pip\s/i,
  /^cargo\s/i,
  /^deno\s/i,
  /^bun\s/i,
  /stdio/i
];

/**
 * Detect if server is for a host application
 */
function detectHostApp(server) {
  const searchText = `${server.name || ''} ${server.description || ''} ${server.displayName || ''}`.toLowerCase();

  for (const keyword of HOST_APP_KEYWORDS) {
    if (searchText.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

/**
 * Detect if server has remote/cloud configuration
 */
function hasRemoteConfig(server) {
  // Check explicit remote fields
  if (server.remote || server.url || server.endpoint || server.baseUrl) {
    return true;
  }

  // Check for HTTP transport
  if (server.transport === 'http' || server.transport === 'sse') {
    return true;
  }

  // Check connection info for URL patterns
  const connectionInfo = JSON.stringify(server.connections || server.connection || {});
  return CLOUD_PATTERNS.some(pattern => pattern.test(connectionInfo));
}

/**
 * Detect if server has local/stdio configuration
 */
function hasLocalConfig(server) {
  // Check explicit local fields
  if (server.command || server.args || server.stdio) {
    return true;
  }

  // Check for stdio transport
  if (server.transport === 'stdio') {
    return true;
  }

  // Check connection info for local patterns
  const connectionInfo = JSON.stringify(server.connections || server.connection || {});
  return LOCAL_PATTERNS.some(pattern => pattern.test(connectionInfo));
}

/**
 * Extract install command from server config
 */
export function extractInstallCommand(server) {
  // Check connections array (Smithery format)
  if (server.connections) {
    for (const conn of server.connections) {
      if (conn.type === 'stdio' && conn.configSchema?.properties?.command) {
        const cmdDefault = conn.configSchema.properties.command.default;
        if (cmdDefault) return cmdDefault;
      }
    }
  }

  // Check direct command field
  if (server.command) {
    return server.command;
  }

  // Check for npm package name
  if (server.qualifiedName?.startsWith('@')) {
    return `npx ${server.qualifiedName}`;
  }

  return null;
}

/**
 * Extract run command and args from server config
 */
export function extractRunConfig(server) {
  // Check connections array (Smithery format)
  if (server.connections) {
    for (const conn of server.connections) {
      if (conn.type === 'stdio') {
        const schema = conn.configSchema?.properties || {};
        return {
          command: schema.command?.default || server.command || null,
          args: schema.args?.default || server.args || []
        };
      }
    }
  }

  return {
    command: server.command || null,
    args: server.args || []
  };
}

/**
 * Detect authentication type for cloud services
 */
export function detectAuthType(server) {
  const text = JSON.stringify(server).toLowerCase();

  if (text.includes('oauth')) return AuthType.OAUTH;
  if (text.includes('api_key') || text.includes('apikey') || text.includes('api-key')) return AuthType.API_KEY;
  if (text.includes('bearer') || text.includes('token')) return AuthType.API_KEY;

  return AuthType.NONE;
}

/**
 * Main classification function
 * @param {Object} server - Server object from registry or local config
 * @returns {string} ConnectionProfile value
 */
export function classifyServer(server) {
  const hasRemote = hasRemoteConfig(server);
  const hasLocal = hasLocalConfig(server);
  const hostApp = detectHostApp(server);

  // Explicit web type from registry always treated as cloud API
  if (server.type === 'web') {
    return ConnectionProfile.CLOUD_API;
  }

  // Hybrid: has both remote and local options
  if (hasRemote && hasLocal) {
    return ConnectionProfile.HYBRID;
  }

  // Host app: detected known host application (only for non-web servers)
  if (hostApp) {
    return ConnectionProfile.HOST_APP_ATTACH;
  }

  // Cloud: remote-only configuration
  if (hasRemote) {
    return ConnectionProfile.CLOUD_API;
  }

  // Local: local-only configuration
  if (hasLocal) {
    return ConnectionProfile.LOCAL_TOOL;
  }

  // Manual: can't determine configuration
  return ConnectionProfile.MANUAL;
}

/**
 * Get detailed classification info
 */
export function getClassificationDetails(server) {
  const profile = classifyServer(server);
  const hostApp = detectHostApp(server);
  const authType = detectAuthType(server);
  const installCommand = extractInstallCommand(server);
  const runConfig = extractRunConfig(server);

  return {
    profile,
    hostApp,
    authType,
    installCommand,
    runConfig,
    hasRemote: hasRemoteConfig(server),
    hasLocal: hasLocalConfig(server)
  };
}
