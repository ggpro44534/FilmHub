import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { signOut } from '../lib/auth';
import { getFavorites, removeFavorite } from '../lib/favorites';
import { getMovieTrailer, getMovieTrailerFromDb } from '../lib/movies';
import MenuBar from './MenuBar';

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    const WebViewModule = require('react-native-webview');
    WebView = WebViewModule.WebView || WebViewModule.default;
  } catch (e) {
    console.warn('WebView not available:', e);
  }
}

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768;

const ProfileScreen = ({ user, onLogout, onSwitchToMain, onNavigate }) => {
  const [favorites, setFavorites] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(Platform.OS === 'web' && width > 768);
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  };

  const handleMoviePress = (movie) => {
    setSelectedMovie(movie);
  };

  const convertToEmbedUrl = (url) => {
    if (!url) return null;
    
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
    }
    
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      return `https://www.youtube.com/embed/${embedMatch[1]}?autoplay=1&rel=0`;
    }
    
    return null;
  };

  const handleWatchTrailer = async (movie) => {
    setLoadingTrailer(true);
    try {
      let trailer = null;
      if (movie.id) {
        trailer = await getMovieTrailerFromDb(movie.id);
      }

      if (!trailer || !trailer.url) {
        const tmdbId = movie.tmdbId || movie.tmdb_id;
        if (tmdbId) {
          try {
            trailer = await getMovieTrailer(tmdbId);
          } catch (error) {
            console.log('TMDB trailer not found, trying saved URL');
          }
        }
      }

      if (trailer && trailer.url) {
        const embedUrl = convertToEmbedUrl(trailer.url);
        if (embedUrl) {
          setTrailerUrl(embedUrl);
          setShowTrailer(true);
        } else {
          Alert.alert('Chyba', 'Nelze přehrát trailer. Neplatný formát URL.');
        }
      } else {
        Alert.alert(
          'Trailer není k dispozici', 
          'Pro tento film nebyl nalezen žádný trailer. Můžete přidat odkaz na trailer v admin panelu.'
        );
      }
    } catch (error) {
      const errorMessage = error.message || 'Nepodařilo se načíst trailer';
      Alert.alert('Chyba', errorMessage);
      console.error('Trailer error:', error);
    } finally {
      setLoadingTrailer(false);
    }
  };

  const handleRemoveFavorite = async (movieId) => {
    Alert.alert(
      'Odstranit z oblíbených',
      'Opravdu chcete odstranit tento film z oblíbených?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odstranit',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFavorite(movieId);
            if (result.success) {
              await loadFavorites();
              if (selectedMovie?.id === movieId) {
                setSelectedMovie(null);
              }
            }
          },
        },
      ]
    );
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

  const handleNavigate = (screen) => {
    if (screen === 'main') {
      onSwitchToMain();
    } else if (screen === 'admin') {
      onNavigate('admin');
    }
  };

  return (
    <View style={styles.container}>
      <MenuBar
        currentScreen="profile"
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <View style={styles.contentWrapper}>
        {!isWebDesktop && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuOpen(true)}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
        )}
        <View style={styles.header}>
          <Text style={styles.title}>Můj Profil</Text>
        </View>

        <ScrollView style={styles.content}>
        <View style={styles.profileInfo}>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.favoritesCount}>
            Oblíbené filmy: {favorites.length}
          </Text>
        </View>

        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Zatím nemáte žádné oblíbené filmy
            </Text>
            <Text style={styles.emptySubtext}>
              Přejeďte film doprava pro přidání do oblíbených
            </Text>
          </View>
        ) : (
          <View style={styles.moviesList}>
            {favorites.map((movie) => (
              <TouchableOpacity
                key={movie.id}
                style={styles.movieCard}
                onPress={() => handleMoviePress(movie)}
              >
                <Image
                  source={{ uri: movie.image }}
                  style={styles.moviePoster}
                />
                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle}>{movie.title}</Text>
                  <Text style={styles.movieYear}>{movie.year}</Text>
                  <Text style={styles.movieRating}>⭐ {movie.rating}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFavorite(movie.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedMovie && (
        <Modal
          visible={!!selectedMovie}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedMovie(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMovie.title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedMovie(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Image
                source={{ uri: selectedMovie.image }}
                style={styles.modalPoster}
              />

              <View style={styles.modalInfo}>
                <Text style={styles.modalYear}>Rok: {selectedMovie.year}</Text>
                <Text style={styles.modalGenre}>Žánr: {selectedMovie.genre}</Text>
                <Text style={styles.modalDirector}>
                  Režisér: {selectedMovie.director}
                </Text>
                <Text style={styles.modalRating}>
                  Hodnocení: ⭐ {selectedMovie.rating}
                </Text>

                {selectedMovie.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionTitle}>Popis:</Text>
                    <Text style={styles.descriptionText}>
                      {selectedMovie.description}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.trailerButton,
                    loadingTrailer && styles.buttonDisabled,
                  ]}
                  onPress={() => handleWatchTrailer(selectedMovie)}
                  disabled={loadingTrailer}
                >
                  {loadingTrailer ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.trailerButtonText}>
                      ▶ Přehrát trailer
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {showTrailer && trailerUrl && (
        <Modal
          visible={showTrailer}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowTrailer(false);
            setTrailerUrl(null);
          }}
        >
          <View style={styles.trailerModalContainer}>
            <View style={styles.trailerModalHeader}>
              <Text style={styles.trailerModalTitle}>Trailer</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowTrailer(false);
                  setTrailerUrl(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'web' || !WebView ? (
              <View style={styles.webview}>
                <View style={styles.webviewLoading}>
                  <Text style={styles.webviewLoadingText}>Otevírání trailera v novém okně...</Text>
                  <TouchableOpacity
                    style={styles.openTrailerButton}
                    onPress={async () => {
                      let originalUrl = trailerUrl;
                      if (trailerUrl.includes('/embed/')) {
                        const videoId = trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];
                        if (videoId) {
                          originalUrl = `https://www.youtube.com/watch?v=${videoId}`;
                        }
                      }
                      await Linking.openURL(originalUrl);
                    }}
                  >
                    <Text style={styles.openTrailerButtonText}>Otevřít trailer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <WebView
                source={{ uri: trailerUrl }}
                style={styles.webview}
                allowsFullscreenVideo={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webviewLoading}>
                    <ActivityIndicator size="large" color="#e50914" />
                    <Text style={styles.webviewLoadingText}>Načítání trailera...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error: ', nativeEvent);
                  Alert.alert('Chyba', 'Nepodařilo se načíst trailer. Zkusíme otevřít v externím prohlížeči.');
                  const originalUrl = trailerUrl.replace('/embed/', '/watch?v=').replace('?autoplay=1&rel=0', '');
                  Linking.openURL(originalUrl);
                }}
              />
            )}
          </View>
        </Modal>
      )}
      </View>
    </View>
  );
};

const createStyles = () => {
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    flexDirection: isDesktop ? 'row' : 'column',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? (isDesktop ? 30 : 20) : 50,
    left: isDesktop ? 30 : isTablet ? 25 : 20,
    zIndex: 1000,
    width: isDesktop ? 50 : isTablet ? 45 : 40,
    height: isDesktop ? 50 : isTablet ? 45 : 40,
    backgroundColor: '#e50914',
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && width >= 768 && { display: 'none' }),
  },
  menuButtonText: {
    color: '#fff',
    fontSize: isDesktop ? 24 : isTablet ? 22 : 20,
    fontWeight: 'bold',
  },
  header: {
    paddingTop: isDesktop ? 80 : isTablet ? 70 : 60,
    paddingHorizontal: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingBottom: isDesktop ? 25 : isTablet ? 22 : 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: isDesktop ? 32 : isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  profileInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
    marginBottom: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  email: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 15 : isTablet ? 12 : 10,
  },
  favoritesCount: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    color: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  moviesList: {
    gap: isDesktop ? 20 : isTablet ? 18 : 15,
  },
  movieCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
    padding: isDesktop ? 20 : isTablet ? 18 : 15,
    alignItems: 'center',
  },
  moviePoster: {
    width: isDesktop ? 100 : isTablet ? 90 : 80,
    height: isDesktop ? 150 : isTablet ? 135 : 120,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    marginRight: isDesktop ? 20 : isTablet ? 18 : 15,
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 8 : isTablet ? 6 : 5,
  },
  movieYear: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    color: '#ccc',
    marginBottom: isDesktop ? 8 : isTablet ? 6 : 5,
  },
  movieRating: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    color: '#ffd700',
  },
  removeButton: {
    backgroundColor: '#f44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingTop: isDesktop ? 80 : isTablet ? 70 : 60,
    backgroundColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: isDesktop ? 45 : isTablet ? 40 : 35,
    height: isDesktop ? 45 : isTablet ? 40 : 35,
    borderRadius: isDesktop ? 22.5 : isTablet ? 20 : 17.5,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: isDesktop ? 24 : isTablet ? 22 : 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  modalPoster: {
    width: '100%',
    height: isDesktop ? 500 : isTablet ? 450 : 400,
    borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
    marginBottom: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  modalInfo: {
    gap: isDesktop ? 20 : isTablet ? 18 : 15,
  },
  modalYear: {
    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
    color: '#fff',
  },
  modalGenre: {
    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
    color: '#fff',
  },
  modalDirector: {
    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
    color: '#fff',
  },
  modalRating: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    color: '#ffd700',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginTop: 10,
  },
  descriptionTitle: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 15 : isTablet ? 12 : 10,
  },
  descriptionText: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    color: '#ccc',
    lineHeight: isDesktop ? 28 : isTablet ? 26 : 24,
  },
  trailerButton: {
    backgroundColor: '#e50914',
    paddingVertical: isDesktop ? 18 : isTablet ? 16 : 15,
    paddingHorizontal: isDesktop ? 40 : isTablet ? 35 : 30,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    alignItems: 'center',
    marginTop: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  trailerButtonText: {
    color: '#fff',
    fontSize: isDesktop ? 20 : isTablet ? 19 : 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  trailerModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  trailerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingTop: isDesktop ? 80 : isTablet ? 70 : 60,
    backgroundColor: '#1a1a1a',
  },
  trailerModalTitle: {
    fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  openTrailerButton: {
    backgroundColor: '#e50914',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  openTrailerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  webviewLoadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
  },
  });
};

const styles = createStyles();

export default ProfileScreen;

