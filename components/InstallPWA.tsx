"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !prompt) return null;

  const handleInstall = async () => {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-lamanne-primary text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="font-black text-sm">LM</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">Installer LAMANNE</p>
        <p className="text-white/70 text-xs">Accès rapide depuis votre écran d&apos;accueil</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-white text-lamanne-primary rounded-xl px-3 py-1.5 text-xs font-bold flex-shrink-0 flex items-center gap-1"
      >
        <Download className="h-3 w-3" />
        Installer
      </button>
      <button onClick={() => setShow(false)} className="text-white/60 hover:text-white flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
