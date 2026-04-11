import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import AddClientModal from "./AddClientModal";
import ClientsListWithSearch from "./ClientsListWithSearch";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MesClientsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("assigned_commercial", user.id)
    .order("full_name");

  const list = clients ?? [];

  const cotisationsMap: Record<string, number> = {};
  const lastPaymentMap: Record<string, string> = {};

  if (list.length > 0) {
    const { data: cots } = await admin
      .from("cotisations")
      .select("id, user_id")
      .in("user_id", list.map((c) => c.id))
      .eq("status", "active");

    (cots ?? []).forEach((c) => {
      cotisationsMap[c.user_id] = (cotisationsMap[c.user_id] ?? 0) + 1;
    });

    const cotIds = (cots ?? []).map((c) => c.id);
    if (cotIds.length > 0) {
      const { data: payments } = await admin
        .from("payments")
        .select("cotisation_id, paid_at, cotisations!inner(user_id)")
        .in("cotisation_id", cotIds)
        .order("paid_at", { ascending: false });

      (payments ?? []).forEach((p: any) => {
        const uid = p.cotisations?.user_id;
        if (uid && !lastPaymentMap[uid]) {
          lastPaymentMap[uid] = p.paid_at;
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{list.length} client(s) assigné(s)</p>
        </div>
        <AddClientModal commercialId={user.id} />
      </div>

      <ClientsListWithSearch
        clients={list}
        cotisationsMap={cotisationsMap}
        lastPaymentMap={lastPaymentMap}
      />
    </div>
  );
}
