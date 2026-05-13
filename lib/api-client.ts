/**
 * Helper centralisé pour appeler les API routes internes depuis le client.
 *
 * Exemple :
 *   try {
 *     const result = await apiPost<{ ok: true; id: string }>(
 *       "/api/admin/produits",
 *       { name: "iPhone 15", price: 850000, ... }
 *     )
 *     console.log("Produit créé :", result.id)
 *   } catch (e) {
 *     if (e instanceof ApiClientError) {
 *       toast.error(e.message) // message déjà localisé en français
 *     }
 *   }
 */

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

export async function fetchApi<T = unknown>(
  url: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = init ?? {}

  const headers: Record<string, string> = {}

  // Conserver les headers fournis par l'appelant
  if (extraHeaders) {
    if (extraHeaders instanceof Headers) {
      extraHeaders.forEach((value, key) => { headers[key] = value })
    } else if (Array.isArray(extraHeaders)) {
      for (const [key, value] of extraHeaders) headers[key] = value
    } else {
      Object.assign(headers, extraHeaders)
    }
  }

  let serializedBody: string | undefined
  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    serializedBody = typeof body === "string" ? body : JSON.stringify(body)
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    ...(serializedBody !== undefined ? { body: serializedBody } : {}),
  })

  if (!res.ok) {
    let message = "Erreur réseau"
    let code: string | undefined
    try {
      const payload = (await res.json()) as { error?: string; code?: string }
      if (payload.error) message = payload.error
      if (payload.code) code = payload.code
    } catch {
      // Réponse non-JSON — on garde le message par défaut
    }
    throw new ApiClientError(res.status, message, code)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function apiPost<T = unknown>(url: string, body: unknown): Promise<T> {
  return fetchApi<T>(url, { method: "POST", body })
}

export function apiPatch<T = unknown>(url: string, body: unknown): Promise<T> {
  return fetchApi<T>(url, { method: "PATCH", body })
}

export function apiDelete<T = unknown>(url: string): Promise<T> {
  return fetchApi<T>(url, { method: "DELETE" })
}

export function apiGet<T = unknown>(url: string): Promise<T> {
  return fetchApi<T>(url, { method: "GET" })
}
