import { Sidebar, BottomNav } from "@/components/navbar";
import NotificationBell from "@/components/NotificationBell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Logo from "@/components/Logo";

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
            <Logo size={32} />
            <span className="text-[#0F5132] font-black text-lg tracking-wide">LAMANNE</span>
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
