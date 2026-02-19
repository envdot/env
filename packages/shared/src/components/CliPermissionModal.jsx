import React from 'react';

/**
 * CLI Permission Modal - Prompts user before granting Claude CLI tool access.
 *
 * Permission levels:
 * - 'all'            → Allow always for this session (no more prompts)
 * - 'all_once'       → Allow this one call, then ask again
 * - 'ask_every_time' → Always ask before each call
 * - 'denied'         → No tool access
 */
export function CliPermissionModal({ visible, onAllowAlways, onAllowOnce, onAskEveryTime, onDeny }) {
  if (!visible) return null;

  return (
    <div className="cli-permission-overlay">
      <div className="cli-permission-modal">
        <div className="cli-permission-header">
          <span className="cli-permission-icon">🔐</span>
          <span className="cli-permission-title">Tool Permissions</span>
        </div>

        <div className="cli-permission-body">
          <p className="cli-permission-message">
            Claude Code wants to use tools (file read/write, bash commands, web fetch).
          </p>

          <div className="cli-permission-options">
            <div className="cli-permission-option" onClick={onAllowAlways}>
              <strong>Allow Always</strong>
              <span className="cli-permission-desc">
                Full tool access for this entire session — won't ask again
              </span>
            </div>
            <div className="cli-permission-option" onClick={onAllowOnce}>
              <strong>Allow Once</strong>
              <span className="cli-permission-desc">
                Allow this one request, then ask again next time
              </span>
            </div>
            <div className="cli-permission-option" onClick={onAskEveryTime}>
              <strong>Ask Every Time</strong>
              <span className="cli-permission-desc">
                Prompt me before every Claude CLI call
              </span>
            </div>
            <div className="cli-permission-option" onClick={onDeny}>
              <strong>Deny</strong>
              <span className="cli-permission-desc">
                No tool access — conversation only
              </span>
            </div>
          </div>
        </div>

        <div className="cli-permission-actions">
          <button
            className="cli-permission-btn cli-permission-btn-deny"
            onClick={onDeny}
          >
            Deny
          </button>
          <button
            className="cli-permission-btn cli-permission-btn-readonly"
            onClick={onAskEveryTime}
          >
            Ask Every Time
          </button>
          <button
            className="cli-permission-btn cli-permission-btn-once"
            onClick={onAllowOnce}
          >
            Allow Once
          </button>
          <button
            className="cli-permission-btn cli-permission-btn-allow"
            onClick={onAllowAlways}
          >
            Allow Always
          </button>
        </div>
      </div>
    </div>
  );
}

export default CliPermissionModal;
