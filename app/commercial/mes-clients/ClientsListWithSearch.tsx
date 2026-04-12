"use client";

import { useState } from "react";
import { Search, Users, Phone, ClipboardList, ArrowRight } from "lucide-react";
import Link from "next/link";

type Client = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

export default function ClientsListWithSearch({
  clients,
  cotisationsMap,
  lastPaymentMap,
}: {
  clients: Client[];
  cotisationsMap: Record<string, number>;
  lastPaymentMap: Record<string, string>;
}) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s);
  });

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D3B8C]/20 bg-white"
          style={{ fontSize: "16px" }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">{search ? "Aucun résultat" : "Aucun client assigné"}</p>
          {!search && <p className="text-sm mt-1">Ajoutez votre premier client.</p>}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/commercial/mes-clients/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-4 active:scale-98 transition-transform"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div className="w-11 h-11 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0D3B8C] font-bold text-base">
                    {c.full_name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{c.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.phone ?? "—"}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <ClipboardList className="h-3 w-3" />
                      {cotisationsMap[c.id] ?? 0} cot.
                    </span>
                    {lastPaymentMap[c.id] && (
                      <span className="text-xs text-gray-400">
                        {new Date(lastPaymentMap[c.id]).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Client</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Téléphone</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Cotisations</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Dernier versement</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#0D3B8C] font-bold text-sm">
                            {c.full_name?.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">{c.full_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {c.phone}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                        <span className={cotisationsMap[c.id] ? "font-semibold text-gray-900" : "text-gray-400"}>
                          {cotisationsMap[c.id] ?? 0}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {lastPaymentMap[c.id]
                        ? new Date(lastPaymentMap[c.id]).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/commercial/mes-clients/${c.id}`}
                        className="inline-flex items-center gap-1.5 text-xs bg-[#0D3B8C] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#0D3B8C]/90 transition-colors"
                      >
                        Gérer
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
