import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const SUPABASE_URL = 'https://wacxpbswdkpaqvjnzuyl.supabase.co'
const SUPABASE_PUBLIC_KEY = 'sb_publishable_lnI3XaHrFal7C-0O_wJkvQ_OfVvYYDY'

const isWeb = Platform.OS === 'web'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'cinevia-app',
    },
  },
})

export const isSupabaseConfigured = () => {
  return !!SUPABASE_URL && !!SUPABASE_PUBLIC_KEY
}