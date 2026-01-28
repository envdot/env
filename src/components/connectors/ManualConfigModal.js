/**
 * ManualConfigModal - Configuration modal for MANUAL profile servers
 * Allows user to specify transport type and connection details
 */

import React, { useState } from 'react';

function ManualConfigModal({ item, onClose, onSave }) {
  const [config, setConfig] = useState({
    transport: 'stdio',
    command: item.runCommand || '',
    args: item.args?.join(', ') || '',
    url: item.remoteEndpoint || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const savedConfig = {
      id: item.id,
      transport: config.transport,
      ...(config.transport === 'stdio' ? {
        command: config.command,
        args: config.args.split(',').map(a => a.trim()).filter(Boolean),
      } : {
        url: config.url,
      }),
    };

    onSave(savedConfig);
    onClose();
  };

  return (
    <div className="manual-config-modal-backdrop" onClick={onClose}>
      <div className="manual-config-modal" onClick={e => e.stopPropagation()}>
        <div className="manual-config-modal__header">
          <h3>Configure {item.name}</h3>
          <button className="manual-config-modal__close" onClick={onClose}>
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="manual-config-modal__body">
            <p className="manual-config-modal__description">
              This server's connection details couldn't be detected automatically.
              Please provide the configuration below.
            </p>

            <div className="manual-config-modal__field">
              <label>Transport Type</label>
              <select
                value={config.transport}
                onChange={(e) => setConfig({ ...config, transport: e.target.value })}
              >
                <option value="stdio">Stdio (Local Command)</option>
                <option value="http">HTTP (Remote URL)</option>
                <option value="sse">SSE (Server-Sent Events)</option>
              </select>
            </div>

            {config.transport === 'stdio' ? (
              <>
                <div className="manual-config-modal__field">
                  <label>Command</label>
                  <input
                    type="text"
                    placeholder="e.g., npx, node, python"
                    value={config.command}
                    onChange={(e) => setConfig({ ...config, command: e.target.value })}
                    required
                  />
                </div>
                <div className="manual-config-modal__field">
                  <label>Arguments (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., @mcp/server, --port, 3000"
                    value={config.args}
                    onChange={(e) => setConfig({ ...config, args: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <div className="manual-config-modal__field">
                <label>Server URL</label>
                <input
                  type="url"
                  placeholder="https://mcp.example.com"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  required
                />
              </div>
            )}

            {item.raw && (
              <details className="manual-config-modal__raw">
                <summary>Raw Server Data</summary>
                <pre>{JSON.stringify(item.raw, null, 2)}</pre>
              </details>
            )}
          </div>

          <div className="manual-config-modal__footer">
            <button type="button" className="manual-config-modal__btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="manual-config-modal__btn--save">
              Save & Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default ManualConfigModal;
