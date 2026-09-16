export const dynamic = "force-dynamic";

import { RefreshCw } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { RemboursementActions } from "./RemboursementActions";
import { requirePageAuth } from "@/lib/api-security";

type Profile = { id: string; full_name: string; phone: string };

// PostgREST renvoie un objet ou un tableau selon la relation — même normalisation
// que app/api/admin/remboursements/[id]/route.ts
function pickOne<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

export default async function AdminRemboursementsPage() {
  await requirePageAuth(["admin", "super_admin"]);

  const { data: raw, error } = await supabaseAdmin
    .from("cotisations")
    .select("*, products(name)")
    .eq("refund_status", "requested")
    .order("refund_requested_at", { ascending: false });

  // cotisations.user_id référence auth.users (pas profiles) : aucun embed PostgREST
  // possible vers profiles. Une seule requête groupée remplace le N+1.
  const userIds = Array.from(new Set((raw ?? []).map((c) => c.user_id as string)));
  const profilesById = new Map<string, Profile>();

  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    for (const p of (profilesData ?? []) as Profile[]) {
      profilesById.set(p.id, p);
    }
  }

  const rows = (raw ?? []).map((c) => ({
    ...c,
    profile: profilesById.get(c.user_id as string) ?? null,
    product: pickOne<{ name: string }>(c.products),
  }));

  const formatFCFA = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-black text-gray-900">Remboursements</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {rows.length} demande(s) en attente
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            {error
              ? `Erreur : ${error.message}`
              : "Aucune demande de remboursement en attente"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sora font-bold text-gray-900 truncate">
                    {row.profile?.full_name ?? "—"}
                  </p>
                  {row.profile?.phone && (
                    <p className="text-xs text-gray-400 truncate">{row.profile.phone}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {row.product?.name ?? "—"}
                  </p>
                  {row.refund_requested_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Demande du{" "}
                      {new Date(row.refund_requested_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-sora text-lg sm:text-xl font-black text-lamanne-success">
                    {formatFCFA(row.refund_amount ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400">à rembourser</p>
                </div>
              </div>

              {row.cancellation_reason && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 break-words">
                  <span className="font-semibold text-gray-700">Motif : </span>
                  {row.cancellation_reason}
                </div>
              )}

              <RemboursementActions id={row.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
