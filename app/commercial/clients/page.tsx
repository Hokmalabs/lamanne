import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Users, Phone, ClipboardList } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommercialClientsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("assigned_commercial", user.id)
    .order("created_at", { ascending: false });

  const list = clients ?? [];

  // Count cotisations per client
  const cotisationsMap: Record<string, number> = {};
  if (list.length > 0) {
    const { data: cotisations } = await admin
      .from("cotisations")
      .select("user_id")
      .in("user_id", list.map((c) => c.id));

    (cotisations ?? []).forEach((c) => {
      cotisationsMap[c.user_id] = (cotisationsMap[c.user_id] ?? 0) + 1;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Mes clients</h1>
        <p className="text-gray-500 text-sm mt-0.5">{list.length} client(s) assigné(s)</p>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Aucun client assigné</p>
          <p className="text-sm mt-1">Contactez un admin pour vous assigner des clients.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lamanne-primary font-bold text-sm">
                    {client.full_name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{client.full_name ?? "—"}</p>
                  {client.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {cotisationsMap[client.id] ?? 0} cotisation(s)
                </span>
                <Link
                  href={`/commercial/nouvelle-cotisation?client=${client.id}`}
                  className="text-xs bg-lamanne-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-lamanne-primary/90 transition-colors"
                >
                  + Cotisation
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
