export const dynamic = "force-dynamic";

export default async function AdminCotisationsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[Debug] URL:", url?.substring(0, 30));
  console.log("[Debug] KEY:", key?.substring(0, 20));
  console.log("[Debug] KEY length:", key?.length);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url!, key!);

  const { data, error } = await admin.from("cotisations").select("*");

  console.log("[Debug] count:", data?.length, "| error:", error?.message);

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-black text-gray-900">Debug Cotisations</h1>
      <p className="text-gray-700">Count: <strong>{data?.length ?? "null"}</strong></p>
      <p className="text-gray-700">Error: <strong>{error?.message ?? "none"}</strong></p>
      <p className="text-gray-700">Key prefix: <strong>{key?.substring(0, 15) ?? "undefined"}</strong></p>
      <p className="text-gray-700">URL: <strong>{url?.substring(0, 30) ?? "undefined"}</strong></p>
    </div>
  );
}
