import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';

// Fetch all models from OpenRouter
async function fetchAllModels() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
  }
  return [];
}

// Extract provider from model ID
function getProvider(modelId) {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

// Format provider name for display
function formatProviderName(provider) {
  const names = {
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'google': 'Google',
    'x-ai': 'xAI',
    'meta-llama': 'Meta',
    'mistralai': 'Mistral',
    'cohere': 'Cohere',
    'perplexity': 'Perplexity',
    'deepseek': 'DeepSeek',
    'qwen': 'Qwen',
    'nvidia': 'NVIDIA',
    'microsoft': 'Microsoft',
    'amazon': 'Amazon',
  };
  return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

// Format price for display
function formatPrice(price) {
  if (!price) return 'Free';
  const num = parseFloat(price);
  if (num === 0) return 'Free';
  if (num < 0.001) return '<$0.001';
  return `$${num.toFixed(3)}`;
}

function ModelDirectory({ onClose }) {
  const { selectedModels, addSelectedModel, removeSelectedModel } = useStore();
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Fetch models on mount
  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      const models = await fetchAllModels();
      setAllModels(models);
      setLoading(false);
    };
    loadModels();
  }, []);

  // Get unique providers
  const providers = useMemo(() => {
    const providerSet = new Set(allModels.map(m => getProvider(m.id)));
    return Array.from(providerSet).sort();
  }, [allModels]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let result = allModels;

    // Filter by provider
    if (selectedProvider !== 'all') {
      result = result.filter(m => getProvider(m.id) === selectedProvider);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.id.toLowerCase().includes(query) ||
        (m.name && m.name.toLowerCase().includes(query))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || a.id).localeCompare(b.name || b.id);
        case 'provider':
          return getProvider(a.id).localeCompare(getProvider(b.id));
        case 'price':
          const priceA = parseFloat(a.pricing?.prompt || 0);
          const priceB = parseFloat(b.pricing?.prompt || 0);
          return priceA - priceB;
        case 'context':
          return (b.context_length || 0) - (a.context_length || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [allModels, selectedProvider, searchQuery, sortBy]);

  const isModelSelected = (modelId) => {
    return selectedModels?.some(m => m.id === modelId);
  };

  const handleToggleModel = (model) => {
    if (isModelSelected(model.id)) {
      removeSelectedModel(model.id);
    } else {
      addSelectedModel({
        id: model.id,
        name: model.name || model.id.split('/').pop(),
        provider: getProvider(model.id),
        contextLength: model.context_length,
        pricing: model.pricing,
      });
    }
  };

  return (
    <div className="model-directory-overlay">
      <div className="model-directory">
        <div className="model-directory-header">
          <h2>Model Directory</h2>
          <span className="model-count">{allModels.length} models available</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="model-directory-filters">
          <input
            type="text"
            className="model-search"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="provider-filter"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="all">All Providers ({providers.length})</option>
            {providers.map(p => (
              <option key={p} value={p}>
                {formatProviderName(p)} ({allModels.filter(m => getProvider(m.id) === p).length})
              </option>
            ))}
          </select>

          <select
            className="sort-filter"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="provider">Sort by Provider</option>
            <option value="price">Sort by Price</option>
            <option value="context">Sort by Context Size</option>
          </select>
        </div>

        <div className="model-directory-list">
          {loading ? (
            <div className="loading-state">Loading models...</div>
          ) : filteredModels.length === 0 ? (
            <div className="empty-state">No models found</div>
          ) : (
            filteredModels.map(model => (
              <div
                key={model.id}
                className={`model-card ${isModelSelected(model.id) ? 'selected' : ''}`}
                onClick={() => handleToggleModel(model)}
              >
                <div className="model-card-header">
                  <span className="model-provider-badge">
                    {formatProviderName(getProvider(model.id))}
                  </span>
                  <span className={`model-select-indicator ${isModelSelected(model.id) ? 'added' : ''}`}>
                    {isModelSelected(model.id) ? '✓ Added' : '+ Add'}
                  </span>
                </div>
                <div className="model-card-name">
                  {model.name || model.id.split('/').pop()}
                </div>
                <div className="model-card-id">{model.id}</div>
                <div className="model-card-meta">
                  {model.context_length && (
                    <span className="meta-item">
                      {(model.context_length / 1000).toFixed(0)}K context
                    </span>
                  )}
                  {model.pricing && (
                    <span className="meta-item">
                      {formatPrice(model.pricing.prompt)}/1K in
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="model-directory-footer">
          <span className="selected-count">
            {selectedModels?.length || 0} models in your selector
          </span>
          <button className="done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default ModelDirectory;
