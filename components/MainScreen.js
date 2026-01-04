import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ImageBackground,
  Platform,
} from 'react-native';
import { signOut } from '../lib/auth';
import { getMovies } from '../lib/movies';
import { addFavorite } from '../lib/favorites';
import MenuBar from './MenuBar';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

// Функція для отримання адаптивних значень
const getResponsiveValue = (mobile, tablet, desktop) => {
  if (width >= 1024) return desktop;
  if (width >= 768) return tablet;
  return mobile;
};

const defaultMovies = [
  {
    id: '1',
    title: 'Inception',
    year: 2010,
    rating: 8.8,
    genre: 'Sci-Fi, Action',
    director: 'Christopher Nolan',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  },
  {
    id: '2',
    title: 'The Dark Knight',
    year: 2008,
    rating: 9.0,
    genre: 'Action, Crime',
    director: 'Christopher Nolan',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  },
];

const MainScreen = ({ user, onLogout, onSwitchToAdmin, onSwitchToProfile, onNavigate }) => {
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [movies, setMovies] = useState(defaultMovies);
  const [showWelcome, setShowWelcome] = useState(true);
  const [menuOpen, setMenuOpen] = useState(Platform.OS === 'web' && width > 768);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadMovies();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadMovies = async () => {
    try {
      const savedMovies = await getMovies();
      if (savedMovies && savedMovies.length > 0) {
        setMovies(savedMovies);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        swipeRight();
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        swipeLeft();
      } else {
        resetPosition();
      }
    },
  });

  const swipeRight = async () => {
    const currentMovie = movies[currentMovieIndex];
    if (currentMovie) {
      await addFavorite(currentMovie);
    }
    
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentMovieIndex((prev) => (prev + 1) % movies.length);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentMovieIndex((prev) => (prev + 1) % movies.length);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const currentMovie = movies[currentMovieIndex];

  const rotate = position.x.interpolate({
    inputRange: [-width * 1.5, 0, width * 1.5],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
  });

  const dislikeOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
  });

  const handleNavigate = (screen) => {
    if (screen === 'admin') {
      onSwitchToAdmin();
    } else if (screen === 'profile') {
      onSwitchToProfile();
    } else if (screen === 'main') {
      // Already on main
    }
  };

  if (movies.length === 0) {
    return (
      <View style={styles.container}>
        <MenuBar
          currentScreen="main"
          onNavigate={handleNavigate}
          user={user}
          onLogout={handleLogout}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuOpen(true)}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          {showWelcome && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Vítejte, {user?.email}!</Text>
            </View>
          )}
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Žádné filmy k zobrazení</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MenuBar
        currentScreen="main"
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuOpen(true)}
        >
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
        {showWelcome && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Vítejte, {user?.email}!</Text>
          </View>
        )}

      <View style={styles.movieContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.movieCard,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
        >
          <ImageBackground
            source={{ uri: currentMovie.image }}
            style={styles.movieImage}
            imageStyle={styles.movieImageStyle}
          >
            <View style={styles.movieOverlay}>
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle}>{currentMovie.title}</Text>
                <Text style={styles.movieYear}>{currentMovie.year}</Text>
                <Text style={styles.movieGenre}>{currentMovie.genre}</Text>
                <Text style={styles.movieDirector}>Režisér: {currentMovie.director}</Text>
                <Text style={styles.movieRating}>⭐ {currentMovie.rating}</Text>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        <Animated.View style={[styles.likeIndicator, { opacity: likeOpacity }]}>
          <Text style={styles.likeText}>👍 LIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.dislikeIndicator, { opacity: dislikeOpacity }]}>
          <Text style={styles.dislikeText}>👎 PŘESKOČIT</Text>
        </Animated.View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Přejeďte doleva nebo doprava pro navigaci
        </Text>
        <Text style={styles.movieCounter}>
          {currentMovieIndex + 1} z {movies.length}
        </Text>
      </View>
      </View>
    </View>
  );
};

// Створюємо стилі з урахуванням розміру екрану
const createStyles = () => {
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    flexDirection: isDesktop ? 'row' : 'column',
  },
  content: {
    flex: 1,
    backgroundColor: '#000',
    maxWidth: isDesktop ? 'none' : '100%',
  },
  welcomeContainer: {
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingTop: isDesktop ? 80 : isTablet ? 70 : 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  welcomeText: {
    color: '#fff',
    fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isDesktop ? 40 : isTablet ? 30 : 20,
  },
  emptyText: {
    color: '#999',
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
  },
  movieContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isDesktop ? 40 : isTablet ? 30 : 20,
  },
  movieCard: {
    width: isDesktop ? Math.min(width * 0.5, 600) : isTablet ? width - 60 : width - 40,
    height: isDesktop ? Math.min(height * 0.7, 800) : isTablet ? height * 0.65 : height * 0.6,
    maxWidth: isDesktop ? 600 : width - 40,
    borderRadius: isDesktop ? 24 : isTablet ? 22 : 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: isDesktop ? 15 : isTablet ? 12 : 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: isDesktop ? 30 : isTablet ? 25 : 20,
    elevation: 10,
  },
  movieImage: {
    flex: 1,
  },
  movieImageStyle: {
    borderRadius: 20,
  },
  movieOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  movieInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: isDesktop ? 20 : isTablet ? 18 : 15,
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  movieTitle: {
    fontSize: isDesktop ? 36 : isTablet ? 32 : 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
  },
  movieYear: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    color: '#ccc',
    marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
  },
  movieGenre: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    color: '#ffd700',
    marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
  },
  movieDirector: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    color: '#999',
    marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
  },
  movieRating: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    color: '#ffd700',
    fontWeight: 'bold',
  },
  likeIndicator: {
    position: 'absolute',
    top: '50%',
    right: isDesktop ? 80 : isTablet ? 60 : 50,
    transform: [{ translateY: -25 }],
    backgroundColor: '#4CAF50',
    paddingHorizontal: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingVertical: isDesktop ? 15 : isTablet ? 12 : 10,
    borderRadius: isDesktop ? 15 : isTablet ? 12 : 10,
    borderWidth: isDesktop ? 4 : isTablet ? 3.5 : 3,
    borderColor: '#fff',
  },
  likeText: {
    color: '#fff',
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  dislikeIndicator: {
    position: 'absolute',
    top: '50%',
    left: isDesktop ? 80 : isTablet ? 60 : 50,
    transform: [{ translateY: -25 }],
    backgroundColor: '#f44336',
    paddingHorizontal: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingVertical: isDesktop ? 15 : isTablet ? 12 : 10,
    borderRadius: isDesktop ? 15 : isTablet ? 12 : 10,
    borderWidth: isDesktop ? 4 : isTablet ? 3.5 : 3,
    borderColor: '#fff',
  },
  dislikeText: {
    color: '#fff',
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  instructions: {
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#999',
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    textAlign: 'center',
    marginBottom: isDesktop ? 15 : isTablet ? 12 : 10,
  },
  movieCounter: {
    color: '#666',
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
  },
  menuButton: {
    position: 'absolute',
    top: isDesktop ? 30 : isTablet ? 25 : 20,
    left: isDesktop ? 30 : isTablet ? 25 : 20,
    zIndex: 1000,
    width: isDesktop ? 60 : isTablet ? 55 : 50,
    height: isDesktop ? 60 : isTablet ? 55 : 50,
    borderRadius: isDesktop ? 30 : isTablet ? 27.5 : 25,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    ...(isDesktop && Platform.OS === 'web' && {
      display: 'none', // На десктопі веб меню завжди відкрите
    }),
  },
  menuButtonText: {
    color: '#fff',
    fontSize: isDesktop ? 28 : isTablet ? 26 : 24,
    fontWeight: 'bold',
  },
  });
};

const styles = createStyles();

export default MainScreen;
