import { getDatabase } from "./database";
import * as Crypto from "expo-crypto";
import { supabase, isSupabaseConfigured } from "./supabase";
import { Platform } from "react-native";

const TMDB_API_KEY = "abcc98ddc593a20644ff99ceb455dc7b";
const TMDB_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhYmNjOThkZGM1OTNhMjA2NDRmZjk5Y2ViNDU1ZGM3YiIsIm5iZiI6MTc2NzQ0OTcwMC45MTYsInN1YiI6IjY5NTkyNDY0MWJkZTQyOGM5ZDNiZGNmNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.WBvTPd6CPqaQNRLKfSYKoNJqhtDJYVmVltgv801RhGI";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const YT_KEY = (process?.env?.EXPO_PUBLIC_YOUTUBE_API_KEY || "").trim();

const normalizeMovieRow = (row) => {
  if (!row) return row;
  return {
    ...row,
    tmdbId: row.tmdbId ?? row.tmdb_id ?? null,
    trailerUrl: row.trailerUrl ?? row.trailer_url ?? null,
  };
};

export const getMovies = async () => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("movies")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error) return (data || []).map(normalizeMovieRow);
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const raw = localStorage.getItem("cinevia_movies") || "[]";
      return (JSON.parse(raw) || []).map(normalizeMovieRow);
    }

    const db = await getDatabase();
    if (!db) return [];
    const result = await db.getAllAsync("SELECT * FROM movies ORDER BY created_at DESC", []);
    return (result || []).map(normalizeMovieRow);
  } catch (e) {
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
      description: movie.description || "",
      image: movie.image || null,
      tmdb_id: movie.tmdbId || movie.tmdb_id || null,
      trailer_url: movie.trailerUrl || movie.trailer_url || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from("movies").insert([movieData]).select().single();
        if (error) return { success: false, error: error.message };
        return { success: true, movie: normalizeMovieRow(data) };
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const raw = localStorage.getItem("cinevia_movies") || "[]";
      const movies = JSON.parse(raw) || [];
      movies.push(movieData);
      localStorage.setItem("cinevia_movies", JSON.stringify(movies));
      return { success: true, movie: normalizeMovieRow(movieData) };
    }

    const db = await getDatabase();
    if (!db) return { success: false, error: "Database not initialized" };

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
        movie.description || "",
        movie.image || null,
        movie.tmdbId || movie.tmdb_id || null,
        movie.trailerUrl || movie.trailer_url || null,
      ]
    );

    const inserted = await db.getFirstAsync("SELECT * FROM movies WHERE id = ?", [movieId]);
    return { success: true, movie: normalizeMovieRow(inserted) };
  } catch (e) {
    return { success: false, error: e?.message || "Error" };
  }
};

export const updateMovie = async (movieId, patch) => {
  try {
    const payload = {
      title: patch.title ?? null,
      year: patch.year ?? null,
      rating: patch.rating ?? null,
      genre: patch.genre ?? null,
      director: patch.director ?? null,
      description: patch.description ?? "",
      image: patch.image ?? null,
      tmdb_id: patch.tmdbId ?? patch.tmdb_id ?? null,
      trailer_url: patch.trailerUrl ?? patch.trailer_url ?? null,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("movies")
          .update(payload)
          .eq("id", movieId)
          .select()
          .single();

        if (error) return { success: false, error: error.message };
        return { success: true, movie: normalizeMovieRow(data) };
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const raw = localStorage.getItem("cinevia_movies") || "[]";
      const movies = JSON.parse(raw) || [];
      const idx = movies.findIndex((m) => m.id === movieId);
      if (idx === -1) return { success: false, error: "Movie not found" };

      movies[idx] = {
        ...movies[idx],
        ...payload,
        tmdb_id: payload.tmdb_id,
        trailer_url: payload.trailer_url,
      };
      localStorage.setItem("cinevia_movies", JSON.stringify(movies));
      return { success: true, movie: normalizeMovieRow(movies[idx]) };
    }

    const db = await getDatabase();
    if (!db) return { success: false, error: "Database not initialized" };

    await db.runAsync(
      `UPDATE movies
       SET title = ?, year = ?, rating = ?, genre = ?, director = ?, description = ?, image = ?, tmdb_id = ?, trailer_url = ?
       WHERE id = ?`,
      [
        payload.title,
        payload.year,
        payload.rating,
        payload.genre,
        payload.director,
        payload.description,
        payload.image,
        payload.tmdb_id,
        payload.trailer_url,
        movieId,
      ]
    );

    const updated = await db.getFirstAsync("SELECT * FROM movies WHERE id = ?", [movieId]);
    return { success: true, movie: normalizeMovieRow(updated) };
  } catch (e) {
    return { success: false, error: e?.message || "Error" };
  }
};

export const deleteMovie = async (movieId) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("movies").delete().eq("id", movieId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const raw = localStorage.getItem("cinevia_movies") || "[]";
      const movies = JSON.parse(raw) || [];
      localStorage.setItem("cinevia_movies", JSON.stringify(movies.filter((m) => m.id !== movieId)));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) return { success: false, error: "Database not initialized" };

    await db.runAsync("DELETE FROM movies WHERE id = ?", [movieId]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || "Error" };
  }
};

export const deleteAllMovies = async () => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("movies")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      localStorage.setItem("cinevia_movies", JSON.stringify([]));
      return { success: true };
    }

    const db = await getDatabase();
    if (!db) return { success: false, error: "Database not initialized" };

    await db.runAsync("DELETE FROM movies");
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || "Error" };
  }
};

export const getMovieDetails = async (movieId) => {
  const res = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=cs-CZ&append_to_response=credits`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) throw new Error("Chyba při načítání detailů filmu");
  const data = await res.json();

  const director = data.credits?.crew?.find((p) => p.job === "Director");
  const genres = data.genres?.map((g) => g.name).join(", ") || "Neznámý";

  return {
    title: data.title,
    year: data.release_date ? new Date(data.release_date).getFullYear() : null,
    rating: (data.vote_average || 0).toFixed(1),
    genre: genres,
    director: director?.name || "Neznámý",
    image: data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    description: data.overview || "",
    tmdbId: data.id,
  };
};

export const getMovieTrailerFromDb = async (movieDbId) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("movies")
          .select("trailer_url, tmdb_id")
          .eq("id", movieDbId)
          .single();

        if (!error && data?.trailer_url) return { url: data.trailer_url, site: "YouTube", name: "Trailer", key: null };
      } catch (e) {}
    }

    if (Platform.OS === "web") {
      const raw = localStorage.getItem("cinevia_movies") || "[]";
      const movies = JSON.parse(raw) || [];
      const m = movies.find((x) => x.id === movieDbId);
      if (m?.trailer_url) return { url: m.trailer_url, site: "YouTube", name: "Trailer", key: null };
      return null;
    }

    const db = await getDatabase();
    if (!db) return null;

    const movie = await db.getFirstAsync("SELECT trailer_url FROM movies WHERE id = ?", [movieDbId]);
    if (movie?.trailer_url) return { url: movie.trailer_url, site: "YouTube", name: "Trailer", key: null };
    return null;
  } catch (e) {
    return null;
  }
};

export const getMovieTrailer = async (movieId) => {
  const res = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=cs-CZ`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) throw new Error("Chyba při načítání trailera");

  const data = await res.json();
  if (!data.results?.length) throw new Error("Pro tento film není k dispozici žádný trailer");

  let t =
    data.results.find((v) => v.type === "Trailer" && v.site === "YouTube" && (v.official === true || v.name?.toLowerCase().includes("trailer"))) ||
    data.results.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    data.results.find((v) => v.type === "Trailer") ||
    data.results[0];

  if (t.site === "YouTube" && t.key) return { key: t.key, name: t.name, site: t.site, url: `https://www.youtube.com/watch?v=${t.key}` };
  if (t.site === "Vimeo" && t.key) return { key: t.key, name: t.name, site: t.site, url: `https://vimeo.com/${t.key}` };

  throw new Error("Trailer není k dispozici v podporovaném formátu");
};

export const findYouTubeTrailerUrl = async ({ title, year }) => {
  if (!YT_KEY) return null;

  const trySearch = async (q) => {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1` +
      `&videoEmbeddable=true&safeSearch=moderate&q=${encodeURIComponent(q)}&key=${encodeURIComponent(YT_KEY)}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    const id = json?.items?.[0]?.id?.videoId;
    if (!id) return null;

    return `https://www.youtube.com/watch?v=${id}`;
  };

  const q1 = `${title}${year ? ` ${year}` : ""} official trailer`;
  const q2 = `${title}${year ? ` ${year}` : ""} trailer`;

  return (await trySearch(q1)) || (await trySearch(q2)) || null;
};

export const findBestTrailerUrl = async ({ tmdbId, title, year }) => {
  if (tmdbId) {
    try {
      const t = await getMovieTrailer(tmdbId);
      if (t?.url) return t.url;
    } catch (e) {}
  }

  const yt = await findYouTubeTrailerUrl({ title, year });
  if (yt) return yt;

  return null;
};