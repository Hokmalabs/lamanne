/**
 * Configuration globale de Zod : utilise le locale français officiel.
 *
 * Importé en side-effect dans lib/api-security.ts pour s'appliquer à TOUS
 * les schémas Zod du projet. Les messages custom dans les schémas restent
 * prioritaires (Zod n'utilise le locale que quand aucun message
 * personnalisé n'est défini).
 *
 * Doc : https://zod.dev/error-customization
 */
import { z } from "zod"
import { fr } from "zod/locales"

z.config(fr())

// Export vide pour rendre le fichier importable comme side-effect module
export {}
