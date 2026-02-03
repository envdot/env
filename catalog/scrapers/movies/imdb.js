/**
 * IMDb Movie Scraper
 * 
 * Strategy:
 * 1. Genre listings: https://www.imdb.com/search/title/?genres=action
 * 2. Top lists: https://www.imdb.com/chart/top/
 * 3. Year-based: https://www.imdb.com/search/title/?year=2023
 * 4. Paginate through results (50 per page)
 * 
 * Key genres:
 * action, adventure, animation, biography, comedy, crime, documentary,
 * drama, family, fantasy, film-noir, history, horror, music, musical,
 * mystery, romance, sci-fi, sport, thriller, war, western
 */

import * as cheerio from 'cheerio';
import { fetchHTML } from '../../utils/fetcher.js';
import { initMoviesDB } from '../../utils/storage.js';
import { sleep, jitter } from '../../utils/rate-limiter.js';

const BASE_URL = 'https://www.imdb.com';
const SOURCE = 'imdb';

const GENRES = [
  'action', 'adventure', 'animation', 'biography', 'comedy', 'crime',
  'documentary', 'drama', 'family', 'fantasy', 'film-noir', 'history',
  'horror', 'music', 'musical', 'mystery', 'romance', 'sci-fi',
  'sport', 'thriller', 'war', 'western'
];

/**
 * Parse the IMDb search results page
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const movies = [];

  // IMDb's modern layout uses different selectors
  // Try multiple approaches
  
  // Modern card layout
  $('.ipc-metadata-list-summary-item').each((_, el) => {
    try {
      const $el = $(el);
      
      // Title and URL
      const titleLink = $el.find('a.ipc-title-link-wrapper');
      const url = titleLink.attr('href');
      const sourceId = url?.match(/\/title\/(tt\d+)/)?.[1];
      const title = titleLink.find('h3').text().replace(/^\d+\.\s*/, '').trim();
      
      // Year
      const metaText = $el.find('.dli-title-metadata-item').first().text();
      const year = parseInt(metaText) || null;
      
      // Rating
      const ratingText = $el.find('.ipc-rating-star--rating').text();
      const rating = parseFloat(ratingText) || null;
      
      // Vote count
      const voteText = $el.find('.ipc-rating-star--voteCount').text();
      const voteMatch = voteText.match(/([\d.]+)([KM])?/);
      let ratingCount = null;
      if (voteMatch) {
        ratingCount = parseFloat(voteMatch[1]);
        if (voteMatch[2] === 'K') ratingCount *= 1000;
        if (voteMatch[2] === 'M') ratingCount *= 1000000;
        ratingCount = Math.round(ratingCount);
      }
      
      // Image
      const imageUrl = $el.find('img.ipc-image').attr('src');
      
      // Runtime
      const runtimeText = $el.find('.dli-title-metadata-item').eq(1).text();
      const runtimeMatch = runtimeText.match(/(\d+)h\s*(\d+)?m?/);
      let runtimeMinutes = null;
      if (runtimeMatch) {
        runtimeMinutes = parseInt(runtimeMatch[1]) * 60;
        if (runtimeMatch[2]) runtimeMinutes += parseInt(runtimeMatch[2]);
      }

      if (sourceId && title) {
        movies.push({
          source_id: sourceId,
          source: SOURCE,
          title,
          year,
          rating,
          rating_count: ratingCount,
          runtime_minutes: runtimeMinutes,
          image_url: imageUrl,
          url: url ? `${BASE_URL}${url}` : null
        });
      }
    } catch (e) {
      // Skip malformed entries
    }
  });

  // Legacy layout fallback
  if (movies.length === 0) {
    $('.lister-item').each((_, el) => {
      try {
        const $el = $(el);
        
        const titleLink = $el.find('.lister-item-header a');
        const url = titleLink.attr('href');
        const sourceId = url?.match(/\/title\/(tt\d+)/)?.[1];
        const title = titleLink.text().trim();
        
        const yearText = $el.find('.lister-item-year').text();
        const year = parseInt(yearText.match(/\d{4}/)?.[0]) || null;
        
        const rating = parseFloat($el.find('.ratings-imdb-rating strong').text()) || null;
        
        const voteText = $el.find('[name="nv"]').first().attr('data-value');
        const ratingCount = voteText ? parseInt(voteText) : null;
        
        const imageUrl = $el.find('.lister-item-image img').attr('loadlate') ||
                        $el.find('.lister-item-image img').attr('src');
        
        if (sourceId && title) {
          movies.push({
            source_id: sourceId,
            source: SOURCE,
            title,
            year,
            rating,
            rating_count: ratingCount,
            image_url: imageUrl,
            url: url ? `${BASE_URL}${url}` : null
          });
        }
      } catch (e) {
        // Skip
      }
    });
  }

  // Check for next page
  const nextButton = $('a.lister-page-next, button[data-testid="test-next"]').length > 0;
  
  return { movies, hasNextPage: nextButton || movies.length >= 50 };
}

/**
 * Parse the Top 250 chart page
 */
function parseChartPage(html) {
  const $ = cheerio.load(html);
  const movies = [];

  $('li.ipc-metadata-list-summary-item, .lister-list tr').each((_, el) => {
    try {
      const $el = $(el);
      
      const titleLink = $el.find('a[href*="/title/"]').first();
      const url = titleLink.attr('href');
      const sourceId = url?.match(/\/title\/(tt\d+)/)?.[1];
      
      // Get title (remove rank number)
      let title = titleLink.find('h3').text() || $el.find('.titleColumn a').text();
      title = title.replace(/^\d+\.\s*/, '').trim();
      
      const ratingText = $el.find('.ipc-rating-star--rating, .imdbRating strong').text();
      const rating = parseFloat(ratingText) || null;
      
      const yearText = $el.find('.cli-title-metadata-item, .secondaryInfo').first().text();
      const year = parseInt(yearText) || null;
      
      if (sourceId && title) {
        movies.push({
          source_id: sourceId,
          source: SOURCE,
          title,
          year,
          rating,
          url: url ? `${BASE_URL}${url}` : null
        });
      }
    } catch (e) {
      // Skip
    }
  });

  return { movies, hasNextPage: false };
}

/**
 * Get full details for a movie
 */
async function getMovieDetails(movieUrl) {
  const html = await fetchHTML(movieUrl, { source: SOURCE });
  const $ = cheerio.load(html);
  
  const details = {};
  
  // Description
  const description = $('[data-testid="plot"] span').first().text().trim() ||
                     $('.summary_text').text().trim();
  if (description) details.description = description;
  
  // Genres
  const genres = [];
  $('[data-testid="genres"] a, .genres a').each((_, el) => {
    genres.push($(el).text().trim());
  });
  if (genres.length) details.genres = JSON.stringify(genres);
  
  // Directors
  const directors = [];
  $('[data-testid="title-pc-principal-credit"]:contains("Director") a, .credit_summary_item:contains("Director") a').each((_, el) => {
    const name = $(el).text().trim();
    if (name && !name.includes('more')) directors.push(name);
  });
  if (directors.length) details.directors = JSON.stringify(directors);
  
  // Cast
  const cast = [];
  $('[data-testid="title-cast-item"] a[data-testid="title-cast-item__actor"], .cast_list a[href*="/name/"]').slice(0, 10).each((_, el) => {
    const name = $(el).text().trim();
    if (name) cast.push(name);
  });
  if (cast.length) details.cast = JSON.stringify(cast);
  
  // Content rating
  const contentRating = $('[data-testid="storyline-certificate"] a').text().trim() ||
                       $('meta[itemprop="contentRating"]').attr('content');
  if (contentRating) details.content_rating = contentRating;
  
  // Original title
  const originalTitle = $('[data-testid="hero-title-block__original-title"]').text()
    .replace('Original title:', '').trim();
  if (originalTitle) details.original_title = originalTitle;
  
  return details;
}

/**
 * Scrape a genre
 */
async function scrapeGenre(genre, options = {}) {
  const {
    maxPages = 50,
    fetchDetails = false,
    startPage = 1,
    sortBy = 'num_votes,desc'  // Most voted first
  } = options;

  const db = initMoviesDB();
  const insertStmt = db.prepare(`
    INSERT INTO movies (source_id, source, title, original_title, year, runtime_minutes,
                        description, genres, rating, rating_count, directors, cast,
                        image_url, url, content_rating)
    VALUES (@source_id, @source, @title, @original_title, @year, @runtime_minutes,
            @description, @genres, @rating, @rating_count, @directors, @cast,
            @image_url, @url, @content_rating)
    ON CONFLICT(source_id) DO UPDATE SET
      title = excluded.title,
      rating = COALESCE(excluded.rating, movies.rating),
      rating_count = COALESCE(excluded.rating_count, movies.rating_count),
      updated_at = CURRENT_TIMESTAMP
  `);

  let page = startPage;
  let totalMovies = 0;
  let hasMore = true;
  
  console.log(`\n🎬 Scraping genre: ${genre}`);
  console.log(`   Starting from page ${startPage}, max ${maxPages} pages\n`);

  while (hasMore && page < startPage + maxPages) {
    try {
      const start = (page - 1) * 50 + 1;
      const url = `${BASE_URL}/search/title/?genres=${genre}&sort=${sortBy}&start=${start}&explore=title_type,genres`;
      console.log(`   Page ${page}: fetching items ${start}-${start + 49}`);
      
      const html = await fetchHTML(url, { source: SOURCE });
      const { movies, hasNextPage } = parseSearchPage(html);
      
      if (movies.length === 0) {
        console.log(`   ⚠️  No movies found on page ${page}, stopping`);
        break;
      }

      // Add genre to each movie
      for (const movie of movies) {
        movie.genres = JSON.stringify([genre]);
      }

      // Optionally fetch details
      if (fetchDetails) {
        for (const movie of movies) {
          if (movie.url) {
            await sleep(jitter(2000));
            try {
              const details = await getMovieDetails(movie.url);
              Object.assign(movie, details);
            } catch (e) {
              console.log(`   ⚠️  Failed to get details for: ${movie.title}`);
            }
          }
        }
      }

      // Save to database
      const transaction = db.transaction(() => {
        for (const movie of movies) {
          insertStmt.run({
            source_id: movie.source_id,
            source: movie.source,
            title: movie.title,
            original_title: movie.original_title || null,
            year: movie.year || null,
            runtime_minutes: movie.runtime_minutes || null,
            description: movie.description || null,
            genres: movie.genres || null,
            rating: movie.rating || null,
            rating_count: movie.rating_count || null,
            directors: movie.directors || null,
            cast: movie.cast || null,
            image_url: movie.image_url || null,
            url: movie.url || null,
            content_rating: movie.content_rating || null
          });
        }
      });
      transaction();

      totalMovies += movies.length;
      console.log(`   ✓ Saved ${movies.length} movies (total: ${totalMovies})`);

      hasMore = hasNextPage && movies.length >= 50;
      page++;
      
      await sleep(jitter(1000));
      
    } catch (error) {
      console.error(`   ❌ Error on page ${page}:`, error.message);
      page++;
      await sleep(jitter(5000));
    }
  }

  console.log(`\n✅ Completed genre "${genre}": ${totalMovies} movies scraped\n`);
  return totalMovies;
}

/**
 * Scrape the Top 250 chart
 */
async function scrapeTop250() {
  const db = initMoviesDB();
  const insertStmt = db.prepare(`
    INSERT INTO movies (source_id, source, title, year, rating, url)
    VALUES (@source_id, @source, @title, @year, @rating, @url)
    ON CONFLICT(source_id) DO UPDATE SET
      rating = COALESCE(excluded.rating, movies.rating),
      updated_at = CURRENT_TIMESTAMP
  `);

  console.log('\n🏆 Scraping IMDb Top 250...\n');
  
  const url = `${BASE_URL}/chart/top/`;
  const html = await fetchHTML(url, { source: SOURCE });
  const { movies } = parseChartPage(html);
  
  const transaction = db.transaction(() => {
    for (const movie of movies) {
      insertStmt.run({
        source_id: movie.source_id,
        source: movie.source,
        title: movie.title,
        year: movie.year || null,
        rating: movie.rating || null,
        url: movie.url || null
      });
    }
  });
  transaction();

  console.log(`✅ Saved ${movies.length} movies from Top 250\n`);
  return movies.length;
}

/**
 * Get database stats
 */
function getStats() {
  const db = initMoviesDB();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM movies').get();
  const byYear = db.prepare(`
    SELECT year, COUNT(*) as count 
    FROM movies 
    WHERE year IS NOT NULL
    GROUP BY year 
    ORDER BY year DESC
    LIMIT 20
  `).all();
  const topRated = db.prepare(`
    SELECT title, year, rating 
    FROM movies 
    WHERE rating IS NOT NULL 
    ORDER BY rating DESC 
    LIMIT 10
  `).all();
  
  return { total: total.count, byYear, topRated };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
IMDb Movie Scraper

Usage:
  node imdb.js [options]

Options:
  --genre <name>     Scrape a specific genre
  --top250           Scrape the Top 250 chart
  --year <year>      Filter by release year
  --pages <n>        Max pages per genre (default: 50)
  --details          Fetch full movie details (slower)
  --stats            Show database statistics
  --help             Show this help

Genres:
  ${GENRES.join(', ')}

Examples:
  node imdb.js --genre sci-fi --pages 10
  node imdb.js --top250
  node imdb.js --stats
    `);
    return;
  }

  if (args.includes('--stats')) {
    const stats = getStats();
    console.log('\n📊 Database Statistics\n');
    console.log(`Total movies: ${stats.total.toLocaleString()}`);
    console.log('\nTop 10 highest rated:');
    for (const m of stats.topRated) {
      console.log(`  ${m.rating} - ${m.title} (${m.year})`);
    }
    console.log('\nMovies by year (recent):');
    for (const { year, count } of stats.byYear) {
      console.log(`  ${year}: ${count.toLocaleString()}`);
    }
    return;
  }

  if (args.includes('--top250')) {
    await scrapeTop250();
    return;
  }

  const genreIndex = args.indexOf('--genre');
  const pagesIndex = args.indexOf('--pages');
  
  const genre = genreIndex >= 0 ? args[genreIndex + 1] : null;
  const maxPages = pagesIndex >= 0 ? parseInt(args[pagesIndex + 1]) : 50;
  const fetchDetails = args.includes('--details');

  if (genre) {
    await scrapeGenre(genre, { maxPages, fetchDetails });
  } else {
    console.log('🎬 IMDb Scraper - specify --genre or --top250');
    console.log('   Run with --help for usage');
  }
}

export {
  scrapeGenre,
  scrapeTop250,
  getMovieDetails,
  getStats,
  GENRES
};

main().catch(console.error);
