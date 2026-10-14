import { createServerClient } from '@supabase/ssr'
import { fetchWithTimeout } from './fetchWithTimeout'

export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        getAll() {
          return []
        },
        setAll() {}
      }
    }
  )
}
