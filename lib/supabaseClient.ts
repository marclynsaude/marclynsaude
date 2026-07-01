
import { createClient } from '@supabase/supabase-js';

/**
 * MARCLYN CORE ENGINE v5.0 - PRODUCTION SHIELD
 * Foco: Persistência de sessão e resiliência de rede.
 */

export const SUPABASE_URL = "https://kwwpsotvxyxxjzifibbb.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d3Bzb3R2eHl4eGp6aWZpYmJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MTg2NTksImV4cCI6MjA4MDk5NDY1OX0.3iL-50ArNUJhmLlb_FsMzHC9VPgbXh1MM-m-a2dxpNg";

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
