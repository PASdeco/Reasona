import { Link, useLocation } from "@tanstack/react-router";
import { WalletConnect } from "./WalletConnect";
import { ThemeToggle } from "./ThemeToggle";
import { useApp } from "@/store/app";

export function Navbar() {
  const loc = useLocation();
  const { canCreate } = useApp();

  const links = [
    { to: "/", label: "Home" },
    { to: "/explore", label: "Explore" },
    { to: "/analytics", label: "Analytics" },
    ...(canCreate ? [{ to: "/admin", label: "Admin" }] : []),
  ] as const;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="w-7 h-7 rounded-lg bg-primary-gradient shadow-[0_0_20px_-2px] shadow-primary/50" />
          <span className="text-lg tracking-tight">Reasona</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = loc.pathname === l.to || (l.to !== "/" && loc.pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "text-foreground bg-white/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
