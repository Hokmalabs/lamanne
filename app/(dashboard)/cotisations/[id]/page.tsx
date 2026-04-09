"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Cotisation, Product } from "@/lib/types";
import { formatCFA, calculateProgress, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import {
  ChevronLeft,
  CreditCard,
  XCircle,
  CheckCircle,
  QrCode,
  Clock,
  AlertTriangle,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

type Payment = { id: string; amount: number; paid_at: string | null; status: string };

type CotisationFull = Cotisation & {
  product: Pick<Product, "name" | "images" | "max_tranches">;
  payments: Payment[];
};

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Modal versement ─────────────────────────────────────────────
function VersementModal({
  cotisation, onClose, onSuccess,
}: { cotisation: CotisationFull; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState<number | "">(Math.min(1000, cotisation.amount_remaining));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountNum = typeof amount === "number" ? amount : 0;
  const deadline = addMonths(cotisation.created_at, cotisation.product.max_tranches);

  const handleConfirm = async () => {
    if (amountNum < 1000) { setError("Montant minimum : 1 000 FCFA."); return; }
    if (amountNum > cotisation.amount_remaining) { setError("Montant supérieur au restant dû."); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const newPaid = cotisation.amount_paid + amountNum;
    const newRemaining = cotisation.total_price - newPaid;
    const isComplete = newRemaining <= 0;

    const [, cotUpdate] = await Promise.all([
      supabase.from("payments").insert({
        cotisation_id: cotisation.id,
        user_id: user.id,
        amount: amountNum,
        status: "success",
        payment_method: "mobile_money",
        paid_at: new Date().toISOString(),
      }),
      supabase.from("cotisations").update({
        amount_paid: newPaid,
        amount_remaining: Math.max(0, newRemaining),
        status: isComplete ? "completed" : "active",
        ...(isComplete ? { withdrawal_code: String(Math.floor(100000 + Math.random() * 900000)) } : {}),
      }).eq("id", cotisation.id),
    ]);

    if (!cotUpdate.error) onSuccess();
    else setError("Erreur lors du paiement. Réessayez.");
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <h2 className="text-xl font-black text-gray-900">Faire un versement</h2>
        <div className="bg-lamanne-light rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Montant restant</span>
            <span className="font-black text-lamanne-primary">{formatCFA(cotisation.amount_remaining)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date limite</span>
            <span className="font-semibold text-gray-800">{formatDate(deadline.toISOString())}</span>
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700 block">Montant à verser (FCFA)</label>
          <input type="number" min={1000} max={cotisation.amount_remaining} step={500} value={amount}
            onChange={(e) => { setError(null); setAmount(e.target.value === "" ? "" : Number(e.target.value)); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
          />
          <p className="text-xs text-gray-400">Min 1 000 FCFA — Max {formatCFA(cotisation.amount_remaining)}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={saving || amountNum < 1000}>
            {saving ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Paiement...</span> : "Confirmer le versement"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal annulation ────────────────────────────────────────────
function CancelModal({
  cotisation, onClose, onSuccess,
}: { cotisation: CotisationFull; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const refundAmount = Math.floor(cotisation.amount_paid * 0.9);

  const handleConfirm = async () => {
    setSaving(true);
    const { error } = await supabase.from("cotisations").update({
      status: "cancelled",
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
      refund_status: "requested",
      refund_requested_at: new Date().toISOString(),
      refund_amount: refundAmount,
    }).eq("id", cotisation.id);
    if (!error) onSuccess();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-black text-gray-900">Annuler ma cotisation</h2>
            <p className="text-sm text-gray-500 mt-0.5">{cotisation.product.name}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          Vous recevrez un remboursement sous déduction de <strong>10% de frais</strong>.
        </div>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Montant payé</span>
            <span className="font-semibold">{formatCFA(cotisation.amount_paid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Frais (10%)</span>
            <span className="font-semibold text-red-600">– {formatCFA(cotisation.amount_paid - refundAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-bold">
            <span>Montant remboursable</span>
            <span className="text-lamanne-success">{formatCFA(refundAmount)}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Motif (optionnel)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Précisez si vous le souhaitez..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
            rows={3} />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Garder</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm} disabled={saving}>
            {saving ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Annulation...</span> : "Confirmer l'annulation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page détail ─────────────────────────────────────────────────
export default function CotisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cotisation, setCotisation] = useState<CotisationFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("cotisations")
      .select("*, product:products(name, images, max_tranches), payments(id, amount, paid_at, status)")
      .eq("id", id)
      .single();

    if (data) setCotisation(data as CotisationFull);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl h-48 animate-pulse" />
        <div className="bg-white rounded-2xl h-64 animate-pulse" />
      </div>
    );
  }

  if (!cotisation) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Cotisation introuvable</p>
        <Link href="/cotisations"><Button className="mt-4" variant="outline">Retour</Button></Link>
      </div>
    );
  }

  const deadline = addMonths(cotisation.created_at, cotisation.product.max_tranches);
  const days = daysUntil(deadline);
  const progress = calculateProgress(cotisation.amount_paid, cotisation.total_price);
  const sortedPayments = [...(cotisation.payments ?? [])].sort(
    (a, b) => new Date(b.paid_at ?? 0).getTime() - new Date(a.paid_at ?? 0).getTime()
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/cotisations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Mes cotisations
        </Link>
        {cotisation.status === "active" && (
          <Button size="sm" onClick={() => setShowPay(true)}>
            <CreditCard className="h-4 w-4 mr-1.5" />
            Faire un versement
          </Button>
        )}
      </div>

      {/* Infos produit + progression */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-lamanne-accent font-semibold uppercase tracking-wide mb-0.5">Cotisation</p>
            <h1 className="text-lg font-black text-gray-900 leading-snug">{cotisation.product.name}</h1>
            <p className="text-xs text-gray-400 mt-1">Démarrée le {formatDate(cotisation.created_at)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            {cotisation.status === "completed" && <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">Terminé</span>}
            {cotisation.status === "active" && <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full">En cours</span>}
            {cotisation.status === "cancelled" && <span className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full">Annulé</span>}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCFA(cotisation.amount_paid)} payés sur {formatCFA(cotisation.total_price)}</span>
            <span className="font-semibold text-gray-700">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

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

        {/* Deadline */}
        {cotisation.status === "active" && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
            days < 0 ? "bg-red-50 text-red-700" :
            days <= 30 ? "bg-orange-50 text-orange-700" :
            "bg-blue-50 text-blue-700"
          }`}>
            {days <= 30 ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <Clock className="h-4 w-4 flex-shrink-0" />}
            <span>
              {days < 0
                ? `Délai dépassé depuis ${Math.abs(days)} jours`
                : days === 0
                ? "Date limite : aujourd'hui"
                : `Date limite : ${formatDate(deadline.toISOString())} (${days} jours restants)`}
            </span>
          </div>
        )}

        {/* Code de retrait */}
        {cotisation.status === "completed" && cotisation.withdrawal_code && (
          <div className="bg-lamanne-success/10 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <QrCode className="h-4 w-4 text-lamanne-success" />
              <p className="text-xs font-semibold text-lamanne-success">Code de retrait</p>
            </div>
            <p className="text-3xl font-black text-lamanne-success tracking-widest">{cotisation.withdrawal_code}</p>
            <p className="text-xs text-gray-500 mt-2">Présentez ce code en boutique pour retirer votre article</p>
          </div>
        )}
      </div>

      {/* Historique des versements */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center justify-between">
          <span>Versements effectués</span>
          <span className="text-sm font-normal text-gray-400">{sortedPayments.length} versement{sortedPayments.length > 1 ? "s" : ""}</span>
        </h2>

        {sortedPayments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucun versement enregistré.</p>
        ) : (
          <div className="space-y-2">
            {sortedPayments.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-lamanne-light rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-lamanne-primary">#{sortedPayments.length - i}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatCFA(p.amount)}</p>
                    <p className="text-xs text-gray-400">{p.paid_at ? formatDate(p.paid_at) : "—"}</p>
                  </div>
                </div>
                <CheckCircle className="h-4 w-4 text-lamanne-success" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Annuler */}
      {cotisation.status === "active" && (
        <button
          onClick={() => setShowCancel(true)}
          className="w-full text-sm text-red-400 hover:text-red-600 transition-colors py-2 font-medium"
        >
          Annuler cette cotisation
        </button>
      )}

      {showPay && (
        <VersementModal
          cotisation={cotisation}
          onClose={() => setShowPay(false)}
          onSuccess={() => { setShowPay(false); fetchData(); }}
        />
      )}

      {showCancel && (
        <CancelModal
          cotisation={cotisation}
          onClose={() => setShowCancel(false)}
          onSuccess={() => { setShowCancel(false); router.push("/cotisations"); }}
        />
      )}
    </div>
  );
}
