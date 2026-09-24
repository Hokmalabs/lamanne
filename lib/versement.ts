/**
 * Constantes et utilitaires partagés pour les versements cash.
 * Module pur : utilisable côté navigateur ET serveur (aucun import serveur).
 */

/** Montant minimum d'un versement cash, en FCFA */
export const MIN_VERSEMENT_CASH = 1000;

/**
 * Génère une clé d'idempotence (UUID v4) pour un versement.
 * À créer à l'ouverture du formulaire et à réutiliser pour chaque renvoi
 * de la même saisie (double clic, retry réseau).
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
