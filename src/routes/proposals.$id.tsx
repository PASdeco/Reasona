import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useApp } from "@/store/app";
import { CountdownTimer } from "@/components/CountdownTimer";
import { VotePanel } from "@/components/VotePanel";
import { BubbleMap } from "@/components/BubbleMap";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { shortAddr } from "@/lib/reasona";

export const Route = createFileRoute("/proposals/$id")({
  head: ({ params }) => ({ meta: [{ title: `Proposal ${params.id} - Reasona` }] }),
  component: ProposalDetail,
  notFoundComponent: () => (
    <div className="max-w-xl mx-auto text-center py-32">
      <h1 className="text-2xl font-semibold">Proposal not found</h1>
      <Link to="/explore" className="text-primary mt-4 inline-block">
        {"<-"} Back to proposals
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
});

function ProposalDetail() {
  const { id } = Route.useParams();
  const { proposals } = useApp();
  const proposal = proposals.find((entry) => entry.id === id);
  if (!proposal) throw notFound();

  const total = proposal.yes + proposal.no + proposal.abstain || 1;
  const yesPct = ((proposal.yes / total) * 100).toFixed(1);
  const noPct = ((proposal.no / total) * 100).toFixed(1);
  const absPct = ((proposal.abstain / total) * 100).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">
        {"<-"} All proposals
      </Link>

      <div className="mt-6 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary">
            {proposal.category}
          </span>
          <span
            className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${
              proposal.status === "ACTIVE"
                ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                : proposal.status === "CLOSED"
                  ? "border-zinc-500/30 text-zinc-300 bg-zinc-500/10"
                  : "border-zinc-700/40 text-zinc-500"
            }`}
          >
            {proposal.status}
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">{proposal.title}</h1>
        <p className="text-muted-foreground mt-4 max-w-3xl">{proposal.description}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div>
            Creator:{" "}
            <span className="font-mono text-foreground">{shortAddr(proposal.creator)}</span>
          </div>
          <div>
            Created:{" "}
            <span className="text-foreground">{new Date(proposal.createdAt).toLocaleString()}</span>
          </div>
          {proposal.status === "ACTIVE" && (
            <div>
              Closes in: <CountdownTimer deadline={proposal.closesAt} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6 min-w-0">
          <div className="glass rounded-2xl p-3 overflow-hidden">
            <div className="block lg:hidden">
              <BubbleMap clusters={proposal.clusters} height={340} />
            </div>
            <div className="hidden lg:block">
              <BubbleMap clusters={proposal.clusters} height={520} />
            </div>
          </div>
          <AnalyticsPanel proposal={proposal} />
        </div>
        <div className="order-1 lg:order-2 space-y-6 min-w-0">
          <VotePanel proposal={proposal} />
          <div className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Vote Statistics
            </div>
            <div className="text-3xl font-bold mb-1">{total}</div>
            <div className="text-xs text-muted-foreground mb-5">Total votes cast</div>
            <div className="h-2.5 rounded-full overflow-hidden bg-white/5 flex mb-4">
              <div className="bg-emerald-500/80 transition-all" style={{ width: `${yesPct}%` }} />
              <div className="bg-red-500/80 transition-all" style={{ width: `${noPct}%` }} />
              <div className="bg-zinc-500/60 transition-all" style={{ width: `${absPct}%` }} />
            </div>
            <div className="space-y-2 text-sm">
              <Row color="bg-emerald-500" label="Yes" count={proposal.yes} pct={yesPct} />
              <Row color="bg-red-500" label="No" count={proposal.no} pct={noPct} />
              <Row color="bg-zinc-500" label="Abstain" count={proposal.abstain} pct={absPct} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  count,
  pct,
}: {
  color: string;
  label: string;
  count: number;
  pct: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <div className="font-mono text-muted-foreground">
        <span className="text-foreground">{count}</span> | {pct}%
      </div>
    </div>
  );
}
