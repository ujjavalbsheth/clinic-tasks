import { createClient } from "@supabase/supabase-js";

// Server-only client. The service role key bypasses Row Level Security,
// so this module must never be imported into a "use client" component.
export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
