"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  History,
  User,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",   label: "Accueil",     icon: LayoutDashboard },
  { href: "/catalogue",   label: "Catalogue",   icon: ShoppingBag },
  { href: "/cotisations", label: "Cotisations", icon: ClipboardList },
  { href: "/historique",  label: "Historique",  icon: History },
  { href: "/profil",      label: "Profil",      icon: User },
];

interface NavbarProps {
  userName?: string;
  userAvatar?: string;
}

export function Sidebar({ userName = "Utilisateur", userAvatar }: NavbarProps) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0D3B8C] min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <span className="text-[#0D3B8C] font-black text-sm">LM</span>
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-wide">LAMANNE</h1>
            <p className="text-white/40 text-xs">Cotisation progressive</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-white/15 text-white border-l-[3px] border-white pl-[13px]"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Avatar bas */}
      <div className="p-4 border-t border-white/10">
        <Link href="/profil" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar className="h-9 w-9">
            {userAvatar && <AvatarImage src={userAvatar} />}
            <AvatarFallback className="text-xs bg-[#378ADD] text-white font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
            <p className="text-white/40 text-xs">Voir le profil</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
      style={{ background: "#fff", boxShadow: "0 -2px 16px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-around" style={{ height: 64 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-0"
            >
              <span
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-xl transition-all",
                  isActive ? "bg-[#E8F1FB]" : ""
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive ? "text-[#0D3B8C] stroke-[2.5]" : "text-gray-400"
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-none transition-all",
                  isActive ? "text-[#0D3B8C]" : "text-gray-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
