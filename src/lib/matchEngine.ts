export type Side = "me" | "them";
export type EndReason = "line" | "board_full" | "passes" | "timeout" | "resigned" | "agreed_draw";
export type MatchResult = { outcome: "win" | "loss" | "draw"; reason: EndReason };

export const COLS = 7;
export const ROWS = 6;

/** Finds a four-in-a-row owner on a gravity board, or null. */
export function connectWinner(board: (Side | null)[], cols = COLS, rows = ROWS): Side | null {
  const at = (r: number, c: number) => board[r * cols + c];
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = at(r, c);
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || at(rr, cc) !== v) {
            ok = false;
            break;
          }
        }
        if (ok) return v;
      }
    }
  }
  return null;
}

/** Drops a token into a column; returns the new board and landing index, or null when full. */
export function dropToken(
  board: (Side | null)[],
  column: number,
  side: Side,
  cols = COLS,
  rows = ROWS,
): { board: (Side | null)[]; index: number } | null {
  const next = [...board];
  for (let row = rows - 1; row >= 0; row--) {
    const i = row * cols + column;
    if (!next[i]) {
      next[i] = side;
      return { board: next, index: i };
    }
  }
  return null;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function ticWinner(owners: (Side | null)[]): Side | null {
  const line = LINES.find((l) => l.every((i) => owners[i] && owners[i] === owners[l[0]!]));
  return line ? owners[line[0]!]! : null;
}

export const reasonText: Record<EndReason, string> = {
  line: "Winning line completed",
  board_full: "The board is full",
  passes: "Both players passed consecutively",
  timeout: "Turn timer expired",
  resigned: "A player resigned",
  agreed_draw: "Draw agreed by both players",
};
