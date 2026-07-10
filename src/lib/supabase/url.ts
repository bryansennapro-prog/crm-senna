/**
 * URL base do projeto Supabase.
 * Aceita tanto a URL base (https://xxx.supabase.co) quanto uma colada com
 * "/rest/v1" no final — os clients esperam a base e adicionam o caminho.
 */
export function supabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}
