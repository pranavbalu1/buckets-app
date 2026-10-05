import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(url && key)

// Keep the development diagnostics page available when local env vars are missing.
// Its checks report configuration problems before making Supabase requests.
export const supabase = createClient(
  url || 'http://127.0.0.1:54321',
  key || 'missing-supabase-client-config',
)
