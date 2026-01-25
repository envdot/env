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
  async connectHttp(serverId, url) {
    if (this.connections.has(serverId)) {
      await this.disconnect(serverId);
    }

    const connection = {
      url,
      transport: 'http',
      tools: [],
      resources: [],
      prompts: [],
    };

    this.connections.set(serverId, connection);

    try {
      const result = await this.initialize(serverId);
      return { success: true, serverInfo: result };
    } catch (error) {
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
        this.sendHttpMessage(connection.url, message)
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
   * Send HTTP message for HTTP transport
   */
  async sendHttpMessage(url, message) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
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

    // Send initialized notification
    const connection = this.connections.get(serverId);
    if (connection && connection.transport === 'stdio') {
      connection.process.stdin.write(
        JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'
      );
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
