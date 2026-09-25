/**
 * Constantes et utilitaires du paiement en ligne.
 * Module pur : utilisable côté navigateur ET serveur (aucun import serveur, aucun secret).
 */

/** Minimum crédité sur la cotisation par un paiement en ligne, en FCFA */
export const ONLINE_MIN_CREDIT = 200;

/** Frais fixes de service, payés par le client en plus du montant crédité, en FCFA */
export const ONLINE_SERVICE_FEE = 100;

/** Montant débité au client pour un crédit donné (crédit + frais) */
export function onlineCharge(credit: number): number {
  return credit + ONLINE_SERVICE_FEE;
}

/** Affichage du paiement en ligne dans l'interface (le serveur a son propre interrupteur) */
export const ONLINE_PAYMENT_UI_ENABLED = process.env.NEXT_PUBLIC_ONLINE_PAYMENT_ENABLED === "true";
