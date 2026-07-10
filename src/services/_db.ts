import { createClient } from "@/lib/supabase/client";

/** Client Supabase (browser) usado por toda a camada de serviços. */
export function db() {
  return createClient();
}

/** Desempacota a resposta do PostgREST, lançando erro quando houver. */
export function unwrap<T>(res: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
