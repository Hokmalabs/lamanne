/**
 * Règles de format et de robustesse du code PIN client (6 chiffres).
 *
 * Module pur (aucune dépendance) : utilisable depuis un Client Component pour un
 * retour immédiat à la saisie, ET côté serveur, qui reste seul juge.
 */

export const PIN_LENGTH = 6;

export const PIN_REGEX = /^\d{6}$/;

/**
 * Vrai si le PIN fait partie des codes les plus devinables : chiffres tous
 * identiques, suite de pas 1 (croissante ou décroissante), motif "ab" répété
 * 3 fois, motif "abc" répété 2 fois, ou 6 derniers chiffres du numéro.
 * Un PIN mal formé n'est pas "faible" : c'est PIN_REGEX qui le rejette.
 */
export function isWeakPin(pin: string, normalizedPhone?: string): boolean {
  if (!PIN_REGEX.test(pin)) return false;

  const digits = pin.split("").map(Number);

  if (digits.every((d) => d === digits[0])) return true;

  const ascending = digits.every((d, i) => i === 0 || d - digits[i - 1] === 1);
  const descending = digits.every((d, i) => i === 0 || d - digits[i - 1] === -1);
  if (ascending || descending) return true;

  if (pin.slice(0, 2).repeat(3) === pin) return true;
  if (pin.slice(0, 3).repeat(2) === pin) return true;

  if (normalizedPhone) {
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    if (phoneDigits.length >= PIN_LENGTH && phoneDigits.slice(-PIN_LENGTH) === pin) {
      return true;
    }
  }

  return false;
}

/** Message d'erreur à afficher, ou null si le PIN est acceptable. */
export function pinProblem(pin: string, normalizedPhone?: string): string | null {
  if (!PIN_REGEX.test(pin)) {
    return "Le code PIN doit contenir exactement 6 chiffres.";
  }
  if (isWeakPin(pin, normalizedPhone)) {
    return "Ce code est trop facile à deviner. Évitez les suites, les répétitions et la fin de votre numéro.";
  }
  return null;
}
