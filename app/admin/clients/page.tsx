import { createClient } from "@supabase/supabase-js";
import AddClientButton from "./AddClientButton";
import ClientsTableWithSearch from "./ClientsTableWithSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminClientsPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(clients ?? []).length} client(s) enregistré(s)</p>
        </div>
        <AddClientButton commercials={commercials ?? []} />
      </div>

      <ClientsTableWithSearch
        clients={clients ?? []}
        commercialMap={commercialMap}
        cotisationCountMap={cotisationCountMap}
      />
    </div>
  );
}
