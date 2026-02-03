/**
 * Fetcher - HTTP client with built-in rate limiting, retries, and user-agent rotation
 */

import fetch from 'node-fetch';
import pRetry from 'p-retry';
import UserAgent from 'user-agents';
import { rateLimited, backoff, sleep } from './rate-limiter.js';

// Rotating user agents
const userAgentGenerator = new UserAgent({ deviceCategory: 'desktop' });

/**
 * Main fetch function with all protections
 */
export async function safeFetch(url, options = {}) {
  const {
    source = 'default',
    retries = 3,
    headers = {},
    ...fetchOptions
  } = options;

  const doFetch = async () => {
    return rateLimited(source, async () => {
      const userAgent = userAgentGenerator.random().toString();
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          ...headers
        }
      });

      if (response.status === 429) {
        // Rate limited - throw to trigger retry with backoff
        throw new Error(`Rate limited (429) for ${url}`);
      }

      if (response.status === 503 || response.status === 502) {
        // Server overloaded - retry
        throw new Error(`Server error (${response.status}) for ${url}`);
      }

      if (!response.ok) {
        throw new pRetry.AbortError(`HTTP ${response.status} for ${url}`);
      }

      return response;
    });
  };

  return pRetry(doFetch, {
    retries,
    onFailedAttempt: async (error) => {
      const waitMs = backoff(error.attemptNumber);
      console.log(`  ⚠️  Attempt ${error.attemptNumber} failed. Retrying in ${waitMs}ms...`);
      await sleep(waitMs);
    }
  });
}

/**
 * Fetch and return HTML text
 */
export async function fetchHTML(url, options = {}) {
  const response = await safeFetch(url, options);
  return response.text();
}

/**
 * Fetch and return JSON
 */
export async function fetchJSON(url, options = {}) {
  const response = await safeFetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers
    }
  });
  return response.json();
}

export default {
  safeFetch,
  fetchHTML,
  fetchJSON
};
