import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCreator,
  archiveProposal as archiveProposalOnChain,
  closeProposal as closeProposalOnChain,
  createProposal as createProposalOnChain,
  getOwner,
  getProposal,
  getProposals,
  getMyVote,
  getWhitelist,
  HAS_CONTRACT_ADDRESS,
  isWhitelisted,
  OWNER_ADDRESS,
  removeCreator,
  submitVote as submitVoteOnChain,
  unarchiveProposal as unarchiveProposalOnChain,
} from "@/lib/genlayer";
import {
  discoverInjectedWallets,
  requestAccounts,
  type InjectedWalletProvider,
  type WalletOption,
} from "@/lib/wallets";
import type { Category, Proposal, VoteChoice } from "@/lib/reasona";

type WalletAddress = `0x${string}`;
const ENABLE_APP_DEBUG = import.meta.env.DEV;

interface AppState {
  wallet: string | null;
  walletOptions: WalletOption[];
  connect: () => Promise<void>;
  connectWallet: (walletId: string) => Promise<void>;
  disconnect: () => void;
  proposals: Proposal[];
  whitelist: string[];
  addWhitelist: (address: string) => Promise<void>;
  removeWhitelist: (address: string) => Promise<void>;
  createProposal: (proposal: {
    title: string;
    description: string;
    category: Category;
  }) => Promise<string | undefined>;
  closeProposal: (id: string) => Promise<void>;
  archiveProposal: (id: string) => Promise<void>;
  unarchiveProposal: (id: string) => Promise<void>;
  submitVote: (id: string, choice: VoteChoice, reasoning: string) => Promise<void>;
  isOwner: boolean;
  isCreator: boolean;
  canCreate: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  error: string | null;
  contractReady: boolean;
  refresh: () => Promise<void>;
  isWalletPickerOpen: boolean;
  openWalletPicker: () => Promise<void>;
  closeWalletPicker: () => void;
}

const Ctx = createContext<AppState | null>(null);

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function logApp(step: string, payload?: unknown) {
  if (!ENABLE_APP_DEBUG) return;
  if (payload === undefined) {
    console.info(`[Reasona][App] ${step}`);
    return;
  }
  console.info(`[Reasona][App] ${step}`, payload);
}

function logAppError(step: string, payload?: unknown) {
  if (!ENABLE_APP_DEBUG) return;
  if (payload === undefined) {
    console.error(`[Reasona][App] ${step}`);
    return;
  }
  console.error(`[Reasona][App] ${step}`, payload);
}

async function hydrateProposals(wallet: string | null) {
  const proposals = await getProposals();
  if (!wallet) return proposals;

  const votes = await Promise.all(
    proposals.map(async (proposal) => {
      const myVote = await getMyVote(proposal.id, wallet);
      return { proposalId: proposal.id, myVote };
    }),
  );

  const voteMap = new Map(votes.map((entry) => [entry.proposalId, entry.myVote]));
  return proposals.map((proposal) => {
    const myVote = voteMap.get(proposal.id);
    return myVote
      ? {
          ...proposal,
          myVote: {
            choice: myVote.vote,
            reasoning: myVote.reasoning,
          },
        }
      : proposal;
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<InjectedWalletProvider | null>(null);
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [owner, setOwner] = useState(OWNER_ADDRESS.toLowerCase());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWalletOptions = useCallback(async () => {
    const options = await discoverInjectedWallets();
    setWalletOptions(options);
    return options;
  }, []);

  const refresh = useCallback(async () => {
    if (!HAS_CONTRACT_ADDRESS) {
      setProposals([]);
      setWhitelist([]);
      setOwner(OWNER_ADDRESS.toLowerCase());
      setError(
        "Set VITE_REASONA_CONTRACT_ADDRESS to your deployed Reasona contract to enable live data.",
      );
      return;
    }

    setIsSyncing(true);
    try {
      const [nextOwner, nextWhitelist, nextProposals] = await Promise.all([
        getOwner(),
        getWhitelist(),
        hydrateProposals(wallet),
      ]);
      setOwner(nextOwner);
      setWhitelist(nextWhitelist);
      setProposals(nextProposals);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync Reasona with GenLayer.";
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [wallet]);

  useEffect(() => {
    void loadWalletOptions();
  }, [loadWalletOptions]);

  const connectWalletInternal = useCallback(async (option: WalletOption) => {
    logApp("Connecting injected wallet", {
      walletId: option.id,
      walletName: option.name,
      provider: {
        isMetaMask: !!option.provider.isMetaMask,
        isRabby: !!option.provider.isRabby,
        isZerion: !!option.provider.isZerion,
      },
    });
    const account = await requestAccounts(option.provider, "eth_requestAccounts");
    if (!account) {
      throw new Error("Wallet connection was cancelled.");
    }
    logApp("Wallet connected", {
      walletId: option.id,
      account,
    });
    setSelectedProvider(option.provider);
    setWallet(normalizeAddress(account));
    setIsWalletPickerOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("reasona:last-wallet-id", option.id);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadWalletOptions()
      .then(async (options) => {
        if (!mounted || options.length === 0) return;
        const restoredId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("reasona:last-wallet-id")
            : null;
        const preferred =
          (restoredId ? options.find((option) => option.id === restoredId) : undefined) ??
          options[0];
        if (!preferred) return;
        const account = await requestAccounts(preferred.provider, "eth_accounts");
        if (!mounted || !account) return;
        logApp("Restored wallet session", {
          walletId: preferred.id,
          account,
        });
        setSelectedProvider(preferred.provider);
        setWallet(normalizeAddress(account));
      })
      .catch(() => {
        // restore best effort
      });

    return () => {
      mounted = false;
    };
  }, [connectWalletInternal, loadWalletOptions]);

  useEffect(() => {
    const provider = selectedProvider;
    if (!provider?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const next =
        Array.isArray(accounts) && typeof accounts[0] === "string"
          ? normalizeAddress(accounts[0])
          : null;
      setWallet(next);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [selectedProvider]);

  useEffect(() => {
    void refresh();
  }, [wallet, refresh]);

  const openWalletPicker = useCallback(async () => {
    const options = await loadWalletOptions();
    if (options.length === 0) {
      throw new Error(
        "No browser wallet was found. Install MetaMask, Rabby, Zerion, or another injected wallet.",
      );
    }
    if (options.length === 1) {
      await connectWalletInternal(options[0]);
      return;
    }
    setIsWalletPickerOpen(true);
  }, [connectWalletInternal, loadWalletOptions]);

  const closeWalletPicker = useCallback(() => {
    setIsWalletPickerOpen(false);
  }, []);

  const connectWallet = useCallback<AppState["connectWallet"]>(
    async (walletId) => {
      setIsConnecting(true);
      try {
        const options = walletOptions.length > 0 ? walletOptions : await loadWalletOptions();
        const option = options.find((entry) => entry.id === walletId);
        if (!option) {
          throw new Error("Selected wallet is no longer available.");
        }
        await connectWalletInternal(option);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to connect wallet.");
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [connectWalletInternal, loadWalletOptions, walletOptions],
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const options = walletOptions.length > 0 ? walletOptions : await loadWalletOptions();
      if (options.length === 0) {
        throw new Error(
          "No browser wallet was found. Install MetaMask, Rabby, Zerion, or another injected wallet.",
        );
      }
      if (options.length === 1) {
        await connectWalletInternal(options[0]);
      } else {
        setIsWalletPickerOpen(true);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect wallet.");
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [connectWalletInternal, loadWalletOptions, walletOptions]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setSelectedProvider(null);
  }, []);

  const runWrite = useCallback(async <T,>(action: () => Promise<T>) => {
    try {
      setError(null);
      return await action();
    } catch (err) {
      logAppError("Frontend write action failed", err);
      setError(err instanceof Error ? err.message : "Transaction failed.");
      throw err;
    }
  }, []);

  const withWallet = useCallback(
    async <T,>(
      action: (address: WalletAddress, provider: InjectedWalletProvider | null) => Promise<T>,
    ) => {
      if (!wallet) {
        throw new Error("Connect a wallet first.");
      }
      logApp("Using connected wallet for transaction", {
        wallet,
        providerSelected: !!selectedProvider,
      });
      return action(wallet as WalletAddress, selectedProvider);
    },
    [selectedProvider, wallet],
  );

  const createProposal = useCallback<AppState["createProposal"]>(
    async ({ title, description, category }) => {
      logApp("create_proposal requested", {
        wallet,
        isOwner: wallet ? normalizeAddress(wallet) === owner : false,
        isWhitelisted: wallet ? whitelist.includes(normalizeAddress(wallet)) : false,
        contractReady: HAS_CONTRACT_ADDRESS,
        category,
        titleLength: title.length,
        descriptionLength: description.length,
      });
      await runWrite(() =>
        withWallet((address, provider) =>
          createProposalOnChain(address, title, description, category, provider),
        ),
      );
      await refresh();
      const latest = await getProposals();
      const created = latest.find(
        (proposal) =>
          proposal.title === title &&
          proposal.description === description &&
          proposal.creator === wallet,
      );
      return created?.id;
    },
    [owner, refresh, runWrite, wallet, whitelist, withWallet],
  );

  const closeProposal = useCallback<AppState["closeProposal"]>(
    async (id) => {
      await runWrite(() =>
        withWallet((address, provider) => closeProposalOnChain(address, id, provider)),
      );
      await refresh();
    },
    [refresh, runWrite, withWallet],
  );

  const archiveProposal = useCallback<AppState["archiveProposal"]>(
    async (id) => {
      await runWrite(() =>
        withWallet((address, provider) => archiveProposalOnChain(address, id, provider)),
      );
      await refresh();
    },
    [refresh, runWrite, withWallet],
  );

  const unarchiveProposal = useCallback<AppState["unarchiveProposal"]>(
    async (id) => {
      await runWrite(() =>
        withWallet((address, provider) => unarchiveProposalOnChain(address, id, provider)),
      );
      await refresh();
    },
    [refresh, runWrite, withWallet],
  );

  const submitVote = useCallback<AppState["submitVote"]>(
    async (id, choice, reasoning) => {
      logApp("submit_vote requested", {
        wallet,
        proposalId: id,
        choice,
        reasoningLength: reasoning.length,
      });
      await runWrite(() =>
        withWallet((address, provider) =>
          submitVoteOnChain(address, id, choice, reasoning, provider),
        ),
      );
      const latest = await getProposal(id);
      if (latest) {
        setProposals((current) =>
          current.map((proposal) =>
            proposal.id === id ? { ...latest, myVote: { choice, reasoning } } : proposal,
          ),
        );
      }
      await refresh();
    },
    [refresh, runWrite, wallet, withWallet],
  );

  const addWhitelist = useCallback<AppState["addWhitelist"]>(
    async (address) => {
      const target = normalizeAddress(address);
      logApp("add_creator requested", {
        wallet,
        target,
        isOwner: wallet ? normalizeAddress(wallet) === owner : false,
      });
      await runWrite(() => withWallet((caller, provider) => addCreator(caller, target, provider)));
      await refresh();
    },
    [owner, refresh, runWrite, wallet, withWallet],
  );

  const removeWhitelist = useCallback<AppState["removeWhitelist"]>(
    async (address) => {
      const target = normalizeAddress(address);
      logApp("remove_creator requested", {
        wallet,
        target,
        isOwner: wallet ? normalizeAddress(wallet) === owner : false,
      });
      await runWrite(() =>
        withWallet((caller, provider) => removeCreator(caller, target, provider)),
      );
      await refresh();
    },
    [owner, refresh, runWrite, wallet, withWallet],
  );

  const walletLower = wallet ? normalizeAddress(wallet) : null;
  const isOwner = walletLower === owner;
  const isCreator = walletLower ? whitelist.includes(walletLower) : false;
  const canCreate = isOwner || isCreator;

  const value = useMemo<AppState>(
    () => ({
      wallet,
      walletOptions,
      connect,
      connectWallet,
      disconnect,
      proposals,
      whitelist,
      addWhitelist,
      removeWhitelist,
      createProposal,
      closeProposal,
      archiveProposal,
      unarchiveProposal,
      submitVote,
      isOwner,
      isCreator,
      canCreate,
      isConnecting,
      isSyncing,
      error,
      contractReady: HAS_CONTRACT_ADDRESS,
      refresh,
      isWalletPickerOpen,
      openWalletPicker,
      closeWalletPicker,
    }),
    [
      wallet,
      walletOptions,
      connect,
      connectWallet,
      disconnect,
      proposals,
      whitelist,
      addWhitelist,
      removeWhitelist,
      createProposal,
      closeProposal,
      archiveProposal,
      unarchiveProposal,
      submitVote,
      isOwner,
      isCreator,
      canCreate,
      isConnecting,
      isSyncing,
      error,
      refresh,
      isWalletPickerOpen,
      openWalletPicker,
      closeWalletPicker,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error("useApp must be inside AppProvider");
  }
  return context;
}

export { HAS_CONTRACT_ADDRESS, isWhitelisted };
