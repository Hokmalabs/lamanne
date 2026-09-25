export const dynamic = "force-dynamic";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle, PackageCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ValidateButton } from "./ValidateButton";
import { requirePageAuth } from "@/lib/api-security";

type Tab = "pending" | "done";

type Profile = { id: string; full_name: string; phone: string };

// Jamais le code de retrait : l'admin ne le voit plus, il le saisit
const COTISATION_COLUMNS =
  "id, user_id, total_price, withdrawn_at, withdrawn_by, withdrawal_method, withdrawal_proof, products(name)";

function withdrawalMethodLabel(method: string | null, proof: string | null): string | null {
  if (method === "code") return "Code vérifié";
  if (method === "identite") {
    if (proof === "carnet") return "Identité (carnet)";
    if (proof === "piece_identite") return "Identité (pièce d'identité)";
    return "Identité";
  }
  return null;
}

// PostgREST renvoie un objet ou un tableau selon la relation — même normalisation
// que app/api/admin/remboursements/[id]/route.ts
function pickOne<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

export default async function AdminRetraitsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageAuth(["admin", "super_admin"]);

  const params = await searchParams;
  const tab = (params?.tab as Tab) || "pending";

  const [{ data: rawPending }, { data: rawDone }] = await Promise.all([
    supabaseAdmin
      .from("cotisations")
      .select(COTISATION_COLUMNS)
      .eq("status", "completed")
      .is("withdrawn_at", null)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("cotisations")
      .select(COTISATION_COLUMNS)
      .eq("status", "completed")
      .not("withdrawn_at", "is", null)
      .order("withdrawn_at", { ascending: false })
      .limit(50),
  ]);

  // cotisations.user_id référence auth.users (pas profiles) : aucun embed PostgREST
  // possible vers profiles. Une seule requête groupée remplace le N+1
  // (clients + admins ayant validé un retrait).
  const userIds = Array.from(
    new Set([
      ...[...(rawPending ?? []), ...(rawDone ?? [])].map((c) => c.user_id as string),
      ...(rawDone ?? [])
        .map((c) => c.withdrawn_by as string | null)
        .filter((v): v is string => !!v),
    ]),
  );
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

  type CotisationRow = Record<string, any> & {
    profile: Profile | null;
    product: { name: string } | null;
  };

  const attach = (list: Record<string, any>[]): CotisationRow[] =>
    list.map((c) => ({
      ...c,
      profile: profilesById.get(c.user_id as string) ?? null,
      product: pickOne<{ name: string }>(c.products),
    }));

  const pending = attach(rawPending ?? []);
  const done = attach(rawDone ?? []);

  const current = tab === "pending" ? pending : done;

  const formatFCFA = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-black text-gray-900">Retraits</h1>
        <p className="text-sm text-gray-500 mt-0.5">Remise des articles par l&apos;agent ou au siège à Daloa</p>
      </div>

      {/* Onglets */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-full max-w-xs">
        {([
          { key: "pending" as Tab, label: `En attente (${pending.length})` },
          { key: "done"    as Tab, label: `Validés (${done.length})` },
        ]).map(({ key, label }) => (
          <Link
            key={key}
            href={key === "pending" ? "/admin/retraits" : "/admin/retraits?tab=done"}
            className={cn(
              "flex-1 min-w-0 truncate py-2 px-3 rounded-lg text-sm font-semibold transition-all text-center",
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <PackageCheck className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            {tab === "pending" ? "Aucun retrait en attente" : "Aucun retrait validé"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {current.map((row) => (
            <div
              key={row.id}
              className={cn(
                "bg-white rounded-2xl border p-4 sm:p-5",
                tab === "pending" ? "border-lamanne-accent/40" : "border-gray-200"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-sora font-bold text-gray-900 truncate">
                    {row.profile?.full_name ?? "—"}
                  </p>
                  {row.profile?.phone && (
                    <p className="text-xs text-gray-400 truncate">{row.profile.phone}</p>
                  )}
                  <p className="text-sm text-gray-500 truncate">{row.product?.name ?? "—"}</p>
                  <p className="font-sora text-sm font-bold text-lamanne-primary">
                    {formatFCFA(row.total_price)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {tab === "done" ? (
                  <div className="flex items-start gap-2 text-sm text-lamanne-success">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Validé le{" "}
                      {row.withdrawn_at
                        ? new Date(row.withdrawn_at).toLocaleDateString("fr-FR")
                        : "—"}
                      {row.withdrawal_method && (
                        <>
                          {" "}par {(row.withdrawn_by && profilesById.get(row.withdrawn_by)?.full_name) ?? "—"}
                          {" — "}
                          {withdrawalMethodLabel(row.withdrawal_method, row.withdrawal_proof)}
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <ValidateButton
                    id={row.id}
                    clientName={row.profile?.full_name ?? "—"}
                    clientPhone={row.profile?.phone ?? null}
                    productName={row.product?.name ?? "—"}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
