import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useApp } from "@/store/app";
import { ProposalCard } from "@/components/ProposalCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reasona — Governance Powered by Collective Intelligence" },
      { name: "description", content: "Structured proposals, reasoning-backed voting, AI-powered consensus analysis." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { proposals, connect, wallet } = useApp();
  const active = proposals.filter((p) => p.status === "ACTIVE").slice(0, 2);

  return (
    <div className="relative overflow-hidden">
      {/* Orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl animate-float-orb" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] rounded-full bg-orange-700/15 blur-3xl animate-float-orb" style={{ animationDelay: "4s" }} />
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          New · AI Reasoning Clustering Engine v2
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]"
        >
          Governance Powered by
          <br />
          <span className="text-gradient">Collective Intelligence</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-6 max-w-2xl mx-auto text-muted-foreground text-lg"
        >
          Reasona turns governance into structured intelligence. Every vote comes with reasoning — our AI clusters opinions into visual consensus maps.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/explore"
            onClick={() => { if (!wallet) connect(); }}
            className="px-6 py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow"
          >
            Launch App →
          </Link>
          <Link to="/explore" className="px-6 py-3 rounded-xl border border-white/15 hover:border-white/30 font-medium">
            Explore Proposals
          </Link>
        </motion.div>
      </section>


      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-2">Three steps from proposal to consensus intelligence.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", t: "Proposal Created", d: "An authorized creator publishes a formal governance decision with structured context." },
            { n: "02", t: "Community Votes", d: "Members vote Yes, No, or Abstain — and submit mandatory written reasoning." },
            { n: "03", t: "AI Clusters Reasoning", d: "Similar opinions group into visual intelligence clusters, revealing collective thought." },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <div className="text-xs font-mono text-primary mb-3">{s.n}</div>
              <div className="text-lg font-semibold mb-2">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold">Built for Intelligent Governance</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { t: "Reasoning Clustering", d: "AI groups similar opinions into semantic clusters after every vote." },
            { t: "Bubble Intelligence Maps", d: "Interactive visual maps showing how the community thinks." },
            { t: "On-Chain Transparency", d: "Every vote and reasoning is stored on GenLayer's intelligent blockchain." },
            { t: "Consensus Analytics", d: "Confidence scores, controversy levels, and dominant narratives per proposal." },
          ].map((f) => (
            <div key={f.t} className="glass rounded-2xl p-6 hover:border-primary/30 transition-colors">
              <div className="text-lg font-semibold mb-2">{f.t}</div>
              <div className="text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Active proposals */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary mb-2">Live Now</div>
            <h2 className="text-4xl font-bold">Active Proposals</h2>
          </div>
          <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {active.map((p) => <ProposalCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-gradient" />
            <span className="font-semibold text-foreground">Reasona</span>
            <span>· Governance with reasoning.</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Docs</a>
            <a href="#" className="hover:text-foreground">GitHub</a>
            <a href="#" className="hover:text-foreground">Discord</a>
            <a href="#" className="hover:text-foreground">Twitter</a>
          </div>
          <div className="px-3 py-1 rounded-full glass text-xs">Powered by GenLayer</div>
        </div>
      </footer>
    </div>
  );
}
