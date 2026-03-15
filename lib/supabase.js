import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_PUBLIC_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLIC_KEY?.trim() || "";

const isWeb = Platform.OS === "web";

export const isSupabaseConfigured = () => {
  return !!SUPABASE_URL && !!SUPABASE_PUBLIC_KEY;
};

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: {
        storage: isWeb ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: isWeb,
        flowType: "pkce",
      },
      global: {
        headers: {
          "X-Client-Info": "cinevia-app",
        },
      },
    })
  : null;