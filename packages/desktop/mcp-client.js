/**
 * MCP (Model Context Protocol) Client for Electron Main Process
 *
 * Handles connections to MCP servers via stdio (local) and HTTP (remote) transports.
 * Uses JSON-RPC 2.0 protocol for communication.
 */

const { spawn } = require('child_process');
const readline = require('readline');

class MCPClient {
  constructor() {
    this.connections = new Map(); // serverId -> { process, transport, tools, resources, prompts }
    this.messageId = 0;
    this.pendingRequests = new Map(); // messageId -> { resolve, reject }
    this.sessionIds = new Map(); // serverId -> Mcp-Session-Id
    this.connectLocks = new Map(); // serverId -> Promise (prevents concurrent connectHttp)
    this.onTokenRefresh = null; // async (serverId) => newAccessToken | null
  }

  /**
   * Generate a unique message ID for JSON-RPC requests
   */
  getNextId() {
    return ++this.messageId;
  }

  /**
   * Connect to a stdio-based MCP server (local servers)
   */
  async connectStdio(serverId, command, args = [], env = {}) {
    if (this.connections.has(serverId)) {
      await this.disconnect(serverId);
    }

    return new Promise((resolve, reject) => {
      try {
        const proc = spawn(command, args, {
          env: { ...process.env, ...env },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        const connection = {
          process: proc,
          transport: 'stdio',
          tools: [],
          resources: [],
          prompts: [],
          buffer: '',
        };

        // Handle stdout - JSON-RPC responses
        const rl = readline.createInterface({
          input: proc.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          try {
            const message = JSON.parse(line);
            this.handleMessage(serverId, message);
          } catch (e) {
            console.error(`[MCP ${serverId}] Failed to parse message:`, line);
          }
        });

        // Handle stderr - log errors
        proc.stderr.on('data', (data) => {
          console.error(`[MCP ${serverId}] stderr:`, data.toString());
        });

        // Handle process exit
        proc.on('close', (code) => {
          console.log(`[MCP ${serverId}] Process exited with code ${code}`);
          this.connections.delete(serverId);
        });

        proc.on('error', (error) => {
          console.error(`[MCP ${serverId}] Process error:`, error);
          reject(error);
        });

        this.connections.set(serverId, connection);

        // Initialize the connection
        this.initialize(serverId)
          .then((result) => {
            resolve({ success: true, serverInfo: result });
          })
          .catch((error) => {
            this.disconnect(serverId);
            reject(error);
          });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect to an HTTP-based MCP server (remote servers)
   */
  async connectHttp(serverId, url, options = {}) {
    // Serialize connect attempts for the same server — wait for any in-progress connect to finish
    const existing = this.connectLocks.get(serverId);
    if (existing) {
      console.log(`[MCP] connectHttp: ${serverId} — waiting for existing attempt to finish`);
      try {
        await Promise.race([
          existing,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection lock timeout')), 30000))
        ]);
      } catch (e) {
        console.warn(`[MCP] connectHttp: ${serverId} — lock wait failed: ${e.message}`);
        this.connectLocks.delete(serverId);
      }
    }

    const connectPromise = this._doConnectHttp(serverId, url, options);
    this.connectLocks.set(serverId, connectPromise);
    try {
      return await connectPromise;
    } finally {
      // Only clear if this is still the current lock
      if (this.connectLocks.get(serverId) === connectPromise) {
        this.connectLocks.delete(serverId);
      }
    }
  }

  async _doConnectHttp(serverId, url, options = {}) {
    // If already connected to the same URL with a valid session, skip re-init
    const existing = this.connections.get(serverId);
    if (existing && existing.url === url && this.sessionIds.has(serverId)) {
      console.log(`[MCP] connectHttp: ${serverId} already connected with session, skipping`);
      return { success: true, serverInfo: {} };
    }

    if (this.connections.has(serverId)) {
      await this.disconnect(serverId);
    }

    console.log(`[MCP] connectHttp: ${serverId} -> ${url} (hasToken: ${!!options.authToken})`);

    // Clear any stale session ID — initialize must not include one per MCP spec
    this.sessionIds.delete(serverId);

    const connection = {
      url,
      transport: 'http',
      tools: [],
      resources: [],
      prompts: [],
      authToken: options.authToken || null,
    };

    this.connections.set(serverId, connection);

    try {
      const result = await this.initialize(serverId);
      console.log(`[MCP] connectHttp: ${serverId} initialized successfully`);
      return { success: true, serverInfo: result };
    } catch (error) {
      console.error(`[MCP] connectHttp: ${serverId} failed:`, error.message);
      if (error.message?.includes('401')) {
        this.connections.delete(serverId);
        return { success: false, error: 'auth_required', statusCode: 401 };
      }
      this.connections.delete(serverId);
      throw error;
    }
  }

  /**
   * Send a JSON-RPC message to the server
   */
  async sendMessage(serverId, method, params = {}) {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`No connection for server ${serverId}`);
    }

    const id = this.getNextId();
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, serverId });

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);

      if (connection.transport === 'stdio') {
        connection.process.stdin.write(JSON.stringify(message) + '\n');
      } else if (connection.transport === 'http') {
        this.sendHttpMessage(serverId, connection.url, message)
          .then((response) => {
            this.pendingRequests.delete(id);
            if (response.error) {
              reject(new Error(response.error.message || 'RPC Error'));
            } else {
              resolve(response.result);
            }
          })
          .catch((error) => {
            this.pendingRequests.delete(id);
            reject(error);
          });
      }
    });
  }

  /**
   * Send HTTP message for HTTP transport with auth + session support
   */
  async sendHttpMessage(serverId, url, message) {
    const doRequest = async (token) => {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const sessionId = this.sessionIds.get(serverId);
      if (sessionId) {
        headers['Mcp-Session-Id'] = sessionId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      });

      // Capture session ID from response (try both cases)
      const newSessionId = response.headers.get('mcp-session-id') || response.headers.get('Mcp-Session-Id');
      if (newSessionId) {
        console.log(`[MCP] Session ID captured for ${serverId}: ${newSessionId}`);
        this.sessionIds.set(serverId, newSessionId);
      } else {
        console.log(`[MCP] No session ID in response headers for ${serverId}. Headers:`, [...response.headers.entries()].map(([k,v]) => `${k}: ${v.substring(0, 50)}`).join(', '));
      }

      return response;
    };

    // Get token from connection
    const connection = this.connections.get(serverId);
    const token = connection?.authToken || null;

    let response = await doRequest(token);

    // 401 retry: attempt token refresh if callback is set
    if (response.status === 401 && token && this.onTokenRefresh) {
      try {
        const newToken = await this.onTokenRefresh(serverId);
        if (newToken) {
          if (connection) connection.authToken = newToken;
          response = await doRequest(newToken);
        }
      } catch (_) { /* refresh failed, fall through */ }
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[MCP] HTTP ${response.status} from ${url}:`, body.substring(0, 500));
      throw new Error(`HTTP error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`[MCP] Response from ${url}: ${response.status} ${contentType}`);

    // Handle 202/204 or empty responses (common for notifications)
    if (response.status === 202 || response.status === 204) {
      return { jsonrpc: '2.0', result: {} };
    }

    // Handle SSE responses (some servers return text/event-stream even for Streamable HTTP)
    if (contentType.includes('text/event-stream')) {
      const text = await response.text();
      // Parse SSE: look for "data: {...}" lines
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            return JSON.parse(line.slice(6));
          } catch (_) { /* not JSON, skip */ }
        }
      }
      throw new Error('No valid JSON-RPC response in SSE stream');
    }

    // Handle empty body (notifications may return 200 with no body)
    const text = await response.text();
    if (!text || !text.trim()) {
      return { jsonrpc: '2.0', result: {} };
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`[MCP] Failed to parse response from ${url}:`, text.substring(0, 200));
      throw new Error('Invalid JSON in response');
    }
  }

  /**
   * Update auth token for an existing connection
   */
  updateAuthToken(serverId, token) {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.authToken = token;
    }
  }

  /**
   * Handle incoming JSON-RPC message
   */
  handleMessage(serverId, message) {
    // Handle response to a request
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || 'RPC Error'));
      } else {
        resolve(message.result);
      }
    }

    // Handle notifications (no id)
    if (!message.id && message.method) {
      this.handleNotification(serverId, message.method, message.params);
    }
  }

  /**
   * Handle server notifications
   */
  handleNotification(serverId, method, params) {
    console.log(`[MCP ${serverId}] Notification:`, method, params);

    // Handle specific notifications
    switch (method) {
      case 'notifications/tools/list_changed':
        // Tools list changed, refresh
        this.listTools(serverId).catch(console.error);
        break;
      case 'notifications/resources/list_changed':
        // Resources list changed, refresh
        this.listResources(serverId).catch(console.error);
        break;
      default:
        console.log(`[MCP ${serverId}] Unknown notification:`, method);
    }
  }

  /**
   * Initialize connection with the server
   */
  async initialize(serverId) {
    const result = await this.sendMessage(serverId, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true,
        },
        sampling: {},
      },
      clientInfo: {
        name: 'env-desktop',
        version: '1.0.0',
      },
    });

    // Send initialized notification — must complete before we allow tools/list etc.
    const connection = this.connections.get(serverId);
    if (connection) {
      if (connection.transport === 'stdio') {
        connection.process.stdin.write(
          JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'
        );
      } else if (connection.transport === 'http') {
        // Wait for notification to complete — server may reject tools/list before this
        try {
          await this.sendHttpMessage(serverId, connection.url, {
            jsonrpc: '2.0',
            method: 'notifications/initialized',
          });
        } catch (e) {
          // Some servers return empty/204 for notifications — that's fine
          console.log(`[MCP] notifications/initialized response for ${serverId}:`, e.message || 'ok');
        }
      }
    }

    return result;
  }

  /**
   * List available tools from the server
   */
  async listTools(serverId) {
    const result = await this.sendMessage(serverId, 'tools/list', {});

    const connection = this.connections.get(serverId);
    if (connection) {
      connection.tools = result.tools || [];
    }

    return { tools: result.tools || [] };
  }

  /**
   * List available resources from the server
   */
  async listResources(serverId) {
    try {
      const result = await this.sendMessage(serverId, 'resources/list', {});

      const connection = this.connections.get(serverId);
      if (connection) {
        connection.resources = result.resources || [];
      }

      return { resources: result.resources || [] };
    } catch (error) {
      // Server may not support resources
      return { resources: [] };
    }
  }

  /**
   * List available prompts from the server
   */
  async listPrompts(serverId) {
    try {
      const result = await this.sendMessage(serverId, 'prompts/list', {});

      const connection = this.connections.get(serverId);
      if (connection) {
        connection.prompts = result.prompts || [];
      }

      return { prompts: result.prompts || [] };
    } catch (error) {
      // Server may not support prompts
      return { prompts: [] };
    }
  }

  /**
   * Execute a tool on the server
   */
  async executeTool(serverId, toolName, args = {}) {
    const result = await this.sendMessage(serverId, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    return result;
  }

  /**
   * Read a resource from the server
   */
  async readResource(serverId, uri) {
    const result = await this.sendMessage(serverId, 'resources/read', {
      uri,
    });

    return result;
  }

  /**
   * Get a prompt from the server
   */
  async getPrompt(serverId, name, args = {}) {
    const result = await this.sendMessage(serverId, 'prompts/get', {
      name,
      arguments: args,
    });

    return result;
  }

  /**
   * Disconnect from a server
   */
  async disconnect(serverId) {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return { success: true };
    }

    if (connection.transport === 'stdio' && connection.process) {
      connection.process.kill();
    }

    this.connections.delete(serverId);
    this.sessionIds.delete(serverId);

    // Clean up pending requests for this server
    for (const [id, request] of this.pendingRequests.entries()) {
      if (request.serverId === serverId) {
        request.reject(new Error('Connection closed'));
        this.pendingRequests.delete(id);
      }
    }

    return { success: true };
  }

  /**
   * Get connection status for a server
   */
  getStatus(serverId) {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      transport: connection.transport,
      tools: connection.tools,
      resources: connection.resources,
      prompts: connection.prompts,
    };
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll() {
    const serverIds = Array.from(this.connections.keys());
    await Promise.all(serverIds.map((id) => this.disconnect(id)));
  }
}

module.exports = MCPClient;
