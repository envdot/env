/**
 * Connection Profile Enums
 * Routes MCP servers into appropriate UX patterns based on their transport/config type
 */

export const ConnectionProfile = {
  CLOUD_API: 'cloud_api',         // Remote HTTP/SSE - OAuth/API key modal
  LOCAL_TOOL: 'local_tool',       // Local stdio/CLI - Install/Run inline panel
  HOST_APP_ATTACH: 'host_app_attach', // Host app plugin - Preflight checklist
  HYBRID: 'hybrid',               // Both remote + local - Split button dropdown
  MANUAL: 'manual'                // Unknown/ambiguous - Advanced config modal
};

export const ConnectionState = {
  // Common states
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',

  // Local tool states
  NOT_INSTALLED: 'not_installed',
  INSTALLED: 'installed',
  RUNNING: 'running',
  STOPPED: 'stopped',

  // Host app states
  APP_NOT_FOUND: 'app_not_found',
  PLUGIN_MISSING: 'plugin_missing',
  APP_NOT_RUNNING: 'app_not_running',
  ATTACHED: 'attached'
};

export const AuthType = {
  OAUTH: 'oauth',
  API_KEY: 'api_key',
  NONE: 'none'
};

/**
 * Profile display metadata
 */
export const ProfileMeta = {
  [ConnectionProfile.CLOUD_API]: {
    label: 'Cloud',
    buttonLabel: 'Connect',
    color: '#3b82f6', // blue
    icon: 'cloud'
  },
  [ConnectionProfile.LOCAL_TOOL]: {
    label: 'Local',
    buttonLabel: 'Install & Run',
    color: '#22c55e', // green
    icon: 'terminal'
  },
  [ConnectionProfile.HOST_APP_ATTACH]: {
    label: 'Attach',
    buttonLabel: 'Open & Attach',
    color: '#a855f7', // purple
    icon: 'link'
  },
  [ConnectionProfile.HYBRID]: {
    label: 'Hybrid',
    buttonLabel: 'Connect',
    color: '#f59e0b', // amber
    icon: 'layers'
  },
  [ConnectionProfile.MANUAL]: {
    label: 'Manual',
    buttonLabel: 'Configure',
    color: '#6b7280', // gray
    icon: 'settings'
  }
};
