// Server-side Supabase client
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default supabaseServer
