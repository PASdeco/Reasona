import { useApp } from "@/store/app";
import { shortAddr } from "@/lib/reasona";

export function WalletConnect() {
  const { wallet, connect, disconnect, isConnecting, isWalletPickerOpen } = useApp();
  if (wallet) {
    return (
      <button
        onClick={disconnect}
        className="px-4 py-2 rounded-lg border border-white/10 text-sm font-mono glass hover:border-primary/40 transition-colors"
        title="Disconnect"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 align-middle animate-pulse" />
        {shortAddr(wallet)}
      </button>
    );
  }
  return (
    <button
      onClick={() => void connect()}
      className="px-4 py-2 rounded-lg text-sm font-medium border border-primary/40 hover:bg-primary/20 transition-all hover:shadow-[0_0_30px_-5px] hover:shadow-primary/50"
    >
      {isConnecting || isWalletPickerOpen ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
