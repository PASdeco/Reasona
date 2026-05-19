import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Proposal } from "@/lib/reasona";
import { CountdownTimer } from "./CountdownTimer";

const categoryColors: Record<string, string> = {
  Technical: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  Treasury: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  Governance: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  Partnerships: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  Community: "text-pink-300 bg-pink-500/10 border-pink-500/20",
  "Protocol Upgrade": "text-orange-300 bg-orange-500/10 border-orange-500/20",
};

const statusStyle: Record<string, string> = {
  ACTIVE: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_-5px] shadow-emerald-500/30",
  CLOSED: "text-zinc-300 bg-zinc-500/10 border-zinc-500/20",
  ARCHIVED: "text-zinc-500 bg-zinc-700/10 border-zinc-700/20",
};

export function ProposalCard({ p }: { p: Proposal }) {
  const total = p.yes + p.no + p.abstain || 1;
  const yesPct = (p.yes / total) * 100;
  const noPct = (p.no / total) * 100;
  const abstainPct = (p.abstain / total) * 100;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass rounded-2xl p-6 flex flex-col gap-4 group hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${categoryColors[p.category]}`}>
          {p.category}
        </span>
        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${statusStyle[p.status]}`}>
          {p.status}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-semibold leading-tight mb-2 group-hover:text-gradient">{p.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} votes</span>
        {p.status === "ACTIVE" && <CountdownTimer deadline={p.closesAt} compact />}
      </div>

      <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/5 flex">
        <div className="bg-emerald-500/80" style={{ width: `${yesPct}%` }} />
        <div className="bg-red-500/80" style={{ width: `${noPct}%` }} />
        <div className="bg-zinc-500/60" style={{ width: `${abstainPct}%` }} />
      </div>

      <Link
        to="/proposals/$id"
        params={{ id: p.id }}
        className="mt-auto inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all"
      >
        View Proposal →
      </Link>
    </motion.div>
  );
}
