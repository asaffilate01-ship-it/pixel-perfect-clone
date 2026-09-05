export type GameRule = {
  name: string;
  players: string;
  goal: string;
  steps: string[];
  scoring: string;
};

export const GAME_RULES: Record<string, GameRule> = {
  "tic-tac-toe": {
    name: "Tic-Tac-Toe",
    players: "Solo, same-device 2 player, chosen friend or random rival",
    goal: "Claim three squares in a row.",
    steps: [
      "Choose a square.",
      "Answer its two-part sports criterion.",
      "A correct answer claims it; a wrong answer leaves it available for the other player.",
      "Pass to surrender the turn without claiming a square.",
    ],
    scoring:
      "Harder valid answers earn more points. The line wins; a full board without a line is a draw.",
  },
  "connect-four": {
    name: "Connect Four",
    players: "Solo versus the computer",
    goal: "Connect four tokens horizontally, vertically or diagonally.",
    steps: [
      "Select an open column.",
      "Answer the sports question.",
      "A correct answer drops your token; a wrong answer or pass gives the rival the turn.",
      "The first line of four wins.",
    ],
    scoring: "Question difficulty changes the points earned; board position decides the match.",
  },
  "quiz-ludo": {
    name: "Quiz Ludo",
    players: "2–4 local or online players",
    goal: "Race your token home before everyone else.",
    steps: [
      "Choose a sport, category and difficulty.",
      "Answer without a clue to move six.",
      "Use the clue and answer correctly to move five.",
      "A wrong answer or pass scores zero movement.",
    ],
    scoring: "First home wins. Correct answers and difficulty also contribute to ranking points.",
  },
  "quiz-snakes-ladders": {
    name: "Quiz Snakes & Ladders",
    players: "2–4 local or online players",
    goal: "Reach square 100 first.",
    steps: [
      "Answer to move six, or reveal the clue and move five.",
      "Wrong answers and passes do not move.",
      "Ladders take you up and snakes bring you down.",
      "Turns rotate automatically.",
    ],
    scoring: "First to 100 wins; difficulty and correct-answer streaks add ranking points.",
  },
  "sports-mastermind": {
    name: "Sports Mastermind",
    players: "1–4 local or online players",
    goal: "Score the most correct answers under timed pressure.",
    steps: [
      "Play three minutes on your chosen subject.",
      "Then play three minutes of mixed sport.",
      "Answer or pass as quickly as possible.",
      "Online rivals can watch but cannot answer your questions.",
    ],
    scoring: "Most points wins. If tied, the player with fewer passes wins.",
  },
  "higher-lower": {
    name: "Higher or Lower",
    players: "Solo",
    goal: "Build the longest correct comparison streak.",
    steps: [
      "Read the shared statistic.",
      "Decide whether the second athlete's value is higher or lower.",
      "The value is revealed after your choice.",
      "Three mistakes end the run.",
    ],
    scoring: "Difficulty and consecutive correct choices multiply the score.",
  },
  "crossword-quiz": {
    name: "Sports Crossword",
    players: "Solo",
    goal: "Complete every Across and Down answer.",
    steps: [
      "Match each clue number to its numbered starting square.",
      "Type one letter per square.",
      "Crossing answers share letters.",
      "Use a hint only when needed, then check the grid.",
    ],
    scoring: "Each correct letter earns 100 points; each hint costs 150 points.",
  },
  territory: {
    name: "Territory",
    players: "Solo versus the computer",
    goal: "Capture the required number of connected hexes.",
    steps: [
      "Choose a neighbouring hex.",
      "Answer correctly to capture it.",
      "A miss lets the rival respond.",
      "Protect routes and block rival chains.",
    ],
    scoring: "Win by reaching the territory target before the rival.",
  },
  "sports-501": {
    name: "Sports 501",
    players: "Solo",
    goal: "Reduce 501 to exactly zero and finish on a double.",
    steps: [
      "Choose the difficulty for each three-question visit.",
      "Harder questions create larger dart scores, up to 180.",
      "Wrong answers score nothing.",
      "Avoid going below zero and complete the exact double checkout.",
    ],
    scoring: "Fewest visits and strongest difficulty performance produce the best score.",
  },
  connections: {
    name: "Sports Connections",
    players: "Solo",
    goal: "Find four groups of four connected sports terms.",
    steps: [
      "Select four tiles that share a precise link.",
      "Submit the group.",
      "Correct groups lock in and reveal their connection.",
      "Four mistakes end the puzzle.",
    ],
    scoring: "Solve all four groups with as few mistakes as possible.",
  },
  "draft-xi": {
    name: "Draft XI",
    players: "Solo",
    goal: "Build a valid squad by answering recruitment questions.",
    steps: [
      "Choose the next squad slot.",
      "Answer its sports criterion.",
      "Correct answers sign the player.",
      "Complete the required squad before running out of chances.",
    ],
    scoring: "Harder selections and fewer misses earn more points.",
  },
  bingo: {
    name: "Sports Bingo",
    players: "Solo",
    goal: "Complete a horizontal, vertical or diagonal line.",
    steps: [
      "Choose a bingo square.",
      "Answer its question.",
      "Correct answers stamp the square.",
      "Plan the shortest route to a complete line.",
    ],
    scoring: "Complete a line quickly with the fewest misses.",
  },
  "category-tower": {
    name: "Category Tower",
    players: "Solo",
    goal: "Climb all eight levels without losing every life.",
    steps: [
      "Answer the current category question.",
      "Correct answers move you up.",
      "Questions become harder higher in the tower.",
      "A wrong answer costs a life.",
    ],
    scoring: "Height, remaining lives and difficulty determine the score.",
  },
  "stat-cards": {
    name: "Stat Cards",
    players: "Solo",
    goal: "Win ten comparisons before losing all lives.",
    steps: [
      "Review your card and the chosen statistic.",
      "Select the strongest comparison.",
      "The rival card is revealed.",
      "A losing comparison costs a life.",
    ],
    scoring: "Ten card wins completes the deck; streaks raise the score.",
  },
};
