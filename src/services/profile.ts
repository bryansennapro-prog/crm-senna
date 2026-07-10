import { db, unwrap } from "./_db";
import type { UserProfile } from "@/lib/types";

/** Perfil do usuário autenticado (linha em public.users + tenant). */
export async function getProfile(): Promise<UserProfile | null> {
  const sb = db();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return unwrap<UserProfile>(
    await sb.from("users").select("*").eq("id", user.id).single()
  );
}

export async function signOut(): Promise<void> {
  const { error } = await db().auth.signOut();
  if (error) throw new Error(error.message);
}
