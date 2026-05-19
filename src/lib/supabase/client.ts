import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

// For public read-only pages: skips session restoration and token refresh
// so queries use the anon key immediately without waiting on auth state.
export function createPublicClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      isSingleton: false,
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
        autoRefreshToken: false,
        skipAutoInitialize: true,
      },
    }
  );
}
