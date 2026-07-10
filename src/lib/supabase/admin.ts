import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./url";

/**
 * Cliente Supabase com a SERVICE ROLE KEY. Ignora RLS.
 * USO EXCLUSIVO NO SERVIDOR (Route Handlers / webhook). NUNCA importar em
 * Client Components — exporia a service role key no browser.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
