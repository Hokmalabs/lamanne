import { createClient } from "@supabase/supabase-js";
import { Search, UserCircle, Phone, ClipboardList } from "lucide-react";
import AddClientButton from "./AddClientButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const [
    { data: clients },
    { data: commercials },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, phone, assigned_commercial, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "commercial")
      .eq("is_suspended", false)
      .order("full_name"),
  ]);

  const commercialMap = Object.fromEntries(
    (commercials ?? []).map((c) => [c.id, c])
  );

  // Cotisation counts per client
  const clientIds = (clients ?? []).map((c) => c.id);
  let cotisationCountMap: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: cots } = await admin
      .from("cotisations")
      .select("user_id")
      .in("user_id", clientIds)
      .eq("status", "active");
    (cots ?? []).forEach((c) => {
      cotisationCountMap[c.user_id] = (cotisationCountMap[c.user_id] ?? 0) + 1;
    });
  }

  const filtered = (clients ?? []).filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return c.full_name?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(clients ?? []).length} client(s) enregistré(s)</p>
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
                <th className="text-left px-6 py-3 font-semibold text-gray-500 hidden sm:table-cell">Téléphone</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Commercial</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500 hidden md:table-cell">Cotisations actives</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500 hidden lg:table-cell">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((client) => {
                const comm = client.assigned_commercial ? commercialMap[client.assigned_commercial] : null;
                const cotCount = cotisationCountMap[client.id] ?? 0;
                return (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lamanne-primary font-bold text-xs">
                            {client.full_name?.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{client.full_name ?? "—"}</span>
                          <p className="text-xs text-gray-400 sm:hidden">{client.phone ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">
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
                      {comm ? (
                        <div>
                          <p className="font-medium text-gray-900 text-xs">{comm.full_name}</p>
                          {comm.phone && <p className="text-xs text-gray-400">{comm.phone}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Autonome</span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                        <span className={cotCount > 0 ? "font-semibold text-gray-900" : "text-gray-400"}>
                          {cotCount}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs hidden lg:table-cell">
                      {new Date(client.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
