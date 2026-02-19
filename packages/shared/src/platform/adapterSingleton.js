/**
 * Module-level platform adapter singleton.
 * Used by non-React code (store, executeTool, callAPI) that can't use hooks.
 *
 * Usage:
 *   import { setPlatformAdapter, getPlatformAdapter } from './platform/adapterSingleton';
 *
 *   // In platform entry (desktop/web index.js):
 *   setPlatformAdapter(new DesktopPlatformAdapter());
 *
 *   // In shared code:
 *   const adapter = getPlatformAdapter();
 *   await adapter.fs.readFile('/some/path');
 */

/** @type {import('./types').PlatformAdapter | null} */
let _adapter = null;

/**
 * Set the platform adapter. Must be called once at app startup before any shared code runs.
 * @param {import('./types').PlatformAdapter} adapter
 */
export function setPlatformAdapter(adapter) {
  _adapter = adapter;
}

/**
 * Get the current platform adapter. Throws if not yet set.
 * @returns {import('./types').PlatformAdapter}
 */
export function getPlatformAdapter() {
  if (!_adapter) {
    throw new Error('PlatformAdapter not initialized. Call setPlatformAdapter() at app startup.');
  }
  return _adapter;
}
