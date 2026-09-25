"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCFA } from "@/lib/utils";
import { apiGet, ApiClientError } from "@/lib/api-client";

const REF_PATTERN = /^LMN-[0-9a-f-]{36}$/;
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20; // 60 s

type IntentStatus = "pending" | "success" | "failed" | "expired";

type IntentResponse = {
  ok: true;
  status: IntentStatus;
  amount_credit: number;
  service_fee: number;
  amount_charged: number;
  cotisation_id: string;
};

type ViewState =
  | { kind: "pending" }
  | { kind: "success"; amountCredit: number; cotisationId: string }
  | { kind: "failed"; cotisationId: string }
  | { kind: "timeout"; cotisationId: string | null }
  | { kind: "notfound" };

/**
 * Retour de la page de paiement GeniusPay.
 * Ne crédite JAMAIS : interroge notre base (le webhook est seul à créditer).
 */
function PaiementRetourContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const refValid = !!ref && REF_PATTERN.test(ref);

  const [state, setState] = useState<ViewState>({ kind: "pending" });

  useEffect(() => {
    if (!refValid || !ref) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let lastCotisationId: string | null = null;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await apiGet<IntentResponse>(`/api/payments/${ref}`);
        if (cancelled) return;
        lastCotisationId = res.cotisation_id;

        if (res.status === "success") {
          setState({ kind: "success", amountCredit: res.amount_credit, cotisationId: res.cotisation_id });
          return;
        }
        if (res.status === "failed" || res.status === "expired") {
          setState({ kind: "failed", cotisationId: res.cotisation_id });
          return;
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiClientError && e.status === 404) {
          setState({ kind: "notfound" });
          return;
        }
        // Erreur ponctuelle : compte comme un essai, le polling continue
      }

      if (attempts >= MAX_ATTEMPTS) {
        setState({ kind: "timeout", cotisationId: lastCotisationId });
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ref, refValid]);

  if (!refValid) {
    return (
      <ResultCard
        icon={<SearchX className="h-8 w-8 text-lamanne-danger" />}
        iconBg="bg-lamanne-danger/10"
        title="Référence de paiement invalide"
      >
        <Link href="/cotisations">
          <Button variant="outline" className="w-full">Mes cotisations</Button>
        </Link>
      </ResultCard>
    );
  }

  switch (state.kind) {
    case "pending":
      return (
        <ResultCard
          icon={<span className="h-8 w-8 border-4 border-lamanne-primary border-t-transparent rounded-full animate-spin" />}
          iconBg="bg-lamanne-primary/10"
          title="Confirmation de votre paiement en cours…"
        />
      );

    case "success":
      return (
        <ResultCard
          icon={<CheckCircle className="h-8 w-8 text-lamanne-success" />}
          iconBg="bg-lamanne-success/10"
          title="Paiement reçu"
          text={`${formatCFA(state.amountCredit)} crédités sur votre cotisation`}
        >
          <Link href={`/cotisations/${state.cotisationId}`}>
            <Button className="w-full">Voir ma cotisation</Button>
          </Link>
        </ResultCard>
      );

    case "failed":
      return (
        <ResultCard
          icon={<XCircle className="h-8 w-8 text-lamanne-danger" />}
          iconBg="bg-lamanne-danger/10"
          title="Le paiement n'a pas abouti"
          text="Aucun montant n'a été crédité."
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/cotisations/${state.cotisationId}`} className="flex-1">
              <Button className="w-full">Réessayer</Button>
            </Link>
            <Link href="/cotisations" className="flex-1">
              <Button variant="outline" className="w-full">Mes cotisations</Button>
            </Link>
          </div>
        </ResultCard>
      );

    case "timeout":
      return (
        <ResultCard
          icon={<Clock className="h-8 w-8 text-lamanne-primary" />}
          iconBg="bg-lamanne-primary/10"
          title="Confirmation en attente"
          text="La confirmation prend plus de temps que prévu. Si vous avez payé, votre cotisation sera créditée automatiquement et vous recevrez une notification."
        >
          <Link href={state.cotisationId ? `/cotisations/${state.cotisationId}` : "/cotisations"}>
            <Button className="w-full">Voir ma cotisation</Button>
          </Link>
        </ResultCard>
      );

    case "notfound":
      return (
        <ResultCard
          icon={<SearchX className="h-8 w-8 text-lamanne-danger" />}
          iconBg="bg-lamanne-danger/10"
          title="Paiement introuvable"
        >
          <Link href="/cotisations">
            <Button variant="outline" className="w-full">Mes cotisations</Button>
          </Link>
        </ResultCard>
      );
  }
}

function ResultCard({
  icon,
  iconBg,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
        <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mx-auto`}>
          {icon}
        </div>
        <div className="space-y-1">
          <h1 className="font-sora text-xl font-black text-gray-900">{title}</h1>
          {text && <p className="text-sm text-gray-500">{text}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PaiementRetourPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-10">
          <div className="bg-white rounded-2xl h-56 animate-pulse border border-gray-100" />
        </div>
      }
    >
      <PaiementRetourContent />
    </Suspense>
  );
}
