/**
 * HostAppPanel - Inline expansion panel for HOST_APP_ATTACH profile
 * Shows preflight checklist for host app integration
 */

import React from 'react';
import { ConnectionState } from '../../types/connectionProfiles';

function HostAppPanel({ item, connectionState, onDetectApp, onInstallPlugin, onLaunchAndAttach }) {
  const state = connectionState?.state || ConnectionState.APP_NOT_FOUND;
  const appPath = connectionState?.appPath;
  const pluginInstalled = connectionState?.pluginInstalled || false;
  const appRunning = connectionState?.appRunning || false;
  const errorMessage = connectionState?.error;

  const appDetected = state !== ConnectionState.APP_NOT_FOUND && appPath;
  const isAttached = state === ConnectionState.ATTACHED || state === ConnectionState.CONNECTED;

  // Format host app name for display
  const hostAppDisplay = item.hostApp ?
    item.hostApp.charAt(0).toUpperCase() + item.hostApp.slice(1) :
    'Host App';

  return (
    <div className="host-app-panel">
      {/* App Detection */}
      <div className="host-app-panel__item">
        <span className={`host-app-panel__check ${appDetected ? 'success' : 'pending'}`}>
          {appDetected ? <CheckIcon /> : <CircleIcon />}
        </span>
        <div className="host-app-panel__content">
          <span className="host-app-panel__label">
            {appDetected ? `${hostAppDisplay} detected` : `${hostAppDisplay} not found`}
          </span>
          {appDetected && appPath && (
            <span className="host-app-panel__path">{appPath}</span>
          )}
        </div>
        {!appDetected && (
          <button
            className="host-app-panel__btn"
            onClick={() => onDetectApp(item.hostApp)}
          >
            Detect
          </button>
        )}
      </div>

      {/* Plugin Installation */}
      {item.pluginRequired && (
        <div className="host-app-panel__item">
          <span className={`host-app-panel__check ${pluginInstalled ? 'success' : 'error'}`}>
            {pluginInstalled ? <CheckIcon /> : <XIcon />}
          </span>
          <div className="host-app-panel__content">
            <span className="host-app-panel__label">
              {pluginInstalled ? 'Plugin installed' : 'Plugin not installed'}
            </span>
          </div>
          {!pluginInstalled && appDetected && (
            <button
              className="host-app-panel__btn"
              onClick={() => onInstallPlugin(item.id, item.hostApp)}
            >
              Install Plugin
            </button>
          )}
        </div>
      )}

      {/* App Running Status */}
      <div className="host-app-panel__item">
        <span className={`host-app-panel__check ${appRunning || isAttached ? 'success' : 'pending'}`}>
          {appRunning || isAttached ? <CheckIcon /> : <CircleIcon />}
        </span>
        <div className="host-app-panel__content">
          <span className="host-app-panel__label">
            {isAttached ? `Attached to ${hostAppDisplay}` :
              appRunning ? `${hostAppDisplay} running` :
                `${hostAppDisplay} not running`}
          </span>
        </div>
        {appDetected && (!item.pluginRequired || pluginInstalled) && !isAttached && (
          <button
            className="host-app-panel__btn host-app-panel__btn--primary"
            onClick={() => onLaunchAndAttach(item.id, appPath)}
          >
            {appRunning ? 'Attach' : 'Launch & Attach'}
          </button>
        )}
      </div>

      {/* Warning */}
      <div className="host-app-panel__warning">
        <WarningIcon />
        <span>This grants control over {hostAppDisplay}</span>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="host-app-panel__error">
          <WarningIcon /> {errorMessage}
        </div>
      )}
    </div>
  );
}

// Icons
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default HostAppPanel;
