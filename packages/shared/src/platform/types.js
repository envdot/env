/**
 * PlatformAdapter interface — defines the contract between shared code and platform-specific implementations.
 * Desktop adapter: wraps window.electronAPI
 * Web adapter: uses localStorage, window.open, HTTP/SSE, stubs for desktop-only features
 *
 * @typedef {Object} PlatformCapabilities
 * @property {boolean} hasFileSystem - Can read/write local files
 * @property {boolean} hasShell - Can execute shell commands
 * @property {boolean} hasCliChatbots - Can detect/run CLI chatbots (Claude CLI, etc.)
 * @property {boolean} hasCodex - Can run OpenAI Codex SDK
 * @property {boolean} hasMcpLocal - Can manage local MCP servers (install, start, stop)
 * @property {boolean} hasMcpHostApps - Can detect/launch host apps (Claude Desktop, etc.)
 * @property {boolean} hasChromeImport - Can import Chrome profiles
 * @property {boolean} hasMultiWindow - Can open separate chat windows
 * @property {boolean} hasAppleScript - Can run AppleScript
 *
 * @typedef {Object} StoreAdapter
 * @property {(key: string) => Promise<any>} get
 * @property {(key: string, value: any) => Promise<void>} set
 * @property {(key: string) => Promise<void>} delete
 *
 * @typedef {Object} FsAdapter
 * @property {(path: string) => Promise<{success: boolean, data?: string, error?: string}>} readFile
 * @property {(path: string, content: string) => Promise<{success: boolean, error?: string}>} writeFile
 * @property {(path: string) => Promise<{success: boolean, entries?: Array, error?: string}>} listDir
 * @property {(path: string) => Promise<boolean>} exists
 * @property {(path: string) => Promise<{success: boolean, error?: string}>} mkdir
 * @property {(path: string) => Promise<{success: boolean, error?: string}>} delete
 * @property {(path: string) => Promise<{success: boolean, stat?: Object, error?: string}>} stat
 *
 * @typedef {Object} ShellAdapter
 * @property {(command: string, options?: Object) => Promise<{success: boolean, stdout?: string, stderr?: string, error?: string}>} exec
 * @property {(command: string, options?: Object) => Promise<{success: boolean, streamId?: string, error?: string}>} execStream
 * @property {(callback: Function) => Function} onStreamData - Returns unsubscribe function
 * @property {() => Promise<string>} cwd
 * @property {() => Promise<string>} home
 *
 * @typedef {Object} CliChatbotsAdapter
 * @property {() => Promise<Object>} detect
 * @property {(command: string, prompt: string, options?: Object) => Promise<Object>} exec
 * @property {(conversationId: string) => Promise<void>} kill
 * @property {(callback: Function) => Function} onStreamEvent - Returns unsubscribe function
 *
 * @typedef {Object} CodexAdapter
 * @property {(options: Object) => Promise<Object>} init
 * @property {(params: Object) => Promise<Object>} run
 * @property {(conversationId: string) => Promise<void>} kill
 * @property {(params: Object) => Promise<Object>} resume
 *
 * @typedef {Object} WindowAdapter
 * @property {(sessionId: string, sessionName: string) => Promise<void>} openChatWindow
 *
 * @typedef {Object} McpAdapter
 * @property {(serverId: string, config: Object) => Promise<Object>} connect
 * @property {(serverId: string) => Promise<void>} disconnect
 * @property {(serverId: string) => Promise<Object>} listTools
 * @property {(serverId: string, toolName: string, args: Object) => Promise<Object>} executeTool
 * @property {(serverId: string) => Promise<Object>} listResources
 * @property {(serverId: string, uri: string) => Promise<Object>} readResource
 * @property {(serverId: string) => Promise<Object>} status
 * @property {(serverId: string, installCommand: string) => Promise<Object>} installServer
 * @property {(serverId: string, command: string, args: Array) => Promise<Object>} startServer
 * @property {(serverId: string) => Promise<void>} stopServer
 * @property {(serverId: string) => Promise<Object>} getServerStatus
 * @property {(serverId: string) => Promise<Object>} streamLogs
 * @property {(appName: string) => Promise<Object>} detectHostApp
 * @property {(appPath: string) => Promise<Object>} launchHostApp
 * @property {(appName: string) => Promise<Object>} checkHostAppRunning
 * @property {(serverId: string, mcpServerUrl: string) => Promise<Object>} authorize
 * @property {(serverId: string) => Promise<Object>} getToken
 * @property {(serverId: string) => Promise<void>} clearToken
 * @property {(serverId: string) => Promise<Object>} refreshToken
 * @property {(callback: Function) => Function} onAutoConnected
 *
 * @typedef {Object} ChromeProfileAdapter
 * @property {() => Promise<Object>} listProfiles
 * @property {(profilePath: string, dataTypes: Object) => Promise<Object>} importProfile
 *
 * @typedef {Object} BillingAdapter
 * @property {(callback: Function) => Function} onUpdated - Returns unsubscribe function
 *
 * @typedef {Object} PlatformAdapter
 * @property {PlatformCapabilities} capabilities
 * @property {StoreAdapter} store
 * @property {FsAdapter} fs
 * @property {ShellAdapter} shell
 * @property {CliChatbotsAdapter} cliChatbots
 * @property {CodexAdapter} codex
 * @property {WindowAdapter} window
 * @property {McpAdapter} mcp
 * @property {ChromeProfileAdapter} chromeProfile
 * @property {BillingAdapter} billing
 * @property {(url: string) => Promise<void>} openExternal
 * @property {(script: string) => Promise<Object>} runAppleScript
 * @property {(filePath: string) => Promise<Object>} openFileInViewer
 */

export {};
