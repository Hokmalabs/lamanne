/**
 * Portail d'accueil de chaque rôle.
 * Module pur : utilisable côté navigateur ET serveur (aucun import serveur).
 */
export function homeForRole(role: string | null | undefined): string {
  if (role === "super_admin" || role === "admin") return "/admin";
  if (role === "commercial") return "/commercial";
  return "/dashboard";
}

/** Vrai pour les comptes de l'équipe, qui n'ont pas accès à l'espace client */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "admin" || role === "commercial";
}
