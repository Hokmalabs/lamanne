import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[AdminLayout] user.id:", user.id, "| role:", profile?.role ?? "null");

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar isSuperAdmin={profile.role === "super_admin"} />
      <div className="md:ml-60">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center">
          <h1 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Administration LAMANNE
          </h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
