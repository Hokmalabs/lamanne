import { createClient } from "@supabase/supabase-js";
import AddMemberButton from "./AddMemberButton";
import EquipeTableWithSearch from "./EquipeTableWithSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminEquipePage() {
  const { data: team } = await admin
    .from("profiles")
    .select("id, full_name, phone, role, created_at, is_suspended")
    .in("role", ["super_admin", "admin", "commercial"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: false });

  const members = team ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Équipe</h1>
          <p className="text-gray-500 text-sm mt-0.5">{members.length} membre(s) de l&apos;équipe</p>
        </div>
        <AddMemberButton />
      </div>

      <EquipeTableWithSearch members={members} />
    </div>
  );
}
