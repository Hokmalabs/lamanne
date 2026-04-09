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
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/catalogue", label: "Catalogue", icon: ShoppingBag },
  { href: "/cotisations", label: "Cotisations", icon: ClipboardList },
  { href: "/historique", label: "Historique", icon: History },
  { href: "/profil", label: "Profil", icon: User },
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
    <aside className="hidden md:flex flex-col w-64 bg-lamanne-primary min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-lamanne-primary font-black text-sm">LM</span>
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-wide">LAMANNE</h1>
            <p className="text-white/50 text-xs">Cotisation progressive</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-lamanne-primary shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Profil utilisateur */}
      <div className="p-4 border-t border-white/10">
        <Link href="/profil" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar className="h-9 w-9">
            {userAvatar && <AvatarImage src={userAvatar} />}
            <AvatarFallback className="text-xs bg-lamanne-accent text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
            <p className="text-white/50 text-xs">Voir le profil</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all",
                isActive ? "text-lamanne-primary" : "text-gray-400"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
