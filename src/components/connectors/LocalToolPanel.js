/**
 * LocalToolPanel - Inline expansion panel for LOCAL_TOOL profile
 * Shows install/run status and controls
 */

import React, { useState } from 'react';
import { ConnectionState } from '../../types/connectionProfiles';

function LocalToolPanel({ item, connectionState, onInstall, onStart, onStop, onViewLogs }) {
  const [showLogs, setShowLogs] = useState(false);

  const state = connectionState?.state || ConnectionState.NOT_INSTALLED;
  const isInstalled = state === ConnectionState.INSTALLED ||
    state === ConnectionState.RUNNING ||
    state === ConnectionState.STOPPED;
  const isRunning = state === ConnectionState.RUNNING || state === ConnectionState.CONNECTED;
  const hasError = state === ConnectionState.ERROR;
  const errorMessage = connectionState?.error;

  const handleViewLogs = () => {
    setShowLogs(!showLogs);
    if (onViewLogs) onViewLogs(item.id);
  };

  return (
    <div className="local-tool-panel">
      {/* Installation Section */}
      <div className="local-tool-panel__section">
        <div className="local-tool-panel__row">
          <span className={`local-tool-panel__status ${isInstalled ? 'installed' : 'not-installed'}`}>
            {isInstalled ? (
              <>
                <CheckIcon /> Installed
              </>
            ) : (
              <>
                <CircleIcon /> Not Installed
              </>
            )}
          </span>
          {!isInstalled && item.installCommand && (
            <button
              className="local-tool-panel__btn local-tool-panel__btn--install"
              onClick={() => onInstall(item.id, item.installCommand)}
              disabled={state === ConnectionState.CONNECTING}
            >
              Install
            </button>
          )}
        </div>
        {!isInstalled && item.installCommand && (
          <code className="local-tool-panel__command">{item.installCommand}</code>
        )}
      </div>

      {/* Run Section */}
      {isInstalled && (
        <div className="local-tool-panel__section">
          <div className="local-tool-panel__row">
            <span className={`local-tool-panel__status ${isRunning ? 'running' : 'stopped'}`}>
              {isRunning ? (
                <>
                  <PlayIcon /> Running
                </>
              ) : (
                <>
                  <StopIcon /> Stopped
                </>
              )}
            </span>
            <div className="local-tool-panel__actions">
              {isRunning ? (
                <button
                  className="local-tool-panel__btn local-tool-panel__btn--stop"
                  onClick={() => onStop(item.id)}
                >
                  Stop
                </button>
              ) : (
                <button
                  className="local-tool-panel__btn local-tool-panel__btn--start"
                  onClick={() => onStart(item.id, item.runCommand, item.args)}
                  disabled={state === ConnectionState.CONNECTING}
                >
                  {state === ConnectionState.CONNECTING ? 'Starting...' : 'Start'}
                </button>
              )}
              <button
                className="local-tool-panel__btn local-tool-panel__btn--logs"
                onClick={handleViewLogs}
              >
                {showLogs ? 'Hide Logs' : 'View Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Section */}
      {hasError && errorMessage && (
        <div className="local-tool-panel__error">
          <WarningIcon /> {errorMessage}
        </div>
      )}

      {/* Logs Section */}
      {showLogs && connectionState?.logs && (
        <div className="local-tool-panel__logs">
          <pre>{connectionState.logs}</pre>
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

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default LocalToolPanel;
