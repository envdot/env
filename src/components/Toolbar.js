import React, { useState, useRef, useEffect } from 'react';
import { useStore, PROVIDERS } from '../store';

function Toolbar({ onAddNode, onSaveCanvas, chatModeNode }) {
  const { setShowSettings, sidebarOpen, setSidebarOpen, chatMode } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelType, setModelType] = useState('cloud'); // cloud or local
  const dropdownRef = useRef(null);
  const modelDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    };

    if (showDropdown || showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showModelDropdown]);

  const handleMenuItemClick = (action) => {
    setShowDropdown(false);
    action();
  };

  const handleModelSelect = (modelId) => {
    chatModeNode.updateModel(modelId);
    setShowModelDropdown(false);
  };

  const getCurrentModelName = () => {
    if (!chatModeNode?.data?.model) return 'Select Model';
    for (const [providerId, provider] of Object.entries(PROVIDERS)) {
      const model = provider.models.find(m => m.id === chatModeNode.data.model);
      if (model) return model.name;
    }
    return 'Select Model';
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className="sidebar-toggle-toolbar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <span className="sidebar-toggle-line"></span>
          <span className="sidebar-toggle-line"></span>
          <span className="sidebar-toggle-line"></span>
        </button>
      </div>

      <div className="toolbar-center">
      </div>

      <div className="toolbar-right">
        {!chatMode && (
          <button className="toolbar-btn icon-btn" onClick={onAddNode} title="Add Chat Node">
            +
          </button>
        )}
        {chatMode && chatModeNode && (
          <div className="model-dropdown-container" ref={modelDropdownRef}>
            <button
              className="model-dropdown-btn"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              title="Select Model"
            >
              {getCurrentModelName()}
            </button>
            {showModelDropdown && (
              <div className="model-dropdown">
                <div className="model-type-toggle">
                  <button
                    className={`type-toggle-btn ${modelType === 'cloud' ? 'active' : ''}`}
                    onClick={() => setModelType('cloud')}
                  >
                    ☁️ Cloud
                  </button>
                  <button
                    className={`type-toggle-btn ${modelType === 'local' ? 'active' : ''}`}
                    onClick={() => setModelType('local')}
                  >
                    🖥️ Local
                  </button>
                </div>
                {Object.entries(PROVIDERS)
                  .filter(([providerId, provider]) => provider.type === modelType)
                  .map(([providerId, provider]) => {
                    // For local models, group by runtime
                    if (providerId === 'local') {
                      const ollamaModels = provider.models.filter(m => m.runtime === 'ollama');
                      const transformersModels = provider.models.filter(m => m.runtime === 'transformers');

                      return (
                        <div key={providerId}>
                          {ollamaModels.length > 0 && (
                            <div className="model-group">
                              <div className="model-group-title">🔧 Ollama (External)</div>
                              {ollamaModels.map((model) => (
                                <button
                                  key={model.id}
                                  className={`model-option ${chatModeNode.data.model === model.id ? 'active' : ''}`}
                                  onClick={() => handleModelSelect(model.id)}
                                >
                                  {model.name} <span className="model-size">({model.size})</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {transformersModels.length > 0 && (
                            <div className="model-group">
                              <div className="model-group-title">⚡ Transformers.js (Bundled)</div>
                              {transformersModels.map((model) => (
                                <button
                                  key={model.id}
                                  className={`model-option ${chatModeNode.data.model === model.id ? 'active' : ''}`}
                                  onClick={() => handleModelSelect(model.id)}
                                >
                                  {model.name} <span className="model-size">({model.size})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // For cloud models, show as before
                    return (
                      <div key={providerId} className="model-group">
                        <div className="model-group-title">{provider.icon} {provider.name}</div>
                        {provider.models.map((model) => (
                          <button
                            key={model.id}
                            className={`model-option ${chatModeNode.data.model === model.id ? 'active' : ''}`}
                            onClick={() => handleModelSelect(model.id)}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
        <div className="settings-dropdown-container" ref={dropdownRef}>
          <button
            className="toolbar-btn icon-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Menu"
          >
            ⚙
          </button>
          {showDropdown && (
            <div className="settings-dropdown">
              <button
                className="dropdown-item"
                onClick={() => handleMenuItemClick(() => console.log('Profile'))}
              >
                <span>Profile</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => handleMenuItemClick(() => console.log('Account'))}
              >
                <span>Account</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => handleMenuItemClick(() => console.log('Upgrade'))}
              >
                <span>Upgrade to Pro</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => handleMenuItemClick(() => console.log('Support'))}
              >
                <span>Support</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => handleMenuItemClick(() => setShowSettings(true))}
              >
                <span>Settings</span>
              </button>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item danger"
                onClick={() => handleMenuItemClick(() => console.log('Logout'))}
              >
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
