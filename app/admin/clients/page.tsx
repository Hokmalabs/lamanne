import { createClient } from "@supabase/supabase-js";
import { Search, UserCircle, Phone } from "lucide-react";
import AddClientButton from "./AddClientButton";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let query = admin
    .from("profiles")
    .select("id, full_name, phone, email:id, role, created_at, assigned_commercial")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  const { data: clients } = await query;

  // Get commercials for display
  const { data: commercials } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("role", ["commercial", "admin", "super_admin"]);

  const commercialMap = Object.fromEntries(
    (commercials ?? []).map((c) => [c.id, c.full_name])
  );

  const filtered = (clients ?? []).filter((c) => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} client(s) enregistré(s)</p>
        </div>
        <AddClientButton commercials={commercials ?? []} />
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

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserCircle className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Aucun client trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Client</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Téléphone</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Commercial</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lamanne-primary font-bold text-xs">
                          {client.full_name?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{client.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {client.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {client.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {client.assigned_commercial
                      ? commercialMap[client.assigned_commercial] ?? "—"
                      : <span className="text-gray-300 text-xs">Non assigné</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(client.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
