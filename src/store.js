import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCachedProviders, refreshProviders } from './modelRegistry';
import { getWebviewElement } from './webviewRef';

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
  },
  {
    name: 'grep',
    description: 'Search file contents for a pattern. Returns matching lines with file paths and line numbers. Uses ripgrep (rg) if available, otherwise falls back to grep.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The regex pattern to search for'
        },
        path: {
          type: 'string',
          description: 'Directory or file to search in (defaults to current directory)'
        },
        include: {
          type: 'string',
          description: 'Glob pattern to include files (e.g., "*.js", "*.{ts,tsx}")'
        },
        exclude: {
          type: 'string',
          description: 'Glob pattern to exclude files/directories (e.g., "node_modules")'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 100)'
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Case sensitive search (default: true)'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'glob',
    description: 'Find files matching a glob pattern. Returns list of matching file paths.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern (e.g., "**/*.js", "src/**/*.{ts,tsx}")'
        },
        path: {
          type: 'string',
          description: 'Base directory to search from (defaults to current directory)'
        },
        ignore: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to ignore (e.g., ["node_modules/**", ".git/**"])'
        },
        onlyFiles: {
          type: 'boolean',
          description: 'Return only files, not directories (default: true)'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 500)'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'browser_navigate',
    description: 'Navigate the built-in browser panel to a URL. This opens browser mode automatically if not already open.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to (e.g., "https://google.com")'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_script',
    description: 'Execute JavaScript in the built-in browser panel page context. The browser must be navigated to a page first. Returns the result of the last expression.',
    input_schema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'JavaScript code to execute in the page context'
        }
      },
      required: ['script']
    }
  },
  {
    name: 'set_checklist',
    description: 'Set the checklist steps shown in the progress overlay. Call this at the start of a multi-step plan to populate the tracker. Each step needs an id and label.',
    input_schema: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique step id' },
              label: { type: 'string', description: 'Step description' }
            },
            required: ['id', 'label']
          },
          description: 'Array of steps to display'
        }
      },
      required: ['steps']
    }
  },
  {
    name: 'update_checklist_step',
    description: 'Update the status of a checklist step. Use this as you complete each step.',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The step id to update'
        },
        status: {
          type: 'string',
          enum: ['pending', 'running', 'done', 'error', 'skipped'],
          description: 'New status for the step'
        }
      },
      required: ['id', 'status']
    }
  },
  {
    name: 'task',
    description: `Spawn a sub-agent to handle a complex task. Use this when:
- A task requires multiple steps or exploration
- You want to parallelize work (multiple tasks can run)
- The task is self-contained and can be summarized

The sub-agent will have access to all tools and return a summary.`,
    input_schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Clear description of what the sub-agent should accomplish'
        },
        context: {
          type: 'string',
          description: 'Optional additional context or constraints for the sub-agent'
        },
        maxIterations: {
          type: 'number',
          description: 'Maximum tool call iterations for the sub-agent (default: 5)'
        }
      },
      required: ['description']
    }
  },
  {
    name: 'open_vm',
    description: `Launch a virtual machine via QEMU with HVF acceleration. Use when a task needs an isolated environment or a different OS.
- All VMs (Linux, macOS, Windows) run through QEMU — single unified backend.
- Specify the os if you know which one is needed, or omit it to let the user choose.
- Set headless=true for SSH-only access (lightweight), headless=false for a GUI window.
- Linux uses Ubuntu cloud images with cloud-init (auto-configured SSH + QGA).
- Once running, use run_command with the provided SSH command to operate inside the VM.
- QEMU Guest Agent (QGA) socket is also available for direct command execution.
- Multiple VMs can run in parallel on different ports.`,
    input_schema: {
      type: 'object',
      properties: {
        os: {
          type: 'string',
          enum: ['macos', 'linux', 'windows'],
          description: 'The OS to launch. Omit to prompt the user to choose.'
        },
        name: {
          type: 'string',
          description: 'Optional name for this VM instance.'
        },
        headless: {
          type: 'boolean',
          description: 'Run without GUI (default: true).'
        }
      },
      required: []
    }
  },
  {
    name: 'lookup_profile',
    description: "Search the user's imported Chrome profile data. Can look up browsing history, saved passwords/logins, autofill data (addresses, names, emails, phones), and bookmarks. Use this when you need the user's credentials, personal info, or browsing context to complete a task.",
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['history', 'passwords', 'autofill', 'bookmarks', 'all'],
          description: 'Which data category to search'
        },
        query: {
          type: 'string',
          description: 'Search term to filter results (matches URLs, titles, names, etc.)'
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 20)'
        }
      },
      required: ['category']
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

    case 'grep': {
      if (!toolInput.pattern) {
        return { success: false, error: 'Missing required parameter "pattern". Usage: grep({ pattern: "search term", path: "." })' };
      }
      const searchPath = await expandPath(toolInput.path || '.');
      const maxResults = toolInput.maxResults || 100;
      const caseSensitive = toolInput.caseSensitive !== false;

      // Build command - try ripgrep first, fall back to grep
      let command;
      const caseFlag = caseSensitive ? '' : '-i';

      // Try ripgrep (rg) first as it's faster
      const rgInclude = toolInput.include ? `--glob "${toolInput.include}"` : '';
      const rgExclude = toolInput.exclude ? `--glob "!${toolInput.exclude}"` : '';
      const rgCommand = `rg -n ${caseFlag} ${rgInclude} ${rgExclude} --max-count=${maxResults} "${toolInput.pattern.replace(/"/g, '\\"')}" "${searchPath}" 2>/dev/null`;

      // Fallback grep command
      const grepInclude = toolInput.include ? `--include="${toolInput.include}"` : '';
      const grepExclude = toolInput.exclude ? `--exclude-dir="${toolInput.exclude}"` : '';
      const grepCommand = `grep -rn ${caseFlag} ${grepInclude} ${grepExclude} "${toolInput.pattern.replace(/"/g, '\\"')}" "${searchPath}" 2>/dev/null | head -n ${maxResults}`;

      // Try rg first, fall back to grep
      command = `${rgCommand} || ${grepCommand}`;

      const result = await electronAPI.shell.exec(command, { cwd: searchPath });

      if (result.success || result.stdout) {
        const output = result.stdout || '';
        const lines = output.split('\n').filter(l => l.trim());
        const matches = lines.map(line => {
          // Parse "file:line:content" format
          const match = line.match(/^([^:]+):(\d+):(.*)$/);
          if (match) {
            return { file: match[1], line: parseInt(match[2]), content: match[3] };
          }
          return { raw: line };
        });

        return {
          success: true,
          pattern: toolInput.pattern,
          path: searchPath,
          matchCount: matches.length,
          matches,
          output
        };
      }

      // No matches is not an error
      if (result.code === 1) {
        return { success: true, pattern: toolInput.pattern, path: searchPath, matchCount: 0, matches: [], output: '' };
      }

      return { success: false, error: result.error || result.stderr || 'Search failed' };
    }

    case 'glob': {
      if (!toolInput.pattern) {
        return { success: false, error: 'Missing required parameter "pattern". Usage: glob({ pattern: "**/*.js", path: "." })' };
      }
      const searchPath = await expandPath(toolInput.path || '.');
      const maxResults = toolInput.maxResults || 500;
      const onlyFiles = toolInput.onlyFiles !== false;

      // Build ignore patterns
      const ignorePatterns = toolInput.ignore || ['node_modules', '.git', 'dist', 'build'];
      const ignoreArgs = ignorePatterns.map(p => `-not -path "*/${p}/*"`).join(' ');

      // Use find command for glob matching
      const typeFlag = onlyFiles ? '-type f' : '';
      const pattern = toolInput.pattern;

      // Convert glob pattern to find compatible pattern
      // **/*.js -> -name "*.js"
      // src/**/*.ts -> path pattern
      let findPattern;
      if (pattern.includes('**')) {
        // Complex glob - use -path for matching
        const pathPattern = pattern.replace(/\*\*/g, '*');
        findPattern = `-path "./${pathPattern}"`;
      } else {
        findPattern = `-name "${pattern}"`;
      }

      const command = `find "${searchPath}" ${typeFlag} ${findPattern} ${ignoreArgs} 2>/dev/null | head -n ${maxResults}`;

      const result = await electronAPI.shell.exec(command, { cwd: searchPath });

      if (result.success || result.stdout) {
        const output = result.stdout || '';
        const files = output.split('\n').filter(l => l.trim());

        return {
          success: true,
          pattern: toolInput.pattern,
          path: searchPath,
          fileCount: files.length,
          files,
          output
        };
      }

      return { success: false, error: result.error || result.stderr || 'Glob search failed' };
    }

    case 'browser_navigate': {
      if (!toolInput.url) {
        return { success: false, error: 'Missing required parameter "url".' };
      }
      const store = useStore.getState();
      // Enable browser mode if not already active
      if (!store.browserMode) {
        store.setBrowserMode(true);
      }
      store.setBrowserModeUrl(toolInput.url);

      // Wait a moment for the webview to mount if it wasn't already open
      await new Promise(resolve => setTimeout(resolve, 500));

      const webview = getWebviewElement();
      if (!webview) {
        return { success: false, error: 'Browser webview not available. Try again in a moment.' };
      }

      try {
        await webview.loadURL(toolInput.url);
        return { success: true, url: toolInput.url, message: `Navigated to ${toolInput.url}` };
      } catch (err) {
        // ERR_ABORTED is normal during redirects
        if (err.message?.includes('ERR_ABORTED')) {
          return { success: true, url: toolInput.url, message: `Navigated to ${toolInput.url} (redirect)` };
        }
        return { success: false, error: `Navigation failed: ${err.message}` };
      }
    }

    case 'browser_script': {
      if (!toolInput.script) {
        return { success: false, error: 'Missing required parameter "script".' };
      }
      const webview = getWebviewElement();
      if (!webview) {
        return { success: false, error: 'Browser webview not available. Navigate to a page first using browser_navigate.' };
      }

      try {
        const result = await webview.executeJavaScript(toolInput.script);
        return { success: true, result: result !== undefined ? String(result) : 'undefined' };
      } catch (err) {
        return { success: false, error: `Script execution failed: ${err.message}` };
      }
    }

    case 'set_checklist': {
      if (!toolInput.steps || !Array.isArray(toolInput.steps)) {
        return { success: false, error: 'Missing required parameter "steps" (array of {id, label}).' };
      }
      const steps = toolInput.steps.map(s => ({
        id: s.id,
        label: s.label,
        status: 'pending'
      }));
      const store = useStore.getState();
      store.setChecklistSteps(steps);
      store.setShowChecklistPanel(true);
      return { success: true, message: `Checklist set with ${steps.length} steps.` };
    }

    case 'update_checklist_step': {
      if (!toolInput.id || !toolInput.status) {
        return { success: false, error: 'Missing required parameters "id" and "status".' };
      }
      useStore.getState().updateChecklistStep(toolInput.id, { status: toolInput.status });
      return { success: true, message: `Step "${toolInput.id}" updated to "${toolInput.status}".` };
    }

    case 'task': {
      if (!toolInput.description) {
        return { success: false, error: 'Missing required parameter "description". Usage: task({ description: "Task description" })' };
      }

      // Task execution is handled specially by the conversation processor
      // This case returns a placeholder - actual execution happens in processConversation
      return {
        success: true,
        taskId: `task_${Date.now()}`,
        description: toolInput.description,
        context: toolInput.context || '',
        maxIterations: toolInput.maxIterations || 5,
        status: 'pending',
        message: 'Task queued for sub-agent execution'
      };
    }

    case 'lookup_profile': {
      const profile = useStore.getState().chromeProfile;
      if (!profile) {
        return { success: false, error: 'No Chrome profile imported. The user needs to import a Chrome profile first via the browser menu (3-dot icon → Import Chrome Profile).' };
      }
      const category = toolInput.category || 'all';
      const query = (toolInput.query || '').toLowerCase();
      const limit = toolInput.limit || 20;

      const filterMatch = (str) => !query || (str && str.toLowerCase().includes(query));
      const results = {};

      if (category === 'history' || category === 'all') {
        const history = (profile.history || []).filter(h => filterMatch(h.url) || filterMatch(h.title));
        results.history = history.slice(0, limit);
      }
      if (category === 'passwords' || category === 'all') {
        const passwords = (profile.passwords || []).filter(p => filterMatch(p.url) || filterMatch(p.username));
        results.passwords = passwords.slice(0, limit);
      }
      if (category === 'autofill' || category === 'all') {
        const entries = (profile.autofill?.entries || []).filter(a => filterMatch(a.name) || filterMatch(a.value));
        const addresses = (profile.autofill?.addresses || []).filter(a =>
          filterMatch(a.firstName) || filterMatch(a.lastName) || filterMatch(a.email) || filterMatch(a.phone)
        );
        results.autofill = { entries: entries.slice(0, limit), addresses: addresses.slice(0, limit) };
      }
      if (category === 'bookmarks' || category === 'all') {
        const bookmarks = (profile.bookmarks || []).filter(b => filterMatch(b.name) || filterMatch(b.url));
        results.bookmarks = bookmarks.slice(0, limit);
      }

      return { success: true, ...results };
    }

    case 'open_vm': {
      const store = useStore.getState();
      let selectedOs = toolInput.os;

      // If no OS specified, prompt the user via the VM dropdown
      if (!selectedOs) {
        selectedOs = await new Promise((resolve) => {
          store.setPendingVMSelection({ resolve });
        });
        if (!selectedOs) {
          return { success: false, error: 'User cancelled VM selection.' };
        }
      }

      const vmName = toolInput.name || `env-${selectedOs}-${Date.now()}`;
      const headless = toolInput.headless !== false;

      // ---- Unified QEMU backend for all OSes ----
      const qemuCheck = await electronAPI.shell.exec('which qemu-system-aarch64');
      if (!qemuCheck.success || !qemuCheck.stdout?.trim()) {
        return { success: false, error: 'QEMU not found. Install it with: brew install qemu' };
      }

      const vmDir = `$HOME/.env-vms/${vmName}`;
      await electronAPI.shell.exec(`mkdir -p ${vmDir}`);

      // Find UEFI firmware (brew puts it here)
      const fwCheck = await electronAPI.shell.exec('echo $(brew --prefix)/share/qemu/edk2-aarch64-code.fd');
      const firmwarePath = fwCheck.success ? fwCheck.stdout?.trim() : '/opt/homebrew/share/qemu/edk2-aarch64-code.fd';

      // Create UEFI vars file if it doesn't exist
      await electronAPI.shell.exec(`test -f ${vmDir}/ovmf_vars.fd || dd if=/dev/zero conv=sync bs=1m count=64 of=${vmDir}/ovmf_vars.fd 2>/dev/null`);

      // Assign unique ports for this VM instance
      const basePort = 10000 + (Date.now() % 50000);
      const sshPort = basePort;
      const qmpPort = basePort + 1;
      const qgaPort = basePort + 2;
      const vncDisplay = Math.floor(Math.random() * 200) + 10;

      // OS-specific image and QEMU config
      let diskPath = `${vmDir}/disk.qcow2`;
      let extraArgs = '';
      let sshUser = 'root';
      let setupInfo = '';

      if (selectedOs === 'linux') {
        // Download Ubuntu Desktop live ISO if not cached
        const desktopIso = '$HOME/.env-vms/ubuntu-24.04-desktop-arm64.iso';
        const expectedSha = 'c2610520bf582976839a1724c669e1cfed0547427be5a0ad12d457b92b46ffbe';
        const minIsoSize = 3000000000; // ~3 GB minimum for a valid ISO

        // Check if ISO exists AND is large enough (protects against partial downloads)
        const isoExists = await electronAPI.shell.exec(`test -f ${desktopIso} && echo exists`);
        let needsDownload = !isoExists.stdout?.includes('exists');
        if (!needsDownload) {
          const sizeCheck = await electronAPI.shell.exec(`stat -f%z ${desktopIso} 2>/dev/null || echo 0`);
          const isoSize = parseInt(sizeCheck.stdout?.trim() || '0', 10);
          if (isoSize < minIsoSize) {
            // ISO is too small — likely a partial/corrupt download, remove it
            await electronAPI.shell.exec(`rm -f ${desktopIso}`);
            needsDownload = true;
          }
        }
        if (needsDownload) {
          // Get total size first via HEAD request
          const headResult = await electronAPI.shell.exec(
            `curl -sIL https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04.4-desktop-arm64.iso`
          );
          let totalBytes = 3.3 * 1024 * 1024 * 1024; // fallback ~3.3G
          if (headResult.success && headResult.stdout) {
            const clMatch = headResult.stdout.match(/content-length:\s*(\d+)/i);
            if (clMatch) totalBytes = parseInt(clMatch[1], 10);
          }
          const formatBytes = (bytes) => {
            if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
            if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
            return (bytes / 1024).toFixed(0) + ' KB';
          };
          const totalStr = formatBytes(totalBytes);

          store.setVmDownloadProgress({ pct: 0, downloaded: '0 MB', total: totalStr, eta: 'estimating...' });

          // Use aria2c for massively faster parallel downloads (falls back to curl)
          const dlDone = `${desktopIso}.dl-done`;
          const dlPartFile = `${desktopIso}.part`;
          const isoUrl = 'https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04.4-desktop-arm64.iso';

          // Kill any stale download processes from previous attempts before starting a new one
          await electronAPI.shell.exec(`pkill -f "curl.*ubuntu-24.04.*desktop" 2>/dev/null; pkill -f "aria2c.*ubuntu-24.04" 2>/dev/null`);
          await electronAPI.shell.exec(`rm -f ${dlDone} ${dlPartFile} ${dlPartFile}.aria2`);

          // Check if aria2c is available
          const aria2Check = await electronAPI.shell.exec('which aria2c');
          const useAria2 = aria2Check.success && aria2Check.stdout?.trim();

          if (useAria2) {
            // aria2c with 8 parallel connections — dramatically faster
            await electronAPI.shell.exec(
              `(aria2c -x8 -s8 --file-allocation=none --allow-overwrite=true -d "$(dirname ${dlPartFile})" -o "$(basename ${dlPartFile})" "${isoUrl}" >/dev/null 2>&1; echo $? > ${dlDone}) &`,
              { timeout: 10000 }
            );
          } else {
            // Fallback to curl as background process
            await electronAPI.shell.exec(
              `(curl -s --fail -C - -L -o ${dlPartFile} "${isoUrl}"; echo $? > ${dlDone}) &`,
              { timeout: 10000 }
            );
          }

          // Poll file size + check completion every 2 seconds, with ETA
          let lastBytes = 0;
          let lastTime = Date.now();
          const dlResult = await new Promise((resolve) => {
            const pollInterval = setInterval(async () => {
              try {
                const sizeResult = await electronAPI.shell.exec(`stat -f%z ${dlPartFile} 2>/dev/null || echo 0`);
                const currentBytes = parseInt(sizeResult.stdout?.trim() || '0', 10);
                const pct = Math.min(99, Math.round((currentBytes / totalBytes) * 100));

                // Calculate ETA from rolling speed
                const now = Date.now();
                const elapsed = (now - lastTime) / 1000;
                const bytesDelta = currentBytes - lastBytes;
                let eta = '';
                if (elapsed > 0 && bytesDelta > 0) {
                  const speed = bytesDelta / elapsed;
                  const remaining = totalBytes - currentBytes;
                  const secsLeft = Math.round(remaining / speed);
                  if (secsLeft < 60) eta = `~${secsLeft}s left`;
                  else if (secsLeft < 3600) eta = `~${Math.ceil(secsLeft / 60)}m left`;
                  else eta = `~${(secsLeft / 3600).toFixed(1)}h left`;
                }
                lastBytes = currentBytes;
                lastTime = now;

                store.setVmDownloadProgress({ pct, downloaded: formatBytes(currentBytes), total: totalStr, eta });

                // Check if download finished
                const doneCheck = await electronAPI.shell.exec(`cat ${dlDone} 2>/dev/null`);
                if (doneCheck.success && doneCheck.stdout?.trim() !== '') {
                  clearInterval(pollInterval);
                  const exitCode = parseInt(doneCheck.stdout.trim(), 10);
                  await electronAPI.shell.exec(`rm -f ${dlDone}`);
                  resolve({ success: exitCode === 0 });
                }
              } catch {}
            }, 2000);

            // Safety timeout: 45 minutes max
            setTimeout(() => {
              clearInterval(pollInterval);
              resolve({ success: false });
            }, 2700000);
          });

          if (!dlResult.success) {
            store.setVmDownloadProgress(null);
            return { success: false, error: 'Failed to download Ubuntu Desktop ISO.' };
          }

          // Verify checksum
          store.setVmDownloadProgress({ pct: 100, downloaded: totalStr, total: totalStr, verifying: true });
          const shaResult = await electronAPI.shell.exec(`shasum -a 256 ${desktopIso}.part`, { timeout: 120000 });
          if (!shaResult.success || !shaResult.stdout?.includes(expectedSha)) {
            store.setVmDownloadProgress(null);
            await electronAPI.shell.exec(`rm -f ${desktopIso}.part`);
            return { success: false, error: 'ISO checksum mismatch — download was corrupted. Please try again.' };
          }

          await electronAPI.shell.exec(`mv ${desktopIso}.part ${desktopIso}`);
          store.setVmDownloadProgress(null);
        }

        // Create VM disk if it doesn't exist
        const diskCheck = await electronAPI.shell.exec(`test -f ${diskPath} && echo exists`);
        if (!diskCheck.stdout?.includes('exists')) {
          await electronAPI.shell.exec(`qemu-img create -f qcow2 ${diskPath} 30G`);
        }

        // Fresh UEFI vars each launch so boot order isn't stale
        await electronAPI.shell.exec(`dd if=/dev/zero conv=sync bs=1m count=64 of=${vmDir}/ovmf_vars.fd 2>/dev/null`);
        extraArgs = `-device virtio-scsi-pci,id=scsi0 -drive file=${desktopIso},media=cdrom,if=none,id=cd0,readonly=on -device scsi-cd,drive=cd0,bus=scsi0.0,bootindex=0`;
        sshUser = 'ubuntu';
        setupInfo = `Live desktop — install to disk from the GUI, or use the live session directly.`;

      } else if (selectedOs === 'macos') {
        // macOS uses the vmapple machine type for native HVF acceleration
        // User needs to provide a macOS IPSW or we use a pre-built disk
        const diskCheck = await electronAPI.shell.exec(`test -f ${diskPath} && echo exists`);
        if (!diskCheck.stdout?.includes('exists')) {
          // Create a blank disk — user will need to install macOS from IPSW
          await electronAPI.shell.exec(`qemu-img create -f qcow2 ${diskPath} 64G`);
          setupInfo = 'NOTE: First boot requires a macOS IPSW restore image. The VM will open for initial setup.';
        }
        sshUser = 'admin';
        setupInfo = setupInfo || `SSH: ssh -p ${sshPort} ${sshUser}@localhost`;

      } else if (selectedOs === 'windows') {
        // Windows ARM — needs an ISO for first install or a pre-built QCOW2
        const diskCheck = await electronAPI.shell.exec(`test -f ${diskPath} && echo exists`);
        if (!diskCheck.stdout?.includes('exists')) {
          await electronAPI.shell.exec(`qemu-img create -f qcow2 ${diskPath} 64G`);
          // Check if user has a Windows ISO
          const isoCheck = await electronAPI.shell.exec(`ls $HOME/.env-vms/windows*.iso 2>/dev/null || ls $HOME/Downloads/Win*.iso 2>/dev/null`);
          if (isoCheck.success && isoCheck.stdout?.trim()) {
            const isoPath = isoCheck.stdout.trim().split('\n')[0];
            extraArgs = `-cdrom "${isoPath}"`;
            setupInfo = `First boot: Windows installer will start from ${isoPath}. SSH: ssh -p ${sshPort} user@localhost after setup.`;
          } else {
            setupInfo = 'NOTE: Place a Windows ARM ISO at ~/.env-vms/windows.iso and relaunch, or install from the GUI.';
          }
        } else {
          setupInfo = `SSH: ssh -p ${sshPort} user@localhost (enable OpenSSH in Windows Settings first)`;
        }
        sshUser = 'user';

        // Add VirtIO drivers ISO if available
        const virtioCheck = await electronAPI.shell.exec(`ls $HOME/.env-vms/virtio-win*.iso 2>/dev/null`);
        if (virtioCheck.success && virtioCheck.stdout?.trim()) {
          extraArgs += ` -drive file="${virtioCheck.stdout.trim().split('\n')[0]}",media=cdrom,index=1`;
        }
      }

      // Build the QEMU command
      const displayArg = headless ? '-display none' : `-display cocoa -device virtio-gpu-pci`;
      const qemuCmd = [
        'qemu-system-aarch64',
        '-accel hvf',
        '-M virt,highmem=on',
        '-cpu host',
        `-m 4096`,
        `-smp 4`,
        `-drive file=${firmwarePath},if=pflash,format=raw,readonly=on`,
        `-drive file=${vmDir}/ovmf_vars.fd,if=pflash,format=raw`,
        `-drive if=none,file=${diskPath},format=qcow2,cache=writethrough,id=hd0`,
        '-device virtio-blk-pci,drive=hd0,bootindex=2',
        `-netdev user,id=net0,hostfwd=tcp:127.0.0.1:${sshPort}-:22`,
        '-device virtio-net-pci,netdev=net0',
        // QGA virtio-serial channel
        `-chardev socket,id=qga,path=${vmDir}/qga.sock,server=on,wait=off`,
        '-device virtio-serial-pci',
        '-device virtserialport,chardev=qga,name=org.qemu.guest_agent.0',
        // QMP monitor socket
        `-qmp unix:${vmDir}/qmp.sock,server,nowait`,
        displayArg,
        '-device usb-ehci -device usb-kbd -device usb-mouse -usb',
        `-pidfile ${vmDir}/qemu.pid`,
        headless ? '-daemonize' : '',
        extraArgs,
      ].filter(Boolean).join(' ');

      // GUI mode: run in background (& + nohup) so cocoa display window appears.
      // -daemonize forks and detaches from the GUI session, killing the cocoa window.
      const shellCmd = headless
        ? `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES ${qemuCmd}`
        : `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES nohup ${qemuCmd} &>/dev/null & sleep 1 && echo ok`;

      const launchResult = await electronAPI.shell.exec(shellCmd, { timeout: 30000 });
      if (!launchResult.success) {
        return { success: false, error: `Failed to start QEMU: ${launchResult.error || launchResult.stderr}` };
      }

      // Wait for SSH to become available (up to 60s)
      let sshReady = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const sshTest = await electronAPI.shell.exec(
          `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=2 -o BatchMode=yes -p ${sshPort} ${sshUser}@localhost echo ok 2>/dev/null`,
          { timeout: 5000 }
        );
        if (sshTest.success && sshTest.stdout?.includes('ok')) {
          sshReady = true;
          break;
        }
      }

      // Register in state
      store.addRunningVM({
        id: vmName,
        os: selectedOs,
        sshPort,
        sshUser,
        qgaSock: `${vmDir}/qga.sock`,
        qmpSock: `${vmDir}/qmp.sock`,
        pidFile: `${vmDir}/qemu.pid`,
        status: sshReady ? 'running' : 'booting',
        headless,
        startedAt: Date.now(),
        backend: 'qemu'
      });

      const sshCmd = `ssh -p ${sshPort} ${sshUser}@localhost`;
      const statusMsg = sshReady ? 'running' : 'booting (SSH not ready yet)';

      return {
        success: true,
        vmName,
        os: selectedOs,
        backend: 'qemu',
        headless,
        sshPort,
        sshUser,
        sshCommand: sshCmd,
        qgaSocket: `${vmDir}/qga.sock`,
        execCommand: sshCmd,
        message: `${selectedOs} VM "${vmName}" is ${statusMsg}. ${setupInfo}\nRun commands: ${sshCmd} <command>\nQGA socket: ${vmDir}/qga.sock`
      };
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

      // Chrome profile import
      chromeProfile: null, // { history, bookmarks, autofill, passwords, importedAt, profileName }
      setChromeProfile: (profile) => set({ chromeProfile: profile }),
      chromeImportStatus: null, // { loading, progress, error }
      setChromeImportStatus: (status) => set({ chromeImportStatus: status }),
      showChromeImportModal: false,
      setShowChromeImportModal: (show) => set({ showChromeImportModal: show }),

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

      // Browser mode state (split view with chat + browser)
      browserMode: false,
      setBrowserMode: (active) => set({ browserMode: active }),
      browserModeUrl: 'about:blank',
      setBrowserModeUrl: (url) => set({ browserModeUrl: url }),
      chatPanelWidth: 400,
      setChatPanelWidth: (width) => set({ chatPanelWidth: width }),

      // Open a local file in the browser panel viewer
      openFileInViewer: async (filePath) => {
        try {
          const result = await window.electronAPI.openFileInViewer(filePath);
          if (result.success) {
            set({
              browserMode: true,
              browserModeUrl: result.url,
            });
          } else {
            console.error('Failed to open file in viewer:', result.error);
          }
        } catch (err) {
          console.error('openFileInViewer error:', err);
        }
      },

      // Projects (folders for organizing chats)
      projects: [],
      expandedProjects: {}, // { projectId: true/false } for expand/collapse state
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
      })),
      updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, ...updates } : p
        )
      })),
      deleteProject: (projectId) => set((state) => ({
        // Remove the project and clear projectId from all sessions in it
        projects: state.projects.filter(p => p.id !== projectId),
        chatSessions: state.chatSessions.map(s =>
          s.projectId === projectId ? { ...s, projectId: null } : s
        )
      })),
      reorderProjects: (projects) => set({ projects }),
      toggleProjectExpanded: (projectId) => set((state) => ({
        expandedProjects: {
          ...state.expandedProjects,
          [projectId]: !state.expandedProjects[projectId]
        }
      })),
      setProjectExpanded: (projectId, expanded) => set((state) => ({
        expandedProjects: {
          ...state.expandedProjects,
          [projectId]: expanded
        }
      })),

      // Chat sessions
      chatSessions: [],
      archivedSessions: [], // Archived chats (soft delete)
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
      // Archive a chat session (soft delete)
      archiveChatSession: (sessionId) => set((state) => {
        const session = state.chatSessions.find(s => s.id === sessionId);
        if (!session) return state;
        return {
          chatSessions: state.chatSessions.filter(s => s.id !== sessionId),
          archivedSessions: [...state.archivedSessions, { ...session, archivedAt: Date.now() }],
          activeChatSession: state.activeChatSession === sessionId ? null : state.activeChatSession
        };
      }),
      // Restore a chat from archive
      restoreChatSession: (sessionId) => set((state) => {
        const session = state.archivedSessions.find(s => s.id === sessionId);
        if (!session) return state;
        const { archivedAt, ...restoredSession } = session;
        return {
          archivedSessions: state.archivedSessions.filter(s => s.id !== sessionId),
          chatSessions: [...state.chatSessions, restoredSession]
        };
      }),
      // Permanently delete from archive
      permanentlyDeleteSession: (sessionId) => set((state) => ({
        archivedSessions: state.archivedSessions.filter(s => s.id !== sessionId)
      })),
      // Clear all archived sessions
      clearArchive: () => set({ archivedSessions: [] }),
      reorderChatSessions: (sessions) => set({ chatSessions: sessions }),
      moveSessionToProject: (sessionId, projectId) => set((state) => ({
        chatSessions: state.chatSessions.map(s =>
          s.id === sessionId ? { ...s, projectId: projectId } : s
        )
      })),

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

      // CLI permission state - tracks tool permissions per conversation
      // { conversationId: 'all' | 'readonly' | 'denied' }
      cliPermissions: {},
      setCliPermission: (conversationId, level) => set((state) => ({
        cliPermissions: { ...state.cliPermissions, [conversationId]: level }
      })),
      // Pending permission request — holds { conversationId, resolve } when waiting for user input
      pendingCliPermission: null,
      setPendingCliPermission: (pending) => set({ pendingCliPermission: pending }),
      // Streaming content for CLI chatbots - { conversationId: 'partial text...' }
      cliStreamingContent: {},
      setCliStreamingContent: (conversationId, content) => set((state) => ({
        cliStreamingContent: { ...state.cliStreamingContent, [conversationId]: content }
      })),
      clearCliStreamingContent: (conversationId) => set((state) => {
        const updated = { ...state.cliStreamingContent };
        delete updated[conversationId];
        return { cliStreamingContent: updated };
      }),

      // Planning mode - enables extended thinking/reasoning
      planningMode: false,
      setPlanningMode: (enabled) => set({ planningMode: enabled }),

      // Sub-tasks state for Task tool
      subTasks: {}, // { taskId: { status, messages, result, parentNodeId, description, stats } }
      setSubTask: (taskId, taskData) => set((state) => ({
        subTasks: {
          ...state.subTasks,
          [taskId]: { ...state.subTasks[taskId], ...taskData }
        }
      })),
      clearSubTask: (taskId) => set((state) => {
        const newTasks = { ...state.subTasks };
        delete newTasks[taskId];
        return { subTasks: newTasks };
      }),

      // ===== Checklist State =====
      // Simple step tracker: [{ id, label, status: 'pending'|'running'|'done'|'error' }]
      checklistSteps: [],
      showChecklistPanel: false,
      setShowChecklistPanel: (show) => set({ showChecklistPanel: show }),
      setChecklistSteps: (steps) => set({ checklistSteps: steps }),
      updateChecklistStep: (id, update) => set((state) => ({
        checklistSteps: state.checklistSteps.map(s => s.id === id ? { ...s, ...update } : s)
      })),
      clearChecklist: () => set({ checklistSteps: [] }),

      // Message queue for interject feature
      messageQueue: {}, // { nodeId: [{ id, content, timestamp }] }
      queueMessage: (nodeId, message) => set((state) => ({
        messageQueue: {
          ...state.messageQueue,
          [nodeId]: [...(state.messageQueue[nodeId] || []), message]
        }
      })),
      dequeueMessage: (nodeId) => set((state) => {
        const queue = state.messageQueue[nodeId] || [];
        const [, ...rest] = queue;
        return {
          messageQueue: {
            ...state.messageQueue,
            [nodeId]: rest
          }
        };
      }),
      clearMessageQueue: (nodeId) => set((state) => {
        const newQueue = { ...state.messageQueue };
        delete newQueue[nodeId];
        return { messageQueue: newQueue };
      }),

      // Tool confirmation state for JS prompts
      pendingConfirmation: null, // { toolName, toolInput, resolve, reject }
      setPendingConfirmation: (confirmation) => set({ pendingConfirmation: confirmation }),

      // ===== VM State =====
      runningVMs: {}, // { vmId: { id, os, ip, status, headless, startedAt, backend } }
      addRunningVM: (vm) => set((state) => ({
        runningVMs: { ...state.runningVMs, [vm.id]: vm }
      })),
      updateRunningVM: (vmId, updates) => set((state) => ({
        runningVMs: {
          ...state.runningVMs,
          [vmId]: { ...state.runningVMs[vmId], ...updates }
        }
      })),
      removeRunningVM: (vmId) => set((state) => {
        const newVMs = { ...state.runningVMs };
        delete newVMs[vmId];
        return { runningVMs: newVMs };
      }),
      pendingVMSelection: null, // { resolve: (os) => void }
      setPendingVMSelection: (selection) => set({ pendingVMSelection: selection }),
      vmDownloadProgress: null, // { pct: 0-100, downloaded: '1.2G', total: '3.3G', speed: '10M/s' }
      setVmDownloadProgress: (progress) => set({ vmDownloadProgress: progress }),

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

// Set up CLI streaming event listener (NDJSON from stream-json)
// Converts stream events into the same message format used by OpenRouter tool rendering
if (typeof window !== 'undefined' && window.electronAPI?.cliChatbots?.onStreamEvent) {
  window.electronAPI.cliChatbots.onStreamEvent(({ conversationId, event }) => {
    const state = useStore.getState();
    const current = state.cliStreamingContent[conversationId] || { text: '', activity: '', messages: [] };

    if (event.type === 'assistant' && event.message?.content) {
      // Parse assistant message — may contain text and/or tool_use blocks
      let text = '';
      const toolCalls = [];

      for (const block of event.message.content) {
        if (block.type === 'text') {
          text += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input || {}
          });
        }
      }

      // Build updated messages list
      const newMessages = [...current.messages];

      if (text) {
        newMessages.push({
          id: `stream-text-${Date.now()}`,
          role: 'assistant',
          content: text
        });
      }

      if (toolCalls.length > 0) {
        newMessages.push({
          id: `stream-tools-${Date.now()}`,
          role: 'assistant',
          content: text || '',
          toolCalls: toolCalls
        });
      }

      // Activity label for the latest tool
      let activity = current.activity;
      if (toolCalls.length > 0) {
        const tc = toolCalls[toolCalls.length - 1];
        const input = tc.input || {};
        if (tc.name === 'WebFetch') activity = `Fetching ${input.url || 'URL'}...`;
        else if (tc.name === 'WebSearch') activity = `Searching: ${input.query || ''}...`;
        else if (tc.name === 'Read') activity = `Reading ${input.file_path || 'file'}...`;
        else if (tc.name === 'Write') activity = `Writing ${input.file_path || 'file'}...`;
        else if (tc.name === 'Edit') activity = `Editing ${input.file_path || 'file'}...`;
        else if (tc.name === 'Bash') activity = `Running: ${(input.command || '').substring(0, 60)}...`;
        else if (tc.name === 'Glob') activity = `Searching for ${input.pattern || 'files'}...`;
        else if (tc.name === 'Grep') activity = `Grepping "${(input.pattern || '').substring(0, 40)}"...`;
        else if (tc.name === 'TodoWrite') activity = 'Updating task list...';
        else activity = `Using ${tc.name}...`;
      }

      state.setCliStreamingContent(conversationId, {
        text: current.text + text,
        activity,
        messages: newMessages
      });

    } else if (event.type === 'user' && event.message?.content) {
      // Tool results come as user messages with tool_result blocks
      const toolResults = [];
      for (const block of event.message.content) {
        if (block.type === 'tool_result') {
          toolResults.push({
            tool_use_id: block.tool_use_id,
            name: block.name || '',
            input: {},
            result: typeof block.content === 'string'
              ? { success: !block.is_error, content: block.content }
              : block.content
          });
        }
      }

      if (toolResults.length > 0) {
        const newMessages = [...current.messages, {
          id: `stream-result-${Date.now()}`,
          role: 'user',
          content: '',
          toolResults: toolResults,
          isToolResult: true
        }];

        state.setCliStreamingContent(conversationId, {
          ...current,
          activity: '',
          messages: newMessages
        });
      }

    } else if (event.type === 'result') {
      // Final result — use the model's intended final output
      state.setCliStreamingContent(conversationId, {
        text: event.result || current.text || '',
        activity: '',
        messages: current.messages
      });
    }
  });
}

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
  codex: {
    name: 'Codex',
    icon: '🟢',
    type: 'local',
    models: [
      { id: 'o4-mini', name: 'o4-mini' },
      { id: 'o3', name: 'o3' },
      { id: 'codex-mini-latest', name: 'Codex Mini' },
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

  // Local providers (ollama, codex, cliChatbot) use their own APIs
  if (provider === 'ollama') {
    return await callOllama(apiKey, model, messages, options, signal);
  }
  if (provider === 'codex') {
    return await callCodex(model, messages, options.conversationId);
  }
  if (provider === 'cliChatbot') {
    return await callCliChatbot(model, messages, options.conversationId, options);
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
    // Handle messages with attachments (multimodal)
    if (m.attachments && m.attachments.length > 0) {
      const contentParts = [];

      // Add text content first if present
      if (m.content) {
        contentParts.push({ type: 'text', text: m.content });
      }

      // Add each attachment
      for (const att of m.attachments) {
        if (att.type === 'image') {
          contentParts.push({
            type: 'image_url',
            image_url: { url: att.data } // data URL with base64
          });
        } else if (att.type === 'video') {
          // Some models support video, include as image_url with video mime type
          contentParts.push({
            type: 'image_url',
            image_url: { url: att.data }
          });
        } else {
          // For other files (PDFs, text files, etc.), include content as text
          // Extract base64 content and decode if it's a text file
          if (att.mimeType?.startsWith('text/') ||
              ['application/json', 'application/xml'].includes(att.mimeType)) {
            try {
              const base64Content = att.data.split(',')[1];
              const decodedContent = atob(base64Content);
              contentParts.push({
                type: 'text',
                text: `[File: ${att.name}]\n${decodedContent}`
              });
            } catch (e) {
              contentParts.push({
                type: 'text',
                text: `[File: ${att.name}] (Unable to decode content)`
              });
            }
          } else {
            // For binary files like PDFs, include as document if supported, or note it
            contentParts.push({
              type: 'text',
              text: `[Attached file: ${att.name} (${att.mimeType})]`
            });
          }
        }
      }

      return { role: m.role, content: contentParts };
    }
    return { role: m.role, content: m.content };
  }).flat();

  // Prepend system message with tool usage instructions
  const systemMessage = {
    role: 'system',
    content: `You are a helpful assistant with access to a desktop environment. You have tools for file operations, shell commands, and a built-in browser.

BROWSER TOOLS: When the user asks you to visit websites, look things up on the web, interact with web pages, or do anything that requires a browser:
- Use browser_navigate to open URLs in the built-in browser panel (NOT external browsers)
- Use browser_script to execute JavaScript on the loaded page (read DOM, click buttons, fill forms, extract data)
- The browser is a real Chromium webview — you can interact with any website
- Always use browser_navigate first to load a page, then browser_script to interact with it
- For multi-step web tasks, navigate to each page and extract what you need via JS

CHECKLIST TOOLS: When executing a multi-step plan:
- Use set_checklist at the start to show all steps in a progress overlay
- Use update_checklist_step to mark each step as "running" when you start it, "done" when complete, or "error" if it fails
- This gives the user real-time visibility into your progress

Always prefer using the built-in browser tools over trying to answer from memory when the user asks to visit or interact with websites.${useStore.getState().chromeProfile ? `

PROFILE DATA: The user has imported their Chrome profile. You have a lookup_profile tool to search their browsing history, saved passwords/logins, autofill data (addresses, names, emails, phones), and bookmarks. Use this tool proactively when executing tasks that need the user's personal info or login credentials — don't ask the user for info that's available in their profile.` : ''}

VM TOOLS: When a task needs an isolated environment or a different OS, use open_vm to launch a QEMU VM.
- All OSes (Linux, macOS, Windows) run via QEMU with HVF acceleration
- Set headless=true for SSH-only (fast, lightweight) or headless=false for a GUI window
- Specify the os if you know which is needed, or omit it to let the user choose
- Once running, use run_command with the provided SSH command to operate inside the VM
- QEMU Guest Agent socket is also available for direct command execution without SSH
- Multiple VMs can run in parallel${Object.keys(useStore.getState().runningVMs || {}).length > 0 ? `
ACTIVE VMs: ${JSON.stringify(Object.values(useStore.getState().runningVMs).map(vm => ({ name: vm.id, os: vm.os, ip: vm.ip, status: vm.status, exec: vm.execCommand })))}` : ''}`
  };

  const requestBody = {
    model: effectiveModel,
    messages: [systemMessage, ...openRouterMessages],
    max_tokens: 16384,
  };

  // Add extended thinking for Claude models when planning mode is enabled
  // OpenRouter uses the unified `reasoning` parameter (not Anthropic's native `thinking`)
  if (options.planningMode) {
    requestBody.reasoning = {
      max_tokens: 10000
    };
  }

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

  // Extract reasoning/thinking content from OpenRouter response
  // OpenRouter returns it as `reasoning` (string) or `reasoning_details` (array of {type, content})
  let reasoning = null;
  if (message.reasoning) {
    reasoning = message.reasoning;
  } else if (message.reasoning_details) {
    reasoning = message.reasoning_details
      .filter(r => r.type === 'thinking' && r.content)
      .map(r => r.content)
      .join('\n');
  }

  // Return structured response
  return {
    content: message.content || '',
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    stopReason: data.choices[0].finish_reason,
    reasoning: reasoning
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

  // Prepend system message with tool usage instructions
  const ollamaSystemMessage = {
    role: 'system',
    content: `You are a helpful assistant with access to a desktop environment. You have tools for file operations, shell commands, and a built-in browser.

BROWSER TOOLS: When the user asks you to visit websites, look things up on the web, interact with web pages, or do anything that requires a browser:
- Use browser_navigate to open URLs in the built-in browser panel (NOT external browsers)
- Use browser_script to execute JavaScript on the loaded page (read DOM, click buttons, fill forms, extract data)
- The browser is a real Chromium webview — you can interact with any website
- Always use browser_navigate first to load a page, then browser_script to interact with it

CHECKLIST TOOLS: When executing a multi-step plan:
- Use set_checklist at the start to show all steps in a progress overlay
- Use update_checklist_step to mark each step as "running" when you start it, "done" when complete, or "error" if it fails

Always prefer using the built-in browser tools over trying to answer from memory when the user asks to visit or interact with websites.${useStore.getState().chromeProfile ? `

PROFILE DATA: The user has imported their Chrome profile. You have a lookup_profile tool to search their browsing history, saved passwords/logins, autofill data (addresses, names, emails, phones), and bookmarks. Use this tool proactively when executing tasks that need the user's personal info or login credentials — don't ask the user for info that's available in their profile.` : ''}

VM TOOLS: When a task needs an isolated environment or a different OS, use open_vm to launch a QEMU VM.
- All OSes (Linux, macOS, Windows) run via QEMU with HVF acceleration
- Set headless=true for SSH-only (fast, lightweight) or headless=false for a GUI window
- Specify the os if you know which is needed, or omit it to let the user choose
- Once running, use run_command with the provided SSH command to operate inside the VM
- QEMU Guest Agent socket is also available for direct command execution without SSH
- Multiple VMs can run in parallel${Object.keys(useStore.getState().runningVMs || {}).length > 0 ? `
ACTIVE VMs: ${JSON.stringify(Object.values(useStore.getState().runningVMs).map(vm => ({ name: vm.id, os: vm.os, ip: vm.ip, status: vm.status, exec: vm.execCommand })))}` : ''}`
  };

  const requestBody = {
    model,
    messages: [ollamaSystemMessage, ...ollamaMessages],
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

async function callCodex(model, messages, conversationId) {
  // Filter out tool-related messages (Codex handles tools internally)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls && !m.isToolResult);

  // Get the last user message as the prompt
  const lastUserMessage = filteredMessages.filter(m => m.role === 'user').pop();
  const prompt = lastUserMessage ? lastUserMessage.content : '';

  // Lazy-initialize the Codex client
  const initResult = await window.electronAPI.codex.init({});
  if (!initResult.success) {
    throw new Error(`Codex initialization failed: ${initResult.error}`);
  }

  try {
    const result = await window.electronAPI.codex.run({
      conversationId: conversationId || `codex_${Date.now()}`,
      prompt,
      threadOptions: {
        model: model || undefined,
        approvalPolicy: 'on-failure',
        sandboxMode: 'workspace-write',
      }
    });

    // Grab streamed messages before clearing (same pattern as Claude CLI)
    let streamedMessages = [];
    if (conversationId) {
      const streamData = useStore.getState().cliStreamingContent[conversationId];
      if (streamData?.messages?.length > 0) {
        streamedMessages = [...streamData.messages];
      }
      useStore.getState().clearCliStreamingContent(conversationId);
    }

    if (!result.success) {
      // Check if it was aborted
      if (result.code === 143) {
        return {
          content: result.content || '',
          toolCalls: null,
          stopReason: 'interrupted',
          streamedMessages,
        };
      }
      throw new Error(result.error || 'Codex execution failed');
    }

    return {
      content: result.content || '',
      toolCalls: null,
      stopReason: 'stop',
      streamedMessages,
    };
  } catch (error) {
    if (conversationId) {
      useStore.getState().clearCliStreamingContent(conversationId);
    }
    throw new Error(`Codex Error: ${error.message}`);
  }
}

async function callCliChatbot(commandOrModel, messages, conversationId, options = {}) {
  // Redirect codex to SDK-based provider
  if (commandOrModel === 'codex') {
    return await callCodex(null, messages, conversationId);
  }

  // Filter out tool-related messages for CLI chatbots (no tool support)
  const filteredMessages = messages.filter(m => !m.toolResults && !m.toolCalls && !m.isToolResult);

  // Get the last user message as the prompt
  const lastUserMessage = filteredMessages.filter(m => m.role === 'user').pop();
  let prompt = lastUserMessage ? lastUserMessage.content : '';

  // Augment prompt with browser/checklist tool instructions
  // CLI chatbots don't have native tool calling, so we instruct the model to output
  // structured blocks that we parse and execute after the response
  const browserToolInstructions = `

IMPORTANT: You have access to a built-in browser panel and a checklist progress tracker in this desktop app. When you need to use them, output structured tool blocks in your response using this exact format:

%%%TOOL_CALL%%%
{"tool": "browser_navigate", "url": "https://example.com"}
%%%END_TOOL_CALL%%%

%%%TOOL_CALL%%%
{"tool": "browser_script", "script": "document.title"}
%%%END_TOOL_CALL%%%

%%%TOOL_CALL%%%
{"tool": "set_checklist", "steps": [{"id": "step1", "label": "First step"}, {"id": "step2", "label": "Second step"}]}
%%%END_TOOL_CALL%%%

%%%TOOL_CALL%%%
{"tool": "update_checklist_step", "id": "step1", "status": "done"}
%%%END_TOOL_CALL%%%

Available tools:
- browser_navigate: Opens a URL in the built-in browser. Use this for ANY web browsing task. Parameters: {"tool": "browser_navigate", "url": "..."}
- browser_script: Executes JavaScript in the browser page context. Use after navigating. Parameters: {"tool": "browser_script", "script": "..."}
- set_checklist: Shows a progress checklist overlay. Parameters: {"tool": "set_checklist", "steps": [{"id": "...", "label": "..."}]}
- update_checklist_step: Updates a step status (pending/running/done/error/skipped). Parameters: {"tool": "update_checklist_step", "id": "...", "status": "..."}

Rules:
- Always use browser_navigate to visit websites — NEVER tell the user to open a browser manually
- Use browser_script to read page content, click buttons, fill forms, extract data
- For multi-step tasks, use set_checklist at the start and update_checklist_step as you go
- You can include multiple tool blocks in one response — they execute in order
- Put your narration/explanation text between tool blocks so the user sees progress
- browser_script returns the result of the last JS expression as a string`;

  prompt = prompt + browserToolInstructions;

  // Check if we need to prompt for permissions (Claude only)
  let permissionLevel = null;
  if (commandOrModel === 'claude' && conversationId) {
    const store = useStore.getState();
    const storedPermission = store.cliPermissions[conversationId];

    // Determine if we need to show the prompt
    const needsPrompt = !storedPermission
      || storedPermission === 'ask_every_time'
      || storedPermission === 'all_once';

    if (needsPrompt) {
      // Show the modal and wait for user choice
      const userChoice = await new Promise((resolve) => {
        useStore.getState().setPendingCliPermission({
          conversationId,
          resolve
        });
      });
      useStore.getState().setPendingCliPermission(null);

      if (userChoice === 'all') {
        // Allow Always — store permanently for session, send 'all' to main
        useStore.getState().setCliPermission(conversationId, 'all');
        permissionLevel = 'all';
      } else if (userChoice === 'all_once') {
        // Allow Once — grant 'all' this time, but store 'all_once' so we ask again next time
        useStore.getState().setCliPermission(conversationId, 'all_once');
        permissionLevel = 'all';
      } else if (userChoice === 'ask_every_time') {
        // Ask Every Time — grant 'all' this time, but store 'ask_every_time' so we ask again
        useStore.getState().setCliPermission(conversationId, 'ask_every_time');
        permissionLevel = 'all';
      } else {
        // Denied
        useStore.getState().setCliPermission(conversationId, 'denied');
        permissionLevel = 'denied';
      }
    } else {
      // 'all' or 'denied' — use stored permission directly
      permissionLevel = storedPermission;
    }
  }

  try {
    // Claude Code needs longer timeout (15 minutes for complex tasks), others use 2 minutes
    const timeout = commandOrModel === 'claude' ? 900000 : 120000;

    const result = await window.electronAPI.cliChatbots.exec(commandOrModel, prompt, {
      timeout: timeout,
      conversationId: conversationId || null,
      permissionLevel: permissionLevel,
      planningMode: options.planningMode || false
    });

    // Grab streamed messages before clearing (whether success or killed)
    let streamedMessages = [];
    if (conversationId) {
      const streamData = useStore.getState().cliStreamingContent[conversationId];
      if (streamData?.messages?.length > 0) {
        streamedMessages = [...streamData.messages];
      }
      useStore.getState().clearCliStreamingContent(conversationId);
    }

    if (!result.success) {
      // Check if process was killed/aborted (exit code 143 = SIGTERM)
      const wasKilled = result.code === 143 || result.error === 'Command timed out';

      if (wasKilled) {
        // Return what we have so far — caller checks for queued interject messages
        return {
          content: result.stdout || '',
          toolCalls: null,
          stopReason: 'interrupted',
          streamedMessages: streamedMessages
        };
      }

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
      stopReason: 'stop',
      streamedMessages: streamedMessages
    };
  } catch (error) {
    // Clear streaming content on error too
    if (conversationId) {
      useStore.getState().clearCliStreamingContent(conversationId);
    }
    throw new Error(`CLI Chatbot Error: ${error.message}`);
  }
}

// Parse and execute %%%TOOL_CALL%%% blocks from CLI chatbot responses
async function executeEmbeddedToolCalls(content) {
  const toolCallRegex = /%%%TOOL_CALL%%%([\s\S]*?)%%%END_TOOL_CALL%%%/g;
  const matches = [...content.matchAll(toolCallRegex)];

  if (matches.length === 0) return { cleanContent: content, toolExecutions: [] };

  const toolExecutions = [];
  let cleanContent = content;

  for (const match of matches) {
    try {
      const toolData = JSON.parse(match[1].trim());
      const toolName = toolData.tool;

      // Build input object (everything except 'tool' key)
      const input = { ...toolData };
      delete input.tool;

      // Execute the tool
      const result = await executeTool(toolName, input);
      toolExecutions.push({ name: toolName, input, result, raw: match[0] });

      // Replace the tool block with a brief result indicator
      const resultSummary = result.success
        ? (result.message || result.result || 'Done')
        : (result.error || 'Failed');
      cleanContent = cleanContent.replace(match[0], `\n> **${toolName}**: ${resultSummary}\n`);
    } catch (err) {
      toolExecutions.push({ name: 'unknown', input: {}, result: { success: false, error: err.message }, raw: match[0] });
      cleanContent = cleanContent.replace(match[0], `\n> **Tool error**: ${err.message}\n`);
    }
  }

  return { cleanContent, toolExecutions };
}

// Process a conversation independently from UI components
export async function processConversation(nodeId, userMessage, currentMessages, provider, model, context, updateNodeData) {
  console.log('🚀 processConversation called with:', { nodeId, provider, model });

  const store = useStore.getState();
  const { apiKeys, setConversationStatus, setConversationMessages, setConversationLoading, setConversationAbort } = store;

  // Create AbortController for this conversation
  const abortController = new AbortController();
  setConversationAbort(nodeId, () => {
    abortController.abort();
    // Also kill any running CLI/Codex process for this conversation
    if (provider === 'cliChatbot' && window.electronAPI?.cliChatbots?.kill) {
      window.electronAPI.cliChatbots.kill(nodeId);
    }
    if (provider === 'codex' && window.electronAPI?.codex?.kill) {
      window.electronAPI.codex.kill(nodeId);
    }
  });

  // Mark as processing
  setConversationStatus(nodeId, 'processing');
  setConversationLoading(nodeId, true);

  let messages = [...currentMessages, userMessage];

  // Update store with new messages
  setConversationMessages(nodeId, messages);

  // Update node data immediately
  updateNodeData(nodeId, { messages });

  let reprocessingInterject = false;

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
        : (provider === 'codex' || provider === 'cliChatbot')
          ? null
          : apiKeys.openrouter;

      // Get planning mode from store
      const planningMode = useStore.getState().planningMode;
      const response = await callAPI(provider, model, allMessages, apiKeyOrConfig, { planningMode, conversationId: nodeId }, abortController.signal);

      if (response.toolCalls && response.toolCalls.length > 0) {
        // Add assistant message with tool calls
        const assistantMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.content || '',
          toolCalls: response.toolCalls,
          ...(response.reasoning ? { reasoning: response.reasoning } : {}),
        };
        messages = [...messages, assistantMessage];
        setConversationMessages(nodeId, messages);
        updateNodeData(nodeId, { messages });

        // Execute tools
        const toolResults = [];
        for (const toolCall of response.toolCalls) {
          let result;

          // Special handling for Task tool - execute as sub-agent
          if (toolCall.name === 'task') {
            result = await executeSubTask(toolCall.input, context, provider, model, apiKeyOrConfig);
          } else {
            result = await executeTool(toolCall.name, toolCall.input);
          }

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
        // No tool calls — check if there are streamed messages from CLI (tool calls/results)
        if (response.streamedMessages && response.streamedMessages.length > 0) {
          // Inject all streamed tool call/result messages into conversation history
          for (const streamMsg of response.streamedMessages) {
            messages = [...messages, streamMsg];
          }
          setConversationMessages(nodeId, messages);
          updateNodeData(nodeId, { messages });
        }

        const wasInterrupted = response.stopReason === 'interrupted';

        // Add final response text
        // Skip if we already have streamed messages that cover the content (CLI chatbots),
        // UNLESS the streamed messages don't include the final text (e.g. only tool calls)
        let finalContent = response.content || '';
        const hasStreamedMessages = response.streamedMessages && response.streamedMessages.length > 0;
        const lastStreamedText = hasStreamedMessages
          ? response.streamedMessages.filter(m => m.role === 'assistant' && m.content && !m.toolCalls).pop()?.content
          : null;
        const streamCoversContent = hasStreamedMessages && lastStreamedText;

        // Check all content sources for embedded tool calls (%%%TOOL_CALL%%% blocks from CLI chatbots)
        const contentToCheck = streamCoversContent ? lastStreamedText : finalContent;
        if (contentToCheck && contentToCheck.includes('%%%TOOL_CALL%%%')) {
          const { cleanContent, toolExecutions } = await executeEmbeddedToolCalls(contentToCheck);

          if (toolExecutions.length > 0) {
            // If streamed messages contain the tool blocks, update the last streamed assistant message
            if (streamCoversContent) {
              const lastStreamIdx = messages.length - 1;
              // Find and update the last assistant message in streamed messages
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'assistant' && messages[i].content?.includes('%%%TOOL_CALL%%%')) {
                  messages[i] = { ...messages[i], content: cleanContent };
                  break;
                }
              }
              setConversationMessages(nodeId, messages);
              updateNodeData(nodeId, { messages });
            } else if (!wasInterrupted && finalContent) {
              // Add cleaned content as assistant message
              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: cleanContent,
                ...(response.reasoning ? { reasoning: response.reasoning } : {}),
              };
              messages = [...messages, assistantMessage];
              setConversationMessages(nodeId, messages);
              updateNodeData(nodeId, { messages });
            }
          }
        } else if (!wasInterrupted && finalContent && !streamCoversContent) {
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: finalContent,
            ...(response.reasoning ? { reasoning: response.reasoning } : {}),
          };
          messages = [...messages, assistantMessage];
          setConversationMessages(nodeId, messages);
          updateNodeData(nodeId, { messages });
        }

        // Check for queued/interjected messages before stopping
        const currentQueue = useStore.getState().messageQueue[nodeId] || [];
        if (currentQueue.length > 0) {
          // Consume all queued messages
          const queuedContent = currentQueue.map(q => q.content).join('\n\n');
          const interjectedMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: queuedContent,
          };
          messages = [...messages, interjectedMessage];
          setConversationMessages(nodeId, messages);
          updateNodeData(nodeId, { messages });

          // Clear the queue
          useStore.getState().clearMessageQueue(nodeId);

          // Continue the loop to process the interjected message
          continueLoop = true;
        } else {
          // If interrupted with no queued messages, user just wanted to stop
          if (wasInterrupted) {
            // Add partial content if available
            if (finalContent) {
              const partialMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: finalContent,
              };
              messages = [...messages, partialMessage];
              setConversationMessages(nodeId, messages);
              updateNodeData(nodeId, { messages });
            }
          }
          continueLoop = false;
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // User intentionally stopped the response - don't add error message
      console.log('🛑 Conversation aborted by user:', nodeId);
    } else {
      // Don't show error if it was a CLI kill (user pressed stop / interjected)
      const isCliKill = error.message?.includes('Command timed out') || error.message?.includes('Process exited with code 143');
      if (!isCliKill) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${error.message}`,
        };
        messages = [...messages, errorMessage];
        setConversationMessages(nodeId, messages);
        updateNodeData(nodeId, { messages });
      }
    }

    // Even after error/abort, check for queued interject messages and process them
    const errorQueue = useStore.getState().messageQueue[nodeId] || [];
    if (errorQueue.length > 0 && (provider === 'cliChatbot' || provider === 'codex')) {
      const queuedContent = errorQueue.map(q => q.content).join('\n\n');
      const interjectedMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: queuedContent,
      };
      messages = [...messages, interjectedMessage];
      setConversationMessages(nodeId, messages);
      updateNodeData(nodeId, { messages });
      useStore.getState().clearMessageQueue(nodeId);

      // Re-process with the interjected message — keep loading state active
      reprocessingInterject = true;
      processConversation(nodeId, interjectedMessage, messages.slice(0, -1), provider, model, context, updateNodeData);
      return messages;
    }
  } finally {
    // Don't clear loading if we kicked off a new processConversation for an interject
    if (!reprocessingInterject) {
      setConversationStatus(nodeId, 'idle');
      setConversationLoading(nodeId, false);
    }
  }

  return messages;
}

/**
 * Execute a sub-task (Task tool) as an isolated sub-agent conversation
 * Returns the task result with summary
 */
export async function executeSubTask(taskInput, parentContext, provider, model, apiKeyOrConfig) {
  const store = useStore.getState();
  const { setSubTask } = store;

  const { description, context: taskContext, maxIterations = 5 } = taskInput;
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // Initialize task state
  setSubTask(taskId, {
    status: 'running',
    description,
    messages: [],
    blocks: [],
    stats: { toolsUsed: 0, filesRead: 0, filesWritten: 0, duration: 0 },
    result: null
  });

  // Create sub-agent system prompt
  const subSystemPrompt = `You are a focused sub-agent working on a specific task.

TASK: ${description}
${taskContext ? `CONTEXT: ${taskContext}` : ''}

You have access to tools: read_file, write_file, list_directory, run_command, file_exists, create_directory, delete_file, get_file_info, grep, glob.
Work efficiently to complete the task, then provide a clear summary.
Do not ask for clarification - make reasonable assumptions.
When done, your final message should summarize what you found/did.`;

  // Initialize sub-conversation
  const subMessages = [
    { role: 'user', content: `Please complete this task: ${description}` }
  ];

  try {
    let continueLoop = true;
    let loopCount = 0;
    const stats = { toolsUsed: 0, filesRead: 0, filesWritten: 0 };

    while (continueLoop && loopCount < maxIterations) {
      loopCount++;

      // Build messages with system prompt
      const allMessages = [
        { role: 'system', content: subSystemPrompt },
        ...subMessages
      ];

      const response = await callAPI(provider, model, allMessages, apiKeyOrConfig);

      if (response.toolCalls && response.toolCalls.length > 0) {
        // Add assistant message with tool calls
        const assistantMessage = {
          id: `${taskId}_${Date.now()}`,
          role: 'assistant',
          content: response.content || '',
          toolCalls: response.toolCalls,
        };
        subMessages.push(assistantMessage);

        // Execute tools (excluding nested task tools to prevent infinite recursion)
        const toolResults = [];
        for (const toolCall of response.toolCalls) {
          // Prevent nested task execution for now
          if (toolCall.name === 'task') {
            toolResults.push({
              tool_use_id: toolCall.id,
              name: toolCall.name,
              input: toolCall.input,
              result: { success: false, error: 'Nested tasks are not supported in sub-agents' }
            });
            continue;
          }

          const result = await executeTool(toolCall.name, toolCall.input);
          stats.toolsUsed++;

          // Track file operations
          if (toolCall.name === 'read_file') stats.filesRead++;
          if (toolCall.name === 'write_file') stats.filesWritten++;

          toolResults.push({
            tool_use_id: toolCall.id,
            name: toolCall.name,
            input: toolCall.input,
            result: result
          });
        }

        // Add tool results
        const toolResultMessage = {
          id: `${taskId}_${Date.now() + 1}`,
          role: 'user',
          content: '',
          toolResults: toolResults,
          isToolResult: true,
        };
        subMessages.push(toolResultMessage);

        // Update task state
        setSubTask(taskId, {
          messages: subMessages,
          stats: { ...stats, duration: Date.now() - startTime }
        });

      } else {
        // No tool calls, task is complete
        const assistantMessage = {
          id: `${taskId}_${Date.now() + 1}`,
          role: 'assistant',
          content: response.content || '',
        };
        subMessages.push(assistantMessage);
        continueLoop = false;
      }
    }

    // Extract summary from last assistant message
    const lastAssistant = subMessages.filter(m => m.role === 'assistant' && !m.toolCalls).pop();
    const summary = lastAssistant?.content || 'Task completed';

    // Finalize task
    const finalStats = { ...stats, duration: Date.now() - startTime };
    setSubTask(taskId, {
      status: 'complete',
      messages: subMessages,
      stats: finalStats,
      result: { summary, findings: [] }
    });

    return {
      success: true,
      taskId,
      description,
      status: 'complete',
      summary,
      stats: finalStats,
      messages: subMessages
    };

  } catch (error) {
    setSubTask(taskId, {
      status: 'error',
      error: error.message,
      stats: { toolsUsed: 0, duration: Date.now() - startTime }
    });

    return {
      success: false,
      taskId,
      description,
      status: 'error',
      error: error.message
    };
  }
}
