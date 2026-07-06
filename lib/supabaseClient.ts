
import { createClient } from '@supabase/supabase-js';

/**
 * MARCLYN CORE ENGINE v5.0 - PRODUCTION SHIELD
 * Foco: Persistência de sessão e resiliência de rede.
 */

export const SUPABASE_URL = "https://rwogxmqswfinvloksspp.supabase.co";
export const SUPABASE_ANON_KEY = "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3b2d4bXFzd2ZpbnZsb2tzc3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzA2MzIxNCwiZXhwIjoyMDk4NjM5MjE0fQ.5UaQlm2yXZvdFbZnyTvb5lBLrrbKhPwk2kUmE4m0ZUE";
export const IS_DB_CONNECTED = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'marclyn_prod_shield_v5',
    storage: window.localStorage,
    flowType: 'pkce'
  }
});

console.log(
  "%c 🛡️ MARCLYN PRODUCTION SHIELD %c Ready for deployment.",
  "background: #0f172a; color: #2dd4bf; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
  "color: #2dd4bf; font-weight: bold;"
);
