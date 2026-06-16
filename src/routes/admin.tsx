import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app";
import { OWNER_ADDRESS, shortAddr, type Category } from "@/lib/reasona";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin - Reasona" }] }),
  component: Admin,
});

const cats: Category[] = [
  "Governance",
  "Treasury",
  "Community",
  "Technical",
  "Partnerships",
  "Protocol Upgrade",
];

function isValidAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function Admin() {
  const {
    canCreate,
    isOwner,
    wallet,
    connect,
    proposals,
    createProposal,
    closeProposal,
    archiveProposal,
    unarchiveProposal,
    whitelist,
    addWhitelist,
    removeWhitelist,
    error,
    contractReady,
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet && !canCreate) navigate({ to: "/explore" });
  }, [wallet, canCreate, navigate]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<Category>("Governance");
  const [newWallet, setNewWallet] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [changingWhitelist, setChangingWhitelist] = useState(false);
  const [updatingProposalId, setUpdatingProposalId] = useState<string | null>(null);
  const [clearingActive, setClearingActive] = useState(false);
  const trimmedNewWallet = newWallet.trim();
  const canAddWallet = isValidAddress(trimmedNewWallet);

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto text-center py-32">
        <h1 className="text-2xl font-semibold mb-3">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-6">Connect your wallet to manage governance.</p>
        <button
          onClick={() => void connect()}
          className="px-5 py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!contractReady) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <h1 className="text-2xl font-semibold mb-3">Contract Not Configured</h1>
        <p className="text-muted-foreground">
          Deploy the Reasona contract and set <code>VITE_REASONA_CONTRACT_ADDRESS</code> to manage
          live governance.
        </p>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="max-w-md mx-auto text-center py-32">
        <h1 className="text-2xl font-semibold mb-3">Access Restricted</h1>
        <p className="text-muted-foreground">
          Only the owner and whitelisted creators can access the admin panel.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;

    setSubmittingProposal(true);
    try {
      await createProposal({ title: title.trim(), description: desc.trim(), category: cat });
      setTitle("");
      setDesc("");
      setCat("Governance");
      navigate({ to: "/explore" });
    } finally {
      setSubmittingProposal(false);
    }
  };

  const visible = proposals.filter((proposal) =>
    tab === "archived" ? proposal.status === "ARCHIVED" : proposal.status !== "ARCHIVED",
  );
  const activeList = proposals.filter((proposal) => proposal.status === "ACTIVE");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-widest text-primary mb-2">
          {isOwner ? "Owner" : "Creator"} Dashboard
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Admin</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
          <div className="text-lg font-semibold">Create Proposal</div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Proposal title"
              className="mt-1 w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={5}
              placeholder="Detailed description..."
              className="mt-1 w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Category
              </label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as Category)}
                className="mt-1 w-full rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              >
                {cats.map((category) => (
                  <option key={category} value={category} className="bg-background">
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Deadline
              </label>
              <div className="mt-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted-foreground">
                48 hours fixed
              </div>
            </div>
          </div>

          {(title || desc) && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-widest text-primary mb-2">
                Live Preview
              </div>
              <div className="font-semibold">{title || "Untitled proposal"}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {desc || "Description preview..."}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submittingProposal}
            className="w-full py-3 rounded-xl bg-primary-gradient font-semibold shadow-glow disabled:opacity-60"
          >
            {submittingProposal ? "Publishing..." : "Publish Proposal"}
          </button>
        </form>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Manage Proposals</div>
            <div className="flex items-center gap-2">
              {tab === "active" && activeList.length > 0 && (
                <button
                  onClick={async () => {
                    setClearingActive(true);
                    try {
                      for (const proposal of activeList) {
                        await archiveProposal(proposal.id);
                      }
                    } finally {
                      setClearingActive(false);
                    }
                  }}
                  disabled={clearingActive || updatingProposalId !== null}
                  className="text-xs px-3 py-1.5 rounded-md border border-red-500/30 text-red-200 hover:border-red-500/50 disabled:opacity-60"
                >
                  {clearingActive ? "Clearing..." : "Clear Active"}
                </button>
              )}
              <div className="flex gap-1 text-xs">
                {(["active", "archived"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`px-2.5 py-1 rounded-md ${tab === value ? "bg-white/10" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ul className="space-y-2 max-h-[480px] overflow-auto pr-1">
            {visible.map((proposal) => (
              <li
                key={proposal.id}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{proposal.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {proposal.category} | {proposal.status}
                  </div>
                </div>
                {proposal.status === "ACTIVE" && (
                  <button
                    onClick={async () => {
                      setUpdatingProposalId(proposal.id);
                      try {
                        await closeProposal(proposal.id);
                      } finally {
                        setUpdatingProposalId(null);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded border border-white/10 hover:border-amber-500/40 hover:text-amber-300"
                  >
                    {updatingProposalId === proposal.id ? "Working..." : "Close"}
                  </button>
                )}
                {proposal.status !== "ARCHIVED" ? (
                  <button
                    onClick={async () => {
                      setUpdatingProposalId(proposal.id);
                      try {
                        await archiveProposal(proposal.id);
                      } finally {
                        setUpdatingProposalId(null);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded border border-white/10 hover:border-red-500/40 hover:text-red-300"
                  >
                    {updatingProposalId === proposal.id ? "Working..." : "Archive"}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setUpdatingProposalId(proposal.id);
                      try {
                        await unarchiveProposal(proposal.id);
                      } finally {
                        setUpdatingProposalId(null);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded border border-white/10 hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    {updatingProposalId === proposal.id ? "Working..." : "Unarchive"}
                  </button>
                )}
              </li>
            ))}
            {visible.length === 0 && (
              <li className="text-sm text-muted-foreground py-8 text-center">Nothing here.</li>
            )}
          </ul>
        </div>
      </div>

      {isOwner && (
        <div className="glass rounded-2xl p-6">
          <div className="text-lg font-semibold mb-1">Creator Wallet Management</div>
          <div className="text-xs text-muted-foreground mb-5">
            Only the owner wallet can manage which addresses are allowed to create proposals.
          </div>
          <div className="flex gap-2 mb-5">
            <input
              value={newWallet}
              onChange={(e) => setNewWallet(e.target.value)}
              placeholder="0x..."
              className="flex-1 rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={async () => {
                if (canAddWallet) {
                  setChangingWhitelist(true);
                  try {
                    await addWhitelist(trimmedNewWallet);
                    setNewWallet("");
                  } finally {
                    setChangingWhitelist(false);
                  }
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary-gradient text-sm font-semibold disabled:opacity-60"
              disabled={changingWhitelist || !canAddWallet}
            >
              {changingWhitelist ? "Working..." : "Add"}
            </button>
          </div>
          <ul className="space-y-2">
            {whitelist.map((address) => {
              const isOwnerAddress = address.toLowerCase() === OWNER_ADDRESS.toLowerCase();
              return (
                <li
                  key={address}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {shortAddr(address)}
                    {isOwnerAddress && (
                      <span className="text-[10px] uppercase tracking-widest text-primary ml-2">
                        Owner (You)
                      </span>
                    )}
                  </div>
                  {!isOwnerAddress && (
                    <button
                      onClick={async () => {
                        setChangingWhitelist(true);
                        try {
                          await removeWhitelist(address);
                        } finally {
                          setChangingWhitelist(false);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border border-white/10 hover:border-red-500/40 hover:text-red-300 disabled:opacity-60"
                      disabled={changingWhitelist}
                    >
                      {changingWhitelist ? "Working..." : "Remove"}
                    </button>
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
