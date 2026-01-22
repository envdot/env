const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const Store = require('electron-store');
const pty = require('node-pty');
const { getExtendedPath } = require('./utils/path');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false, // Don't show until ready
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the React app
  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, 'build', 'index.html')}`
    : 'http://localhost:3000';

  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in browser (for window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open external links in browser (for <a> tag clicks)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to localhost (dev) or file:// (production)
    if (url.startsWith('http://localhost') || url.startsWith('file://')) {
      return;
    }
    // Open all other URLs in external browser
    event.preventDefault();
    shell.openExternal(url);
  });

  // Handle new window requests (target="_blank" links)
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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

// AppleScript handler (for future use)
ipcMain.handle('run-applescript', (event, script) => {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
});

// ===== File System Handlers =====

// Read file contents
ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    return { success: true, content, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Write file contents
ipcMain.handle('fs-write-file', async (event, filePath, content) => {
  try {
    const absolutePath = path.resolve(filePath);
    await fs.promises.writeFile(absolutePath, content, 'utf-8');
    return { success: true, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List directory contents
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

// Check if file/directory exists
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

// Create directory
ipcMain.handle('fs-mkdir', async (event, dirPath) => {
  try {
    const absolutePath = path.resolve(dirPath);
    await fs.promises.mkdir(absolutePath, { recursive: true });
    return { success: true, path: absolutePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete file or directory
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

// Get file info
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

// Execute shell command
ipcMain.handle('shell-exec', async (event, command, options = {}) => {
  return new Promise((resolve) => {
    const opts = {
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
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

// Get current working directory
ipcMain.handle('shell-cwd', async () => {
  return { success: true, cwd: process.cwd() };
});

// Get home directory
ipcMain.handle('shell-home', async () => {
  return { success: true, home: require('os').homedir() };
});

// ===== CLI Chatbot Detection =====

// Detect available CLI chatbots
ipcMain.handle('detect-cli-chatbots', async () => {
  const chatbots = [];

  // List of CLI tools to check - dynamically detect any available
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
    'llm', // Simon Willison's LLM tool
    'sgpt', // Shell GPT
    'chatgpt',
    'ai',
  ];

  // Use centralized path utility
  const extendedPath = getExtendedPath();

  // Check each CLI tool
  for (const command of cliTools) {
    try {
      await new Promise((resolve) => {
        exec(`which ${command}`, {
          env: { ...process.env, PATH: extendedPath }
        }, (error, stdout) => {
          if (!error && stdout.trim()) {
            // Format the name nicely
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

// Execute CLI chatbot command using PTY
ipcMain.handle('cli-chatbot-exec', async (event, command, prompt, options = {}) => {
  return new Promise((resolve) => {
    const os = require('os');
    const homeDir = os.homedir();

    // Use centralized path utility
    const extendedPath = getExtendedPath();

    // Diagnostic logging (only in packaged app)
    const startTime = Date.now();
    if (app.isPackaged) {
      const logPath = path.join(homeDir, 'Desktop', 'cli-debug.log');
      const logMessage = `\n=== CLI Exec Debug ===\nTimestamp: ${new Date().toISOString()}\nCommand: ${command}\nPrompt: ${prompt}\nExtended PATH: ${extendedPath}\nPackaged: ${app.isPackaged}\n`;
      try {
        fs.appendFileSync(logPath, logMessage);
      } catch (e) {
        console.error('Failed to write debug log:', e);
      }
    }

    // First, find the full path to the command
    exec(`which ${command}`, {
      env: { ...process.env, PATH: extendedPath }
    }, (whichError, whichStdout) => {
      if (whichError || !whichStdout || !whichStdout.trim()) {
        if (app.isPackaged) {
          const logPath = path.join(homeDir, 'Desktop', 'cli-debug.log');
          const logMessage = `which error: ${whichError}\nwhich stdout: ${whichStdout}\n`;
          try {
            fs.appendFileSync(logPath, logMessage);
          } catch (e) {}
        }

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

      if (app.isPackaged) {
        const logPath = path.join(homeDir, 'Desktop', 'cli-debug.log');
        const logMessage = `Command path found: ${commandPath}\nExists: ${fs.existsSync(commandPath)}\n`;
        try {
          fs.appendFileSync(logPath, logMessage);
        } catch (e) {}
      }

      // Double-check the command path exists before spawning
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

      // Handle different CLI tools with their specific syntax
      let args = [];

      if (command === 'claude') {
        // Claude Code uses -p flag for non-interactive print mode
        // Use minimal flags - just -p and the prompt
        args = [
          '-p',
          prompt
        ];
      } else if (command === 'cursor') {
        // Cursor is an editor, not suitable for chat - skip
        resolve({
          success: false,
          stdout: '',
          stderr: 'Cursor is a code editor and does not support chat mode',
          error: 'Cursor is a code editor and does not support chat mode',
          code: 1
        });
        return;
      } else if (command === 'codex') {
        // Codex requires TTY (interactive terminal), not suitable for non-interactive use
        resolve({
          success: false,
          stdout: '',
          stderr: 'Codex requires an interactive terminal and cannot be used in non-interactive mode',
          error: 'Codex requires an interactive terminal and cannot be used in non-interactive mode',
          code: 1
        });
        return;
      } else if (command === 'aider') {
        // Aider uses --message flag
        args = ['--message', prompt, '--yes'];
      } else if (command === 'gemini') {
        // Gemini CLI might accept direct argument
        args = [prompt];
      } else {
        // For other tools, try direct argument
        args = [prompt];
      }

      // Check if the command is a Node.js script (has #!/usr/bin/env node shebang)
      let isNodeScript = false;
      try {
        const firstLine = fs.readFileSync(commandPath, 'utf8').split('\n')[0];
        isNodeScript = firstLine.includes('node');
      } catch (e) {
        // Not a text file, proceed normally
      }

      // For Node.js scripts, we need to explicitly use node to execute them
      let spawnCommand = commandPath;
      let spawnArgs = args;

      if (isNodeScript) {
        // Find node in the same directory as the script (for NVM installations)
        const nodeDir = path.dirname(commandPath);
        const nodePath = path.join(nodeDir, 'node');

        if (fs.existsSync(nodePath)) {
          spawnCommand = nodePath;
          spawnArgs = [commandPath, ...args];
        }
      }

      // Build the command string for execution
      let execCommand;
      if (isNodeScript && spawnCommand !== commandPath) {
        // For Node.js scripts, use: node script.js -p "prompt"
        execCommand = `"${spawnCommand}" "${commandPath}" ${spawnArgs.slice(1).map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')}`;
      } else {
        // For other commands, use: command -p "prompt"
        execCommand = `"${commandPath}" ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')}`;
      }

      const execStartTime = Date.now();
      if (app.isPackaged) {
        const logPath = path.join(homeDir, 'Desktop', 'cli-debug.log');
        const setupTime = execStartTime - startTime;
        const logMessage = `Executing command (setup took ${setupTime}ms):\n  ${execCommand}\n  cwd: ${homeDir}\n\nPOSSIBLE SLOWNESS REASONS:\n  1. First-time initialization - Claude Code may be initializing on first run\n  2. Loading config/settings - Check ~/.claude/ directory for large configs\n  3. Network requests - Claude Code might be checking for updates or validating API keys\n  4. MCP servers - If you have MCP servers configured, they initialize on startup\n  5. Tool loading - Even with --tools "" it may still load tool definitions\n  6. IDE detection - Claude Code scans for IDEs even with --no-chrome\n  7. Session management - Even with --no-session-persistence, some session logic runs\n  \nDEBUG SUGGESTIONS:\n  - Try running same command in terminal with 'time' to see actual execution time\n  - Check if ~/.claude/settings.json has complex configurations\n  - Try with minimal flags: just 'claude -p "prompt"' to see baseline speed\n  - Check if API key validation is happening (network delay)\n\n`;
        try {
          fs.appendFileSync(logPath, logMessage);
        } catch (e) {}
      }

      // Tools that require a real TTY (pseudo-terminal)
      const needsPty = ['codex'];
      const execTimeout = command === 'claude' ? 300000 : (options.timeout || 120000);
      
      if (needsPty.includes(command)) {
        // === PTY PATH for tools that require TTY ===
        let ptyCmd, ptyArgsFinal;
        if (isNodeScript && spawnCommand !== commandPath) {
          ptyCmd = spawnCommand;
          ptyArgsFinal = [commandPath, ...args];
        } else {
          ptyCmd = commandPath;
          ptyArgsFinal = args;
        }
        
        let stdout = '';
        let killed = false;
        
        const ptyProcess = pty.spawn(ptyCmd, ptyArgsFinal, {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          cwd: homeDir,
          env: { ...process.env, PATH: extendedPath, HOME: homeDir }
        });
        
        const timeoutId = setTimeout(() => {
          killed = true;
          ptyProcess.kill();
        }, execTimeout);
        
        ptyProcess.onData((data) => {
          stdout += data;
        });
        
        ptyProcess.onExit(({ exitCode }) => {
          clearTimeout(timeoutId);
          const execEndTime = Date.now();
          const executionTime = execEndTime - execStartTime;
          
          if (app.isPackaged) {
            const logPath = path.join(homeDir, 'Desktop', 'cli-debug.log');
            const logMessage = `PTY Command completed:
  Execution time: ${executionTime}ms
  exitCode: ${exitCode}
  stdout length: ${stdout.length}
  killed: ${killed}
`;
            try { fs.appendFileSync(logPath, logMessage); } catch (e) {}
          }
          
          // Clean ANSI escape codes from output
          const cleanOutput = stdout.replace(/[[0-9;]*[a-zA-Z]/g, '').replace(/][^]*/g, '');
          
          resolve({
            success: exitCode === 0 && !killed,
            stdout: cleanOutput || '',
            stderr: '',
            error: killed ? 'Command timed out' : (exitCode !== 0 ? `Process exited with code ${exitCode}` : null),
            code: killed ? 143 : exitCode
          });
        });
        
      } else {
        // === SPAWN PATH for tools that work without TTY (like Claude) ===
        let spawnCmd, spawnArgsFinal;
        if (isNodeScript && spawnCommand !== commandPath) {
          spawnCmd = spawnCommand;
          spawnArgsFinal = [commandPath, ...args];
        } else {
          spawnCmd = commandPath;
          spawnArgsFinal = args;
        }
        
        const childProcess = spawn(spawnCmd, spawnArgsFinal, {
          cwd: homeDir,
          env: { 
            ...process.env, 
            PATH: extendedPath, 
            HOME: homeDir,
            TERM: 'dumb',
            NO_COLOR: '1',
            CI: 'true',
            FORCE_COLOR: '0'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        childProcess.stdin.end();
        
        let stdout = '';
        let stderr = '';
        let killed = false;
        
        const timeoutId = setTimeout(() => {
          killed = true;
          childProcess.kill('SIGTERM');
        }, execTimeout);
        
        childProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        childProcess.on('close', (code) => {
          clearTimeout(timeoutId);
          const execEndTime = Date.now();
          const executionTime = execEndTime - execStartTime;
          
          if (app.isPackaged) {
            const logPath = path.join(homeDir, 'Desktop', 'cli-debug.log');
            const logMessage = `Spawn Command completed:
  Execution time: ${executionTime}ms
  exitCode: ${code}
  stdout length: ${stdout.length}
  killed: ${killed}
`;
            try { fs.appendFileSync(logPath, logMessage); } catch (e) {}
          }
          
          resolve({
            success: code === 0 && !killed,
            stdout: stdout || '',
            stderr: stderr || '',
            error: killed ? 'Command timed out' : (code !== 0 ? `Process exited with code ${code}` : null),
            code: killed ? 143 : code
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
      }
    });
  });
});