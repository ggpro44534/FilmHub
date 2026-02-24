import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { signOut } from "../lib/auth";
import { getFavorites, removeFavorite } from "../lib/favorites";
import { getMovieTrailer, getMovieTrailerFromDb } from "../lib/movies";
import MenuBar from "./MenuBar";

let WebView = null;
if (Platform.OS !== "web") {
  try {
    const WebViewModule = require("react-native-webview");
    WebView = WebViewModule.WebView || WebViewModule.default;
  } catch (e) {
    WebView = null;
  }
}

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

function Overlay({ open, onClose, children, variant = "sheet" }) {
  if (!open) return null;

  const isFull = variant === "full";

  if (isWeb) {
    return (
      <View style={overlayStyles.root} pointerEvents="box-none">
        <TouchableOpacity activeOpacity={1} style={overlayStyles.backdrop} onPress={onClose} />
        <View style={[overlayStyles.sheet, isFull && overlayStyles.full]} pointerEvents="auto">
          {children}
        </View>
      </View>
    );
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={overlayStyles.root} pointerEvents="box-none">
        <TouchableOpacity activeOpacity={1} style={overlayStyles.backdrop} onPress={onClose} />
        <View style={[overlayStyles.sheet, isFull && overlayStyles.full]} pointerEvents="auto">
          {children}
        </View>
      </View>
    </Modal>
  );
}

function TrailerPlayer({ url, onFallback }) {
  if (!url) return null;

  if (Platform.OS === "web") {
    return (
      <View style={playerStyles.shell}>
        <iframe
          src={url}
          style={playerStyles.iframe}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          onError={() => onFallback?.(url)}
        />
      </View>
    );
  }

  if (!WebView) return null;

  return (
    <WebView
      source={{ uri: url }}
      style={playerStyles.webview}
      originWhitelist={["*"]}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(req) => {
        const u = req?.url || "";
        const ok =
          u.startsWith("about:blank") ||
          u.includes("youtube.com/embed/") ||
          u.includes("youtube-nocookie.com/embed/") ||
          u.includes("googlevideo.com");
        if (!ok) {
          onFallback?.(url);
          return false;
        }
        return true;
      }}
    />
  );
}

export default function ProfileScreen({ user, onLogout, onSwitchToMain, onNavigate }) {
  const [layout, setLayout] = useState(getLayout());
  const styles = useMemo(() => createStyles(layout), [layout]);

  const [favorites, setFavorites] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedMovie, setSelectedMovie] = useState(null);

  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(null);
  const [noTrailerModalVisible, setNoTrailerModalVisible] = useState(false);
  const [currentMovieForTrailer, setCurrentMovieForTrailer] = useState(null);

  useEffect(() => {
    const onChange = () => setLayout(getLayout());
    const sub = Dimensions.addEventListener?.("change", onChange);
    return () => sub?.remove?.();
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavorites(Array.isArray(favs) ? favs : []);
    } catch (e) {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      onLogout?.();
    } catch (e) {}
  }, [onLogout]);

  const handleNavigate = useCallback(
    (screen) => {
      if (screen === "main") onSwitchToMain?.();
      else if (screen === "admin") onNavigate?.("admin");
      else if (screen === "profile") onNavigate?.("profile");
    },
    [onNavigate, onSwitchToMain],
  );

  const convertToEmbedUrl = (url) => {
    if (!url) return null;
    const params = "autoplay=1&rel=0&playsinline=1&modestbranding=1&controls=1";

    if (url.includes("youtube.com/embed/")) {
      const base = url.split("?")[0];
      return `${base}?${params}`;
    }

    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?${params}`;

    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}?${params}`;

    return null;
  };

  const openTrailerFallback = useCallback(async (embedUrl) => {
    let originalUrl = embedUrl;
    if (embedUrl?.includes("/embed/")) {
      const videoId = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];
      if (videoId) originalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    try {
      await Linking.openURL(originalUrl);
    } catch (e) {
      Alert.alert("Chyba", "Nepodařilo se otevřít trailer.");
    }
  }, []);

  const handleWatchTrailer = useCallback(
    async (movie) => {
      if (!movie) return;

      setLoadingTrailer(true);
      setCurrentMovieForTrailer(movie);
      
      try {
        let trailer = null;

        if (movie.id) trailer = await getMovieTrailerFromDb(movie.id);

        if (!trailer?.url) {
          const tmdbId = movie.tmdbId || movie.tmdb_id;
          if (tmdbId) trailer = await getMovieTrailer(tmdbId);
        }

        if (!trailer?.url) {
          setNoTrailerModalVisible(true);
          return;
        }

        const embedUrl = convertToEmbedUrl(trailer.url);
        if (!embedUrl) {
          setNoTrailerModalVisible(true);
          return;
        }

        setTrailerUrl(embedUrl);
        setShowTrailer(true);
      } catch (e) {
        setNoTrailerModalVisible(true);
      } finally {
        setLoadingTrailer(false);
      }
    },
    [],
  );

  const handleRemoveFavorite = useCallback(
    async (movieId) => {
      if (!movieId) {
        if (Platform.OS === "web") {
          const overlay = document.createElement("div");
          overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.72);
            backdrop-filter: blur(8px);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
          `;

          const modal = document.createElement("div");
          modal.style.cssText = `
            width: min(460px, 100%);
            border-radius: 26px;
            border: 1px solid rgba(255,255,255,0.14);
            background: linear-gradient(135deg, rgba(31,31,58,0.95), rgba(26,26,46,0.92));
            box-shadow: 0 30px 70px rgba(0,0,0,0.55);
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            transform: translateY(10px) scale(0.98);
            opacity: 0;
            animation: fhPop2 180ms ease-out forwards;
          `;

          const style = document.createElement("style");
          style.textContent = `
            @keyframes fhPop2 { to { transform: translateY(0) scale(1); opacity: 1; } }
            .fhBtnPrimary2:hover { opacity: .92; }
            .fhBtnGhost2:hover { background: rgba(255,255,255,0.12); }
          `;
          document.head.appendChild(style);

          modal.innerHTML = `
            <div style="padding: 18px 18px 14px 18px; display:flex; gap:12px; align-items:flex-start;">
              <div style="
                width:46px;height:46px;border-radius:16px;
                background: rgba(229,9,20,0.18);
                border: 1px solid rgba(255,255,255,0.12);
                display:flex;align-items:center;justify-content:center;
                font-size:18px;font-weight:800;">❌</div>
              <div style="flex:1; padding-top:2px;">
                <div style="font-size:16px;font-weight:800; letter-spacing:0.2px; margin-bottom:6px;">
                  Chyba
                </div>
                <div style="font-size:13px; line-height:18px; color: rgba(255,255,255,0.72); font-weight:600;">
                  Nebylo zadáno ID filmu.
                </div>
              </div>
              <button aria-label="Close" class="fhBtnGhost2" style="
                width:40px;height:40px;border-radius:999px;
                border: 1px solid rgba(255,255,255,0.14);
                background: rgba(255,255,255,0.08);
                color:#fff;font-size:20px;font-weight:800;
                cursor:pointer; line-height:0;">×</button>
            </div>
            <div style="padding: 0 18px 18px 18px; display:flex; gap:10px;">
              <button class="fhBtnPrimary2" style="
                flex:1; height:46px; border-radius:14px;
                border: 1px solid rgba(255,255,255,0.14);
                background: rgba(229,9,20,0.22);
                color:#fff; font-size:14px; font-weight:800;
                cursor:pointer;">OK</button>
            </div>
          `;

          overlay.appendChild(modal);
          document.body.appendChild(overlay);

          const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            if (document.head.contains(style)) document.head.removeChild(style);
          };

          overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close();
          });

          modal.querySelector(".fhBtnGhost2")?.addEventListener("click", close);
          modal.querySelector(".fhBtnPrimary2")?.addEventListener("click", close);
        } else {
          Alert.alert("Chyba", "Nebylo zadáno ID filmu");
        }
        return;
      }

      const confirmRemove = () => {
        return new Promise((resolve) => {
          if (Platform.OS === "web") {
            const overlay = document.createElement("div");
            overlay.style.cssText = `
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.72);
              backdrop-filter: blur(8px);
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
            `;

            const modal = document.createElement("div");
            modal.style.cssText = `
              width: min(520px, 100%);
              border-radius: 28px;
              border: 1px solid rgba(255,255,255,0.16);
              background: linear-gradient(135deg, rgba(31,31,58,0.96), rgba(16,16,26,0.92));
              box-shadow: 0 30px 70px rgba(0,0,0,0.58);
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              overflow: hidden;
              transform: translateY(10px) scale(0.98);
              opacity: 0;
              animation: modalAppear 180ms ease-out forwards;
            `;

            const style = document.createElement("style");
            style.textContent = `
              @keyframes modalAppear { to { transform: translateY(0) scale(1); opacity: 1; } }
              .fhGhost:hover { background: rgba(255,255,255,0.12); }
              .fhDanger:hover { opacity: .92; }
            `;
            document.head.appendChild(style);

            modal.innerHTML = `
              <div style="padding: 18px; display:flex; gap:12px; align-items:flex-start;">
                <div style="
                  width:46px;height:46px;border-radius:16px;
                  background: rgba(229,9,20,0.18);
                  border: 1px solid rgba(255,255,255,0.12);
                  display:flex;align-items:center;justify-content:center;
                  font-size:20px;font-weight:900;">⚠️</div>
                <div style="flex:1; padding-top:2px;">
                  <div style="font-size:16px;font-weight:900; letter-spacing:0.2px; margin-bottom:6px;">
                    Potvrzení
                  </div>
                  <div style="font-size:13px; line-height:18px; color: rgba(255,255,255,0.72); font-weight:650;">
                    Opravdu chcete odebrat tento film z oblíbených?
                  </div>
                </div>
                <button aria-label="Close" class="fhGhost" style="
                  width:40px;height:40px;border-radius:999px;
                  border: 1px solid rgba(255,255,255,0.14);
                  background: rgba(255,255,255,0.08);
                  color:#fff;font-size:20px;font-weight:900;
                  cursor:pointer; line-height:0;">×</button>
              </div>
              <div style="padding: 0 18px 18px 18px; display:flex; gap:10px;">
                <button id="cancelBtn" class="fhGhost" style="
                  flex:1; height:46px; border-radius:14px;
                  border: 1px solid rgba(255,255,255,0.14);
                  background: rgba(255,255,255,0.08);
                  color:#fff; font-size:14px; font-weight:900;
                  cursor:pointer;">Zrušit</button>
                <button id="confirmBtn" class="fhDanger" style="
                  flex:1; height:46px; border-radius:14px;
                  border: 1px solid rgba(255,255,255,0.14);
                  background: rgba(229,9,20,0.22);
                  color:#fff; font-size:14px; font-weight:900;
                  cursor:pointer;">Odebrat</button>
              </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const cleanup = () => {
              if (document.body.contains(overlay)) document.body.removeChild(overlay);
              if (document.head.contains(style)) document.head.removeChild(style);
            };

            const closeNo = () => {
              cleanup();
              resolve(false);
            };
            const closeYes = () => {
              cleanup();
              resolve(true);
            };

            modal.querySelector("#cancelBtn")?.addEventListener("click", closeNo);
            modal.querySelector("#confirmBtn")?.addEventListener("click", closeYes);
            modal.querySelector(".fhGhost")?.addEventListener("click", closeNo);

            overlay.addEventListener("click", (e) => {
              if (e.target === overlay) closeNo();
            });
          } else {
            Alert.alert("Potvrzení", "Opravdu chcete odebrat tento film z oblíbených?", [
              { text: "Zrušit", style: "cancel", onPress: () => resolve(false) },
              { text: "Odebrat", style: "destructive", onPress: () => resolve(true) },
            ]);
          }
        });
      };

      const shouldRemove = await confirmRemove();
      if (!shouldRemove) return;

      try {
        const result = await removeFavorite(movieId);
        if (result?.success) {
          await loadFavorites();
          setSelectedMovie(null);
        } else {
          Alert.alert("Chyba", result?.error || "Nepodařilo se odebrat film z oblíbených");
        }
      } catch (e) {
        Alert.alert("Chyba", e?.message || "Nepodařilo se odebrat film z oblíbených");
      }
    },
    [loadFavorites],
  );

  const closeDetails = useCallback(() => setSelectedMovie(null), []);
  const closeTrailer = useCallback(() => {
    setShowTrailer(false);
    setTrailerUrl(null);
  }, []);

  const closeNoTrailerModal = useCallback(() => {
    setNoTrailerModalVisible(false);
    setCurrentMovieForTrailer(null);
  }, []);

  const email = user?.email || "—";
  const avatarLetter = (email || "U").slice(0, 1).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PremiumBackground />

      <View style={styles.contentWrapper}>
        <TopBar title="Profil" subtitle={email} onMenu={() => setMenuOpen(true)} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
            <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardStroke}
              pointerEvents="none"
            />

            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{avatarLetter}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.email} numberOfLines={1}>
                  {email}
                </Text>
                <Text style={styles.count}>
                  Oblíbené filmy: <Text style={styles.countStrong}>{favorites.length}</Text>
                </Text>
              </View>
            </View>
          </View>

          {favorites.length === 0 ? (
            <View style={styles.emptyCard}>
              {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
              <LinearGradient
                colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardStroke}
                pointerEvents="none"
              />

              <Text style={styles.emptyTitle}>Zatím nemáte žádné oblíbené filmy</Text>
              <Text style={styles.emptySub}>Přejeďte film doprava nebo klepněte na ✓ pro přidání do oblíbených.</Text>

              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={onSwitchToMain}>
                {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                <Text style={styles.primaryBtnText}>Zpět na filmy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {favorites.map((movie) => (
                <View key={movie.id} style={styles.rowCard}>
                  {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                  <LinearGradient
                    colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.02)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rowStroke}
                    pointerEvents="none"
                  />

                  <TouchableOpacity style={styles.rowMain} activeOpacity={0.92} onPress={() => setSelectedMovie(movie)}>
                    <View style={styles.thumbWrap}>
                      <Image source={{ uri: movie.image }} style={styles.thumb} />
                      <LinearGradient
                        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.65)"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.thumbShade}
                        pointerEvents="none"
                      />
                    </View>

                    <View style={styles.rowInfo}>
                      <Text style={styles.movieTitle} numberOfLines={1}>
                        {movie.title}
                      </Text>
                      <Text style={styles.movieSub} numberOfLines={1}>
                        {movie.year ? `${movie.year}` : "—"} · ⭐ {movie.rating ?? "—"}
                      </Text>
                      {!!movie.director && (
                        <Text style={styles.movieSub2} numberOfLines={1}>
                          Režie: {movie.director}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.85} style={styles.removePill} onPress={() => handleRemoveFavorite(movie.id)}>
                    {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                    <Text style={styles.removeTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        <Overlay open={!!selectedMovie} onClose={closeDetails} variant="sheet">
          <View style={styles.sheetInner}>
            {!isWeb && <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalStroke}
              pointerEvents="none"
            />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedMovie?.title || "—"}
              </Text>

              <TouchableOpacity style={styles.closeBtn} activeOpacity={0.85} onPress={closeDetails}>
                <Text style={styles.closeBtnTxt}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {!!selectedMovie?.image && (
                <View style={styles.modalPosterWrap}>
                  <Image source={{ uri: selectedMovie.image }} style={styles.modalPoster} />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.70)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.modalPosterShade}
                    pointerEvents="none"
                  />
                </View>
              )}

              {!!selectedMovie?.description && <Text style={styles.descText}>{selectedMovie.description}</Text>}

              <TouchableOpacity
                style={[styles.trailerBtn, loadingTrailer && styles.btnDisabled]}
                activeOpacity={0.9}
                disabled={loadingTrailer}
                onPress={() => handleWatchTrailer(selectedMovie)}
              >
                {!isWeb && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                {loadingTrailer ? <ActivityIndicator color="#fff" /> : <Text style={styles.trailerBtnTxt}>▶ Přehrát trailer</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={() => handleRemoveFavorite(selectedMovie?.id)}>
                <Text style={styles.secondaryBtnTxt}>Odebrat z oblíbených</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Overlay>

        <Overlay open={showTrailer && !!trailerUrl} onClose={closeTrailer} variant="full">
          <View style={styles.sheetInner}>
            {!isWeb && <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalStroke}
              pointerEvents="none"
            />

            <View style={styles.trailerHeader}>
              <Text style={styles.trailerTitle}>Trailer</Text>
              <TouchableOpacity style={styles.closeBtn} activeOpacity={0.85} onPress={closeTrailer}>
                <Text style={styles.closeBtnTxt}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.playerWrap}>
              <TrailerPlayer url={trailerUrl} onFallback={openTrailerFallback} />
              {!WebView && !isWeb && (
                <View style={styles.playerLoading}>
                  <Text style={styles.playerLoadingText}>Přehrávač není dostupný.</Text>
                </View>
              )}
            </View>
          </View>
        </Overlay>

        <Modal
          visible={noTrailerModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeNoTrailerModal}
        >
          <View style={noTrailerStyles.root}>
            <TouchableOpacity 
              activeOpacity={1} 
              style={noTrailerStyles.backdrop} 
              onPress={closeNoTrailerModal} 
            />
            <View style={noTrailerStyles.card}>
              {!isWeb && <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
              <LinearGradient
                colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={noTrailerStyles.stroke}
                pointerEvents="none"
              />
              
              <View style={noTrailerStyles.header}>
                <View style={noTrailerStyles.iconWrap}>
                  <Text style={noTrailerStyles.iconText}>🎬</Text>
                </View>
                <View style={noTrailerStyles.textContainer}>
                  <Text style={noTrailerStyles.title}>Trailer nenalezen</Text>
                  <Text style={noTrailerStyles.message}>
                    {currentMovieForTrailer?.title 
                      ? `Pro film "${currentMovieForTrailer.title}" není k dispozici žádný trailer.`
                      : "Pro tento film není k dispozici žádný trailer."}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={noTrailerStyles.closeBtn} 
                  activeOpacity={0.85} 
                  onPress={closeNoTrailerModal}
                >
                  <Text style={noTrailerStyles.closeBtnText}>×</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={noTrailerStyles.okBtn} 
                activeOpacity={0.9} 
                onPress={closeNoTrailerModal}
              >
                <Text style={noTrailerStyles.okBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      <MenuBar
        currentScreen="profile"
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.60)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "88%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(10,10,12,0.94)",
  },
  full: { top: 0, bottom: 0, maxHeight: "100%", borderTopLeftRadius: 0, borderTopRightRadius: 0 },
});

const playerStyles = StyleSheet.create({
  shell: { flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.45)" },
  iframe: { width: "100%", height: "100%", border: "0" },
  webview: { flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.45)" },
});

const noTrailerStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  card: {
    width: "92%",
    maxWidth: 520,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(10,10,12,0.92)",
    padding: 18,
  },
  stroke: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255, 193, 7, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: soft(0.95),
    fontWeight: "900",
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: soft(0.95),
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    color: soft(0.72),
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: soft(0.9),
    fontWeight: "900",
    fontSize: 20,
    marginTop: -2,
  },
  okBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255, 193, 7, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  okBtnText: {
    color: soft(0.94),
    fontWeight: "900",
    fontSize: 15,
  },
});

const createStyles = ({ desktop, tablet, pad, topPad }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#05060A" },
    contentWrapper: { flex: 1, paddingTop: topPad, paddingHorizontal: pad },

    scroll: { flex: 1 },
    scrollContent: { paddingTop: 10, paddingBottom: 22, gap: 12 },

    profileCard: {
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(255,255,255,0.06)",
      padding: desktop ? 18 : 16,
    },
    emptyCard: {
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(255,255,255,0.06)",
      padding: 18,
      alignItems: "center",
      gap: 10,
    },
    cardStroke: { ...StyleSheet.absoluteFillObject, opacity: 0.9 },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTxt: { color: soft(0.9), fontWeight: "900", fontSize: 16 },

    email: { color: soft(0.95), fontWeight: "900", fontSize: desktop ? 18 : 16 },
    count: { marginTop: 4, color: soft(0.62), fontWeight: "700" },
    countStrong: { color: soft(0.9), fontWeight: "900" },

    emptyTitle: { color: soft(0.94), fontWeight: "900", fontSize: 16, textAlign: "center" },
    emptySub: { color: soft(0.62), fontWeight: "650", fontSize: 13, textAlign: "center", lineHeight: 18 },

    primaryBtn: {
      marginTop: 6,
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      minWidth: 170,
    },
    primaryBtnText: { color: soft(0.92), fontWeight: "900" },

    list: { gap: 10 },

    rowCard: {
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(255,255,255,0.06)",
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowStroke: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },

    rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },

    thumbWrap: {
      width: tablet ? 72 : 64,
      height: tablet ? 104 : 92,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "rgba(0,0,0,0.28)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
    },
    thumb: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    thumbShade: { ...StyleSheet.absoluteFillObject },

    rowInfo: { flex: 1 },
    movieTitle: { color: soft(0.95), fontWeight: "900", fontSize: 14 },
    movieSub: { marginTop: 6, color: soft(0.62), fontWeight: "800", fontSize: 12 },
    movieSub2: { marginTop: 4, color: soft(0.52), fontWeight: "700", fontSize: 12 },

    removePill: {
      width: 36,
      height: 36,
      borderRadius: 999,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(0,0,0,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    removeTxt: { color: soft(0.9), fontWeight: "900", fontSize: 16, marginTop: -1 },

    sheetInner: { flex: 1 },

    modalStroke: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", opacity: 0.9 },

    modalHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.08)",
    },
    modalTitle: { color: soft(0.95), fontWeight: "900", fontSize: 16, flex: 1, paddingRight: 10 },

    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnTxt: { color: soft(0.9), fontWeight: "900", fontSize: 20, marginTop: -1 },

    modalContent: { padding: 16, paddingBottom: 26 },

    modalPosterWrap: {
      width: "100%",
      height: tablet ? 220 : 190,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(0,0,0,0.25)",
      marginBottom: 14,
    },
    modalPoster: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    modalPosterShade: { ...StyleSheet.absoluteFillObject },

    descText: { color: soft(0.75), fontWeight: "650", fontSize: 13, lineHeight: 19 },

    trailerBtn: {
      marginTop: 14,
      height: 50,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(229, 9, 20, 0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    trailerBtnTxt: { color: soft(0.95), fontWeight: "900" },
    btnDisabled: { opacity: 0.55 },

    secondaryBtn: {
      marginTop: 10,
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnTxt: { color: soft(0.86), fontWeight: "900" },

    trailerHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.08)",
    },
    trailerTitle: { color: soft(0.95), fontWeight: "900", fontSize: 16 },

    playerWrap: { flex: 1, padding: 12 },
    playerLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    playerLoadingText: { color: soft(0.75), fontWeight: "700", textAlign: "center", paddingHorizontal: 18 },
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