/**
 * Constantes et utilitaires du paiement en ligne.
 * Module pur : utilisable côté navigateur ET serveur (aucun import serveur, aucun secret).
 */

/** Montant minimum accepté par la passerelle GeniusPay, en FCFA */
export const ONLINE_GATEWAY_MIN = 200;

/** Dépôt minimal en ligne crédité sur la cotisation, en FCFA (décision du 10/10/2026) */
export const ONLINE_MIN_CREDIT = 1000;

/** Frais de service facturés au client : supprimés (la passerelle est à la charge de FAMIENWA) */
export const ONLINE_SERVICE_FEE = 0;

/** Montant débité au client pour un crédit donné (crédit + frais) */
export function onlineCharge(credit: number): number {
  return credit + ONLINE_SERVICE_FEE;
}

/** Le paiement en ligne est-il possible pour ce reste à payer ? */
export function canPayOnline(remaining: number): boolean {
  return remaining >= ONLINE_GATEWAY_MIN;
}

/** Montant valide : au moins 1 000 F, sauf pour solder le reste exact (au moins 200 F) */
export function isValidOnlineCredit(amount: number, remaining: number): boolean {
  if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) return false;
  if (amount >= ONLINE_MIN_CREDIT) return true;
  return amount === remaining && amount >= ONLINE_GATEWAY_MIN;
}

/** Affichage du paiement en ligne dans l'interface (le serveur a son propre interrupteur) */
export const ONLINE_PAYMENT_UI_ENABLED = process.env.NEXT_PUBLIC_ONLINE_PAYMENT_ENABLED === "true";
