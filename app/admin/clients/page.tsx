import AddClientButton from "./AddClientButton";
import ClientsTableWithSearch from "./ClientsTableWithSearch";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePageAuth } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientsPage() {
  await requirePageAuth(["admin", "super_admin"]);
  const [
    { data: clients },
    { data: commercials },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, assigned_commercial, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "commercial")
      .eq("is_suspended", false)
      .order("full_name"),
  ]);

  const commercialMap = Object.fromEntries(
    (commercials ?? []).map((c) => [c.id, c])
  );

  const clientIds = (clients ?? []).map((c) => c.id);
  const cotisationCountMap: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: cots } = await supabaseAdmin
      .from("cotisations")
      .select("user_id")
      .in("user_id", clientIds)
      .eq("status", "active");
    (cots ?? []).forEach((c) => {
      cotisationCountMap[c.user_id] = (cotisationCountMap[c.user_id] ?? 0) + 1;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-sora text-2xl font-black text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {(clients ?? []).length} client(s) enregistré(s)
          </p>
        </div>
        <div className="w-full sm:w-auto flex-shrink-0 [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
          <AddClientButton commercials={commercials ?? []} />
        </div>
      </div>

      <ClientsTableWithSearch
        clients={clients ?? []}
        commercialMap={commercialMap}
        cotisationCountMap={cotisationCountMap}
      />
    </div>
  );
}
