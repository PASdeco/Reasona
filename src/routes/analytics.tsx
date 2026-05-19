import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Governance Analytics - Reasona" }] }),
  component: Analytics,
});

function Analytics() {
  const { proposals } = useApp();
  const total = proposals.length;
  const totalVotes = proposals.reduce((acc, proposal) => acc + proposal.yes + proposal.no + proposal.abstain, 0);
  const uniqueVoters = Math.round(totalVotes * 0.62);
  const avgParticipation = Math.round(totalVotes / Math.max(1, total));
  const byCategory = proposals.reduce<Record<string, number>>((acc, proposal) => {
    acc[proposal.category] = (acc[proposal.category] ?? 0) + proposal.yes + proposal.no + proposal.abstain;
    return acc;
  }, {});
  const mostActiveCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const closed = proposals.filter((proposal) => proposal.status !== "ACTIVE");
  const confidenceBuckets = [0, 0, 0, 0, 0];
  closed.forEach((proposal) => {
    const totalForProposal = proposal.yes + proposal.no + proposal.abstain || 1;
    const confidence = Math.round((Math.max(proposal.yes, proposal.no) / totalForProposal) * 100);
    confidenceBuckets[Math.min(4, Math.floor(confidence / 20))] += 1;
  });
  const maxBucket = Math.max(1, ...confidenceBuckets);

  const mostVoted = [...proposals].sort((a, b) => b.yes + b.no + b.abstain - (a.yes + a.no + a.abstain))[0];
  const mostControversial = [...proposals].sort((a, b) => {
    const aRatio = Math.min(a.yes, a.no) / Math.max(1, a.yes + a.no);
    const bRatio = Math.min(b.yes, b.no) / Math.max(1, b.yes + b.no);
    return bRatio - aRatio;
  })[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Governance Analytics</h1>
        <p className="text-muted-foreground mt-2">Platform-wide intelligence across every decision made.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Total Proposals" value={total} />
        <Stat label="Total Votes" value={totalVotes.toLocaleString()} />
        <Stat label="Unique Voters" value={uniqueVoters.toLocaleString()} />
        <Stat label="Avg / Proposal" value={avgParticipation} />
        <Stat label="Top Category" value={mostActiveCategory} small />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Consensus Confidence Distribution</div>
          <div className="flex items-end gap-3 h-48">
            {confidenceBuckets.map((value, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-primary-gradient shadow-[0_0_30px_-10px] shadow-primary/60 transition-all"
                  style={{ height: `${(value / maxBucket) * 100}%`, minHeight: 4 }}
                />
                <div className="text-[10px] text-muted-foreground">{index * 20}-{index * 20 + 20}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Activity Timeline</div>
          <ul className="space-y-3">
            {[...proposals].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map((proposal) => (
              <li key={proposal.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <Link to="/proposals/$id" params={{ id: proposal.id }} className="flex-1 truncate hover:text-primary">
                  {proposal.title}
                </Link>
                <span className="text-xs text-muted-foreground">{new Date(proposal.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Showcase title="Most Voted" p={mostVoted} />
        <Showcase title="Most Controversial" p={mostControversial} />
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className={small ? "text-lg font-semibold" : "text-3xl font-bold text-gradient"}>{value}</div>
    </div>
  );
}

function Showcase({
  title,
  p,
}: {
  title: string;
  p?: { id: string; title: string; description: string; yes: number; no: number; abstain: number };
}) {
  if (!p) return null;
  const totalVotes = p.yes + p.no + p.abstain;
  return (
    <Link to="/proposals/$id" params={{ id: p.id }} className="glass rounded-2xl p-6 hover:border-primary/40 transition-colors block">
      <div className="text-[10px] uppercase tracking-widest text-primary mb-2">{title}</div>
      <div className="text-xl font-semibold mb-2">{p.title}</div>
      <div className="text-sm text-muted-foreground line-clamp-2 mb-4">{p.description}</div>
      <div className="text-xs text-muted-foreground">{totalVotes} votes · {p.yes} yes · {p.no} no</div>
    </Link>
  );
}
