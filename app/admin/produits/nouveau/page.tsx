import { requirePageAuth } from "@/lib/api-security";
import NouveauProduitClient from "./NouveauProduitClient";

export default async function NouveauProduitPage() {
  await requirePageAuth(["admin", "super_admin"]);
  return <NouveauProduitClient />;
}
