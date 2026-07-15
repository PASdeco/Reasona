import { motion } from "framer-motion";
import type { Proposal } from "@/lib/reasona";

function confidence(p: Proposal) {
  const total = p.yes + p.no + p.abstain || 1;
  const win = Math.max(p.yes, p.no);
  return Math.round((win / total) * 100);
}
function controversy(p: Proposal) {
  const total = p.yes + p.no || 1;
  const ratio = Math.min(p.yes, p.no) / total;
  return Math.round(ratio * 200);
}

export function AnalyticsPanel({ proposal }: { proposal: Proposal }) {
  const conf = confidence(proposal);
  const ctrl = Math.min(100, controversy(proposal));
  const totalVotes = proposal.yes + proposal.no + proposal.abstain;

  const proCluster = [...proposal.clusters]
    .filter((c) => c.side === "for")
    .sort((a, b) => b.members - a.members)[0];
  const conCluster = [...proposal.clusters]
    .filter((c) => c.side === "against")
    .sort((a, b) => b.members - a.members)[0];

  const confColor = conf >= 70 ? "#10b981" : conf >= 50 ? "#eab308" : "#ef4444";
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  const dash = (conf / 100) * circ;

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Consensus Intelligence
        </div>
        <div className="text-[10px] text-muted-foreground">Updated just now</div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              fill="none"
            />
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke={confColor}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${dash} ${circ}` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 8px ${confColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold" style={{ color: confColor }}>
              {conf}%
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Confidence
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Controversy level</span>
              <span className="font-mono">{ctrl}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${ctrl}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
              <div className="text-lg font-semibold">{proposal.clusters.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Clusters
              </div>
            </div>
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
              <div className="text-lg font-semibold">{totalVotes}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Votes
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {proCluster && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300 mb-2">
              Dominant Supporting
            </div>
            <div className="text-sm">{proCluster.label}</div>
            <div className="text-xs text-muted-foreground mt-2">{proCluster.members} voters</div>
          </div>
        )}
        {conCluster && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-widest text-red-300 mb-2">
              Dominant Opposing
            </div>
            <div className="text-sm">{conCluster.label}</div>
            <div className="text-xs text-muted-foreground mt-2">{conCluster.members} voters</div>
          </div>
        )}
      </div>
    </div>
  );
}
