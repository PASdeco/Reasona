import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app";
import { shortAddr, MOCK_WALLETS } from "@/mock/wallets";
import type { Category } from "@/mock/proposals";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Reasona" }] }),
  component: Admin,
});

const cats: Category[] = ["Governance", "Treasury", "Community", "Technical", "Partnerships", "Protocol Upgrade"];

function Admin() {
  const { canCreate, isOwner, wallet, connect, proposals, createProposal, closeProposal, archiveProposal, whitelist, addWhitelist, removeWhitelist } =
    useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet && !canCreate) navigate({ to: "/explore" });
  }, [wallet, canCreate, navigate]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<Category>("Governance");
  const [newWallet, setNewWallet] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto text-center py-32">
        <h1 className="text-2xl font-semibold mb-3">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-6">Connect your wallet to manage governance.</p>
        <button onClick={connect} className="px-5 py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow">Connect Wallet</button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    createProposal({ title: title.trim(), description: desc.trim(), category: cat });
    navigate({ to: "/explore" });
  };

  const visible = proposals.filter((p) => (tab === "archived" ? p.status === "ARCHIVED" : p.status !== "ARCHIVED"));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div>
        <div className="text-xs uppercase tracking-widest text-primary mb-2">{isOwner ? "Owner" : "Creator"} Dashboard</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Admin</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create */}
        <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
          <div className="text-lg font-semibold">Create Proposal</div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title"
              className="mt-1 w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="Detailed description..."
              className="mt-1 w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Category</label>
              <select value={cat} onChange={(e) => setCat(e.target.value as Category)}
                className="mt-1 w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
                {cats.map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Deadline</label>
              <div className="mt-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted-foreground">48 hours (fixed)</div>
            </div>
          </div>

          {(title || desc) && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Live Preview</div>
              <div className="font-semibold">{title || "Untitled proposal"}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{desc || "Description preview..."}</div>
            </div>
          )}

          <button type="submit" className="w-full py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow">
            Publish Proposal
          </button>
        </form>

        {/* Manage */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Manage Proposals</div>
            <div className="flex gap-1 text-xs">
              {(["active", "archived"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-2.5 py-1 rounded-md ${tab === t ? "bg-white/10" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-2 max-h-[480px] overflow-auto pr-1">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">{p.category} · {p.status}</div>
                </div>
                {p.status === "ACTIVE" && (
                  <button onClick={() => closeProposal(p.id)} className="text-xs px-2 py-1 rounded border border-white/10 hover:border-amber-500/40 hover:text-amber-300">Close</button>
                )}
                {p.status !== "ARCHIVED" && (
                  <button onClick={() => archiveProposal(p.id)} className="text-xs px-2 py-1 rounded border border-white/10 hover:border-red-500/40 hover:text-red-300">Archive</button>
                )}
              </li>
            ))}
            {visible.length === 0 && <li className="text-sm text-muted-foreground py-8 text-center">Nothing here.</li>}
          </ul>
        </div>
      </div>

      {/* Whitelist — owner only */}
      {isOwner && (
        <div className="glass rounded-2xl p-6">
          <div className="text-lg font-semibold mb-1">Creator Wallet Management</div>
          <div className="text-xs text-muted-foreground mb-5">Only the owner can manage which wallets are allowed to create proposals.</div>
          <div className="flex gap-2 mb-5">
            <input value={newWallet} onChange={(e) => setNewWallet(e.target.value)} placeholder="0x..."
              className="flex-1 rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50" />
            <button
              onClick={() => { if (newWallet.startsWith("0x") && newWallet.length >= 8) { addWhitelist(newWallet); setNewWallet(""); } }}
              className="px-4 py-2 rounded-lg bg-primary-gradient text-sm font-semibold">Add</button>
          </div>
          <ul className="space-y-2">
            {whitelist.map((w) => {
              const isOwnerAddr = w === MOCK_WALLETS.Owner;
              return (
                <li key={w} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {shortAddr(w)}
                    {isOwnerAddr && <span className="text-[10px] uppercase tracking-widest text-primary ml-2">Owner (You)</span>}
                  </div>
                  {!isOwnerAddr && (
                    <button onClick={() => removeWhitelist(w)} className="text-xs px-2 py-1 rounded border border-white/10 hover:border-red-500/40 hover:text-red-300">Remove</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// avoid unused warning
void redirect;
