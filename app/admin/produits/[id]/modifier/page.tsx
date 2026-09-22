import { requirePageAuth } from "@/lib/api-security";
import ModifierProduitClient from "./ModifierProduitClient";

export default async function ModifierProduitPage() {
  await requirePageAuth(["admin", "super_admin"]);
  return <ModifierProduitClient />;
}
