"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { apiPatch } from "@/lib/api-client";

export function RemboursementActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleDecision = async (action: "approve" | "reject") => {
    setLoading(action);
    try {
      await apiPatch(`/api/admin/remboursements/${id}`, { action });
      router.refresh();
    } catch (e) {
      console.error("[RemboursementActions]", e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        variant="outline"
        className="w-full sm:flex-1 border-lamanne-danger/30 text-lamanne-danger hover:bg-lamanne-danger/5"
        onClick={() => handleDecision("reject")}
        disabled={!!loading}
      >
        {loading === "reject" ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-lamanne-danger border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Rejet...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            Rejeter
          </span>
        )}
      </Button>
      <Button
        className="w-full sm:flex-1 bg-lamanne-primary hover:bg-lamanne-primary/90"
        onClick={() => handleDecision("approve")}
        disabled={!!loading}
      >
        {loading === "approve" ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Traitement...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Approuver
          </span>
        )}
      </Button>
    </div>
  );
}
