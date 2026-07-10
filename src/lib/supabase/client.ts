import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl } from "./url";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | undefined;

/**
 * Cliente Supabase para uso em Client Components (browser).
 * Memoizado para evitar múltiplas instâncias do GoTrueClient.
 */
export function createClient(): BrowserClient {
  if (client) return client;
  client = createBrowserClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
