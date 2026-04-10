import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { CommercialSidebar, CommercialBottomNav } from "./CommercialSidebar";
import NotificationBell from "@/components/NotificationBell";

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

  const userName = profile.full_name ?? "Commercial";

  return (
    <div className="min-h-screen bg-gray-50">
      <CommercialSidebar userName={userName} />

      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lamanne-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs">LM</span>
            </div>
            <span className="text-lamanne-primary font-black text-lg">LAMANNE</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
          <div />
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <CommercialBottomNav />
    </div>
  );
}
