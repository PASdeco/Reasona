import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/store/app";
import { ProposalCard } from "@/components/ProposalCard";
import type { Category, ProposalStatus } from "@/lib/reasona";

const categories: ("All" | Category)[] = ["All", "Governance", "Treasury", "Community", "Technical", "Partnerships", "Protocol Upgrade"];

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explore Proposals — Reasona" }] }),
  component: Explore,
});

function Explore() {
  const { proposals, canCreate } = useApp();
  const statuses: ("All" | ProposalStatus)[] = canCreate
    ? ["All", "ACTIVE", "CLOSED", "ARCHIVED"]
    : ["All", "ACTIVE", "CLOSED"];
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const [status, setStatus] = useState<("All" | ProposalStatus)>("All");

  const list = proposals.filter(
    (p) =>
      (cat === "All" || p.category === cat) &&
      (status === "All" || p.status === status) &&
      (canCreate || p.status !== "ARCHIVED")
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Governance Proposals</h1>
        <p className="text-muted-foreground mt-2">Browse, filter, and dive into the collective intelligence of every decision.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((c) => (
          <button
            key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              cat === c ? "bg-primary/20 border-primary/50 text-foreground" : "border-white/10 text-muted-foreground hover:border-white/20"
            }`}
          >{c}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-10">
        {statuses.map((s) => (
          <button
            key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              status === s ? "bg-white/10 border-white/30 text-foreground" : "border-white/5 text-muted-foreground hover:border-white/20"
            }`}
          >{s}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((p) => <ProposalCard key={p.id} p={p} />)}
      </div>
      {list.length === 0 && (
        <div className="text-center text-muted-foreground py-20">No proposals match the current filters.</div>
      )}
    </div>
  );
}
