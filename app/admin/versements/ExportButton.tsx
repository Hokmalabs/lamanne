"use client";

import { Download } from "lucide-react";

export function ExportButton({ query }: { query: string }) {
  const href = query
    ? `/api/admin/versements/export?${query}`
    : "/api/admin/versements/export";

  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:border-gray-400 transition-colors flex-shrink-0"
    >
      <Download className="h-4 w-4" />
      Exporter CSV
    </a>
  );
}
