import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Conditions Générales d'Utilisation",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="mb-8">
            <div className="w-12 h-12 bg-lamanne-primary rounded-2xl flex items-center justify-center mb-4">
              <span className="text-white font-black text-sm">LM</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">1. Présentation de LAMANNE</h2>
              <p>
                LAMANNE est une boutique physique basée en Côte d&apos;Ivoire proposant un service de
                cotisation progressive permettant à ses clients d&apos;acquérir des articles en effectuant
                des versements réguliers. La plateforme numérique LAMANNE facilite le suivi des
                cotisations et des paiements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">2. Acceptation des conditions</h2>
              <p>
                En créant un compte sur la plateforme LAMANNE ou en utilisant ses services, vous
                acceptez sans réserve les présentes Conditions Générales d&apos;Utilisation. Si vous
                n&apos;acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">3. Création de compte</h2>
              <p>
                Pour accéder aux services LAMANNE, vous devez créer un compte en fournissant des
                informations exactes et complètes. Vous êtes responsable de la confidentialité de vos
                identifiants de connexion (email/téléphone et mot de passe/PIN). Tout accès effectué
                avec vos identifiants est réputé effectué par vous.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">4. Fonctionnement des cotisations</h2>
              <p>
                Une cotisation est un engagement à acquérir un article en effectuant des versements
                progressifs. Les règles suivantes s&apos;appliquent :
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>Le premier versement minimum est de <strong>1 000 FCFA</strong>.</li>
                <li>Chaque versement ultérieur doit être d&apos;au minimum <strong>1 000 FCFA</strong>.</li>
                <li>La durée maximale d&apos;une cotisation est définie par le produit choisi.</li>
                <li>Le retrait de l&apos;article n&apos;est possible qu&apos;une fois la cotisation entièrement payée.</li>
                <li>En cas de non-paiement dans les délais, LAMANNE se réserve le droit d&apos;annuler la cotisation.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">5. Remboursements</h2>
              <p>
                En cas d&apos;annulation d&apos;une cotisation active, LAMANNE peut procéder au remboursement
                des sommes versées, sous déduction de frais de gestion de <strong>5%</strong> du montant
                total versé. Les remboursements sont traités dans un délai de 7 à 14 jours ouvrables.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">6. Protection des données personnelles</h2>
              <p>
                LAMANNE collecte et traite vos données personnelles (nom, téléphone, email) dans le
                but de vous fournir ses services. Vos données ne sont pas cédées à des tiers à des
                fins commerciales. Conformément aux lois applicables en Côte d&apos;Ivoire, vous disposez
                d&apos;un droit d&apos;accès, de rectification et de suppression de vos données en nous
                contactant.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">7. Responsabilités</h2>
              <p>
                LAMANNE s&apos;engage à assurer la disponibilité de sa plateforme dans la mesure du possible,
                mais ne peut garantir une disponibilité continue. En cas d&apos;indisponibilité technique,
                LAMANNE ne saurait être tenu responsable des préjudices qui en résulteraient.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">8. Modification des conditions</h2>
              <p>
                LAMANNE se réserve le droit de modifier les présentes CGU à tout moment. Les
                utilisateurs seront informés de toute modification significative. La poursuite de
                l&apos;utilisation des services vaut acceptation des nouvelles conditions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-gray-900 mb-3">9. Contact</h2>
              <p>
                Pour toute question concernant ces conditions ou nos services, vous pouvez nous
                contacter via WhatsApp ou directement à notre boutique à Abidjan, Côte d&apos;Ivoire.
              </p>
            </section>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          © {new Date().getFullYear()} LAMANNE — Côte d&apos;Ivoire
        </p>
      </div>
    </div>
  );
}
