import { getDatabase } from './database';
import * as Crypto from 'expo-crypto';
import { supabase, isSupabaseConfigured } from './supabase';
import { Platform } from 'react-native';

const TMDB_API_KEY = 'abcc98ddc593a20644ff99ceb455dc7b';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhYmNjOThkZGM1OTNhMjA2NDRmZjk5Y2ViNDU1ZGM3YiIsIm5iZiI6MTc2NzQ0OTcwMC45MTYsInN1YiI6IjY5NTkyNDY0MWJkZTQyOGM5ZDNiZGNmNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.WBvTPd6CPqaQNRLKfSYKoNJqhtDJYVmVltgv801RhGI';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const getMovies = async () => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase get movies error:', error);
        } else {
          return data || [];
        }
      } catch (supabaseError) {
        console.error('Supabase get movies error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const moviesRaw = localStorage.getItem('filmhub_movies') || '[]';
      return JSON.parse(moviesRaw);
    }

    const db = await getDatabase();
    if (!db) return [];
    
    const result = await db.getAllAsync('SELECT * FROM movies ORDER BY created_at DESC', []);
    return result || [];
  } catch (error) {
    console.error('Error getting movies:', error);
    return [];
  }
};

export const addMovie = async (movie) => {
  try {
    const movieId = await Crypto.randomUUID();
    const movieData = {
      id: movieId,
      title: movie.title,
      year: movie.year || null,
      rating: movie.rating || null,
      genre: movie.genre || null,
      director: movie.director || null,
      description: movie.description || '',
      image: movie.image || null,
      tmdb_id: movie.tmdbId || null,
      trailer_url: movie.trailerUrl || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('movies')
          .insert([movieData])
          .select()
          .single();

        if (error) {
          console.error('Supabase add movie error:', error);
          return { success: false, error: error.message };
        }

        return { success: true, movie: data };
      } catch (supabaseError) {
        console.error('Supabase add movie error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const moviesRaw = localStorage.getItem('filmhub_movies') || '[]';
      const movies = JSON.parse(moviesRaw);
      movies.push(movieData);
      localStorage.setItem('filmhub_movies', JSON.stringify(movies));
      return { success: true, movie: movieData };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }

    await db.runAsync(
      `INSERT INTO movies (id, title, year, rating, genre, director, description, image, tmdb_id, trailer_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        movieId,
        movie.title,
        movie.year || null,
        movie.rating || null,
        movie.genre || null,
        movie.director || null,
        movie.description || '',
        movie.image || null,
        movie.tmdbId || null,
        movie.trailerUrl || null,
      ]
    );

    const insertedMovie = await db.getFirstAsync('SELECT * FROM movies WHERE id = ?', [movieId]);
    return { success: true, movie: insertedMovie };
  } catch (error) {
    console.error('Error adding movie:', error);
    return { success: false, error: error.message };
  }
};

export const deleteMovie = async (movieId) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('movies')
          .delete()
          .eq('id', movieId);

        if (error) {
          console.error('Supabase delete movie error:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (supabaseError) {
        console.error('Supabase delete movie error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const moviesRaw = localStorage.getItem('filmhub_movies') || '[]';
      const movies = JSON.parse(moviesRaw);
      const filtered = movies.filter(m => m.id !== movieId);
      localStorage.setItem('filmhub_movies', JSON.stringify(filtered));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }

    await db.runAsync('DELETE FROM movies WHERE id = ?', [movieId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting movie:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAllMovies = async () => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('movies')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          console.error('Supabase delete all movies error:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (supabaseError) {
        console.error('Supabase delete all movies error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      localStorage.setItem('filmhub_movies', JSON.stringify([]));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }

    await db.runAsync('DELETE FROM movies');
    return { success: true };
  } catch (error) {
    console.error('Error deleting all movies:', error);
    return { success: false, error: error.message };
  }
};

export const searchMovieByTitle = async (title) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=cs-CZ`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Chyba při vyhledávání filmu');
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      return await getMovieDetails(movie.id);
    }
    
    return null;
  } catch (error) {
    console.error('Error searching movie:', error);
    throw error;
  }
};

export const getMovieDetails = async (movieId) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=cs-CZ&append_to_response=credits`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Chyba při načítání detailů filmu');
    }

    const data = await response.json();
    
    const director = data.credits?.crew?.find(person => person.job === 'Director');
    const genres = data.genres?.map(g => g.name).join(', ') || 'Neznámý';
    
    return {
      title: data.title,
      year: new Date(data.release_date).getFullYear(),
      rating: (data.vote_average || 0).toFixed(1),
      genre: genres,
      director: director?.name || 'Neznámý',
      image: data.poster_path 
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      description: data.overview || '',
      tmdbId: data.id,
    };
  } catch (error) {
    console.error('Error getting movie details:', error);
    throw error;
  }
};

export const getMovieTrailerFromDb = async (movieDbId) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('trailer_url, tmdb_id')
          .eq('id', movieDbId)
          .single();

        if (error) {
          console.error('Supabase get trailer error:', error);
        } else if (data && data.trailer_url) {
          return {
            url: data.trailer_url,
            name: 'Trailer',
            site: 'YouTube',
            key: null,
          };
        }
      } catch (supabaseError) {
        console.error('Supabase get trailer error:', supabaseError);
      }
    }

    if (Platform.OS === 'web') {
      const moviesRaw = localStorage.getItem('filmhub_movies') || '[]';
      const movies = JSON.parse(moviesRaw);
      const movie = movies.find(m => m.id === movieDbId);
      
      if (movie && movie.trailer_url) {
        return {
          url: movie.trailer_url,
          name: 'Trailer',
          site: 'YouTube',
          key: null,
        };
      }
      
      return null;
    }

    const db = await getDatabase();
    if (!db) return null;

    const movie = await db.getFirstAsync('SELECT trailer_url, tmdb_id FROM movies WHERE id = ?', [movieDbId]);
    
    if (movie && movie.trailer_url) {
      return {
        url: movie.trailer_url,
        name: 'Trailer',
        site: 'YouTube',
        key: null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting trailer from DB:', error);
    return null;
  }
};

export const getMovieTrailer = async (movieId) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=cs-CZ`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.status_message || 'Chyba při načítání trailera');
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Pro tento film není k dispozici žádný trailer');
    }

    let trailer = data.results.find(video => 
      video.type === 'Trailer' && 
      video.site === 'YouTube' &&
      (video.official === true || video.name?.toLowerCase().includes('trailer'))
    );

    if (!trailer) {
      trailer = data.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      );
    }

    if (!trailer) {
      trailer = data.results.find(video => video.type === 'Trailer');
    }

    if (!trailer) {
      trailer = data.results[0];
    }

    let url = null;
    if (trailer.site === 'YouTube' && trailer.key) {
      url = `https://www.youtube.com/watch?v=${trailer.key}`;
    } else if (trailer.site === 'Vimeo' && trailer.key) {
      url = `https://vimeo.com/${trailer.key}`;
    }

    if (!url) {
      throw new Error('Trailer není k dispozici v podporovaném formátu');
    }
    
    return {
      key: trailer.key,
      name: trailer.name,
      site: trailer.site,
      url: url,
    };
  } catch (error) {
    console.error('Error getting movie trailer:', error);
    throw error;
  }
};
