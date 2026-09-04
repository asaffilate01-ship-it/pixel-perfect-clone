import { Link } from "@tanstack/react-router";
import { Bell, Languages, LogOut, Shield, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notifications";
import logoAsset from "@/assets/fanzeno-horizontal-dark.png.asset.json";
import markAsset from "@/assets/fanzeno-mark.png.asset.json";

const nav = [
  { to: "/", label: "Home" },
  { to: "/clue/$sport", label: "Clue", params: { sport: "football" } },
  { to: "/compete", label: "Arena" },
  { to: "/arcade", label: "Arcade" },
  { to: "/competitions", label: "Monthly" },
  { to: "/leaderboard", label: "Ranks" },
  { to: "/upgrade", label: "Pro" },
] as const;

export function SiteHeader() {
  const { user, isStaff, displayName, signOut } = useAuth();
  const { unread } = useNotifications(20);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center" aria-label="Fanzeno home">
          <img src={logoAsset.url} alt="Fanzeno" className="h-7 w-auto sm:h-9" width={1820} height={512} />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              params={("params" in item ? item.params : undefined) as never}
              className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:flex">
            <Languages className="size-3.5" /> EN
          </span>
          {isStaff && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin">
                <Shield className="size-4" /> Ops
              </Link>
            </Button>
          )}
          {user ? (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                <Link to="/notifications" className="relative">
                  <Bell className="size-4" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[0.55rem] font-black text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">
                  <User className="size-4" />
                  <span className="hidden sm:inline">{displayName}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
