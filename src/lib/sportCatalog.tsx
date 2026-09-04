import type { ComponentType, SVGProps } from "react";

/**
 * Original, copyright-safe sport glyphs and category grouping. Icons are simple
 * geometric marks (ball, wicket, racket, flag…) — never team crests or player likenesses.
 */

export type SportCategoryKey = "team" | "bat-ball" | "racket-cue" | "motor" | "combat" | "other";

export const SPORT_CATEGORIES: { key: SportCategoryKey; label: string; blurb: string }[] = [
  { key: "team", label: "Team sports", blurb: "Football, rugby, NFL, NBA, NHL, AFL" },
  { key: "bat-ball", label: "Bat & ball", blurb: "Cricket, baseball" },
  { key: "racket-cue", label: "Racket, club & cue", blurb: "Tennis, golf, snooker, darts" },
  { key: "motor", label: "Motorsport", blurb: "F1, MotoGP, NASCAR, IndyCar" },
  { key: "combat", label: "Combat", blurb: "Boxing, UFC / MMA" },
  { key: "other", label: "More", blurb: "Horse racing and everything else" },
];

const CATEGORY_BY_SLUG: Record<string, SportCategoryKey> = {
  football: "team",
  rugby: "team",
  afl: "team",
  nfl: "team",
  nba: "team",
  nhl: "team",
  cricket: "bat-ball",
  mlb: "bat-ball",
  golf: "racket-cue",
  tennis: "racket-cue",
  snooker: "racket-cue",
  darts: "racket-cue",
  f1: "motor",
  nascar: "motor",
  indycar: "motor",
  motogp: "motor",
  superbikes: "motor",
  "boxing-pro": "combat",
  ufc: "combat",
  "horse-racing": "other",
};

export const sportCategory = (slug: string): SportCategoryKey => CATEGORY_BY_SLUG[slug] ?? "other";

type IconProps = SVGProps<SVGSVGElement>;
const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

const Ball = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
    <path d="M12 7.5V3.2M15.4 10l3.9-1.3M14.1 14l2.5 3.6M9.9 14l-2.5 3.6M8.6 10L4.7 8.7" />
  </svg>
);
const Wicket = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 21V7M12 21V7M17 21V7M6 7h12M9.5 5h5" />
    <circle cx="19" cy="17" r="2" />
  </svg>
);
const RugbyBall = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 19.5c-1.5-5 3-14 12-15 3-.3 4 .7 3.5 3.5-1 9-10 13.5-15 12z" />
    <path d="M9 15l6-6M10.5 16.5l6-6M7.5 13.5l6-6" />
  </svg>
);
const Oval = (p: IconProps) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="12" rx="9" ry="5.5" />
    <path d="M6 12h12M9 9.5v5M15 9.5v5" />
  </svg>
);
const Gridiron = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12c0-3 4-8 9-8s9 5 9 8-4 8-9 8-9-5-9-8z" />
    <path d="M8 12h8M10 10v4M14 10v4M12 9.5v5" />
  </svg>
);
const Diamond = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l9 9-9 9-9-9z" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
  </svg>
);
const Puck = (p: IconProps) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="9" rx="8" ry="3.5" />
    <path d="M4 9v5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5V9" />
  </svg>
);
const Hoop = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </svg>
);
const Flagstick = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 21V4M9 4l8 3-8 3" />
    <ellipse cx="11" cy="20" rx="6" ry="1.6" />
  </svg>
);
const Racket = (p: IconProps) => (
  <svg {...base(p)}>
    <ellipse cx="14" cy="9" rx="6" ry="7" transform="rotate(-35 14 9)" />
    <path d="M9.5 14.5L4 20M11 7l5 5M13 5l4 5M15.5 4l3 4" />
  </svg>
);
const Cue = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 21L18 6" />
    <circle cx="19.5" cy="4.5" r="2" />
    <circle cx="8" cy="8" r="2.2" />
  </svg>
);
const Dart = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" />
    <path d="M12 12l7-7M17 3.5L19 5l1.5 2" />
  </svg>
);
const Helmet = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 13a8 8 0 0116 0v2H4z" />
    <path d="M4 15h16v2H6a2 2 0 01-2-2z" />
    <path d="M9 13h9" />
  </svg>
);
const Chequered = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 21V4h14v11H5" />
    <path d="M5 8h14M5 12h14M9.7 4v11M14.3 4v11" />
  </svg>
);
const Speedo = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 16a8 8 0 0116 0" />
    <path d="M12 16l4-5" />
    <circle cx="12" cy="16" r="1.5" />
    <path d="M4 20h16" />
  </svg>
);
const Wheel = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
  </svg>
);
const Glove = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 12V7a2 2 0 014 0v1a2 2 0 014 0v1a2 2 0 014 0v5a7 7 0 01-7 7h-1a5 5 0 01-5-5v-2a2 2 0 012-2z" />
    <path d="M7 14h4" />
  </svg>
);
const Octagon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" />
    <path d="M9 12h6M12 9v6" />
  </svg>
);
const Horseshoe = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 20V11a6 6 0 0112 0v9" />
    <path d="M4.5 18.5h3M16.5 18.5h3M5 14.5h2.5M16.5 14.5H19" />
  </svg>
);

const ICON_BY_SLUG: Record<string, ComponentType<IconProps>> = {
  football: Ball,
  cricket: Wicket,
  rugby: RugbyBall,
  afl: Oval,
  nfl: Gridiron,
  mlb: Diamond,
  nhl: Puck,
  nba: Hoop,
  golf: Flagstick,
  tennis: Racket,
  snooker: Cue,
  darts: Dart,
  "horse-racing": Horseshoe,
  f1: Helmet,
  nascar: Chequered,
  indycar: Speedo,
  motogp: Wheel,
  superbikes: Wheel,
  "boxing-pro": Glove,
  ufc: Octagon,
};

export function SportIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICON_BY_SLUG[slug] ?? Ball;
  return <Icon className={className} />;
}
