// Server-side Supabase client using anon key + user JWT (respects RLS)
// No service role key needed.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createSupabaseServerClient(authToken?: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables.');
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Drop-in replacement for supabaseAdmin — uses anon key, no RLS bypass
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseServerClient>, {
  get(_, prop, receiver) {
    const client = createSupabaseServerClient();
    return Reflect.get(client, prop, receiver);
  },
});
