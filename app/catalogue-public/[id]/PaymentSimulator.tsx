"use client";

import { useState } from "react";
import { formatCFA } from "@/lib/utils";
import { Calculator } from "lucide-react";

export default function PaymentSimulator({
  price,
  maxMonths,
}: {
  price: number;
  maxMonths: number;
}) {
  const [months, setMonths] = useState(Math.ceil(maxMonths / 2));
  const [firstPayment, setFirstPayment] = useState(Math.round(price * 0.1 / 1000) * 1000);

  const remaining = Math.max(0, price - firstPayment);
  const dailyNeeded = months > 0 ? Math.ceil(remaining / (months * 30)) : 0;
  const weeklyNeeded = months > 0 ? Math.ceil(remaining / (months * 4)) : 0;
  const monthlyNeeded = months > 0 ? Math.ceil(remaining / months) : 0;

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-[#0D3B8C]" />
        <h2 className="font-bold text-gray-900">Simulateur de paiement</h2>
      </div>

      <div className="space-y-5">
        {/* First payment slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Premier versement</label>
            <span className="font-black text-[#0D3B8C]">{formatCFA(firstPayment)}</span>
          </div>
          <input
            type="range"
            min={1000}
            max={price}
            step={1000}
            value={firstPayment}
            onChange={(e) => setFirstPayment(Number(e.target.value))}
            className="w-full accent-[#0D3B8C]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 000 FCFA</span>
            <span>{formatCFA(price)}</span>
          </div>
        </div>

        {/* Duration slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Durée souhaitée</label>
            <span className="font-black text-[#0D3B8C]">{months} mois</span>
          </div>
          <input
            type="range"
            min={1}
            max={maxMonths}
            step={1}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full accent-[#0D3B8C]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 mois</span>
            <span>{maxMonths} mois</span>
          </div>
        </div>

        {/* Results */}
        <div className="bg-[#F8F9FC] rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Reste à verser</span>
            <span className="font-black text-gray-900">{formatCFA(remaining)}</span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl p-3" style={{ boxShadow: "var(--shadow-sm)" }}>
              <p className="text-xs text-gray-400 mb-1">Par jour</p>
              <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(dailyNeeded)}</p>
            </div>
            <div className="bg-white rounded-xl p-3" style={{ boxShadow: "var(--shadow-sm)" }}>
              <p className="text-xs text-gray-400 mb-1">Par semaine</p>
              <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(weeklyNeeded)}</p>
            </div>
            <div className="bg-white rounded-xl p-3" style={{ boxShadow: "var(--shadow-sm)" }}>
              <p className="text-xs text-gray-400 mb-1">Par mois</p>
              <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(monthlyNeeded)}</p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-400">
            Ces montants sont des estimations. Vous versez librement à votre rythme.
          </p>
        </div>
      </div>
    </div>
  );
}
