"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
}

const TYPE_STYLES: Record<string, string> = {
  success: "bg-green-50 border-green-200",
  warning: "bg-amber-50 border-amber-200",
  error:   "bg-red-50 border-red-200",
  info:    "bg-blue-50 border-blue-200",
};

const DOT_STYLES: Record<string, string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  error:   "bg-red-500",
  info:    "bg-blue-500",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let userId: string | null = null;

    async function loadAndSubscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // Initial fetch
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, type, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications((data as Notification[]) ?? []);

      // Realtime subscription
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    loadAndSubscribe();
  }, []);

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", ids);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open && unread > 0) markAllRead(); }}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-sm text-gray-900">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-lamanne-accent hover:underline"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 border-l-4 transition-colors",
                      TYPE_STYLES[n.type] ?? TYPE_STYLES.info,
                      !n.read && "bg-opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", DOT_STYLES[n.type] ?? DOT_STYLES.info)} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
