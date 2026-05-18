import { useEffect, useState } from "react";
import { VOTING_WINDOW_HOURS } from "@/mock/proposals";

export function CountdownTimer({ createdAt, compact = false }: { createdAt: number; compact?: boolean }) {
  const deadline = createdAt + VOTING_WINDOW_HOURS * 3_600_000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, deadline - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (diff === 0) return <span className="text-muted-foreground">Voting closed</span>;
  if (compact) return <span className="font-mono text-xs">{h}h {m}m left</span>;
  return (
    <span className="font-mono text-sm tracking-wider">
      {h.toString().padStart(2, "0")}h {m.toString().padStart(2, "0")}m {s.toString().padStart(2, "0")}s
    </span>
  );
}
