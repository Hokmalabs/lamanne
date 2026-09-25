/**
 * Client GeniusPay — SERVEUR UNIQUEMENT.
 *
 * Aucune dépendance : fetch + node:crypto. Les clés sont lues dans des variables
 * d'environnement serveur (jamais NEXT_PUBLIC_) et ne doivent jamais apparaître dans
 * un message d'erreur ni dans un log.
 *
 * Retour terrain (prime sur la doc GeniusPay) : base https, en-têtes X-API-Key +
 * X-API-Secret, POST /payments sans payment_method = page de checkout hébergée,
 * URL de redirection dans data.payment_url OU data.checkout_url, montants parfois
 * en chaînes décimales ("200.00").
 */

import { createHmac, timingSafeEqual } from "node:crypto";

if (typeof window !== "undefined") {
  throw new Error("lib/geniuspay est réservé au serveur");
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

type GeniusPayConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  env: string;
};

const REQUIRED_VARS = [
  "GENIUSPAY_BASE_URL",
  "GENIUSPAY_API_KEY",
  "GENIUSPAY_API_SECRET",
  "GENIUSPAY_WEBHOOK_SECRET",
  "GENIUSPAY_ENV",
] as const;

/** Lit la configuration ; lève une Error (nom de la variable, jamais sa valeur) si incomplète */
export function getConfig(): GeniusPayConfig {
  for (const name of REQUIRED_VARS) {
    if (!process.env[name]) {
      throw new Error(`Configuration GeniusPay incomplète : ${name} manquante`);
    }
  }

  const baseUrl = process.env.GENIUSPAY_BASE_URL!.replace(/\/+$/, "");
  if (!baseUrl.startsWith("https://")) {
    throw new Error("Configuration GeniusPay invalide : GENIUSPAY_BASE_URL doit commencer par https://");
  }

  return {
    baseUrl,
    apiKey: process.env.GENIUSPAY_API_KEY!,
    apiSecret: process.env.GENIUSPAY_API_SECRET!,
    webhookSecret: process.env.GENIUSPAY_WEBHOOK_SECRET!,
    env: process.env.GENIUSPAY_ENV!,
  };
}

// ---------------------------------------------------------------------------
// Erreurs et utilitaires
// ---------------------------------------------------------------------------

/** Erreur d'appel GeniusPay. Le message ne contient jamais de secret. */
export class GeniusPayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GeniusPayError";
  }
}

/** Montant GeniusPay (nombre ou chaîne décimale "200.00") → entier FCFA, ou null */
export function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function authHeaders(config: GeniusPayConfig): Record<string, string> {
  return {
    "X-API-Key": config.apiKey,
    "X-API-Secret": config.apiSecret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Message d'erreur du fournisseur, tronqué (jamais nos en-têtes ni nos clés) */
function providerMessage(json: unknown): string {
  const msg = (json as { message?: unknown } | null)?.message;
  return typeof msg === "string" ? `: ${msg.slice(0, 200)}` : "";
}

/** Appel HTTP commun : timeout, pas de cache, JSON attendu, erreurs normalisées */
async function request(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs: number },
): Promise<Record<string, any>> {
  const config = getConfig();

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: authHeaders(config),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new GeniusPayError(
      timedOut ? "GeniusPay : délai dépassé" : "GeniusPay : service injoignable",
      timedOut ? 504 : 502,
    );
  }

  let json: Record<string, any> | null = null;
  try {
    json = (await res.json()) as Record<string, any>;
  } catch {
    // Réponse non JSON : traitée comme une erreur ci-dessous
  }

  if (!res.ok || !json || json.success !== true) {
    throw new GeniusPayError(
      `GeniusPay : réponse invalide (HTTP ${res.status})${providerMessage(json)}`,
      res.ok ? 502 : res.status,
    );
  }

  return (json.data ?? {}) as Record<string, any>;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Crée un paiement sur la page de checkout hébergée (pas de payment_method).
 * Notre référence (merchant_ref) voyage dans metadata.
 */
export async function createPayment(params: {
  amount: number;
  description: string;
  successUrl: string;
  errorUrl: string;
  metadata: Record<string, string>;
}): Promise<{ reference: string; paymentUrl: string }> {
  const data = await request("/payments", {
    method: "POST",
    timeoutMs: 8000,
    body: {
      amount: params.amount,
      currency: "XOF",
      description: params.description.slice(0, 500),
      success_url: params.successUrl,
      error_url: params.errorUrl,
      metadata: params.metadata,
    },
  });

  const reference = typeof data.reference === "string" ? data.reference : null;
  const paymentUrl = data.payment_url ?? data.checkout_url;

  if (!reference) {
    throw new GeniusPayError("GeniusPay : référence absente de la réponse", 502);
  }
  if (typeof paymentUrl !== "string" || !paymentUrl.startsWith("https://")) {
    throw new GeniusPayError("GeniusPay : URL de paiement absente ou non https", 502);
  }

  return { reference, paymentUrl };
}

/** Lit l'état d'un paiement chez GeniusPay (référence MTX-...) */
export async function getPayment(reference: string): Promise<{
  reference: string;
  status: string;
  amount: number | null;
  fees: number | null;
  netAmount: number | null;
  paymentMethod: string | null;
}> {
  const data = await request(`/payments/${encodeURIComponent(reference)}`, {
    method: "GET",
    timeoutMs: 5000,
  });

  return {
    reference: typeof data.reference === "string" ? data.reference : reference,
    status: String(data.status ?? ""),
    amount: parseAmount(data.amount),
    fees: parseAmount(data.fees?.total_fees ?? data.fees),
    netAmount: parseAmount(data.net_amount),
    paymentMethod: data.payment_method ?? data.gateway ?? null,
  };
}

/**
 * Vérifie la signature d'un webhook : HMAC-SHA256 hex de `${timestamp}.${rawBody}`
 * avec GENIUSPAY_WEBHOOK_SECRET. Préfixe "sha256=" toléré. Comparaison à temps constant.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  timestamp: string | null | undefined,
): boolean {
  if (!signature || !timestamp) return false;

  const { webhookSecret } = getConfig();
  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const given = signature.trim().replace(/^sha256=/i, "").toLowerCase();

  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
