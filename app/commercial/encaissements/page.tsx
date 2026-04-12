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

export default async function EncaissementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Clients assigned to this commercial (role=user only)
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("assigned_commercial", user.id)
    .eq("role", "user")
    .order("full_name");

  const clientIds = (clients ?? []).map((c) => c.id);

  // Active cotisations with product info (admin client bypasses RLS)
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

  // Today's totals
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayTotal = 0;
  let todayCount = 0;

  if (cotisations.length > 0) {
    const cotIds = cotisations.map((c) => c.id);
    const { data: payments } = await admin
      .from("payments")
      .select("amount")
      .in("cotisation_id", cotIds)
      .gte("paid_at", today.toISOString());
    todayTotal = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    todayCount = payments?.length ?? 0;
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
          <p className="text-2xl font-black">{formatCFA(todayTotal)}</p>
          <p className="text-white/70 text-sm mt-0.5">Total encaissé</p>
        </div>
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Clock className="h-5 w-5 mb-2 text-gray-400" />
          <p className="text-2xl font-black text-gray-900">{todayCount}</p>
          <p className="text-gray-500 text-sm mt-0.5">Versements aujourd&apos;hui</p>
        </div>
      </div>

      <EncaissementsContent cotisations={cotisations} />
    </div>
  );
}
