#!/usr/bin/env node
/**
 * MCP Servers Sync Script
 * Scrapes mcp.so to generate a local JSON database of 17,000+ MCP servers
 *
 * Usage: node scripts/sync-mcp-servers.js
 */

const fs = require('fs');
const path = require('path');

const SITEMAPS = [
  'https://mcp.so/sitemap_projects_1.xml',
  'https://mcp.so/sitemap_projects_2.xml',
  'https://mcp.so/sitemap_projects_3.xml',
  'https://mcp.so/sitemap_projects_4.xml'
];

const OUTPUT_FILE = path.join(__dirname, '../src/data/mcp-servers.json');
const RATE_LIMIT_MS = 50; // 20 requests per second
const CONCURRENT_REQUESTS = 10; // Parallel requests
const MAX_RETRIES = 3;

// Progress tracking
let totalUrls = 0;
let processedUrls = 0;
let successCount = 0;
let errorCount = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}

async function parseSitemap(sitemapUrl) {
  console.log(`Fetching sitemap: ${sitemapUrl}`);
  const xml = await fetchWithRetry(sitemapUrl);

  // Extract URLs from sitemap XML
  const urlRegex = /<loc>([^<]+)<\/loc>/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(xml)) !== null) {
    const url = match[1];
    // Only include server pages (not client pages)
    if (url.includes('/server/')) {
      urls.push(url);
    }
  }

  console.log(`  Found ${urls.length} server URLs`);
  return urls;
}

async function scrapeServerPage(url) {
  try {
    const html = await fetchWithRetry(url);

    // Extract __NEXT_DATA__ JSON from script tag
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);

    if (!nextDataMatch) {
      // Try alternative: extract from page content
      return extractFromHtml(url, html);
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const pageProps = nextData?.props?.pageProps;

    if (!pageProps?.project) {
      return extractFromHtml(url, html);
    }

    const project = pageProps.project;
    return normalizeServer(url, project);

  } catch (error) {
    // Try to extract basic info from URL
    return extractFromUrl(url);
  }
}

function extractFromHtml(url, html) {
  // Extract basic info from HTML meta tags and content
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

  // Parse URL for name/author
  const urlParts = url.replace('https://mcp.so/server/', '').split('/');
  const name = urlParts[0] || 'Unknown';
  const author = urlParts[1] || 'unknown';

  return {
    id: `${name}/${author}`,
    name: formatName(name),
    description: descMatch?.[1] || '',
    author: author,
    authorAvatar: `https://github.com/${author}.png`,
    icon: ogImageMatch?.[1] || null,
    github: `https://github.com/${author}/${name}`,
    category: 'other',
    tags: [],
    featured: false,
    install: guessInstallCommand(name)
  };
}

function extractFromUrl(url) {
  const urlParts = url.replace('https://mcp.so/server/', '').split('/');
  const name = urlParts[0] || 'Unknown';
  const author = urlParts[1] || 'unknown';

  return {
    id: `${name}/${author}`,
    name: formatName(name),
    description: '',
    author: author,
    authorAvatar: `https://github.com/${author}.png`,
    icon: null,
    github: `https://github.com/${author}/${name}`,
    category: 'other',
    tags: [],
    featured: false,
    install: guessInstallCommand(name)
  };
}

function normalizeServer(url, project) {
  const urlParts = url.replace('https://mcp.so/server/', '').split('/');
  const urlName = urlParts[0];
  const urlAuthor = urlParts[1] || project.author_name || 'unknown';

  // Parse tags from comma-separated string
  const tags = project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Determine install command from various sources
  const install = parseInstallCommand(project) || guessInstallCommand(urlName);

  return {
    id: `${urlName}/${urlAuthor}`,
    name: project.title || project.name || formatName(urlName),
    description: project.summary || project.description || '',
    author: urlAuthor,
    authorAvatar: project.author_avatar_url || `https://github.com/${urlAuthor}.png`,
    icon: project.avatar_url || project.img_url || null,
    github: project.url || `https://github.com/${urlAuthor}/${urlName}`,
    category: project.category || 'other',
    tags: tags,
    featured: project.is_featured || false,
    install: install
  };
}

function parseInstallCommand(project) {
  // Try to extract install command from content/README
  const content = project.content || project.description || '';

  // Look for common patterns
  const uvxMatch = content.match(/uvx\s+([\w\-@/]+)/);
  if (uvxMatch) {
    return { command: 'uvx', args: [uvxMatch[1]] };
  }

  const npxMatch = content.match(/npx\s+([\w\-@/]+)/);
  if (npxMatch) {
    return { command: 'npx', args: [npxMatch[1]] };
  }

  const pipMatch = content.match(/pip install\s+([\w\-@/]+)/);
  if (pipMatch) {
    return { command: 'pip', args: ['install', pipMatch[1]] };
  }

  const npmMatch = content.match(/npm install\s+-g\s+([\w\-@/]+)/);
  if (npmMatch) {
    return { command: 'npm', args: ['install', '-g', npmMatch[1]] };
  }

  return null;
}

function guessInstallCommand(name) {
  // Guess install command based on naming conventions
  const cleanName = name.toLowerCase().replace(/-mcp$/, '').replace(/^mcp-/, '');

  // Check for common Python packages
  if (name.includes('server') || name.includes('mcp-server')) {
    return { command: 'uvx', args: [`mcp-server-${cleanName}`] };
  }

  return { command: 'uvx', args: [name] };
}

function formatName(name) {
  // Convert kebab-case to Title Case
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/Mcp/g, 'MCP');
}

async function processUrlBatch(urls, batchSize = CONCURRENT_REQUESTS) {
  const results = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (url) => {
        await sleep(RATE_LIMIT_MS);
        try {
          const server = await scrapeServerPage(url);
          processedUrls++;
          successCount++;

          // Progress update every 100 servers
          if (processedUrls % 100 === 0) {
            const percent = ((processedUrls / totalUrls) * 100).toFixed(1);
            console.log(`Progress: ${processedUrls}/${totalUrls} (${percent}%) - Success: ${successCount}, Errors: ${errorCount}`);
          }

          return server;
        } catch (error) {
          processedUrls++;
          errorCount++;
          console.error(`Error scraping ${url}: ${error.message}`);
          return extractFromUrl(url);
        }
      })
    );

    results.push(...batchResults.filter(Boolean));
  }

  return results;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MCP Servers Sync Script');
  console.log('Fetching servers from mcp.so...');
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Step 1: Fetch all URLs from sitemaps
  console.log('\n[Step 1/3] Fetching sitemaps...');
  const allUrls = [];

  for (const sitemap of SITEMAPS) {
    try {
      const urls = await parseSitemap(sitemap);
      allUrls.push(...urls);
    } catch (error) {
      console.error(`Failed to fetch sitemap ${sitemap}: ${error.message}`);
    }
  }

  // Remove duplicates
  const uniqueUrls = [...new Set(allUrls)];
  totalUrls = uniqueUrls.length;
  console.log(`\nTotal unique server URLs: ${totalUrls}`);

  // Step 2: Scrape each server page
  console.log('\n[Step 2/3] Scraping server pages...');
  console.log(`This may take ${Math.ceil(totalUrls * RATE_LIMIT_MS / 1000 / 60)} minutes...\n`);

  const servers = await processUrlBatch(uniqueUrls);

  // Step 3: Save to JSON
  console.log('\n[Step 3/3] Saving to JSON...');

  const outputData = {
    lastUpdated: new Date().toISOString(),
    source: 'mcp.so',
    count: servers.length,
    servers: servers.sort((a, b) => {
      // Sort featured first, then alphabetically
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name);
    })
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('Sync Complete!');
  console.log('='.repeat(60));
  console.log(`Total servers: ${servers.length}`);
  console.log(`Success: ${successCount}, Errors: ${errorCount}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log(`File size: ${fileSize} MB`);
  console.log(`Time elapsed: ${elapsed} minutes`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
