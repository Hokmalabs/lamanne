/**
 * Génération du mot de passe initial d'un membre de l'équipe (admin / commercial).
 *
 * Ce mot de passe n'est JAMAIS stocké en base, JAMAIS loggé, et n'est renvoyé
 * qu'UNE SEULE FOIS dans la réponse de la route qui le génère (création de
 * compte ou régénération). S'il est perdu, il faut en régénérer un nouveau.
 */

import { randomInt } from "crypto";

// 31 caractères — sans 0, 1, I, L, O, ambigus à l'oral et à la lecture
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 12;
const GROUP = 4;

export function generateStaffPassword(): string {
  const chars: string[] = [];
  for (let i = 0; i < LENGTH; i++) {
    // CSPRNG : jamais Math.random pour un secret
    chars.push(ALPHABET[randomInt(0, ALPHABET.length)]);
  }

  const groups: string[] = [];
  for (let i = 0; i < LENGTH; i += GROUP) {
    groups.push(chars.slice(i, i + GROUP).join(""));
  }

  // Les tirets font partie intégrante du mot de passe
  return groups.join("-");
}
