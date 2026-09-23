/**
 * Ouverture de session Supabase pour un compte client dont le PIN vient
 * d'être vérifié par notre serveur — SERVEUR uniquement.
 *
 * Aucun email n'est envoyé : generateLink (API admin) ne fait que produire
 * le jeton, que l'on consomme immédiatement avec verifyOtp. Fonctionne avec
 * l'inscription publique Supabase désactivée, car le compte existe déjà.
 *
 * À n'appeler qu'APRÈS une vérification de PIN réussie.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ApiError } from "@/lib/api-security";

export async function openSessionForEmail(loginEmail: string): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: loginEmail,
  });

  // Ne jamais logger `data` : il contient le lien et le jeton de connexion
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[openSessionForEmail] generateLink:", error ?? "hashed_token absent");
    throw new ApiError(500, "Connexion impossible pour le moment", "INTERNAL");
  }

  // Le client serveur pose les cookies de session sur la réponse
  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (verifyError) {
    // Couvre notamment un compte banni côté Supabase
    console.error("[openSessionForEmail] verifyOtp:", verifyError);
    throw new ApiError(403, "Connexion refusée", "FORBIDDEN");
  }
}
