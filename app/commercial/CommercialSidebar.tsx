"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Wallet,
  User,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/commercial",               label: "Accueil",        icon: LayoutDashboard, exact: true },
  { href: "/commercial/catalogue",      label: "Catalogue",      icon: ShoppingBag },
  { href: "/commercial/mes-clients",   label: "Mes clients",    icon: Users },
  { href: "/commercial/encaissements", label: "Encaissements",  icon: Wallet },
  { href: "/profil",                   label: "Profil",         icon: User },
];

export function CommercialSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-lamanne-primary min-h-screen fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-lamanne-primary font-black text-sm">LM</span>
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-wide">LAMANNE</h1>
            <p className="text-white/50 text-xs">Espace commercial</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href + "/") || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-lamanne-primary shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <Link href="/profil" className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs bg-lamanne-accent text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
            <p className="text-white/50 text-xs">Commercial</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-red-300 hover:bg-white/8 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

export function CommercialBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href + "/") || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all",
                isActive ? "text-lamanne-primary" : "text-gray-400"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
