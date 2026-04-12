"use client";

import { useState } from "react";
import { Search, UserCircle, Phone, ClipboardList } from "lucide-react";

type Client = {
  id: string;
  full_name: string | null;
  phone: string | null;
  assigned_commercial: string | null;
  created_at: string;
};

type Commercial = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export default function ClientsTableWithSearch({
  clients,
  commercialMap,
  cotisationCountMap,
}: {
  clients: Client[];
  commercialMap: Record<string, Commercial>;
  cotisationCountMap: Record<string, number>;
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
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D3B8C]/20"
          style={{ fontSize: "16px" }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400" style={{ boxShadow: "var(--shadow-sm)" }}>
          <UserCircle className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Aucun client trouvé</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((client) => {
              const comm = client.assigned_commercial ? commercialMap[client.assigned_commercial] : null;
              const cotCount = cotisationCountMap[client.id] ?? 0;
              return (
                <div key={client.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#0D3B8C] font-bold text-sm">
                        {client.full_name?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{client.full_name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{client.phone ?? "—"}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cotCount > 0 ? "bg-[#E8F1FB] text-[#0D3B8C]" : "bg-gray-100 text-gray-500"}`}>
                      <ClipboardList className="h-3 w-3" />{cotCount}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-between pt-2 border-t border-gray-50">
                    <span>{comm ? comm.full_name : <span className="italic">Autonome</span>}</span>
                    <span>{new Date(client.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-500">Client</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500">Téléphone</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500">Commercial</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500">Cotisations actives</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => {
                  const comm = client.assigned_commercial ? commercialMap[client.assigned_commercial] : null;
                  const cotCount = cotisationCountMap[client.id] ?? 0;
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                            <span className="text-[#0D3B8C] font-bold text-xs">
                              {client.full_name?.charAt(0).toUpperCase() ?? "?"}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{client.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {client.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {client.phone}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {comm ? (
                          <div>
                            <p className="font-medium text-gray-900 text-xs">{comm.full_name}</p>
                            {comm.phone && <p className="text-xs text-gray-400">{comm.phone}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Autonome</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                          <span className={cotCount > 0 ? "font-semibold text-gray-900" : "text-gray-400"}>
                            {cotCount}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {new Date(client.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
