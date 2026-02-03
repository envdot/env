# 🌍 Universal Catalog

A comprehensive catalog of the world's creative works and places.

## Categories

| Category | Source | Items (est.) | Status |
|----------|--------|--------------|--------|
| 📚 Books | Goodreads | ~130M | 🟡 In Progress |
| 🎬 Movies | IMDb | ~10M | 🟡 In Progress |
| 🎵 Music | MusicBrainz | ~60M recordings | 🟢 API Available |
| 🍽️ Food/Places | OSM + APIs | Location-based | 🔵 Planned |

## Data Sources

### 📚 Books - Goodreads
- **Strategy**: Crawl shelves → genres → individual books
- **Entry Point**: `https://www.goodreads.com/shelf`
- **Shelves have**: Genre name, book count, paginated lists
- **Rate Limiting**: Respectful delays between requests

### 🎬 Movies - IMDb  
- **Strategy**: Crawl genres → lists → individual titles
- **Entry Point**: `https://www.imdb.com/feature/genre/`
- **Also useful**: Top 250, Most Popular, By Year
- **Rate Limiting**: IMDb is strict, use delays

### 🎵 Music - MusicBrainz
- **Strategy**: Official API! No scraping needed
- **API**: `https://musicbrainz.org/doc/MusicBrainz_API`
- **Coverage**: Artists, Releases, Recordings, Labels
- **Rate Limit**: 1 req/sec with User-Agent
- **Bonus**: Links to Spotify, Discogs, Wikipedia

### 🍽️ Restaurants/Places - Multiple Sources
- **OpenStreetMap**: Free, open data via Overpass API
- **Foursquare**: Places API (has free tier)
- **Google Places**: Expensive but comprehensive
- **Yelp Fusion API**: Good for restaurants (5000 free/day)

## Project Structure

```
catalog/
├── scrapers/
│   ├── books/           # Goodreads scraper
│   ├── movies/          # IMDb scraper
│   ├── music/           # MusicBrainz API client
│   └── places/          # Multi-source places fetcher
├── data/
│   ├── books/           # JSON/SQLite storage
│   ├── movies/
│   ├── music/
│   └── places/
├── schemas/             # Data schemas for each type
└── utils/
    ├── rate-limiter.js  # Respectful request throttling
    ├── storage.js       # SQLite/JSON persistence
    └── dedup.js         # Deduplication utilities
```

## Quick Start

```bash
# Install dependencies
cd catalog
npm install

# Run a specific scraper
npm run scrape:books -- --genre="science-fiction" --limit=1000
npm run scrape:movies -- --genre="thriller" --year=2023
npm run fetch:music -- --artist="Radiohead"
npm run fetch:places -- --location="NYC" --type="restaurant"
```

## Ethical Scraping Guidelines

1. **Respect robots.txt** - Check before scraping
2. **Rate limiting** - 1-2 seconds between requests minimum
3. **User-Agent** - Identify yourself properly
4. **Caching** - Don't re-request what you have
5. **Off-peak hours** - Run intensive jobs at night
6. **Terms of Service** - Be aware of legal boundaries

## Data Schema Overview

Each item type has a unified schema:

```javascript
// Universal fields
{
  id: string,           // Our internal ID
  source_id: string,    // Original source ID
  source: string,       // 'goodreads', 'imdb', 'musicbrainz', etc.
  title: string,
  description: string,
  genres: string[],
  rating: number,
  rating_count: number,
  image_url: string,
  url: string,
  created_at: date,
  updated_at: date,
  // ... type-specific fields
}
```
