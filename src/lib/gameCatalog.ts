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

/** Original artwork per game — abstract boards and objects only; no crests, kits or likenesses. */
export type GameKind = "board" | "solo" | "live";

export type GameArt = {
  art: string;
  kind: GameKind;
  kindLabel: string;
  time: string;
  isNew?: boolean;
};

export const GAME_ART: Record<string, GameArt> = {
  "tic-tac-toe": { art: ticTacToe, kind: "board", kindLabel: "Grid battle", time: "5 min" },
  "connect-four": { art: connectFour, kind: "board", kindLabel: "Quiz + CPU", time: "8 min" },
  "quiz-ludo": { art: ludo, kind: "live", kindLabel: "Race · online", time: "15 min" },
  "quiz-snakes-ladders": { art: snakes, kind: "live", kindLabel: "Race · online", time: "12 min" },
  "sports-mastermind": { art: mastermind, kind: "live", kindLabel: "Hot seat", time: "3 min rounds" },
  territory: { art: territory, kind: "solo", kindLabel: "Capture hexes", time: "6 min", isNew: true },
  "category-tower": { art: categoryTower, kind: "live", kindLabel: "1v1 climb", time: "10 min" },
  "sports-501": { art: sports501, kind: "solo", kindLabel: "Quiz checkout", time: "5 min", isNew: true },
  connections: { art: connections, kind: "solo", kindLabel: "Logic puzzle", time: "4 min", isNew: true },
  "draft-xi": { art: draftXi, kind: "solo", kindLabel: "Build a squad", time: "6 min", isNew: true },
  bingo: { art: bingo, kind: "solo", kindLabel: "Complete a line", time: "5 min", isNew: true },
  "stat-cards": { art: statCards, kind: "solo", kindLabel: "Survival", time: "5 min" },
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
