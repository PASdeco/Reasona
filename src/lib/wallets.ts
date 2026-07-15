export interface InjectedWalletProvider {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isZerion?: boolean;
  providers?: InjectedWalletProvider[];
}

export interface WalletOption {
  id: string;
  name: string;
  icon?: string;
  provider: InjectedWalletProvider;
}

declare global {
  interface Window {
    ethereum?: InjectedWalletProvider;
  }
}

type Eip6963ProviderDetail = {
  info?: {
    uuid?: string;
    name?: string;
    icon?: string;
    rdns?: string;
  };
  provider?: InjectedWalletProvider;
};

function inferredWalletName(provider: InjectedWalletProvider) {
  if (provider.isRabby) return "Rabby";
  if (provider.isZerion) return "Zerion";
  if (provider.isMetaMask) return "MetaMask";
  return "Injected Wallet";
}

function walletIdFrom(
  provider: InjectedWalletProvider,
  fallbackIndex: number,
  detail?: Eip6963ProviderDetail,
) {
  return (
    detail?.info?.uuid ||
    detail?.info?.rdns ||
    (provider.isRabby
      ? "rabby"
      : provider.isZerion
        ? "zerion"
        : provider.isMetaMask
          ? "metamask"
          : `wallet-${fallbackIndex}`)
  );
}

export async function discoverInjectedWallets(timeoutMs = 250): Promise<WalletOption[]> {
  if (typeof window === "undefined") return [];

  const found = new Map<string, WalletOption>();
  const pushProvider = (
    provider: InjectedWalletProvider | undefined,
    detail?: Eip6963ProviderDetail,
  ) => {
    if (!provider) return;
    const id = walletIdFrom(provider, found.size, detail);
    if (found.has(id)) return;
    found.set(id, {
      id,
      name: detail?.info?.name || inferredWalletName(provider),
      icon: detail?.info?.icon,
      provider,
    });
  };

  const handleAnnouncement = (event: Event) => {
    const providerEvent = event as CustomEvent<Eip6963ProviderDetail>;
    pushProvider(providerEvent.detail?.provider, providerEvent.detail);
  };

  window.addEventListener("eip6963:announceProvider", handleAnnouncement as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  if (window.ethereum) {
    pushProvider(window.ethereum);
    const injectedProviders = Array.isArray(window.ethereum.providers)
      ? window.ethereum.providers
      : [];
    injectedProviders.forEach((provider) => pushProvider(provider));
  }

  await new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
  window.removeEventListener("eip6963:announceProvider", handleAnnouncement as EventListener);
  return [...found.values()];
}

export async function requestAccounts(
  provider: InjectedWalletProvider,
  method: "eth_requestAccounts" | "eth_accounts",
) {
  const result = await provider.request({ method });
  const accounts = Array.isArray(result) ? result : [];
  const account = accounts.find(
    (value): value is string => typeof value === "string" && value.startsWith("0x"),
  );
  return account ?? null;
}
