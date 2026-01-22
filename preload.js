const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },
  runAppleScript: (script) => ipcRenderer.invoke('run-applescript', script),

  // File System APIs
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs-write-file', filePath, content),
    listDir: (dirPath) => ipcRenderer.invoke('fs-list-dir', dirPath),
    exists: (filePath) => ipcRenderer.invoke('fs-exists', filePath),
    mkdir: (dirPath) => ipcRenderer.invoke('fs-mkdir', dirPath),
    delete: (filePath) => ipcRenderer.invoke('fs-delete', filePath),
    stat: (filePath) => ipcRenderer.invoke('fs-stat', filePath)
  },

  // Shell/Terminal APIs
  shell: {
    exec: (command, options) => ipcRenderer.invoke('shell-exec', command, options),
    cwd: () => ipcRenderer.invoke('shell-cwd'),
    home: () => ipcRenderer.invoke('shell-home')
  },

  // CLI Chatbot APIs
  cliChatbots: {
    detect: () => ipcRenderer.invoke('detect-cli-chatbots'),
    exec: (command, prompt, options) => ipcRenderer.invoke('cli-chatbot-exec', command, prompt, options)
  }
});
