import React, { useState, useEffect, useRef } from 'react';
import { useStore, useProviders } from '../store';
import ModelDirectory from './ModelDirectory';

function Settings({ onClose, currentNode, onModelChange }) {
  const PROVIDERS = useProviders();
  const { apiKeys, setApiKeys, sidebarOpen, setSidebarOpen, refreshModels, setCliChatbotModels, selectedModels } = useStore();
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
    const SIDEBAR_WIDTH = 300;
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

  // CLI Chatbots state
  const [cliChatbots, setCliChatbots] = useState([]);
  const [checkingCliChatbots, setCheckingCliChatbots] = useState(false);
  const [cliChatbotsExpanded, setCliChatbotsExpanded] = useState(false);

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

  // Detect CLI chatbots
  const detectCliChatbots = async () => {
    setCheckingCliChatbots(true);
    try {
      const result = await window.electronAPI.cliChatbots.detect();
      if (result.success) {
        const chatbots = result.chatbots || [];
        setCliChatbots(chatbots);
        // Update store with detected chatbots
        setCliChatbotModels(chatbots);
      }
    } catch (error) {
      console.error('Failed to detect CLI chatbots:', error);
    }
    setCheckingCliChatbots(false);
  };

  // Detect CLI chatbots on mount
  useEffect(() => {
    if (settingsMode === 'local') {
      detectCliChatbots();
    }
  }, [settingsMode]);

  // Single OpenRouter API key for all cloud models
  const cloudProvider = {
    key: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    placeholder: 'sk-or-v1-...',
    url: 'https://openrouter.ai/keys',
    description: 'One API key for all cloud models (Claude, GPT, Gemini, Grok, and 300+ more)',
  };

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
                    {Object.entries(PROVIDERS).map(([providerId, provider]) => (
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

              {settingsMode === 'cloud' && (
                <div className="settings-section">
                  <div className="settings-section-header">
                    <span className="settings-section-icon">{cloudProvider.icon}</span>
                    <span className="settings-section-title">{cloudProvider.name}</span>
                  </div>
                  <p className="settings-description" style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {cloudProvider.description}
                  </p>
                  <input
                    type="password"
                    className="settings-input"
                    placeholder={cloudProvider.placeholder}
                    value={keys[cloudProvider.key] || ''}
                    onChange={(e) => handleChange(cloudProvider.key, e.target.value)}
                  />
                  <div className="settings-hint">
                    Get your API key from{' '}
                    <a href={cloudProvider.url} target="_blank" rel="noopener noreferrer">
                      {cloudProvider.url.replace('https://', '')}
                    </a>
                  </div>
                </div>
              )}

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
                  {/* CLI Section */}
                  <div className="local-model-provider">
                    <div className="local-provider-header">
                      <div className="local-provider-title">CLI</div>
                      <button
                        className="refresh-btn"
                        onClick={detectCliChatbots}
                        disabled={checkingCliChatbots}
                        style={{ marginLeft: 'auto' }}
                      >
                        {checkingCliChatbots ? '⟳' : '↻'}
                      </button>
                    </div>
                    <div className="settings-hint">
                      Detect installed CLI models
                    </div>

                    <div
                      className="models-section-title"
                      onClick={() => setCliChatbotsExpanded(!cliChatbotsExpanded)}
                      style={{ cursor: 'pointer', userSelect: 'none', marginTop: '12px' }}
                    >
                      {cliChatbotsExpanded ? '▼' : '▶'} Detected CLI Tools ({cliChatbots.length})
                    </div>
                    {cliChatbotsExpanded && (
                      <div className="installed-models-list">
                        {cliChatbots.length > 0 ? (
                          cliChatbots.map((chatbot) => (
                            <div key={chatbot.command} className="installed-model-item">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="model-name">{chatbot.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {chatbot.command}
                                </span>
                              </div>
                              <span className="installed-badge">✓ Available</span>
                            </div>
                          ))
                        ) : (
                          <div className="no-models">
                            {checkingCliChatbots ? 'Detecting...' : 'No CLI chatbots detected'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="local-model-provider" style={{ marginTop: '24px' }}>
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
              </div>
              )}

              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
            </>
          )}

          {/* Placeholder for other sections */}
          {!['general', 'usage'].includes(activeNav) && (
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
