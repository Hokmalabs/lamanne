import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Users, Wallet, ClipboardList, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCFA } from "@/lib/utils";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommercialDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileData } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Clients assigned to this commercial
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("assigned_commercial", user.id)
    .order("full_name");

  const clientIds = (clients ?? []).map((c) => c.id);

  // Active cotisations
  let activeCotisations: { id: string; user_id: string; amount_paid: number; products: { name: string; price: number } | null }[] = [];
  if (clientIds.length > 0) {
    const { data } = await admin
      .from("cotisations")
      .select("id, user_id, amount_paid, products(name, price)")
      .in("user_id", clientIds)
      .eq("status", "active");
    activeCotisations = (data ?? []) as unknown as typeof activeCotisations;
  }

  // Today's payments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayTotal = 0;
  let todayCount = 0;

  if (clientIds.length > 0) {
    const cotisationIds = activeCotisations.map((c) => c.id);
    if (cotisationIds.length > 0) {
      const { data: payments } = await admin
        .from("payments")
        .select("amount, paid_at")
        .in("cotisation_id", cotisationIds)
        .gte("paid_at", today.toISOString());
      todayTotal = (payments ?? []).reduce((s, p) => s + p.amount, 0);
      todayCount = (payments ?? []).length;
    }
  }

  const cotisationsPerClient: Record<string, number> = {};
  activeCotisations.forEach((c) => {
    cotisationsPerClient[c.user_id] = (cotisationsPerClient[c.user_id] ?? 0) + 1;
  });

  const firstName = profileData?.full_name?.split(" ")[0] ?? "Commercial";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Bonjour, {firstName} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-lamanne-primary text-white rounded-2xl p-5">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black">{formatCFA(todayTotal)}</p>
          <p className="text-white/70 text-sm mt-0.5">Encaissé aujourd&apos;hui</p>
        </div>

        <Link href="/commercial/encaissements" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black text-gray-900">{todayCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Versements aujourd&apos;hui</p>
        </Link>

        <Link href="/commercial/clients" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-3">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black text-gray-900">{clientIds.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Clients assignés</p>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/commercial/clients"
          className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-lamanne-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-6 w-6 text-lamanne-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">Enregistrer un versement</p>
            <p className="text-gray-500 text-sm">Sélectionner un client et une cotisation</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </Link>

        <Link
          href="/commercial/clients"
          className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-lamanne-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-6 w-6 text-lamanne-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">Nouvelle cotisation</p>
            <p className="text-gray-500 text-sm">Démarrer pour un client</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </Link>
      </div>

      {/* Clients with active cotisations */}
      {clients && clients.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Mes clients ({clients.length})</h2>
            <Link href="/commercial/clients" className="text-sm text-lamanne-accent hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {clients.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/commercial/clients/${c.id}`}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lamanne-primary font-bold text-sm">
                    {c.full_name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name}</p>
                  <p className="text-xs text-gray-400">{c.phone ?? "—"}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {cotisationsPerClient[c.id] ?? 0} cotisation(s)
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
