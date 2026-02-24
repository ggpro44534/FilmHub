import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDatabase } from './database';
import * as Crypto from 'expo-crypto';
import { supabase, isSupabaseConfigured } from './supabase';

const CURRENT_USER_KEY = '@current_user';

const hashPassword = async (password) => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
};

export const signUp = async (email, password) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          let errorMessage = error.message;
          if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
            errorMessage = 'Uživatel s tímto emailem již existuje. Zkuste se přihlásit.';
          }
          return {
            user: null,
            error: errorMessage,
          };
        }

        if (data.user) {
          const role = email === 'gghub491@gmail.com' ? 'admin' : 'user';
          
          try {
            await supabase.from('users').upsert({
              id: data.user.id,
              email: data.user.email,
              role: role,
            });
          } catch (upsertError) {}

          const user = {
            id: data.user.id,
            email: data.user.email,
            role: role,
          };

          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

          return {
            user: user,
            error: null,
          };
        }

        return {
          user: null,
          error: 'Nepodařilo se vytvořit účet',
        };
      } catch (supabaseError) {}
    }

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) {
        return {
          user: null,
          error: 'Webové úložiště není dostupné',
        };
      }

      const usersRaw = localStorage.getItem('filmhub_users') || '[]';
      const users = JSON.parse(usersRaw);

      const existing = users.find((u) => u.email === email) || null;
      if (existing) {
        return {
          user: null,
          error: 'Uživatel s tímto emailem již existuje. Zkuste se přihlásit.',
        };
      }

      const hashedPassword = await hashPassword(password);
      const userId = Crypto.randomUUID ? await Crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const role = email === 'gghub491@gmail.com' ? 'admin' : 'user';

      const user = {
        id: userId,
        email,
        password: hashedPassword,
        role,
      };

      users.push(user);
      localStorage.setItem('filmhub_users', JSON.stringify(users));

      const publicUser = { id: user.id, email: user.email, role: user.role };
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));

      return {
        user: publicUser,
        error: null,
      };
    }
    
    const db = await getDatabase();

    if (!db) {
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          let errorMessage = error.message;
          
          if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
            errorMessage = 'Nesprávný email nebo heslo. Zkuste to znovu.';
          } else if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
            errorMessage = 'Email není potvrzen. Zkontrolujte svou poštu a potvrďte email, nebo zkuste se znovu zaregistrovat.';
          } else if (error.message?.includes('User not found')) {
            errorMessage = 'Uživatel s tímto emailem neexistuje. Zaregistrujte se prosím.';
          }
          
          return {
            user: null,
            error: errorMessage,
          };
        }

        if (data.user) {
          let role = email === 'gghub491@gmail.com' ? 'admin' : 'user';
          
          try {
            const { data: userData, error: userDataError } = await supabase
              .from('users')
              .select('role')
              .eq('id', data.user.id)
              .single();

            if (!userDataError && userData) {
              role = userData.role || role;
            }
          } catch (userError) {}

          const user = {
            id: data.user.id,
            email: data.user.email,
            role: role,
          };

          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

          return {
            user: user,
            error: null,
          };
        }

        return {
          user: null,
          error: 'Nepodařilo se přihlásit',
        };
      } catch (supabaseError) {}
    }

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) {
        return {
          user: null,
          error: 'Webové úložiště není dostupné',
        };
      }

      const usersRaw = localStorage.getItem('filmhub_users') || '[]';
      const users = JSON.parse(usersRaw);

      const userByEmail = users.find((u) => u.email === email) || null;

      if (!userByEmail) {
        return {
          user: null,
          error: 'Uživatel s tímto emailem neexistuje. Zaregistrujte se prosím.',
        };
      }

      const hashedPassword = await hashPassword(password);

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
        user,
        error: null,
      };
    }

    const db = await getDatabase();

    if (!db) {
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
    return {
      user: null,
      error: error.message || 'Chyba přihlášení',
    };
  }
};

export const signOut = async () => {
  try {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (supabaseError) {}
    }

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
    if (isSupabaseConfigured()) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          return { data: { session: null }, error };
        } else if (session?.user) {
          let role = session.user.email === 'gghub491@gmail.com' ? 'admin' : 'user';
          
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (userData) {
              role = userData.role || role;
            }
          } catch (userError) {}

          const user = {
            id: session.user.id,
            email: session.user.email,
            role: role,
          };

          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

          return {
            data: {
              session: { user },
            },
            error: null,
          };
        }
      } catch (supabaseError) {}
    }

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
return {
      data: { session: null },
      error: error.message || 'Chyba získání relace',
    };
  }
};

export const getCurrentUser = async () => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let role = session.user.email === 'gghub491@gmail.com' ? 'admin' : 'user';
          
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (userData) {
              role = userData.role || role;
            }
          } catch (userError) {}

          return {
            id: session.user.id,
            email: session.user.email,
            role: role,
          };
        }
      } catch (supabaseError) {}
    }

    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    return null;
  }
};
