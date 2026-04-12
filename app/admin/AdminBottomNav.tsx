"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Users,
  MoreHorizontal,
  PackageCheck,
  RefreshCw,
  UserCog,
  LogOut,
  X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const mainNavItems = [
  { href: "/admin",             label: "Général",       icon: LayoutDashboard, exact: true },
  { href: "/admin/produits",    label: "Produits",      icon: ShoppingBag },
  { href: "/admin/cotisations", label: "Cotisations",   icon: ClipboardList },
  { href: "/admin/clients",     label: "Clients",       icon: Users },
];

export default function AdminBottomNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
        style={{ background: "#1a1f36", boxShadow: "0 -2px 16px rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center justify-around" style={{ height: 64 }}>
          {mainNavItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-10 h-7 rounded-xl transition-all",
                    isActive ? "bg-[#0D3B8C]" : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all",
                      isActive ? "text-white stroke-[2.5]" : "text-white/40"
                    )}
                  />
                </span>
                <span className={cn("text-[10px] font-semibold", isActive ? "text-white" : "text-white/40")}>
                  {label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <span className="flex items-center justify-center w-10 h-7 rounded-xl">
              <MoreHorizontal className="h-5 w-5 text-white/40" />
            </span>
            <span className="text-[10px] font-semibold text-white/40">Plus</span>
          </button>
        </div>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl p-6 pb-10 sheet-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            <div className="space-y-1">
              {[
                { href: "/admin/remboursements", label: "Remboursements", icon: RefreshCw },
                { href: "/admin/retraits",       label: "Retraits",       icon: PackageCheck },
                ...(isSuperAdmin ? [{ href: "/admin/equipe", label: "Équipe", icon: UserCog }] : []),
                { href: "/dashboard",            label: "Dashboard client", icon: LayoutDashboard },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
                >
                  <Icon className="h-5 w-5 text-white/50" />
                  <span className="font-medium text-sm">{label}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium text-sm">Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
