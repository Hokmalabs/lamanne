import { Sidebar, BottomNav } from "@/components/navbar";
import NotificationBell from "@/components/NotificationBell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "Utilisateur";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profile?.full_name) userName = profile.full_name;
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FC" }}>
      {/* Sidebar desktop */}
      <Sidebar userName={userName} />

      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-white px-5 h-14 flex items-center justify-between" style={{ boxShadow: "0 1px 0 #E2E6EF" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0D3B8C] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs">LM</span>
            </div>
            <span className="text-[#0D3B8C] font-black text-lg tracking-wide">LAMANNE</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end px-8 py-4 bg-white border-b border-gray-100">
          <NotificationBell />
        </div>

        {/* Page content — pb-20 so bottom nav doesn't overlap */}
        <main className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <BottomNav />
    </div>
  );
}
