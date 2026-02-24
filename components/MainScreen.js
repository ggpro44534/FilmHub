import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  Easing,
  StatusBar,
  Image,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { signOut } from "../lib/auth";
import { getMovies } from "../lib/movies";
import { addFavorite } from "../lib/favorites";
import MenuBar from "./MenuBar";

const isWeb = Platform.OS === "web";
const canUseNativeDriver = !isWeb;

const defaultMovies = [
  {
    id: "1",
    title: "Harry Potter and the Philosopher's Stone",
    year: 2001,
    rating: 9.2,
    tmdb: 7.9,
    tmdbVotes: "29k",
    localVotes: 47,
    genreTags: ["Пригоди", "Фентезі"],
    director: "Кріс Коламбус",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
  },
  {
    id: "2",
    title: "Inception",
    year: 2010,
    rating: 8.8,
    tmdb: 8.7,
    tmdbVotes: "2.3M",
    localVotes: 183,
    genreTags: ["Sci-Fi", "Action"],
    director: "Christopher Nolan",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
  },
];

const soft = (v) => `rgba(255,255,255,${v})`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const getLayout = () => {
  const { width: w, height: h } = Dimensions.get("window");
  const desktop = w >= 1024;
  const tablet = w >= 768;

  const cardW = desktop ? Math.min(560, Math.round(w * 0.36)) : tablet ? Math.min(560, w - 130) : w - 44;
  const cardH = desktop ? Math.min(860, Math.round(h * 0.74)) : tablet ? Math.round(h * 0.68) : Math.round(h * 0.64);

  return { w, h, desktop, tablet, cardW, cardH };
};

const SWIPE_THRESHOLD = (w) => Math.max(110, Math.min(190, Math.round(w * 0.2)));
const OFFSCREEN_X = (w) => w + 280;

export default function MainScreen({ user, onLogout, onSwitchToAdmin, onSwitchToProfile, onNavigate }) {
  const [layout, setLayout] = useState(getLayout());
  const [movies, setMovies] = useState(defaultMovies);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  const x = useRef(new Animated.Value(0)).current;
  const stackAnim = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const onChange = () => setLayout(getLayout());
    const sub = Dimensions.addEventListener?.("change", onChange);
    return () => sub?.remove?.();
  }, []);

  const loadMovies = useCallback(async () => {
    try {
      const savedMovies = await getMovies();
      if (savedMovies && savedMovies.length > 0) {
        setMovies(savedMovies);
        setCurrentMovieIndex((idx) => (idx >= savedMovies.length ? 0 : idx));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: canUseNativeDriver }),
        Animated.timing(breathe, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: canUseNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const nextIndex = useMemo(() => (movies.length ? (currentMovieIndex + 1) % movies.length : 0), [currentMovieIndex, movies.length]);
  const next2Index = useMemo(() => (movies.length ? (currentMovieIndex + 2) % movies.length : 0), [currentMovieIndex, movies.length]);

  const currentMovie = movies[currentMovieIndex];
  const nextMovie = movies[nextIndex];
  const next2Movie = movies[next2Index];

  useEffect(() => {
    const urls = [currentMovie?.image, nextMovie?.image, next2Movie?.image].filter(Boolean);
    urls.forEach((u) => {
      if (typeof u === "string") Image.prefetch(u).catch(() => {});
    });
  }, [currentMovie?.image, nextMovie?.image, next2Movie?.image]);

  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(x, { toValue: 0, stiffness: 280, damping: 22, mass: 0.9, useNativeDriver: canUseNativeDriver }),
      Animated.spring(stackAnim, { toValue: 0, stiffness: 280, damping: 22, mass: 0.9, useNativeDriver: canUseNativeDriver }),
    ]).start();
  }, [x, stackAnim]);

  const goNext = useCallback(() => {
    setCurrentMovieIndex((prev) => (prev + 1) % movies.length);
    x.setValue(0);
    stackAnim.setValue(0);
  }, [movies.length, x, stackAnim]);

  const animateOffscreen = useCallback(
    (dir) => {
      Animated.parallel([
        Animated.timing(x, {
          toValue: dir * OFFSCREEN_X(layout.w),
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: canUseNativeDriver,
        }),
        Animated.timing(stackAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: canUseNativeDriver,
        }),
      ]).start(goNext);
    },
    [goNext, layout.w, stackAnim, x]
  );

  const swipeRight = useCallback(async () => {
    const m = movies[currentMovieIndex];
    if (m) {
      try {
        await addFavorite(m);
      } catch (e) {}
    }
    animateOffscreen(1);
  }, [animateOffscreen, currentMovieIndex, movies]);

  const swipeLeft = useCallback(() => {
    animateOffscreen(-1);
  }, [animateOffscreen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
        onPanResponderMove: (_, g) => {
          x.setValue(g.dx);
          const p = clamp(Math.abs(g.dx) / SWIPE_THRESHOLD(layout.w), 0, 1);
          stackAnim.setValue(p);
        },
        onPanResponderRelease: (_, g) => {
          const th = SWIPE_THRESHOLD(layout.w);
          if (g.dx > th) swipeRight();
          else if (g.dx < -th) swipeLeft();
          else resetPosition();
        },
        onPanResponderTerminate: resetPosition,
      }),
    [layout.w, resetPosition, stackAnim, swipeLeft, swipeRight, x]
  );

  useEffect(() => {
    if (!isWeb) return;

    const onKeyDown = (e) => {
      if (!movies.length) return;
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        swipeRight();
      } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        swipeLeft();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        onRandomRefresh();
      } else if (e.code === "Escape") {
        e.preventDefault();
        resetPosition();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [movies.length, resetPosition, swipeLeft, swipeRight]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      onLogout?.();
    } catch (e) {}
  }, [onLogout]);

  const handleNavigate = useCallback(
    (screen) => {
      if (screen === "admin") onSwitchToAdmin?.();
      else if (screen === "profile") onSwitchToProfile?.();
      else if (screen === "main") onNavigate?.("main");
    },
    [onNavigate, onSwitchToAdmin, onSwitchToProfile]
  );

  const onRandomRefresh = useCallback(() => {
    if (movies.length <= 1) return;
    const current = currentMovieIndex;

    let next = current;
    let guard = 0;
    while (next === current && guard < 20) {
      next = Math.floor(Math.random() * movies.length);
      guard++;
    }

    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: canUseNativeDriver }),
      Animated.timing(stackAnim, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: canUseNativeDriver }),
    ]).start(() => {
      setCurrentMovieIndex(next);
      x.setValue(0);
      stackAnim.setValue(0);
    });
  }, [currentMovieIndex, movies.length, stackAnim, x]);

  const rotate = x.interpolate({
    inputRange: [-layout.w * 1.2, 0, layout.w * 1.2],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  const frontScale = Animated.add(
    x.interpolate({ inputRange: [-layout.w, 0, layout.w], outputRange: [0.99, 1, 0.99], extrapolate: "clamp" }),
    breathe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.004] })
  );

  const likeGlow = x.interpolate({
    inputRange: [0, layout.w * 0.18, layout.w * 0.42],
    outputRange: [0, 0.6, 1],
    extrapolate: "clamp",
  });

  const nopeGlow = x.interpolate({
    inputRange: [-layout.w * 0.42, -layout.w * 0.18, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  const badgeLikeOpacity = x.interpolate({
    inputRange: [0, layout.w * 0.16, layout.w * 0.35],
    outputRange: [0, 0.7, 1],
    extrapolate: "clamp",
  });

  const badgeNopeOpacity = x.interpolate({
    inputRange: [-layout.w * 0.35, -layout.w * 0.16, 0],
    outputRange: [1, 0.7, 0],
    extrapolate: "clamp",
  });

  const nextScale = stackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.965, 0.992], extrapolate: "clamp" });
  const nextY = stackAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 8], extrapolate: "clamp" });
  const next2Scale = stackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 0.968], extrapolate: "clamp" });
  const next2Y = stackAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 20], extrapolate: "clamp" });

  const progress = useMemo(() => (movies.length ? (currentMovieIndex + 1) / movies.length : 0), [currentMovieIndex, movies.length]);
  const styles = useMemo(() => createStyles(layout), [layout]);

  if (!movies.length) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <PremiumBackground />
        <View style={styles.content}>
          <TopBar showWelcome={showWelcome} email={user?.email} onMenu={() => setMenuOpen(true)} onFaq={() => setFaqOpen(true)} />
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Немає фільмів</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={loadMovies} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>Оновити</Text>
            </TouchableOpacity>
          </View>
        </View>
        <MenuBar currentScreen="main" onNavigate={handleNavigate} user={user} onLogout={handleLogout} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PremiumBackground />

      <View style={styles.content}>
        <TopBar showWelcome={showWelcome} email={user?.email} onMenu={() => setMenuOpen(true)} onFaq={() => setFaqOpen(true)} />

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack} />
          <LinearGradient
            colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0.82)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
          />
          <View style={styles.progressGloss} />
        </View>

        <View style={styles.stage}>
          {!!next2Movie && (
            <Animated.View pointerEvents="none" style={[styles.cardShell, styles.cardBack2, { transform: [{ translateY: next2Y }, { scale: next2Scale }] }]}>
              <CardFrame dim>
                <PosterStage uri={next2Movie.image} chips={next2Movie.genreTags} dim />
              </CardFrame>
            </Animated.View>
          )}

          {!!nextMovie && (
            <Animated.View pointerEvents="none" style={[styles.cardShell, styles.cardBack, { transform: [{ translateY: nextY }, { scale: nextScale }] }]}>
              <CardFrame dim>
                <PosterStage uri={nextMovie.image} chips={nextMovie.genreTags} dim />
              </CardFrame>
            </Animated.View>
          )}

          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.cardShell,
              styles.cardFront,
              { transform: [{ translateX: x }, { rotate }, { scale: frontScale }] },
            ]}
          >
            <CardFrame>
              <Animated.View style={[styles.edgeGlowRight, { opacity: likeGlow }]} />
              <Animated.View style={[styles.edgeGlowLeft, { opacity: nopeGlow }]} />

              <Animated.View style={[styles.badge, styles.badgeLike, { opacity: badgeLikeOpacity }]}>
                <Text style={styles.badgeText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.badge, styles.badgeNope, { opacity: badgeNopeOpacity }]}>
                <Text style={styles.badgeText}>NOPE</Text>
              </Animated.View>

              <PosterStage uri={currentMovie.image} chips={currentMovie.genreTags} />

              <View style={styles.cardInfoWrap}>
                <BlurView intensity={22} tint="dark" style={styles.infoBlur} />
                <LinearGradient
                  colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.02)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.infoBorder}
                />
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {truncate(currentMovie.title, 32)}
                </Text>
                <Text style={styles.movieSubTitle} numberOfLines={1}>
                  {truncate(currentMovie.title, 46)}
                </Text>

                <View style={styles.ratingRow}>
                  <RatingPill left="M" value={`${fmtNum(currentMovie.rating)} (${currentMovie.localVotes ?? "—"})`} />
                  <RatingPill left="TMDB" value={`${fmtNum(currentMovie.tmdb ?? 7.9)} (${currentMovie.tmdbVotes ?? "—"})`} />
                </View>

                <Text style={styles.metaText} numberOfLines={1}>
                  {currentMovie.year} · {currentMovie.director}
                </Text>
              </View>
            </CardFrame>
          </Animated.View>
        </View>

        <View style={styles.actionsRow}>
          <CircleAction icon="↺" tone="muted" onPress={onRandomRefresh} />
          <CircleAction icon="✕" tone="danger" onPress={swipeLeft} />
          <CircleAction icon="✓" tone="ok" onPress={swipeRight} />
        </View>

        <Text style={styles.hint}>{isWeb ? "A/D nebo ← →, R = nahodne" : "Prejed vlevo / vpravo"}</Text>
      </View>

      <MenuBar currentScreen="main" onNavigate={handleNavigate} user={user} onLogout={handleLogout} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </View>
  );
}

function FaqModal({ isOpen, onClose }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 50, duration: 250, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen, fadeAnim, slideAnim]);

  if (!visible) return null;

  const faqItems = [
    {
      question: "Як користуватися додатком?",
      answer:
        "Свайпніть картку фільму вліво, щоб пропустити, або вправо, щоб додати до улюблених. На комп'ютері використовуйте клавіші A/D або стрілки ← →. Натисніть R для випадкового фільму.",
    },
    {
      question: "Як правильно свайпати фільми?",
      answer:
        "На мобільному пристрої: проведіть пальцем вліво або вправо по картці фільму. На комп'ютері: використовуйте клавіші A (ліворуч), D (праворуч) або стрілки клавіатури. Ви також можете використовувати кнопки внизу екрана.",
    },
    {
      question: "Як додати фільм до улюблених?",
      answer:
        "Свайпніть картку фільму вправо або натисніть кнопку з галочкою (✓) внизу екрана. Фільм автоматично збережеться у вашому профілі.",
    },
    {
      question: "Як пропустити фільм?",
      answer:
        "Свайпніть картку фільму вліво або натисніть кнопку з хрестиком (✕) внизу екрана. Фільм буде пропущено і ви побачите наступний.",
    },
    {
      question: "Як переглянути мої улюблені фільми?",
      answer:
        "Відкрийте меню (кнопка з трьома лініями справа вгорі) та перейдіть у розділ 'Profil', щоб побачити всі збережені фільми.",
    },
    {
      question: "Як оновити список фільмів?",
      answer:
        "Список фільмів оновлюється автоматично. Ви також можете натиснути кнопку оновлення (↺) внизу екрана для ручного оновлення.",
    },
    {
      question: "Що таке рейтинг фільму?",
      answer:
        "Кожен фільм має рейтинг на основі оцінок користувачів (M) та даних з TMDB (The Movie Database). Рейтинг відображається на картці фільму.",
    },
    {
      question: "Як вибрати випадковий фільм?",
      answer:
        "Натисніть кнопку оновлення (↺) внизу екрана або клавішу R на клавіатурі, щоб перейти до випадкового фільму зі списку.",
    },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={faqStyles.container} pointerEvents="box-none">
        <Pressable style={faqStyles.overlay} onPress={onClose}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={faqStyles.overlayBg} />
          </Animated.View>
        </Pressable>

        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "100%", alignItems: "center" }}>
          <Animated.View style={[faqStyles.modal, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={20} tint="dark" style={faqStyles.blur}>
              <View style={faqStyles.header}>
                <Text style={faqStyles.title}>Допомога та FAQ</Text>
                <TouchableOpacity onPress={onClose} style={faqStyles.closeBtn} activeOpacity={0.7}>
                  <Text style={faqStyles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={faqStyles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {faqItems.map((item, index) => (
                  <View key={index} style={faqStyles.item}>
                    <Text style={faqStyles.question}>{item.question}</Text>
                    <Text style={faqStyles.answer}>{item.answer}</Text>
                  </View>
                ))}
              </ScrollView>
            </BlurView>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

function PremiumBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient colors={["#07070D", "#07081A", "#05050A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
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

function TopBar({ showWelcome, email, onMenu, onFaq }) {
  return (
    <View style={topStyles.wrap}>
      <TouchableOpacity style={topStyles.leftBtn} onPress={onFaq} activeOpacity={0.9}>
        <View style={topStyles.infoCircle}>
          <Text style={topStyles.infoText}>?</Text>
        </View>
      </TouchableOpacity>

      <View style={topStyles.center}>
        <Text style={topStyles.brand}>Cinevia</Text>
      </View>

      <TouchableOpacity style={topStyles.menuBtn} onPress={onMenu} activeOpacity={0.9}>
        <View style={topStyles.menuIcon}>
          <View style={topStyles.menuLine} />
          <View style={topStyles.menuLine} />
          <View style={topStyles.menuLine} />
        </View>
      </TouchableOpacity>

      {showWelcome && !!email && (
        <View style={topStyles.welcomeWrap}>
          <Text style={topStyles.welcome} numberOfLines={1}>
            {email}
          </Text>
        </View>
      )}
    </View>
  );
}

function CardFrame({ children, dim = false }) {
  return (
    <View style={[frameStyles.shell, dim && { opacity: 0.78 }]}>
      <LinearGradient colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={frameStyles.stroke} />
      <View style={frameStyles.inner}>{children}</View>
    </View>
  );
}

function PosterStage({ uri, chips = [], dim = false }) {
  return (
    <View style={posterStyles.wrap}>
      <View style={[posterStyles.poster, dim && { opacity: 0.9 }]}>
        <Image source={{ uri }} style={posterStyles.img} resizeMode="contain" fadeDuration={180} progressiveRenderingEnabled />
        <LinearGradient colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.52)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={posterStyles.shade} />
        <View style={posterStyles.chipsRow}>
          {chips.slice(0, 2).map((t, idx) => (
            <Chip key={`${t}-${idx}`} text={t} />
          ))}
        </View>
        <View style={posterStyles.playBubble}>
          <Text style={posterStyles.playTxt}>▶</Text>
        </View>
      </View>
    </View>
  );
}

function Chip({ text }) {
  return (
    <View style={chipStyles.wrap}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.02)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={chipStyles.stroke} />
      <Text style={chipStyles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function RatingPill({ left, value }) {
  return (
    <View style={ratingStyles.wrap}>
      <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={ratingStyles.left}>
        <Text style={ratingStyles.leftText}>{left}</Text>
      </View>
      <Text style={ratingStyles.value}>{value}</Text>
      <Text style={ratingStyles.star}>★</Text>
    </View>
  );
}

function CircleAction({ icon, tone = "muted", onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        actionStyles.btn,
        tone === "muted" && actionStyles.muted,
        tone === "danger" && actionStyles.danger,
        tone === "ok" && actionStyles.ok,
      ]}
    >
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
      <Text style={actionStyles.icon}>{icon}</Text>
    </TouchableOpacity>
  );
}

const createStyles = ({ w, desktop, tablet, cardW, cardH }) => {
  const R = desktop ? 30 : tablet ? 28 : 24;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#05060A", flexDirection: desktop ? "row" : "column" },
    content: { flex: 1, paddingTop: desktop ? 18 : 10, paddingHorizontal: desktop ? 22 : 14 },

    progressWrap: {
      marginTop: 10,
      height: 7,
      borderRadius: 999,
      overflow: "hidden",
      alignSelf: "center",
      width: "92%",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
    },
    progressTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
    progressFill: { height: "100%", borderRadius: 999 },
    progressGloss: { position: "absolute", top: 1, left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.15)", opacity: 0.7 },

    stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 12 },

    cardShell: { width: cardW, height: cardH, borderRadius: R, ...(isWeb && { userSelect: "none", cursor: "grab" }) },
    cardBack2: { position: "absolute", opacity: 0.55 },
    cardBack: { position: "absolute", opacity: 0.72 },
    cardFront: {},

    edgeGlowRight: { position: "absolute", right: -90, top: -90, bottom: -90, width: 190, backgroundColor: "rgba(35, 220, 150, 0.22)", transform: [{ rotate: "10deg" }] },
    edgeGlowLeft: { position: "absolute", left: -90, top: -90, bottom: -90, width: 190, backgroundColor: "rgba(255, 60, 140, 0.18)", transform: [{ rotate: "-10deg" }] },

    badge: { position: "absolute", top: 18, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, overflow: "hidden", borderWidth: 1, zIndex: 20 },
    badgeLike: { right: 18, backgroundColor: "rgba(35, 220, 150, 0.14)", borderColor: "rgba(35, 220, 150, 0.45)" },
    badgeNope: { left: 18, backgroundColor: "rgba(255, 60, 140, 0.14)", borderColor: "rgba(255, 60, 140, 0.45)" },
    badgeText: { color: soft(0.95), fontWeight: "900", letterSpacing: 1.2, fontSize: 12 },

    cardInfoWrap: { position: "absolute", left: 14, right: 14, bottom: 14, borderRadius: 22, overflow: "hidden", paddingHorizontal: 14, paddingVertical: 12 },
    infoBlur: { ...StyleSheet.absoluteFillObject, opacity: 0.98 },
    infoBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", opacity: 0.85 },

    movieTitle: { color: soft(0.97), fontSize: desktop ? 28 : 24, fontWeight: "900", letterSpacing: 0.2 },
    movieSubTitle: { marginTop: 6, color: soft(0.70), fontSize: 14, fontWeight: "650" },

    ratingRow: { marginTop: 10, flexDirection: "row", gap: 12, flexWrap: "wrap", alignItems: "center" },
    metaText: { marginTop: 10, color: soft(0.62), fontSize: 14, fontWeight: "700" },

    actionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 10, paddingTop: 6 },
    hint: { textAlign: "center", paddingBottom: desktop ? 14 : 10, color: soft(0.45), fontWeight: "650", fontSize: 12 },

    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    emptyTitle: { color: soft(0.92), fontSize: 22, fontWeight: "900" },
    primaryBtn: { marginTop: 6, height: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    primaryBtnText: { color: soft(0.92), fontWeight: "900" },
  });
};

const bgStyles = StyleSheet.create({
  glow: { position: "absolute", width: 420, height: 420, borderRadius: 999 },
  glowTop: { top: -170, left: -140, backgroundColor: "rgba(165, 120, 255, 0.20)" },
  glowRight: { top: 110, right: -200, backgroundColor: "rgba(80, 210, 255, 0.14)" },
  glowBottom: { bottom: -210, left: 40, backgroundColor: "rgba(255, 70, 170, 0.12)" },
  noise: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.03)", opacity: 0.18 },
});

const topStyles = StyleSheet.create({
  wrap: { paddingTop: 6, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  menuBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: { height: 16, justifyContent: "space-between" },
  menuLine: { width: 24, height: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.75)" },

  center: { alignItems: "center", justifyContent: "center" },
  brand: { color: soft(0.95), fontWeight: "900", fontSize: 18, letterSpacing: 0.2 },

  leftBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCircle: { width: 28, height: 28, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" },
  infoText: { color: soft(0.88), fontWeight: "900", fontSize: 14, marginTop: -1 },

  welcomeWrap: { position: "absolute", left: 0, right: 0, bottom: -16, alignItems: "center" },
  welcome: { color: soft(0.45), fontWeight: "650", fontSize: 12, maxWidth: "70%" },
});

const frameStyles = StyleSheet.create({
  shell: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 14,
  },
  stroke: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  inner: { flex: 1, borderRadius: 28, overflow: "hidden" },
});

const posterStyles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 10 },
  poster: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 112,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  shade: { ...StyleSheet.absoluteFillObject },
  chipsRow: { position: "absolute", left: 12, top: 12, flexDirection: "row", gap: 10 },
  playBubble: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  playTxt: { color: soft(0.92), fontWeight: "900", fontSize: 16 },
});

const chipStyles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.30)",
    maxWidth: 160,
  },
  stroke: { ...StyleSheet.absoluteFillObject, opacity: 0.9 },
  text: { color: soft(0.90), fontWeight: "800", fontSize: 13 },
});

const ratingStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  left: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  leftText: { color: soft(0.86), fontWeight: "900", fontSize: 12, letterSpacing: 0.2 },
  value: { color: soft(0.88), fontWeight: "800", fontSize: 13 },
  star: { color: "rgba(255,215,0,0.92)", fontWeight: "900", fontSize: 12 },
});

const actionStyles = StyleSheet.create({
  btn: { width: 60, height: 60, borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  icon: { color: soft(0.92), fontWeight: "900", fontSize: 22, marginTop: -1 },
  muted: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.10)" },
  danger: { backgroundColor: "rgba(255, 60, 140, 0.12)", borderColor: "rgba(255, 60, 140, 0.55)" },
  ok: { backgroundColor: "rgba(35, 220, 150, 0.12)", borderColor: "rgba(35, 220, 150, 0.55)" },
});

const faqStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.75)" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, zIndex: 1 },
  modal: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "80%",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  blur: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10, 10, 12, 0.95)" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  title: { color: soft(0.95), fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  closeText: { color: soft(0.9), fontSize: 24, fontWeight: "300", lineHeight: 24 },
  content: { padding: 20 },
  item: { marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.05)" },
  question: { color: soft(0.95), fontSize: 16, fontWeight: "800", marginBottom: 10, letterSpacing: 0.2 },
  answer: { color: soft(0.7), fontSize: 14, fontWeight: "600", lineHeight: 20 },
});

function truncate(s, max) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  const s = String(n);
  return s.length > 4 ? Number(n).toFixed(1) : s;
}