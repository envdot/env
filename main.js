const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { exec, spawn } = require('child_process');
const Store = require('electron-store');
const { getExtendedPath } = require('./utils/path');
const MCPClient = require('./mcp-client');
const OAuthManager = require('./oauth-manager');
const net = require('net');

const store = new Store();
const mcpClient = new MCPClient();
const oauthManager = new OAuthManager(store);

// Wire up token refresh callback
mcpClient.onTokenRefresh = async (serverId) => {
  const tokens = oauthManager.getStoredTokens(serverId);
  if (!tokens?.refresh_token) return null;
  const metadata = oauthManager.getStoredMetadata(serverId);
  if (!metadata) return null;
  const authOrigin = new URL(metadata.authorizationEndpoint).origin;
  const reg = oauthManager.getClientRegistration(authOrigin);
  const clientId = reg?.client_id || 'env-desktop';
  try {
    const newTokens = await oauthManager.refreshToken(metadata, clientId, tokens.refresh_token);
    oauthManager.storeTokens(serverId, newTokens);
    return newTokens.access_token;
  } catch (e) {
    console.error('[OAuth] Token refresh failed:', e.message);
    oauthManager.clearTokens(serverId);
    return null;
  }
};

function cliLog(msg) {
  console.log(`[CLI] ${msg}`);
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

// Register custom protocol for deep linking (Stripe checkout callbacks)
if (process.defaultApp) {
  app.setAsDefaultProtocolClient('env-desktop', process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient('env-desktop');
}

// Handle deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('[DeepLink] Received:', url);
  if (url.includes('billing')) {
    // Notify renderer to refresh subscription data
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('billing-updated');
      mainWindow.focus();
    }
  }
});

app.whenReady().then(() => {
  createWindow();

  // Auto-reconnect MCP servers that have stored OAuth tokens (after window loads)
  mainWindow.webContents.on('did-finish-load', async () => {
    const storedTokens = store.get('oauth.tokens') || {};
    const storedMetadata = store.get('oauth.metadata') || {};
    for (const [serverId, tokens] of Object.entries(storedTokens)) {
      if (tokens?.access_token) {
        const meta = storedMetadata[serverId];
        // Use the stored serverUrl (set during authorize), falling back to resource field
        let url = meta?.serverUrl || meta?.resource || null;
        if (!url) {
          console.log(`[MCP] Skipping auto-reconnect for ${serverId}: no URL in metadata`);
          continue;
        }
        // Notion and other servers require the /mcp path — if resource URL doesn't include it, append it
        // This handles the case where metadata was stored before we added serverUrl
        if (url.includes('mcp.notion.com') && !url.endsWith('/mcp')) {
          url = url.replace(/\/?$/, '/mcp');
        }
        console.log(`[MCP] Auto-reconnecting ${serverId} at ${url}...`);
        try {
          const result = await mcpClient.connectHttp(serverId, url, { authToken: tokens.access_token });
          if (result.success) {
            console.log(`[MCP] Auto-reconnected ${serverId}`);
            try {
              const toolsResult = await mcpClient.listTools(serverId);
              mainWindow.webContents.send('mcp-auto-connected', {
                serverId,
                tools: toolsResult.tools || [],
              });
            } catch (e) {
              console.error(`[MCP] Auto-reconnect listTools failed for ${serverId}:`, e.message);
              // Still notify renderer that connection exists (without tools)
              mainWindow.webContents.send('mcp-auto-connected', { serverId, tools: [] });
            }
          } else {
            console.log(`[MCP] Auto-reconnect failed for ${serverId}:`, result.error);
          }
        } catch (e) {
          console.error(`[MCP] Auto-reconnect error for ${serverId}:`, e.message);
        }
      }
    }
  });
});

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

// ===== File Viewer Handler =====
// Opens files in the browser panel — native formats direct, code/CSV/JSON/text via HTML wrapper

const NATIVE_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif',
  // Video
  'mp4', 'webm', 'ogg', 'mov',
  // Audio
  'mp3', 'wav', 'flac', 'aac', 'm4a',
  // PDF
  'pdf',
  // HTML
  'html', 'htm',
]);

const CODE_EXTENSIONS = {
  'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
  'py': 'python', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'java': 'java',
  'c': 'c', 'cpp': 'cpp', 'h': 'c', 'hpp': 'cpp', 'cs': 'csharp',
  'swift': 'swift', 'kt': 'kotlin', 'scala': 'scala', 'r': 'r',
  'php': 'php', 'lua': 'lua', 'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
  'sql': 'sql', 'yaml': 'yaml', 'yml': 'yaml', 'toml': 'toml',
  'xml': 'xml', 'graphql': 'graphql', 'proto': 'protobuf',
  'dockerfile': 'dockerfile', 'makefile': 'makefile',
  'css': 'css', 'scss': 'scss', 'less': 'less', 'sass': 'sass',
  'vue': 'xml', 'svelte': 'xml', 'astro': 'xml',
};

// Temp files created for viewer wrappers — cleaned up on quit
const viewerTempFiles = [];

function generateCodeViewerHTML(content, language, filePath) {
  const fileName = path.basename(filePath);
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${fileName}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1e1e; color: #d4d4d4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .viewer-header { background: #252526; padding: 8px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #333;
    display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
  .viewer-header .file-name { color: #ccc; font-weight: 500; }
  .viewer-header .file-lang { color: #666; margin-left: 8px; }
  pre { padding: 16px; overflow: auto; font-size: 13px; line-height: 1.5; }
  code { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
  .hljs { background: #1e1e1e !important; }
</style></head><body>
<div class="viewer-header">
  <span><span class="file-name">${fileName}</span><span class="file-lang">${language}</span></span>
  <span style="color:#555">${content.split('\n').length} lines</span>
</div>
<pre><code class="language-${language}">${escapedContent}</code></pre>
<script>hljs.highlightAll();<\/script>
</body></html>`;
}

function generateCsvViewerHTML(content, filePath) {
  const fileName = path.basename(filePath);
  // Escape for embedding in JS string
  const escapedForJS = JSON.stringify(content);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${fileName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1e1e; color: #d4d4d4; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; }
  .viewer-header { background: #252526; padding: 8px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #333;
    display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
  .viewer-header .file-name { color: #ccc; font-weight: 500; }
  .toolbar { background: #252526; padding: 6px 16px; border-bottom: 1px solid #333; display: flex; gap: 12px; align-items: center; position: sticky; top: 33px; z-index: 9; }
  .toolbar input { background: #3c3c3c; border: 1px solid #555; color: #ddd; padding: 4px 8px; border-radius: 4px; font-size: 12px; width: 200px; }
  .toolbar .count { color: #666; font-size: 11px; }
  .table-wrap { overflow: auto; max-height: calc(100vh - 70px); }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2d2d2d; color: #ccc; padding: 6px 12px; text-align: left; border-bottom: 1px solid #444;
    position: sticky; top: 0; cursor: pointer; user-select: none; white-space: nowrap; font-weight: 500; font-size: 12px; }
  th:hover { background: #383838; }
  td { padding: 4px 12px; border-bottom: 1px solid #2a2a2a; white-space: nowrap; max-width: 400px; overflow: hidden; text-overflow: ellipsis; }
  tr:hover td { background: #2a2d2e; }
  .row-num { color: #555; width: 40px; text-align: right; font-size: 11px; }
  .sort-arrow { margin-left: 4px; color: #888; }
</style></head><body>
<div class="viewer-header"><span class="file-name">${fileName}</span></div>
<div class="toolbar">
  <input id="search" placeholder="Filter rows..." oninput="filterRows()">
  <span class="count" id="count"></span>
</div>
<div class="table-wrap"><table><thead id="thead"></thead><tbody id="tbody"></tbody></table></div>
<script>
const raw = ${escapedForJS};
const lines = raw.trim().split('\\n').filter(l => l.trim());
const parse = l => l.split(',').map(c => c.trim());
const headers = lines.length > 0 ? parse(lines[0]) : [];
const rows = lines.slice(1).map((l, i) => ({ idx: i, cells: parse(l) }));
let sortCol = null, sortAsc = true, filtered = rows;

function render() {
  const sorted = sortCol !== null ? [...filtered].sort((a, b) => {
    const av = a.cells[sortCol] || '', bv = b.cells[sortCol] || '';
    const an = Number(av.replace(/,/g, '')), bn = Number(bv.replace(/,/g, ''));
    if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an;
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  }) : filtered;
  document.getElementById('thead').innerHTML = '<tr><th class="row-num">#</th>' +
    headers.map((h, i) => '<th onclick="sort(' + i + ')">' + h +
      (sortCol === i ? '<span class="sort-arrow">' + (sortAsc ? '\\u2191' : '\\u2193') + '</span>' : '') + '</th>').join('') + '</tr>';
  document.getElementById('tbody').innerHTML = sorted.map(r =>
    '<tr><td class="row-num">' + (r.idx + 1) + '</td>' + r.cells.map(c => '<td>' + c + '</td>').join('') + '</tr>'
  ).join('');
  document.getElementById('count').textContent = filtered.length + ' rows';
}
function sort(i) { if (sortCol === i) sortAsc = !sortAsc; else { sortCol = i; sortAsc = true; } render(); }
function filterRows() {
  const s = document.getElementById('search').value.toLowerCase();
  filtered = s ? rows.filter(r => r.cells.some(c => c.toLowerCase().includes(s))) : rows;
  render();
}
render();
<\/script>
</body></html>`;
}

function generateJsonViewerHTML(content, filePath) {
  const fileName = path.basename(filePath);
  const escapedForJS = JSON.stringify(content);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${fileName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1e1e; color: #d4d4d4; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.5; }
  .viewer-header { background: #252526; padding: 8px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #333;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif; position: sticky; top: 0; z-index: 10; }
  .viewer-header .file-name { color: #ccc; font-weight: 500; }
  #tree { padding: 16px; }
  .json-key { color: #9cdcfe; }
  .json-str { color: #ce9178; }
  .json-num { color: #b5cea8; }
  .json-bool { color: #569cd6; }
  .json-null { color: #569cd6; font-style: italic; }
  .json-bracket { color: #ffd700; cursor: pointer; }
  .json-toggle { cursor: pointer; user-select: none; }
  .json-toggle:hover { text-decoration: underline; }
  .collapsed > .json-children { display: none; }
  .collapsed > .json-toggle::before { content: '\\25B6 '; font-size: 10px; }
  :not(.collapsed) > .json-toggle::before { content: '\\25BC '; font-size: 10px; }
  .json-children { margin-left: 20px; }
  .json-line { padding: 1px 0; }
</style></head><body>
<div class="viewer-header"><span class="file-name">${fileName}</span></div>
<div id="tree"></div>
<script>
const raw = ${escapedForJS};
let data;
try { data = JSON.parse(raw); } catch(e) { document.getElementById('tree').textContent = raw; }
function renderVal(val, depth) {
  if (val === null) return '<span class="json-null">null</span>';
  if (typeof val === 'boolean') return '<span class="json-bool">' + val + '</span>';
  if (typeof val === 'number') return '<span class="json-num">' + val + '</span>';
  if (typeof val === 'string') return '<span class="json-str">"' + val.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"</span>';
  if (Array.isArray(val)) {
    if (val.length === 0) return '<span class="json-bracket">[]</span>';
    const id = 'n' + Math.random().toString(36).substr(2,6);
    let h = '<span id="'+id+'"><span class="json-toggle" onclick="this.parentElement.classList.toggle(\\'collapsed\\')"><span class="json-bracket">[</span></span>';
    h += '<span class="json-children">';
    val.forEach((v, i) => { h += '<div class="json-line">' + renderVal(v, depth+1) + (i < val.length-1 ? ',' : '') + '</div>'; });
    h += '</span><span class="json-bracket">]</span></span>';
    return h;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '<span class="json-bracket">{}</span>';
    const id = 'n' + Math.random().toString(36).substr(2,6);
    let h = '<span id="'+id+'"' + (depth > 2 ? ' class="collapsed"' : '') + '><span class="json-toggle" onclick="this.parentElement.classList.toggle(\\'collapsed\\')"><span class="json-bracket">{</span></span>';
    h += '<span class="json-children">';
    keys.forEach((k, i) => { h += '<div class="json-line"><span class="json-key">"' + k + '"</span>: ' + renderVal(val[k], depth+1) + (i < keys.length-1 ? ',' : '') + '</div>'; });
    h += '</span><span class="json-bracket">}</span></span>';
    return h;
  }
  return String(val);
}
if (data !== undefined) document.getElementById('tree').innerHTML = renderVal(data, 0);
<\/script>
</body></html>`;
}

function generateTextViewerHTML(content, filePath) {
  const fileName = path.basename(filePath);
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${fileName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1e1e; color: #d4d4d4; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .viewer-header { background: #252526; padding: 8px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #333;
    position: sticky; top: 0; z-index: 10; }
  .viewer-header .file-name { color: #ccc; font-weight: 500; }
  pre { padding: 16px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
</style></head><body>
<div class="viewer-header">
  <span class="file-name">${fileName}</span>
  <span style="color:#555; margin-left: 8px;">${content.split('\n').length} lines</span>
</div>
<pre>${escapedContent}</pre>
</body></html>`;
}

function generateMarkdownViewerHTML(content, filePath) {
  const fileName = path.basename(filePath);
  const escapedForJS = JSON.stringify(content);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1e1e; color: #d4d4d4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; }
  .viewer-header { background: #252526; padding: 8px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #333;
    position: sticky; top: 0; z-index: 10; }
  .viewer-header .file-name { color: #ccc; font-weight: 500; }
  #content { padding: 24px 32px; max-width: 800px; }
  h1, h2, h3, h4, h5, h6 { color: #fff; margin-top: 1.2em; margin-bottom: 0.4em; }
  h1 { font-size: 1.8em; border-bottom: 1px solid #333; padding-bottom: 0.3em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid #333; padding-bottom: 0.2em; }
  a { color: #4fc1ff; }
  code { background: #2d2d2d; padding: 2px 6px; border-radius: 3px; font-family: 'SF Mono', monospace; font-size: 0.9em; }
  pre { background: #2d2d2d; padding: 12px 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #555; padding-left: 12px; color: #aaa; margin: 12px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  table { border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #444; padding: 6px 12px; }
  th { background: #2d2d2d; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #444; margin: 16px 0; }
</style></head><body>
<div class="viewer-header"><span class="file-name">${fileName}</span></div>
<div id="content"></div>
<script>
marked.setOptions({ highlight: (code, lang) => { try { return hljs.highlight(code, { language: lang || 'plaintext' }).value; } catch(e) { return code; } } });
document.getElementById('content').innerHTML = marked.parse(${escapedForJS});
<\/script>
</body></html>`;
}

ipcMain.handle('open-file-in-viewer', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);

    // Check file exists
    await fs.promises.access(absolutePath);

    const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
    const baseName = path.basename(absolutePath).toLowerCase();

    // Native formats — return file:// URL directly
    if (NATIVE_EXTENSIONS.has(ext)) {
      return { success: true, url: `file://${absolutePath}`, type: 'native' };
    }

    // For text-based files, read the content and generate an HTML wrapper
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    const os = require('os');
    const tmpDir = os.tmpdir();
    let htmlContent;
    let viewerType;

    if (ext === 'csv' || ext === 'tsv') {
      htmlContent = generateCsvViewerHTML(content, absolutePath);
      viewerType = 'csv';
    } else if (ext === 'json' || ext === 'jsonl') {
      htmlContent = generateJsonViewerHTML(content, absolutePath);
      viewerType = 'json';
    } else if (ext === 'md' || ext === 'markdown') {
      htmlContent = generateMarkdownViewerHTML(content, absolutePath);
      viewerType = 'markdown';
    } else if (CODE_EXTENSIONS[ext] || CODE_EXTENSIONS[baseName]) {
      const language = CODE_EXTENSIONS[ext] || CODE_EXTENSIONS[baseName] || 'plaintext';
      htmlContent = generateCodeViewerHTML(content, language, absolutePath);
      viewerType = 'code';
    } else {
      // Default: plain text viewer
      htmlContent = generateTextViewerHTML(content, absolutePath);
      viewerType = 'text';
    }

    // Write to temp file
    const tmpFile = path.join(tmpDir, `env-viewer-${Date.now()}-${path.basename(absolutePath)}.html`);
    await fs.promises.writeFile(tmpFile, htmlContent, 'utf-8');
    viewerTempFiles.push(tmpFile);

    return { success: true, url: `file://${tmpFile}`, type: viewerType };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== File System Handlers =====

ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.promises.stat(absolutePath);
    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (stats.size > maxSize) {
      return { success: false, error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)} MB). Max: 50 MB.` };
    }
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
    const extendedPath = getExtendedPath();
    const opts = {
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 10,
      shell: true,
      env: { ...process.env, PATH: extendedPath, HOME: os.homedir() }
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

// Streaming shell exec - sends stdout/stderr lines as events
ipcMain.handle('shell-exec-stream', async (event, command, options = {}) => {
  const id = `stream-${Date.now()}`;
  const extendedPath = getExtendedPath();
  const child = spawn('sh', ['-c', command], {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, PATH: extendedPath, HOME: os.homedir(), ...options.env },
    shell: false
  });

  child.stdout.on('data', (data) => {
    event.sender.send('shell-stream-data', { id, type: 'stdout', data: data.toString() });
  });

  child.stderr.on('data', (data) => {
    event.sender.send('shell-stream-data', { id, type: 'stderr', data: data.toString() });
  });

  child.on('close', (code) => {
    event.sender.send('shell-stream-data', { id, type: 'exit', code });
  });

  child.on('error', (err) => {
    event.sender.send('shell-stream-data', { id, type: 'error', data: err.message });
  });

  return { id };
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
        let appendPrompt = 'You are running in non-interactive print mode. Critical rules: 1) When fetching data from multiple URLs, write/append results to a file (CSV, JSON) IMMEDIATELY after each fetch using the Write or Bash tool — never hold large amounts of scraped data in context. 2) On follow-up messages in a resumed session, read data from files you already created rather than re-fetching URLs. 3) Never use the Task tool — sub-agents do not work in this mode. 4) When the user asks to list or display data, ALWAYS show ALL rows — never truncate or summarize. 5) For large datasets (50+ rows), display them in a csv code block (```csv), NOT a markdown table — code blocks render much faster.';

        // Planning mode: add instruction to think deeply before acting
        if (options.planningMode) {
          appendPrompt += ' PLANNING MODE IS ACTIVE: You must think deeply and plan thoroughly before taking any action. Start your response with a detailed plan inside <planning>...</planning> tags. In the plan: analyze the problem, consider multiple approaches, identify risks and edge cases, outline your step-by-step strategy, then explain which approach you chose and why. Only after the plan, proceed with implementation. Be extra thorough and methodical.';
        }

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
    } else if (config.transport === 'http' || config.transport === 'sse') {
      const result = await mcpClient.connectHttp(serverId, config.url, {
        authToken: config.authToken || null,
      });
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

// ── OAuth for MCP Web Servers ─────────────────────────────────────────────────

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// Track in-progress OAuth flows to prevent duplicate authorization windows
const pendingOAuthFlows = new Map();

// Full OAuth 2.1 authorization flow with BrowserWindow
ipcMain.handle('mcp-oauth-authorize', async (event, { serverId, mcpServerUrl }) => {
  // If there's already a pending OAuth flow for this server, wait for it
  if (pendingOAuthFlows.has(serverId)) {
    console.log(`[OAuth] Reusing existing authorization flow for ${serverId}`);
    return pendingOAuthFlows.get(serverId);
  }

  const flowPromise = (async () => {
  try {
    // Step 1: Discover auth metadata
    console.log(`[OAuth] Starting authorization for ${serverId} at ${mcpServerUrl}`);
    let metadata = oauthManager.getStoredMetadata(serverId);
    if (!metadata) {
      metadata = await oauthManager.discoverAuth(mcpServerUrl);
      if (!metadata) {
        return { success: false, error: 'OAuth discovery failed — server may not support remote auth' };
      }
    }
    // Always store/update the actual server URL for auto-reconnect
    if (!metadata.serverUrl) {
      metadata.serverUrl = mcpServerUrl;
    }
    oauthManager.storeMetadata(serverId, metadata);
    console.log('[OAuth] Metadata:', { authEndpoint: metadata.authorizationEndpoint, tokenEndpoint: metadata.tokenEndpoint, hasRegistration: !!metadata.registrationEndpoint, serverUrl: metadata.serverUrl || mcpServerUrl });

    // Step 2: Use a fixed callback port so redirect URI is consistent across attempts
    // Try the fixed port first, fall back to a free port if it's taken
    let callbackPort;
    try {
      const server = net.createServer();
      await new Promise((res, rej) => {
        server.once('error', rej);
        server.listen(17365, '127.0.0.1', () => { server.close(); res(); });
      });
      callbackPort = 17365;
    } catch (_) {
      callbackPort = await findFreePort();
    }
    const redirectUri = `http://127.0.0.1:${callbackPort}/oauth/callback`;

    // Step 3: Get or register client (always re-register if redirect URI changed)
    const authOrigin = new URL(metadata.authorizationEndpoint).origin;
    let registration = oauthManager.getClientRegistration(authOrigin);
    const storedRedirect = registration?.redirect_uris?.[0];
    console.log('[OAuth] Registration check:', {
      authOrigin,
      hasStoredReg: !!registration,
      storedClientId: registration?.client_id,
      storedRedirect,
      currentRedirect: redirectUri,
      hasRegEndpoint: !!metadata.registrationEndpoint,
    });
    if (metadata.registrationEndpoint && (!registration || storedRedirect !== redirectUri)) {
      const newReg = await oauthManager.registerClient(metadata, redirectUri);
      if (newReg) {
        registration = newReg;
        // Store the redirect URI alongside the registration for future comparison
        registration.redirect_uris = [redirectUri];
        oauthManager.storeClientRegistration(authOrigin, registration);
      } else {
        console.error('[OAuth] Dynamic client registration failed for', metadata.registrationEndpoint);
      }
    }
    const clientId = registration?.client_id;
    if (!clientId) {
      return { success: false, error: `Client registration was rejected by the server. This service may restrict access to approved apps only (e.g. Figma requires approved MCP clients). Try using a local/desktop connector instead.` };
    }
    console.log('[OAuth] Using client ID:', clientId);

    // Step 4: Generate PKCE
    const pkce = oauthManager.generatePKCE();

    // Step 5: Build auth URL
    const { url: authUrl, state } = oauthManager.buildAuthUrl(
      metadata, clientId, pkce, redirectUri, metadata.scopesSupported
    );

    // Step 6: Open BrowserWindow + callback server
    return new Promise((resolve) => {
      let resolved = false;
      const done = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      const http = require('http');
      const callbackServer = http.createServer(async (req, res) => {
        const reqUrl = new URL(req.url, `http://127.0.0.1:${callbackPort}`);
        if (reqUrl.pathname !== '/oauth/callback') {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = reqUrl.searchParams.get('code');
        const returnedState = reqUrl.searchParams.get('state');
        const error = reqUrl.searchParams.get('error');

        console.log('[OAuth] Callback received:', { hasCode: !!code, hasState: !!returnedState, error });

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px"><h2>Authorization successful</h2><p>You can close this tab and return to Env.</p><script>setTimeout(()=>window.close(),1500)</script></body></html>');

        callbackServer.close();

        if (error) {
          done({ success: false, error: `OAuth error: ${error}` });
          return;
        }

        if (returnedState !== state) {
          done({ success: false, error: 'OAuth state mismatch' });
          return;
        }

        try {
          const tokens = await oauthManager.exchangeCode(metadata, clientId, code, pkce.codeVerifier, redirectUri);
          oauthManager.storeTokens(serverId, tokens);
          done({ success: true, tokens: { access_token: tokens.access_token } });
        } catch (err) {
          done({ success: false, error: `Token exchange failed: ${err.message}` });
        }
      });

      callbackServer.on('error', (err) => {
        console.error('[OAuth] Callback server error:', err);
        done({ success: false, error: `Callback server error: ${err.message}` });
      });

      callbackServer.listen(callbackPort, '127.0.0.1', () => {
        console.log(`[OAuth] Callback server listening on port ${callbackPort}`);
      });

      // Open in the user's default browser — activate: false avoids Chrome stealing focus
      console.log('[OAuth] Opening auth URL in default browser:', authUrl.substring(0, 120) + '...');
      shell.openExternal(authUrl, { activate: false });

      // 5-minute timeout
      setTimeout(() => {
        callbackServer.close();
        done({ success: false, error: 'Authorization timeout (5 min)' });
      }, 300000);
    });
  } catch (error) {
    console.error('[OAuth] Authorization failed:', error);
    return { success: false, error: error.message };
  }
  })();

  pendingOAuthFlows.set(serverId, flowPromise);
  try {
    return await flowPromise;
  } finally {
    pendingOAuthFlows.delete(serverId);
  }
});

// Get stored OAuth token for a server
ipcMain.handle('mcp-oauth-get-token', async (event, serverId) => {
  const tokens = oauthManager.getStoredTokens(serverId);
  if (!tokens) return null;
  if (oauthManager.isTokenExpired(tokens)) {
    // Try refresh
    const metadata = oauthManager.getStoredMetadata(serverId);
    if (metadata && tokens.refresh_token) {
      const authOrigin = new URL(metadata.authorizationEndpoint).origin;
      const reg = oauthManager.getClientRegistration(authOrigin);
      const clientId = reg?.client_id || 'env-desktop';
      try {
        const newTokens = await oauthManager.refreshToken(metadata, clientId, tokens.refresh_token);
        oauthManager.storeTokens(serverId, newTokens);
        return oauthManager.getStoredTokens(serverId);
      } catch (e) {
        oauthManager.clearTokens(serverId);
        return null;
      }
    }
    oauthManager.clearTokens(serverId);
    return null;
  }
  return tokens;
});

// Clear stored OAuth token and metadata (forces full re-auth)
ipcMain.handle('mcp-oauth-clear-token', async (event, serverId) => {
  oauthManager.clearTokens(serverId);
  // Also clear metadata so fresh discovery happens on next authorize
  store.delete(`oauth.metadata.${serverId}`);
  return { success: true };
});

// Refresh OAuth token
ipcMain.handle('mcp-oauth-refresh', async (event, serverId) => {
  const tokens = oauthManager.getStoredTokens(serverId);
  if (!tokens?.refresh_token) return { success: false, error: 'No refresh token' };
  const metadata = oauthManager.getStoredMetadata(serverId);
  if (!metadata) return { success: false, error: 'No stored metadata' };
  const authOrigin = new URL(metadata.authorizationEndpoint).origin;
  const reg = oauthManager.getClientRegistration(authOrigin);
  const clientId = reg?.client_id || 'env-desktop';
  try {
    const newTokens = await oauthManager.refreshToken(metadata, clientId, tokens.refresh_token);
    oauthManager.storeTokens(serverId, newTokens);
    return { success: true, tokens: { access_token: newTokens.access_token } };
  } catch (e) {
    oauthManager.clearTokens(serverId);
    return { success: false, error: e.message };
  }
});

// ── Open External URL ────────────────────────────────────────────────────────

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// ── Supabase OAuth (for Google/GitHub login in Electron) ─────────────────────

ipcMain.handle('supabase-oauth', async (event, { url }) => {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const http = require('http');
    const callbackServer = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${callbackPort}`);
      if (reqUrl.pathname !== '/auth/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      // Supabase sends tokens as hash fragments, but we can capture the full URL
      // Serve a page that extracts hash params and sends them back as query params
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="font-family:system-ui;text-align:center;padding:60px">
        <h2>Signing you in...</h2>
        <p>You can close this tab and return to Env.</p>
        <script>
          // Supabase puts tokens in the hash fragment
          const hash = window.location.hash.substring(1);
          if (hash) {
            fetch('/auth/tokens?' + hash).then(() => window.close());
          } else {
            // Tokens might be in query params (code flow)
            const params = window.location.search;
            if (params) {
              fetch('/auth/tokens' + params).then(() => window.close());
            }
          }
          setTimeout(() => window.close(), 3000);
        </script>
      </body></html>`);
    });

    // Second request receives the actual tokens
    const tokenServer = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${callbackPort}`);
      if (reqUrl.pathname === '/auth/tokens') {
        const accessToken = reqUrl.searchParams.get('access_token');
        const refreshToken = reqUrl.searchParams.get('refresh_token');
        res.writeHead(200);
        res.end('ok');
        callbackServer.close();
        done({ success: true, access_token: accessToken, refresh_token: refreshToken });
        return;
      }
    });

    // Combine both handlers into one server
    const combinedServer = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${callbackPort}`);

      if (reqUrl.pathname === '/auth/callback') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="font-family:system-ui;text-align:center;padding:60px;background:#0a0a0a;color:#fafafa">
          <h2>Signing you in...</h2>
          <p>You can close this tab and return to Env.</p>
          <script>
            const hash = window.location.hash.substring(1);
            if (hash) {
              fetch('/auth/tokens?' + hash).then(() => setTimeout(()=>window.close(),500));
            } else {
              const params = window.location.search.substring(1);
              if (params) {
                fetch('/auth/tokens?' + params).then(() => setTimeout(()=>window.close(),500));
              }
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body></html>`);
      } else if (reqUrl.pathname === '/auth/tokens') {
        const accessToken = reqUrl.searchParams.get('access_token');
        const refreshToken = reqUrl.searchParams.get('refresh_token');
        res.writeHead(200);
        res.end('ok');
        combinedServer.close();
        done({ success: true, access_token: accessToken, refresh_token: refreshToken });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Find a port
    let callbackPort;
    const findPort = async () => {
      try {
        const server = net.createServer();
        await new Promise((res, rej) => {
          server.once('error', rej);
          server.listen(17366, '127.0.0.1', () => { server.close(); res(); });
        });
        return 17366;
      } catch (_) {
        return await new Promise((res) => {
          const s = net.createServer();
          s.listen(0, '127.0.0.1', () => {
            const port = s.address().port;
            s.close(() => res(port));
          });
        });
      }
    };

    findPort().then((port) => {
      callbackPort = port;
      combinedServer.listen(callbackPort, '127.0.0.1', () => {
        console.log(`[SupabaseOAuth] Callback server on port ${callbackPort}`);
        // Replace the callback URL in the auth URL
        const authUrl = url.replace(/redirect_to=[^&]*/, `redirect_to=${encodeURIComponent(`http://127.0.0.1:${callbackPort}/auth/callback`)}`);
        shell.openExternal(authUrl, { activate: false });
      });

      // 5-minute timeout
      setTimeout(() => {
        combinedServer.close();
        done({ success: false, error: 'OAuth timeout' });
      }, 300000);
    });

    combinedServer.on('error', (err) => {
      done({ success: false, error: err.message });
    });
  });
});

// ── Chrome Profile Import ────────────────────────────────────────────────────

const CHROME_BASE = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');

// List available Chrome profiles
ipcMain.handle('chrome-profile-list', async () => {
  try {
    if (!fs.existsSync(CHROME_BASE)) {
      return { success: false, error: 'Chrome data directory not found' };
    }
    const entries = fs.readdirSync(CHROME_BASE, { withFileTypes: true });
    const profiles = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirName = entry.name;
      // Chrome profiles live in "Default", "Profile 1", "Profile 2", etc.
      if (dirName !== 'Default' && !dirName.startsWith('Profile ')) continue;
      const profilePath = path.join(CHROME_BASE, dirName);
      const historyFile = path.join(profilePath, 'History');
      if (!fs.existsSync(historyFile)) continue;
      let displayName = dirName;
      try {
        const prefs = JSON.parse(fs.readFileSync(path.join(profilePath, 'Preferences'), 'utf8'));
        if (prefs.profile && prefs.profile.name) displayName = prefs.profile.name;
      } catch (e) { /* use dirName as fallback */ }
      profiles.push({ dirName, displayName, path: profilePath });
    }
    return { success: true, profiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper: copy a Chrome SQLite file to temp (Chrome locks files while running)
function copyToTemp(srcPath, label) {
  const tmpDir = path.join(os.tmpdir(), 'env-chrome-import');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${label}_${Date.now()}`);
  fs.copyFileSync(srcPath, tmpFile);
  // Also copy WAL/SHM if they exist (for consistency)
  if (fs.existsSync(srcPath + '-wal')) fs.copyFileSync(srcPath + '-wal', tmpFile + '-wal');
  if (fs.existsSync(srcPath + '-shm')) fs.copyFileSync(srcPath + '-shm', tmpFile + '-shm');
  return tmpFile;
}

// Helper: open a SQLite file with sql.js
async function openSqlite(filePath) {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(filePath);
  return new SQL.Database(buffer);
}

// Helper: convert Chrome timestamp (microseconds since 1601-01-01) to ISO string
function chromeTimeToISO(chromeTime) {
  if (!chromeTime || chromeTime === 0) return null;
  // Chrome epoch offset from Unix epoch in microseconds
  const chromeEpochOffset = 11644473600000000n;
  const unixMicro = BigInt(chromeTime) - chromeEpochOffset;
  const unixMs = Number(unixMicro / 1000n);
  return new Date(unixMs).toISOString();
}

// Helper: decrypt Chrome password (macOS)
function decryptChromePassword(encryptedValue, derivedKey) {
  if (!encryptedValue || encryptedValue.length === 0) return '';
  const buf = Buffer.isBuffer(encryptedValue) ? encryptedValue : Buffer.from(encryptedValue);
  // v10 prefix indicates AES-128-CBC encrypted with Keychain-derived key
  if (buf.length > 3 && buf.slice(0, 3).toString() === 'v10') {
    try {
      const iv = Buffer.alloc(16, ' '); // 16 space characters
      const encrypted = buf.slice(3);
      const decipher = crypto.createDecipheriv('aes-128-cbc', derivedKey, iv);
      decipher.setAutoPadding(true);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch (e) {
      return '';
    }
  }
  return '';
}

// Helper: get Chrome Safe Storage key from macOS Keychain and derive AES key
function getChromeDecryptionKey() {
  return new Promise((resolve, reject) => {
    exec('security find-generic-password -s "Chrome Safe Storage" -w', (error, stdout) => {
      if (error) return reject(new Error('Could not access Chrome Safe Storage key from Keychain. ' + error.message));
      const chromeKey = stdout.trim();
      // Derive 16-byte AES key using PBKDF2
      crypto.pbkdf2(chromeKey, 'saltysalt', 1003, 16, 'sha1', (err, key) => {
        if (err) return reject(err);
        resolve(key);
      });
    });
  });
}

// Import Chrome profile data
ipcMain.handle('chrome-profile-import', async (event, { profilePath, dataTypes }) => {
  const result = {};
  const tmpFiles = [];

  try {
    // ── History ──
    if (dataTypes.includes('history')) {
      const historyFile = path.join(profilePath, 'History');
      if (fs.existsSync(historyFile)) {
        const tmpFile = copyToTemp(historyFile, 'History');
        tmpFiles.push(tmpFile, tmpFile + '-wal', tmpFile + '-shm');
        const db = await openSqlite(tmpFile);
        const rows = db.exec('SELECT url, title, visit_count, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 5000');
        db.close();
        result.history = (rows[0]?.values || []).map(([url, title, visitCount, lastVisit]) => ({
          url, title, visitCount, lastVisit: chromeTimeToISO(lastVisit)
        }));
      } else {
        result.history = [];
      }
    }

    // ── Bookmarks ──
    if (dataTypes.includes('bookmarks')) {
      const bookmarksFile = path.join(profilePath, 'Bookmarks');
      if (fs.existsSync(bookmarksFile)) {
        const data = JSON.parse(fs.readFileSync(bookmarksFile, 'utf8'));
        const bookmarks = [];
        function walkBookmarks(node, folder) {
          if (node.type === 'url') {
            bookmarks.push({ name: node.name, url: node.url, folder });
          } else if (node.children) {
            const currentFolder = folder ? `${folder}/${node.name}` : node.name;
            for (const child of node.children) walkBookmarks(child, currentFolder);
          }
        }
        if (data.roots) {
          for (const root of Object.values(data.roots)) {
            if (root && typeof root === 'object') walkBookmarks(root, '');
          }
        }
        result.bookmarks = bookmarks;
      } else {
        result.bookmarks = [];
      }
    }

    // ── Autofill ──
    if (dataTypes.includes('autofill')) {
      const webDataFile = path.join(profilePath, 'Web Data');
      if (fs.existsSync(webDataFile)) {
        const tmpFile = copyToTemp(webDataFile, 'WebData');
        tmpFiles.push(tmpFile, tmpFile + '-wal', tmpFile + '-shm');
        const db = await openSqlite(tmpFile);

        // Form field entries
        const autofillRows = db.exec('SELECT name, value, count FROM autofill ORDER BY count DESC LIMIT 1000');
        const autofillEntries = (autofillRows[0]?.values || []).map(([name, value, count]) => ({ name, value, count }));

        // Address profiles
        let addresses = [];
        try {
          const profileRows = db.exec(`SELECT
            p.guid, n.first_name, n.middle_name, n.last_name,
            e.email, ph.number
            FROM autofill_profiles p
            LEFT JOIN autofill_profile_names n ON p.guid = n.guid
            LEFT JOIN autofill_profile_emails e ON p.guid = e.guid
            LEFT JOIN autofill_profile_phones ph ON p.guid = ph.guid`);
          addresses = (profileRows[0]?.values || []).map(([guid, first, middle, last, email, phone]) => ({
            guid, firstName: first, middleName: middle, lastName: last, email, phone
          }));
        } catch (e) {
          // Table structure may vary across Chrome versions
        }

        db.close();
        result.autofill = { entries: autofillEntries, addresses };
      } else {
        result.autofill = { entries: [], addresses: [] };
      }
    }

    // ── Passwords ──
    if (dataTypes.includes('passwords')) {
      const loginDataFile = path.join(profilePath, 'Login Data');
      if (fs.existsSync(loginDataFile)) {
        const tmpFile = copyToTemp(loginDataFile, 'LoginData');
        tmpFiles.push(tmpFile, tmpFile + '-wal', tmpFile + '-shm');
        const derivedKey = await getChromeDecryptionKey();
        const db = await openSqlite(tmpFile);
        const rows = db.exec('SELECT origin_url, username_value, password_value FROM logins');
        db.close();
        result.passwords = (rows[0]?.values || []).map(([url, username, passwordBlob]) => {
          const password = decryptChromePassword(passwordBlob, derivedKey);
          return { url, username, password };
        }).filter(entry => entry.username || entry.password); // skip empty entries
      } else {
        result.passwords = [];
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message, data: result };
  } finally {
    // Clean up temp files
    for (const f of tmpFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* ignore */ }
    }
  }
});

// Clean up MCP connections on app quit
app.on('before-quit', async () => {
  // Clean up viewer temp files
  for (const tmpFile of viewerTempFiles) {
    try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
  }
  viewerTempFiles.length = 0;

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

  // Clean up QEMU VMs started by the app
  try {
    const vmDir = path.join(os.homedir(), '.env-vms');
    if (fs.existsSync(vmDir)) {
      const entries = fs.readdirSync(vmDir);
      entries.filter(e => e.startsWith('env-')).forEach(vmName => {
        const pidFile = path.join(vmDir, vmName, 'qemu.pid');
        try {
          if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, 'utf8').trim();
            if (pid) process.kill(parseInt(pid), 'SIGTERM');
          }
        } catch (e) { /* ignore per-VM cleanup errors */ }
      });
    }
  } catch (e) { /* ignore cleanup errors */ }

  // Clean up Codex SDK
  codexAbortMap.forEach(controller => controller.abort());
  codexAbortMap.clear();
  codexThreadMap.clear();
  codexClient = null;
});
