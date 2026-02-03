/**
 * Goodreads Book Scraper
 * 
 * Strategy:
 * 1. Start from shelf listings: https://www.goodreads.com/shelf/show/{genre}
 * 2. Each shelf page lists ~50 books with basic info
 * 3. Paginate through: ?page=1, ?page=2, etc.
 * 4. Optionally fetch full details for each book
 * 
 * Popular shelves to crawl:
 * - fiction, non-fiction, fantasy, science-fiction, mystery
 * - thriller, romance, horror, historical-fiction, biography
 * - self-help, philosophy, science, history, poetry
 * - young-adult, classics, contemporary, literary-fiction
 */

import * as cheerio from 'cheerio';
import { fetchHTML } from '../../utils/fetcher.js';
import { initBooksDB, upsert } from '../../utils/storage.js';
import { sleep, jitter } from '../../utils/rate-limiter.js';

const BASE_URL = 'https://www.goodreads.com';
const SOURCE = 'goodreads';

// Popular shelves with estimated book counts
const POPULAR_SHELVES = [
  { name: 'fiction', books: 300000 },
  { name: 'fantasy', books: 250000 },
  { name: 'science-fiction', books: 200000 },
  { name: 'mystery', books: 180000 },
  { name: 'romance', books: 350000 },
  { name: 'thriller', books: 150000 },
  { name: 'non-fiction', books: 280000 },
  { name: 'historical-fiction', books: 120000 },
  { name: 'horror', books: 100000 },
  { name: 'biography', books: 90000 },
  { name: 'classics', books: 80000 },
  { name: 'young-adult', books: 200000 },
  { name: 'self-help', books: 70000 },
  { name: 'philosophy', books: 50000 },
  { name: 'science', books: 60000 },
  { name: 'history', books: 100000 },
  { name: 'poetry', books: 40000 },
  { name: 'contemporary', books: 90000 },
  { name: 'literary-fiction', books: 70000 },
  { name: 'memoir', books: 60000 }
];

/**
 * Parse a shelf page and extract book data
 */
function parseShelfPage(html, shelf) {
  const $ = cheerio.load(html);
  const books = [];

  // Each book is in a .leftAlignedImage or .bookTitle structure
  // Goodreads structure varies, so we try multiple selectors
  
  $('tr[itemtype="http://schema.org/Book"]').each((_, el) => {
    try {
      const $el = $(el);
      
      // Book URL and ID
      const bookLink = $el.find('a.bookTitle').attr('href') || '';
      const sourceId = bookLink.match(/\/book\/show\/(\d+)/)?.[1];
      
      // Title
      const title = $el.find('a.bookTitle span').text().trim() ||
                    $el.find('.bookTitle').text().trim();
      
      // Author
      const author = $el.find('a.authorName span').text().trim() ||
                     $el.find('.authorName').text().trim();
      
      // Rating
      const ratingText = $el.find('.minirating').text();
      const ratingMatch = ratingText.match(/([\d.]+)\s*avg/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      
      // Rating count
      const countMatch = ratingText.match(/([\d,]+)\s*rating/);
      const ratingCount = countMatch ? 
        parseInt(countMatch[1].replace(/,/g, '')) : null;
      
      // Image
      const imageUrl = $el.find('img').attr('src');
      
      if (sourceId && title) {
        books.push({
          source_id: sourceId,
          source: SOURCE,
          title,
          author: author || null,
          rating,
          rating_count: ratingCount,
          image_url: imageUrl || null,
          url: bookLink ? `${BASE_URL}${bookLink}` : null,
          shelf,
          genres: JSON.stringify([shelf])
        });
      }
    } catch (e) {
      // Skip malformed entries
    }
  });

  // Alternative selector for different page layouts
  if (books.length === 0) {
    $('.bookalike').each((_, el) => {
      try {
        const $el = $(el);
        const bookLink = $el.find('a').first().attr('href') || '';
        const sourceId = bookLink.match(/\/book\/show\/(\d+)/)?.[1];
        const title = $el.find('.bookTitle').text().trim();
        const author = $el.find('.authorName').text().trim();
        
        if (sourceId && title) {
          books.push({
            source_id: sourceId,
            source: SOURCE,
            title,
            author: author || null,
            url: bookLink ? `${BASE_URL}${bookLink}` : null,
            shelf,
            genres: JSON.stringify([shelf])
          });
        }
      } catch (e) {
        // Skip
      }
    });
  }

  // Check for next page
  const nextPageLink = $('a.next_page').attr('href');
  const hasNextPage = !!nextPageLink && !$('span.next_page.disabled').length;

  return { books, hasNextPage };
}

/**
 * Get full details for a single book
 */
async function getBookDetails(bookUrl) {
  const html = await fetchHTML(bookUrl, { source: SOURCE });
  const $ = cheerio.load(html);
  
  const details = {};
  
  // Description
  const description = $('#description span:last-child').text().trim() ||
                     $('[data-testid="description"]').text().trim();
  if (description) details.description = description;
  
  // Page count
  const pagesText = $('span[itemprop="numberOfPages"]').text();
  const pages = pagesText.match(/(\d+)/)?.[1];
  if (pages) details.page_count = parseInt(pages);
  
  // Publication year
  const pubText = $('[data-testid="publicationInfo"]').text() ||
                  $('.row:contains("Published")').text();
  const yearMatch = pubText.match(/(\d{4})/);
  if (yearMatch) details.publication_year = parseInt(yearMatch[1]);
  
  // ISBN
  const isbn = $('[itemprop="isbn"]').text().trim();
  if (isbn) {
    if (isbn.length === 13) {
      details.isbn13 = isbn;
    } else if (isbn.length === 10) {
      details.isbn = isbn;
    }
  }
  
  // Additional genres
  const genres = [];
  $('.BookPageMetadataSection__genreButton a, [data-testid="genresList"] a').each((_, el) => {
    genres.push($(el).text().trim());
  });
  if (genres.length) details.genres = JSON.stringify(genres);
  
  return details;
}

/**
 * Scrape a single shelf with pagination
 */
async function scrapeShelf(shelf, options = {}) {
  const { 
    maxPages = 100,
    fetchDetails = false,
    startPage = 1
  } = options;
  
  const db = initBooksDB();
  const insertStmt = db.prepare(`
    INSERT INTO books (source_id, source, title, author, description, genres, 
                       rating, rating_count, page_count, publication_year,
                       isbn, isbn13, image_url, url, shelf)
    VALUES (@source_id, @source, @title, @author, @description, @genres,
            @rating, @rating_count, @page_count, @publication_year,
            @isbn, @isbn13, @image_url, @url, @shelf)
    ON CONFLICT(source_id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      rating = COALESCE(excluded.rating, books.rating),
      rating_count = COALESCE(excluded.rating_count, books.rating_count),
      image_url = COALESCE(excluded.image_url, books.image_url),
      updated_at = CURRENT_TIMESTAMP
  `);

  let page = startPage;
  let totalBooks = 0;
  let hasMore = true;

  console.log(`\n📚 Scraping shelf: ${shelf}`);
  console.log(`   Starting from page ${startPage}, max ${maxPages} pages\n`);

  while (hasMore && page < startPage + maxPages) {
    try {
      const url = `${BASE_URL}/shelf/show/${shelf}?page=${page}`;
      console.log(`   Page ${page}: ${url}`);
      
      const html = await fetchHTML(url, { source: SOURCE });
      const { books, hasNextPage } = parseShelfPage(html, shelf);
      
      if (books.length === 0) {
        console.log(`   ⚠️  No books found on page ${page}, stopping`);
        break;
      }

      // Optionally fetch full details for each book
      if (fetchDetails) {
        for (const book of books) {
          if (book.url) {
            await sleep(jitter(1500));
            try {
              const details = await getBookDetails(book.url);
              Object.assign(book, details);
            } catch (e) {
              console.log(`   ⚠️  Failed to get details for: ${book.title}`);
            }
          }
        }
      }

      // Save to database
      const transaction = db.transaction(() => {
        for (const book of books) {
          insertStmt.run(book);
        }
      });
      transaction();

      totalBooks += books.length;
      console.log(`   ✓ Saved ${books.length} books (total: ${totalBooks})`);

      hasMore = hasNextPage;
      page++;
      
      // Small delay between pages
      await sleep(jitter(500));
      
    } catch (error) {
      console.error(`   ❌ Error on page ${page}:`, error.message);
      // Continue to next page on error
      page++;
      await sleep(jitter(5000)); // Longer delay after error
    }
  }

  console.log(`\n✅ Completed shelf "${shelf}": ${totalBooks} books scraped\n`);
  return totalBooks;
}

/**
 * Scrape multiple shelves
 */
async function scrapeMultipleShelves(shelves, options = {}) {
  const results = {};
  
  for (const shelf of shelves) {
    const shelfName = typeof shelf === 'string' ? shelf : shelf.name;
    results[shelfName] = await scrapeShelf(shelfName, options);
    
    // Delay between shelves
    await sleep(jitter(3000));
  }
  
  return results;
}

/**
 * Get stats on current database
 */
function getStats() {
  const db = initBooksDB();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM books').get();
  const byShelf = db.prepare(`
    SELECT shelf, COUNT(*) as count 
    FROM books 
    GROUP BY shelf 
    ORDER BY count DESC
  `).all();
  const withRatings = db.prepare('SELECT COUNT(*) as count FROM books WHERE rating IS NOT NULL').get();
  
  return {
    total: total.count,
    byShelf,
    withRatings: withRatings.count
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Goodreads Book Scraper

Usage:
  node goodreads.js [options]

Options:
  --shelf <name>     Scrape a specific shelf (default: all popular shelves)
  --pages <n>        Max pages per shelf (default: 100)
  --details          Fetch full book details (slower)
  --stats            Show database statistics
  --help             Show this help

Examples:
  node goodreads.js --shelf science-fiction --pages 10
  node goodreads.js --stats
    `);
    return;
  }

  if (args.includes('--stats')) {
    const stats = getStats();
    console.log('\n📊 Database Statistics\n');
    console.log(`Total books: ${stats.total.toLocaleString()}`);
    console.log(`With ratings: ${stats.withRatings.toLocaleString()}`);
    console.log('\nBooks by shelf:');
    for (const { shelf, count } of stats.byShelf.slice(0, 20)) {
      console.log(`  ${shelf}: ${count.toLocaleString()}`);
    }
    return;
  }

  const shelfIndex = args.indexOf('--shelf');
  const pagesIndex = args.indexOf('--pages');
  
  const shelf = shelfIndex >= 0 ? args[shelfIndex + 1] : null;
  const maxPages = pagesIndex >= 0 ? parseInt(args[pagesIndex + 1]) : 100;
  const fetchDetails = args.includes('--details');

  const options = { maxPages, fetchDetails };

  if (shelf) {
    await scrapeShelf(shelf, options);
  } else {
    console.log('🌍 Universal Catalog - Goodreads Scraper\n');
    console.log('Starting full shelf crawl...');
    await scrapeMultipleShelves(POPULAR_SHELVES.slice(0, 5), options); // Start with first 5
  }
}

// Export for programmatic use
export {
  scrapeShelf,
  scrapeMultipleShelves,
  getBookDetails,
  getStats,
  POPULAR_SHELVES
};

// Run if executed directly
main().catch(console.error);
