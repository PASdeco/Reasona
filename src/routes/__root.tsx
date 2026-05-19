import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppProvider } from "@/store/app";
import { Navbar } from "@/components/Navbar";
import { useApp } from "@/store/app";
import { WalletPicker } from "@/components/WalletPicker";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="mt-6 inline-flex px-4 py-2 rounded-lg bg-primary-gradient font-medium">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex px-4 py-2 rounded-lg bg-primary-gradient font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Reasona — Governance Powered by Collective Intelligence" },
      { name: "description", content: "Decentralized governance with reasoning-backed votes and AI consensus intelligence." },
      { property: "og:title", content: "Reasona" },
      { property: "og:description", content: "Governance powered by collective intelligence." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RootApp />
      </AppProvider>
    </QueryClientProvider>
  );
}

function RootApp() {
  const { contractReady } = useApp();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {!contractReady && (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-100">
          Deploy `contracts/reasona.py` and set `VITE_REASONA_CONTRACT_ADDRESS` to activate live contract data.
        </div>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      <WalletPicker />
    </div>
  );
}
