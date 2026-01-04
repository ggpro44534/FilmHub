import { getDatabase } from './database';
import { getCurrentUser } from './auth';
import * as Crypto from 'expo-crypto';

export const getFavorites = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const db = await getDatabase();
    const result = await db.getAllAsync(
      `SELECT m.*, f.created_at as likedAt
       FROM favorites f
       INNER JOIN movies m ON f.movie_id = m.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    return result.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      rating: movie.rating,
      genre: movie.genre,
      director: movie.director,
      description: movie.description,
      image: movie.image,
      tmdbId: movie.tmdb_id,
      trailerUrl: movie.trailer_url,
      likedAt: movie.likedAt,
    }));
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

export const addFavorite = async (movie) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Uživatel není přihlášen' };
    }

    const db = await getDatabase();
    
    const existing = await db.getFirstAsync(
      'SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?',
      [user.id, movie.id]
    );

    if (existing) {
      return { success: false, error: 'Film je již v oblíbených' };
    }

    const favoriteId = await Crypto.randomUUID();
    await db.runAsync(
      'INSERT INTO favorites (id, user_id, movie_id, created_at) VALUES (?, ?, ?, datetime("now"))',
      [favoriteId, user.id, movie.id]
    );

    return { success: true };
  } catch (error) {
    console.error('Error adding favorite:', error);
    return { success: false, error: error.message };
  }
};

export const removeFavorite = async (movieId) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Uživatel není přihlášen' };
    }

    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM favorites WHERE user_id = ? AND movie_id = ?',
      [user.id, movieId]
    );

    return { success: true };
  } catch (error) {
    console.error('Error removing favorite:', error);
    return { success: false, error: error.message };
  }
};

export const isFavorite = async (movieId) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }

    const db = await getDatabase();
    const result = await db.getFirstAsync(
      'SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?',
      [user.id, movieId]
    ) || null;

    return !!result;
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
};
