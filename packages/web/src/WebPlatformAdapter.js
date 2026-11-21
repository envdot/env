/**
 * Web Platform Adapter — web-safe implementations for browser deployment.
 * Desktop-only features return error stubs. Cloud features work via HTTP/SSE.
 */

const NOT_AVAILABLE = { success: false, error: 'This feature is only available in the desktop app.' };

export class WebPlatformAdapter {
  get capabilities() {
    return {
      hasFileSystem: false,
      hasShell: false,
      hasCliChatbots: false,
      hasCodex: false,
      hasMcpLocal: false,
      hasMcpHostApps: false,
      hasChromeImport: false,
      hasMultiWindow: false,
      hasAppleScript: false,
    };
  }

  // Store — uses localStorage on web
  get store() {
    return {
      get: async (key) => {
        const val = localStorage.getItem(`env_store_${key}`);
        try { return val ? JSON.parse(val) : null; } catch { return val; }
      },
      set: async (key, value) => {
        localStorage.setItem(`env_store_${key}`, JSON.stringify(value));
      },
      delete: async (key) => {
        localStorage.removeItem(`env_store_${key}`);
      },
    };
  }

  // File System — not available on web
  get fs() {
    return {
      readFile: async () => NOT_AVAILABLE,
      writeFile: async () => NOT_AVAILABLE,
      listDir: async () => NOT_AVAILABLE,
      exists: async () => false,
      mkdir: async () => NOT_AVAILABLE,
      delete: async () => NOT_AVAILABLE,
      stat: async () => NOT_AVAILABLE,
    };
  }

  // Shell — not available on web
  get shell() {
    return {
      exec: async () => NOT_AVAILABLE,
      execStream: async () => NOT_AVAILABLE,
      onStreamData: () => () => {},
      cwd: async () => '/web',
      home: async () => '/web',
    };
  }

  // CLI Chatbots — not available on web
  get cliChatbots() {
    return {
      detect: async () => ({ installed: [] }),
      exec: async () => NOT_AVAILABLE,
      kill: async () => {},
      getSlashCommands: async () => ({ success: true, commands: [] }),
      execSlashCommand: async () => ({ success: false, error: 'Not available in web mode' }),
      getMcpServers: async () => ({ success: true, servers: {} }),
      onStreamEvent: () => () => {},
      startPtyStream: async () => ({ success: false, error: 'Not available in web mode' }),
      writePty: async () => ({ success: false }),
      resizePty: async () => ({ success: false }),
      killPtySession: async () => ({ success: false }),
      onPtyData: () => () => {},
      onPtyExit: () => () => {},
    };
  }

  // Codex — not available on web
  get codex() {
    return {
      init: async () => NOT_AVAILABLE,
      run: async () => NOT_AVAILABLE,
      kill: async () => {},
      resume: async () => NOT_AVAILABLE,
    };
  }

  // Window — not available on web (could open new tabs in future)
  get window() {
    return {
      openChatWindow: async () => NOT_AVAILABLE,
    };
  }

  // MCP — remote servers work via HTTP/SSE, local management not available
  get mcp() {
    return {
      // Remote MCP connections (these can work on web via SSE)
      connect: async (serverId, config) => {
        // TODO: Implement web MCP via HTTP/SSE transport
        return NOT_AVAILABLE;
      },
      disconnect: async () => NOT_AVAILABLE,
      listTools: async () => ({ tools: [] }),
      executeTool: async () => NOT_AVAILABLE,
      listResources: async () => ({ resources: [] }),
      readResource: async () => NOT_AVAILABLE,
      status: async () => ({ connected: false }),

      // Local server management — not available
      installServer: async () => NOT_AVAILABLE,
      startServer: async () => NOT_AVAILABLE,
      stopServer: async () => {},
      getServerStatus: async () => ({ running: false }),
      streamLogs: async () => NOT_AVAILABLE,

      // Host app management — not available
      detectHostApp: async () => ({ found: false }),
      launchHostApp: async () => NOT_AVAILABLE,
      checkHostAppRunning: async () => ({ running: false }),

      // OAuth — can work on web via browser redirect
      authorize: async (serverId, mcpServerUrl) => {
        // TODO: Implement web OAuth via browser redirect
        return NOT_AVAILABLE;
      },
      getToken: async () => null,
      clearToken: async () => {},
      refreshToken: async () => NOT_AVAILABLE,

      // Auto-connect events
      onAutoConnected: () => () => {},
    };
  }

  // Chrome Profile — not available on web
  get chromeProfile() {
    return {
      listProfiles: async () => ({ profiles: [] }),
      importProfile: async () => NOT_AVAILABLE,
    };
  }

  // Billing events
  get billing() {
    return {
      onUpdated: () => () => {},
    };
  }

  // Open external link — uses window.open on web
  openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return Promise.resolve();
  }

  // AppleScript — not available on web
  runAppleScript() {
    return Promise.resolve(NOT_AVAILABLE);
  }

  // File viewer — not available on web
  openFileInViewer() {
    return Promise.resolve(NOT_AVAILABLE);
  }
}
