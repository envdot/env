const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const Store = require('electron-store');
const { getExtendedPath } = require('./utils/path');
const MCPClient = require('./mcp-client');

const store = new Store();
const mcpClient = new MCPClient();

// Debug log file for CLI session tracking
const cliLogFile = path.join(require('os').homedir(), 'Desktop', 'cli-debug.log');
function cliLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(cliLogFile, line);
}

let mainWindow;
const chatWindows = new Map(); // Track chat windows by session ID

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1164,
    height: 765,
    minWidth: 831,
    minHeight: 595,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, 'build', 'index.html')}`
    : 'http://localhost:3000';

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://localhost') || url.startsWith('file://')) {
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle webview (guest) errors gracefully - suppress redirect aborts
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // ERR_ABORTED (-3) is normal during redirects, ignore silently
      if (errorCode === -3) return;
      console.warn('Webview load error:', errorCode, errorDescription, validatedURL);
    });

    // Suppress unhandled rejection from GUEST_VIEW_MANAGER_CALL
    contents.on('render-process-gone', () => {});
  }
});

// Suppress uncaught GUEST_VIEW_MANAGER_CALL errors from webview redirects
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('ERR_ABORTED')) return;
  if (error.message && error.message.includes('GUEST_VIEW_MANAGER_CALL')) return;
  console.error('Uncaught exception:', error);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for storage
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
});

// ===== Chat Window Handler =====
ipcMain.handle('open-chat-window', (event, sessionId, sessionName) => {
  // Check if window already exists for this session
  if (chatWindows.has(sessionId)) {
    const existingWindow = chatWindows.get(sessionId);
    if (!existingWindow.isDestroyed()) {
      existingWindow.focus();
      return { success: true, reused: true };
    }
    chatWindows.delete(sessionId);
  }

  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, 'build', 'index.html')}`
    : 'http://localhost:3000';

  const chatWindow = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 400,
    minHeight: 400,
    show: false,
    title: sessionName || 'Chat',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load with query params to indicate this is a chat-only window
  chatWindow.loadURL(`${startUrl}?chatWindow=true&sessionId=${sessionId}`);

  chatWindow.once('ready-to-show', () => {
    chatWindow.show();
  });

  chatWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  chatWindow.on('closed', () => {
    chatWindows.delete(sessionId);
  });

  chatWindows.set(sessionId, chatWindow);
  return { success: true, reused: false };
});

// AppleScript handler
ipcMain.handle('run-applescript', (event, script) => {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
});

// ===== File System Handlers =====

ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    return { success: true, content, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-write-file', async (event, filePath, content) => {
  try {
    const absolutePath = path.resolve(filePath);
    await fs.promises.writeFile(absolutePath, content, 'utf-8');
    return { success: true, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-list-dir', async (event, dirPath) => {
  try {
    const absolutePath = path.resolve(dirPath || '.');
    const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.join(absolutePath, entry.name)
    }));
    return { success: true, files, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-exists', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    await fs.promises.access(absolutePath);
    const stat = await fs.promises.stat(absolutePath);
    return {
      success: true,
      exists: true,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      path: absolutePath
    };
  } catch (error) {
    return { success: true, exists: false, path: path.resolve(filePath) };
  }
});

ipcMain.handle('fs-mkdir', async (event, dirPath) => {
  try {
    const absolutePath = path.resolve(dirPath);
    await fs.promises.mkdir(absolutePath, { recursive: true });
    return { success: true, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-delete', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const stat = await fs.promises.stat(absolutePath);
    if (stat.isDirectory()) {
      await fs.promises.rm(absolutePath, { recursive: true });
    } else {
      await fs.promises.unlink(absolutePath);
    }
    return { success: true, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-stat', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const stat = await fs.promises.stat(absolutePath);
    return {
      success: true,
      path: absolutePath,
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      created: stat.birthtime,
      modified: stat.mtime
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Terminal/Shell Handlers =====

ipcMain.handle('shell-exec', async (event, command, options = {}) => {
  return new Promise((resolve) => {
    const opts = {
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 10,
      shell: true
    };

    exec(command, opts, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : null,
        code: error ? error.code : 0
      });
    });
  });
});

ipcMain.handle('shell-cwd', async () => {
  return { success: true, cwd: process.cwd() };
});

ipcMain.handle('shell-home', async () => {
  return { success: true, home: require('os').homedir() };
});

// ===== CLI Chatbot Detection =====

ipcMain.handle('detect-cli-chatbots', async () => {
  const chatbots = [];

  const cliTools = [
    'claude',
    'aider',
    'gpt-engineer',
    'github-copilot-cli',
    'copilot',
    'cursor',
    'codex',
    'openai',
    'gemini',
    'bard',
    'llm',
    'sgpt',
    'chatgpt',
    'ai',
  ];

  const extendedPath = getExtendedPath();

  for (const command of cliTools) {
    try {
      await new Promise((resolve) => {
        exec(`which ${command}`, {
          env: { ...process.env, PATH: extendedPath }
        }, (error, stdout) => {
          if (!error && stdout.trim()) {
            const name = command
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            chatbots.push({
              name: name,
              command: command,
              path: stdout.trim(),
              available: true
            });
          }
          resolve();
        });
      });
    } catch (error) {
      // Tool not available, skip
    }
  }

  return { success: true, chatbots };
});

// Track Claude session IDs per conversation for --continue support
const claudeSessionMap = new Map();

// Track running CLI child processes by conversationId so we can kill them (interject/abort)
const runningCliProcesses = new Map(); // conversationId -> childProcess

// Codex SDK integration
let codexClient = null;
const codexThreadMap = new Map(); // conversationId -> Thread
const codexAbortMap = new Map(); // conversationId -> AbortController

// Kill a running CLI chatbot process (for interject / stop button)
ipcMain.handle('cli-chatbot-kill', async (event, conversationId) => {
  const proc = runningCliProcesses.get(conversationId);
  if (proc) {
    try {
      proc.kill('SIGTERM');
    } catch (e) {
      // Process may already be dead
    }
    runningCliProcesses.delete(conversationId);
    return { success: true };
  }
  return { success: false, error: 'No running process found' };
});

// Execute CLI chatbot command
ipcMain.handle('cli-chatbot-exec', async (event, command, prompt, options = {}) => {
  return new Promise((resolve) => {
    const os = require('os');
    const homeDir = os.homedir();
    const extendedPath = getExtendedPath();

    exec(`which ${command}`, {
      env: { ...process.env, PATH: extendedPath }
    }, (whichError, whichStdout) => {
      if (whichError || !whichStdout || !whichStdout.trim()) {
        resolve({
          success: false,
          stdout: '',
          stderr: `Command not found: ${command}`,
          error: `Command not found: ${command}`,
          code: 127
        });
        return;
      }

      const commandPath = whichStdout.trim();

      if (!fs.existsSync(commandPath)) {
        resolve({
          success: false,
          stdout: '',
          stderr: `Command path not found: ${commandPath}`,
          error: `Command path not found: ${commandPath}`,
          code: 127
        });
        return;
      }

      let args = [];

      if (command === 'claude') {
        // Use --continue with session ID if we have one from a previous turn
        const conversationId = options.conversationId;
        const existingSessionId = conversationId ? claudeSessionMap.get(conversationId) : null;

        // Build permission flags based on user choice
        const permissionLevel = options.permissionLevel || 'denied';
        const permissionArgs = [];
        if (permissionLevel === 'all') {
          permissionArgs.push('--dangerously-skip-permissions');
        } else if (permissionLevel === 'readonly') {
          permissionArgs.push('--allowedTools', 'Read,Glob,Grep,WebFetch,WebSearch');
        }
        // 'denied' = no special flags

        // System prompt to guide behavior in non-interactive mode
        const appendPrompt = 'You are running in non-interactive print mode. Critical rules: 1) When fetching data from multiple URLs, write/append results to a file (CSV, JSON) IMMEDIATELY after each fetch using the Write or Bash tool — never hold large amounts of scraped data in context. 2) On follow-up messages in a resumed session, read data from files you already created rather than re-fetching URLs. 3) Never use the Task tool — sub-agents do not work in this mode. 4) When the user asks to list or display data, ALWAYS show ALL rows — never truncate or summarize. 5) For large datasets (50+ rows), display them in a csv code block (```csv), NOT a markdown table — code blocks render much faster.';

        if (existingSessionId) {
          cliLog(`[CLI] Resuming session ${existingSessionId} for conv ${conversationId}`);
          args = [...permissionArgs, '--resume', existingSessionId, '-p', prompt, '--append-system-prompt', appendPrompt, '--disallowed-tools', 'Task,TaskOutput', '--output-format', 'stream-json', '--verbose'];
        } else {
          cliLog(`[CLI] Starting new session for conv ${conversationId} (no existing session)`);
          args = [...permissionArgs, '-p', prompt, '--append-system-prompt', appendPrompt, '--disallowed-tools', 'Task,TaskOutput', '--output-format', 'stream-json', '--verbose'];
        }
      } else if (command === 'cursor') {
        resolve({
          success: false,
          stdout: '',
          stderr: 'Cursor is a code editor and does not support chat mode',
          error: 'Cursor is a code editor and does not support chat mode',
          code: 1
        });
        return;
      } else if (command === 'aider') {
        args = ['--message', prompt, '--yes'];
      } else if (command === 'gemini') {
        args = [prompt];
      } else {
        args = [prompt];
      }

      let isNodeScript = false;
      try {
        const firstLine = fs.readFileSync(commandPath, 'utf8').split('\n')[0];
        isNodeScript = firstLine.includes('node');
      } catch (e) {
        // Not a text file, proceed normally
      }

      let spawnCmd = commandPath;
      let spawnArgsFinal = args;

      if (isNodeScript) {
        const nodeDir = path.dirname(commandPath);
        const nodePath = path.join(nodeDir, 'node');
        if (fs.existsSync(nodePath)) {
          spawnCmd = nodePath;
          spawnArgsFinal = [commandPath, ...args];
        }
      }

      const execTimeout = command === 'claude' ? 300000 : (options.timeout || 120000);

      const childProcess = spawn(spawnCmd, spawnArgsFinal, {
        cwd: options.cwd || homeDir,
        env: {
          ...process.env,
          PATH: extendedPath,
          HOME: homeDir,
          NO_COLOR: '1',
          FORCE_COLOR: '0'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      childProcess.stdin.end();

      // Track this process so it can be killed on interject/abort
      if (options.conversationId) {
        runningCliProcesses.set(options.conversationId, childProcess);
      }

      let stdout = '';
      let stderr = '';
      let killed = false;
      let lineBuffer = '';  // Buffer for incomplete NDJSON lines

      const timeoutId = setTimeout(() => {
        killed = true;
        childProcess.kill('SIGTERM');
      }, execTimeout);

      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;

        // Parse NDJSON stream events for Claude and send to renderer
        if (command === 'claude' && options.conversationId && mainWindow && !mainWindow.isDestroyed()) {
          const convId = options.conversationId;
          lineBuffer += chunk;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || ''; // Keep incomplete last line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              mainWindow.webContents.send('cli-stream-event', { conversationId: convId, event });

              // Capture session_id from any event that has it (init, assistant, result)
              if (event.session_id && !claudeSessionMap.has(convId)) {
                cliLog(`[CLI] Captured session_id ${event.session_id} from ${event.type} event for conv ${convId}`);
                claudeSessionMap.set(convId, event.session_id);
              }
            } catch (e) {
              // Not valid JSON line — might be raw verbose output, ignore
            }
          }
        }
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        // Remove from running process tracker
        if (options.conversationId) {
          runningCliProcesses.delete(options.conversationId);
        }

        let errorMessage = null;
        if (killed) {
          errorMessage = 'Command timed out';
        } else if (code !== 0) {
          errorMessage = stderr && stderr.trim()
            ? `${stderr.trim()}`
            : `Process exited with code ${code}`;
        }

        // Extract final text from stream-json output
        // The stream is NDJSON — collect all 'assistant' text events and the 'result' event
        let responseText = '';
        let resultText = '';
        let sessionId = null;

        if (command === 'claude' && stdout) {
          const lines = stdout.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              if (event.type === 'assistant' && event.message) {
                // Collect assistant text chunks
                if (event.message.content) {
                  for (const block of event.message.content) {
                    if (block.type === 'text') {
                      responseText += block.text;
                    }
                  }
                }
              } else if (event.type === 'result') {
                sessionId = event.session_id || null;
                if (event.result) {
                  resultText = event.result;
                }
              }
            } catch (e) {
              // Not valid JSON, skip
            }
          }

          // Prefer result text (the model's intended final output) when available.
          // Fall back to accumulated assistant text, then raw stdout.
          if (resultText) {
            responseText = resultText;
          } else if (!responseText) {
            responseText = stdout;
          }

          // Store session ID (also done in stream handler, but ensure it's captured)
          const convId = options.conversationId;
          if (sessionId && convId) {
            claudeSessionMap.set(convId, sessionId);
            cliLog(`[CLI] Close handler: stored session_id ${sessionId} for conv ${convId}`);
          } else {
            cliLog(`[CLI] Close handler: no sessionId captured (sessionId=${sessionId}, convId=${convId})`);
          }
        }

        resolve({
          success: code === 0 && !killed,
          stdout: responseText || stdout || '',
          stderr: stderr || '',
          error: errorMessage,
          code: killed ? 143 : code,
          sessionId: sessionId
        });
      });

      childProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout: stdout || '',
          stderr: stderr || '',
          error: err.message,
          code: 1
        });
      });
    });
  });
});

// ============================================
// Codex SDK IPC Handlers
// ============================================

// Map a Codex SDK ThreadItem to Claude CLI streaming event format
function mapCodexItemToStreamEvents(item, eventType) {
  const events = [];

  switch (item.type) {
    case 'agent_message': {
      events.push({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: item.text || '' }]
        }
      });
      break;
    }

    case 'command_execution': {
      // Map to Bash tool_use
      events.push({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: item.id || `codex_cmd_${Date.now()}`,
            name: 'Bash',
            input: { command: item.command || '' }
          }]
        }
      });
      // On completion, also emit the tool result
      if (eventType === 'item.completed' && item.aggregated_output !== undefined) {
        events.push({
          type: 'user',
          message: {
            content: [{
              type: 'tool_result',
              tool_use_id: item.id || `codex_cmd_${Date.now()}`,
              content: item.aggregated_output || '',
              is_error: item.status === 'failed'
            }]
          }
        });
      }
      break;
    }

    case 'file_change': {
      // Map each file change to a tool_use block
      const toolBlocks = (item.changes || []).map(change => ({
        type: 'tool_use',
        id: `${item.id}_${change.path}`,
        name: change.kind === 'add' ? 'Write' : change.kind === 'delete' ? 'Delete' : 'Edit',
        input: { file_path: change.path }
      }));
      if (toolBlocks.length > 0) {
        events.push({
          type: 'assistant',
          message: { content: toolBlocks }
        });
        // Emit result on completion
        if (eventType === 'item.completed') {
          for (const block of toolBlocks) {
            events.push({
              type: 'user',
              message: {
                content: [{
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: item.status === 'completed' ? 'Success' : 'Failed',
                  is_error: item.status === 'failed'
                }]
              }
            });
          }
        }
      }
      break;
    }

    case 'mcp_tool_call': {
      events.push({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: item.id || `codex_mcp_${Date.now()}`,
            name: item.tool || 'MCP',
            input: item.arguments || {}
          }]
        }
      });
      // Emit result on completion
      if (eventType === 'item.completed') {
        const resultContent = item.result?.content?.map(b => b.text || '').join('') || '';
        events.push({
          type: 'user',
          message: {
            content: [{
              type: 'tool_result',
              tool_use_id: item.id || `codex_mcp_${Date.now()}`,
              content: item.error?.message || resultContent || '',
              is_error: item.status === 'failed'
            }]
          }
        });
      }
      break;
    }

    case 'web_search': {
      events.push({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: item.id || `codex_search_${Date.now()}`,
            name: 'WebSearch',
            input: { query: item.query || '' }
          }]
        }
      });
      break;
    }

    case 'todo_list': {
      events.push({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: item.id || `codex_todo_${Date.now()}`,
            name: 'TodoWrite',
            input: { items: item.items || [] }
          }]
        }
      });
      break;
    }

    // reasoning, error — skip (internal)
    default:
      break;
  }

  return events;
}

// Map top-level Codex SDK ThreadEvent to stream events
function mapCodexEventToStreamEvents(codexEvent) {
  switch (codexEvent.type) {
    case 'item.started':
    case 'item.updated':
    case 'item.completed': {
      if (codexEvent.item) {
        return mapCodexItemToStreamEvents(codexEvent.item, codexEvent.type);
      }
      return [];
    }

    case 'turn.completed': {
      return [{ type: 'result', result: '' }];
    }

    case 'turn.failed': {
      const errorMsg = codexEvent.error?.message || 'Unknown error';
      return [{ type: 'result', result: `Error: ${errorMsg}` }];
    }

    case 'thread.started':
    case 'turn.started':
      // Informational — no UI event needed
      return [];

    case 'error': {
      return [{ type: 'result', result: `Error: ${codexEvent.message || 'Unknown error'}` }];
    }

    default:
      return [];
  }
}

// Initialize Codex client (ESM-only package, use dynamic import)
ipcMain.handle('codex-init', async (event, options = {}) => {
  try {
    if (codexClient) {
      return { success: true };
    }
    const { Codex } = await import('@openai/codex-sdk');
    const extendedPath = getExtendedPath();
    codexClient = new Codex({
      env: { PATH: extendedPath, HOME: require('os').homedir() },
      apiKey: options.apiKey || undefined,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Execute a streamed turn on a Codex thread
ipcMain.handle('codex-run', async (event, { conversationId, prompt, threadOptions = {} }) => {
  if (!codexClient) {
    return { success: false, error: 'Codex not initialized. Call codex-init first.' };
  }

  try {
    // Get or create thread for this conversation
    let thread = codexThreadMap.get(conversationId);
    if (!thread) {
      thread = codexClient.startThread({
        model: threadOptions.model || undefined,
        approvalPolicy: threadOptions.approvalPolicy || 'on-failure',
        sandboxMode: threadOptions.sandboxMode || 'workspace-write',
        workingDirectory: threadOptions.workingDirectory || require('os').homedir(),
        skipGitRepoCheck: true,
      });
      codexThreadMap.set(conversationId, thread);
    }

    // Set up abort controller
    const abortController = new AbortController();
    codexAbortMap.set(conversationId, abortController);

    // Run streamed — returns { events: AsyncGenerator<ThreadEvent> }
    const { events } = await thread.runStreamed(prompt, { signal: abortController.signal });
    let finalResponse = '';

    for await (const sdkEvent of events) {
      // Map SDK event to CLI stream format
      const mappedEvents = mapCodexEventToStreamEvents(sdkEvent);
      for (const mapped of mappedEvents) {
        if (mapped && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('cli-stream-event', {
            conversationId,
            event: mapped
          });
        }
      }

      // Capture final text from completed agent_message items
      if (sdkEvent.type === 'item.completed' && sdkEvent.item?.type === 'agent_message') {
        finalResponse = sdkEvent.item.text || '';
      }
    }

    codexAbortMap.delete(conversationId);

    return {
      success: true,
      content: finalResponse,
      threadId: thread.id || null,
    };
  } catch (error) {
    codexAbortMap.delete(conversationId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Codex execution aborted', code: 143 };
    }
    return { success: false, error: error.message };
  }
});

// Kill a running Codex thread (for interject / stop button)
ipcMain.handle('codex-kill', async (event, conversationId) => {
  const controller = codexAbortMap.get(conversationId);
  if (controller) {
    controller.abort();
    codexAbortMap.delete(conversationId);
    return { success: true };
  }
  return { success: false, error: 'No running Codex process found' };
});

// Resume a previous Codex thread
ipcMain.handle('codex-resume', async (event, { conversationId, threadId, threadOptions = {} }) => {
  if (!codexClient) {
    return { success: false, error: 'Codex not initialized' };
  }
  try {
    const thread = codexClient.resumeThread(threadId, threadOptions);
    codexThreadMap.set(conversationId, thread);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// MCP (Model Context Protocol) IPC Handlers
// ============================================

// Connect to an MCP server
ipcMain.handle('mcp-connect', async (event, { serverId, config }) => {
  try {
    if (config.transport === 'stdio') {
      const result = await mcpClient.connectStdio(
        serverId,
        config.command,
        config.args || [],
        config.env || {}
      );
      return result;
    } else if (config.transport === 'http') {
      const result = await mcpClient.connectHttp(serverId, config.url);
      return result;
    } else {
      return { success: false, error: `Unknown transport: ${config.transport}` };
    }
  } catch (error) {
    console.error(`[MCP] Failed to connect to ${serverId}:`, error);
    return { success: false, error: error.message };
  }
});

// Disconnect from an MCP server
ipcMain.handle('mcp-disconnect', async (event, serverId) => {
  try {
    await mcpClient.disconnect(serverId);
    return { success: true };
  } catch (error) {
    console.error(`[MCP] Failed to disconnect from ${serverId}:`, error);
    return { success: false, error: error.message };
  }
});

// List tools from an MCP server
ipcMain.handle('mcp-list-tools', async (event, serverId) => {
  try {
    const result = await mcpClient.listTools(serverId);
    return { success: true, tools: result.tools };
  } catch (error) {
    console.error(`[MCP] Failed to list tools for ${serverId}:`, error);
    return { success: false, error: error.message, tools: [] };
  }
});

// Execute a tool on an MCP server
ipcMain.handle('mcp-execute-tool', async (event, { serverId, toolName, args }) => {
  try {
    const result = await mcpClient.executeTool(serverId, toolName, args);
    return { success: true, result };
  } catch (error) {
    console.error(`[MCP] Failed to execute tool ${toolName} on ${serverId}:`, error);
    return { success: false, error: error.message };
  }
});

// List resources from an MCP server
ipcMain.handle('mcp-list-resources', async (event, serverId) => {
  try {
    const result = await mcpClient.listResources(serverId);
    return { success: true, resources: result.resources };
  } catch (error) {
    console.error(`[MCP] Failed to list resources for ${serverId}:`, error);
    return { success: false, error: error.message, resources: [] };
  }
});

// Read a resource from an MCP server
ipcMain.handle('mcp-read-resource', async (event, { serverId, uri }) => {
  try {
    const result = await mcpClient.readResource(serverId, uri);
    return { success: true, result };
  } catch (error) {
    console.error(`[MCP] Failed to read resource ${uri} from ${serverId}:`, error);
    return { success: false, error: error.message };
  }
});

// Get MCP connection status
ipcMain.handle('mcp-status', async (event, serverId) => {
  try {
    const status = mcpClient.getStatus(serverId);
    return { success: true, ...status };
  } catch (error) {
    return { success: false, connected: false, error: error.message };
  }
});

// ============================================
// MCP Local Server Management IPC Handlers
// ============================================

// Track running local MCP server processes
const runningServers = new Map(); // serverId -> { process, logs }

// Install an MCP server (run npm/pip install command)
ipcMain.handle('mcp-install-server', async (event, serverId, installCommand) => {
  return new Promise((resolve) => {
    const extendedPath = getExtendedPath();

    exec(installCommand, {
      env: { ...process.env, PATH: extendedPath },
      timeout: 300000, // 5 minutes for installation
      maxBuffer: 1024 * 1024 * 10
    }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
});

// Start a local MCP server process
ipcMain.handle('mcp-start-server', async (event, serverId, command, args = []) => {
  try {
    // Kill existing process if running
    if (runningServers.has(serverId)) {
      const existing = runningServers.get(serverId);
      existing.process.kill();
      runningServers.delete(serverId);
    }

    const extendedPath = getExtendedPath();
    const os = require('os');
    const homeDir = os.homedir();

    // Find the command path
    const commandPath = await new Promise((resolve, reject) => {
      exec(`which ${command}`, {
        env: { ...process.env, PATH: extendedPath }
      }, (error, stdout) => {
        if (error || !stdout.trim()) {
          reject(new Error(`Command not found: ${command}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });

    // Spawn the server process
    const serverProcess = spawn(commandPath, args, {
      cwd: homeDir,
      env: { ...process.env, PATH: extendedPath, HOME: homeDir },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const serverEntry = {
      process: serverProcess,
      logs: '',
      startTime: Date.now()
    };

    serverProcess.stdout.on('data', (data) => {
      serverEntry.logs += data.toString();
      // Keep logs limited to 100KB
      if (serverEntry.logs.length > 100000) {
        serverEntry.logs = serverEntry.logs.slice(-50000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      serverEntry.logs += data.toString();
      if (serverEntry.logs.length > 100000) {
        serverEntry.logs = serverEntry.logs.slice(-50000);
      }
    });

    serverProcess.on('close', (code) => {
      serverEntry.logs += `\n[Process exited with code ${code}]`;
      runningServers.delete(serverId);
    });

    runningServers.set(serverId, serverEntry);

    // Wait a moment for the server to start, then connect via MCP
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to connect via MCP stdio
    try {
      const mcpResult = await mcpClient.connectStdio(serverId, command, args, {});
      if (mcpResult.success) {
        const toolsResult = await mcpClient.listTools(serverId);
        return { success: true, tools: toolsResult.tools || [] };
      }
    } catch (mcpError) {
      console.log(`[MCP] Could not connect via MCP protocol: ${mcpError.message}`);
    }

    return { success: true, tools: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stop a running local MCP server
ipcMain.handle('mcp-stop-server', async (event, serverId) => {
  try {
    // Disconnect MCP first
    try {
      await mcpClient.disconnect(serverId);
    } catch (e) {
      // Ignore MCP disconnect errors
    }

    // Kill the process
    if (runningServers.has(serverId)) {
      const entry = runningServers.get(serverId);
      entry.process.kill();
      runningServers.delete(serverId);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get server status and logs
ipcMain.handle('mcp-get-server-status', async (event, serverId) => {
  const entry = runningServers.get(serverId);
  if (entry) {
    return {
      success: true,
      running: true,
      logs: entry.logs,
      uptime: Date.now() - entry.startTime
    };
  }
  return { success: true, running: false, logs: '', uptime: 0 };
});

// Stream logs from a running server
ipcMain.handle('mcp-stream-logs', async (event, serverId) => {
  const entry = runningServers.get(serverId);
  return entry ? entry.logs : '';
});

// ============================================
// Host App Detection IPC Handlers
// ============================================

// Common host app paths by OS
const HOST_APP_PATHS = {
  darwin: {
    blender: [
      '/Applications/Blender.app',
      '/Applications/Blender 4.app',
      '/Applications/Blender 3.app'
    ],
    vscode: [
      '/Applications/Visual Studio Code.app',
      '/Applications/VSCode.app'
    ],
    cursor: [
      '/Applications/Cursor.app'
    ],
    figma: [
      '/Applications/Figma.app'
    ],
    obsidian: [
      '/Applications/Obsidian.app'
    ],
    unity: [
      '/Applications/Unity Hub.app',
      '/Applications/Unity/Hub/Editor'
    ],
    photoshop: [
      '/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app',
      '/Applications/Adobe Photoshop 2023/Adobe Photoshop 2023.app'
    ]
  },
  win32: {
    blender: [
      'C:\\Program Files\\Blender Foundation\\Blender',
      'C:\\Program Files\\Blender Foundation\\Blender 4.0'
    ],
    vscode: [
      'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'
    ]
  },
  linux: {
    blender: [
      '/usr/bin/blender',
      '/snap/bin/blender'
    ],
    vscode: [
      '/usr/bin/code',
      '/snap/bin/code'
    ]
  }
};

// Detect a host application
ipcMain.handle('mcp-detect-host-app', async (event, appName) => {
  const platform = process.platform;
  const appPaths = HOST_APP_PATHS[platform]?.[appName.toLowerCase()] || [];

  for (const appPath of appPaths) {
    try {
      const expandedPath = appPath.replace('%USERNAME%', require('os').userInfo().username);
      await fs.promises.access(expandedPath);
      return { found: true, path: expandedPath };
    } catch (e) {
      // Path doesn't exist, try next
    }
  }

  // Try using 'which' on Unix-like systems
  if (platform !== 'win32') {
    try {
      const result = await new Promise((resolve) => {
        exec(`which ${appName}`, (error, stdout) => {
          if (!error && stdout.trim()) {
            resolve({ found: true, path: stdout.trim() });
          } else {
            resolve({ found: false });
          }
        });
      });
      if (result.found) return result;
    } catch (e) {
      // Not found via which
    }
  }

  return { found: false };
});

// Launch a host application
ipcMain.handle('mcp-launch-host-app', async (event, appPath) => {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: use 'open' command
      await new Promise((resolve, reject) => {
        exec(`open "${appPath}"`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } else if (platform === 'win32') {
      // Windows: use 'start' command
      await new Promise((resolve, reject) => {
        exec(`start "" "${appPath}"`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } else {
      // Linux: run directly
      spawn(appPath, [], { detached: true, stdio: 'ignore' }).unref();
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if a host app is currently running
ipcMain.handle('mcp-check-host-app-running', async (event, appName) => {
  try {
    const platform = process.platform;
    let command;

    if (platform === 'darwin') {
      command = `pgrep -x "${appName}" || pgrep -f "${appName}.app"`;
    } else if (platform === 'win32') {
      command = `tasklist /FI "IMAGENAME eq ${appName}.exe"`;
    } else {
      command = `pgrep -x "${appName}"`;
    }

    const result = await new Promise((resolve) => {
      exec(command, (error, stdout) => {
        resolve({ running: !error && stdout.trim().length > 0 });
      });
    });

    return result;
  } catch (error) {
    return { running: false, error: error.message };
  }
});

// Clean up MCP connections on app quit
app.on('before-quit', async () => {
  // Stop all running servers
  for (const [serverId, entry] of runningServers) {
    try {
      entry.process.kill();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  runningServers.clear();

  await mcpClient.disconnectAll();

  // Clean up Codex SDK
  codexAbortMap.forEach(controller => controller.abort());
  codexAbortMap.clear();
  codexThreadMap.clear();
  codexClient = null;
});
