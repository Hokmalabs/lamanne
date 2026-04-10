export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle, PackageCheck } from "lucide-react";
import { ValidateButton } from "./ValidateButton";

type Tab = "pending" | "done";

export default async function AdminRetraitsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tab = (searchParams?.tab as Tab) || "pending";

  const [{ data: rawPending, error: pendingError }, { data: rawDone, error: doneError }] =
    await Promise.all([
      admin
        .from("cotisations")
        .select("*")
        .eq("status", "completed")
        .is("withdrawn_at", null)
        .order("created_at", { ascending: true }),
      admin
        .from("cotisations")
        .select("*")
        .eq("status", "completed")
        .not("withdrawn_at", "is", null)
        .order("withdrawn_at", { ascending: false })
        .limit(50),
    ]);

  console.log("[Admin Retraits] pending:", rawPending?.length, "done:", rawDone?.length,
    "errors:", pendingError?.message, doneError?.message);

  const enrich = async (list: any[]) =>
    Promise.all(
      list.map(async (c) => {
        const [{ data: profile }, { data: product }] = await Promise.all([
          admin.from("profiles").select("full_name, phone").eq("id", c.user_id).single(),
          admin.from("products").select("name").eq("id", c.product_id).single(),
        ]);
        return { ...c, profile, product };
      })
    );

  const [pending, done] = await Promise.all([
    enrich(rawPending ?? []),
    enrich(rawDone ?? []),
  ]);

  const current = tab === "pending" ? (pending ?? []) : (done ?? []);

  const formatFCFA = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Retraits</h1>
      <p className="text-gray-500 mb-6">Validation des retraits en boutique</p>

      {/* Onglets */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-6 max-w-xs">
        {([
          { key: "pending" as Tab, label: `En attente (${pending?.length ?? 0})` },
          { key: "done"    as Tab, label: `Validés (${done?.length ?? 0})` },
        ]).map(({ key, label }) => (
          <Link
            key={key}
            href={key === "pending" ? "/admin/retraits" : "/admin/retraits?tab=done"}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all text-center",
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
          <p>{tab === "pending" ? "Aucun retrait en attente" : "Aucun retrait validé"}</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {current.map((row: any) => (
            <div
              key={row.id}
              className={cn(
                "bg-white rounded-xl border p-5",
                tab === "pending" ? "border-blue-200" : "border-gray-200"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-gray-900">{row.profile?.full_name ?? "—"}</p>
                  {row.profile?.phone && (
                    <p className="text-xs text-gray-400">{row.profile.phone}</p>
                  )}
                  <p className="text-sm text-gray-500">{row.product?.name ?? "—"}</p>
                  <p className="text-sm font-semibold text-lamanne-primary">
                    {formatFCFA(row.total_price)}
                  </p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-1">Code de retrait</p>
                  <p className="text-2xl font-black text-lamanne-primary tracking-widest bg-lamanne-light px-4 py-2 rounded-xl">
                    {row.withdrawal_code ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {tab === "done" ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>
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
