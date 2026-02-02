import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCachedProviders, refreshProviders } from './modelRegistry';

// Tool definitions for AI models
export const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file at the specified path. Creates the file if it does not exist, overwrites if it does.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_directory',
    description: 'List the contents of a directory',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the directory to list. Defaults to current directory if not specified.'
        }
      },
      required: []
    }
  },
  {
    name: 'run_command',
    description: 'Execute a shell command in the terminal and return the output',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute'
        },
        cwd: {
          type: 'string',
          description: 'The working directory to run the command in (optional)'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'file_exists',
    description: 'Check if a file or directory exists at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to check'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'create_directory',
    description: 'Create a new directory at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the directory to create'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file or directory at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to delete'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_file_info',
    description: 'Get information about a file (size, dates, type)',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file'
        }
      },
      required: ['path']
    }
  }
];

// Helper to expand ~ to home directory
async function expandPath(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath.startsWith('~')) {
    const homeResult = await window.electronAPI.shell.home();
    return inputPath.replace(/^~/, homeResult.home);
  }
  return inputPath;
}

// Execute a tool and return the result
export async function executeTool(toolName, toolInput) {
  const electronAPI = window.electronAPI;

  // Guard against malformed/unparsed tool input
  if (!toolInput || typeof toolInput !== 'object') {
    return { success: false, error: `Tool "${toolName}" received invalid input. Expected an object with the required parameters.` };
  }
  if (toolInput._parseError) {
    return { success: false, error: `Failed to parse tool arguments: ${toolInput._parseError}. Raw input: ${toolInput._raw}` };
  }

  switch (toolName) {
    case 'read_file': {
      if (!toolInput.path) {
        return { success: false, error: 'Missing required parameter "path". Usage: read_file({ path: "/absolute/path/to/file" }). Received: ' + JSON.stringify(toolInput) };
      }
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.readFile(path);
      if (result.success) {
        return { success: true, content: result.content, path: result.path };
      }
      return { success: false, error: result.error };
    }

    case 'write_file': {
      if (!toolInput.path) {
        return { success: false, error: 'Missing required parameter "path". Usage: write_file({ path: "/absolute/path/to/file", content: "file contents" }). Received: ' + JSON.stringify(toolInput).substring(0, 200) };
      }
      if (toolInput.content === undefined || toolInput.content === null) {
        return { success: false, error: 'Missing required parameter "content". Usage: write_file({ path: "/absolute/path/to/file", content: "file contents" }). The "content" field must be a string.' };
      }
      const path = await expandPath(toolInput.path);
      const content = String(toolInput.content);
      // Read old content before writing for diff comparison
      let previousContent = null;
      try {
        const existing = await electronAPI.fs.readFile(path);
        if (existing.success) {
          previousContent = existing.content;
        }
      } catch (e) {
        // File doesn't exist yet, that's fine
      }
      const result = await electronAPI.fs.writeFile(path, content);
      if (result.success) {
        return { success: true, message: `File written successfully to ${result.path}`, previousContent };
      }
      return { success: false, error: result.error };
    }

    case 'list_directory': {
      const path = await expandPath(toolInput.path || '.');
      const result = await electronAPI.fs.listDir(path);
      if (result.success) {
        const listing = result.files.map(f =>
          `${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.name}`
        ).join('\n');
        return { success: true, path: result.path, listing, files: result.files };
      }
      return { success: false, error: result.error };
    }

    case 'run_command': {
      const result = await electronAPI.shell.exec(toolInput.command, { cwd: toolInput.cwd });
      return {
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        error: result.error,
        exitCode: result.code
      };
    }

    case 'file_exists': {
      if (!toolInput.path) {
        return { success: false, error: 'Missing required parameter "path". Usage: file_exists({ path: "/absolute/path" }). Received: ' + JSON.stringify(toolInput) };
      }
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.exists(path);
      return {
        success: true,
        exists: result.exists,
        isDirectory: result.isDirectory,
        isFile: result.isFile,
        path: result.path
      };
    }

    case 'create_directory': {
      if (!toolInput.path) {
        return { success: false, error: 'Missing required parameter "path". Usage: create_directory({ path: "/absolute/path" }). Received: ' + JSON.stringify(toolInput) };
      }
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.mkdir(path);
      if (result.success) {
        return { success: true, message: `Directory created at ${result.path}` };
      }
      return { success: false, error: result.error };
    }

    case 'delete_file': {
      if (!toolInput.path) {
        return { success: false, error: 'Missing required parameter "path". Usage: delete_file({ path: "/absolute/path" }). Received: ' + JSON.stringify(toolInput) };
      }
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.delete(path);
      if (result.success) {
        return { success: true, message: `Deleted ${result.path}` };
      }
      return { success: false, error: result.error };
    }

    case 'get_file_info': {
      if (!toolInput.path) {
        return { success: false, error: 'Missing required parameter "path". Usage: get_file_info({ path: "/absolute/path" }). Received: ' + JSON.stringify(toolInput) };
      }
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.stat(path);
      if (result.success) {
        return {
          success: true,
          path: result.path,
          size: result.size,
          isDirectory: result.isDirectory,
          isFile: result.isFile,
          created: result.created,
          modified: result.modified
        };
      }
      return { success: false, error: result.error };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

export const useStore = create(
  persist(
    (set) => ({
      apiKeys: {
        openrouter: '', // Single OpenRouter key for all cloud models
        ollamaUrl: 'http://localhost:11434',
      },
      setApiKeys: (keys) => set({ apiKeys: keys }),

      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),

      showUpgradePlan: false,
      setShowUpgradePlan: (show) => set({ showUpgradePlan: show }),

      // Number of nodes to add when clicking the add button
      nodeAddCount: 1,
      setNodeAddCount: (count) => set({ nodeAddCount: count }),

      // User's selected models (shown in the model selector dropdown)
      selectedModels: [],
      addSelectedModel: (model) => set((state) => ({
        selectedModels: state.selectedModels.some(m => m.id === model.id)
          ? state.selectedModels
          : [...state.selectedModels, model]
      })),
      removeSelectedModel: (modelId) => set((state) => ({
        selectedModels: state.selectedModels.filter(m => m.id !== modelId)
      })),
      setSelectedModels: (models) => set({ selectedModels: models }),

      // MCP (Model Context Protocol) state
      mcpServers: {
        web: [],      // Pre-configured web MCP servers
        desktop: [],  // Local MCP servers
        custom: [],   // User-added configurations
      },
      // Connection state for each server
      // Structure: { serverId: { status, state, tools, error, logs, appPath, pluginInstalled, appRunning } }
      // - status: 'disconnected' | 'connecting' | 'connected' | 'error' (for UI display)
      // - state: ConnectionState enum value (for detailed state tracking)
      // - tools: array of available tools when connected
      // - error: error message if any
      // - logs: server logs for local tools
      // - appPath: detected host app path
      // - pluginInstalled: whether host app plugin is installed
      // - appRunning: whether host app is currently running
      mcpConnections: {},

      // Server configurations (user overrides for registry servers)
      mcpServerConfigs: {},  // { serverId: { transport, command, args, url, ... } }

      setMcpServers: (category, servers) => set((state) => ({
        mcpServers: { ...state.mcpServers, [category]: servers }
      })),

      addCustomMcpServer: (server) => set((state) => ({
        mcpServers: {
          ...state.mcpServers,
          custom: [...state.mcpServers.custom, server]
        }
      })),

      removeCustomMcpServer: (serverId) => set((state) => ({
        mcpServers: {
          ...state.mcpServers,
          custom: state.mcpServers.custom.filter(s => s.id !== serverId)
        }
      })),

      updateMcpConnection: (serverId, connectionState) => set((state) => ({
        mcpConnections: {
          ...state.mcpConnections,
          [serverId]: { ...state.mcpConnections[serverId], ...connectionState }
        }
      })),

      clearMcpConnection: (serverId) => set((state) => {
        const newConnections = { ...state.mcpConnections };
        delete newConnections[serverId];
        return { mcpConnections: newConnections };
      }),

      // Server config management
      setMcpServerConfig: (serverId, config) => set((state) => ({
        mcpServerConfigs: {
          ...state.mcpServerConfigs,
          [serverId]: { ...state.mcpServerConfigs[serverId], ...config }
        }
      })),

      clearMcpServerConfig: (serverId) => set((state) => {
        const newConfigs = { ...state.mcpServerConfigs };
        delete newConfigs[serverId];
        return { mcpServerConfigs: newConfigs };
      }),

      // Default provider for new nodes
      defaultProvider: 'claude',
      setDefaultProvider: (provider) => set({ defaultProvider: provider }),

      // Sidebar state
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Chat sessions
      chatSessions: [],
      activeChatSession: null,
      setActiveChatSession: (sessionId) => set({ activeChatSession: sessionId }),
      addChatSession: (session) => set((state) => ({
        chatSessions: [...state.chatSessions, session]
      })),
      updateChatSession: (sessionId, updates) => set((state) => ({
        chatSessions: state.chatSessions.map(s =>
          s.id === sessionId ? { ...s, ...updates } : s
        )
      })),
      deleteChatSession: (sessionId) => set((state) => ({
        chatSessions: state.chatSessions.filter(s => s.id !== sessionId),
        activeChatSession: state.activeChatSession === sessionId ? null : state.activeChatSession
      })),
      reorderChatSessions: (sessions) => set({ chatSessions: sessions }),

      // Chat mode (for entering/exiting individual nodes)
      chatMode: null,
      setChatMode: (nodeId) => set({ chatMode: nodeId }),

      // Tabs state - each tab stores its own canvas state
      tabs: [], // { id, sessionId, label, nodes, edges }
      activeTabId: null,
      addTab: (sessionId, label, nodes = [], edges = []) => set((state) => {
        const existingTab = state.tabs.find(t => t.sessionId === sessionId);
        if (existingTab) {
          return { activeTabId: existingTab.id };
        }
        const newTab = { id: `tab-${Date.now()}`, type: 'chat', sessionId, label, nodes, edges };
        return { tabs: [...state.tabs, newTab], activeTabId: newTab.id };
      }),
      addWebTab: (url, label) => set((state) => {
        const existingTab = state.tabs.find(t => t.type === 'web' && t.url === url);
        if (existingTab) {
          return { activeTabId: existingTab.id };
        }
        let tabLabel = label;
        try { tabLabel = label || new URL(url).hostname; } catch (e) { tabLabel = label || url; }
        const newTab = { id: `webtab-${Date.now()}`, type: 'web', label: tabLabel, url };
        return { tabs: [...state.tabs, newTab], activeTabId: newTab.id };
      }),
      updateWebTabUrl: (tabId, url, label) => set((state) => ({
        tabs: state.tabs.map(t => {
          if (t.id === tabId) {
            const updates = { url };
            if (label) updates.label = label;
            return { ...t, ...updates };
          }
          return t;
        })
      })),
      removeTab: (tabId) => set((state) => {
        const newTabs = state.tabs.filter(t => t.id !== tabId);
        const wasActive = state.activeTabId === tabId;
        const newActiveTabId = wasActive
          ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
          : state.activeTabId;
        return { tabs: newTabs, activeTabId: newActiveTabId };
      }),
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      updateTabLabel: (tabId, label) => set((state) => ({
        tabs: state.tabs.map(t => t.id === tabId ? { ...t, label } : t)
      })),
      // Save current canvas state to active tab
      saveTabState: (tabId, nodes, edges) => set((state) => ({
        tabs: state.tabs.map(t => t.id === tabId ? { ...t, nodes, edges } : t)
      })),
      // Reorder tabs (for drag and drop)
      reorderTabs: (newTabs) => set({ tabs: newTabs }),

      // Centralized conversation storage
      conversations: {}, // { nodeId: { messages: [], isLoading: false, provider: 'claude', model: '...' } }
      getConversation: (nodeId) => {
        const state = useStore.getState();
        return state.conversations[nodeId] || {
          messages: [],
          isLoading: false,
          provider: state.defaultProvider,
          model: PROVIDERS[state.defaultProvider]?.models?.[0]?.id || ''
        };
      },
      updateConversation: (nodeId, updates) => set((state) => ({
        conversations: {
          ...state.conversations,
          [nodeId]: {
            ...(state.conversations[nodeId] || {}),
            ...updates
          }
        }
      })),
      setConversationMessages: (nodeId, messages) => set((state) => ({
        conversations: {
          ...state.conversations,
          [nodeId]: {
            ...(state.conversations[nodeId] || {}),
            messages
          }
        }
      })),
      setConversationLoading: (nodeId, isLoading) => set((state) => ({
        conversations: {
          ...state.conversations,
          [nodeId]: {
            ...(state.conversations[nodeId] || {}),
            isLoading
          }
        }
      })),
      deleteConversation: (nodeId) => set((state) => {
        const newConversations = { ...state.conversations };
        delete newConversations[nodeId];
        return { conversations: newConversations };
      }),
      exportConversationToMarkdown: (nodeId) => {
        const state = useStore.getState();
        const conversation = state.conversations[nodeId];
        if (!conversation || !conversation.messages) return '';

        let markdown = `# Conversation Export\n\n`;
        markdown += `**Provider:** ${conversation.provider || 'Unknown'}\n`;
        markdown += `**Model:** ${conversation.model || 'Unknown'}\n`;
        markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
        markdown += `---\n\n`;

        conversation.messages.forEach((msg, index) => {
          if (msg.isToolResult) {
            // Skip tool result messages in export (they're technical)
            return;
          }

          const role = msg.role === 'user' ? 'User' : 'Assistant';
          markdown += `### ${role}\n\n`;

          if (msg.content) {
            markdown += `${msg.content}\n\n`;
          }

          if (msg.toolCalls && msg.toolCalls.length > 0) {
            markdown += `**Tool Calls:**\n`;
            msg.toolCalls.forEach(tc => {
              markdown += `- ${tc.name}(${JSON.stringify(tc.input, null, 2)})\n`;
            });
            markdown += `\n`;
          }

          markdown += `---\n\n`;
        });

        return markdown;
      },

      // Conversation processing queue
      conversationQueue: {}, // { nodeId: { status: 'processing' | 'idle', messages: [], abort: fn } }
      setConversationStatus: (nodeId, status) => set((state) => ({
        conversationQueue: {
          ...state.conversationQueue,
          [nodeId]: { ...state.conversationQueue[nodeId], status }
        }
      })),
      updateConversationMessages: (nodeId, messages) => set((state) => ({
        conversationQueue: {
          ...state.conversationQueue,
          [nodeId]: { ...state.conversationQueue[nodeId], messages }
        }
      })),
      setConversationAbort: (nodeId, abortFn) => set((state) => ({
        conversationQueue: {
          ...state.conversationQueue,
          [nodeId]: { ...state.conversationQueue[nodeId], abort: abortFn }
        }
      })),
      clearConversation: (nodeId) => set((state) => {
        const newQueue = { ...state.conversationQueue };
        delete newQueue[nodeId];
        return { conversationQueue: newQueue };
      }),

      // Dynamic model providers
      providers: null,
      setProviders: (providers) => set({ providers }),
      refreshModels: async () => {
        const providers = await refreshProviders();
        set({ providers });
      },

      // CLI Chatbot models
      cliChatbotModels: [],
      setCliChatbotModels: (chatbots) => set((state) => {
        // Convert detected chatbots to model format
        const models = chatbots.map(bot => ({
          id: bot.command,
          name: bot.name,
          command: bot.command,
          path: bot.path
        }));

        // Update providers with CLI chatbot models
        const updatedProviders = {
          ...(state.providers || STATIC_PROVIDERS),
          cliChatbot: {
            ...STATIC_PROVIDERS.cliChatbot,
            models
          }
        };

        return {
          cliChatbotModels: models,
          providers: updatedProviders
        };
      }),
    }),
    {
      name: 'env-storage',
    }
  )
);

// Initialize providers on load (uses 24h cache; only fetches when missing or expired)
getCachedProviders().then(providers => {
  useStore.setState({ providers });
});

// Static fallback providers (used if dynamic loading fails)
// Model IDs use OpenRouter format: "provider/model-name"
const STATIC_PROVIDERS = {
  claude: {
    name: 'Claude',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
      { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
      { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
    ],
  },
  openai: {
    name: 'OpenAI',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'openai/o1', name: 'o1' },
      { id: 'openai/o1-mini', name: 'o1 Mini' },
    ],
  },
  gemini: {
    name: 'Gemini',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
      { id: 'google/gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro' },
      { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash' },
    ],
  },
  grok: {
    name: 'Grok',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'x-ai/grok-3', name: 'Grok-3' },
      { id: 'x-ai/grok-3-mini', name: 'Grok-3 Mini' },
      { id: 'x-ai/grok-2', name: 'Grok-2' },
    ],
  },
  ollama: {
    name: 'Ollama',
    icon: '',
    type: 'local',
    models: [
      { id: 'llama3.3:70b', name: 'Llama 3.3 70B' },
      { id: 'llama3.2:3b', name: 'Llama 3.2 3B' },
      { id: 'llama3.2:1b', name: 'Llama 3.2 1B' },
      { id: 'qwen2.5:32b', name: 'Qwen 2.5 32B' },
      { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
      { id: 'mistral:7b', name: 'Mistral 7B' },
      { id: 'phi3:mini', name: 'Phi-3 Mini' },
      { id: 'gemma2:9b', name: 'Gemma 2 9B' },
      { id: 'glm4:latest', name: 'GLM 4 7B' },
      { id: 'devstral:123b', name: 'Devstral 2 123B Instruct' },
      { id: 'deepseek-v3:latest', name: 'DeepSeek V3' },
      { id: 'minimax:latest', name: 'MiniMax M2.1' },
    ],
  },
  cliChatbot: {
    name: 'CLI Chatbot',
    icon: '💻',
    type: 'local',
    models: [], // Will be populated dynamically from detected CLI tools
  },
};

// Export PROVIDERS - uses dynamic if available, otherwise static fallback
export const PROVIDERS = new Proxy(STATIC_PROVIDERS, {
  get(target, prop) {
    const state = useStore.getState();
    if (state.providers && state.providers[prop]) {
      return state.providers[prop];
    }
    return target[prop];
  },
  ownKeys(target) {
    const state = useStore.getState();
    if (state.providers) {
      return Object.keys(state.providers);
    }
    return Object.keys(target);
  },
  has(target, prop) {
    const state = useStore.getState();
    if (state.providers) {
      return prop in state.providers;
    }
    return prop in target;
  }
});

// Helper to get current providers (for components)
export function useProviders() {
  const dynamicProviders = useStore(state => state.providers);
  return dynamicProviders || STATIC_PROVIDERS;
}

// Attempt to repair truncated JSON from tool call arguments
function repairJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim();

  // Count open/close braces and brackets
  let braces = 0, brackets = 0, inString = false, escape = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // Close any unclosed strings
  if (inString) str += '"';

  // Close any unclosed brackets/braces
  while (brackets > 0) { str += ']'; brackets--; }
  while (braces > 0) { str += '}'; braces--; }

  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function parseToolArguments(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Attempt to repair truncated JSON
    const repaired = repairJSON(raw);
    if (repaired) {
      console.warn('Repaired truncated tool arguments:', raw);
      return repaired;
    }
    console.warn('Failed to parse tool arguments:', raw, e);
    return { _raw: raw, _parseError: e.message };
  }
}

// API call functions - now returns { content, toolCalls } for tool use support
export async function callAPI(provider, model, messages, apiKey, options = {}, signal) {
  console.log('🔍 callAPI called with:', { provider, model, hasApiKey: !!apiKey });

  // Local providers (ollama, cliChatbot) use their own APIs
  if (provider === 'ollama') {
    return await callOllama(apiKey, model, messages, options, signal);
  }
  if (provider === 'cliChatbot') {
    return await callCliChatbot(model, messages);
  }

  // All cloud providers go through OpenRouter
  // apiKey should be the OpenRouter API key
  if (!apiKey) {
    throw new Error('No OpenRouter API key configured. Please add your API key in Settings.');
  }

  return await callOpenRouter(apiKey, model, messages, options, signal);
}

// Default model for OpenRouter
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

// Call any cloud model via OpenRouter (unified API for Claude, GPT, Gemini, Grok, etc.)
async function callOpenRouter(apiKey, model, messages, options = {}, signal) {
  const { enableTools = true } = options;

  // Validate API key
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('No OpenRouter API key configured. Please add your API key in Settings.');
  }

  // Use default model if none provided
  const effectiveModel = model || DEFAULT_MODEL;

  console.log('🌐 callOpenRouter using model:', effectiveModel, '(requested:', model, ')');

  // Convert tools to OpenAI format (OpenRouter uses OpenAI-compatible format)
  const openRouterTools = enableTools ? TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  })) : undefined;

  // Build OpenRouter messages (OpenAI-compatible format)
  const openRouterMessages = messages.map(m => {
    // Handle tool results
    if (m.toolResults) {
      return m.toolResults.map(tr => ({
        role: 'tool',
        tool_call_id: tr.tool_use_id,
        content: JSON.stringify(tr.result)
      }));
    }
    // Handle assistant messages with tool calls
    if (m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.input)
          }
        }))
      };
    }
    return { role: m.role, content: m.content };
  }).flat();

  const requestBody = {
    model: effectiveModel,
    messages: openRouterMessages,
    max_tokens: 16384,
  };

  if (openRouterTools) {
    requestBody.tools = openRouterTools;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://env.local',
      'X-Title': 'Env Desktop',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  const message = data.choices[0].message;

  // Check for tool calls (OpenAI format)
  const toolCalls = message.tool_calls?.map(tc => {
    const input = parseToolArguments(tc.function.arguments);
    return { id: tc.id, name: tc.function.name, input };
  }) || null;

  // Return structured response
  return {
    content: message.content || '',
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    stopReason: data.choices[0].finish_reason
  };
}

// Legacy direct API calls (kept for fallback/specific use cases)
async function callOpenAI(apiKey, model, messages, options = {}) {
  const { enableTools = true } = options;

  // Use default model if none provided
  const effectiveModel = model || DEFAULT_MODELS.openai;
  console.log('🟢 callOpenAI using model:', effectiveModel);

  // Convert tools to OpenAI format
  const openaiTools = enableTools ? TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  })) : undefined;

  // Build OpenAI messages
  const openaiMessages = messages.map(m => {
    // Handle tool results
    if (m.toolResults) {
      return m.toolResults.map(tr => ({
        role: 'tool',
        tool_call_id: tr.tool_use_id,
        content: JSON.stringify(tr.result)
      }));
    }
    // Handle assistant messages with tool calls
    if (m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.input)
          }
        }))
      };
    }
    return { role: m.role, content: m.content };
  }).flat();

  const requestBody = { model: effectiveModel, messages: openaiMessages };
  if (openaiTools) {
    requestBody.tools = openaiTools;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  const message = data.choices[0].message;

  // Check for tool calls
  const toolCalls = message.tool_calls?.map(tc => {
    const input = parseToolArguments(tc.function.arguments);
    return { id: tc.id, name: tc.function.name, input };
  }) || null;

  return {
    content: message.content || '',
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    stopReason: data.choices[0].finish_reason
  };
}

async function callGemini(apiKey, model, messages) {
  // Use default model if none provided
  const effectiveModel = model || DEFAULT_MODELS.gemini;
  console.log('🟡 callGemini using model:', effectiveModel);

  // Filter out tool-related messages for Gemini (no tool support yet)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls);

  const contents = filteredMessages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    toolCalls: null,
    stopReason: 'end'
  };
}

async function callGrok(apiKey, model, messages) {
  // Use default model if none provided
  const effectiveModel = model || DEFAULT_MODELS.grok;
  console.log('🟠 callGrok using model:', effectiveModel);

  // Filter out tool-related messages for Grok (no tool support yet)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls);

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: effectiveModel, messages: filteredMessages }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    toolCalls: null,
    stopReason: data.choices[0].finish_reason
  };
}

async function callOllama(config, model, messages, options = {}, signal) {
  // config is actually the apiKeys object, we need the ollamaUrl
  const ollamaUrl = config?.ollamaUrl || 'http://localhost:11434';
  const { enableTools = true } = options;

  // Convert tools to Ollama format
  const ollamaTools = enableTools ? TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  })) : undefined;

  // Build Ollama messages
  const ollamaMessages = messages.map(m => {
    // Handle tool results
    if (m.toolResults) {
      return m.toolResults.map(tr => ({
        role: 'tool',
        content: JSON.stringify(tr.result)
      }));
    }
    // Handle assistant messages with tool calls
    if (m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || '',
        tool_calls: m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: tc.input  // Send as object, not string
          }
        }))
      };
    }
    return { role: m.role, content: m.content };
  }).flat();

  const requestBody = {
    model,
    messages: ollamaMessages,
    stream: false
  };

  // Add tools if enabled
  if (ollamaTools) {
    requestBody.tools = ollamaTools;
  }

  // Debug logging
  console.log('Ollama Request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }

  const data = await response.json();
  const message = data.message;

  // Debug logging
  console.log('Ollama Response:', JSON.stringify(data, null, 2));

  // Check for tool calls in Ollama response
  const toolCalls = message.tool_calls?.map(tc => {
    const input = parseToolArguments(tc.function.arguments);
    return {
      id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: tc.function.name,
      input
    };
  }) || null;

  console.log('Parsed tool calls:', toolCalls);

  return {
    content: message.content || '',
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    stopReason: data.done ? 'stop' : 'tool_use'
  };
}

async function callCliChatbot(commandOrModel, messages) {
  // Filter out tool-related messages for CLI chatbots (no tool support)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls);

  // Build the conversation prompt
  let conversationText = filteredMessages.map(m => {
    const role = m.role === 'user' ? 'User' : 'Assistant';
    return `${role}: ${m.content}`;
  }).join('\n\n');

  // Get the last user message as the prompt
  const lastUserMessage = filteredMessages.filter(m => m.role === 'user').pop();
  const prompt = lastUserMessage ? lastUserMessage.content : conversationText;

  try {
    // Claude Code needs longer timeout (5 minutes), others use 2 minutes
    const timeout = commandOrModel === 'claude' ? 300000 : 120000;

    const result = await window.electronAPI.cliChatbots.exec(commandOrModel, prompt, {
      timeout: timeout
    });

    if (!result.success) {
      // Show stderr if available to help debug the issue
      const errorMessage = result.stderr || result.error || 'CLI chatbot execution failed';

      // Check for common issues and provide helpful messages
      if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('not authenticated')) {
        throw new Error(`Claude Code is not configured. Please run 'claude' in your terminal to set up your API key.\n\nError details: ${errorMessage}`);
      }

      throw new Error(errorMessage);
    }

    return {
      content: result.stdout || 'No response from CLI chatbot',
      toolCalls: null,
      stopReason: 'stop'
    };
  } catch (error) {
    throw new Error(`CLI Chatbot Error: ${error.message}`);
  }
}

// Process a conversation independently from UI components
export async function processConversation(nodeId, userMessage, currentMessages, provider, model, context, updateNodeData) {
  console.log('🚀 processConversation called with:', { nodeId, provider, model });

  const store = useStore.getState();
  const { apiKeys, setConversationStatus, setConversationMessages, setConversationLoading, setConversationAbort } = store;

  // Create AbortController for this conversation
  const abortController = new AbortController();
  setConversationAbort(nodeId, () => abortController.abort());

  // Mark as processing
  setConversationStatus(nodeId, 'processing');
  setConversationLoading(nodeId, true);

  let messages = [...currentMessages, userMessage];

  // Update store with new messages
  setConversationMessages(nodeId, messages);

  // Update node data immediately
  updateNodeData(nodeId, { messages });

  try {
    // Tool call loop
    let continueLoop = true;
    let loopCount = 0;
    const maxLoops = 10;

    while (continueLoop && loopCount < maxLoops) {
      loopCount++;

      // Check if conversation was cancelled
      const queueState = useStore.getState().conversationQueue[nodeId];
      if (!queueState || queueState.status === 'cancelled') {
        break;
      }

      const allMessages = [...context, ...messages];
      // Use OpenRouter key for all cloud providers, Ollama config for local
      const apiKeyOrConfig = (provider === 'ollama')
        ? apiKeys
        : (provider === 'cliChatbot')
          ? null
          : apiKeys.openrouter;

      const response = await callAPI(provider, model, allMessages, apiKeyOrConfig, {}, abortController.signal);

      if (response.toolCalls && response.toolCalls.length > 0) {
        // Add assistant message with tool calls
        const assistantMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.content || '',
          toolCalls: response.toolCalls,
        };
        messages = [...messages, assistantMessage];
        setConversationMessages(nodeId, messages);
        updateNodeData(nodeId, { messages });

        // Execute tools
        const toolResults = [];
        for (const toolCall of response.toolCalls) {
          const result = await executeTool(toolCall.name, toolCall.input);
          toolResults.push({
            tool_use_id: toolCall.id,
            name: toolCall.name,
            input: toolCall.input,
            result: result
          });
        }

        // Add tool results
        const toolResultMessage = {
          id: (Date.now() + 1).toString(),
          role: 'user',
          content: '',
          toolResults: toolResults,
          isToolResult: true,
        };
        messages = [...messages, toolResultMessage];
        setConversationMessages(nodeId, messages);
        updateNodeData(nodeId, { messages });

      } else {
        // No tool calls, add response and stop
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content || '',
        };
        messages = [...messages, assistantMessage];
        setConversationMessages(nodeId, messages);
        updateNodeData(nodeId, { messages });
        continueLoop = false;
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // User intentionally stopped the response - don't add error message
      console.log('🛑 Conversation aborted by user:', nodeId);
    } else {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
      };
      messages = [...messages, errorMessage];
      setConversationMessages(nodeId, messages);
      updateNodeData(nodeId, { messages });
    }
  } finally {
    setConversationStatus(nodeId, 'idle');
    setConversationLoading(nodeId, false);
  }

  return messages;
}
