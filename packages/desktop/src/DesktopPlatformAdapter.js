/**
 * Desktop Platform Adapter — thin wrapper around window.electronAPI
 * Implements the PlatformAdapter interface for the Electron desktop app.
 */

export class DesktopPlatformAdapter {
  constructor() {
    const api = window.electronAPI;
    if (!api) {
      throw new Error('DesktopPlatformAdapter requires window.electronAPI (Electron preload)');
    }
    this._api = api;
  }

  get capabilities() {
    return {
      hasFileSystem: true,
      hasShell: true,
      hasCliChatbots: true,
      hasCodex: true,
      hasMcpLocal: true,
      hasMcpHostApps: true,
      hasChromeImport: true,
      hasMultiWindow: true,
      hasAppleScript: true,
    };
  }

  get store() { return this._api.store; }
  get fs() { return this._api.fs; }
  get shell() { return this._api.shell; }
  get claude() { return this._api.claude; }
  get cliChatbots() { return this._api.cliChatbots; }
  get codex() { return this._api.codex; }
  get window() { return this._api.window; }
  get mcp() { return this._api.mcp; }
  get chromeProfile() { return this._api.chromeProfile; }
  get billing() { return this._api.billing; }

  openExternal(url) { return this._api.openExternal(url); }
  runAppleScript(script) { return this._api.runAppleScript(script); }
  openFileInViewer(filePath) { return this._api.openFileInViewer(filePath); }
}
