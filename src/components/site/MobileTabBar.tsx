import { Link } from "@tanstack/react-router";
import { Gamepad2, Grid2x2, Home, Radio, Trophy } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/compete", label: "Arena", icon: Grid2x2 },
  { to: "/arcade", label: "Arcade", icon: Gamepad2 },
  { to: "/arcade/rooms", label: "Rooms", icon: Radio },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
] as const;

/** Thumb-friendly mobile navigation with native safe-area spacing. */
export function MobileTabBar() {
  return (
    <nav className="mobile-tab-bar md:hidden" aria-label="Primary mobile navigation">
      {tabs.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="mobile-tab"
          activeProps={{ className: "mobile-tab mobile-tab-active" }}
          activeOptions={{ exact: to === "/" }}
        >
          <Icon className="size-5" aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
