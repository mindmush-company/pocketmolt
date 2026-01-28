// Browser (client) Supabase client
"use client";

import { createClient } from '@supabase/supabase-js'

// Expose a lightweight client for browser usage
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default supabase
