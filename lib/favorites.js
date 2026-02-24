import { getDatabase } from "./database";
import { getCurrentUser } from "./auth";
import * as Crypto from "expo-crypto";
import { supabase, isSupabaseConfigured } from "./supabase";
import { Platform } from "react-native";

const getUserId = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user?.id) return data.user.id;
    } catch (e) {}
  }

  const user = await getCurrentUser();
  return user?.id || null;
};

export const getFavorites = async () => {
  try {
    const userId = await getUserId();
    if (!userId) return [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("favorites")
          .select(
            `
            created_at,
            movies (*)
          `,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data
            .map((item) => {
              const m = item?.movies;
              if (!m) return null;
              return {
                id: m.id,
                title: m.title,
                year: m.year,
                rating: m.rating,
                genre: m.genre,
                director: m.director,
                description: m.description,
                image: m.image,
                tmdbId: m.tmdb_id,
                trailerUrl: m.trailer_url,
                likedAt: item.created_at,
              };
            })
            .filter(Boolean);
        }
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const favoritesRaw = localStorage.getItem("cinevia_favorites") || "[]";
      const favorites = JSON.parse(favoritesRaw);
      const userFavorites = favorites.filter((f) => f.user_id === userId);

      const moviesRaw = localStorage.getItem("cinevia_movies") || "[]";
      const movies = JSON.parse(moviesRaw);

      return userFavorites
        .map((fav) => {
          const movie = movies.find((m) => m.id === fav.movie_id);
          return movie
            ? {
                ...movie,
                tmdbId: movie.tmdb_id,
                trailerUrl: movie.trailer_url,
                likedAt: fav.created_at,
              }
            : null;
        })
        .filter(Boolean);
    }

    const db = await getDatabase();
    if (!db) return [];

    const result = await db.getAllAsync(
      `SELECT m.*, f.created_at as likedAt
       FROM favorites f
       INNER JOIN movies m ON f.movie_id = m.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId],
    );

    return (result || []).map((movie) => ({
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
    return [];
  }
};

export const addFavorite = async (movie) => {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Uživatel není přihlášen" };
    if (!movie?.id) return { success: false, error: "Chybí ID filmu" };

    if (isSupabaseConfigured()) {
      try {
        const { data: existing } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("movie_id", movie.id)
          .maybeSingle();

        if (existing?.id) return { success: false, error: "Film je již v oblíbených" };

        const favoriteId = await Crypto.randomUUID();
        const { error } = await supabase.from("favorites").insert({
          id: favoriteId,
          user_id: userId,
          movie_id: movie.id,
          created_at: new Date().toISOString(),
        });

        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const favoritesRaw = localStorage.getItem("cinevia_favorites") || "[]";
      const favorites = JSON.parse(favoritesRaw);

      const existing = favorites.find((f) => f.user_id === userId && f.movie_id === movie.id);
      if (existing) return { success: false, error: "Film je již v oblíbených" };

      const favoriteId = `${Date.now()}-${Math.random()}`;
      favorites.push({
        id: favoriteId,
        user_id: userId,
        movie_id: movie.id,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("cinevia_favorites", JSON.stringify(favorites));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) return { success: false, error: "Database not initialized" };

    const existing = await db.getFirstAsync(
      "SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?",
      [userId, movie.id],
    );

    if (existing) return { success: false, error: "Film je již v oblíbených" };

    const favoriteId = await Crypto.randomUUID();
    await db.runAsync(
      'INSERT INTO favorites (id, user_id, movie_id, created_at) VALUES (?, ?, ?, datetime("now"))',
      [favoriteId, userId, movie.id],
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || "Chyba" };
  }
};

export const removeFavorite = async (movieId) => {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Uživatel není přihlášen" };
    if (!movieId) return { success: false, error: "Chybí ID filmu" };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("movie_id", movieId);

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e?.message || "Chyba při odebírání z Supabase" };
      }
    }

    if (Platform.OS === "web") {
      try {
        const favoritesRaw = localStorage.getItem("cinevia_favorites") || "[]";
        const favorites = JSON.parse(favoritesRaw);
        const initialLength = favorites.length;
        const filtered = favorites.filter((f) => !(f.user_id === userId && f.movie_id === movieId));
        
        if (filtered.length === initialLength) {
          return { success: false, error: "Film nebyl nalezen v oblíbených" };
        }
        
        localStorage.setItem("cinevia_favorites", JSON.stringify(filtered));
        return { success: true };
      } catch (e) {
        return { success: false, error: e?.message || "Chyba při odebírání z úložiště" };
      }
    }

    const db = await getDatabase();
    if (!db) return { success: false, error: "Database not initialized" };

    await db.runAsync("DELETE FROM favorites WHERE user_id = ? AND movie_id = ?", [userId, movieId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || "Chyba" };
  }
};

export const isFavorite = async (movieId) => {
  try {
    const userId = await getUserId();
    if (!userId) return false;
    if (!movieId) return false;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("movie_id", movieId)
          .maybeSingle();

        if (error) return false;
        return !!data?.id;
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const favoritesRaw = localStorage.getItem("cinevia_favorites") || "[]";
      const favorites = JSON.parse(favoritesRaw);
      return favorites.some((f) => f.user_id === userId && f.movie_id === movieId);
    }

    const db = await getDatabase();
    if (!db) return false;

    const result =
      (await db.getFirstAsync("SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?", [userId, movieId])) || null;

    return !!result;
  } catch (error) {
    return false;
  }
};