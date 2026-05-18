import { useApp } from "@/store/app";
import type { Role } from "@/mock/wallets";

const roles: Role[] = ["Owner", "Creator", "Community"];

export function RoleSwitcher() {
  const { role, setRole } = useApp();
  return (
    <div className="fixed bottom-4 left-4 z-50 glass rounded-xl p-2 shadow-soft">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pt-1 pb-2">
        Demo Role
      </div>
      <div className="flex gap-1">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              role === r
                ? "bg-primary-gradient text-white shadow-[0_0_20px_-5px] shadow-primary/60"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
