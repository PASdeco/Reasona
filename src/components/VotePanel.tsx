import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/store/app";
import type { Proposal, VoteChoice } from "@/lib/reasona";

const choices: { v: VoteChoice; color: string; ring: string }[] = [
  { v: "Yes", color: "text-emerald-300", ring: "shadow-emerald-500/40 border-emerald-500/60 bg-emerald-500/10" },
  { v: "No", color: "text-red-300", ring: "shadow-red-500/40 border-red-500/60 bg-red-500/10" },
  { v: "Abstain", color: "text-zinc-300", ring: "shadow-zinc-400/30 border-zinc-400/50 bg-zinc-400/10" },
];

export function VotePanel({ proposal }: { proposal: Proposal }) {
  const { wallet, submitVote, connect, error } = useApp();
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const frozen = !!proposal.myVote || proposal.status !== "ACTIVE";
  const valid = useMemo(() => choice && reasoning.trim().length > 0, [choice, reasoning]);

  const onSubmit = async () => {
    if (!valid || !choice) return;
    setSubmitting(true);
    try {
      await submitVote(proposal.id, choice, reasoning.trim());
      setReasoning("");
      setChoice(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (frozen) {
    const vote = proposal.myVote;
    return (
      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your Vote</div>
        {vote ? (
          <>
            <div className={`text-2xl font-bold ${vote.choice === "Yes" ? "text-emerald-300" : vote.choice === "No" ? "text-red-300" : "text-zinc-300"}`}>
              {vote.choice}
            </div>
            <div className="text-sm text-muted-foreground italic">"{vote.reasoning}"</div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-white/5">
              Vote recorded on-chain. Cannot be changed.
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">This proposal is no longer accepting votes.</div>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Your vote</div>
        <div className="grid grid-cols-3 gap-2">
          {choices.map((item) => (
            <button
              key={item.v}
              onClick={() => setChoice(item.v)}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${item.color} ${
                choice === item.v ? `${item.ring} shadow-[0_0_25px_-5px]` : "border-white/10 hover:border-white/30"
              }`}
            >
              {item.v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Reasoning</div>
          <div className="text-[11px] font-mono text-muted-foreground">{reasoning.length} chars</div>
        </div>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
        />
      </div>

      {!wallet ? (
        <button onClick={() => void connect()} className="w-full py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow">
          Connect Wallet to Vote
        </button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!valid || submitting}
          onClick={onSubmit}
          className="w-full py-3 rounded-xl bg-primary-gradient font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-glow"
        >
          {submitting ? "Submitting..." : "Submit Vote"}
        </motion.button>
      )}
    </div>
  );
}
