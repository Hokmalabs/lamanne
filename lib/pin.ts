/**
 * Hachage et vérification des codes PIN clients — SERVEUR uniquement.
 *
 * RÈGLE ABSOLUE : un PIN ou un hash ne doit JAMAIS être loggé, même
 * partiellement, ni renvoyé au client (hors PIN temporaire, affiché une
 * seule fois à l'agent qui crée le compte).
 *
 * Format stocké dans auth_pins.pin_hash :
 *   scrypt$<N>$<r>$<p>$<sel base64>$<hash base64>
 */

import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { isWeakPin } from "@/lib/pin-rules";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/** Durée de validité d'un PIN temporaire : 7 jours */
export const TEMP_PIN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// scrypt promisifié (util.promisify perd la surcharge avec options)
function scryptAsync(
  pin: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, keyLength, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(pin, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

function parsePositiveInt(value: string): number | null {
  if (!/^\d{1,9}$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

/**
 * Vérifie un PIN contre un hash stocké. Les paramètres scrypt sont lus dans
 * la chaîne (permet de les durcir plus tard sans casser les anciens hash).
 * Ne lance jamais d'exception : tout format invalide renvoie false.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const N = parsePositiveInt(parts[1]);
    const r = parsePositiveInt(parts[2]);
    const p = parsePositiveInt(parts[3]);
    if (N === null || r === null || p === null) return false;

    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

    const actual = await scryptAsync(pin, salt, KEY_LENGTH, { N, r, p });
    if (actual.length !== expected.length) return false;

    return timingSafeEqual(actual, expected);
  } catch {
    // Paramètres refusés par scrypt (mémoire, N non puissance de 2…) : pas de détail loggé
    return false;
  }
}

// Hash factice calculé une seule fois par instance, à la première utilisation
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    const dummyPin = randomInt(0, 1_000_000).toString().padStart(6, "0");
    dummyHashPromise = hashPin(dummyPin).catch((err: unknown) => {
      // Échec : on retentera au prochain appel plutôt que de mémoriser un rejet
      dummyHashPromise = null;
      throw err;
    });
  }
  return dummyHashPromise;
}

/**
 * Effectue une vérification complète sur un hash factice : quand le numéro
 * n'existe pas, la réponse prend le même temps que pour un vrai compte, ce
 * qui empêche de deviner les numéros inscrits en mesurant le délai.
 */
export async function verifyAgainstDummy(pin: string): Promise<void> {
  try {
    await verifyPin(pin, await getDummyHash());
  } catch (err) {
    console.error("[pin] hash factice indisponible:", err);
  }
}

/**
 * PIN temporaire de 6 chiffres (CSPRNG), jamais "faible" au sens de
 * isWeakPin, y compris vis-à-vis de la fin du numéro du client.
 */
export function generateTempPin(normalizedPhone: string): string {
  let pin: string;
  do {
    pin = randomInt(0, 1_000_000).toString().padStart(6, "0");
  } while (isWeakPin(pin, normalizedPhone));
  return pin;
}
