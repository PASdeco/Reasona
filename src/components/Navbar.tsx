import { Link, useLocation } from "@tanstack/react-router";
import { WalletConnect } from "./WalletConnect";

const links = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/analytics", label: "Analytics" },
  { to: "/admin", label: "Admin" },
] as const;

export function Navbar() {
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/5">
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
                  active ? "text-foreground bg-white/5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <WalletConnect />
      </div>
    </header>
  );
}
