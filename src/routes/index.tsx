import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useApp } from "@/store/app";
import { ProposalCard } from "@/components/ProposalCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reasona - Governance Powered by Collective Intelligence" },
      {
        name: "description",
        content: "Structured proposals, reasoning-backed voting, and contract-backed governance on GenLayer.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { proposals, connect, wallet, contractReady, error } = useApp();
  const active = proposals.filter((proposal) => proposal.status === "ACTIVE").slice(0, 2);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-20 -left-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl animate-float-orb" />
        <div
          className="absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-orange-700/15 blur-3xl animate-float-orb"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-28 text-center">
        {!contractReady && (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
            Deploy <code>contracts/reasona.py</code> and set <code>VITE_REASONA_CONTRACT_ADDRESS</code> to activate the live Reasona contract.
          </div>
        )}
        {error && contractReady && (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]"
        >
          Governance Powered by
          <br />
          <span className="text-gradient">Collective Intelligence</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 max-w-2xl mx-auto text-muted-foreground text-lg"
        >
          Reasona turns governance into structured intelligence. Every vote carries reasoning, and every proposal lives on GenLayer with owner-controlled creator whitelisting.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/explore"
            onClick={() => {
              if (!wallet) void connect();
            }}
            className="px-6 py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow"
          >
            {"Launch App ->"}
          </Link>
          <Link to="/explore" className="px-6 py-3 rounded-xl border border-white/15 hover:border-white/30 font-medium">
            Explore Proposals
          </Link>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-2">Three steps from proposal to transparent reasoning-backed governance.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              n: "01",
              t: "Proposal Created",
              d: "The owner or a whitelisted creator publishes a formal governance decision on-chain.",
            },
            {
              n: "02",
              t: "Community Votes",
              d: "Members vote Yes, No, or Abstain and submit written reasoning with their position.",
            },
            {
              n: "03",
              t: "Reasoning Organizes",
              d: "Matching arguments form visible reasoning clusters, making consensus easier to inspect.",
            },
          ].map((step) => (
            <div key={step.n} className="glass rounded-2xl p-6">
              <div className="text-xs font-mono text-primary mb-3">{step.n}</div>
              <div className="text-lg font-semibold mb-2">{step.t}</div>
              <div className="text-sm text-muted-foreground">{step.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold">Built for Intelligent Governance</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              t: "Owner-Gated Creation",
              d: "The owner wallet manages which creator addresses can publish proposals.",
            },
            {
              t: "Reasoning Clusters",
              d: "Vote reasoning is grouped into reusable on-chain clusters for fast interpretation.",
            },
            {
              t: "On-Chain Transparency",
              d: "Every proposal, whitelist change, and vote is executed through the Reasona contract.",
            },
            {
              t: "Consensus Analytics",
              d: "Vote totals, cluster strength, and confidence signals stay visible for every proposal.",
            },
          ].map((feature) => (
            <div key={feature.t} className="glass rounded-2xl p-6 hover:border-primary/30 transition-colors">
              <div className="text-lg font-semibold mb-2">{feature.t}</div>
              <div className="text-sm text-muted-foreground">{feature.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary mb-2">Live Now</div>
            <h2 className="text-4xl font-bold">Active Proposals</h2>
          </div>
          <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">
            {"View all ->"}
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {active.map((proposal) => (
            <ProposalCard key={proposal.id} p={proposal} />
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-gradient" />
            <span className="font-semibold text-foreground">Reasona</span>
            <span>{"| Governance with reasoning."}</span>
          </div>
          <div className="px-3 py-1 rounded-full glass text-xs">Powered by GenLayer</div>
        </div>
      </footer>
    </div>
  );
}
