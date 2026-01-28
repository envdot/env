// Pre-configured MCP servers for the Connectors overlay
// Comprehensive list of available MCP servers

// Web MCPs - Remote servers accessed via HTTP/SSE (OAuth-based)
export const WEB_MCP_SERVERS = [
  // Cloud & Infrastructure
  {
    id: 'cloudflare-mcp',
    name: 'Cloudflare',
    description: 'Manage Workers, D1, R2, KV, and more',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.cloudflare.com',
    category: 'cloud',
  },
  {
    id: 'vercel-mcp',
    name: 'Vercel',
    description: 'Deploy and manage Vercel projects',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.vercel.com',
    category: 'cloud',
  },
  {
    id: 'netlify-mcp',
    name: 'Netlify',
    description: 'Manage Netlify sites and deployments',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.netlify.com',
    category: 'cloud',
  },
  {
    id: 'supabase-mcp',
    name: 'Supabase',
    description: 'Manage Supabase projects, databases, and auth',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.supabase.com',
    category: 'cloud',
  },
  {
    id: 'firebase-mcp',
    name: 'Firebase',
    description: 'Manage Firebase projects and services',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.firebase.google.com',
    category: 'cloud',
  },

  // Development & Version Control
  {
    id: 'github-mcp',
    name: 'GitHub',
    description: 'Access repositories, issues, and pull requests',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.github.com',
    category: 'development',
  },
  {
    id: 'gitlab-mcp',
    name: 'GitLab',
    description: 'Manage GitLab projects, issues, and pipelines',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.gitlab.com',
    category: 'development',
  },
  {
    id: 'bitbucket-mcp',
    name: 'Bitbucket',
    description: 'Access Bitbucket repositories and pipelines',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.bitbucket.org',
    category: 'development',
  },

  // Communication
  {
    id: 'slack-mcp',
    name: 'Slack',
    description: 'Send messages and manage channels',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.slack.com',
    category: 'communication',
  },
  {
    id: 'discord-mcp',
    name: 'Discord',
    description: 'Manage Discord servers and messages',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.discord.com',
    category: 'communication',
  },
  {
    id: 'teams-mcp',
    name: 'Microsoft Teams',
    description: 'Access Teams chats and channels',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.teams.microsoft.com',
    category: 'communication',
  },

  // Productivity
  {
    id: 'notion-mcp',
    name: 'Notion',
    description: 'Access and manage Notion pages and databases',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.notion.so',
    category: 'productivity',
  },
  {
    id: 'linear-mcp',
    name: 'Linear',
    description: 'Manage issues and projects in Linear',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.linear.app',
    category: 'productivity',
  },
  {
    id: 'asana-mcp',
    name: 'Asana',
    description: 'Manage Asana tasks and projects',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.asana.com',
    category: 'productivity',
  },
  {
    id: 'monday-mcp',
    name: 'Monday.com',
    description: 'Manage Monday boards and items',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.monday.com',
    category: 'productivity',
  },
  {
    id: 'jira-mcp',
    name: 'Jira',
    description: 'Manage Jira issues and projects',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.atlassian.com/jira',
    category: 'productivity',
  },
  {
    id: 'confluence-mcp',
    name: 'Confluence',
    description: 'Access Confluence pages and spaces',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.atlassian.com/confluence',
    category: 'productivity',
  },
  {
    id: 'trello-mcp',
    name: 'Trello',
    description: 'Manage Trello boards and cards',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.trello.com',
    category: 'productivity',
  },
  {
    id: 'airtable-mcp',
    name: 'Airtable',
    description: 'Access Airtable bases and records',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.airtable.com',
    category: 'productivity',
  },

  // Google Services
  {
    id: 'google-drive-mcp',
    name: 'Google Drive',
    description: 'Access and manage Google Drive files',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.google.com/drive',
    category: 'google',
  },
  {
    id: 'google-calendar-mcp',
    name: 'Google Calendar',
    description: 'Manage calendar events and schedules',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.google.com/calendar',
    category: 'google',
  },
  {
    id: 'gmail-mcp',
    name: 'Gmail',
    description: 'Read and send emails via Gmail',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.google.com/gmail',
    category: 'google',
  },
  {
    id: 'google-docs-mcp',
    name: 'Google Docs',
    description: 'Create and edit Google Docs',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.google.com/docs',
    category: 'google',
  },
  {
    id: 'google-sheets-mcp',
    name: 'Google Sheets',
    description: 'Access and modify Google Sheets',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.google.com/sheets',
    category: 'google',
  },

  // CRM & Marketing
  {
    id: 'hubspot-mcp',
    name: 'HubSpot',
    description: 'Manage HubSpot CRM data and contacts',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.hubspot.com',
    category: 'crm',
  },
  {
    id: 'salesforce-mcp',
    name: 'Salesforce',
    description: 'Access Salesforce CRM data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.salesforce.com',
    category: 'crm',
  },
  {
    id: 'mailchimp-mcp',
    name: 'Mailchimp',
    description: 'Manage email campaigns and audiences',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.mailchimp.com',
    category: 'marketing',
  },

  // Analytics & Monitoring
  {
    id: 'amplitude-mcp',
    name: 'Amplitude',
    description: 'Access product analytics data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.amplitude.com',
    category: 'analytics',
  },
  {
    id: 'mixpanel-mcp',
    name: 'Mixpanel',
    description: 'Access Mixpanel analytics',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.mixpanel.com',
    category: 'analytics',
  },
  {
    id: 'sentry-mcp',
    name: 'Sentry',
    description: 'Access error tracking and performance data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.sentry.io',
    category: 'monitoring',
  },
  {
    id: 'datadog-mcp',
    name: 'Datadog',
    description: 'Access monitoring and observability data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.datadog.com',
    category: 'monitoring',
  },
  {
    id: 'grafana-mcp',
    name: 'Grafana',
    description: 'Access dashboards and monitoring data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.grafana.com',
    category: 'monitoring',
  },

  // CI/CD & DevOps
  {
    id: 'circleci-mcp',
    name: 'CircleCI',
    description: 'Manage CircleCI pipelines and builds',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.circleci.com',
    category: 'devops',
  },

  // Payments & Finance
  {
    id: 'stripe-mcp',
    name: 'Stripe',
    description: 'Access Stripe payments and subscriptions',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.stripe.com',
    category: 'finance',
  },

  // Design
  {
    id: 'figma-mcp',
    name: 'Figma',
    description: 'Access Figma files and design data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.figma.com',
    category: 'design',
  },
  {
    id: 'canva-mcp',
    name: 'Canva',
    description: 'Create and manage Canva designs',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.canva.com',
    category: 'design',
  },

  // AI & ML
  {
    id: 'huggingface-mcp',
    name: 'Hugging Face',
    description: 'Access models and datasets on Hugging Face',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.huggingface.co',
    category: 'ai',
  },
  {
    id: 'replicate-mcp',
    name: 'Replicate',
    description: 'Run AI models via Replicate',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.replicate.com',
    category: 'ai',
  },

  // Automation
  {
    id: 'zapier-mcp',
    name: 'Zapier',
    description: 'Connect to 5000+ apps via Zapier',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.zapier.com',
    category: 'automation',
  },
  {
    id: 'make-mcp',
    name: 'Make',
    description: 'Build and run automation scenarios',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.make.com',
    category: 'automation',
  },

  // Social Media
  {
    id: 'twitter-mcp',
    name: 'X (Twitter)',
    description: 'Access Twitter/X posts and data',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.x.com',
    category: 'social',
  },
  {
    id: 'linkedin-mcp',
    name: 'LinkedIn',
    description: 'Access LinkedIn profile and posts',
    type: 'web',
    transport: 'http',
    url: 'https://mcp.linkedin.com',
    category: 'social',
  },
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
