import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Users, Phone, ClipboardList, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import AddClientModal from "./AddClientModal";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MesClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("assigned_commercial", user.id)
    .order("full_name");

  const list = (clients ?? []).filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return c.full_name?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s);
  });

  // Active cotisation counts + last payment
  const cotisationsMap: Record<string, number> = {};
  const lastPaymentMap: Record<string, string> = {};

  if (list.length > 0) {
    const { data: cots } = await admin
      .from("cotisations")
      .select("id, user_id")
      .in("user_id", list.map((c) => c.id))
      .eq("status", "active");

    (cots ?? []).forEach((c) => {
      cotisationsMap[c.user_id] = (cotisationsMap[c.user_id] ?? 0) + 1;
    });

    const cotIds = (cots ?? []).map((c) => c.id);
    if (cotIds.length > 0) {
      const { data: payments } = await admin
        .from("payments")
        .select("cotisation_id, paid_at, cotisations!inner(user_id)")
        .in("cotisation_id", cotIds)
        .order("paid_at", { ascending: false });

      (payments ?? []).forEach((p: any) => {
        const uid = p.cotisations?.user_id;
        if (uid && !lastPaymentMap[uid]) {
          lastPaymentMap[uid] = p.paid_at;
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(clients ?? []).length} client(s) assigné(s)</p>
        </div>
        <AddClientModal commercialId={user.id} />
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20"
        />
      </form>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">{q ? "Aucun résultat" : "Aucun client assigné"}</p>
          {!q && <p className="text-sm mt-1">Ajoutez votre premier client.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Client</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 hidden sm:table-cell">Téléphone</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Cotisations</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 hidden sm:table-cell">Dernier versement</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lamanne-primary font-bold text-sm">
                          {c.full_name?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.full_name}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{c.phone ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                    {c.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {c.phone}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                      <span className={cotisationsMap[c.id] ? "font-semibold text-gray-900" : "text-gray-400"}>
                        {cotisationsMap[c.id] ?? 0}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 hidden sm:table-cell">
                    {lastPaymentMap[c.id]
                      ? new Date(lastPaymentMap[c.id]).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/commercial/mes-clients/${c.id}`}
                      className="inline-flex items-center gap-1.5 text-xs bg-lamanne-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-lamanne-primary/90 transition-colors"
                    >
                      Gérer
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
