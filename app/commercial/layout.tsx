import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import CommercialSidebar from "./CommercialSidebar";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["commercial", "admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CommercialSidebar userName={profile.full_name ?? "Commercial"} />
      <div className="md:ml-60">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between">
          <h1 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Espace Commercial
          </h1>
          <span className="text-xs text-gray-400">{profile.full_name}</span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
