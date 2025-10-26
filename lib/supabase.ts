import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const envUrl = (process.env as Record<string, string | undefined>)?.NEXT_PUBLIC_SUPABASE_URL
  ?? (Constants.expoConfig?.extra as Record<string, any> | undefined)?.NEXT_PUBLIC_SUPABASE_URL;
const envAnon = (process.env as Record<string, string | undefined>)?.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? (Constants.expoConfig?.extra as Record<string, any> | undefined)?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://nizdrhdfhddtrukeemhp.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDI2NTksImV4cCI6MjA3MDIxODY1OX0.5_8FUNRcHkr8PQtLMBhYp7PuqOgYphAjcw_E9jq-QTg';

const supabaseUrl = envUrl ?? DEFAULT_URL;
const supabaseAnonKey = envAnon ?? DEFAULT_ANON;

export const isSupabaseConfigured = !!envUrl && !!envAnon;

const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Using default placeholder credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live data.');
}

console.log('[Supabase] Client initialized for', Platform.OS, 'with URL:', supabaseUrl);
console.log('[Supabase] Config status:', isSupabaseConfigured ? 'Configured' : 'Using defaults');

// Test connection
supabase.from('profiles').select('count').limit(1).then(({ error }) => {
  if (error) {
    console.error('[Supabase] Connection test failed:', JSON.stringify(error, null, 2));
    console.error('[Supabase] Error message:', error.message);
    console.error('[Supabase] Error details:', error.details);
    console.error('[Supabase] Error hint:', error.hint);
  } else {
    console.log('[Supabase] Connection test successful');
  }
});