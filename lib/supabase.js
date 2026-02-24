import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://wacxpbswdkpaqvjnzuyl.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_lnI3XaHrFal7C-0O_wJkvQ_OfVvYYDY';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const isSupabaseConfigured = () => {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_PUBLIC_KEY !== 'YOUR_SUPABASE_PUBLIC_KEY';
};

