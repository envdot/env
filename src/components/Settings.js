import React, { useState, useEffect } from 'react';
import { useStore, PROVIDERS, checkOllamaConnection } from '../store';

function Settings({ onClose, currentNode, onModelChange }) {
  const { apiKeys, setApiKeys, sidebarOpen, ollamaUrl, setOllamaUrl, ollamaConnected, setOllamaConnected } = useStore();
  const [keys, setKeys] = useState(apiKeys);
  const [selectedProvider, setSelectedProvider] = useState(currentNode?.data?.provider || 'claude');
  const [selectedModel, setSelectedModel] = useState(currentNode?.data?.model || 'claude-sonnet-4-20250514');
  const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaUrl);
  const [checkingConnection, setCheckingConnection] = useState(false);

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
