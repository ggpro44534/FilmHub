import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { signOut } from "../lib/auth";
import { getMovieDetails, addMovie, getMovies, deleteMovie, deleteAllMovies, getMovieTrailer } from "../lib/movies";
import MenuBar from "./MenuBar";

const isWeb = Platform.OS === "web";
const soft = (v) => `rgba(255,255,255,${v})`;

const getLayout = () => {
  const { width: w, height: h } = Dimensions.get("window");
  const desktop = w >= 1024;
  const tablet = w >= 768;
  const pad = desktop ? 22 : tablet ? 18 : 14;
  const topPad = isWeb ? (desktop ? 18 : 10) : 10;
  return { w, h, desktop, tablet, pad, topPad };
};

function PremiumBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={["#07070D", "#07081A", "#05050A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[bgStyles.glow, bgStyles.glowTop]} />
      <View style={[bgStyles.glow, bgStyles.glowRight]} />
      <View style={[bgStyles.glow, bgStyles.glowBottom]} />
      <View style={bgStyles.noise} />
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.62)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

function TopBar({ title, subtitle, onMenu }) {
  return (
    <View style={topStyles.wrap} pointerEvents="box-none">
      <View style={topStyles.left} pointerEvents="none">
        <Text style={topStyles.title}>{title}</Text>
        {!!subtitle && (
          <Text style={topStyles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={onMenu} activeOpacity={0.85} style={topStyles.menuBtn}>
        {!isWeb && <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
        <View style={topStyles.menuIcon} pointerEvents="none">
          <View style={topStyles.menuLine} />
          <View style={topStyles.menuLine} />
          <View style={topStyles.menuLine} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function Card({ children, style, strokeOpacity = 0.9 }) {
  return (
    <View style={[ui.card, style]}>
      {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
      <LinearGradient
        colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[ui.stroke, { opacity: strokeOpacity }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

function Chip({ title, onPress, variant = "ghost", style, disabled }) {
  const isDanger = variant === "danger";
  const isPrimary = variant === "primary";
  const isDim = variant === "dim";
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[
        ui.chip,
        isPrimary && ui.chipPrimary,
        isDanger && ui.chipDanger,
        isDim && ui.chipDim,
        disabled && { opacity: 0.55 },
        style,
      ]}
    >
      {!isWeb && <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
      <Text style={ui.chipTxt}>{title}</Text>
    </TouchableOpacity>
  );
}

function CenterModal({ open, onClose, children, dismissable = true }) {
  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => dismissable && onClose?.()}>
      <View style={modalStyles.root}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => dismissable && onClose?.()}
          style={modalStyles.backdrop}
        />
        <View style={modalStyles.card}>
          {!isWeb && <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
          <LinearGradient
            colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={modalStyles.stroke}
            pointerEvents="none"
          />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const DEMO_TMDB_IDS = [
  11, 12, 13, 14, 15, 18, 22, 24, 25, 58, 62, 63, 65, 68, 69, 70, 71, 73, 74, 75,
  76, 77, 78, 80, 81, 82, 83, 84, 85, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 97,
  98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
  114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145,
  146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161,
  162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177,
  178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193,
  194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209,
  210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 238, 240, 242, 244, 245,
  246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261,
  262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277,
  278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293,
  294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309,
  310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325,
  326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341,
  342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357,
  358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373,
  374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389,
  390, 391, 392, 393, 394, 395, 396, 397, 398, 399,
];

const pickRandomUnique = (arr, n) => {
  const a = Array.from(new Set(arr));
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

const AdminScreen = ({ user, onLogout, onSwitchToMain, onNavigate }) => {
  const [layout, setLayout] = useState(getLayout());
  const styles = useMemo(() => createStyles(layout), [layout]);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [editedMovie, setEditedMovie] = useState(null);
  const [tmdbId, setTmdbId] = useState(null);
  const [movies, setMovies] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", danger: false });
  const confirmResolverRef = useRef(null);

  const [toast, setToast] = useState({ open: false, title: "", message: "", variant: "success" });

  const [seedCount, setSeedCount] = useState(100);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState({ added: 0, total: 0 });

  const showToast = useCallback((title, message, variant = "success") => {
    setToast({ open: true, title, message, variant });
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 2600);
  }, []);

  const confirm = useCallback((title, message, danger = true) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ open: true, title, message, danger });
    });
  }, []);

  const closeConfirm = useCallback((value) => {
    setConfirmState((s) => ({ ...s, open: false }));
    const r = confirmResolverRef.current;
    confirmResolverRef.current = null;
    r?.(value);
  }, []);

  useEffect(() => {
    const onChange = () => setLayout(getLayout());
    const sub = Dimensions.addEventListener?.("change", onChange);
    return () => sub?.remove?.();
  }, []);

  const loadMovies = useCallback(async () => {
    try {
      const allMovies = await getMovies();
      setMovies(Array.isArray(allMovies) ? allMovies : []);
    } catch {
      setMovies([]);
    }
  }, []);

  useEffect(() => {
    loadMovies();
    const deleteMoviesOnce = async () => {
      try {
        const hasDeleted = await AsyncStorage.getItem("movies_deleted_once");
        if (!hasDeleted) {
          await deleteAllMovies();
          await AsyncStorage.setItem("movies_deleted_once", "true");
          await loadMovies();
        }
      } catch {}
    };
    deleteMoviesOnce();
  }, [loadMovies]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      onLogout?.();
    } catch {}
  }, [onLogout]);

  const handleNavigate = useCallback(
    (screen) => {
      if (screen === "main") onSwitchToMain?.();
      else if (screen === "profile") onNavigate?.("profile");
      else if (screen === "admin") onNavigate?.("admin");
    },
    [onSwitchToMain, onNavigate],
  );

  const handleDeleteAllMovies = useCallback(async () => {
    const ok = await confirm(
      "Smazat vše?",
      "Opravdu chcete smazat všechny filmy? Tato akce je nevratná.",
      true,
    );
    if (!ok) return;

    try {
      const result = await deleteAllMovies();
      if (result?.success) {
        showToast("Hotovo", "Všechny filmy byly smazány.", "success");
        await loadMovies();
      } else {
        showToast("Chyba", result?.error || "Nepodařilo se smazat filmy.", "error");
      }
    } catch (e) {
      showToast("Chyba", e?.message || "Nepodařilo se smazat filmy.", "error");
    }
  }, [confirm, loadMovies, showToast]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      showToast("Chyba", "Prosím, zadejte TMDB ID filmu.", "error");
      return;
    }

    const movieId = parseInt(searchQuery.trim(), 10);
    if (Number.isNaN(movieId) || movieId <= 0) {
      showToast("Chyba", "Prosím, zadejte platné TMDB ID (číslo).", "error");
      return;
    }

    setLoading(true);
    setEditedMovie(null);

    try {
      const movie = await getMovieDetails(movieId);
      if (movie) {
        setTmdbId(movieId);
        setEditedMovie({
          title: movie.title || "",
          year: movie.year?.toString() || "",
          rating: movie.rating?.toString?.() || movie.rating || "",
          genre: movie.genre || "",
          director: movie.director || "",
          description: movie.description || "",
          image: movie.image || "",
          trailerUrl: "",
        });
      } else {
        showToast("Chyba", "Film nebyl nalezen.", "error");
      }
    } catch (error) {
      showToast("Chyba", error?.message || "Nepodařilo se načíst film.", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showToast]);

  const validateYouTubeUrl = (trailerUrl) => {
    if (!trailerUrl) return true;
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(trailerUrl);
  };

  const handleAddMovie = useCallback(async () => {
    if (!editedMovie) return;

    if (!editedMovie.title?.trim()) {
      showToast("Chyba", "Prosím, zadejte název filmu.", "error");
      return;
    }

    const trailerUrl = editedMovie.trailerUrl?.trim() || "";
    if (trailerUrl && !validateYouTubeUrl(trailerUrl)) {
      showToast("Chyba", "Prosím, zadejte platný YouTube odkaz.", "error");
      return;
    }

    const movieToAdd = {
      title: editedMovie.title.trim(),
      year: parseInt(editedMovie.year, 10) || new Date().getFullYear(),
      rating: parseFloat(editedMovie.rating) || 0,
      genre: editedMovie.genre?.trim() || "Neznámý",
      director: editedMovie.director?.trim() || "Neznámý",
      description: editedMovie.description?.trim() || "",
      image:
        editedMovie.image?.trim() ||
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      tmdbId: tmdbId || null,
      trailerUrl: trailerUrl || null,
    };

    try {
      const result = await addMovie(movieToAdd);
      if (result?.success) {
        showToast("Přidáno", "Film byl úspěšně přidán.", "success");
        setEditedMovie(null);
        setTmdbId(null);
        setSearchQuery("");
        await loadMovies();
      } else {
        showToast("Chyba", result?.error || "Nepodařilo se přidat film.", "error");
      }
    } catch (error) {
      showToast("Chyba", error?.message || "Nepodařilo se přidat film.", "error");
    }
  }, [editedMovie, tmdbId, loadMovies, showToast]);

  const handleDeleteMovie = useCallback(
    async (movieId) => {
      if (!movieId) {
        showToast("Chyba", "Chybí ID filmu.", "error");
        return;
      }

      const ok = await confirm("Smazat film?", "Opravdu chcete smazat tento film?", true);
      if (!ok) return;

      try {
        const result = await deleteMovie(movieId);
        if (result?.success) {
          showToast("Smazáno", "Film byl smazán.", "success");
          await loadMovies();
        } else {
          showToast("Chyba", result?.error || "Nepodařilo se smazat film.", "error");
        }
      } catch (e) {
        showToast("Chyba", e?.message || "Nepodařilo se smazat film.", "error");
      }
    },
    [confirm, loadMovies, showToast],
  );

  const startEditExisting = useCallback(
    (movie) => {
      if (!movie) return;
      setTmdbId(movie.tmdbId || movie.tmdb_id || null);
      setEditedMovie({
        title: movie.title || "",
        year: movie.year?.toString?.() || `${movie.year || ""}`,
        rating: movie.rating?.toString?.() || `${movie.rating || ""}`,
        genre: movie.genre || "",
        director: movie.director || "",
        description: movie.description || "",
        image: movie.image || "",
        trailerUrl: movie.trailerUrl || movie.trailer_url || "",
        _editDbId: movie.id,
      });
    },
    [],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editedMovie?._editDbId) return;

    if (!editedMovie.title?.trim()) {
      showToast("Chyba", "Prosím, zadejte název filmu.", "error");
      return;
    }

    const trailerUrl = editedMovie.trailerUrl?.trim() || "";
    if (trailerUrl && !validateYouTubeUrl(trailerUrl)) {
      showToast("Chyba", "Prosím, zadejte platný YouTube odkaz.", "error");
      return;
    }

    const movieToAdd = {
      title: editedMovie.title.trim(),
      year: parseInt(editedMovie.year, 10) || new Date().getFullYear(),
      rating: parseFloat(editedMovie.rating) || 0,
      genre: editedMovie.genre?.trim() || "Neznámý",
      director: editedMovie.director?.trim() || "Neznámý",
      description: editedMovie.description?.trim() || "",
      image:
        editedMovie.image?.trim() ||
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      tmdbId: tmdbId || null,
      trailerUrl: trailerUrl || null,
    };

    try {
      const del = await deleteMovie(editedMovie._editDbId);
      if (!del?.success) {
        showToast("Chyba", del?.error || "Nepodařilo se uložit změny.", "error");
        return;
      }

      const add = await addMovie(movieToAdd);
      if (add?.success) {
        showToast("Uloženo", "Změny byly uloženy.", "success");
        setEditedMovie(null);
        setTmdbId(null);
        setSearchQuery("");
        await loadMovies();
      } else {
        showToast("Chyba", add?.error || "Nepodařilo se uložit změny.", "error");
        await loadMovies();
      }
    } catch (e) {
      showToast("Chyba", e?.message || "Nepodařilo se uložit změny.", "error");
      await loadMovies();
    }
  }, [editedMovie, tmdbId, loadMovies, showToast]);

  const seedLibrary = useCallback(async () => {
    if (seeding) return;

    const ok = await confirm(
      "Naplnit knihovnu?",
      `Chceš přidat náhodně ${seedCount} filmů? (Pokud už některé existují, budou se přeskakovat.)`,
      false,
    );
    if (!ok) return;

    setSeeding(true);
    setSeedProgress({ added: 0, total: seedCount });

    try {
      const existing = await getMovies();
      const existingTmdb = new Set(
        (existing || [])
          .map((m) => m.tmdbId || m.tmdb_id)
          .filter(Boolean)
          .map((x) => String(x)),
      );
      const existingTitles = new Set((existing || []).map((m) => (m.title || "").toLowerCase()));

      const candidates = pickRandomUnique(DEMO_TMDB_IDS, Math.min(DEMO_TMDB_IDS.length, seedCount * 4));
      let added = 0;

      for (let i = 0; i < candidates.length && added < seedCount; i++) {
        const id = candidates[i];
        if (existingTmdb.has(String(id))) continue;

        let details = null;
        try {
          details = await getMovieDetails(id);
        } catch {
          continue;
        }
        if (!details?.title) continue;

        const titleKey = details.title.toLowerCase();
        if (existingTitles.has(titleKey)) continue;

        let trailerUrl = null;
        try {
          const tr = await getMovieTrailer(id);
          trailerUrl = tr?.url || null;
        } catch {
          trailerUrl = null;
        }

        const movieToAdd = {
          title: details.title,
          year: details.year || null,
          rating: parseFloat(details.rating) || 0,
          genre: details.genre || "Neznámý",
          director: details.director || "Neznámý",
          description: details.description || "",
          image: details.image || null,
          tmdbId: id,
          trailerUrl,
        };

        const res = await addMovie(movieToAdd);
        if (res?.success) {
          added += 1;
          existingTmdb.add(String(id));
          existingTitles.add(titleKey);
          setSeedProgress({ added, total: seedCount });
        }
      }

      await loadMovies();

      if (added > 0) showToast("Hotovo", `Přidáno ${added} filmů.`, "success");
      else showToast("Info", "Nepodařilo se přidat žádný film (vše bylo duplicitní nebo nedostupné).", "info");
    } catch (e) {
      showToast("Chyba", e?.message || "Nepodařilo se naplnit knihovnu.", "error");
    } finally {
      setSeeding(false);
    }
  }, [confirm, loadMovies, seedCount, seeding, showToast]);

  const email = user?.email || "—";
  const isEditingExisting = !!editedMovie?._editDbId;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PremiumBackground />

      <CenterModal open={confirmState.open} onClose={() => closeConfirm(false)} dismissable>
        <View style={modalStyles.head}>
          <View style={[modalStyles.iconDot, confirmState.danger ? modalStyles.iconDotDanger : modalStyles.iconDotSoft]}>
            <Text style={modalStyles.iconTxt}>{confirmState.danger ? "!" : "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.title}>{confirmState.title}</Text>
            <Text style={modalStyles.msg}>{confirmState.message}</Text>
          </View>
        </View>
        <View style={modalStyles.actions}>
          <TouchableOpacity activeOpacity={0.9} style={[modalStyles.btn, modalStyles.btnGhost]} onPress={() => closeConfirm(false)}>
            <Text style={modalStyles.btnTxt}>Zrušit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              modalStyles.btn,
              confirmState.danger ? modalStyles.btnDanger : modalStyles.btnPrimary,
            ]}
            onPress={() => closeConfirm(true)}
          >
            <Text style={modalStyles.btnTxtStrong}>{confirmState.danger ? "Smazat" : "Pokračovat"}</Text>
          </TouchableOpacity>
        </View>
      </CenterModal>

      <CenterModal open={toast.open} onClose={() => setToast((t) => ({ ...t, open: false }))} dismissable>
        <View style={toastStyles.wrap}>
          <View
            style={[
              toastStyles.badge,
              toast.variant === "success" && toastStyles.badgeSuccess,
              toast.variant === "error" && toastStyles.badgeError,
              toast.variant === "info" && toastStyles.badgeInfo,
            ]}
          >
            <Text style={toastStyles.badgeTxt}>
              {toast.variant === "success" ? "✓" : toast.variant === "error" ? "✕" : "i"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={toastStyles.title}>{toast.title}</Text>
            <Text style={toastStyles.msg}>{toast.message}</Text>
          </View>
        </View>
      </CenterModal>

      <View style={styles.contentWrapper}>
        <TopBar title="Admin Panel" subtitle={email} onMenu={() => setMenuOpen(true)} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.sectionCard} strokeOpacity={0.92}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Přidat / upravit film</Text>
              <Text style={styles.sectionBadge}>TMDB</Text>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Zadejte TMDB ID filmu"
                placeholderTextColor={soft(0.45)}
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardType="numeric"
              />
              <Chip title={loading ? "..." : "Vyhledat"} variant="primary" onPress={handleSearch} disabled={loading} />
            </View>

            {!!editedMovie && (
              <View style={styles.formWrap}>
                <View style={styles.formTop}>
                  <Text style={styles.formTitle}>{isEditingExisting ? "Upravit existující film" : "Upravit informace o filmu"}</Text>
                  <Chip
                    title="Zrušit"
                    variant="dim"
                    onPress={() => {
                      setEditedMovie(null);
                      setTmdbId(null);
                    }}
                  />
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.posterShell}>
                    <Image
                      source={{
                        uri:
                          editedMovie.image ||
                          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
                      }}
                      style={styles.poster}
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.posterShade}
                      pointerEvents="none"
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 220 }}>
                    <Text style={styles.inputLabel}>Název filmu *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Název filmu"
                      placeholderTextColor={soft(0.45)}
                      value={editedMovie.title}
                      onChangeText={(text) => setEditedMovie({ ...editedMovie, title: text })}
                    />

                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Rok</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Rok"
                          placeholderTextColor={soft(0.45)}
                          value={editedMovie.year}
                          onChangeText={(text) => setEditedMovie({ ...editedMovie, year: text })}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Hodnocení</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0-10"
                          placeholderTextColor={soft(0.45)}
                          value={String(editedMovie.rating ?? "")}
                          onChangeText={(text) => setEditedMovie({ ...editedMovie, rating: text })}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Žánr</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Žánr"
                      placeholderTextColor={soft(0.45)}
                      value={editedMovie.genre}
                      onChangeText={(text) => setEditedMovie({ ...editedMovie, genre: text })}
                    />

                    <Text style={styles.inputLabel}>Režisér</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Režisér"
                      placeholderTextColor={soft(0.45)}
                      value={editedMovie.director}
                      onChangeText={(text) => setEditedMovie({ ...editedMovie, director: text })}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Popis</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Popis filmu"
                  placeholderTextColor={soft(0.45)}
                  value={editedMovie.description}
                  onChangeText={(text) => setEditedMovie({ ...editedMovie, description: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.inputLabel}>URL obrázku</Text>
                <TextInput
                  style={styles.input}
                  placeholder="URL obrázku"
                  placeholderTextColor={soft(0.45)}
                  value={editedMovie.image}
                  onChangeText={(text) => setEditedMovie({ ...editedMovie, image: text })}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>Odkaz na trailer (YouTube)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor={soft(0.45)}
                  value={editedMovie.trailerUrl || ""}
                  onChangeText={(text) => setEditedMovie({ ...editedMovie, trailerUrl: text })}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.helpText}>Pokud nezadáš link, trailer se zkusí vzít z TMDB (pokud je k dispozici).</Text>

                <View style={styles.actionsRow}>
                  {isEditingExisting ? (
                    <Chip title="Uložit změny" variant="primary" onPress={handleSaveEdit} />
                  ) : (
                    <Chip title="Přidat film" variant="primary" onPress={handleAddMovie} />
                  )}
                </View>
              </View>
            )}
          </Card>

          <Card style={styles.sectionCard} strokeOpacity={0.9}>
            <View style={styles.listHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Knihovna</Text>
                <Text style={styles.sectionSub}>
                  Celkem: <Text style={styles.sectionSubStrong}>{movies.length}</Text>
                  {seeding ? (
                    <Text style={styles.sectionSub}>
                      {"  "}• Přidávám:{" "}
                      <Text style={styles.sectionSubStrong}>{seedProgress.added}/{seedProgress.total}</Text>
                    </Text>
                  ) : null}
                </Text>
              </View>

              <Chip title="Smazat vše" variant="danger" onPress={handleDeleteAllMovies} disabled={seeding} />
            </View>

            <View style={styles.seedRow}>
              <Text style={styles.seedLabel}>Náhodně přidat:</Text>
              <View style={styles.seedChips}>
                {[10, 25, 50, 100, 200].map((n) => (
                  <Chip
                    key={n}
                    title={`${n}`}
                    variant={seedCount === n ? "primary" : "dim"}
                    onPress={() => setSeedCount(n)}
                    style={{ minWidth: 64, height: 40, borderRadius: 12 }}
                    disabled={seeding}
                  />
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.seedBtn, seeding && { opacity: 0.6 }]}
                onPress={seedLibrary}
                disabled={seeding}
              >
                {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                <LinearGradient
                  colors={["rgba(80,210,255,0.20)", "rgba(229,9,20,0.12)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                {seeding ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.seedBtnTxt}>Naplnění běží…</Text>
                  </View>
                ) : (
                  <Text style={styles.seedBtnTxt}>Naplnit knihovnu náhodně</Text>
                )}
              </TouchableOpacity>
            </View>

            {movies.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>Žádné filmy</Text>
                <Text style={styles.emptySub}>Přidej film přes TMDB ID nebo použij „Naplnit knihovnu náhodně“.</Text>
                <Chip title="Zpět na filmy" onPress={() => onSwitchToMain?.()} />
              </View>
            ) : (
              <View style={styles.list}>
                {movies.map((movie) => (
                  <View key={movie.id} style={styles.movieRow}>
                    <View style={styles.thumbWrap}>
                      <Image source={{ uri: movie.image }} style={styles.thumb} />
                      <LinearGradient
                        colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.75)"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.thumbShade}
                        pointerEvents="none"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.movieTitle} numberOfLines={1}>
                        {movie.title}
                      </Text>
                      <Text style={styles.movieMeta} numberOfLines={1}>
                        {movie.year ?? "—"} <Text style={styles.dot}>•</Text> ⭐ {movie.rating ?? "—"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editPill}
                      activeOpacity={0.9}
                      onPress={() => startEditExisting(movie)}
                      disabled={seeding}
                    >
                      {!isWeb && <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                      <Text style={styles.editPillTxt}>✎</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deletePill}
                      activeOpacity={0.9}
                      onPress={() => handleDeleteMovie(movie.id)}
                      disabled={seeding}
                    >
                      {!isWeb && <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                      <Text style={styles.deletePillTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View style={{ height: 16 }} />
        </ScrollView>
      </View>

      <MenuBar
        currentScreen="admin"
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
};

const ui = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 16,
  },
  stroke: { ...StyleSheet.absoluteFillObject },
  chip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    minWidth: 110,
  },
  chipPrimary: {
    backgroundColor: "rgba(80,210,255,0.16)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipDanger: {
    backgroundColor: "rgba(229,9,20,0.18)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipDim: {
    backgroundColor: "rgba(0,0,0,0.20)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  chipTxt: { color: soft(0.92), fontWeight: "900" },
});

const createStyles = ({ desktop, tablet, pad, topPad }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#05060A" },
    contentWrapper: { flex: 1, paddingTop: topPad, paddingHorizontal: pad },

    scroll: { flex: 1 },
    scrollContent: { paddingTop: 10, paddingBottom: 22, gap: 12 },

    sectionCard: { padding: desktop ? 18 : 16 },

    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    sectionTitle: { color: soft(0.95), fontWeight: "900", fontSize: desktop ? 20 : 18, letterSpacing: 0.2 },
    sectionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(0,0,0,0.22)",
      color: soft(0.78),
      fontWeight: "900",
      fontSize: 12,
    },

    searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    searchInput: {
      flex: 1,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(0,0,0,0.22)",
      paddingHorizontal: 14,
      color: soft(0.92),
      fontWeight: "800",
    },

    formWrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
    formTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 },
    formTitle: { color: soft(0.92), fontWeight: "900", fontSize: 16, flex: 1 },

    formGrid: { flexDirection: tablet ? "row" : "column", gap: 14 },

    posterShell: {
      width: tablet ? 160 : "100%",
      height: tablet ? 240 : 210,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    poster: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    posterShade: { ...StyleSheet.absoluteFillObject },

    inputLabel: { marginTop: 10, marginBottom: 8, color: soft(0.7), fontWeight: "800", fontSize: 12 },
    input: {
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(0,0,0,0.22)",
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: soft(0.92),
      fontWeight: "750",
    },
    row2: { flexDirection: "row", gap: 10, marginTop: 2 },

    textArea: { minHeight: 110 },

    helpText: { marginTop: 8, color: soft(0.55), fontWeight: "650", fontSize: 12, lineHeight: 17 },

    actionsRow: { marginTop: 14, flexDirection: "row", justifyContent: "flex-end" },

    listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 },
    sectionSub: { marginTop: 6, color: soft(0.60), fontWeight: "750" },
    sectionSubStrong: { color: soft(0.90), fontWeight: "900" },

    seedRow: {
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.08)",
      paddingTop: 12,
      marginTop: 10,
      gap: 10,
    },
    seedLabel: { color: soft(0.70), fontWeight: "900", fontSize: 12 },
    seedChips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    seedBtn: {
      height: 52,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    seedBtnTxt: { color: soft(0.95), fontWeight: "900" },

    emptyWrap: { alignItems: "center", paddingVertical: 16, gap: 8 },
    emptyTitle: { color: soft(0.92), fontWeight: "900", fontSize: 16 },
    emptySub: { color: soft(0.60), fontWeight: "650", textAlign: "center", lineHeight: 18 },

    list: { gap: 10, marginTop: 10 },

    movieRow: {
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(0,0,0,0.22)",
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    thumbWrap: {
      width: 56,
      height: 80,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    thumb: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    thumbShade: { ...StyleSheet.absoluteFillObject },

    movieTitle: { color: soft(0.94), fontWeight: "900", fontSize: 14 },
    movieMeta: { marginTop: 6, color: soft(0.62), fontWeight: "800", fontSize: 12 },
    dot: { color: soft(0.35) },

    editPill: {
      width: 38,
      height: 38,
      borderRadius: 999,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(80,210,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    editPillTxt: { color: soft(0.92), fontWeight: "900", fontSize: 16, marginTop: -1 },

    deletePill: {
      width: 38,
      height: 38,
      borderRadius: 999,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(229,9,20,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    deletePillTxt: { color: soft(0.92), fontWeight: "900", fontSize: 16, marginTop: -1 },
  });

const topStyles = StyleSheet.create({
  wrap: { paddingTop: isWeb ? 10 : 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10 },
  left: { flex: 1, paddingRight: 12 },
  title: { color: soft(0.95), fontWeight: "900", fontSize: 22, letterSpacing: 0.2 },
  sub: { marginTop: 4, color: soft(0.55), fontWeight: "700", fontSize: 12 },
  menuBtn: { width: 46, height: 46, borderRadius: 999, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  menuIcon: { height: 16, justifyContent: "space-between" },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.78)" },
});

const bgStyles = StyleSheet.create({
  glow: { position: "absolute", width: 420, height: 420, borderRadius: 999 },
  glowTop: { top: -170, left: -140, backgroundColor: "rgba(165, 120, 255, 0.20)" },
  glowRight: { top: 110, right: -200, backgroundColor: "rgba(80, 210, 255, 0.14)" },
  glowBottom: { bottom: -210, left: 40, backgroundColor: "rgba(255, 70, 170, 0.12)" },
  noise: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.03)", opacity: 0.18 },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.70)" },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(10,10,12,0.92)",
    padding: 16,
  },
  stroke: { ...StyleSheet.absoluteFillObject, opacity: 0.95 },
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 4 },
  iconDot: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  iconDotDanger: { backgroundColor: "rgba(229,9,20,0.20)", borderColor: "rgba(255,255,255,0.14)" },
  iconDotSoft: { backgroundColor: "rgba(80,210,255,0.18)", borderColor: "rgba(255,255,255,0.14)" },
  iconTxt: { color: soft(0.95), fontWeight: "900", fontSize: 18, marginTop: -1 },
  title: { color: soft(0.95), fontWeight: "900", fontSize: 16 },
  msg: { marginTop: 6, color: soft(0.70), fontWeight: "700", lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden" },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" },
  btnPrimary: { backgroundColor: "rgba(80,210,255,0.18)", borderColor: "rgba(255,255,255,0.14)" },
  btnDanger: { backgroundColor: "rgba(229,9,20,0.18)", borderColor: "rgba(255,255,255,0.14)" },
  btnTxt: { color: soft(0.88), fontWeight: "900" },
  btnTxtStrong: { color: soft(0.95), fontWeight: "900" },
});

const toastStyles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 12, alignItems: "center" },
  badge: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badgeSuccess: { backgroundColor: "rgba(120,255,160,0.12)", borderColor: "rgba(255,255,255,0.14)" },
  badgeError: { backgroundColor: "rgba(229,9,20,0.16)", borderColor: "rgba(255,255,255,0.14)" },
  badgeInfo: { backgroundColor: "rgba(80,210,255,0.14)", borderColor: "rgba(255,255,255,0.14)" },
  badgeTxt: { color: soft(0.95), fontWeight: "900", fontSize: 18, marginTop: -1 },
  title: { color: soft(0.95), fontWeight: "900", fontSize: 16 },
  msg: { marginTop: 4, color: soft(0.70), fontWeight: "700", lineHeight: 18 },
});

export default AdminScreen;