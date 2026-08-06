// PAGE DE TEST TEMPORAIRE — à supprimer avant merge
import ProgressRing from "@/components/ProgressRing";

export default function TestRingPage() {
  return (
    <div
      className="min-h-screen flex flex-wrap items-center justify-center gap-10 p-10"
      style={{ background: "var(--lamanne-cream)" }}
    >
      <ProgressRing value={0} label="Progression" />
      <ProgressRing value={25} label="Progression" />
      <ProgressRing value={50} label="Progression" />
      <ProgressRing value={65} label="Progression" />
      <ProgressRing value={100} label="Progression" />
      <ProgressRing value={40} size={64} strokeWidth={6} label="Petit" />
      <ProgressRing value={80} size={140} strokeWidth={12} label="Grand" />
    </div>
  );
}
