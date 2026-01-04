import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from './database';
import * as Crypto from 'expo-crypto';

const CURRENT_USER_KEY = '@current_user';

const hashPassword = async (password) => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
};

export const signUp = async (email, password) => {
  try {
    const db = await getDatabase();
    
    if (!db) {
      console.error('Database not initialized');
      return {
        user: null,
        error: 'Chyba připojení k databázi',
      };
    }
    
    const existing = await db.getFirstAsync(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) || null;

    if (existing) {
      return {
        user: null,
        error: 'Uživatel s tímto emailem již existuje. Zkuste se přihlásit.',
      };
    }

    const hashedPassword = await hashPassword(password);
    const userId = await Crypto.randomUUID();
    const role = email === 'gghub491@gmail.com' ? 'admin' : 'user';

    try {
      await db.runAsync(
        'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
        [userId, email, hashedPassword, role]
      );
    } catch (insertError) {
      console.error('Insert error:', insertError);
      if (insertError.message?.includes('UNIQUE')) {
        return {
          user: null,
          error: 'Uživatel s tímto emailem již existuje. Zkuste se přihlásit.',
        };
      }
      throw insertError;
    }

    const user = {
      id: userId,
      email: email,
      role: role,
    };

    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    return {
      user: user,
      error: null,
    };
  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'Chyba registrace';
    
    if (error.message?.includes('UNIQUE constraint') || error.message?.includes('UNIQUE')) {
      errorMessage = 'Uživatel s tímto emailem již existuje. Zkuste se přihlásit.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      user: null,
      error: errorMessage,
    };
  }
};

export const signIn = async (email, password) => {
  try {
    const db = await getDatabase();
    
    if (!db) {
      console.error('Database not initialized');
      return {
        user: null,
        error: 'Chyba připojení k databázi',
      };
    }

    const hashedPassword = await hashPassword(password);
    
    const userByEmail = await db.getFirstAsync(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) || null;

    if (!userByEmail) {
      return {
        user: null,
        error: 'Uživatel s tímto emailem neexistuje. Zaregistrujte se prosím.',
      };
    }

    if (userByEmail.password !== hashedPassword) {
      return {
        user: null,
        error: 'Nesprávné heslo. Zkuste to znovu.',
      };
    }

    const user = {
      id: userByEmail.id,
      email: userByEmail.email,
      role: userByEmail.role,
    };

    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    return {
      user: user,
      error: null,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      error: error.message || 'Chyba přihlášení',
    };
  }
};

export const signOut = async () => {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return { error: null };
  } catch (error) {
    return {
      error: error.message || 'Chyba odhlášení',
    };
  }
};

export const getSession = async () => {
  try {
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      return {
        data: {
          session: { user },
        },
        error: null,
      };
    }

    return {
      data: { session: null },
      error: null,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return {
      data: { session: null },
      error: error.message || 'Chyba získání relace',
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};
