import { getDatabase } from './database';
import * as Crypto from 'expo-crypto';

const TMDB_API_KEY = 'abcc98ddc593a20644ff99ceb455dc7b';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhYmNjOThkZGM1OTNhMjA2NDRmZjk5Y2ViNDU1ZGM3YiIsIm5iZiI6MTc2NzQ0OTcwMC45MTYsInN1YiI6IjY5NTkyNDY0MWJkZTQyOGM5ZDNiZGNmNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.WBvTPd6CPqaQNRLKfSYKoNJqhtDJYVmVltgv801RhGI';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const getMovies = async () => {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync('SELECT * FROM movies ORDER BY created_at DESC', []);
    return result || [];
  } catch (error) {
    console.error('Error getting movies:', error);
    return [];
  }
};

export const addMovie = async (movie) => {
  try {
    const db = await getDatabase();
    const movieId = await Crypto.randomUUID();
    
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
    const db = await getDatabase();
    await db.runAsync('DELETE FROM movies WHERE id = ?', [movieId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting movie:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAllMovies = async () => {
  try {
    const db = await getDatabase();
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

// Отримати трейлер з бази даних за ID фільму
export const getMovieTrailerFromDb = async (movieDbId) => {
  try {
    const db = await getDatabase();
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

    // Спочатку шукаємо офіційний трейлер на YouTube
    let trailer = data.results.find(video => 
      video.type === 'Trailer' && 
      video.site === 'YouTube' &&
      (video.official === true || video.name?.toLowerCase().includes('trailer'))
    );

    // Якщо не знайдено, шукаємо будь-який трейлер на YouTube
    if (!trailer) {
      trailer = data.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      );
    }

    // Якщо все ще не знайдено, беремо перший доступний трейлер
    if (!trailer) {
      trailer = data.results.find(video => video.type === 'Trailer');
    }

    // Якщо немає трейлера, беремо перше відео
    if (!trailer) {
      trailer = data.results[0];
    }

    // Формуємо URL залежно від сайту
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
