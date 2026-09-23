/**
 * Normalisation des numéros de téléphone ivoiriens.
 *
 * Module pur (aucun import serveur) : utilisable depuis un Client Component
 * comme depuis une API route. C'est la SEULE source de vérité du format —
 * un numéro saisi à l'inscription doit produire exactement le même identifiant
 * de connexion que le même numéro saisi au login.
 */

/** Séparateurs de saisie courants : espaces, points, tirets, parenthèses */
const SEPARATORS = /[\s.\-()]/g;

export const PHONE_FORMAT_MESSAGE =
  "Numéro invalide : 10 chiffres (ex. 07 00 00 00 00) ou format international (+225…)";

/**
 * Renvoie le numéro au format international `+225XXXXXXXXXX`, ou null si la
 * saisie n'est pas exploitable.
 */
export function normalizeCIPhone(raw: string): string | null {
  const cleaned = raw.replace(SEPARATORS, "").replace(/^00/, "+");

  if (cleaned.startsWith("+")) {
    return /^\+\d{10,15}$/.test(cleaned) ? cleaned : null;
  }

  // Indicatif saisi sans le "+"
  if (/^225\d{10}$/.test(cleaned)) return `+${cleaned}`;

  // Numérotation ivoirienne à 10 chiffres, sans indicatif
  if (/^\d{10}$/.test(cleaned)) return `+225${cleaned}`;

  return null;
}

/**
 * Email technique de connexion dérivé d'un numéro DÉJÀ normalisé.
 * Les comptes sans email réel se connectent avec cet identifiant.
 */
export function phoneToLoginEmail(normalized: string): string {
  return `phone_${normalized.replace(/\D/g, "")}@lamanne.app`;
}
