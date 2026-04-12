import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Wallet, Clock } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import EncaissementsContent from "./EncaissementsContent";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TodayPayment = {
  id: string;
  amount: number;
  created_at: string;
  client_name: string;
  product_name: string;
};

export default async function EncaissementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Clients assigned to this commercial (role=user only)
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("assigned_commercial", user.id)
    .eq("role", "user")
    .order("full_name");

  const clientIds = (clients ?? []).map((c) => c.id);

  // 2. Active cotisations for EncaissementsContent (card list)
  let cotisations: any[] = [];
  if (clientIds.length > 0) {
    const { data } = await admin
      .from("cotisations")
      .select("id, user_id, amount_paid, total_price, products(name, price, images)")
      .in("user_id", clientIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    cotisations = (data ?? []).map((c) => {
      const product = Array.isArray(c.products) ? c.products[0] : c.products;
      const client = (clients ?? []).find((cl) => cl.id === c.user_id);
      return {
        id: c.id,
        user_id: c.user_id,
        amount_paid: c.amount_paid as number,
        total_price: c.total_price as number,
        product_name: (product as any)?.name ?? "—",
        product_price: (product as any)?.price ?? (c.total_price as number),
        client_name: client?.full_name ?? "—",
        client_phone: client?.phone ?? null,
      };
    });
  }

  // 3. Today's payments — query directly by user_id (not cotisation_id)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  let totalEncaisse = 0;
  let nbVersements = 0;
  let todayPayments: TodayPayment[] = [];

  if (clientIds.length > 0) {
    const { data: rawPayments } = await admin
      .from("payments")
      .select("id, amount, created_at, user_id, cotisation_id")
      .in("user_id", clientIds)
      .eq("status", "success")
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false });

    totalEncaisse = (rawPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    nbVersements = rawPayments?.length ?? 0;

    if ((rawPayments ?? []).length > 0) {
      // Enrich with product names via cotisations
      const cotIds = Array.from(new Set((rawPayments ?? []).map((p) => p.cotisation_id).filter(Boolean)));
      const { data: cots } = await admin
        .from("cotisations")
        .select("id, products(name)")
        .in("id", cotIds);

      const cotProductMap: Record<string, string> = {};
      (cots ?? []).forEach((c) => {
        const p = Array.isArray(c.products) ? c.products[0] : c.products;
        cotProductMap[c.id] = (p as any)?.name ?? "—";
      });

      const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c.full_name ?? "—"]));

      todayPayments = (rawPayments ?? []).map((p) => ({
        id: p.id,
        amount: p.amount,
        created_at: p.created_at,
        client_name: clientMap[p.user_id] ?? "—",
        product_name: cotProductMap[p.cotisation_id] ?? "—",
      }));
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
        <div className="bg-[#0D3B8C] text-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Wallet className="h-5 w-5 mb-2 opacity-70" />
          <p className="text-2xl font-black">{formatCFA(totalEncaisse)}</p>
          <p className="text-white/70 text-sm mt-0.5">Total encaissé</p>
        </div>
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Clock className="h-5 w-5 mb-2 text-gray-400" />
          <p className="text-2xl font-black text-gray-900">{nbVersements}</p>
          <p className="text-gray-500 text-sm mt-0.5">Versements aujourd&apos;hui</p>
        </div>
      </div>

      {/* Today's payments list */}
      {todayPayments.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Versements du jour</h2>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            {/* Mobile: stacked */}
            <div className="md:hidden divide-y divide-gray-50">
              {todayPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0D3B8C] font-bold text-xs">{p.client_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.client_name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.product_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(p.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Client</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Produit</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Heure</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.client_name}</td>
                    <td className="px-5 py-3 text-gray-500">{p.product_name}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-[#0D3B8C]">{formatCFA(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EncaissementsContent cotisations={cotisations} />
    </div>
  );
}
