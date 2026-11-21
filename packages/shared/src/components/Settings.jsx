import React, { useState, useEffect, useRef } from 'react';
import { useStore, useProviders } from '../store';
import { usePlatform } from '../platform/PlatformContext';
import ModelDirectory from './ModelDirectory';
import { API_BASE } from '../lib/config';

function Settings({ onClose, currentNode, onModelChange }) {
  const PROVIDERS = useProviders();
  const platform = usePlatform();
  const {
    apiKeys, setApiKeys, sidebarOpen, setSidebarOpen, refreshModels, selectedModels,
    archivedSessions, restoreChatSession, permanentlyDeleteSession, clearArchive,
    user, session, subscription, invoices, subscriptionLoading, signOut, setShowUpgradePlan, fetchSubscription,
    detectedCLIs, setDetectedCLIs,
  } = useStore();
  const [showModelDirectory, setShowModelDirectory] = useState(false);
  const [keys, setKeys] = useState(apiKeys);
  const [selectedProvider, setSelectedProvider] = useState(currentNode?.data?.provider || 'claude');
  const [selectedModel, setSelectedModel] = useState(currentNode?.data?.model || null);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [settingsMode, setSettingsMode] = useState('cloud'); // 'cloud' or 'local'
  const [activeNav, setActiveNav] = useState('general');

  // Profile state - load from localStorage
  const [fullName, setFullName] = useState(() => localStorage.getItem('userFullName') || '');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('userDisplayName') || '');

  // Appearance state
  const [colorMode, setColorMode] = useState('auto');
  const [chatFont, setChatFont] = useState('default');

  // Track previous window width to detect shrinking
  const prevWidthRef = useRef(window.innerWidth);

  // Track if sidebar was auto-closed so we can reopen it
  const sidebarAutoClosedRef = useRef(false);

  // Auto-close sidebar when window shrinks and content would be squeezed
  useEffect(() => {
    const SIDEBAR_WIDTH = 255;
    const SETTINGS_NAV_WIDTH = 180; // nav width + padding (reduced)
    const MIN_CONTENT_WIDTH = 520; // minimum for appearance section
    const CONTENT_PADDING = 70; // left + right padding

    const minRequiredWidth = SETTINGS_NAV_WIDTH + MIN_CONTENT_WIDTH + CONTENT_PADDING;
    const thresholdWidth = SIDEBAR_WIDTH + minRequiredWidth;

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const prevWidth = prevWidthRef.current;

      // When shrinking and sidebar is open
      if (currentWidth < prevWidth && sidebarOpen) {
        const availableForSettings = currentWidth - SIDEBAR_WIDTH;

        if (availableForSettings < minRequiredWidth) {
          setSidebarOpen(false);
          sidebarAutoClosedRef.current = true;
        }
      }

      // When expanding and sidebar was auto-closed, reopen it
      if (currentWidth > prevWidth && !sidebarOpen && sidebarAutoClosedRef.current) {
        if (currentWidth >= thresholdWidth) {
          setSidebarOpen(true);
          sidebarAutoClosedRef.current = false;
        }
      }

      prevWidthRef.current = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, setSidebarOpen]);

  const handleChange = (provider, value) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleRefreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      await refreshModels();
    } catch (error) {
      console.error('Failed to refresh models:', error);
    }
    setIsRefreshingModels(false);
  };

  const handleSave = () => {
    const updatedKeys = {
      ...keys,
      ollamaUrl
    };
    setApiKeys(updatedKeys);
    if (onModelChange && currentNode) {
      onModelChange(selectedModel, selectedProvider);
    }
    // Save profile settings
    localStorage.setItem('userFullName', fullName);
    localStorage.setItem('userDisplayName', displayName);
    window.dispatchEvent(new Event('userProfileUpdated'));
  };

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    // Find the provider for this model
    for (const [providerId, provider] of Object.entries(PROVIDERS)) {
      if (provider.models.some(m => m.id === modelId)) {
        setSelectedProvider(providerId);
        break;
      }
    }
  };

  const [ollamaUrl, setOllamaUrl] = useState(keys.ollamaUrl || 'http://localhost:11434');
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [availableModelsExpanded, setAvailableModelsExpanded] = useState(false);
  const [downloadModelsExpanded, setDownloadModelsExpanded] = useState(false);
  const [detectingCLIs, setDetectingCLIs] = useState(false);
  const [cliToolsExpanded, setCliToolsExpanded] = useState(true);
  const [updatingCLI, setUpdatingCLI] = useState(null); // command name being updated

  const rescanCLIs = async () => {
    setDetectingCLIs(true);
    try {
      const adapter = platform;
      if (adapter?.cliChatbots?.detect) {
        const result = await adapter.cliChatbots.detect({ forceRefresh: true, checkUpdates: true });
        if (result.success) {
          setDetectedCLIs(result.chatbots || []);
        }
      }
    } catch (e) {
      console.warn('CLI rescan failed:', e.message);
    }
    setDetectingCLIs(false);
  };

  const updateCLI = async (command) => {
    setUpdatingCLI(command);
    try {
      const adapter = platform;
      if (adapter?.cliChatbots?.update) {
        const result = await adapter.cliChatbots.update(command);
        if (result.success) {
          // Rescan to pick up new version
          await rescanCLIs();
        } else {
          console.error('CLI update failed:', result.error);
        }
      }
    } catch (e) {
      console.error('CLI update error:', e.message);
    }
    setUpdatingCLI(null);
  };

  // Check Ollama connection and fetch available models
  const checkOllamaConnection = async () => {
    setCheckingConnection(true);
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setOllamaConnected(true);
        setOllamaModels(data.models || []);
      } else {
        setOllamaConnected(false);
        setOllamaModels([]);
      }
    } catch (error) {
      setOllamaConnected(false);
      setOllamaModels([]);
    }
    setCheckingConnection(false);
  };

  // Download/pull an Ollama model
  const downloadOllamaModel = async (modelName) => {
    console.log(`[DOWNLOAD] Starting download for model: ${modelName}`);
    setDownloadingModel(modelName);
    setDownloadProgress({ [modelName]: 'Starting...' });

    try {
      console.log(`[DOWNLOAD] Fetching from: ${ollamaUrl}/api/pull`);
      console.log(`[DOWNLOAD] Request body:`, { name: modelName });

      const response = await fetch(`${ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      console.log(`[DOWNLOAD] Response status: ${response.status}`);
      console.log(`[DOWNLOAD] Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DOWNLOAD] Error response:`, errorText);
        throw new Error(`Failed to start download: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        console.error(`[DOWNLOAD] No response body!`);
        throw new Error('No response body');
      }

      console.log(`[DOWNLOAD] Starting to read stream...`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        chunkCount++;

        if (done) {
          console.log(`[DOWNLOAD] Stream ended after ${chunkCount} chunks`);
          break;
        }

        const chunk = decoder.decode(value);
        console.log(`[DOWNLOAD] Chunk ${chunkCount}:`, chunk.substring(0, 200));

        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            console.log(`[DOWNLOAD] Progress update:`, json);

            if (json.status) {
              let displayStatus = json.status;

              // Add percentage if available
              if (json.completed && json.total) {
                const percent = ((json.completed / json.total) * 100).toFixed(1);
                displayStatus = `${json.status} (${percent}%)`;
              }

              setDownloadProgress({ [modelName]: displayStatus });
            }

            // Check for errors
            if (json.error) {
              console.error(`[DOWNLOAD] Error from Ollama:`, json.error);
              throw new Error(json.error);
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') {
              console.warn(`[DOWNLOAD] JSON parse error:`, e.message, 'Line:', line);
            }
          }
        }
      }

      console.log(`[DOWNLOAD] Download complete, refreshing model list...`);
      // Refresh the model list
      await checkOllamaConnection();
      // Auto-expand Available Models section to show newly downloaded model
      setAvailableModelsExpanded(true);
      setDownloadProgress({ [modelName]: 'Complete!' });
      setTimeout(() => {
        setDownloadingModel(null);
        setDownloadProgress({});
      }, 2000);

    } catch (error) {
      console.error(`[DOWNLOAD] Error downloading model:`, error);
      setDownloadProgress({ [modelName]: `Error: ${error.message}` });
      setTimeout(() => {
        setDownloadingModel(null);
        setDownloadProgress({});
      }, 5000);
    }
  };

  // Check connection on mount and when URL changes
  useEffect(() => {
    checkOllamaConnection();
  }, [ollamaUrl]);

  // API key configurations
  const apiKeyProviders = [
    {
      key: 'openrouter',
      name: 'OpenRouter',
      icon: '🌐',
      placeholder: 'sk-or-v1-...',
      url: 'https://openrouter.ai/keys',
      description: 'One API key for GPT, Gemini, Grok, and 300+ more models',
    },
  ];

  // Keep cloudProvider reference for backward compatibility in the UI
  const cloudProvider = apiKeyProviders[1];

  const navItems = [
    { id: 'general', label: 'General' },
    { id: 'account', label: 'Account' },
    { id: 'billing', label: 'Billing' },
    { id: 'usage', label: 'Usage' },
    { id: 'connectors', label: 'Connectors' },
  ];

  const desktopNavItems = [
    { id: 'desktop-general', label: 'General' },
    { id: 'developer', label: 'Developer' },
  ];

  return (
    <div className={`settings-panel ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="settings-content">
        <nav className="settings-nav">
          <div className="settings-nav-section">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="settings-nav-section">
            <div className="settings-nav-section-title">Desktop app</div>
            {desktopNavItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
        <div className="settings-content-wrapper">
          {/* General Section */}
          {activeNav === 'general' && (
            <>
              {/* Profile */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Profile</span>
                </div>
                <div className="profile-row">
                  <div className="profile-field">
                    <label className="profile-label">Full name</label>
                    <div className="profile-input-with-avatar">
                      <div className="profile-avatar">
                        <span>{fullName ? fullName.charAt(0).toUpperCase() : 'T'}</span>
                      </div>
                      <input
                        type="text"
                        className="settings-input"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="profile-field">
                    <label className="profile-label">Display name</label>
                    <div className="profile-input-standalone">
                      <input
                        type="text"
                        className="settings-input"
                        placeholder="Display name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Appearance</span>
                </div>

                <label className="settings-label">Color mode</label>
                <div className="color-mode-options">
                  <button
                    className={`color-mode-option ${colorMode === 'light' ? 'active' : ''}`}
                    onClick={() => setColorMode('light')}
                  >
                    <div className="color-mode-preview light">
                      <div className="preview-header">
                        <span className="preview-dots"></span>
                      </div>
                      <div className="preview-content">
                        <div className="preview-line"></div>
                        <div className="preview-line short"></div>
                      </div>
                      <div className="preview-input"></div>
                    </div>
                    <span className="color-mode-label">Light</span>
                  </button>
                  <button
                    className={`color-mode-option ${colorMode === 'auto' ? 'active' : ''}`}
                    onClick={() => setColorMode('auto')}
                  >
                    <div className="color-mode-preview auto">
                      <div className="preview-half light">
                        <div className="preview-header">
                          <span className="preview-dots"></span>
                        </div>
                        <div className="preview-content">
                          <div className="preview-line"></div>
                          <div className="preview-line short"></div>
                        </div>
                        <div className="preview-input"></div>
                      </div>
                      <div className="preview-half dark">
                        <div className="preview-header">
                          <span className="preview-dots"></span>
                        </div>
                        <div className="preview-content">
                          <div className="preview-line"></div>
                          <div className="preview-line short"></div>
                        </div>
                        <div className="preview-input"></div>
                      </div>
                    </div>
                    <span className="color-mode-label">Auto</span>
                  </button>
                  <button
                    className={`color-mode-option ${colorMode === 'dark' ? 'active' : ''}`}
                    onClick={() => setColorMode('dark')}
                  >
                    <div className="color-mode-preview dark">
                      <div className="preview-header">
                        <span className="preview-dots"></span>
                      </div>
                      <div className="preview-content">
                        <div className="preview-line"></div>
                        <div className="preview-line short"></div>
                      </div>
                      <div className="preview-input"></div>
                    </div>
                    <span className="color-mode-label">Dark</span>
                  </button>
                  <button
                    className={`color-mode-option ${colorMode === 'glass' ? 'active' : ''}`}
                    onClick={() => setColorMode('glass')}
                  >
                    <div className="color-mode-preview glass">
                      <div className="glass-bg"></div>
                      <div className="glass-panel">
                        <div className="preview-header">
                          <span className="preview-dots"></span>
                        </div>
                        <div className="preview-content">
                          <div className="preview-line"></div>
                          <div className="preview-line short"></div>
                        </div>
                        <div className="preview-input"></div>
                      </div>
                    </div>
                    <span className="color-mode-label">Glass</span>
                  </button>
                </div>

                <label className="settings-label" style={{ marginTop: '24px' }}>Chat font</label>
                <div className="font-options">
                  <button
                    className={`font-option ${chatFont === 'default' ? 'active' : ''}`}
                    onClick={() => setChatFont('default')}
                  >
                    <div className="font-preview default">Aa</div>
                    <span className="font-label">Default</span>
                  </button>
                  <button
                    className={`font-option ${chatFont === 'sans' ? 'active' : ''}`}
                    onClick={() => setChatFont('sans')}
                  >
                    <div className="font-preview sans">Aa</div>
                    <span className="font-label">Sans</span>
                  </button>
                  <button
                    className={`font-option ${chatFont === 'system' ? 'active' : ''}`}
                    onClick={() => setChatFont('system')}
                  >
                    <div className="font-preview system">Aa</div>
                    <span className="font-label">System</span>
                  </button>
                  <button
                    className={`font-option ${chatFont === 'dyslexic' ? 'active' : ''}`}
                    onClick={() => setChatFont('dyslexic')}
                  >
                    <div className="font-preview dyslexic">Aa</div>
                    <span className="font-label">Dyslexic friendly</span>
                  </button>
                </div>
              </div>

              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
            </>
          )}

          {/* Usage Section - API Keys */}
          {activeNav === 'usage' && (
            <>
              <div className="settings-mode-toggle">
                <button
                  className={`mode-toggle-btn ${settingsMode === 'cloud' ? 'active' : ''}`}
                  onClick={() => setSettingsMode('cloud')}
                >
                  Cloud
                </button>
                <button
                  className={`mode-toggle-btn ${settingsMode === 'local' ? 'active' : ''}`}
                  onClick={() => setSettingsMode('local')}
                >
                  Local
                </button>
              </div>

              {currentNode && (
                <div className="settings-section">
                  <div className="settings-section-header">
                    <span className="settings-section-title">Current Model</span>
                  </div>
                  <select
                    className="settings-model-select"
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                  >
                    {Object.entries(PROVIDERS).sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999)).map(([providerId, provider]) => (
                      <optgroup key={providerId} label={provider.name}>
                        {provider.models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {settingsMode === 'cloud' && apiKeyProviders.map(prov => (
                <div className="settings-section" key={prov.key}>
                  <div className="settings-section-header">
                    <span className="settings-section-icon">{prov.icon}</span>
                    <span className="settings-section-title">{prov.name}</span>
                  </div>
                  <p className="settings-description" style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {prov.description}
                  </p>
                  <input
                    type="password"
                    className="settings-input"
                    placeholder={prov.placeholder}
                    value={keys[prov.key] || ''}
                    onChange={(e) => handleChange(prov.key, e.target.value)}
                  />
                  <div className="settings-hint">
                    Get your API key from{' '}
                    <a href={prov.url} target="_blank" rel="noopener noreferrer">
                      {prov.url.replace('https://', '')}
                    </a>
                  </div>
                </div>
              ))}

              {settingsMode === 'cloud' && (
                <div className="settings-section">
                  <div className="settings-section-header">
                    <span className="settings-section-title">Model Directory</span>
                  </div>
                  <p className="settings-description" style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Browse and add models to your selector. Currently {selectedModels?.length || 0} custom models added.
                  </p>
                  <button
                    className="browse-models-btn"
                    onClick={() => setShowModelDirectory(true)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      color: 'var(--text)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Browse All Models (346+)</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                  </button>
                </div>
              )}

              {settingsMode === 'local' && (
              <div className="settings-section local-models-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Local Models</span>
                </div>

                <div className="local-model-config">
                  <div className="local-model-provider">
                    <div className="local-provider-header">
                      <div className="local-provider-title">Ollama</div>
                      <div className={`connection-status ${ollamaConnected ? 'connected' : 'disconnected'}`}>
                        {checkingConnection ? (
                          <span>⟳ Checking...</span>
                        ) : ollamaConnected ? (
                          <span>Connected</span>
                        ) : (
                          <span>● Disconnected</span>
                        )}
                      </div>
                    </div>
                    <div className="settings-hint">Connect to local Ollama instance</div>
                    <div className="ollama-url-input">
                      <input
                        type="text"
                        className="settings-input"
                        placeholder="http://localhost:11434"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                      />
                      <button
                        className="refresh-btn"
                        onClick={checkOllamaConnection}
                        disabled={checkingConnection}
                      >
                        ⟳
                      </button>
                    </div>
                    <div className="settings-hint">
                      Install Ollama from{' '}
                      <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
                        ollama.ai
                      </a>
                    </div>

                    {ollamaConnected && (
                      <div className="ollama-models-section">
                        <div
                          className="models-section-title"
                          onClick={() => setAvailableModelsExpanded(!availableModelsExpanded)}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          {availableModelsExpanded ? '▼' : '▶'} Available Models ({ollamaModels.length})
                        </div>
                        {availableModelsExpanded && ollamaModels.length > 0 && (
                          <div className="installed-models-list">
                            {ollamaModels.map((model) => (
                              <div key={model.name} className="installed-model-item">
                                <span className="model-name">{model.name}</span>
                                <span className="model-size">{(model.size / 1e9).toFixed(2)} GB</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {availableModelsExpanded && ollamaModels.length === 0 && (
                          <div className="no-models">No models installed</div>
                        )}

                        <div
                          className="models-section-title"
                          onClick={() => setDownloadModelsExpanded(!downloadModelsExpanded)}
                          style={{ marginTop: '16px', cursor: 'pointer', userSelect: 'none' }}
                        >
                          {downloadModelsExpanded ? '▼' : '▶'} Download Models
                        </div>
                        {downloadModelsExpanded && (
                          <div className="download-models-list">
                            {PROVIDERS?.ollama?.models?.map((model) => {
                              const isInstalled = ollamaModels.some(m => m.name === model.id);
                              const isDownloading = downloadingModel === model.id;

                              return (
                                <div key={model.id} className="download-model-item">
                                  <div className="download-model-info">
                                    <span className="model-name">{model.name}</span>
                                    {isInstalled && <span className="installed-badge">✓ Installed</span>}
                                  </div>
                                  {isDownloading ? (
                                    <div className="download-progress">
                                      {downloadProgress[model.id] || 'Downloading...'}
                                    </div>
                                  ) : (
                                    <button
                                      className="download-btn"
                                      onClick={() => downloadOllamaModel(model.id)}
                                      disabled={isInstalled || downloadingModel !== null}
                                    >
                                      {isInstalled ? 'Installed' : 'Download'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detected CLI Tools */}
                <div className="local-model-provider cli-detector" style={{ marginTop: '24px' }}>
                  <div className="local-provider-header">
                    <div className="local-provider-title">CLI</div>
                    <button
                      className="refresh-btn"
                      onClick={rescanCLIs}
                      disabled={detectingCLIs}
                      title="Rescan for CLI tools"
                      style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                        color: 'var(--text)', cursor: 'pointer', fontSize: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {detectingCLIs ? '⟳' : '↻'}
                    </button>
                  </div>
                  <div className="settings-hint" style={{ marginBottom: '12px' }}>Detect installed CLI models</div>

                  <div
                    className="models-section-title"
                    onClick={() => setCliToolsExpanded(!cliToolsExpanded)}
                    style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, marginBottom: '8px' }}
                  >
                    {cliToolsExpanded ? '▼' : '▶'} Detected CLI Tools ({detectedCLIs?.length || 0})
                  </div>

                  {cliToolsExpanded && detectedCLIs?.length > 0 && (
                    <div className="cli-tools-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detectedCLIs.map((cli) => {
                        const isUpdating = updatingCLI === cli.command;
                        const hasUpdate = cli.updateAvailable;
                        return (
                          <div key={cli.command} className="cli-tool-card" style={{
                            border: `1px solid ${hasUpdate ? 'rgba(234, 179, 8, 0.4)' : 'var(--border)'}`,
                            borderRadius: '10px',
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-primary)',
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>{cli.name}</div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {cli.command}{cli.version ? ` v${cli.version}` : ''}
                                {hasUpdate && (
                                  <span style={{ color: '#eab308', marginLeft: '6px' }}>
                                    → v{cli.latestVersion}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {hasUpdate ? (
                                <button
                                  onClick={() => updateCLI(cli.command)}
                                  disabled={isUpdating}
                                  style={{
                                    background: 'rgba(234, 179, 8, 0.15)',
                                    color: '#eab308',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    cursor: isUpdating ? 'wait' : 'pointer',
                                  }}
                                >
                                  {isUpdating ? '⟳ Updating...' : '↑ Update'}
                                </button>
                              ) : (
                                <span style={{
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: '#22c55e',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                }}>
                                  {cli.latestVersion ? '✓ Up to date' : '✓ Available'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {cliToolsExpanded && (!detectedCLIs || detectedCLIs.length === 0) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
                      {detectingCLIs ? 'Scanning...' : 'No CLI tools detected. Click ↻ to rescan.'}
                    </div>
                  )}
                </div>
              </div>
              )}

              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
            </>
          )}

          {/* Account Section */}
          {activeNav === 'account' && (
            <>
              {/* User Info */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Account</span>
                </div>
                {user && (
                  <div className="account-info">
                    <div className="account-email">
                      <span className="account-label">Email</span>
                      <span className="account-value">{user.email}</span>
                    </div>
                    {subscription && (
                      <div className="account-plan">
                        <span className="account-label">Plan</span>
                        <span className="account-value billing-plan-badge">{subscription.plan_name}</span>
                      </div>
                    )}
                  </div>
                )}
                <button
                  className="settings-link-btn"
                  onClick={signOut}
                  style={{ marginTop: '16px' }}
                >
                  Sign out
                </button>
              </div>

              {/* Archive */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Archive</span>
                  {archivedSessions?.length > 0 && (
                    <button
                      className="clear-archive-btn"
                      onClick={() => {
                        if (window.confirm('Permanently delete all archived chats? This cannot be undone.')) {
                          clearArchive();
                        }
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <p className="settings-description" style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Deleted chats are stored here. You can restore or permanently delete them.
                </p>
                {archivedSessions?.length > 0 ? (
                  <div className="archive-list">
                    {archivedSessions.map((archivedSession) => (
                      <div key={archivedSession.id} className="archive-item">
                        <div className="archive-item-info">
                          <span className="archive-item-name">{archivedSession.name}</span>
                          <span className="archive-item-date">
                            Deleted {new Date(archivedSession.archivedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="archive-item-actions">
                          <button
                            className="archive-action-btn restore"
                            onClick={() => restoreChatSession(archivedSession.id)}
                            title="Restore chat"
                          >
                            Restore
                          </button>
                          <button
                            className="archive-action-btn delete"
                            onClick={() => {
                              if (window.confirm('Permanently delete this chat?')) {
                                permanentlyDeleteSession(archivedSession.id);
                              }
                            }}
                            title="Delete permanently"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="archive-empty">
                    No deleted chats
                  </div>
                )}
              </div>
            </>
          )}

          {/* Billing Section */}
          {activeNav === 'billing' && (
            <>
              {/* Current Plan */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Current Plan</span>
                </div>
                {subscriptionLoading ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</p>
                ) : subscription ? (
                  <div className="billing-current-plan">
                    <div className="billing-plan-row">
                      <span className="billing-plan-badge">{subscription.plan_name}</span>
                      <span className={`billing-plan-status status-${subscription.status}`}>
                        {subscription.status}
                      </span>
                    </div>
                    {subscription.current_period_end && (
                      <p className="billing-plan-period">
                        {subscription.cancel_at_period_end
                          ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                          : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                        }
                      </p>
                    )}
                    {subscription.cancel_at_period_end && (
                      <p className="billing-cancel-notice">
                        Your subscription will not renew at the end of the current period.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                      You are on the Free plan.
                    </p>
                    <button
                      className="plan-btn plan-btn-primary"
                      onClick={() => setShowUpgradePlan(true)}
                    >
                      Upgrade
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              {subscription && (
                <div className="settings-section">
                  <div className="settings-section-header">
                    <span className="settings-section-title">Payment Method</span>
                  </div>
                  <button
                    className="settings-link-btn"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE}/create-portal-session`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${session.access_token}` },
                        });
                        const data = await response.json();
                        if (data.url) {
                          await platform.openExternal(data.url);
                        }
                      } catch (err) {
                        console.error('Portal error:', err);
                      }
                    }}
                  >
                    Manage payment methods
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '8px' }}>Opens Stripe</span>
                  </button>
                </div>
              )}

              {/* Billing History */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Billing History</span>
                  <button
                    className="refresh-btn"
                    onClick={fetchSubscription}
                    style={{ marginLeft: 'auto' }}
                  >
                    ↻
                  </button>
                </div>
                {invoices.length > 0 ? (
                  <div className="billing-invoices-list">
                    {invoices.map(inv => (
                      <div key={inv.id} className="billing-invoice-item">
                        <span className="invoice-date">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </span>
                        <span className="invoice-amount">
                          ${(inv.amount_paid / 100).toFixed(2)}
                        </span>
                        <span className={`invoice-status status-${inv.status}`}>
                          {inv.status}
                        </span>
                        {inv.invoice_url && (
                          <a
                            className="invoice-link"
                            href={inv.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              platform.openExternal(inv.invoice_url);
                            }}
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No invoices yet.</p>
                )}
              </div>

              {/* Cancel */}
              {subscription && subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <div className="settings-section">
                  <button
                    className="settings-link-btn danger"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE}/create-portal-session`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${session.access_token}` },
                        });
                        const data = await response.json();
                        if (data.url) {
                          await platform.openExternal(data.url);
                        }
                      } catch (err) {
                        console.error('Portal error:', err);
                      }
                    }}
                  >
                    Cancel subscription
                  </button>
                </div>
              )}
            </>
          )}

          {/* Placeholder for other sections */}
          {!['general', 'usage', 'account', 'billing'].includes(activeNav) && (
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-title">{navItems.find(i => i.id === activeNav)?.label || desktopNavItems.find(i => i.id === activeNav)?.label || 'Settings'}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Coming soon...</p>
            </div>
          )}
        </div>
      </div>

      {showModelDirectory && (
        <ModelDirectory onClose={() => setShowModelDirectory(false)} />
      )}
    </div>
  );
}

export default Settings;
