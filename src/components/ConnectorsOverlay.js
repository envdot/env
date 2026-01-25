import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { WEB_MCP_SERVERS, DESKTOP_MCP_SERVERS } from '../mcpRegistry';

function ConnectorsOverlay({ onClose }) {
  const {
    sidebarOpen,
    mcpServers,
    mcpConnections,
    addCustomMcpServer,
    removeCustomMcpServer,
    updateMcpConnection,
    clearMcpConnection,
  } = useStore();

  const overlayRef = useRef(null);
  const [activeTab, setActiveTab] = useState('web');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for adding custom MCP
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    transport: 'stdio',
    command: '',
    args: '',
    url: '',
  });

  // Close on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current === event.target) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Get servers for the current tab
  const getServersForTab = () => {
    let servers = [];

    switch (activeTab) {
      case 'web':
        servers = WEB_MCP_SERVERS;
        break;
      case 'desktop':
        servers = DESKTOP_MCP_SERVERS;
        break;
      case 'custom-mcp':
        servers = mcpServers.custom || [];
        break;
      default:
        servers = [];
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      servers = servers.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    return servers;
  };

  // Handle connect/disconnect
  const handleConnect = async (server) => {
    updateMcpConnection(server.id, { status: 'connecting', tools: [], error: null });

    try {
      // Check if electronAPI.mcp exists
      if (window.electronAPI?.mcp) {
        const result = await window.electronAPI.mcp.connect(server.id, server);
        if (result.success) {
          const toolsResult = await window.electronAPI.mcp.listTools(server.id);
          updateMcpConnection(server.id, {
            status: 'connected',
            tools: toolsResult.tools || [],
            error: null
          });
        } else {
          updateMcpConnection(server.id, {
            status: 'error',
            error: result.error || 'Failed to connect'
          });
        }
      } else {
        // Simulate connection for UI testing when electron API not available
        setTimeout(() => {
          updateMcpConnection(server.id, {
            status: 'connected',
            tools: [{ name: 'example_tool', description: 'Example tool' }],
            error: null
          });
        }, 1000);
      }
    } catch (error) {
      updateMcpConnection(server.id, {
        status: 'error',
        error: error.message
      });
    }
  };

  const handleDisconnect = async (serverId) => {
    try {
      if (window.electronAPI?.mcp) {
        await window.electronAPI.mcp.disconnect(serverId);
      }
      clearMcpConnection(serverId);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      clearMcpConnection(serverId);
    }
  };

  // Handle adding custom MCP server
  const handleAddCustomServer = (e) => {
    e.preventDefault();

    const newServer = {
      id: `custom-${Date.now()}`,
      name: customForm.name,
      description: customForm.description || 'Custom MCP server',
      icon: '🔧',
      type: 'custom',
      transport: customForm.transport,
      ...(customForm.transport === 'stdio' ? {
        command: customForm.command,
        args: customForm.args.split(',').map(a => a.trim()).filter(Boolean),
      } : {
        url: customForm.url,
      }),
    };

    addCustomMcpServer(newServer);
    setShowAddForm(false);
    setCustomForm({
      name: '',
      description: '',
      transport: 'stdio',
      command: '',
      args: '',
      url: '',
    });
  };

  // Render a server card
  const renderServerCard = (server) => {
    const connection = mcpConnections[server.id] || { status: 'disconnected' };
    const isConnected = connection.status === 'connected';
    const isConnecting = connection.status === 'connecting';
    const hasError = connection.status === 'error';
    const toolCount = connection.tools?.length || 0;

    return (
      <div
        key={server.id}
        className={`connector-card ${isConnected ? 'connected' : ''} ${hasError ? 'error' : ''}`}
      >
        <div className="connector-icon">{server.icon}</div>
        <div className="connector-info">
          <div className="connector-name">{server.name}</div>
          <div className="connector-description">{server.description}</div>
          {isConnected && toolCount > 0 && (
            <div className="connector-tools-count">
              {toolCount} tool{toolCount !== 1 ? 's' : ''} available
            </div>
          )}
          {hasError && (
            <div className="connector-error">{connection.error}</div>
          )}
        </div>
        <div className="connector-actions">
          {activeTab === 'custom-mcp' && !isConnected && (
            <button
              className="connector-delete-btn"
              onClick={() => removeCustomMcpServer(server.id)}
              title="Remove"
            >
              ✕
            </button>
          )}
          <button
            className={`connector-action-btn ${isConnected ? 'disconnect' : 'connect'}`}
            onClick={() => isConnected ? handleDisconnect(server.id) : handleConnect(server)}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    );
  };

  const servers = getServersForTab();

  return (
    <div className="connectors-overlay-backdrop" ref={overlayRef}>
      <div className={`connectors-overlay ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="connectors-overlay-close" onClick={onClose}>
          ✕
        </button>

        <div className="connectors-overlay-content">
          <h2 className="connectors-overlay-title">Connectors</h2>

          {/* Top Banner - My Browser */}
          <div className="connectors-banner">
            <div className="connectors-banner-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <div className="connectors-banner-text">
              <div className="connectors-banner-title">My Browser</div>
            </div>
            <button className="connectors-banner-btn">Connect</button>
          </div>

          {/* Tabs */}
          <div className="connectors-tabs">
            <div className="connectors-tabs-left">
              <button
                className={`connectors-tab ${activeTab === 'web' ? 'active' : ''}`}
                onClick={() => setActiveTab('web')}
              >
                Web
              </button>
              <button
                className={`connectors-tab ${activeTab === 'desktop' ? 'active' : ''}`}
                onClick={() => setActiveTab('desktop')}
              >
                Desktop
              </button>
              <button
                className={`connectors-tab ${activeTab === 'custom-mcp' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom-mcp')}
              >
                Custom
              </button>
            </div>
            <div className="connectors-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Add Custom MCP Button (only on custom tab) */}
          {activeTab === 'custom-mcp' && !showAddForm && (
            <button
              className="add-custom-mcp-btn"
              onClick={() => setShowAddForm(true)}
            >
              + Add Custom MCP Server
            </button>
          )}

          {/* Add Custom MCP Form */}
          {activeTab === 'custom-mcp' && showAddForm && (
            <div className="custom-mcp-form">
              <div className="custom-mcp-form-header">
                <h3>Add Custom MCP Server</h3>
                <button
                  className="custom-mcp-form-close"
                  onClick={() => setShowAddForm(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddCustomServer}>
                <input
                  type="text"
                  name="name"
                  placeholder="Server Name"
                  value={customForm.name}
                  onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  name="description"
                  placeholder="Description (optional)"
                  value={customForm.description}
                  onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                />
                <select
                  name="transport"
                  value={customForm.transport}
                  onChange={(e) => setCustomForm({ ...customForm, transport: e.target.value })}
                >
                  <option value="stdio">Stdio (Local Command)</option>
                  <option value="http">HTTP (Remote URL)</option>
                </select>

                {customForm.transport === 'stdio' ? (
                  <>
                    <input
                      type="text"
                      name="command"
                      placeholder="Command (e.g., npx, node, python)"
                      value={customForm.command}
                      onChange={(e) => setCustomForm({ ...customForm, command: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      name="args"
                      placeholder="Arguments (comma-separated)"
                      value={customForm.args}
                      onChange={(e) => setCustomForm({ ...customForm, args: e.target.value })}
                    />
                  </>
                ) : (
                  <input
                    type="url"
                    name="url"
                    placeholder="Server URL (e.g., https://mcp.example.com)"
                    value={customForm.url}
                    onChange={(e) => setCustomForm({ ...customForm, url: e.target.value })}
                    required
                  />
                )}

                <div className="custom-mcp-form-actions">
                  <button
                    type="button"
                    className="custom-mcp-cancel-btn"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="custom-mcp-submit-btn">
                    Add Server
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Server Grid */}
          <div className="connectors-grid">
            {servers.length > 0 ? (
              servers.map(renderServerCard)
            ) : (
              <div className="connectors-empty">
                {activeTab === 'custom-mcp'
                  ? "No custom MCP servers added yet. Click the button above to add one."
                  : searchQuery
                    ? "No servers match your search."
                    : "No servers available."
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectorsOverlay;
