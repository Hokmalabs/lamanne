"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export function RemboursementActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleDecision = async (action: "approve" | "reject") => {
    setLoading(action);
    await fetch(`/api/admin/remboursements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
        onClick={() => handleDecision("reject")}
        disabled={!!loading}
      >
        {loading === "reject" ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            Rejet...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejeter
          </span>
        )}
      </Button>
      <Button
        className="flex-1 bg-lamanne-success hover:bg-lamanne-success/90"
        onClick={() => handleDecision("approve")}
        disabled={!!loading}
      >
        {loading === "approve" ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Traitement...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approuver
          </span>
        )}
      </Button>
    </div>
  );
}
