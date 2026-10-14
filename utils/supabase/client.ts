import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, init).catch((err) => {
          console.warn('[SUPABASE CLIENT] Supabase unreachable or offline:', err?.message || err);
          return new Response(
            JSON.stringify({ error: 'Supabase unreachable or offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }),
    },
  });
}
