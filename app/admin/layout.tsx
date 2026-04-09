import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("[Admin Layout] user:", user?.id ?? "null", "| error:", userError?.message ?? "none");

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  console.log("[Admin Layout] profile:", JSON.stringify(profile), "| error:", profileError?.message ?? "none");

  if (!profile || profile.role !== "admin") {
    console.log("[Admin Layout] role check failed → redirect /dashboard");
    redirect("/dashboard");
  }

  console.log("[Admin Layout] access granted ✓");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
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
