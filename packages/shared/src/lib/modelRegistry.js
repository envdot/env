// Model Registry - Fetches latest model lists from real API sources
// Uses OpenRouter API for comprehensive cloud model listings

// OpenRouter API - comprehensive model list (no auth required for listing)
const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';

// Hugging Face API - for open source models
const HUGGINGFACE_API = 'https://huggingface.co/api/models?filter=text-generation&sort=downloads&limit=50';

// Fetch all available models from OpenRouter
async function fetchOpenRouterModels() {
  try {
    console.log('Fetching models from OpenRouter...');
    const response = await fetch(OPENROUTER_API);
    console.log('OpenRouter response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Loaded models from OpenRouter:', data.data?.length || 0, 'models');
      return data.data || [];
    } else {
      console.error('OpenRouter API returned error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Failed to fetch from OpenRouter:', error);
  }
  return [];
}

// Fetch popular models from Hugging Face
async function fetchHuggingFaceModels() {
  try {
    const response = await fetch(HUGGINGFACE_API);
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Loaded models from Hugging Face');
      return data;
    }
  } catch (error) {
    console.error('Failed to fetch from Hugging Face:', error);
  }
  return [];
}

// Filter models by provider
function filterModelsByProvider(models, providers) {
  const result = {};

  for (const provider of providers) {
    result[provider] = models.filter(m => {
      const modelId = m.id.toLowerCase();

      switch (provider) {
        case 'claude':
          return modelId.includes('anthropic') || modelId.includes('claude');
        case 'openai':
          return modelId.includes('openai') || modelId.includes('gpt') || modelId.includes('o1');
        case 'gemini':
          return modelId.includes('google') || modelId.includes('gemini');
        case 'grok':
          return modelId.includes('grok') || modelId.includes('x-ai');
        default:
          return false;
      }
    }).map(m => ({
      id: m.id.split('/').pop(), // Extract model ID
      name: m.name || m.id.split('/').pop()
    }));
  }

  return result;
}

// Helper function to remove provider prefixes from model names
function stripProviderPrefix(name) {
  // Remove common provider prefixes
  return name
    .replace(/^Anthropic:\s*/i, '')
    .replace(/^OpenAI:\s*/i, '')
    .replace(/^Google:\s*/i, '')
    .replace(/^xAI:\s*/i, '')
    .replace(/^Claude:\s*/i, '')
    .replace(/^GPT:\s*/i, '')
    .replace(/^Gemini:\s*/i, '')
    .replace(/^Grok:\s*/i, '');
}

// Claude models - keep full OpenRouter model ID
export async function getClaudeModels(openRouterModels) {
  if (openRouterModels && openRouterModels.length > 0) {
    const claudeModels = openRouterModels
      .filter(m => m.id.toLowerCase().includes('anthropic/claude'))
      .map(m => ({
        id: m.id, // Keep full ID like "anthropic/claude-opus-4.5"
        name: stripProviderPrefix(m.name || m.id.split('/').pop())
      }))
      .slice(0, 10);

    if (claudeModels.length > 0) {
      return claudeModels;
    }
  }

  return [];
}

// OpenAI models - keep full OpenRouter model ID
export async function getOpenAIModels(openRouterModels) {
  if (openRouterModels && openRouterModels.length > 0) {
    const openaiModels = openRouterModels
      .filter(m => m.id.toLowerCase().startsWith('openai/'))
      .map(m => ({
        id: m.id, // Keep full ID like "openai/gpt-4o"
        name: stripProviderPrefix(m.name || m.id.split('/').pop())
      }))
      .slice(0, 10);

    if (openaiModels.length > 0) {
      return openaiModels;
    }
  }

  return [];
}

// Gemini models - keep full OpenRouter model ID
export async function getGeminiModels(openRouterModels) {
  if (openRouterModels && openRouterModels.length > 0) {
    const geminiModels = openRouterModels
      .filter(m => m.id.toLowerCase().startsWith('google/'))
      .map(m => ({
        id: m.id, // Keep full ID like "google/gemini-2.0-flash"
        name: stripProviderPrefix(m.name || m.id.split('/').pop())
      }))
      .slice(0, 10);

    if (geminiModels.length > 0) {
      return geminiModels;
    }
  }

  return [];
}

// Grok models - keep full OpenRouter model ID
export async function getGrokModels(openRouterModels) {
  if (openRouterModels && openRouterModels.length > 0) {
    const grokModels = openRouterModels
      .filter(m => m.id.toLowerCase().startsWith('x-ai/'))
      .map(m => ({
        id: m.id, // Keep full ID like "x-ai/grok-3"
        name: stripProviderPrefix(m.name || m.id.split('/').pop())
      }))
      .slice(0, 10);

    if (grokModels.length > 0) {
      return grokModels;
    }
  }

  return [];
}

// Ollama models - actual Ollama library model names
export async function getOllamaLibraryModels() {
  // Return popular models from the official Ollama library
  // These are verified model names that exist in Ollama
  return [
    { id: 'llama3.3:latest', name: 'Llama 3.3' },
    { id: 'llama3.2:latest', name: 'Llama 3.2' },
    { id: 'llama3.1:latest', name: 'Llama 3.1' },
    { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
    { id: 'qwen2.5:14b', name: 'Qwen 2.5 14B' },
    { id: 'mistral:latest', name: 'Mistral' },
    { id: 'mixtral:latest', name: 'Mixtral' },
    { id: 'phi3:latest', name: 'Phi-3' },
    { id: 'gemma2:latest', name: 'Gemma 2' },
    { id: 'gemma2:9b', name: 'Gemma 2 9B' },
    { id: 'deepseek-r1:latest', name: 'DeepSeek R1' },
    { id: 'codellama:latest', name: 'Code Llama' },
    { id: 'llama2:latest', name: 'Llama 2' },
    { id: 'mistral-small:latest', name: 'Mistral Small' },
    { id: 'aya:latest', name: 'Aya' },
  ];
}

// Get all providers with updated model lists
export async function getUpdatedProviders() {
  // Fetch from real APIs
  const openRouterModels = await fetchOpenRouterModels();

  const [claudeModels, openaiModels, geminiModels, grokModels, ollamaModels] = await Promise.all([
    getClaudeModels(openRouterModels),
    getOpenAIModels(openRouterModels),
    getGeminiModels(openRouterModels),
    getGrokModels(openRouterModels),
    getOllamaLibraryModels(),
  ]);

  return {
    claude: {
      name: 'Claude',
      icon: '',
      type: 'cloud',
      models: claudeModels,
    },
    openai: {
      name: 'OpenAI',
      icon: '',
      type: 'cloud',
      models: openaiModels,
    },
    gemini: {
      name: 'Gemini',
      icon: '',
      type: 'cloud',
      models: geminiModels,
    },
    grok: {
      name: 'Grok',
      icon: '',
      type: 'cloud',
      models: grokModels,
    },
    ollama: {
      name: 'Ollama',
      icon: '',
      type: 'local',
      models: ollamaModels,
    },
  };
}

// Cache management - increment version when model IDs change to force refresh
const CACHE_VERSION = 3; // v3: Use full OpenRouter model IDs
const CACHE_KEY = `model_registry_cache_v${CACHE_VERSION}`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedProviders() {
  console.log('getCachedProviders() called');
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      console.log(`Cache found, age: ${Math.round(age / 1000 / 60)} minutes`);
      if (age < CACHE_DURATION) {
        console.log('✓ Using cached model list');
        console.log('Cached providers:', Object.keys(data));
        return data;
      } else {
        console.log('Cache expired, fetching fresh data');
      }
    } else {
      console.log('No cache found');
    }
  } catch (error) {
    console.error('Failed to read cache:', error);
  }

  // Fetch fresh data
  console.log('Fetching fresh model lists...');
  const providers = await getUpdatedProviders();
  console.log('Fetched providers:', Object.keys(providers));
  console.log('Grok models:', providers.grok?.models);
  console.log('Gemini models:', providers.gemini?.models);

  // Cache it
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: providers,
      timestamp: Date.now()
    }));
    console.log('✓ Providers cached successfully');
  } catch (error) {
    console.error('Failed to cache providers:', error);
  }

  return providers;
}

// Force refresh - bypasses cache
export async function refreshProviders() {
  localStorage.removeItem(CACHE_KEY);
  console.log('Cache cleared, fetching fresh data...');
  return await getCachedProviders();
}
