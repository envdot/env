import React, { createContext, useContext } from 'react';

/** @type {React.Context<import('./types').PlatformAdapter | null>} */
const PlatformContext = createContext(null);

/**
 * Provides the platform adapter to all child components.
 * Wrap your <App /> with this in each platform's entry point.
 *
 * @param {{ adapter: import('./types').PlatformAdapter, children: React.ReactNode }} props
 */
export function PlatformProvider({ adapter, children }) {
  return (
    <PlatformContext.Provider value={adapter}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to access the platform adapter in React components.
 * Replaces all direct `window.electronAPI` usage.
 *
 * @returns {import('./types').PlatformAdapter}
 */
export function usePlatform() {
  const adapter = useContext(PlatformContext);
  if (!adapter) {
    throw new Error('usePlatform() must be used within a <PlatformProvider>.');
  }
  return adapter;
}

export default PlatformContext;
