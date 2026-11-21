const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },
  runAppleScript: (script) => ipcRenderer.invoke('run-applescript', script),

  // File System APIs
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs-write-file', filePath, content),
    listDir: (dirPath) => ipcRenderer.invoke('fs-list-dir', dirPath),
    exists: (filePath) => ipcRenderer.invoke('fs-exists', filePath),
    mkdir: (dirPath) => ipcRenderer.invoke('fs-mkdir', dirPath),
    delete: (filePath) => ipcRenderer.invoke('fs-delete', filePath),
    stat: (filePath) => ipcRenderer.invoke('fs-stat', filePath)
  },

  // File Viewer API
  openFileInViewer: (filePath) => ipcRenderer.invoke('open-file-in-viewer', filePath),

  // Shell/Terminal APIs
  shell: {
    exec: (command, options) => ipcRenderer.invoke('shell-exec', command, options),
    execStream: (command, options) => ipcRenderer.invoke('shell-exec-stream', command, options),
    onStreamData: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('shell-stream-data', handler);
      return () => ipcRenderer.removeListener('shell-stream-data', handler);
    },
    cwd: () => ipcRenderer.invoke('shell-cwd'),
    home: () => ipcRenderer.invoke('shell-home')
  },

  // Claude credentials (reads from Claude CLI's Anthropic account)
  claude: {
    getCredentials: () => ipcRenderer.invoke('get-claude-credentials'),
  },

  // CLI Chatbot APIs
  cliChatbots: {
    detect: (options) => ipcRenderer.invoke('detect-cli-chatbots', options),
    update: (command) => ipcRenderer.invoke('update-cli-tool', command),
    exec: (command, prompt, options) => ipcRenderer.invoke('cli-chatbot-exec', command, prompt, options),
    kill: (conversationId) => ipcRenderer.invoke('cli-chatbot-kill', conversationId),
    getSlashCommands: (command) => ipcRenderer.invoke('get-cli-slash-commands', command),
    execSlashCommand: (command, slashCmd, conversationId) => ipcRenderer.invoke('cli-slash-command', command, slashCmd, conversationId),
    getMcpServers: () => ipcRenderer.invoke('cli-get-mcp-servers'),
    onStreamEvent: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('cli-stream-event', handler);
      return () => ipcRenderer.removeListener('cli-stream-event', handler);
    },
    // PTY streaming for xterm.js
    startPtyStream: (command, conversationId) => ipcRenderer.invoke('pty-start-stream', command, conversationId),
    writePty: (conversationId, data) => ipcRenderer.invoke('pty-write', conversationId, data),
    resizePty: (conversationId, cols, rows) => ipcRenderer.invoke('pty-resize', conversationId, cols, rows),
    killPtySession: (conversationId) => ipcRenderer.invoke('cli-pty-kill', conversationId),
    onPtyData: (callback) => {
      const handler = (_event, conversationId, data) => callback(conversationId, data);
      ipcRenderer.on('pty-data', handler);
      return () => ipcRenderer.removeListener('pty-data', handler);
    },
    onPtyExit: (callback) => {
      const handler = (_event, conversationId, exitCode) => callback(conversationId, exitCode);
      ipcRenderer.on('pty-exit', handler);
      return () => ipcRenderer.removeListener('pty-exit', handler);
    },
  },

  // Codex SDK APIs
  codex: {
    init: (options) => ipcRenderer.invoke('codex-init', options),
    run: (params) => ipcRenderer.invoke('codex-run', params),
    kill: (conversationId) => ipcRenderer.invoke('codex-kill', conversationId),
    resume: (params) => ipcRenderer.invoke('codex-resume', params),
  },

  // Window APIs
  window: {
    openChatWindow: (sessionId, sessionName) => ipcRenderer.invoke('open-chat-window', sessionId, sessionName)
  },

  // MCP (Model Context Protocol) APIs
  mcp: {
    connect: (serverId, config) => ipcRenderer.invoke('mcp-connect', { serverId, config }),
    disconnect: (serverId) => ipcRenderer.invoke('mcp-disconnect', serverId),
    listTools: (serverId) => ipcRenderer.invoke('mcp-list-tools', serverId),
    executeTool: (serverId, toolName, args) => ipcRenderer.invoke('mcp-execute-tool', { serverId, toolName, args }),
    listResources: (serverId) => ipcRenderer.invoke('mcp-list-resources', serverId),
    readResource: (serverId, uri) => ipcRenderer.invoke('mcp-read-resource', { serverId, uri }),
    status: (serverId) => ipcRenderer.invoke('mcp-status', serverId),

    // Local server management
    installServer: (serverId, installCommand) => ipcRenderer.invoke('mcp-install-server', serverId, installCommand),
    startServer: (serverId, command, args) => ipcRenderer.invoke('mcp-start-server', serverId, command, args),
    stopServer: (serverId) => ipcRenderer.invoke('mcp-stop-server', serverId),
    getServerStatus: (serverId) => ipcRenderer.invoke('mcp-get-server-status', serverId),
    streamLogs: (serverId) => ipcRenderer.invoke('mcp-stream-logs', serverId),

    // Host app management
    detectHostApp: (appName) => ipcRenderer.invoke('mcp-detect-host-app', appName),
    launchHostApp: (appPath) => ipcRenderer.invoke('mcp-launch-host-app', appPath),
    checkHostAppRunning: (appName) => ipcRenderer.invoke('mcp-check-host-app-running', appName),

    // OAuth
    authorize: (serverId, mcpServerUrl) => ipcRenderer.invoke('mcp-oauth-authorize', { serverId, mcpServerUrl }),
    getToken: (serverId) => ipcRenderer.invoke('mcp-oauth-get-token', serverId),
    clearToken: (serverId) => ipcRenderer.invoke('mcp-oauth-clear-token', serverId),
    refreshToken: (serverId) => ipcRenderer.invoke('mcp-oauth-refresh', serverId),

    // Auto-connect events
    onAutoConnected: (callback) => ipcRenderer.on('mcp-auto-connected', (event, data) => callback(data)),
  },

  // Chrome Profile Import APIs
  chromeProfile: {
    listProfiles: () => ipcRenderer.invoke('chrome-profile-list'),
    importProfile: (profilePath, dataTypes) => ipcRenderer.invoke('chrome-profile-import', { profilePath, dataTypes })
  },

  // Open external URL in system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Billing events (deep link from Stripe checkout)
  billing: {
    onUpdated: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('billing-updated', handler);
      return () => ipcRenderer.removeListener('billing-updated', handler);
    },
  },
});
