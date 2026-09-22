import { requirePageAuth } from "@/lib/api-security";
import ProduitsClient from "./ProduitsClient";

export default async function ProduitsPage() {
  await requirePageAuth(["admin", "super_admin"]);
  return <ProduitsClient />;
}
