"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCFA } from "@/lib/utils";
import { Trophy } from "lucide-react";

type DayData = { date: string; total: number };
type TopClient = { name: string; total: number };

const MEDAL_COLORS = ["#F5A623", "#9CA3AF", "#CD7F32"];
const MEDAL_LABELS = ["🥇", "🥈", "🥉"];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function CommercialStatsCharts({
  dailyData,
  topClients,
  completionRate,
}: {
  dailyData: DayData[];
  topClients: TopClient[];
  completionRate: number;
}) {
  const maxVal = Math.max(...dailyData.map((d) => d.total), 1);

  return (
    <div className="space-y-5">
      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-bold text-gray-900 mb-4">Versements des 7 derniers jours</h2>
        {dailyData.every((d) => d.total === 0) ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            Aucun versement cette semaine
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8F9FC" }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {dailyData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.total === maxVal && entry.total > 0 ? "#0D3B8C" : "#E8F1FB"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top clients */}
      {topClients.length > 0 && (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-[#F5A623]" />
            <h2 className="font-bold text-gray-900">Top 3 clients</h2>
          </div>
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0 w-8 text-center">{MEDAL_LABELS[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{c.name}</p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((c.total / topClients[0].total) * 100)}%`,
                        background: MEDAL_COLORS[i],
                      }}
                    />
                  </div>
                </div>
                <span className="font-black text-sm flex-shrink-0" style={{ color: MEDAL_COLORS[i] }}>
                  {formatCFA(c.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion rate */}
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-bold text-gray-900 mb-3">Taux de complétion global</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${completionRate}%`,
                  background: completionRate >= 70 ? "#2D9B6F" : completionRate >= 30 ? "#F5A623" : "#E55353",
                }}
              />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 w-16 text-right">{completionRate}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Part des cotisations terminées parmi toutes les cotisations de vos clients.
        </p>
      </div>
    </div>
  );
}
