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

  switch (toolName) {
    case 'read_file': {
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.readFile(path);
      if (result.success) {
        return { success: true, content: result.content, path: result.path };
      }
      return { success: false, error: result.error };
    }

    case 'write_file': {
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.writeFile(path, toolInput.content);
      if (result.success) {
        return { success: true, message: `File written successfully to ${result.path}` };
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
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.mkdir(path);
      if (result.success) {
        return { success: true, message: `Directory created at ${result.path}` };
      }
      return { success: false, error: result.error };
    }

    case 'delete_file': {
      const path = await expandPath(toolInput.path);
      const result = await electronAPI.fs.delete(path);
      if (result.success) {
        return { success: true, message: `Deleted ${result.path}` };
      }
      return { success: false, error: result.error };
    }

    case 'get_file_info': {
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
        claude: '',
        openai: '',
        gemini: '',
        grok: '',
        ollamaUrl: 'http://localhost:11434',
      },
      setApiKeys: (keys) => set({ apiKeys: keys }),

      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),

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
            ...state.conversations[nodeId],
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

// Initialize providers on load - force clear old cache first
localStorage.removeItem('model_registry_cache');
getCachedProviders().then(providers => {
  useStore.setState({ providers });
});

// Static fallback providers (used if dynamic loading fails)
const STATIC_PROVIDERS = {
  claude: {
    name: 'Claude',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
  },
  openai: {
    name: 'OpenAI',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
  },
  gemini: {
    name: 'Gemini',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
    ],
  },
  grok: {
    name: 'Grok',
    icon: '',
    type: 'cloud',
    models: [
      { id: 'grok-4', name: 'Grok-4' },
      { id: 'grok-2', name: 'Grok-2' },
      { id: 'grok-2-mini', name: 'Grok-2 Mini' },
      { id: 'grok-beta', name: 'Grok Beta' },
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

// API call functions - now returns { content, toolCalls } for tool use support
export async function callAPI(provider, model, messages, apiKey, options = {}) {
  // Local providers don't need API keys
  if (!apiKey && provider !== 'ollama' && provider !== 'cliChatbot') {
    throw new Error(`No API key configured for ${PROVIDERS[provider].name}`);
  }

  // Keep all message properties including toolResults and toolCalls
  switch (provider) {
    case 'claude':
      return await callClaude(apiKey, model, messages, options);
    case 'openai':
      return await callOpenAI(apiKey, model, messages, options);
    case 'gemini':
      return await callGemini(apiKey, model, messages);
    case 'grok':
      return await callGrok(apiKey, model, messages);
    case 'ollama':
      return await callOllama(apiKey, model, messages);
    case 'cliChatbot':
      return await callCliChatbot(model, messages);
    default:
      throw new Error('Unknown provider');
  }
}

async function callClaude(apiKey, model, messages, options = {}) {
  const { enableTools = true, toolResults = null } = options;

  // Build the messages array for Claude
  let claudeMessages = messages.map((m) => {
    // Handle tool results in the message
    if (m.toolResults) {
      return {
        role: 'user',
        content: m.toolResults.map(tr => ({
          type: 'tool_result',
          tool_use_id: tr.tool_use_id,
          content: JSON.stringify(tr.result)
        }))
      };
    }
    // Handle assistant messages with tool use
    if (m.toolCalls && m.toolCalls.length > 0) {
      const content = [];
      if (m.content) {
        content.push({ type: 'text', text: m.content });
      }
      m.toolCalls.forEach(tc => {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.input
        });
      });
      return { role: 'assistant', content };
    }
    return {
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    };
  });

  const requestBody = {
    model,
    max_tokens: 4096,
    messages: claudeMessages,
  };

  // Add tools if enabled
  if (enableTools) {
    requestBody.tools = TOOLS;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  // Check if the response contains tool use
  const toolCalls = data.content
    .filter(block => block.type === 'tool_use')
    .map(block => ({
      id: block.id,
      name: block.name,
      input: block.input
    }));

  const textContent = data.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  // Return structured response
  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    stopReason: data.stop_reason
  };
}

async function callOpenAI(apiKey, model, messages, options = {}) {
  const { enableTools = true } = options;

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

  const requestBody = { model, messages: openaiMessages };
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
  const toolCalls = message.tool_calls?.map(tc => ({
    id: tc.id,
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments)
  })) || null;

  return {
    content: message.content || '',
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    stopReason: data.choices[0].finish_reason
  };
}

async function callGemini(apiKey, model, messages) {
  // Filter out tool-related messages for Gemini (no tool support yet)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls);

  const contents = filteredMessages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
  // Filter out tool-related messages for Grok (no tool support yet)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls);

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages: filteredMessages }),
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

async function callOllama(config, model, messages, options = {}) {
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
  const toolCalls = message.tool_calls?.map(tc => ({
    id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: tc.function.name,
    input: typeof tc.function.arguments === 'string'
      ? JSON.parse(tc.function.arguments)
      : tc.function.arguments
  })) || null;

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
    const result = await window.electronAPI.cliChatbots.exec(commandOrModel, prompt, {
      timeout: 120000 // 2 minutes
    });

    if (!result.success) {
      throw new Error(result.error || result.stderr || 'CLI chatbot execution failed');
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
  const store = useStore.getState();
  const { apiKeys, setConversationStatus, setConversationMessages, setConversationLoading } = store;

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
      const apiKeyOrConfig = (provider === 'ollama') ? apiKeys : apiKeys[provider];

      const response = await callAPI(provider, model, allMessages, apiKeyOrConfig);

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
    const errorMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `Error: ${error.message}`,
    };
    messages = [...messages, errorMessage];
    setConversationMessages(nodeId, messages);
    updateNodeData(nodeId, { messages });
  } finally {
    setConversationStatus(nodeId, 'idle');
    setConversationLoading(nodeId, false);
  }

  return messages;
}
