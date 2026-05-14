import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Server-side Supabase client (service_role). Not called at scaffold time;
// it exists so the trade / box-open Edge Functions and realtime presence
// writes can pick it up unchanged in later phases.
export function createSupabaseServiceClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'createSupabaseServiceClient called without SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
