import { Platform } from 'react-native';

let db = null;
let SQLite = null;

// Умовний імпорт SQLite тільки для мобільних платформ
if (Platform.OS !== 'web') {
  try {
    SQLite = require('expo-sqlite');
  } catch (e) {
    console.warn('SQLite not available:', e);
  }
}

export const initDatabase = async () => {
  // SQLite не працює на веб-платформі, використовуємо localStorage для веб
  if (Platform.OS === 'web') {
    console.log('Web platform detected, using localStorage fallback');
    // Ініціалізуємо localStorage для веб
    if (typeof window !== 'undefined' && !localStorage.getItem('filmhub_initialized')) {
      localStorage.setItem('filmhub_initialized', 'true');
      localStorage.setItem('filmhub_users', JSON.stringify([]));
      localStorage.setItem('filmhub_movies', JSON.stringify([]));
      localStorage.setItem('filmhub_favorites', JSON.stringify([]));
    }
    return null; // Повертаємо null для веб, щоб не викликати помилки
  }

  if (!SQLite) {
    throw new Error('SQLite is not available on this platform');
  }

  try {
    db = await SQLite.openDatabaseAsync('filmhub.db');
    
    await db.execAsync(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      year INTEGER,
      rating REAL,
      genre TEXT,
      director TEXT,
      description TEXT,
      image TEXT,
      tmdb_id INTEGER,
      trailer_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Додати колонку trailer_url якщо вона не існує (для існуючих баз)
    try {
      await db.runAsync(`ALTER TABLE movies ADD COLUMN trailer_url TEXT`);
    } catch (error) {
      // Колонка вже існує, ігноруємо помилку
    }

    await db.execAsync(`CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      movie_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, movie_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )`);

    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_favorites_movie_id ON favorites(movie_id)`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id)`);

    try {
      await db.runAsync(
        `UPDATE users SET role = 'admin' WHERE email = 'gghub491@gmail.com'`
      );
    } catch (error) {
      console.log('Admin role update:', error.message);
    }

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const getDatabase = async () => {
  if (Platform.OS === 'web') {
    // Для веб-платформи повертаємо null, функції будуть використовувати localStorage
    return null;
  }

  try {
    if (!db) {
      db = await initDatabase();
    }
    if (!db) {
      throw new Error('Failed to initialize database');
    }
    return db;
  } catch (error) {
    console.error('Error getting database:', error);
    throw error;
  }
};

