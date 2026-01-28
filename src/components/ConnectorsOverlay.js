import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { WEB_MCP_SERVERS, DESKTOP_MCP_SERVERS } from '../mcpRegistry';
import { getMcpIcon, CustomIcon } from './McpIcons';
import { ConnectionProfile, ProfileMeta, ConnectionState } from '../types/connectionProfiles';
import { normalizeServer, createCustomConnectorItem } from '../utils/serverNormalizer';
import { searchServers, getRegistryInfo } from '../utils/mcpRegistryClient';
import ProfileBadge from './connectors/ProfileBadge';
import LocalToolPanel from './connectors/LocalToolPanel';
import HostAppPanel from './connectors/HostAppPanel';
import ManualConfigModal from './connectors/ManualConfigModal';

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
  const gridRef = useRef(null);
  const [activeTab, setActiveTab] = useState('web');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [showManualConfig, setShowManualConfig] = useState(null);
  const [hybridDropdown, setHybridDropdown] = useState(null);

  // Registry state
  const [registryOffset, setRegistryOffset] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const registryInfo = useMemo(() => getRegistryInfo(), []);

  // Form state for adding custom MCP
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    transport: 'stdio',
    command: '',
    args: '',
    url: '',
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setRegistryOffset(0); // Reset pagination on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get registry servers (synchronous - from local JSON)
  const registryResult = useMemo(() => {
    if (activeTab !== 'registry') return { servers: [], total: 0, hasMore: false };
    return searchServers(debouncedSearch, 50 + registryOffset, 0);
  }, [activeTab, debouncedSearch, registryOffset]);

  const registryServers = registryResult.servers;
  const registryHasMore = registryResult.hasMore;
  const registryTotal = registryResult.total;

  // Load more servers (pagination)
  const loadMoreServers = useCallback(() => {
    if (!registryHasMore) return;
    setRegistryOffset(prev => prev + 50);
  }, [registryHasMore]);

  // Infinite scroll handler
  useEffect(() => {
    if (activeTab !== 'registry') return;

    const grid = gridRef.current;
    if (!grid) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = grid;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMoreServers();
      }
    };

    grid.addEventListener('scroll', handleScroll);
    return () => grid.removeEventListener('scroll', handleScroll);
  }, [activeTab, loadMoreServers]);

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

  // Close hybrid dropdown on outside click
  useEffect(() => {
    if (!hybridDropdown) return;
    const handleClick = () => setHybridDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [hybridDropdown]);

  // Normalize servers with memoization
  const normalizedServers = useMemo(() => {
    const webNormalized = WEB_MCP_SERVERS.map(s => normalizeServer(s, 'web'));
    const desktopNormalized = DESKTOP_MCP_SERVERS.map(s => normalizeServer(s, 'desktop'));
    const customNormalized = (mcpServers.custom || []).map(s => createCustomConnectorItem(s));

    return {
      web: webNormalized,
      desktop: desktopNormalized,
      'custom-mcp': customNormalized,
    };
  }, [mcpServers.custom]);

  // Get servers for the current tab
  const getServersForTab = useCallback(() => {
    if (activeTab === 'registry') {
      return registryServers;
    }

    let servers = normalizedServers[activeTab] || [];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      servers = servers.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    return servers;
  }, [activeTab, searchQuery, normalizedServers, registryServers]);

  // Toggle card expansion
  const toggleCardExpansion = (serverId) => {
    setExpandedCards(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  // Handle connect for CLOUD_API
  const handleCloudConnect = async (item) => {
    updateMcpConnection(item.id, { status: 'connecting', tools: [], error: null });

    try {
      if (window.electronAPI?.mcp) {
        const result = await window.electronAPI.mcp.connect(item.id, item.raw || item);
        if (result.success) {
          const toolsResult = await window.electronAPI.mcp.listTools(item.id);
          updateMcpConnection(item.id, {
            status: 'connected',
            tools: toolsResult.tools || [],
            error: null
          });
        } else {
          updateMcpConnection(item.id, {
            status: 'error',
            error: result.error || 'Failed to connect'
          });
        }
      } else {
        // Simulate connection for UI testing
        setTimeout(() => {
          updateMcpConnection(item.id, {
            status: 'connected',
            tools: [{ name: 'example_tool', description: 'Example tool' }],
            error: null
          });
        }, 1000);
      }
    } catch (error) {
      updateMcpConnection(item.id, {
        status: 'error',
        error: error.message
      });
    }
  };

  // Handle disconnect
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

  // Handle install for LOCAL_TOOL
  const handleInstall = async (serverId, installCommand) => {
    updateMcpConnection(serverId, { state: ConnectionState.CONNECTING, error: null });
    try {
      if (window.electronAPI?.mcp?.installServer) {
        const result = await window.electronAPI.mcp.installServer(serverId, installCommand);
        if (result.success) {
          updateMcpConnection(serverId, { state: ConnectionState.INSTALLED, error: null });
        } else {
          updateMcpConnection(serverId, { state: ConnectionState.ERROR, error: result.error });
        }
      } else {
        // Simulate for UI testing
        setTimeout(() => {
          updateMcpConnection(serverId, { state: ConnectionState.INSTALLED, error: null });
        }, 1500);
      }
    } catch (error) {
      updateMcpConnection(serverId, { state: ConnectionState.ERROR, error: error.message });
    }
  };

  // Handle start for LOCAL_TOOL
  const handleStart = async (serverId, command, args) => {
    updateMcpConnection(serverId, { state: ConnectionState.CONNECTING, error: null });
    try {
      if (window.electronAPI?.mcp?.startServer) {
        const result = await window.electronAPI.mcp.startServer(serverId, command, args);
        if (result.success) {
          updateMcpConnection(serverId, { state: ConnectionState.RUNNING, status: 'connected', tools: result.tools || [], error: null });
        } else {
          updateMcpConnection(serverId, { state: ConnectionState.ERROR, error: result.error });
        }
      } else {
        // Simulate for UI testing
        setTimeout(() => {
          updateMcpConnection(serverId, {
            state: ConnectionState.RUNNING,
            status: 'connected',
            tools: [{ name: 'example_tool' }],
            error: null
          });
        }, 1000);
      }
    } catch (error) {
      updateMcpConnection(serverId, { state: ConnectionState.ERROR, error: error.message });
    }
  };

  // Handle stop for LOCAL_TOOL
  const handleStop = async (serverId) => {
    try {
      if (window.electronAPI?.mcp?.stopServer) {
        await window.electronAPI.mcp.stopServer(serverId);
      }
      updateMcpConnection(serverId, { state: ConnectionState.STOPPED, status: 'disconnected', tools: [] });
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  // Handle view logs
  const handleViewLogs = async (serverId) => {
    if (window.electronAPI?.mcp?.streamLogs) {
      const logs = await window.electronAPI.mcp.streamLogs(serverId);
      updateMcpConnection(serverId, { logs });
    }
  };

  // Handle host app detection
  const handleDetectApp = async (appName) => {
    if (window.electronAPI?.mcp?.detectHostApp) {
      const result = await window.electronAPI.mcp.detectHostApp(appName);
      return result;
    }
    return { found: false };
  };

  // Handle plugin installation
  const handleInstallPlugin = async (serverId, appName) => {
    console.log('Install plugin for', appName);
  };

  // Handle launch and attach
  const handleLaunchAndAttach = async (serverId, appPath) => {
    if (window.electronAPI?.mcp?.launchHostApp) {
      await window.electronAPI.mcp.launchHostApp(appPath);
    }
    handleCloudConnect({ id: serverId });
  };

  // Handle manual config save
  const handleManualConfigSave = (config) => {
    handleCloudConnect({ id: config.id, ...config });
    setShowManualConfig(null);
  };

  // Handle adding custom MCP server
  const handleAddCustomServer = (e) => {
    e.preventDefault();

    const newServer = {
      id: `custom-${Date.now()}`,
      name: customForm.name,
      description: customForm.description || 'Custom MCP server',
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

  // Get button label based on profile
  const getButtonLabel = (item, connection) => {
    const isConnected = connection?.status === 'connected';
    const isConnecting = connection?.status === 'connecting' || connection?.state === ConnectionState.CONNECTING;

    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Disconnect';

    const meta = ProfileMeta[item.profile];
    return meta?.buttonLabel || 'Connect';
  };

  // Handle primary action based on profile
  const handlePrimaryAction = (item, connection) => {
    const isConnected = connection?.status === 'connected';

    if (isConnected) {
      handleDisconnect(item.id);
      return;
    }

    switch (item.profile) {
      case ConnectionProfile.CLOUD_API:
        handleCloudConnect(item);
        break;
      case ConnectionProfile.LOCAL_TOOL:
      case ConnectionProfile.HOST_APP_ATTACH:
        toggleCardExpansion(item.id);
        break;
      case ConnectionProfile.HYBRID:
        // Show dropdown
        break;
      case ConnectionProfile.MANUAL:
        setShowManualConfig(item);
        break;
      default:
        handleCloudConnect(item);
    }
  };

  // Render a server card with profile-aware UI
  const renderServerCard = (item) => {
    const connection = mcpConnections[item.id] || { status: 'disconnected' };
    const isConnected = connection.status === 'connected';
    const isConnecting = connection.status === 'connecting' || connection.state === ConnectionState.CONNECTING;
    const hasError = connection.status === 'error' || connection.state === ConnectionState.ERROR;
    const toolCount = connection.tools?.length || 0;
    const isExpanded = expandedCards[item.id];
    const showDropdown = hybridDropdown === item.id;

    // Determine if we should show expansion panel
    const hasExpansionPanel = item.profile === ConnectionProfile.LOCAL_TOOL ||
      item.profile === ConnectionProfile.HOST_APP_ATTACH;

    return (
      <div
        key={item.id}
        className={`connector-card ${isConnected ? 'connected' : ''} ${hasError ? 'error' : ''} ${isExpanded ? 'expanded' : ''}`}
      >
        <div className="connector-card__main">
          <div className="connector-icon">
            {item.source === 'custom' ? (
              <CustomIcon size={24} />
            ) : item.iconUrl ? (
              <img src={item.iconUrl} alt="" width={24} height={24} />
            ) : (
              getMcpIcon(item.id, 24)
            )}
          </div>
          <div className="connector-info">
            <div className="connector-name-row">
              <span className="connector-name">{item.name}</span>
              {activeTab === 'registry' && <ProfileBadge profile={item.profile} size="small" />}
              {item.verified && (
                <span className="connector-verified" title="Verified">
                  <VerifiedIcon />
                </span>
              )}
            </div>
            <div className="connector-description">{item.description}</div>
            {item.useCount > 0 && (
              <div className="connector-use-count">
                <StarIcon /> {formatUseCount(item.useCount)} uses
              </div>
            )}
            {isConnected && toolCount > 0 && (
              <div className="connector-tools-count">
                {toolCount} tool{toolCount !== 1 ? 's' : ''} available
              </div>
            )}
            {hasError && connection.error && (
              <div className="connector-error">{connection.error}</div>
            )}
          </div>
          <div className="connector-actions">
            {activeTab === 'custom-mcp' && !isConnected && (
              <button
                className="connector-delete-btn"
                onClick={() => removeCustomMcpServer(item.id)}
                title="Remove"
              >
                <XIcon />
              </button>
            )}

            {item.profile === ConnectionProfile.HYBRID ? (
              <div className="connector-split-btn">
                <button
                  className={`connector-action-btn ${isConnected ? 'disconnect' : 'connect'}`}
                  onClick={() => isConnected ? handleDisconnect(item.id) : handleCloudConnect(item)}
                  disabled={isConnecting}
                >
                  {getButtonLabel(item, connection)}
                </button>
                <button
                  className="connector-split-btn__dropdown"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHybridDropdown(showDropdown ? null : item.id);
                  }}
                >
                  <ChevronDownIcon />
                </button>
                {showDropdown && (
                  <div className="connector-dropdown">
                    <button onClick={() => { handleCloudConnect(item); setHybridDropdown(null); }}>
                      <CloudIcon /> Cloud
                    </button>
                    <button onClick={() => { toggleCardExpansion(item.id); setHybridDropdown(null); }}>
                      <TerminalIcon /> Local Agent
                    </button>
                  </div>
                )}
              </div>
            ) : hasExpansionPanel && !isConnected ? (
              <button
                className={`connector-action-btn expand ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleCardExpansion(item.id)}
              >
                {getButtonLabel(item, connection)}
                <ChevronDownIcon />
              </button>
            ) : (
              <button
                className={`connector-action-btn ${isConnected ? 'disconnect' : 'connect'}`}
                onClick={() => handlePrimaryAction(item, connection)}
                disabled={isConnecting}
              >
                {getButtonLabel(item, connection)}
              </button>
            )}
          </div>
        </div>

        {/* Expansion Panels */}
        {isExpanded && item.profile === ConnectionProfile.LOCAL_TOOL && (
          <LocalToolPanel
            item={item}
            connectionState={connection}
            onInstall={handleInstall}
            onStart={handleStart}
            onStop={handleStop}
            onViewLogs={handleViewLogs}
          />
        )}

        {isExpanded && item.profile === ConnectionProfile.HOST_APP_ATTACH && (
          <HostAppPanel
            item={item}
            connectionState={connection}
            onDetectApp={handleDetectApp}
            onInstallPlugin={handleInstallPlugin}
            onLaunchAndAttach={handleLaunchAndAttach}
          />
        )}
      </div>
    );
  };

  const servers = getServersForTab();

  return (
    <div className="connectors-overlay-backdrop" ref={overlayRef}>
      <div className={`connectors-overlay ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="connectors-overlay-close" onClick={onClose}>
          <XIcon />
        </button>

        <div className="connectors-overlay-content">
          <h2 className="connectors-overlay-title">Connectors</h2>

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
                className={`connectors-tab ${activeTab === 'registry' ? 'active' : ''}`}
                onClick={() => setActiveTab('registry')}
              >
                Registry
                <span className="connectors-tab__count">{registryInfo.count.toLocaleString()}</span>
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
                placeholder={activeTab === 'registry' ? `Search ${registryInfo.count.toLocaleString()} servers...` : 'Search'}
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
                  <XIcon />
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
          <div className="connectors-grid" ref={gridRef}>
            {servers.length > 0 ? (
              <>
                {servers.map(renderServerCard)}
                {activeTab === 'registry' && registryHasMore && (
                  <div className="connectors-load-more">
                    <button onClick={loadMoreServers}>
                      Load More ({registryTotal - registryServers.length} remaining)
                    </button>
                  </div>
                )}
              </>
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

      {/* Manual Config Modal */}
      {showManualConfig && (
        <ManualConfigModal
          item={showManualConfig}
          onClose={() => setShowManualConfig(null)}
          onSave={handleManualConfigSave}
        />
      )}
    </div>
  );
}

// Helper function to format use count
function formatUseCount(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

// Icons
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const VerifiedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" fill="#3b82f6" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" />
  </svg>
);

const CloudIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LoadingSpinner = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loading-spinner">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

export default ConnectorsOverlay;
