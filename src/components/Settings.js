import React, { useState, useEffect } from 'react';
import { useStore, PROVIDERS, checkOllamaConnection, getOllamaModels, pullOllamaModel, deleteOllamaModel } from '../store';

function Settings({ onClose, currentNode, onModelChange }) {
  const { apiKeys, setApiKeys, sidebarOpen, ollamaUrl, setOllamaUrl, ollamaConnected, setOllamaConnected } = useStore();
  const [keys, setKeys] = useState(apiKeys);
  const [selectedProvider, setSelectedProvider] = useState(currentNode?.data?.provider || 'claude');
  const [selectedModel, setSelectedModel] = useState(currentNode?.data?.model || 'claude-sonnet-4-20250514');
  const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaUrl);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [installedModels, setInstalledModels] = useState([]);
  const [downloadingModels, setDownloadingModels] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});

  const handleChange = (provider, value) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSave = () => {
    setApiKeys(keys);
    setOllamaUrl(localOllamaUrl);
    if (onModelChange && currentNode) {
      onModelChange(selectedModel, selectedProvider);
    }
    onClose();
  };

  const handleCheckConnection = async () => {
    setCheckingConnection(true);
    const connected = await checkOllamaConnection(localOllamaUrl);
    setOllamaConnected(connected);
    setCheckingConnection(false);

    // If connected, fetch installed models
    if (connected) {
      const models = await getOllamaModels(localOllamaUrl);
      setInstalledModels(models);
    }
  };

  const handleDownloadModel = async (modelId) => {
    setDownloadingModels(prev => ({ ...prev, [modelId]: true }));
    setDownloadProgress(prev => ({ ...prev, [modelId]: { status: 'downloading', progress: 0 } }));

    const result = await pullOllamaModel(modelId, localOllamaUrl, (progress) => {
      // Update progress
      if (progress.total && progress.completed) {
        const percent = Math.round((progress.completed / progress.total) * 100);
        setDownloadProgress(prev => ({
          ...prev,
          [modelId]: { status: progress.status || 'downloading', progress: percent }
        }));
      } else if (progress.status) {
        setDownloadProgress(prev => ({
          ...prev,
          [modelId]: { status: progress.status, progress: prev[modelId]?.progress || 0 }
        }));
      }
    });

    setDownloadingModels(prev => ({ ...prev, [modelId]: false }));

    if (result.success) {
      setDownloadProgress(prev => ({ ...prev, [modelId]: { status: 'success', progress: 100 } }));
      // Refresh installed models
      const models = await getOllamaModels(localOllamaUrl);
      setInstalledModels(models);
      // Clear progress after 2 seconds
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[modelId];
          return newProgress;
        });
      }, 2000);
    } else {
      setDownloadProgress(prev => ({ ...prev, [modelId]: { status: 'error', progress: 0 } }));
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!confirm(`Delete model ${modelId}?`)) return;

    const success = await deleteOllamaModel(modelId, localOllamaUrl);
    if (success) {
      // Refresh installed models
      const models = await getOllamaModels(localOllamaUrl);
      setInstalledModels(models);
    }
  };

  const isModelInstalled = (modelId) => {
    return installedModels.some(installed => installed.includes(modelId));
  };

  // Check Ollama connection on mount
  useEffect(() => {
    handleCheckConnection();
  }, []);

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

  const providers = [
    {
      key: 'claude',
      name: 'Claude',
      icon: '',
      placeholder: 'sk-ant-...',
      url: 'https://console.anthropic.com',
    },
    {
      key: 'openai',
      name: 'OpenAI',
      icon: '',
      placeholder: 'sk-...',
      url: 'https://platform.openai.com/api-keys',
    },
    {
      key: 'gemini',
      name: 'Gemini',
      icon: '',
      placeholder: 'AI...',
      url: 'https://aistudio.google.com/app/apikey',
    },
    {
      key: 'grok',
      name: 'Grok',
      icon: '',
      placeholder: 'xai-...',
      url: 'https://console.x.ai',
    },
  ];

  return (
    <div className={`settings-panel ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="settings-close-btn" onClick={onClose}>
        ✕
      </button>

      <div className="settings-content">
        <div className="settings-content-wrapper">
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

          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-icon">🖥️</span>
              <span className="settings-section-title">Local Models (Ollama)</span>
            </div>
            <div className="ollama-url-container">
              <input
                type="text"
                className="settings-input"
                placeholder="http://localhost:11434"
                value={localOllamaUrl}
                onChange={(e) => setLocalOllamaUrl(e.target.value)}
              />
              <button
                className="check-connection-btn"
                onClick={handleCheckConnection}
                disabled={checkingConnection}
              >
                {checkingConnection ? '...' : '🔄'}
              </button>
            </div>
            <div className="settings-hint">
              {ollamaConnected ? (
                <span className="connection-status connected">✓ Connected</span>
              ) : (
                <span className="connection-status disconnected">✗ Not connected</span>
              )}
              {' · '}
              <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
                Install Ollama
              </a>
            </div>

            {ollamaConnected && (
              <div className="model-management">
                <div className="model-management-header">🔧 Ollama Models (External)</div>
                <div className="model-management-hint">
                  Requires Ollama installed. Download models to use them.
                </div>
                {PROVIDERS.local.models
                  .filter(m => m.runtime === 'ollama')
                  .map((model) => {
                    const installed = isModelInstalled(model.id);
                    const downloading = downloadingModels[model.id];
                    const progress = downloadProgress[model.id];

                    return (
                      <div key={model.id} className="model-item">
                        <div className="model-item-info">
                          <span className="model-item-name">{model.name}</span>
                          <span className="model-size-badge">{model.size}</span>
                          {installed && <span className="model-badge installed">✓ Installed</span>}
                        </div>
                        <div className="model-item-actions">
                          {!installed && !downloading && (
                            <button
                              className="model-action-btn download"
                              onClick={() => handleDownloadModel(model.id)}
                            >
                              ⬇ Download
                            </button>
                          )}
                          {downloading && (
                            <div className="download-progress">
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${progress?.progress || 0}%` }}
                                />
                              </div>
                              <span className="progress-text">
                                {progress?.status || 'downloading'} {progress?.progress || 0}%
                              </span>
                            </div>
                          )}
                          {installed && !downloading && (
                            <button
                              className="model-action-btn delete"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="model-management transformers-models">
              <div className="model-management-header">⚡ Transformers.js Models (Bundled)</div>
              <div className="model-management-hint">
                No installation needed. Models download automatically on first use.
              </div>
              {PROVIDERS.local.models
                .filter(m => m.runtime === 'transformers')
                .map((model) => (
                  <div key={model.id} className="model-item">
                    <div className="model-item-info">
                      <span className="model-item-name">{model.name}</span>
                      <span className="model-size-badge">{model.size}</span>
                      <span className="model-badge ready">✓ Ready</span>
                    </div>
                    <div className="model-item-actions">
                      <span className="model-info-text">Auto-downloads on first use</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {providers.map((provider) => (
            <div key={provider.key} className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-icon">{provider.icon}</span>
                <span className="settings-section-title">{provider.name}</span>
              </div>
              <input
                type="password"
                className="settings-input"
                placeholder={provider.placeholder}
                value={keys[provider.key]}
                onChange={(e) => handleChange(provider.key, e.target.value)}
              />
              <div className="settings-hint">
                Get your API key from{' '}
                <a href={provider.url} target="_blank" rel="noopener noreferrer">
                  {provider.url.replace('https://', '')}
                </a>
              </div>
            </div>
          ))}

          <button className="save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
