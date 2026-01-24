const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const Store = require('electron-store');
const { getExtendedPath } = require('./utils/path');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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
        args = ['-p', prompt];
      } else if (command === 'cursor') {
        resolve({
          success: false,
          stdout: '',
          stderr: 'Cursor is a code editor and does not support chat mode',
          error: 'Cursor is a code editor and does not support chat mode',
          code: 1
        });
        return;
      } else if (command === 'codex') {
        resolve({
          success: false,
          stdout: '',
          stderr: 'Codex requires an interactive terminal and cannot be used in non-interactive mode',
          error: 'Codex requires an interactive terminal and cannot be used in non-interactive mode',
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

        let errorMessage = null;
        if (killed) {
          errorMessage = 'Command timed out';
        } else if (code !== 0) {
          errorMessage = stderr && stderr.trim()
            ? `${stderr.trim()}`
            : `Process exited with code ${code}`;
        }

        resolve({
          success: code === 0 && !killed,
          stdout: stdout || '',
          stderr: stderr || '',
          error: errorMessage,
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
    });
  });
});
