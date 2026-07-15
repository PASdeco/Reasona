import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { requestAccounts, type InjectedWalletProvider } from "./wallets";
import {
  type Category,
  type Cluster,
  type Proposal,
  type Vote,
  type VoteChoice,
  VOTING_WINDOW_HOURS,
} from "./reasona";

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const CONTRACT_ADDRESS = (import.meta.env.VITE_REASONA_CONTRACT_ADDRESS?.trim() ||
  EMPTY_ADDRESS) as `0x${string}`;

export const HAS_CONTRACT_ADDRESS = CONTRACT_ADDRESS !== EMPTY_ADDRESS;
const ENABLE_TX_DEBUG = import.meta.env.DEV;
const GENLAYER_RECEIPT_WAIT_INTERVAL_MS = 5_000;
const GENLAYER_RECEIPT_WAIT_RETRIES = 72;

const readClient = createClient({
  chain: studionet,
  account: createAccount(),
});

declare global {
  interface Window {
    __reasonaLastTxDebug?: Record<string, unknown>;
  }
}

function normalizeAddress(address: string) {
  return address.trim() as `0x${string}`;
}

function normalizeAddressLower(address: string) {
  return address.trim().toLowerCase();
}

function logDebug(step: string, payload?: unknown) {
  if (!ENABLE_TX_DEBUG) return;
  if (payload === undefined) {
    console.info(`[Reasona][GenLayer] ${step}`);
    return;
  }
  console.info(`[Reasona][GenLayer] ${step}`, payload);
}

function logError(step: string, payload?: unknown) {
  if (!ENABLE_TX_DEBUG) return;
  if (payload === undefined) {
    console.error(`[Reasona][GenLayer] ${step}`);
    return;
  }
  console.error(`[Reasona][GenLayer] ${step}`, payload);
}

function persistTxDebug(txDebug: Record<string, unknown>) {
  if (ENABLE_TX_DEBUG) {
    window.__reasonaLastTxDebug = txDebug;
  }
}

function getTransactionStatusName(transaction: Record<string, unknown>) {
  const rawStatus = transaction.statusName ?? transaction.txStatusName ?? transaction.status;
  return String(rawStatus ?? "").toUpperCase();
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const withExtras = error as Error & {
      cause?: unknown;
      code?: unknown;
      details?: unknown;
      shortMessage?: unknown;
      metaMessages?: unknown;
    };
    return {
      name: withExtras.name,
      message: withExtras.message,
      stack: withExtras.stack,
      cause: withExtras.cause,
      code: withExtras.code,
      details: withExtras.details,
      shortMessage: withExtras.shortMessage,
      metaMessages: withExtras.metaMessages,
    };
  }
  return { value: error };
}

function providerSnapshot(provider: InjectedWalletProvider | null) {
  if (!provider) return null;
  return {
    isMetaMask: !!provider.isMetaMask,
    isRabby: !!provider.isRabby,
    isZerion: !!provider.isZerion,
    hasRequest: typeof provider.request === "function",
    hasOn: typeof provider.on === "function",
    hasRemoveListener: typeof provider.removeListener === "function",
    nestedProviders: Array.isArray(provider.providers) ? provider.providers.length : 0,
  };
}

async function getChainId(provider: InjectedWalletProvider) {
  try {
    return await provider.request({ method: "eth_chainId" });
  } catch (error) {
    logError("Failed to read provider chain id", serializeError(error));
    return null;
  }
}

async function getPermissions(provider: InjectedWalletProvider) {
  try {
    return await provider.request({ method: "wallet_getPermissions" });
  } catch (error) {
    logDebug("wallet_getPermissions unavailable", serializeError(error));
    return null;
  }
}

async function ensureStudionetWalletSession(provider: InjectedWalletProvider) {
  const chainIdHex = `0x${studionet.id.toString(16)}`;
  const blockExplorerUrl = studionet.blockExplorers?.default?.url;
  const chainParams = {
    chainId: chainIdHex,
    chainName: studionet.name,
    rpcUrls: [...studionet.rpcUrls.default.http],
    nativeCurrency: studionet.nativeCurrency,
    blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
  };

  const currentChainId = await provider.request({ method: "eth_chainId" });
  logDebug("Selected provider chain before setup", {
    currentChainId,
    expectedChainId: chainIdHex,
  });

  if (currentChainId !== chainIdHex) {
    logDebug("Adding StudioNet chain on selected provider", chainParams);
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });

    logDebug("Switching selected provider to StudioNet", {
      chainId: chainIdHex,
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  }

  try {
    const installedSnaps = (await provider.request({
      method: "wallet_getSnaps",
    })) as Record<string, { id?: string }>;
    logDebug("wallet_getSnaps result", installedSnaps);

    const snapInstalled = Object.values(installedSnaps).some(
      (snap) => snap?.id === "npm:genlayer-wallet-plugin",
    );
    if (!snapInstalled) {
      logDebug(
        "GenLayer snap is not installed on selected provider; continuing with standard wallet flow",
      );
    }
  } catch (error) {
    const details = serializeError(error);
    logDebug(
      "wallet_getSnaps unavailable on selected provider; continuing with standard wallet flow",
      details,
    );
  }
}

async function captureTrace(client: ReturnType<typeof createClient>, hash: `0x${string}`) {
  try {
    const trace = await client.debugTraceTransaction({ hash, round: 0 });
    logDebug("debugTraceTransaction result", trace);
    return trace as unknown as Record<string, unknown>;
  } catch (error) {
    logError("debugTraceTransaction failed", serializeError(error));
    return null;
  }
}

async function ensureAuthorizedAccount(
  provider: InjectedWalletProvider,
  walletAddress: `0x${string}`,
) {
  const expected = normalizeAddressLower(walletAddress);
  const connectedBefore = await requestAccounts(provider, "eth_accounts");
  logDebug("Wallet connection status before write", {
    expectedWallet: walletAddress,
    connectedAccount: connectedBefore,
    matchesExpected:
      connectedBefore !== null && normalizeAddressLower(connectedBefore) === expected,
  });

  if (connectedBefore && normalizeAddressLower(connectedBefore) === expected) {
    return connectedBefore as `0x${string}`;
  }

  logDebug("Requesting wallet authorization for write");
  const connectedAfterRequest = await requestAccounts(provider, "eth_requestAccounts");
  logDebug("Wallet connection status after authorization request", {
    expectedWallet: walletAddress,
    connectedAccount: connectedAfterRequest,
    matchesExpected:
      connectedAfterRequest !== null && normalizeAddressLower(connectedAfterRequest) === expected,
  });

  if (!connectedAfterRequest) {
    throw new Error("Wallet did not return an authorized account for this transaction.");
  }

  if (normalizeAddressLower(connectedAfterRequest) !== expected) {
    throw new Error(
      `Connected wallet mismatch. Frontend expects ${walletAddress}, but provider returned ${connectedAfterRequest}.`,
    );
  }

  return connectedAfterRequest as `0x${string}`;
}

function parseCluster(raw: Record<string, unknown>): Cluster {
  return {
    id: String(raw.id ?? raw.cluster_id ?? ""),
    label: String(raw.label ?? ""),
    side: (raw.side as Cluster["side"]) ?? "neutral",
    members: Number(raw.members ?? 0),
    confidence: Number(raw.confidence ?? 0),
  };
}

function parseProposal(raw: Record<string, unknown>): Proposal {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    category: (raw.category as Category) ?? "Governance",
    status: String(raw.status ?? "ACTIVE").toUpperCase() as Proposal["status"],
    previousStatus: raw.previous_status ? String(raw.previous_status) : undefined,
    creator: String(raw.creator ?? ""),
    createdAt: Number(raw.created_at ?? 0),
    closesAt: Number(
      raw.closes_at ?? Number(raw.created_at ?? 0) + VOTING_WINDOW_HOURS * 3_600_000,
    ),
    closedAt: raw.closed_at ? Number(raw.closed_at) : undefined,
    yes: Number(raw.yes ?? 0),
    no: Number(raw.no ?? 0),
    abstain: Number(raw.abstain ?? 0),
    clusters: ((raw.clusters as Record<string, unknown>[]) ?? []).map(parseCluster),
  };
}

function parseVote(raw: Record<string, unknown>): Vote {
  const voteRaw = String(raw.vote ?? "abstain").toLowerCase();
  const vote = voteRaw === "yes" ? "Yes" : voteRaw === "no" ? "No" : "Abstain";
  return {
    voter: String(raw.voter ?? ""),
    vote,
    reasoning: String(raw.reasoning ?? ""),
    submittedAt: Number(raw.submitted_at ?? 0),
  };
}

async function read<T>(functionName: string, args: unknown[] = []): Promise<T> {
  if (!HAS_CONTRACT_ADDRESS) {
    throw new Error("Set VITE_REASONA_CONTRACT_ADDRESS to your deployed Reasona contract.");
  }
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as Parameters<typeof readClient.readContract>[0]["args"],
  }) as Promise<T>;
}

async function write(
  walletAddress: `0x${string}`,
  functionName: string,
  args: unknown[],
  provider: InjectedWalletProvider | null,
) {
  if (!HAS_CONTRACT_ADDRESS) {
    throw new Error("Set VITE_REASONA_CONTRACT_ADDRESS to your deployed Reasona contract.");
  }

  if (!provider) {
    throw new Error("No wallet provider found. Reconnect your wallet and try again.");
  }

  const txDebug: Record<string, unknown> = {
    contractAddress: CONTRACT_ADDRESS,
    functionName,
    args,
    requestedWalletAddress: walletAddress,
    chain: {
      id: studionet.id,
      name: studionet.name,
      rpcUrls: studionet.rpcUrls,
    },
    provider: providerSnapshot(provider),
    startedAt: new Date().toISOString(),
  };
  persistTxDebug(txDebug);

  logDebug("Preparing GenLayer write transaction", txDebug);
  txDebug.walletPermissions = await getPermissions(provider);
  txDebug.chainIdBeforeConnect = await getChainId(provider);
  txDebug.authorizedWalletAddress = await ensureAuthorizedAccount(provider, walletAddress);

  const client = createClient({
    chain: studionet,
    account: normalizeAddress(walletAddress),
    provider,
  });
  txDebug.clientMode = "wallet-provider";
  txDebug.clientAccount = normalizeAddress(walletAddress);

  try {
    const nonce = await client.getCurrentNonce({ address: normalizeAddress(walletAddress) });
    txDebug.currentNonce = nonce;
    logDebug("Current transaction nonce", { walletAddress, nonce });
  } catch (error) {
    logError("Failed to fetch current nonce", serializeError(error));
  }

  try {
    logDebug("Preparing selected provider for StudioNet writes", {
      walletAddress,
      contractAddress: CONTRACT_ADDRESS,
    });
    await ensureStudionetWalletSession(provider);
    txDebug.chainIdAfterConnect = await getChainId(provider);
    logDebug("Selected provider StudioNet setup completed", {
      chainIdAfterConnect: txDebug.chainIdAfterConnect,
    });

    try {
      const simulation = await client.simulateWriteContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args: args as Parameters<typeof client.simulateWriteContract>[0]["args"],
        value: BigInt(0),
      });
      txDebug.simulation = simulation as unknown as Record<string, unknown>;
      logDebug("simulateWriteContract result", simulation);
    } catch (error) {
      txDebug.simulationError = serializeError(error);
      logError("simulateWriteContract failed", txDebug.simulationError);
    }

    logDebug("Calling client.writeContract() - wallet popup/signature should appear now", {
      contractAddress: CONTRACT_ADDRESS,
      functionName,
      args,
      walletAddress,
    });

    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args: args as Parameters<typeof client.writeContract>[0]["args"],
      value: BigInt(0),
    });
    txDebug.hash = hash;
    logDebug("Transaction hash received", { hash });

    try {
      const transaction = await client.getTransaction({ hash });
      txDebug.transaction = transaction as unknown as Record<string, unknown>;
      logDebug("Raw transaction payload", transaction);
    } catch (error) {
      logError("getTransaction failed after write", serializeError(error));
    }

    logDebug("Waiting for transaction receipt", {
      hash,
      status: TransactionStatus.ACCEPTED,
      fullTransaction: true,
      interval: GENLAYER_RECEIPT_WAIT_INTERVAL_MS,
      retries: GENLAYER_RECEIPT_WAIT_RETRIES,
    });

    let receipt: unknown;
    try {
      receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        interval: GENLAYER_RECEIPT_WAIT_INTERVAL_MS,
        retries: GENLAYER_RECEIPT_WAIT_RETRIES,
        fullTransaction: true,
      });
    } catch (waitError) {
      txDebug.receiptWaitError = serializeError(waitError);
      logError("waitForTransactionReceipt failed", txDebug.receiptWaitError);

      const latestTransaction = (await client.getTransaction({
        hash,
      })) as unknown as Record<string, unknown>;
      txDebug.latestTransactionAfterWaitFailure = latestTransaction;

      const latestStatus = getTransactionStatusName(latestTransaction);
      logDebug("Latest transaction after wait failure", {
        hash,
        latestStatus,
      });

      if (
        latestStatus === TransactionStatus.ACCEPTED ||
        latestStatus === TransactionStatus.FINALIZED
      ) {
        receipt = latestTransaction;
      } else {
        throw new Error(
          `Transaction is still processing on GenLayer StudioNet. Current status: ${latestStatus || "UNKNOWN"}. Please wait a little longer and refresh again.`,
        );
      }
    }

    txDebug.receipt = receipt as unknown as Record<string, unknown>;
    logDebug("Full transaction receipt", receipt);

    const result = receipt as unknown as Record<string, unknown>;
    const statusName = String(result.txExecutionResultName ?? result.resultName ?? "");
    txDebug.executionResultName = statusName;
    logDebug("GenLayer execution result", {
      txExecutionResultName: result.txExecutionResultName,
      resultName: result.resultName,
      consensusData: result.consensus_data,
    });

    if (statusName && /error|fail|revert/i.test(statusName)) {
      txDebug.trace = await captureTrace(client, hash);
      throw new Error(`Transaction failed: ${statusName}`);
    }
  } catch (error) {
    txDebug.error = serializeError(error);
    logError("GenLayer write transaction failed", txDebug.error);

    const hash = txDebug.hash;
    if (typeof hash === "string" && hash.startsWith("0x")) {
      try {
        txDebug.queuePosition = await client.getTransactionQueuePosition({
          hash: hash as `0x${string}`,
        });
        logDebug("Transaction queue position", txDebug.queuePosition);
      } catch (queueError) {
        logError("getTransactionQueuePosition failed", serializeError(queueError));
      }

      if (!txDebug.trace) {
        txDebug.trace = await captureTrace(client, hash as `0x${string}`);
      }
    }

    persistTxDebug(txDebug);
    throw error;
  }

  txDebug.completedAt = new Date().toISOString();
  persistTxDebug(txDebug);
  logDebug("GenLayer write transaction completed", txDebug);
}

export async function getOwner() {
  return (await read<string>("get_owner")).toLowerCase();
}

export async function getWhitelist() {
  const raw = await read<string[]>("get_whitelist");
  return raw.map((address) => address.toLowerCase());
}

export async function isWhitelisted(address: string) {
  return read<boolean>("is_whitelisted", [address]);
}

export async function getProposals() {
  const active = await read<Record<string, unknown>[]>("get_proposals");
  const archived = await read<Record<string, unknown>[]>("get_archived_proposals");
  return [...active, ...archived].map(parseProposal).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getProposal(id: string) {
  const raw = await read<Record<string, unknown>>("get_proposal", [id]);
  if (!raw || !raw.id) return undefined;
  return parseProposal(raw);
}

export async function getMyVote(proposalId: string, wallet: string) {
  const raw = await read<Record<string, unknown>>("get_my_vote", [proposalId, wallet]);
  if (!raw || !raw.voter) return undefined;
  return parseVote(raw);
}

export async function createProposal(
  caller: `0x${string}`,
  title: string,
  description: string,
  category: Category,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "create_proposal", [title, description, category], provider);
}

export async function submitVote(
  caller: `0x${string}`,
  proposalId: string,
  vote: VoteChoice,
  reasoning: string,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "submit_vote", [proposalId, vote.toLowerCase(), reasoning], provider);
}

export async function closeProposal(
  caller: `0x${string}`,
  proposalId: string,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "close_proposal", [proposalId], provider);
}

export async function archiveProposal(
  caller: `0x${string}`,
  proposalId: string,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "archive_proposal", [proposalId], provider);
}

export async function unarchiveProposal(
  caller: `0x${string}`,
  proposalId: string,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "unarchive_proposal", [proposalId], provider);
}

export async function addCreator(
  caller: `0x${string}`,
  address: string,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "add_creator", [address], provider);
}

export async function removeCreator(
  caller: `0x${string}`,
  address: string,
  provider: InjectedWalletProvider | null,
) {
  await write(caller, "remove_creator", [address], provider);
}
