"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, KeyRound } from "lucide-react";

/**
 * Affiche UNE SEULE FOIS le mot de passe d'un membre de l'équipe.
 *
 * Le mot de passe ne vit que dans le state React du parent, qui le vide à la
 * fermeture. Il n'est jamais écrit en localStorage, dans l'URL ni dans un log.
 * Volontairement : pas de fermeture au clic sur le fond ni à Échap — on ne
 * ferme que par le bouton explicite, pour éviter de perdre le secret par
 * accident.
 */
export default function PasswordRevealDialog({
  open,
  memberName,
  password,
  loginHint,
  onClose,
}: {
  open: boolean;
  memberName: string;
  password: string;
  loginHint: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  if (!open) return null;

  const handleCopy = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Copie impossible : sélectionnez le texte manuellement.");
    }
  };

  const handleClose = () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopied(false);
    setCopyError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto">
      {/* Fond non cliquable : la fermeture passe par le bouton uniquement */}
      <div className="absolute inset-0 bg-black/50" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 my-auto max-h-[calc(100vh-3rem)] overflow-y-auto"
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-5 w-5 text-lamanne-primary" />
          <h2 id="password-dialog-title" className="font-sora text-lg font-black text-gray-900">
            Mot de passe de {memberName}
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{loginHint}</p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center">
          <p className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-gray-900 select-all break-all">
            {password}
          </p>
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={handleCopy}
          >
            {copied ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Copié
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copier
              </span>
            )}
          </Button>
          {copyError && (
            <p role="alert" className="mt-2 text-xs text-lamanne-danger">
              {copyError}
            </p>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-lamanne-soft px-4 py-3 text-sm text-gray-800">
          Notez ce mot de passe maintenant. Il ne sera plus jamais affiché. En cas de perte,
          il faudra en générer un nouveau.
        </div>

        <Button type="button" className="w-full min-h-[44px] mt-5" onClick={handleClose}>
          J&apos;ai noté le mot de passe
        </Button>
      </div>
    </div>
  );
}
