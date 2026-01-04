import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { initDatabase } from './lib/database';
import { getSession, signOut } from './lib/auth';
import AuthScreen from './components/AuthScreen';
import MainScreen from './components/MainScreen';
import AdminScreen from './components/AdminScreen';
import ProfileScreen from './components/ProfileScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('main');

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        await checkUser();
      } catch (error) {
        console.error('Error initializing app:', error);
        // На веб-платформі SQLite не працює, але це не критично
        if (Platform.OS !== 'web') {
          console.error('Database initialization failed:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const checkUser = async () => {
    try {
      const { data, error } = await getSession();
      if (error) {
        console.error('Error checking user session:', error);
      }
      setUser(data?.session?.user ?? null);
    } catch (error) {
      console.error('Error checking user session:', error);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setCurrentScreen('main');
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setCurrentScreen('main');
  };

  const handleSwitchToAdmin = () => {
    setCurrentScreen('admin');
  };

  const handleSwitchToMain = () => {
    setCurrentScreen('main');
  };

  const handleSwitchToProfile = () => {
    setCurrentScreen('profile');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Načítání...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {user ? (
        currentScreen === 'admin' && user.role === 'admin' ? (
          <AdminScreen
            user={user}
            onLogout={handleLogout}
            onSwitchToMain={handleSwitchToMain}
            onNavigate={setCurrentScreen}
          />
        ) : currentScreen === 'profile' ? (
          <ProfileScreen
            user={user}
            onLogout={handleLogout}
            onSwitchToMain={handleSwitchToMain}
            onNavigate={setCurrentScreen}
          />
        ) : (
          <MainScreen
            user={user}
            onLogout={handleLogout}
            onSwitchToAdmin={handleSwitchToAdmin}
            onSwitchToProfile={handleSwitchToProfile}
            onNavigate={setCurrentScreen}
          />
        )
      ) : (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
    width: Platform.OS === 'web' ? '100%' : '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
});
