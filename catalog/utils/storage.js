/**
 * Storage - SQLite-based persistence for catalog data
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directories exist
const ensureDir = (path) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
};

/**
 * Get or create a database for a category
 */
export function getDatabase(category) {
  const dbPath = join(DATA_DIR, category);
  ensureDir(dbPath);
  
  const db = new Database(join(dbPath, 'catalog.db'));
  db.pragma('journal_mode = WAL');
  
  return db;
}

/**
 * Initialize the books table
 */
export function initBooksDB() {
  const db = getDatabase('books');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT UNIQUE,
      source TEXT DEFAULT 'goodreads',
      title TEXT NOT NULL,
      author TEXT,
      description TEXT,
      genres TEXT,  -- JSON array
      rating REAL,
      rating_count INTEGER,
      page_count INTEGER,
      publication_year INTEGER,
      isbn TEXT,
      isbn13 TEXT,
      image_url TEXT,
      url TEXT,
      shelf TEXT,
      raw_data TEXT,  -- Full JSON for future parsing
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_books_source_id ON books(source_id);
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
    CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);
    CREATE INDEX IF NOT EXISTS idx_books_shelf ON books(shelf);
  `);
  
  return db;
}

/**
 * Initialize the movies table
 */
export function initMoviesDB() {
  const db = getDatabase('movies');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT UNIQUE,
      source TEXT DEFAULT 'imdb',
      title TEXT NOT NULL,
      original_title TEXT,
      year INTEGER,
      runtime_minutes INTEGER,
      description TEXT,
      genres TEXT,  -- JSON array
      rating REAL,
      rating_count INTEGER,
      directors TEXT,  -- JSON array
      cast TEXT,  -- JSON array
      image_url TEXT,
      url TEXT,
      content_rating TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_movies_source_id ON movies(source_id);
    CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
    CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
    CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating);
  `);
  
  return db;
}

/**
 * Initialize the music table
 */
export function initMusicDB() {
  const db = getDatabase('music');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mbid TEXT UNIQUE,  -- MusicBrainz ID
      name TEXT NOT NULL,
      sort_name TEXT,
      type TEXT,  -- Person, Group, etc.
      country TEXT,
      disambiguation TEXT,
      begin_date TEXT,
      end_date TEXT,
      genres TEXT,  -- JSON array
      url TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mbid TEXT UNIQUE,
      artist_mbid TEXT,
      title TEXT NOT NULL,
      release_type TEXT,  -- Album, Single, EP, etc.
      release_date TEXT,
      country TEXT,
      label TEXT,
      track_count INTEGER,
      genres TEXT,
      cover_url TEXT,
      url TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_mbid) REFERENCES artists(mbid)
    );
    
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mbid TEXT UNIQUE,
      artist_mbid TEXT,
      release_mbid TEXT,
      title TEXT NOT NULL,
      duration_ms INTEGER,
      isrc TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_mbid) REFERENCES artists(mbid),
      FOREIGN KEY (release_mbid) REFERENCES releases(mbid)
    );
    
    CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
    CREATE INDEX IF NOT EXISTS idx_releases_title ON releases(title);
    CREATE INDEX IF NOT EXISTS idx_releases_artist ON releases(artist_mbid);
  `);
  
  return db;
}

/**
 * Initialize the places table
 */
export function initPlacesDB() {
  const db = getDatabase('places');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT,
      source TEXT,  -- osm, yelp, foursquare, google
      name TEXT NOT NULL,
      type TEXT,  -- restaurant, cafe, bar, etc.
      cuisine TEXT,  -- JSON array for restaurants
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      postal_code TEXT,
      latitude REAL,
      longitude REAL,
      rating REAL,
      rating_count INTEGER,
      price_level INTEGER,  -- 1-4
      phone TEXT,
      website TEXT,
      hours TEXT,  -- JSON object
      image_url TEXT,
      url TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, source_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
    CREATE INDEX IF NOT EXISTS idx_places_type ON places(type);
    CREATE INDEX IF NOT EXISTS idx_places_city ON places(city);
    CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
  `);
  
  return db;
}

/**
 * Upsert helper - insert or update on conflict
 */
export function upsert(db, table, data, conflictColumn = 'source_id') {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter(c => c !== conflictColumn)
    .map(c => `${c} = excluded.${c}`)
    .join(', ');
  
  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(${conflictColumn}) DO UPDATE SET
      ${updates},
      updated_at = CURRENT_TIMESTAMP
  `;
  
  return db.prepare(sql).run(...Object.values(data));
}

export default {
  getDatabase,
  initBooksDB,
  initMoviesDB,
  initMusicDB,
  initPlacesDB,
  upsert
};
