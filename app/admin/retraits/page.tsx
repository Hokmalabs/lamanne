export const dynamic = "force-dynamic";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle, PackageCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ValidateButton } from "./ValidateButton";
import { requirePageAuth } from "@/lib/api-security";

type Tab = "pending" | "done";

type Profile = { id: string; full_name: string; phone: string };

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
      .select("*, products(name)")
      .eq("status", "completed")
      .is("withdrawn_at", null)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("cotisations")
      .select("*, products(name)")
      .eq("status", "completed")
      .not("withdrawn_at", "is", null)
      .order("withdrawn_at", { ascending: false })
      .limit(50),
  ]);

  // cotisations.user_id référence auth.users (pas profiles) : aucun embed PostgREST
  // possible vers profiles. Une seule requête groupée remplace le N+1.
  const userIds = Array.from(
    new Set([...(rawPending ?? []), ...(rawDone ?? [])].map((c) => c.user_id as string)),
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
        <p className="text-sm text-gray-500 mt-0.5">Validation des retraits en boutique</p>
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
                <div className="flex-shrink-0 text-center sm:text-right">
                  <p className="text-xs text-gray-400 mb-1">Code de retrait</p>
                  <p className="font-sora text-2xl font-black text-lamanne-primary tracking-widest bg-lamanne-light px-4 py-2 rounded-xl">
                    {row.withdrawal_code ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {tab === "done" ? (
                  <div className="flex items-center gap-2 text-sm text-lamanne-success">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      Validé le{" "}
                      {row.withdrawn_at
                        ? new Date(row.withdrawn_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </span>
                  </div>
                ) : (
                  <ValidateButton id={row.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
