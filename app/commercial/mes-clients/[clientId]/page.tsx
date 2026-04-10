import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, ArrowLeft, PlusCircle } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import VersementModal from "./VersementModal";
import RemboursementModal from "./RemboursementModal";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify client belongs to this commercial
  const { data: client } = await admin
    .from("profiles")
    .select("id, full_name, phone, assigned_commercial, created_at")
    .eq("id", clientId)
    .single();

  if (!client || client.assigned_commercial !== user.id) notFound();

  // Active cotisations
  const { data: rawCotisations } = await admin
    .from("cotisations")
    .select("id, amount_paid, status, created_at, deadline, products(id, name, price)")
    .eq("user_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const cotisations = (rawCotisations ?? []).map((c) => {
    const product = Array.isArray(c.products) ? c.products[0] : c.products;
    return {
      id: c.id as string,
      amount_paid: c.amount_paid as number,
      deadline: c.deadline as string | null,
      created_at: c.created_at as string,
      product_name: (product as any)?.name ?? "—",
      product_price: (product as any)?.price ?? 0,
    };
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/commercial/mes-clients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Retour à mes clients
      </Link>

      {/* Client card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lamanne-primary font-black text-xl">
              {client.full_name?.charAt(0).toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900">{client.full_name}</h1>
            {client.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Client depuis {new Date(client.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <Link
            href={`/commercial/mes-clients/${clientId}/nouvelle-cotisation`}
            className="inline-flex items-center gap-2 bg-lamanne-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-lamanne-primary/90 transition-colors flex-shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle cotisation</span>
            <span className="sm:hidden">+ Cotisation</span>
          </Link>
        </div>
      </div>

      {/* Cotisations */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Cotisations actives ({cotisations.length})</h2>

        {cotisations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="font-medium">Aucune cotisation active</p>
            <Link href={`/commercial/mes-clients/${clientId}/nouvelle-cotisation`}
              className="mt-3 text-sm text-lamanne-accent hover:underline">
              Démarrer une cotisation
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cotisations.map((cot) => {
              const pct = Math.min(100, Math.round((cot.amount_paid / cot.product_price) * 100));
              const remaining = cot.product_price - cot.amount_paid;
              const daysLeft = cot.deadline
                ? Math.ceil((new Date(cot.deadline).getTime() - Date.now()) / 86400000)
                : null;

              return (
                <div key={cot.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="font-bold text-gray-900">{cot.product_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Démarrée le {new Date(cot.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {daysLeft !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                        daysLeft <= 7 ? "bg-red-100 text-red-600" :
                        daysLeft <= 30 ? "bg-amber-100 text-amber-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {daysLeft > 0 ? `J-${daysLeft}` : "Expiré"}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{formatCFA(cot.amount_paid)} payé</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-lamanne-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Reste : <span className="font-semibold text-lamanne-primary">{formatCFA(remaining)}</span>
                      {" / "}{formatCFA(cot.product_price)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <VersementModal
                      cotisationId={cot.id}
                      productName={cot.product_name}
                      maxAmount={remaining}
                    />
                    <RemboursementModal
                      cotisationId={cot.id}
                      clientId={clientId}
                      productName={cot.product_name}
                      amountPaid={cot.amount_paid}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
