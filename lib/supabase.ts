import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const envUrl = (process.env as Record<string, string | undefined>)?.NEXT_PUBLIC_SUPABASE_URL
  ?? (Constants.expoConfig?.extra as Record<string, any> | undefined)?.NEXT_PUBLIC_SUPABASE_URL;
const envAnon = (process.env as Record<string, string | undefined>)?.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? (Constants.expoConfig?.extra as Record<string, any> | undefined)?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = envUrl ?? 'https://nizdrhdfhddtrukeemhp.supabase.co';
const supabaseAnonKey = envAnon ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDI2NTksImV4cCI6MjA3MDIxODY1OX0.5_8FUNRcHkr8PQtLMBhYp7PuqOgYphAjcw_E9jq-QTg';

const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

console.log('[Supabase] Client initialized for', Platform.OS, 'with URL:', supabaseUrl);