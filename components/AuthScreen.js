import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { signIn, signUp } from '../lib/auth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768;

const AuthScreen = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Chyba', 'Prosím, vyplňte všechna pole');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password);
      }

      const { user, error } = result;

      if (error) {
        console.error('Auth error details:', error);
        let errorMessage = error;
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        if (isLogin && errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Nesprávný email nebo heslo.\n\nPokud jste se ještě nezaregistrovali, přepněte se na režim registrace.';
        }
        
        Alert.alert('Chyba', errorMessage);
        return;
      }

      if (user) {
        if (isLogin) {
          onAuthSuccess(user);
        } else {
          Alert.alert('Úspěch', 'Účet byl úspěšně vytvořen!');
          onAuthSuccess(user);
        }
      } else {
        Alert.alert('Chyba', 'Nepodařilo se provést operaci');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Chyba', error.message || 'Neznámá chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
      }}
      style={styles.background}
      blurRadius={3}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>FilmHub</Text>
            <Text style={styles.subtitle}>Objevte svět filmů</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {isLogin ? 'Přihlásit se' : 'Vytvořit účet'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Heslo"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Přihlásit se' : 'Registrovat se'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
              }}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? 'Nemáte účet? Registrovat se'
                  : 'Již máte účet? Přihlásit se'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const createStyles = () => {
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  
  return StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: isDesktop ? 40 : isTablet ? 30 : 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isDesktop ? 60 : isTablet ? 55 : 50,
  },
  logo: {
    fontSize: isDesktop ? 64 : isTablet ? 56 : 48,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
    color: '#ccc',
    marginTop: isDesktop ? 10 : isTablet ? 8 : 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: isDesktop ? 24 : isTablet ? 22 : 20,
  padding: isDesktop ? 40 : isTablet ? 35 : 30,
  backdropFilter: 'blur(10px)',
  width: isDesktop ? Math.min(width * 0.4, 500) : isTablet ? Math.min(width * 0.7, 450) : '100%',
  maxWidth: isDesktop ? 500 : isTablet ? 450 : width - 40, },
  title: {
    fontSize: isDesktop ? 32 : isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: isDesktop ? 40 : isTablet ? 35 : 30,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: isDesktop ? 14 : isTablet ? 13 : 12,
    padding: isDesktop ? 18 : isTablet ? 16 : 15,
    marginBottom: isDesktop ? 18 : isTablet ? 16 : 15,
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#e50914',
    borderRadius: isDesktop ? 14 : isTablet ? 13 : 12,
    padding: isDesktop ? 18 : isTablet ? 16 : 15,
    alignItems: 'center',
    marginTop: isDesktop ? 15 : isTablet ? 12 : 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: isDesktop ? 20 : isTablet ? 19 : 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: isDesktop ? 25 : isTablet ? 22 : 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#fff',
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    textDecorationLine: 'underline',
  },
  });
};

const styles = createStyles();

export default AuthScreen;
