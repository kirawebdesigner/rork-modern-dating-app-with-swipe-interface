import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

export const TEST_MODE = true;

const env = process.env as Record<string, string | undefined>;
const extra = (Constants.expoConfig?.extra as Record<string, any> | undefined) ?? {};

const envUrl =
  env.EXPO_PUBLIC_SUPABASE_URL ??
  env.NEXT_PUBLIC_SUPABASE_URL ??
  extra.EXPO_PUBLIC_SUPABASE_URL ??
  extra.NEXT_PUBLIC_SUPABASE_URL;

const envAnon =
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  extra.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://nizdrhdfhddtrukeemhp.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDI2NTksImV4cCI6MjA3MDIxODY1OX0.5_8FUNRcHkr8PQtLMBhYp7PuqOgYphAjcw_E9jq-QTg';

const supabaseUrl = envUrl ?? DEFAULT_URL;
const supabaseAnonKey = envAnon ?? DEFAULT_ANON;

export const isSupabaseConfigured = Boolean(envUrl && envAnon);

const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Using default placeholder credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live data.');
}

if (TEST_MODE) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST MODE ENABLED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All features unlocked for testing');
  console.log('✅ No backend connection required');
  console.log('✅ All data stored locally');
  console.log('✅ Premium features enabled by default');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} else {
  console.log('[Supabase] Client initialized for', Platform.OS, 'with URL:', supabaseUrl);
  console.log('[Supabase] Config status:', isSupabaseConfigured ? 'Configured' : 'Using defaults');
}

let connectionTested = false;
export const testConnection = async () => {
  if (TEST_MODE) {
    console.log('[Supabase] TEST MODE: Skipping connection test');
    return;
  }
  
  if (connectionTested) return;
  connectionTested = true;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error('[Supabase] ❌ Connection test failed!');
      console.error('[Supabase] Error message:', error.message);
    } else {
      console.log('[Supabase] ✅ Connection test successful');
    }
  } catch (err) {
    console.error('[Supabase] ❌ Connection test exception:', err);
  }
};

if (!TEST_MODE) {
  testConnection();
}