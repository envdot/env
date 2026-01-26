/**
 * Server Normalizer
 * Converts various server formats (registry, local config) into a unified ConnectorItem model
 */

import { classifyServer, getClassificationDetails } from './serverClassifier';

/**
 * Normalize a server from any source into a ConnectorItem
 * @param {Object} server - Raw server data
 * @param {string} source - Source identifier ('registry', 'web', 'desktop', 'custom')
 * @returns {Object} Normalized ConnectorItem
 */
export function normalizeServer(server, source = 'registry') {
  const classification = getClassificationDetails(server);

  // Extract ID based on source
  const id = server.id ||
    server.qualifiedName ||
    server.name?.toLowerCase().replace(/\s+/g, '-') ||
    `server-${Date.now()}`;

  // Extract name
  const name = server.displayName ||
    server.name ||
    server.qualifiedName?.split('/').pop() ||
    'Unknown Server';

  // Extract description
  const description = server.description ||
    server.shortDescription ||
    '';

  // Extract icon URL
  const iconUrl = server.iconUrl ||
    server.icon ||
    null;

  // Extract remote endpoint
  let remoteEndpoint = null;
  if (server.connections) {
    const httpConn = server.connections.find(c => c.type === 'http' || c.type === 'sse');
    if (httpConn) {
      remoteEndpoint = httpConn.deploymentUrl || httpConn.url || null;
    }
  }
  remoteEndpoint = remoteEndpoint || server.url || server.endpoint || server.baseUrl || null;

  return {
    id,
    name,
    description,
    iconUrl,
    source,

    // Classification
    profile: classification.profile,
    verified: server.verified || false,
    useCount: server.useCount || 0,

    // Remote config
    remoteEndpoint,
    authType: classification.authType,

    // Local config
    installCommand: classification.installCommand,
    runCommand: classification.runConfig.command,
    args: classification.runConfig.args,

    // Host app config
    hostApp: classification.hostApp,
    pluginRequired: !!classification.hostApp, // Assume plugin required for host apps

    // Metadata
    hasRemote: classification.hasRemote,
    hasLocal: classification.hasLocal,

    // Raw data for debugging/advanced use
    raw: server
  };
}

/**
 * Normalize an array of servers
 */
export function normalizeServers(servers, source = 'registry') {
  return servers.map(server => normalizeServer(server, source));
}

/**
 * Normalize a registry response (Smithery format)
 */
export function normalizeRegistryResponse(response) {
  if (!response || !response.servers) {
    return [];
  }

  return response.servers.map(server => normalizeServer(server, 'registry'));
}

/**
 * Merge local config with existing connector item
 * Used when user has customized a server's configuration
 */
export function mergeLocalConfig(item, localConfig) {
  return {
    ...item,
    // Override with local config
    remoteEndpoint: localConfig.remoteEndpoint ?? item.remoteEndpoint,
    installCommand: localConfig.installCommand ?? item.installCommand,
    runCommand: localConfig.runCommand ?? item.runCommand,
    args: localConfig.args ?? item.args,
    // Mark as having local overrides
    hasLocalOverrides: true
  };
}

/**
 * Create a minimal connector item for custom servers
 */
export function createCustomConnectorItem(config) {
  const id = config.id || `custom-${Date.now()}`;

  return {
    id,
    name: config.name || 'Custom Server',
    description: config.description || 'Custom MCP server',
    iconUrl: null,
    source: 'custom',

    profile: config.transport === 'http' ? 'cloud_api' : 'local_tool',
    verified: false,
    useCount: 0,

    remoteEndpoint: config.url || null,
    authType: 'none',

    installCommand: null,
    runCommand: config.command || null,
    args: config.args || [],

    hostApp: null,
    pluginRequired: false,

    hasRemote: !!config.url,
    hasLocal: !!config.command,

    raw: config
  };
}
