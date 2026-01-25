// Pre-configured MCP servers for the Connectors overlay

// Web MCPs - Remote servers accessed via HTTP/SSE
export const WEB_MCP_SERVERS = [
  {
    id: 'cloudflare-mcp',
    name: 'Cloudflare',
    description: 'Manage Workers, D1, R2, KV, and more',
    icon: '☁️',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.cloudflare.com',
    category: 'cloud',
  },
  {
    id: 'github-mcp',
    name: 'GitHub',
    description: 'Access repositories, issues, and pull requests',
    icon: '🐙',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.github.com',
    category: 'development',
  },
  {
    id: 'slack-mcp',
    name: 'Slack',
    description: 'Send messages and manage channels',
    icon: '💬',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.slack.com',
    category: 'communication',
  },
  {
    id: 'notion-mcp',
    name: 'Notion',
    description: 'Access and manage Notion pages and databases',
    icon: '📝',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.notion.so',
    category: 'productivity',
  },
  {
    id: 'linear-mcp',
    name: 'Linear',
    description: 'Manage issues and projects in Linear',
    icon: '📊',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.linear.app',
    category: 'productivity',
  },
];

// Desktop MCPs - Local servers run via stdio (npm packages)
export const DESKTOP_MCP_SERVERS = [
  {
    id: 'filesystem-mcp',
    name: 'Filesystem',
    description: 'Read and write files on your computer',
    icon: '📁',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
    category: 'system',
  },
  {
    id: 'git-mcp',
    name: 'Git',
    description: 'Git operations and repository management',
    icon: '🔀',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git'],
    category: 'development',
  },
  {
    id: 'sqlite-mcp',
    name: 'SQLite',
    description: 'Query and manage SQLite databases',
    icon: '🗄️',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    category: 'database',
  },
  {
    id: 'postgres-mcp',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL databases',
    icon: '🐘',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    category: 'database',
  },
  {
    id: 'brave-search-mcp',
    name: 'Brave Search',
    description: 'Web search via Brave Search API',
    icon: '🦁',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    requiresEnv: {
      BRAVE_API_KEY: 'Brave Search API Key',
    },
    category: 'search',
  },
  {
    id: 'fetch-mcp',
    name: 'Fetch',
    description: 'Fetch and convert web pages to markdown',
    icon: '🌐',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    category: 'web',
  },
  {
    id: 'memory-mcp',
    name: 'Memory',
    description: 'Persistent memory and knowledge graph',
    icon: '🧠',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    category: 'utility',
  },
  {
    id: 'puppeteer-mcp',
    name: 'Puppeteer',
    description: 'Browser automation and web scraping',
    icon: '🎭',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    category: 'automation',
  },
];

// Get all servers for a specific type
export function getServersByType(type) {
  switch (type) {
    case 'web':
      return WEB_MCP_SERVERS;
    case 'desktop':
      return DESKTOP_MCP_SERVERS;
    default:
      return [];
  }
}

// Get server by ID
export function getServerById(id) {
  const allServers = [...WEB_MCP_SERVERS, ...DESKTOP_MCP_SERVERS];
  return allServers.find(s => s.id === id);
}
