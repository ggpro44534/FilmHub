import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from '../lib/auth';
import { getMovieDetails, addMovie, getMovies, deleteMovie, deleteAllMovies } from '../lib/movies';
import MenuBar from './MenuBar';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768;

const AdminScreen = ({ user, onLogout, onSwitchToMain, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [editedMovie, setEditedMovie] = useState(null);
  const [tmdbId, setTmdbId] = useState(null);
  const [movies, setMovies] = useState([]);
  const [menuOpen, setMenuOpen] = useState(Platform.OS === 'web' && width > 768);
  const isWebDesktop = Platform.OS === 'web' && width > 768;

  useEffect(() => {
    loadMovies();
    // Видалити всі фільми при першому завантаженні (один раз)
    const deleteMoviesOnce = async () => {
      try {
        const hasDeleted = await AsyncStorage.getItem('movies_deleted_once');
        if (!hasDeleted) {
          await deleteAllMovies();
          await AsyncStorage.setItem('movies_deleted_once', 'true');
          await loadMovies();
        }
      } catch (error) {
        console.error('Error deleting movies once:', error);
      }
    };
    deleteMoviesOnce();
  }, []);

  const handleDeleteAllMovies = async () => {
    Alert.alert(
      'Potvrdit smazání',
      'Opravdu chcete smazat všechny filmy? Tato akce je nevratná.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat vše',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAllMovies();
              if (result.success) {
                Alert.alert('Úspěch', 'Všechny filmy byly smazány');
                await loadMovies();
              } else {
                Alert.alert('Chyba', result.error || 'Nepodařilo se smazat filmy');
              }
            } catch (error) {
              console.error('Error deleting all movies:', error);
              Alert.alert('Chyba', 'Nepodařilo se smazat filmy');
            }
          },
        },
      ]
    );
  };

  const loadMovies = async () => {
    const allMovies = await getMovies();
    setMovies(allMovies);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Chyba', 'Prosím, zadejte TMDB ID filmu');
      return;
    }

    const movieId = parseInt(searchQuery.trim());
    if (isNaN(movieId) || movieId <= 0) {
      Alert.alert('Chyba', 'Prosím, zadejte platné TMDB ID (číslo)');
      return;
    }

    setLoading(true);
    setSearchResult(null);
    
    try {
      const movie = await getMovieDetails(movieId);
      if (movie) {
        setSearchResult(movie);
        setTmdbId(movieId);
        setEditedMovie({
          title: movie.title || '',
          year: movie.year?.toString() || '',
          rating: movie.rating || '',
          genre: movie.genre || '',
          director: movie.director || '',
          description: movie.description || '',
          image: movie.image || '',
          trailerUrl: '',
        });
      } else {
        Alert.alert('Chyba', 'Film nebyl nalezen');
      }
    } catch (error) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se načíst film');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovie = async () => {
    if (!editedMovie) return;

    if (!editedMovie.title.trim()) {
      Alert.alert('Chyba', 'Prosím, zadejte název filmu');
      return;
    }

    // Валідація YouTube посилання
    let trailerUrl = editedMovie.trailerUrl?.trim() || '';
    if (trailerUrl) {
      // Перевіряємо, чи це валідне YouTube посилання
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
      if (!youtubeRegex.test(trailerUrl)) {
        Alert.alert('Chyba', 'Prosím, zadejte platné YouTube odkaz (např. https://www.youtube.com/watch?v=...)');
        return;
      }
    }

    const movieToAdd = {
      title: editedMovie.title.trim(),
      year: parseInt(editedMovie.year) || new Date().getFullYear(),
      rating: parseFloat(editedMovie.rating) || 0,
      genre: editedMovie.genre.trim() || 'Neznámý',
      director: editedMovie.director.trim() || 'Neznámý',
      description: editedMovie.description.trim() || '',
      image: editedMovie.image.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      tmdbId: tmdbId || null,
      trailerUrl: trailerUrl || null,
    };

    try {
      const result = await addMovie(movieToAdd);
      if (result.success) {
        Alert.alert('Úspěch', 'Film byl úspěšně přidán');
        setSearchResult(null);
        setEditedMovie(null);
        setTmdbId(null);
        setSearchQuery('');
        await loadMovies();
      } else {
        Alert.alert('Chyba', result.error || 'Nepodařilo se přidat film');
      }
    } catch (error) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se přidat film');
    }
  };

  const handleDeleteMovie = async (movieId) => {
    Alert.alert(
      'Potvrdit smazání',
      'Opravdu chcete smazat tento film?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteMovie(movieId);
            if (result.success) {
              Alert.alert('Úspěch', 'Film byl smazán');
              await loadMovies();
            } else {
              Alert.alert('Chyba', result.error || 'Nepodařilo se smazat film');
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
    } else if (screen === 'profile') {
      onNavigate('profile');
    }
  };

  return (
    <View style={styles.container}>
      <MenuBar
        currentScreen="admin"
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
          <Text style={styles.title}>Admin Panel</Text>
        </View>

        <ScrollView style={styles.content}>
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Přidat nový film</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Zadejte TMDB ID filmu"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.searchButton, loading && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Vyhledat</Text>
              )}
            </TouchableOpacity>
          </View>

          {editedMovie && (
            <View style={styles.editForm}>
              <Text style={styles.formTitle}>Upravit informace o filmu</Text>
              
              <View style={styles.posterContainer}>
                <Image
                  source={{ uri: editedMovie.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80' }}
                  style={styles.editPoster}
                />
              </View>

              <Text style={styles.inputLabel}>Název filmu *</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Název filmu"
                placeholderTextColor="#999"
                value={editedMovie.title}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, title: text })}
              />

              <Text style={styles.inputLabel}>Rok</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Rok"
                placeholderTextColor="#999"
                value={editedMovie.year}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, year: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Hodnocení</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Hodnocení (0-10)"
                placeholderTextColor="#999"
                value={editedMovie.rating}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, rating: text })}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Žánr</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Žánr"
                placeholderTextColor="#999"
                value={editedMovie.genre}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, genre: text })}
              />

              <Text style={styles.inputLabel}>Režisér</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Režisér"
                placeholderTextColor="#999"
                value={editedMovie.director}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, director: text })}
              />

              <Text style={styles.inputLabel}>Popis</Text>
              <TextInput
                style={[styles.editInput, styles.textArea]}
                placeholder="Popis filmu"
                placeholderTextColor="#999"
                value={editedMovie.description}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, description: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>URL obrázku</Text>
              <TextInput
                style={styles.editInput}
                placeholder="URL obrázku"
                placeholderTextColor="#999"
                value={editedMovie.image}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, image: text })}
              />

              <Text style={styles.inputLabel}>Odkaz na trailer (YouTube)</Text>
              <TextInput
                style={styles.editInput}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor="#999"
                value={editedMovie.trailerUrl || ''}
                onChangeText={(text) => setEditedMovie({ ...editedMovie, trailerUrl: text })}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helpText}>
                Můžete přidat odkaz na YouTube trailer. Pokud není zadán, bude použit trailer z TMDB (pokud je k dispozici).
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddMovie}
              >
                <Text style={styles.addButtonText}>Přidat film</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.moviesSection}>
          <View style={styles.moviesSectionHeader}>
            <Text style={styles.sectionTitle}>Přidané filmy ({movies.length})</Text>
            {movies.length > 0 && (
              <TouchableOpacity
                style={styles.deleteAllButton}
                onPress={handleDeleteAllMovies}
              >
                <Text style={styles.deleteAllButtonText}>Smazat vše</Text>
              </TouchableOpacity>
            )}
          </View>
          {movies.length === 0 ? (
            <Text style={styles.emptyText}>Žádné filmy</Text>
          ) : (
            movies.map((movie) => (
              <View key={movie.id} style={styles.movieItem}>
                <Image
                  source={{ uri: movie.image }}
                  style={styles.movieItemPoster}
                />
                <View style={styles.movieItemInfo}>
                  <Text style={styles.movieItemTitle}>{movie.title}</Text>
                  <Text style={styles.movieItemYear}>{movie.year}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteMovie(movie.id)}
                >
                  <Text style={styles.deleteButtonText}>Smazat</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  searchSection: {
    marginBottom: isDesktop ? 40 : isTablet ? 35 : 30,
  },
  sectionTitle: {
    fontSize: isDesktop ? 26 : isTablet ? 23 : 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 20 : isTablet ? 18 : 15,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: isDesktop ? 25 : isTablet ? 22 : 20,
    gap: isDesktop ? 15 : isTablet ? 12 : 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    padding: isDesktop ? 18 : isTablet ? 16 : 15,
    color: '#fff',
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
  },
  searchButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: isDesktop ? 30 : isTablet ? 25 : 20,
    paddingVertical: isDesktop ? 18 : isTablet ? 16 : 15,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  editForm: {
    backgroundColor: '#1a1a1a',
    borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
    padding: isDesktop ? 30 : isTablet ? 25 : 20,
    marginTop: isDesktop ? 15 : isTablet ? 12 : 10,
  },
  formTitle: {
    fontSize: isDesktop ? 24 : isTablet ? 21 : 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 25 : isTablet ? 22 : 20,
    textAlign: 'center',
  },
  posterContainer: {
    alignItems: 'center',
    marginBottom: isDesktop ? 25 : isTablet ? 22 : 20,
  },
  editPoster: {
    width: isDesktop ? 180 : isTablet ? 165 : 150,
    height: isDesktop ? 270 : isTablet ? 247 : 225,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
  },
  inputLabel: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: isDesktop ? 10 : isTablet ? 9 : 8,
    marginTop: isDesktop ? 18 : isTablet ? 16 : 15,
  },
  editInput: {
    backgroundColor: '#333',
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    padding: isDesktop ? 15 : isTablet ? 13 : 12,
    color: '#fff',
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    marginBottom: isDesktop ? 8 : isTablet ? 6 : 5,
  },
  textArea: {
    height: isDesktop ? 120 : isTablet ? 110 : 100,
    paddingTop: isDesktop ? 15 : isTablet ? 13 : 12,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: isDesktop ? 15 : isTablet ? 12 : 10,
    paddingHorizontal: isDesktop ? 30 : isTablet ? 25 : 20,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
  },
  moviesSection: {
    marginTop: isDesktop ? 30 : isTablet ? 25 : 20,
  },
  moviesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isDesktop ? 20 : isTablet ? 18 : 15,
  },
  deleteAllButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: isDesktop ? 20 : isTablet ? 18 : 15,
    paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: isDesktop ? 30 : isTablet ? 25 : 20,
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
  },
  movieItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
    padding: isDesktop ? 20 : isTablet ? 18 : 15,
    marginBottom: isDesktop ? 20 : isTablet ? 18 : 15,
    alignItems: 'center',
  },
  movieItemPoster: {
    width: isDesktop ? 80 : isTablet ? 70 : 60,
    height: isDesktop ? 120 : isTablet ? 105 : 90,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
    marginRight: isDesktop ? 20 : isTablet ? 18 : 15,
  },
  movieItemInfo: {
    flex: 1,
  },
  movieItemTitle: {
    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isDesktop ? 8 : isTablet ? 6 : 5,
  },
  movieItemYear: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    color: '#ccc',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: isDesktop ? 20 : isTablet ? 18 : 15,
    paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
    borderRadius: isDesktop ? 10 : isTablet ? 9 : 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
  },
  helpText: {
    fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
    color: '#999',
    marginTop: isDesktop ? 8 : isTablet ? 6 : 5,
    marginBottom: isDesktop ? 15 : isTablet ? 12 : 10,
    fontStyle: 'italic',
  },
  });
};

const styles = createStyles();

export default AdminScreen;

