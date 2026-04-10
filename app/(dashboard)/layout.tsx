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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (desktop) */}
      <Sidebar userName={userName} />

      {/* Main content */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Top header mobile */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lamanne-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs">LM</span>
            </div>
            <span className="text-lamanne-primary font-black text-lg">LAMANNE</span>
          </div>
          <NotificationBell />
        </header>

        {/* Top bar desktop */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
          <div />
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  );
}
