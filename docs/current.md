# LAMANNE — État courant

*Dernière mise à jour : 01 juillet 2026*

## Vue d'ensemble

Projet à ~85% d'avancement.

- Sécurité : 100% ✅
- Fonctionnel métier : 95% (2 bugs UX à fixer)
- UI/design : 40% (refonte premium prévue)
- Intégration paiement : 0% (attente clés GeniusPay)
- Documentation : 20% (ce fichier + les 4 autres viennent d'être créés)
- Observabilité : 0% (à installer avant lancement)

## Bugs prioritaires en cours

### Bug 1 — Gestion catégories admin ✅ RÉSOLU partiellement
- 8 nouvelles catégories créées en base (Électroménager, Appareils électroniques, Cuisine, Meubles, Scolaire, Beauté, Vêtements, Divers)
- 58 anciens produits restent dans catégorie "Test" — à reclasser progressivement via UI de modification produit
- **Page `/admin/categories`** (créer/éditer/supprimer via UI) NON codée — reportée à la session refonte UI

### Bug 2 — Commercial "choisir client" cassé 🔴 EN COURS
- Symptôme : clic sur un client dans la liste ne déclenche rien
- Cause probable : code mort dans `/commercial/clients/` qui conflit avec `/commercial/mes-clients/`
- Flow attendu documenté dans `docs/business.md` (Flow A et Flow B)
- **À fixer en priorité**

### Bug 3 — Adaptation écrans / responsive
- Cards produits avec texte tronqué (screenshot mobile)
- Badges superposés au stock
- À traiter dans la refonte UI globale

## Chantiers restants

1. **Fix Bug 2** — flow commercial (en cours)
2. **Intégration GeniusPay** — dès réception des clés API par le gérant FAMIENWA (2-3h de code)
3. **Refonte UI premium** — session dédiée (2-3h)
4. **Cron expirations** — Vercel Cron pour relances automatiques (30 min)
5. **API export CSV `/admin/versements`** (20 min)
6. **Domaine `lamanne.ci`** — achat via lenomdedomaine.ci (9 000 FCFA/an) + config DNS Vercel
7. **Guide FAMIENWA** en .docx pour les commerciaux
8. **Refonte auth** — Google OAuth + Twilio WhatsApp OTP, drop email pour clients (semaine dédiée)
9. **Resend emails transactionnels** — bienvenue, versement, code retrait, expiration
10. **Observabilité** — Sentry + Vercel Spend alerts + Uptime Robot
11. **Capacity model spreadsheet** — coûts vs users à 500 / 1000 / 5000
12. **Documentation finale** — README public, procédures déploiement, runbook
13. **Tests E2E manuels** — parcours complet client/commercial/admin
14. **Mise en prod finale** avec test réel FAMIENWA (100–500 clients existants)

## Décisions d'infrastructure en suspens

- **Upgrade Vercel Hobby → Pro** : indispensable avant lancement public (rate limiting Firewall + Spend Management + quota CPU 4x). Bloqueur potentiel : cartes bancaires africaines refusées par Stripe. Alternatives à tester : UBA débit classique, Chipper Cash, Eversend.
- **Attack Challenge Mode Vercel** : disponible gratuitement mais volontairement OFF (ajoute 1-3s de latence au premier hit). Activable en 1 clic si attaque DDoS détectée.
- **AI Bots blocker** : activé.

## Contexte session juillet 2026

Reprise du projet le 01 juillet 2026 après une pause de 6 semaines (dernière session mi-mai). Focus : nettoyer les 2 bugs identifiés au test de reprise puis intégrer GeniusPay dès validation.