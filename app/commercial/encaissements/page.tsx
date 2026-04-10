import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Wallet, Clock } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import VersementForm from "./VersementForm";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function EncaissementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Clients of this commercial
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("assigned_commercial", user.id)
    .order("full_name");

  const clientIds = (clients ?? []).map((c) => c.id);
  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c]));

  // Today's payments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayPayments: { id: string; amount: number; paid_at: string; user_id: string; product_name: string }[] = [];
  let todayTotal = 0;

  if (clientIds.length > 0) {
    // Get active cotisations for these clients
    const { data: cotisations } = await admin
      .from("cotisations")
      .select("id, user_id, products(name)")
      .in("user_id", clientIds);

    const cotMap: Record<string, { user_id: string; product_name: string }> = {};
    (cotisations ?? []).forEach((c) => {
      const p = Array.isArray(c.products) ? c.products[0] : c.products;
      cotMap[c.id] = { user_id: c.user_id, product_name: (p as any)?.name ?? "—" };
    });

    const cotIds = Object.keys(cotMap);
    if (cotIds.length > 0) {
      const { data: payments } = await admin
        .from("payments")
        .select("id, amount, paid_at, cotisation_id")
        .in("cotisation_id", cotIds)
        .gte("paid_at", today.toISOString())
        .order("paid_at", { ascending: false });

      todayPayments = (payments ?? []).map((p) => ({
        id: p.id,
        amount: p.amount,
        paid_at: p.paid_at,
        user_id: cotMap[p.cotisation_id]?.user_id ?? "",
        product_name: cotMap[p.cotisation_id]?.product_name ?? "—",
      }));

      todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Encaissements</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-lamanne-primary text-white rounded-2xl p-5">
          <Wallet className="h-5 w-5 mb-2 opacity-70" />
          <p className="text-2xl font-black">{formatCFA(todayTotal)}</p>
          <p className="text-white/70 text-sm mt-0.5">Total encaissé</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <Clock className="h-5 w-5 mb-2 text-gray-400" />
          <p className="text-2xl font-black text-gray-900">{todayPayments.length}</p>
          <p className="text-gray-500 text-sm mt-0.5">Versements aujourd&apos;hui</p>
        </div>
      </div>

      {/* Quick versement form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Enregistrer un versement</h2>
        <VersementForm clients={clients ?? []} />
      </div>

      {/* Today's payments list */}
      {todayPayments.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Versements du jour</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Client</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Produit</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Heure</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayPayments.map((p) => {
                  const client = clientMap[p.user_id];
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {client?.full_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{p.product_name}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(p.paid_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-lamanne-primary">
                        {formatCFA(p.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
