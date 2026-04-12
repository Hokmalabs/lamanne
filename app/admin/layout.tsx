import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminSidebar from "./AdminSidebar";
import AdminBottomNav from "./AdminBottomNav";

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

  const isSuperAdmin = profile.role === "super_admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <AdminSidebar isSuperAdmin={isSuperAdmin} />

      <div className="md:ml-60 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header
          className="md:hidden sticky top-0 z-20 px-4 h-14 flex items-center justify-between"
          style={{ background: "#1a1f36" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0D3B8C] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs">LM</span>
            </div>
            <span className="text-white font-black text-base tracking-wide">Admin</span>
          </div>
          <span className="text-white/40 text-xs font-medium">
            {isSuperAdmin ? "Super Admin" : "Back-office"}
          </span>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex bg-white border-b border-gray-100 px-6 h-14 items-center">
          <h1 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Administration LAMANNE
          </h1>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
