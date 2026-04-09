"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Cotisation, Product } from "@/lib/types";
import { formatCFA, calculateProgress, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import {
  Plus,
  ShoppingBag,
  CreditCard,
  XCircle,
  QrCode,
  CheckCircle,
  Package,
} from "lucide-react";
import Link from "next/link";

type CotisationWithProduct = Cotisation & {
  product: Pick<Product, "name" | "images" | "is_lot">;
};

// ─── Modal générique ────────────────────────────────────────────
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  );
}

// ─── Modal paiement de tranche ──────────────────────────────────
function PayModal({
  cotisation,
  onClose,
  onSuccess,
}: {
  cotisation: CotisationWithProduct;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const tranchesPaid = Math.round(cotisation.amount_paid / cotisation.tranche_amount);
  const tranchesTotal = cotisation.nb_tranches;
  const amountAfter = cotisation.amount_paid + cotisation.tranche_amount;
  const isLast = amountAfter >= cotisation.total_price;

  const handleConfirm = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newAmountPaid = Math.min(amountAfter, cotisation.total_price);
    const newRemaining = cotisation.total_price - newAmountPaid;
    const isComplete = newRemaining <= 0;

    const withdrawalCode = isComplete
      ? String(Math.floor(100000 + Math.random() * 900000))
      : null;

    const [, cotUpdate] = await Promise.all([
      supabase.from("payments").insert({
        cotisation_id: cotisation.id,
        user_id: user.id,
        amount: cotisation.tranche_amount,
        status: "success",
        payment_method: "mobile_money",
        paid_at: new Date().toISOString(),
      }),
      supabase
        .from("cotisations")
        .update({
          amount_paid: newAmountPaid,
          amount_remaining: newRemaining,
          status: isComplete ? "completed" : "active",
          ...(withdrawalCode ? { withdrawal_code: withdrawalCode } : {}),
        })
        .eq("id", cotisation.id),
    ]);

    if (!cotUpdate.error) onSuccess();
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-xl font-black text-gray-900">Payer une tranche</h2>
      <p className="text-sm text-gray-500">{cotisation.product.name}</p>

      <div className="bg-lamanne-light rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Montant à payer</span>
          <span className="font-black text-lamanne-primary text-base">
            {formatCFA(cotisation.tranche_amount)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tranches payées</span>
          <span className="font-semibold">{tranchesPaid} / {tranchesTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Restant après paiement</span>
          <span className="font-semibold text-gray-800">
            {formatCFA(Math.max(0, cotisation.amount_remaining - cotisation.tranche_amount))}
          </span>
        </div>
        {isLast && (
          <div className="border-t border-lamanne-accent/20 pt-2 mt-2 text-center">
            <p className="text-xs font-semibold text-lamanne-success">
              🎉 Dernier paiement — votre article sera prêt à retirer !
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Paiement...
            </span>
          ) : (
            "Confirmer le paiement"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal annulation ────────────────────────────────────────────
function CancelModal({
  cotisation,
  onClose,
  onSuccess,
}: {
  cotisation: CotisationWithProduct;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const refundAmount = Math.floor(cotisation.amount_paid * 0.9);

  const handleConfirm = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("cotisations")
      .update({
        status: "cancelled",
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        refund_status: "requested",
        refund_requested_at: new Date().toISOString(),
        refund_amount: refundAmount,
      })
      .eq("id", cotisation.id);

    if (!error) onSuccess();
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start gap-3">
        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xl font-black text-gray-900">Annuler ma cotisation</h2>
          <p className="text-sm text-gray-500 mt-0.5">{cotisation.product.name}</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
        Vous recevrez un remboursement du montant déjà payé, sous déduction de{" "}
        <strong>10% de frais de traitement</strong>.
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Montant payé</span>
          <span className="font-semibold">{formatCFA(cotisation.amount_paid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Frais de traitement (10%)</span>
          <span className="font-semibold text-red-600">
            – {formatCFA(cotisation.amount_paid - refundAmount)}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-bold">
          <span>Montant remboursable</span>
          <span className="text-lamanne-success">{formatCFA(refundAmount)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Motif de l&apos;annulation (optionnel)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Précisez si vous le souhaitez..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
          Garder ma cotisation
        </Button>
        <Button
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          onClick={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Annulation...
            </span>
          ) : (
            "Confirmer l'annulation"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Carte cotisation ────────────────────────────────────────────
function CotisationItem({
  cotisation,
  onPay,
  onCancel,
}: {
  cotisation: CotisationWithProduct;
  onPay: (c: CotisationWithProduct) => void;
  onCancel: (c: CotisationWithProduct) => void;
}) {
  const progress = calculateProgress(cotisation.amount_paid, cotisation.total_price);
  const tranchesPaid = Math.round(cotisation.amount_paid / cotisation.tranche_amount);

  if (cotisation.status === "completed") {
    return (
      <div className="bg-white rounded-2xl border border-lamanne-success/30 shadow-sm p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lamanne-success/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-lamanne-success" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{cotisation.product.name}</p>
              {cotisation.product.is_lot && (
                <span className="text-xs bg-lamanne-accent/10 text-lamanne-accent font-semibold px-2 py-0.5 rounded-full">
                  LOT
                </span>
              )}
            </div>
          </div>
          <Badge variant="success">Prêt à retirer</Badge>
        </div>
        {cotisation.withdrawal_code && (
          <div className="bg-lamanne-success/10 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <QrCode className="h-4 w-4 text-lamanne-success" />
              <p className="text-xs font-semibold text-lamanne-success">Code de retrait</p>
            </div>
            <p className="text-3xl font-black text-lamanne-success tracking-widest">
              {cotisation.withdrawal_code}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Présentez ce code en boutique pour retirer votre article
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0">
            {cotisation.product.is_lot
              ? <Package className="h-5 w-5 text-lamanne-accent" />
              : <ShoppingBag className="h-5 w-5 text-lamanne-accent" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-snug">
              {cotisation.product.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {cotisation.product.is_lot && (
                <span className="text-xs bg-lamanne-accent/10 text-lamanne-accent font-semibold px-2 py-0.5 rounded-full">
                  LOT
                </span>
              )}
              <p className="text-xs text-gray-400">Démarrée le {formatDate(cotisation.created_at)}</p>
            </div>
          </div>
        </div>
        <Badge variant="warning">En cours</Badge>
      </div>

      {/* Progression */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{tranchesPaid} tranche{tranchesPaid > 1 ? "s" : ""} payée{tranchesPaid > 1 ? "s" : ""} sur {cotisation.nb_tranches}</span>
          <span className="font-semibold text-gray-700">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Montants */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl py-2 px-1">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-xs font-bold text-gray-700">{formatCFA(cotisation.total_price)}</p>
        </div>
        <div className="bg-lamanne-light rounded-xl py-2 px-1">
          <p className="text-xs text-gray-400">Payé</p>
          <p className="text-xs font-bold text-lamanne-primary">{formatCFA(cotisation.amount_paid)}</p>
        </div>
        <div className="bg-red-50 rounded-xl py-2 px-1">
          <p className="text-xs text-gray-400">Restant</p>
          <p className="text-xs font-bold text-red-600">{formatCFA(cotisation.amount_remaining)}</p>
        </div>
      </div>

      {/* Actions */}
      <Button
        className="w-full"
        size="sm"
        onClick={() => onPay(cotisation)}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Payer une tranche ({formatCFA(cotisation.tranche_amount)})
      </Button>

      <button
        onClick={() => onCancel(cotisation)}
        className="w-full text-xs text-red-400 hover:text-red-600 transition-colors py-1 font-medium"
      >
        Annuler et demander un remboursement
      </button>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────
export default function CotisationsPage() {
  const searchParams = useSearchParams();
  const [cotisations, setCotisations] = useState<CotisationWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<CotisationWithProduct | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CotisationWithProduct | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    searchParams.get("success") ? "Cotisation démarrée avec succès !" : null
  );

  const fetchCotisations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("cotisations")
      .select("*, product:products(name, images, is_lot)")
      .eq("user_id", user.id)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false });

    if (data) setCotisations(data as CotisationWithProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCotisations(); }, [fetchCotisations]);

  const active = cotisations.filter((c) => c.status === "active");
  const completed = cotisations.filter((c) => c.status === "completed");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes cotisations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Chargement..." : `${cotisations.length} cotisation(s)`}
          </p>
        </div>
        <Link href="/catalogue">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle
          </Button>
        </Link>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />
          ))}
        </div>
      )}

      {/* État vide */}
      {!loading && cotisations.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-lamanne-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-lamanne-accent" />
          </div>
          <h3 className="font-bold text-gray-700 mb-1">Aucune cotisation</h3>
          <p className="text-gray-400 text-sm mb-5">
            Commencez à cotiser pour vos articles préférés.
          </p>
          <Link href="/catalogue">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Explorer le catalogue
            </Button>
          </Link>
        </div>
      )}

      {/* Prêt à retirer */}
      {!loading && completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-lamanne-success flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Prêt à retirer ({completed.length})
          </h2>
          {completed.map((c) => (
            <CotisationItem
              key={c.id}
              cotisation={c}
              onPay={setPayTarget}
              onCancel={setCancelTarget}
            />
          ))}
        </div>
      )}

      {/* En cours */}
      {!loading && active.length > 0 && (
        <div className="space-y-3">
          {active.length > 0 && completed.length > 0 && (
            <h2 className="text-base font-bold text-gray-700">En cours ({active.length})</h2>
          )}
          {active.map((c) => (
            <CotisationItem
              key={c.id}
              cotisation={c}
              onPay={setPayTarget}
              onCancel={setCancelTarget}
            />
          ))}
        </div>
      )}

      {/* Modal paiement */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)}>
        {payTarget && (
          <PayModal
            cotisation={payTarget}
            onClose={() => setPayTarget(null)}
            onSuccess={() => {
              setPayTarget(null);
              setSuccessMsg("Paiement effectué avec succès !");
              fetchCotisations();
            }}
          />
        )}
      </Modal>

      {/* Modal annulation */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        {cancelTarget && (
          <CancelModal
            cotisation={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onSuccess={() => {
              setCancelTarget(null);
              setSuccessMsg("Cotisation annulée. Votre demande de remboursement est en cours de traitement.");
              fetchCotisations();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
