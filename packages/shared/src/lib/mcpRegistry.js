// Pre-configured MCP servers for the Connectors overlay
// All web endpoints verified against real servers (Feb 2026)
// Sources: official docs, awesome-remote-mcp-servers, PulseMCP

// Web MCPs - Remote servers accessed via Streamable HTTP / SSE (OAuth or API key)
export const WEB_MCP_SERVERS = [
  // ── Cloud & Infrastructure ──────────────────────────────────
  { id: 'cloudflare-bindings-mcp', name: 'Cloudflare Workers', description: 'Manage Workers, D1, R2, KV bindings', type: 'web', transport: 'http', url: 'https://bindings.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-observability-mcp', name: 'Cloudflare Observability', description: 'Workers analytics and logs', type: 'web', transport: 'http', url: 'https://observability.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-builds-mcp', name: 'Cloudflare Builds', description: 'CI/CD builds on Cloudflare', type: 'web', transport: 'http', url: 'https://builds.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-radar-mcp', name: 'Cloudflare Radar', description: 'Internet traffic and security insights', type: 'web', transport: 'http', url: 'https://radar.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-containers-mcp', name: 'Cloudflare Containers', description: 'Manage containers on Cloudflare', type: 'web', transport: 'http', url: 'https://containers.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-browser-mcp', name: 'Cloudflare Browser', description: 'Browser rendering service', type: 'web', transport: 'http', url: 'https://browser.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-logs-mcp', name: 'Cloudflare Logpush', description: 'Log management and export', type: 'web', transport: 'http', url: 'https://logs.mcp.cloudflare.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'cloudflare-docs-mcp', name: 'Cloudflare Docs', description: 'Search Cloudflare documentation', type: 'web', transport: 'sse', url: 'https://docs.mcp.cloudflare.com/sse', authType: 'none', category: 'cloud' },
  { id: 'vercel-mcp', name: 'Vercel', description: 'Deploy and manage Vercel projects', type: 'web', transport: 'http', url: 'https://mcp.vercel.com', authType: 'oauth', category: 'cloud' },
  { id: 'netlify-mcp', name: 'Netlify', description: 'Manage Netlify sites and deployments', type: 'web', transport: 'http', url: 'https://netlify-mcp.netlify.app/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'supabase-mcp', name: 'Supabase', description: 'Manage Supabase projects, databases, and auth', type: 'web', transport: 'http', url: 'https://mcp.supabase.com/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'neon-mcp', name: 'Neon', description: 'Serverless Postgres database management', type: 'web', transport: 'http', url: 'https://mcp.neon.tech/mcp', authType: 'oauth', category: 'cloud' },
  { id: 'prisma-mcp', name: 'Prisma', description: 'Database ORM and Prisma Postgres', type: 'web', transport: 'http', url: 'https://mcp.prisma.io/mcp', authType: 'oauth', category: 'cloud' },

  // ── Google Cloud ────────────────────────────────────────────
  { id: 'google-bigquery-mcp', name: 'Google BigQuery', description: 'Query and manage BigQuery datasets', type: 'web', transport: 'http', url: 'https://bigquery.googleapis.com/mcp', authType: 'oauth', category: 'google' },
  { id: 'google-maps-mcp', name: 'Google Maps', description: 'Maps, directions, and places API', type: 'web', transport: 'http', url: 'https://mapstools.googleapis.com/mcp', authType: 'api_key', category: 'google' },
  { id: 'google-compute-mcp', name: 'Google Compute Engine', description: 'Manage VMs and compute resources', type: 'web', transport: 'http', url: 'https://compute.googleapis.com/mcp', authType: 'oauth', category: 'google' },
  { id: 'google-gke-mcp', name: 'Google Kubernetes Engine', description: 'Manage GKE clusters', type: 'web', transport: 'http', url: 'https://container.googleapis.com/mcp', authType: 'oauth', category: 'google' },

  // ── Development & Version Control ───────────────────────────
  { id: 'github-mcp', name: 'GitHub', description: 'Access repositories, issues, and pull requests', type: 'web', transport: 'http', url: 'https://api.githubcopilot.com/mcp/', authType: 'oauth', category: 'development' },
  { id: 'gitlab-mcp', name: 'GitLab', description: 'Manage GitLab projects, issues, and pipelines', type: 'web', transport: 'http', url: 'https://gitlab.com/api/v4/mcp', authType: 'oauth', category: 'development' },
  { id: 'buildkite-mcp', name: 'Buildkite', description: 'Manage CI/CD pipelines and builds', type: 'web', transport: 'http', url: 'https://mcp.buildkite.com/mcp', authType: 'oauth', category: 'development' },
  { id: 'stackoverflow-mcp', name: 'Stack Overflow', description: 'Search and access Stack Overflow', type: 'web', transport: 'http', url: 'https://mcp.stackoverflow.com', authType: 'oauth', category: 'development' },

  // ── Productivity & Project Management ───────────────────────
  { id: 'notion-mcp', name: 'Notion', description: 'Access and manage Notion pages and databases', type: 'web', transport: 'http', url: 'https://mcp.notion.com/mcp', authType: 'oauth', category: 'productivity' },
  { id: 'linear-mcp', name: 'Linear', description: 'Manage issues and projects in Linear', type: 'web', transport: 'http', url: 'https://mcp.linear.app/mcp', authType: 'oauth', category: 'productivity' },
  { id: 'asana-mcp', name: 'Asana', description: 'Manage Asana tasks and projects', type: 'web', transport: 'sse', url: 'https://mcp.asana.com/sse', authType: 'oauth', category: 'productivity' },
  { id: 'atlassian-mcp', name: 'Atlassian (Jira & Confluence)', description: 'Manage Jira issues and Confluence pages', type: 'web', transport: 'sse', url: 'https://mcp.atlassian.com/v1/sse', authType: 'oauth', category: 'productivity' },
  { id: 'monday-mcp', name: 'Monday.com', description: 'Manage Monday boards and items', type: 'web', transport: 'http', url: 'https://mcp.monday.com/mcp', authType: 'oauth', category: 'productivity' },

  // ── Design & CMS ────────────────────────────────────────────
  { id: 'figma-mcp', name: 'Figma', description: 'Access Figma files and design data', type: 'web', transport: 'http', url: 'https://mcp.figma.com/mcp', authType: 'oauth', category: 'design' },
  { id: 'canva-mcp', name: 'Canva', description: 'Create and manage Canva designs', type: 'web', transport: 'http', url: 'https://mcp.canva.com/mcp', authType: 'oauth', category: 'design' },
  { id: 'webflow-mcp', name: 'Webflow', description: 'Manage Webflow sites and CMS', type: 'web', transport: 'sse', url: 'https://mcp.webflow.com/sse', authType: 'oauth', category: 'design' },
  { id: 'wix-mcp', name: 'Wix', description: 'Manage Wix sites and applications', type: 'web', transport: 'http', url: 'https://mcp.wix.com/mcp', authType: 'oauth', category: 'design' },

  // ── CRM & Sales ─────────────────────────────────────────────
  { id: 'hubspot-mcp', name: 'HubSpot', description: 'Manage HubSpot CRM data and contacts', type: 'web', transport: 'http', url: 'https://mcp.hubspot.com', authType: 'oauth', category: 'crm' },
  { id: 'close-mcp', name: 'Close', description: 'Manage Close CRM data and leads', type: 'web', transport: 'http', url: 'https://mcp.close.com/mcp', authType: 'oauth', category: 'crm' },

  // ── Payments & Finance ──────────────────────────────────────
  { id: 'stripe-mcp', name: 'Stripe', description: 'Access Stripe payments and subscriptions', type: 'web', transport: 'http', url: 'https://mcp.stripe.com', authType: 'oauth', category: 'finance' },
  { id: 'paypal-mcp', name: 'PayPal', description: 'Manage PayPal transactions and payments', type: 'web', transport: 'sse', url: 'https://mcp.paypal.com/sse', authType: 'oauth', category: 'finance' },
  { id: 'square-mcp', name: 'Square', description: 'Access Square payments and commerce', type: 'web', transport: 'sse', url: 'https://mcp.squareup.com/sse', authType: 'oauth', category: 'finance' },
  { id: 'plaid-mcp', name: 'Plaid', description: 'Financial data and bank connections', type: 'web', transport: 'sse', url: 'https://api.dashboard.plaid.com/mcp/sse', authType: 'oauth', category: 'finance' },

  // ── Monitoring & Observability ──────────────────────────────
  { id: 'sentry-mcp', name: 'Sentry', description: 'Error tracking and performance monitoring', type: 'web', transport: 'http', url: 'https://mcp.sentry.dev/mcp', authType: 'oauth', category: 'monitoring' },
  { id: 'datadog-mcp', name: 'Datadog', description: 'Infrastructure monitoring and observability', type: 'web', transport: 'http', url: 'https://mcp.datadoghq.com/api/unstable/mcp-server/mcp', authType: 'oauth', category: 'monitoring' },
  { id: 'pagerduty-mcp', name: 'PagerDuty', description: 'Incident management and alerting', type: 'web', transport: 'http', url: 'https://mcp.pagerduty.com/mcp', authType: 'api_key', category: 'monitoring' },

  // ── Customer Support ────────────────────────────────────────
  { id: 'intercom-mcp', name: 'Intercom', description: 'Customer messaging and support', type: 'web', transport: 'http', url: 'https://mcp.intercom.com/mcp', authType: 'oauth', category: 'support' },

  // ── Document Management ─────────────────────────────────────
  { id: 'box-mcp', name: 'Box', description: 'Cloud content management and file sharing', type: 'web', transport: 'http', url: 'https://mcp.box.com', authType: 'oauth', category: 'documents' },
  { id: 'dropbox-mcp', name: 'Dropbox', description: 'File storage and collaboration', type: 'web', transport: 'http', url: 'https://mcp.dropbox.com/mcp', authType: 'oauth', category: 'documents' },

  // ── E-Commerce ──────────────────────────────────────────────
  { id: 'shopify-mcp', name: 'Shopify', description: 'Shopify storefront data access', type: 'web', transport: 'http', url: 'https://shopify.dev/mcp', authType: 'none', category: 'commerce' },

  // ── Media & Assets ──────────────────────────────────────────
  { id: 'cloudinary-mcp', name: 'Cloudinary', description: 'Image and video asset management', type: 'web', transport: 'sse', url: 'https://asset-management.mcp.cloudinary.com/sse', authType: 'oauth', category: 'media' },

  // ── AI & ML ─────────────────────────────────────────────────
  { id: 'huggingface-mcp', name: 'Hugging Face', description: 'Access models and datasets', type: 'web', transport: 'http', url: 'https://huggingface.co/mcp', authType: 'api_key', category: 'ai' },

  // ── Automation ──────────────────────────────────────────────
  { id: 'zapier-mcp', name: 'Zapier', description: 'Connect to 7000+ apps via Zapier', type: 'web', transport: 'http', url: 'https://mcp.zapier.com/api/mcp/mcp', authType: 'api_key', category: 'automation' },

  // ── Jobs ────────────────────────────────────────────────────
  { id: 'indeed-mcp', name: 'Indeed', description: 'Job search and listings', type: 'web', transport: 'http', url: 'https://mcp.indeed.com/claude/mcp', authType: 'oauth', category: 'jobs' },

  // ── Open / No-Auth Servers ──────────────────────────────────
  { id: 'semgrep-mcp', name: 'Semgrep', description: 'Code analysis and security scanning', type: 'web', transport: 'sse', url: 'https://mcp.semgrep.ai/sse', authType: 'none', category: 'development' },
  { id: 'aws-knowledge-mcp', name: 'AWS Knowledge', description: 'AWS documentation and best practices', type: 'web', transport: 'http', url: 'https://knowledge-mcp.global.api.aws', authType: 'none', category: 'cloud' },
  { id: 'exa-mcp', name: 'Exa Search', description: 'AI-powered web search', type: 'web', transport: 'http', url: 'https://mcp.exa.ai/mcp', authType: 'none', category: 'search' },
  { id: 'deepwiki-mcp', name: 'DeepWiki', description: 'AI-powered wiki and documentation search', type: 'web', transport: 'sse', url: 'https://mcp.deepwiki.com/sse', authType: 'none', category: 'knowledge' },
  { id: 'apify-web-mcp', name: 'Apify', description: 'Web scraping and data extraction', type: 'web', transport: 'http', url: 'https://mcp.apify.com', authType: 'api_key', category: 'web' },
];

// Desktop MCPs - Local servers run via stdio (npm packages)
export const DESKTOP_MCP_SERVERS = [
  // Official Reference Servers
  {
    id: 'filesystem-mcp',
    name: 'Filesystem',
    description: 'Read and write files on your computer',
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
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git'],
    category: 'development',
  },
  {
    id: 'memory-mcp',
    name: 'Memory',
    description: 'Persistent memory and knowledge graph',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    category: 'utility',
  },
  {
    id: 'fetch-mcp',
    name: 'Fetch',
    description: 'Fetch and convert web pages to markdown',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    category: 'web',
  },
  {
    id: 'time-mcp',
    name: 'Time',
    description: 'Time and timezone conversion utilities',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-time'],
    category: 'utility',
  },
  {
    id: 'sequential-thinking-mcp',
    name: 'Sequential Thinking',
    description: 'Dynamic problem-solving through thought sequences',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequentialthinking'],
    category: 'reasoning',
  },
  {
    id: 'everything-mcp',
    name: 'Everything',
    description: 'Reference server with prompts, resources, and tools',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    category: 'testing',
  },

  // Databases
  {
    id: 'sqlite-mcp',
    name: 'SQLite',
    description: 'Query and manage SQLite databases',
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
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    category: 'database',
  },
  {
    id: 'mysql-mcp',
    name: 'MySQL',
    description: 'Connect to MySQL databases',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@benborber/mcp-server-mysql'],
    category: 'database',
  },
  {
    id: 'mongodb-mcp',
    name: 'MongoDB',
    description: 'Connect to MongoDB databases',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-mongo-server'],
    category: 'database',
  },
  {
    id: 'redis-mcp',
    name: 'Redis',
    description: 'Connect to Redis databases',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-redis'],
    category: 'database',
  },

  // Search
  {
    id: 'brave-search-mcp',
    name: 'Brave Search',
    description: 'Web search via Brave Search API',
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
    id: 'exa-mcp',
    name: 'Exa',
    description: 'AI-powered web search via Exa',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    requiresEnv: {
      EXA_API_KEY: 'Exa API Key',
    },
    category: 'search',
  },
  {
    id: 'tavily-mcp',
    name: 'Tavily',
    description: 'AI search engine for LLMs',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'tavily-mcp'],
    requiresEnv: {
      TAVILY_API_KEY: 'Tavily API Key',
    },
    category: 'search',
  },
  {
    id: 'kagi-mcp',
    name: 'Kagi Search',
    description: 'Search via Kagi API',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropics/kagi-mcp-server'],
    requiresEnv: {
      KAGI_API_KEY: 'Kagi API Key',
    },
    category: 'search',
  },

  // Browser Automation
  {
    id: 'puppeteer-mcp',
    name: 'Puppeteer',
    description: 'Browser automation and web scraping',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    category: 'automation',
  },
  {
    id: 'playwright-mcp',
    name: 'Playwright',
    description: 'Cross-browser automation with Playwright',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropics/mcp-server-playwright'],
    category: 'automation',
  },
  {
    id: 'browserbase-mcp',
    name: 'Browserbase',
    description: 'Cloud browser automation',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@browserbase/mcp-server-browserbase'],
    requiresEnv: {
      BROWSERBASE_API_KEY: 'Browserbase API Key',
    },
    category: 'automation',
  },

  // Web Scraping & Data
  {
    id: 'firecrawl-mcp',
    name: 'Firecrawl',
    description: 'Crawl and scrape websites for data',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    requiresEnv: {
      FIRECRAWL_API_KEY: 'Firecrawl API Key',
    },
    category: 'web',
  },
  {
    id: 'apify-mcp',
    name: 'Apify',
    description: 'Web scraping with 3000+ ready-made actors',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropics/mcp-server-apify'],
    requiresEnv: {
      APIFY_TOKEN: 'Apify API Token',
    },
    category: 'web',
  },

  // Cloud Services
  {
    id: 'aws-mcp',
    name: 'AWS',
    description: 'AWS services via CLI',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropics/mcp-server-aws'],
    category: 'cloud',
  },
  {
    id: 'terraform-mcp',
    name: 'Terraform',
    description: 'Infrastructure as code with Terraform',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropics/mcp-server-terraform'],
    category: 'cloud',
  },
  {
    id: 'kubernetes-mcp',
    name: 'Kubernetes',
    description: 'Manage Kubernetes clusters',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-kubernetes'],
    category: 'cloud',
  },
  {
    id: 'docker-mcp',
    name: 'Docker',
    description: 'Manage Docker containers and images',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-docker'],
    category: 'cloud',
  },

  // AI & Image Generation
  {
    id: 'dalle-mcp',
    name: 'DALL-E',
    description: 'Generate images with DALL-E',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-dalle'],
    requiresEnv: {
      OPENAI_API_KEY: 'OpenAI API Key',
    },
    category: 'ai',
  },
  {
    id: 'stable-diffusion-mcp',
    name: 'Stable Diffusion',
    description: 'Generate images with Stable Diffusion',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-stability'],
    requiresEnv: {
      STABILITY_API_KEY: 'Stability AI API Key',
    },
    category: 'ai',
  },

  // Developer Tools
  {
    id: 'github-local-mcp',
    name: 'GitHub CLI',
    description: 'GitHub operations via local CLI',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    requiresEnv: {
      GITHUB_TOKEN: 'GitHub Personal Access Token',
    },
    category: 'development',
  },
  {
    id: 'npm-mcp',
    name: 'NPM',
    description: 'Search and manage NPM packages',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-npm'],
    category: 'development',
  },

  // Communication
  {
    id: 'slack-local-mcp',
    name: 'Slack CLI',
    description: 'Slack via local Bot Token',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    requiresEnv: {
      SLACK_BOT_TOKEN: 'Slack Bot Token',
    },
    category: 'communication',
  },
  {
    id: 'email-mcp',
    name: 'Email',
    description: 'Send and read emails via IMAP/SMTP',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-email'],
    requiresEnv: {
      EMAIL_HOST: 'Email server host',
      EMAIL_USER: 'Email username',
      EMAIL_PASS: 'Email password',
    },
    category: 'communication',
  },

  // Maps & Location
  {
    id: 'google-maps-mcp',
    name: 'Google Maps',
    description: 'Maps, directions, and places',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    requiresEnv: {
      GOOGLE_MAPS_API_KEY: 'Google Maps API Key',
    },
    category: 'maps',
  },
  {
    id: 'mapbox-mcp',
    name: 'Mapbox',
    description: 'Maps and geolocation services',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-mapbox'],
    requiresEnv: {
      MAPBOX_ACCESS_TOKEN: 'Mapbox Access Token',
    },
    category: 'maps',
  },

  // Finance & Data
  {
    id: 'yahoo-finance-mcp',
    name: 'Yahoo Finance',
    description: 'Stock prices and financial data',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-yahoo-finance'],
    category: 'finance',
  },
  {
    id: 'alphavantage-mcp',
    name: 'Alpha Vantage',
    description: 'Stock market data and analysis',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-alphavantage'],
    requiresEnv: {
      ALPHAVANTAGE_API_KEY: 'Alpha Vantage API Key',
    },
    category: 'finance',
  },

  // Knowledge & Research
  {
    id: 'wikipedia-mcp',
    name: 'Wikipedia',
    description: 'Search and read Wikipedia articles',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-wikipedia'],
    category: 'knowledge',
  },
  {
    id: 'arxiv-mcp',
    name: 'arXiv',
    description: 'Search academic papers on arXiv',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-arxiv'],
    category: 'knowledge',
  },
  {
    id: 'pubmed-mcp',
    name: 'PubMed',
    description: 'Search medical literature',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-pubmed'],
    category: 'knowledge',
  },

  // Media & Content
  {
    id: 'youtube-mcp',
    name: 'YouTube',
    description: 'Search and get video transcripts',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-youtube'],
    category: 'media',
  },
  {
    id: 'spotify-mcp',
    name: 'Spotify',
    description: 'Control Spotify playback and search',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-spotify'],
    requiresEnv: {
      SPOTIFY_CLIENT_ID: 'Spotify Client ID',
      SPOTIFY_CLIENT_SECRET: 'Spotify Client Secret',
    },
    category: 'media',
  },

  // Productivity
  {
    id: 'todoist-mcp',
    name: 'Todoist',
    description: 'Manage Todoist tasks',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-todoist'],
    requiresEnv: {
      TODOIST_API_TOKEN: 'Todoist API Token',
    },
    category: 'productivity',
  },
  {
    id: 'obsidian-mcp',
    name: 'Obsidian',
    description: 'Read and write Obsidian notes',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-obsidian'],
    category: 'productivity',
  },

  // Productivity & SaaS
  {
    id: 'notion-local-mcp',
    name: 'Notion',
    description: 'Access and manage Notion pages and databases',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    requiresEnv: {
      NOTION_TOKEN: 'Notion Integration Token (ntn_...)',
    },
    category: 'productivity',
  },
  {
    id: 'discord-mcp',
    name: 'Discord',
    description: 'Manage Discord servers, channels, and messages',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-discord'],
    requiresEnv: {
      DISCORD_TOKEN: 'Discord Bot Token',
    },
    category: 'communication',
  },
  {
    id: 'google-workspace-mcp',
    name: 'Google Workspace',
    description: 'Access Gmail, Drive, Docs, Sheets, Calendar, and more',
    type: 'desktop',
    transport: 'stdio',
    command: 'uvx',
    args: ['workspace-mcp'],
    requiresEnv: {
      GOOGLE_OAUTH_CLIENT_ID: 'Google OAuth Client ID',
      GOOGLE_OAUTH_CLIENT_SECRET: 'Google OAuth Client Secret',
    },
    category: 'productivity',
  },
  {
    id: 'twitter-mcp',
    name: 'X (Twitter)',
    description: 'Post tweets and search Twitter/X',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@enescinar/twitter-mcp'],
    requiresEnv: {
      API_KEY: 'Twitter API Key',
      API_SECRET_KEY: 'Twitter API Secret Key',
      ACCESS_TOKEN: 'Twitter Access Token',
      ACCESS_TOKEN_SECRET: 'Twitter Access Token Secret',
    },
    category: 'social',
  },

  // System
  {
    id: 'shell-mcp',
    name: 'Shell',
    description: 'Execute shell commands',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-shell'],
    category: 'system',
  },
  {
    id: 'macos-mcp',
    name: 'macOS',
    description: 'macOS system operations and AppleScript',
    type: 'desktop',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-macos'],
    category: 'system',
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

// Get servers by category
export function getServersByCategory(category) {
  const allServers = [...WEB_MCP_SERVERS, ...DESKTOP_MCP_SERVERS];
  return allServers.filter(s => s.category === category);
}

// Get all unique categories
export function getAllCategories() {
  const allServers = [...WEB_MCP_SERVERS, ...DESKTOP_MCP_SERVERS];
  return [...new Set(allServers.map(s => s.category))];
}
