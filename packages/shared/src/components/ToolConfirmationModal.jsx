import React from 'react';

/**
 * Configuration for which tools need confirmation prompts
 */
export const TOOL_CONFIRMATION_CONFIG = {
  run_command: {
    always: false,
    patterns: [
      /rm\s+-rf/i,           // Dangerous recursive delete
      /rm\s+.*\*/,           // Delete with wildcard
      /sudo/i,               // Privileged commands
      /chmod\s+777/,         // World-writable permissions
      /chmod\s+-R/,          // Recursive permission changes
      /chown/i,              // Ownership changes
      /npm\s+publish/i,      // Publishing packages
      /git\s+push\s+.*-f/i,  // Force push
      /git\s+reset\s+--hard/i, // Hard reset
      /DROP\s+TABLE/i,       // SQL drop
      /DELETE\s+FROM/i,      // SQL delete
      />\s*\/dev\/sd/,       // Write to disk device
    ],
    message: 'This command may have significant effects. Do you want to proceed?'
  },
  delete_file: {
    always: true,
    patterns: [],
    message: 'Are you sure you want to permanently delete this file?'
  },
  write_file: {
    always: false,
    patterns: [
      /\.env$/i,              // Environment files
      /\.env\./i,             // Environment variants
      /config\./i,            // Config files
      /credentials/i,         // Credential files
      /secrets/i,             // Secret files
      /\.pem$/i,              // Certificates
      /\.key$/i,              // Key files
      /\.ssh/i,               // SSH directory
      /id_rsa/i,              // SSH keys
    ],
    message: 'This file may contain sensitive configuration. Do you want to modify it?'
  }
};

/**
 * Check if a tool execution needs user confirmation
 * @returns {object|null} - { message, toolName, input } if confirmation needed, null otherwise
 */
export function checkNeedsConfirmation(toolName, toolInput) {
  const config = TOOL_CONFIRMATION_CONFIG[toolName];
  if (!config) return null;

  // Check if always needs confirmation
  if (config.always) {
    return {
      message: config.message,
      toolName,
      input: toolInput
    };
  }

  // Check patterns
  const valueToCheck = toolName === 'run_command'
    ? toolInput.command
    : toolInput.path;

  if (valueToCheck && config.patterns.length > 0) {
    const matchesPattern = config.patterns.some(pattern => pattern.test(valueToCheck));
    if (matchesPattern) {
      return {
        message: config.message,
        toolName,
        input: toolInput
      };
    }
  }

  return null;
}

/**
 * Format tool input for display
 */
function formatToolInput(toolName, input) {
  switch (toolName) {
    case 'run_command':
      return input.command || '';
    case 'delete_file':
    case 'write_file':
      return input.path || '';
    default:
      return JSON.stringify(input, null, 2);
  }
}

/**
 * Get a friendly label for the tool
 */
function getToolLabel(toolName) {
  switch (toolName) {
    case 'run_command':
      return 'Command';
    case 'delete_file':
      return 'Delete File';
    case 'write_file':
      return 'Write File';
    default:
      return toolName;
  }
}

/**
 * Tool Confirmation Modal Component
 */
export function ToolConfirmationModal({ confirmation, onApprove, onDeny }) {
  if (!confirmation) return null;

  const { message, toolName, input } = confirmation;

  return (
    <div className="tool-confirmation-overlay">
      <div className="tool-confirmation-modal">
        <div className="tool-confirmation-header">
          <span className="tool-confirmation-icon">⚠️</span>
          <span className="tool-confirmation-title">Confirm Action</span>
        </div>

        <div className="tool-confirmation-body">
          <p className="tool-confirmation-message">{message}</p>

          <div className="tool-confirmation-details">
            <div className="tool-confirmation-label">
              {getToolLabel(toolName)}:
            </div>
            <pre className="tool-confirmation-input">
              {formatToolInput(toolName, input)}
            </pre>
          </div>
        </div>

        <div className="tool-confirmation-actions">
          <button
            className="tool-confirmation-btn tool-confirmation-btn-deny"
            onClick={onDeny}
          >
            Cancel
          </button>
          <button
            className="tool-confirmation-btn tool-confirmation-btn-approve"
            onClick={onApprove}
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}

export default ToolConfirmationModal;
