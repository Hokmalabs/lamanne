"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react";

export default function MemberActions({
  memberId,
  isSuspended,
}: {
  memberId: string;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doAction = async (action: "suspend" | "reactivate" | "delete") => {
    setLoading(action);
    await fetch("/api/admin/equipe/suspend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, action }),
    });
    setLoading(null);
    setConfirmDelete(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {isSuspended ? (
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
          onClick={() => doAction("reactivate")}
          disabled={loading !== null}
        >
          <PlayCircle className="h-3.5 w-3.5 mr-1" />
          {loading === "reactivate" ? "..." : "Réactiver"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs"
          onClick={() => doAction("suspend")}
          disabled={loading !== null}
        >
          <PauseCircle className="h-3.5 w-3.5 mr-1" />
          {loading === "suspend" ? "..." : "Suspendre"}
        </Button>
      )}

      {confirmDelete ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setConfirmDelete(false)}
            disabled={loading !== null}
          >
            Non
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-xs"
            onClick={() => doAction("delete")}
            disabled={loading !== null}
          >
            {loading === "delete" ? "..." : "Confirmer"}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
          onClick={() => setConfirmDelete(true)}
          disabled={loading !== null}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
