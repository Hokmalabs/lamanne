import { createClient } from '@supabase/supabase-js'

// Client service role — bypass RLS. Server-side UNIQUEMENT.
// Ne jamais importer ce fichier dans un "use client" component.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
