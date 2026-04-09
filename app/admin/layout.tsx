"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  RefreshCw,
  PackageCheck,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/admin",              label: "Vue générale",    icon: LayoutDashboard, exact: true },
  { href: "/admin/produits",     label: "Produits",        icon: ShoppingBag },
  { href: "/admin/cotisations",  label: "Cotisations",     icon: ClipboardList },
  { href: "/admin/remboursements", label: "Remboursements", icon: RefreshCw },
  { href: "/admin/retraits",     label: "Retraits",        icon: PackageCheck },
];

function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-60 bg-gray-900 min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-lamanne-primary rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">LAMANNE Admin</p>
            <p className="text-white/40 text-xs">Back-office</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-lamanne-primary text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Retour dashboard + logout */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard client
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-white/8 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="md:ml-60">
        {/* Top bar */}
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
