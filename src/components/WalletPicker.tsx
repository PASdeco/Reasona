import { useApp } from "@/store/app";

function walletLabel(name: string) {
  return name;
}

export function WalletPicker() {
  const { walletOptions, isWalletPickerOpen, closeWalletPicker, connectWallet, isConnecting } = useApp();

  if (!isWalletPickerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background p-6 shadow-2xl">
        <div className="mb-4">
          <div className="text-sm font-semibold">Choose a wallet</div>
          <div className="text-xs text-muted-foreground">Pick the injected wallet you want Reasona to use.</div>
        </div>
        <div className="space-y-2">
          {walletOptions.map((wallet) => (
            <button
              key={wallet.id}
              disabled={isConnecting}
              onClick={() => void connectWallet(wallet.id)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{walletLabel(wallet.name)}</div>
                  <div className="text-xs text-muted-foreground">Injected provider</div>
                </div>
                <div className="text-xs text-primary">Select</div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={closeWalletPicker} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
