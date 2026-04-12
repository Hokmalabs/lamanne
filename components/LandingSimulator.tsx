"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

function formatCFALocal(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export default function LandingSimulator() {
  const [price, setPrice] = useState(150000);
  const [months, setMonths] = useState(6);

  const dailyCost = Math.ceil(price / (months * 30));
  const weeklyCost = Math.ceil(price / (months * 4));
  const monthlyCost = Math.ceil(price / months);

  return (
    <section className="py-20 bg-[#0D3B8C]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-[#378ADD] font-semibold text-sm uppercase tracking-widest mb-3">
            Simulateur
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Combien ça me coûte par jour ?
          </h2>
          <p className="text-white/60 mt-3">
            Ajustez le prix et la durée — voyez votre effort quotidien.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 space-y-8">
          {/* Price slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-bold text-gray-800">Prix de l&apos;article</label>
              <span className="font-black text-2xl text-[#0D3B8C]">{formatCFALocal(price)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={2000000}
              step={5000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-[#0D3B8C]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10 000 FCFA</span>
              <span>2 000 000 FCFA</span>
            </div>
          </div>

          {/* Duration slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-bold text-gray-800">Durée de cotisation</label>
              <span className="font-black text-2xl text-[#0D3B8C]">{months} mois</span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-[#0D3B8C]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 mois</span>
              <span>24 mois</span>
            </div>
          </div>

          {/* Result cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#E8F1FB] rounded-2xl p-4 text-center">
              <p className="text-xs text-[#0D3B8C]/60 font-medium mb-1">Par jour</p>
              <p className="font-black text-[#0D3B8C] text-lg">{formatCFALocal(dailyCost)}</p>
            </div>
            <div className="bg-[#0D3B8C] rounded-2xl p-4 text-center">
              <p className="text-xs text-white/60 font-medium mb-1">Par semaine</p>
              <p className="font-black text-white text-lg">{formatCFALocal(weeklyCost)}</p>
            </div>
            <div className="bg-[#E8F1FB] rounded-2xl p-4 text-center">
              <p className="text-xs text-[#0D3B8C]/60 font-medium mb-1">Par mois</p>
              <p className="font-black text-[#0D3B8C] text-lg">{formatCFALocal(monthlyCost)}</p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            Sans intérêts · Sans frais cachés · Vous versez librement à votre rythme
          </p>
        </div>
      </div>
    </section>
  );
}
