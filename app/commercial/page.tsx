import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Users, Wallet, ClipboardList, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommercialDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Clients assigned to this commercial
  const { data: clients } = await admin
    .from("profiles")
    .select("id")
    .eq("assigned_commercial", user.id);

  const clientIds = (clients ?? []).map((c) => c.id);

  // Cotisations for these clients
  let cotisationsCount = 0;
  let totalCollected = 0;

  if (clientIds.length > 0) {
    const { data: cotisations } = await admin
      .from("cotisations")
      .select("id, amount_paid")
      .in("user_id", clientIds);

    cotisationsCount = (cotisations ?? []).length;
    totalCollected = (cotisations ?? []).reduce((sum, c) => sum + (c.amount_paid ?? 0), 0);
  }

  const stats = [
    {
      label: "Clients",
      value: clientIds.length,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      href: "/commercial/clients",
    },
    {
      label: "Cotisations actives",
      value: cotisationsCount,
      icon: ClipboardList,
      color: "bg-green-50 text-green-600",
      href: "/commercial/clients",
    },
    {
      label: "Total encaissé",
      value: `${totalCollected.toLocaleString("fr-FR")} F`,
      icon: Wallet,
      color: "bg-purple-50 text-purple-600",
      href: "/commercial/encaissements",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Bonjour 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Voici un résumé de votre activité.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/commercial/nouvelle-cotisation"
          className="bg-lamanne-primary text-white rounded-2xl p-5 flex items-center gap-4 hover:bg-lamanne-primary/90 transition-colors"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold">Nouvelle cotisation</p>
            <p className="text-white/70 text-sm">Démarrer une cotisation pour un client</p>
          </div>
        </Link>

        <Link
          href="/commercial/encaissements"
          className="bg-lamanne-accent text-white rounded-2xl p-5 flex items-center gap-4 hover:bg-lamanne-accent/90 transition-colors"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold">Enregistrer un versement</p>
            <p className="text-white/70 text-sm">Encaisser un paiement client</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
