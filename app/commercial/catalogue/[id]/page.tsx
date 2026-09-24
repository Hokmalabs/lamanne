"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { formatCFA, formatDate } from "@/lib/utils";
import { MIN_VERSEMENT_CASH, newIdempotencyKey } from "@/lib/versement";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingBag,
  ChevronLeft,
  Package,
  Calendar,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ClientProfile {
  id: string;
  full_name: string;
  phone: string | null;
}

type CreateCotisationResult = {
  ok: true;
  idempotent: boolean;
  cotisation_id: string;
  completed: boolean;
  amount_paid: number;
};

type SuccessState = {
  clientId: string;
  clientName: string;
  amountPaid: number;
  completed: boolean;
  idempotent: boolean;
};

function addMonths(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function CommercialProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forClientId = searchParams.get("for_client");

  const [product, setProduct] = useState<Product | null>(null);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [months, setMonths] = useState<number | null>(null);
  const [firstPayment, setFirstPayment] = useState<number | "">("");
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  // Une clé = une création. Renvoyer après une coupure ne crée jamais de doublon.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => newIdempotencyKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const prodRes = await supabase.from("products").select("*, category:categories(name)").eq("id", id).single();
      if (prodRes.data) setProduct(prodRes.data as Product);

      try {
        const { clients: clientList } = await apiGet<{ clients: ClientProfile[] }>("/api/commercial/clients");
        setClients(clientList ?? []);
        if (forClientId && (clientList ?? []).some((c) => c.id === forClientId)) {
          setSelectedClientId(forClientId);
        }
      } catch {
        // clients non chargés : le select affichera "aucun client"
      }

      setLoading(false);
    }
    load();
  }, [id, forClientId]);

  const minMonths = product?.min_tranches ?? 1;
  const maxMonths = product?.max_tranches ?? 1;
  const effectiveMonths = months ?? maxMonths;
  const firstPaymentNum = typeof firstPayment === "number" ? firstPayment : 0;
  const deadline = product ? addMonths(effectiveMonths) : null;
  const clientLocked = !!forClientId && clients.some((c) => c.id === forClientId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Toute modification d'un champ ramène à la saisie
  const editField = (apply: () => void) => {
    apply();
    setStep("edit");
    setError(null);
  };

  /** Premier versement : 0, au moins MIN_VERSEMENT_CASH, ou le prix exact */
  const validate = (): string | null => {
    if (!product) return "Produit introuvable.";
    if (!selectedClientId) return "Sélectionnez un client.";
    if (effectiveMonths < minMonths || effectiveMonths > maxMonths) return "Durée invalide.";
    if (firstPaymentNum < 0) return "Montant invalide.";
    if (firstPaymentNum > product.price) return "Le versement dépasse le prix de l'article.";
    if (
      firstPaymentNum > 0 &&
      firstPaymentNum < MIN_VERSEMENT_CASH &&
      firstPaymentNum !== product.price
    ) {
      return `Le premier versement doit être d'au moins ${formatCFA(MIN_VERSEMENT_CASH)} (ou 0 F).`;
    }
    return null;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setError(err);
    if (!err) setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!product || saving) return;
    const err = validate();
    if (err) { setError(err); setStep("edit"); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await apiPost<CreateCotisationResult>("/api/commercial/nouvelle-cotisation", {
        client_id: selectedClientId,
        product_id: product.id,
        months: effectiveMonths,
        first_payment: firstPaymentNum,
        idempotency_key: idempotencyKey,
      });
      setIdempotencyKey(newIdempotencyKey());

      if (clientLocked) {
        router.push(`/commercial/mes-clients/${selectedClientId}`);
        return;
      }
      setSuccess({
        clientId: selectedClientId,
        clientName: selectedClient?.full_name ?? "le client",
        amountPaid: res.amount_paid,
        completed: res.completed,
        idempotent: res.idempotent,
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau. Réessayez.");
      // Conflit (clé déjà utilisée, produit indisponible) : nouvelle création logique
      if (e instanceof ApiClientError && e.status === 409) {
        setIdempotencyKey(newIdempotencyKey());
        setStep("edit");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNewSale = () => {
    setSuccess(null);
    setSelectedClientId("");
    setMonths(null);
    setFirstPayment("");
    setStep("edit");
    setError(null);
    setIdempotencyKey(newIdempotencyKey());
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl h-64 animate-pulse" />
        <div className="bg-white rounded-2xl h-48 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Produit introuvable</p>
        <Link href="/commercial/catalogue">
          <Button className="mt-4" variant="outline">Retour au catalogue</Button>
        </Link>
      </div>
    );
  }

  const monthOptions = Array.from(
    { length: Math.max(0, maxMonths - minMonths + 1) },
    (_, i) => minMonths + i,
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link
        href="/commercial/catalogue"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      {/* Product card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative h-48 bg-lamanne-light flex items-center justify-center">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="h-16 w-16 text-lamanne-accent/40" />
          )}
          {product.is_lot && (
            <span className="absolute top-3 left-3 bg-lamanne-accent text-white text-xs font-bold px-3 py-1 rounded-full">
              LOT
            </span>
          )}
        </div>
        <div className="p-5">
          <h1 className="text-xl font-black text-gray-900">{product.name}</h1>
          <p className="text-2xl font-black text-lamanne-primary mt-1">{formatCFA(product.price)}</p>
          {product.description && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{product.description}</p>
          )}
        </div>
      </div>

      {/* Lot details */}
      {product.is_lot && product.lot_details && (
        <div className="bg-white rounded-2xl border border-lamanne-accent/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-lamanne-accent" />
            <h2 className="font-bold text-gray-900">Contenu du lot</h2>
          </div>
          <ul className="space-y-1.5">
            {product.lot_details.split("\n").filter((l) => l.trim()).map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lamanne-accent flex-shrink-0" />
                {line.trim()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Configurateur */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <h2 className="font-bold text-gray-900">Démarrer une cotisation</h2>

        {success ? (
          <div className="rounded-xl bg-lamanne-success/10 p-4 space-y-3">
            <div className="flex items-start gap-2 text-lamanne-success">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Cotisation créée pour {success.clientName}</p>
                {success.idempotent && (
                  <p className="text-xs text-gray-500">
                    Cette cotisation était déjà enregistrée (aucun doublon).
                  </p>
                )}
                {success.amountPaid > 0 && (
                  <p className="text-sm font-semibold">{formatCFA(success.amountPaid)} reçus</p>
                )}
                {success.completed && (
                  <p className="text-sm font-semibold">Cotisation soldée</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/commercial/mes-clients/${success.clientId}`)}
              >
                Voir le client
              </Button>
              <Button type="button" className="flex-1" onClick={handleNewSale}>
                Nouvelle vente
              </Button>
            </div>
          </div>
        ) : (
          <>
            {clientLocked && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Cotisation pour ce client</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleContinue} className="space-y-4">
              {/* Client selector */}
              <div className="space-y-1.5">
                <Label htmlFor="cc-client">Client</Label>
                {clients.length === 0 ? (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-3">
                    Aucun client assigné.{" "}
                    <Link href="/commercial/mes-clients" className="text-lamanne-accent underline">
                      Ajouter un client
                    </Link>
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      id="cc-client"
                      value={selectedClientId}
                      onChange={(e) => editField(() => setSelectedClientId(e.target.value))}
                      disabled={clientLocked}
                      required
                      className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10 disabled:bg-gray-50 disabled:text-gray-500"
                      style={{ fontSize: "16px" }}
                    >
                      <option value="">— Sélectionner un client —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name}{c.phone ? ` (${c.phone})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Durée */}
              <div className="space-y-1.5">
                <Label htmlFor="cc-months">Durée</Label>
                {minMonths === maxMonths ? (
                  <p className="text-sm font-semibold text-gray-900 bg-gray-50 rounded-xl px-4 py-2.5">
                    {maxMonths} mois
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      id="cc-months"
                      value={effectiveMonths}
                      onChange={(e) => editField(() => setMonths(Number(e.target.value)))}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10"
                      style={{ fontSize: "16px" }}
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>{m} mois</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
                {deadline && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    Date limite : {formatDate(deadline.toISOString())}
                  </p>
                )}
              </div>

              {/* Premier versement facultatif */}
              <div className="space-y-1.5">
                <Label htmlFor="cc-amount">Versement aujourd&apos;hui (facultatif)</Label>
                <Input
                  id="cc-amount"
                  type="number"
                  min={0}
                  max={product.price}
                  step={100}
                  placeholder="0"
                  value={firstPayment}
                  onChange={(e) =>
                    editField(() => setFirstPayment(e.target.value === "" ? "" : Number(e.target.value)))
                  }
                  style={{ fontSize: "16px" }}
                />
                <p className="text-xs text-gray-400">
                  0 F, au moins {formatCFA(MIN_VERSEMENT_CASH)}, ou le prix total.
                </p>
              </div>

              {step === "edit" ? (
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-bold"
                  disabled={clients.length === 0 || !selectedClientId}
                >
                  Continuer
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Récapitulatif */}
                  <div className="bg-lamanne-light rounded-xl p-4 text-sm space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Client</span>
                      <span className="font-semibold text-right">{selectedClient?.full_name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Article</span>
                      <span className="font-semibold text-right">{product.name}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Prix total</span>
                      <span className="font-semibold">{formatCFA(product.price)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Durée</span>
                      <span className="font-semibold">{effectiveMonths} mois</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Environ</span>
                      <span className="font-semibold">
                        {formatCFA(Math.ceil(product.price / effectiveMonths))} par mois
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-lamanne-accent/20 pt-1.5 font-bold">
                      <span>Versement aujourd&apos;hui</span>
                      <span className="text-lamanne-primary">{formatCFA(firstPaymentNum)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-12"
                      onClick={() => setStep("edit")}
                      disabled={saving}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      className={cn(
                        "flex-1 h-12 font-bold",
                        !saving && "ring-2 ring-lamanne-accent/60 ring-offset-2 shadow-lg shadow-lamanne-primary/30",
                      )}
                      onClick={handleConfirm}
                      disabled={saving}
                    >
                      {saving
                        ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                        : "Confirmer la cotisation"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
