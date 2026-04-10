import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Users, Phone, ClipboardList, ArrowRight, UserPlus } from "lucide-react";
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
    .order("full_name");

  const list = clients ?? [];

  // Active cotisation counts per client
  const cotisationsMap: Record<string, number> = {};
  if (list.length > 0) {
    const { data: cotisations } = await admin
      .from("cotisations")
      .select("user_id")
      .in("user_id", list.map((c) => c.id))
      .eq("status", "active");

    (cotisations ?? []).forEach((c) => {
      cotisationsMap[c.user_id] = (cotisationsMap[c.user_id] ?? 0) + 1;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{list.length} client(s) assigné(s)</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Aucun client assigné</p>
          <p className="text-sm mt-1">Contactez un admin pour vous assigner des clients.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Client</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Téléphone</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Cotisations actives</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lamanne-primary font-bold text-sm">
                          {client.full_name?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-400">
                          Client depuis {new Date(client.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {client.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {client.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                      <span className={cotisationsMap[client.id] ? "font-semibold text-gray-900" : "text-gray-400"}>
                        {cotisationsMap[client.id] ?? 0}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/commercial/clients/${client.id}`}
                      className="inline-flex items-center gap-1.5 text-xs bg-lamanne-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-lamanne-primary/90 transition-colors"
                    >
                      Voir
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
