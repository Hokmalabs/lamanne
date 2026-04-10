"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Wallet,
  LogOut,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/commercial",                   label: "Vue générale",        icon: LayoutDashboard, exact: true },
  { href: "/commercial/clients",           label: "Mes clients",         icon: Users },
  { href: "/commercial/nouvelle-cotisation", label: "Nouvelle cotisation", icon: PlusCircle },
  { href: "/commercial/encaissements",     label: "Encaissements",       icon: Wallet },
];

export default function CommercialSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-60 bg-gray-900 min-h-screen fixed left-0 top-0 z-30">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-lamanne-accent rounded-xl flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Commercial</p>
            <p className="text-white/40 text-xs truncate max-w-[120px]">{userName}</p>
          </div>
        </div>
      </div>

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
                  ? "bg-lamanne-accent text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

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
