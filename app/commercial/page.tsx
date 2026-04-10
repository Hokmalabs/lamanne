import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Users, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCFA } from "@/lib/utils";
import DashboardContent from "@/components/DashboardContent";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommercialPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Clients assigned to this commercial
  const { data: clients } = await admin
    .from("profiles")
    .select("id")
    .eq("assigned_commercial", user.id);

  const clientIds = (clients ?? []).map((c) => c.id);

  // Active cotisations for these clients
  let activeClientsCount = 0;
  let todayTotal = 0;

  if (clientIds.length > 0) {
    const { data: activeCots } = await admin
      .from("cotisations")
      .select("id, user_id")
      .in("user_id", clientIds)
      .eq("status", "active");

    const uniqueClientsWithActive = new Set((activeCots ?? []).map((c) => c.user_id));
    activeClientsCount = uniqueClientsWithActive.size;

    // Today's encaissements
    const cotIds = (activeCots ?? []).map((c) => c.id);
    if (cotIds.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: payments } = await admin
        .from("payments")
        .select("amount")
        .in("cotisation_id", cotIds)
        .gte("paid_at", today.toISOString());
      todayTotal = (payments ?? []).reduce((s, p) => s + p.amount, 0);
    }
  }

  return (
    <div className="space-y-6">
      {/* Commercial summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/commercial/mes-clients"
          className="bg-lamanne-primary text-white rounded-2xl p-5 hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-2xl font-black">{activeClientsCount}</p>
          <p className="text-white/70 text-sm mt-0.5">Clients actifs</p>
        </Link>

        <Link
          href="/commercial/encaissements"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
          </div>
          <p className="text-2xl font-black text-gray-900">{formatCFA(todayTotal)}</p>
          <p className="text-sm text-gray-500 mt-0.5">Encaissé aujourd&apos;hui</p>
        </Link>

        <Link
          href="/commercial/mes-clients"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
          </div>
          <p className="text-2xl font-black text-gray-900">{clientIds.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total clients assignés</p>
        </Link>
      </div>

      <div className="border-t border-gray-100 pt-2" />

      {/* Client's own dashboard */}
      <DashboardContent showGreeting={true} />
    </div>
  );
}
