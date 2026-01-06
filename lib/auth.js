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
          console.error('Supabase sign up error:', error);
          return {
            user: null,
            error: errorMessage,
          };
        }

        if (data.user) {
          console.log('User registered successfully:', data.user.email);
          const role = email === 'gghub491@gmail.com' ? 'admin' : 'user';
          
          try {
            await supabase.from('users').upsert({
              id: data.user.id,
              email: data.user.email,
              role: role,
            });
          } catch (upsertError) {
            console.warn('Could not upsert user to users table:', upsertError);
          }

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
      } catch (supabaseError) {
        console.error('Supabase sign up error:', supabaseError);
      }
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
    if (isSupabaseConfigured()) {
      try {
        console.log('Attempting Supabase sign in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('Supabase sign in response:', { hasData: !!data, hasError: !!error, errorMessage: error?.message });

        if (error) {
          let errorMessage = error.message;
          
          if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
            errorMessage = 'Nesprávný email nebo heslo. Zkuste to znovu.';
          } else if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
            errorMessage = 'Email není potvrzen. Zkontrolujte svou poštu a potvrďte email, nebo zkuste se znovu zaregistrovat.';
          } else if (error.message?.includes('User not found')) {
            errorMessage = 'Uživatel s tímto emailem neexistuje. Zaregistrujte se prosím.';
          }
          
          console.error('Supabase sign in error:', error);
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
          } catch (userError) {
            console.warn('Could not fetch user role from users table:', userError);
          }

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
      } catch (supabaseError) {
        console.error('Supabase sign in error:', supabaseError);
      }
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (supabaseError) {
        console.error('Supabase sign out error:', supabaseError);
      }
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
          console.error('Supabase get session error:', error);
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
          } catch (userError) {
            console.warn('Could not fetch user role from users table:', userError);
          }

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
      } catch (supabaseError) {
        console.error('Supabase get session error:', supabaseError);
      }
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
    console.error('Get session error:', error);
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
          } catch (userError) {
            console.warn('Could not fetch user role from users table:', userError);
          }

          return {
            id: session.user.id,
            email: session.user.email,
            role: role,
          };
        }
      } catch (supabaseError) {
        console.error('Supabase get current user error:', supabaseError);
      }
    }

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
