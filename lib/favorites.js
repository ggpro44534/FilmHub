import { getDatabase } from './database';
import { getCurrentUser } from './auth';
import * as Crypto from 'expo-crypto';
import { supabase, isSupabaseConfigured } from './supabase';
import { Platform } from 'react-native';

export const getFavorites = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            created_at,
            movies (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase get favorites error:', error);
        } else if (data) {
          return data.map(item => ({
            id: item.movies.id,
            title: item.movies.title,
            year: item.movies.year,
            rating: item.movies.rating,
            genre: item.movies.genre,
            director: item.movies.director,
            description: item.movies.description,
            image: item.movies.image,
            tmdbId: item.movies.tmdb_id,
            trailerUrl: item.movies.trailer_url,
            likedAt: item.created_at,
          }));
        }
      } catch (supabaseError) {
        console.error('Supabase get favorites error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const favoritesRaw = localStorage.getItem('filmhub_favorites') || '[]';
      const favorites = JSON.parse(favoritesRaw);
      const userFavorites = favorites.filter(f => f.user_id === user.id);
      
      const moviesRaw = localStorage.getItem('filmhub_movies') || '[]';
      const movies = JSON.parse(moviesRaw);
      
      return userFavorites.map(fav => {
        const movie = movies.find(m => m.id === fav.movie_id);
        return movie ? {
          ...movie,
          tmdbId: movie.tmdb_id,
          trailerUrl: movie.trailer_url,
          likedAt: fav.created_at,
        } : null;
      }).filter(Boolean);
    }

    const db = await getDatabase();
    if (!db) return [];

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

    if (isSupabaseConfigured()) {
      try {
        const { data: existing } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('movie_id', movie.id)
          .single();

        if (existing) {
          return { success: false, error: 'Film je již v oblíbených' };
        }

        const favoriteId = await Crypto.randomUUID();
        const { error } = await supabase
          .from('favorites')
          .insert({
            id: favoriteId,
            user_id: user.id,
            movie_id: movie.id,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Supabase add favorite error:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (supabaseError) {
        console.error('Supabase add favorite error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const favoritesRaw = localStorage.getItem('filmhub_favorites') || '[]';
      const favorites = JSON.parse(favoritesRaw);
      
      const existing = favorites.find(f => f.user_id === user.id && f.movie_id === movie.id);
      if (existing) {
        return { success: false, error: 'Film je již v oblíbených' };
      }

      const favoriteId = `${Date.now()}-${Math.random()}`;
      favorites.push({
        id: favoriteId,
        user_id: user.id,
        movie_id: movie.id,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('filmhub_favorites', JSON.stringify(favorites));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
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

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', movieId);

        if (error) {
          console.error('Supabase remove favorite error:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (supabaseError) {
        console.error('Supabase remove favorite error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const favoritesRaw = localStorage.getItem('filmhub_favorites') || '[]';
      const favorites = JSON.parse(favoritesRaw);
      const filtered = favorites.filter(f => !(f.user_id === user.id && f.movie_id === movieId));
      localStorage.setItem('filmhub_favorites', JSON.stringify(filtered));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }

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

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('movie_id', movieId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Supabase is favorite error:', error);
        }

        return !!data;
      } catch (supabaseError) {
        console.error('Supabase is favorite error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const favoritesRaw = localStorage.getItem('filmhub_favorites') || '[]';
      const favorites = JSON.parse(favoritesRaw);
      return favorites.some(f => f.user_id === user.id && f.movie_id === movieId);
    }

    const db = await getDatabase();
    if (!db) return false;

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
