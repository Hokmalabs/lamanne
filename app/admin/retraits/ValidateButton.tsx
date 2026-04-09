"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PackageCheck } from "lucide-react";

export function ValidateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    await fetch(`/api/admin/retraits/${id}`, { method: "PATCH" });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button className="w-full" onClick={handleValidate} disabled={loading}>
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Validation...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4" />
          Valider le retrait
        </span>
      )}
    </Button>
  );
}
