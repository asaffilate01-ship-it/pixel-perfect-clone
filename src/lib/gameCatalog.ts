import {
  ArrowUpDown,
  BarChart3,
  Brain,
  Circle,
  Gamepad2,
  Grid3x3,
  Hexagon,
  Layers,
  LayoutGrid,
  Link,
  Puzzle,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import ludo from "@/assets/games/quiz-ludo.jpg";
import snakes from "@/assets/games/quiz-snakes-ladders.jpg";
import mastermind from "@/assets/games/sports-mastermind.jpg";
import connectFour from "@/assets/games/connect-four.jpg";
import ticTacToe from "@/assets/games/tic-tac-toe.jpg";
import territory from "@/assets/games/territory.jpg";
import sports501 from "@/assets/games/sports-501.jpg";
import connections from "@/assets/games/connections.jpg";
import draftXi from "@/assets/games/draft-xi.jpg";
import bingo from "@/assets/games/bingo.jpg";
import categoryTower from "@/assets/games/category-tower.jpg";
import statCards from "@/assets/games/stat-cards.jpg";

/** Abstract visual tone for each game card. Always avoids team logos / player likenesses. */
export type GameTone = "primary" | "gold" | "accent" | "secondary" | "destructive";

export type GameKind = "board" | "solo" | "live";

export type GameArt = {
  art: string;
  icon: LucideIcon;
  tone: GameTone;
  kind: GameKind;
  kindLabel: string;
  time: string;
  isNew?: boolean;
};

export const GAME_ART: Record<string, GameArt> = {
  "higher-lower": {
    art: statCards,
    icon: ArrowUpDown,
    tone: "accent",
    kind: "solo",
    kindLabel: "Higher or lower",
    time: "3 min",
    isNew: true,
  },
  "tic-tac-toe": {
    art: ticTacToe,
    icon: Grid3x3,
    tone: "primary",
    kind: "board",
    kindLabel: "Grid battle",
    time: "5 min",
  },
  "connect-four": {
    art: connectFour,
    icon: Circle,
    tone: "gold",
    kind: "board",
    kindLabel: "Quiz + CPU",
    time: "8 min",
  },
  "quiz-ludo": {
    art: ludo,
    icon: Gamepad2,
    tone: "primary",
    kind: "live",
    kindLabel: "Race · online",
    time: "15 min",
  },
  "quiz-snakes-ladders": {
    art: snakes,
    icon: ArrowUpDown,
    tone: "accent",
    kind: "live",
    kindLabel: "Race · online",
    time: "12 min",
  },
  "sports-mastermind": {
    art: mastermind,
    icon: Brain,
    tone: "gold",
    kind: "live",
    kindLabel: "Hot seat",
    time: "3 min rounds",
  },
  territory: {
    art: territory,
    icon: Hexagon,
    tone: "primary",
    kind: "solo",
    kindLabel: "Capture hexes",
    time: "6 min",
    isNew: true,
  },
  "category-tower": {
    art: categoryTower,
    icon: Layers,
    tone: "secondary",
    kind: "solo",
    kindLabel: "Quiz climb",
    time: "10 min",
  },
  "sports-501": {
    art: sports501,
    icon: Target,
    tone: "gold",
    kind: "solo",
    kindLabel: "Quiz checkout",
    time: "5 min",
    isNew: true,
  },
  connections: {
    art: connections,
    icon: Link,
    tone: "accent",
    kind: "solo",
    kindLabel: "Logic puzzle",
    time: "4 min",
    isNew: true,
  },
  "crossword-quiz": {
    art: connections,
    icon: Puzzle,
    tone: "primary",
    kind: "solo",
    kindLabel: "Clue puzzle",
    time: "6 min",
    isNew: true,
  },
  "draft-xi": {
    art: draftXi,
    icon: Users,
    tone: "primary",
    kind: "solo",
    kindLabel: "Build a squad",
    time: "6 min",
    isNew: true,
  },
  bingo: {
    art: bingo,
    icon: LayoutGrid,
    tone: "gold",
    kind: "solo",
    kindLabel: "Complete a line",
    time: "5 min",
    isNew: true,
  },
  "stat-cards": {
    art: statCards,
    icon: BarChart3,
    tone: "secondary",
    kind: "solo",
    kindLabel: "Survival",
    time: "5 min",
  },
};

export const TONE_TEXT: Record<GameTone, string> = {
  primary: "text-primary",
  gold: "text-gold",
  accent: "text-accent",
  secondary: "text-secondary",
  destructive: "text-destructive",
};

export const TONE_GRADIENT: Record<GameTone, string> = {
  primary: "from-primary/15 to-surface-strong",
  gold: "from-gold/15 to-surface-strong",
  accent: "from-accent/15 to-surface-strong",
  secondary: "from-secondary/15 to-surface-strong",
  destructive: "from-destructive/15 to-surface-strong",
};

export const GAME_FILTERS: { key: "all" | "free" | "pro" | GameKind | "new"; label: string }[] = [
  { key: "all", label: "All games" },
  { key: "new", label: "New" },
  { key: "free", label: "Free" },
  { key: "pro", label: "Pro" },
  { key: "solo", label: "Solo puzzles" },
  { key: "board", label: "Board battles" },
  { key: "live", label: "Live online" },
];
