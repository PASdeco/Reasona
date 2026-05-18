import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { initialProposals, type Proposal, type VoteChoice, VOTING_WINDOW_HOURS, type Category } from "@/mock/proposals";
import { MOCK_WALLETS, initialWhitelist, type Role } from "@/mock/wallets";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  wallet: string | null;
  connect: () => void;
  disconnect: () => void;
  proposals: Proposal[];
  whitelist: string[];
  addWhitelist: (a: string) => void;
  removeWhitelist: (a: string) => void;
  createProposal: (p: { title: string; description: string; category: Category }) => string;
  closeProposal: (id: string) => void;
  archiveProposal: (id: string) => void;
  unarchiveProposal: (id: string) => void;
  submitVote: (id: string, choice: VoteChoice, reasoning: string) => void;
  isOwner: boolean;
  isCreator: boolean;
  canCreate: boolean;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("Community");
  const [wallet, setWallet] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [whitelist, setWhitelist] = useState<string[]>(initialWhitelist);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (wallet) setWallet(MOCK_WALLETS[r]);
  };
  const connect = () => setWallet(MOCK_WALLETS[role]);
  const disconnect = () => setWallet(null);

  const isOwner = wallet === MOCK_WALLETS.Owner;
  const isCreator = !!wallet && whitelist.includes(wallet);
  const canCreate = isOwner || isCreator;

  const createProposal: AppState["createProposal"] = ({ title, description, category }) => {
    const id = Date.now().toString();
    const p: Proposal = {
      id, title, description, category,
      status: "ACTIVE",
      creator: wallet ?? MOCK_WALLETS.Owner,
      createdAt: Date.now(),
      yes: 0, no: 0, abstain: 0,
      clusters: [],
    };
    setProposals((prev) => [p, ...prev]);
    return id;
  };

  const closeProposal = (id: string) =>
    setProposals((p) => p.map((x) => (x.id === id ? { ...x, status: "CLOSED" } : x)));
  const archiveProposal = (id: string) =>
    setProposals((p) => p.map((x) => (x.id === id ? { ...x, status: "ARCHIVED" } : x)));

  const submitVote: AppState["submitVote"] = (id, choice, reasoning) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const side = choice === "Yes" ? "for" : choice === "No" ? "against" : "neutral";
        // assign to nearest cluster by side, or create new
        const clusters = [...p.clusters];
        const matchIdx = clusters.findIndex((c) => c.side === side);
        const addr = wallet ?? MOCK_WALLETS.Community;
        if (matchIdx >= 0) {
          clusters[matchIdx] = {
            ...clusters[matchIdx],
            members: clusters[matchIdx].members + 1,
            entries: [...clusters[matchIdx].entries, { address: addr, reasoning }],
          };
        } else {
          clusters.push({
            id: `N${clusters.length + 1}`,
            label: reasoning.slice(0, 80),
            side,
            members: 1,
            entries: [{ address: addr, reasoning }],
          });
        }
        return {
          ...p,
          yes: p.yes + (choice === "Yes" ? 1 : 0),
          no: p.no + (choice === "No" ? 1 : 0),
          abstain: p.abstain + (choice === "Abstain" ? 1 : 0),
          clusters,
          myVote: { choice, reasoning },
        };
      })
    );
  };

  const addWhitelist = (a: string) =>
    setWhitelist((w) => (w.includes(a) ? w : [...w, a]));
  const removeWhitelist = (a: string) =>
    setWhitelist((w) => (a === MOCK_WALLETS.Owner ? w : w.filter((x) => x !== a)));

  const value = useMemo<AppState>(
    () => ({
      role, setRole, wallet, connect, disconnect,
      proposals, whitelist, addWhitelist, removeWhitelist,
      createProposal, closeProposal, archiveProposal, submitVote,
      isOwner, isCreator, canCreate,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, wallet, proposals, whitelist]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be inside AppProvider");
  return c;
}

export { VOTING_WINDOW_HOURS };
