/**
 * Rate Limiter - Respectful request throttling
 * Ensures we don't overwhelm target servers
 */

import PQueue from 'p-queue';

// Default configurations per source
const SOURCE_CONFIGS = {
  goodreads: {
    concurrency: 1,
    intervalMs: 2000,  // 1 request per 2 seconds
    intervalCap: 1
  },
  imdb: {
    concurrency: 1,
    intervalMs: 3000,  // 1 request per 3 seconds (stricter)
    intervalCap: 1
  },
  musicbrainz: {
    concurrency: 1,
    intervalMs: 1000,  // Official rate limit: 1/sec
    intervalCap: 1
  },
  osm: {
    concurrency: 2,
    intervalMs: 1000,
    intervalCap: 2
  },
  default: {
    concurrency: 1,
    intervalMs: 1500,
    intervalCap: 1
  }
};

// Queue instances per source
const queues = new Map();

/**
 * Get or create a rate-limited queue for a source
 */
export function getQueue(source) {
  if (!queues.has(source)) {
    const config = SOURCE_CONFIGS[source] || SOURCE_CONFIGS.default;
    queues.set(source, new PQueue({
      concurrency: config.concurrency,
      interval: config.intervalMs,
      intervalCap: config.intervalCap
    }));
  }
  return queues.get(source);
}

/**
 * Execute a function with rate limiting
 */
export async function rateLimited(source, fn) {
  const queue = getQueue(source);
  return queue.add(fn);
}

/**
 * Add random jitter to avoid detection patterns
 */
export function jitter(baseMs, variance = 0.3) {
  const min = baseMs * (1 - variance);
  const max = baseMs * (1 + variance);
  return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff for retries
 */
export function backoff(attempt, baseMs = 1000, maxMs = 60000) {
  const ms = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  return jitter(ms);
}

export default {
  getQueue,
  rateLimited,
  jitter,
  sleep,
  backoff
};
