/**
 * Single source of truth for academy-friendly UI copy.
 * Use these helpers in headings, buttons, and tooltips so wording stays consistent.
 *
 * NOT investment platform language — this is a learning academy.
 */
export const COPY = {
  account: {
    practice: "Practice account",
    goal: "Goal",
    progress: "Progress",
    requestPayout: "Request cash-out",
    cashOut: "Cash-out (admin approval)",
  },
  wallet: {
    topUp: "Top-up",
    addBtax: "Add BTAX",
    convert: "Convert",
  },
  program: {
    join: "Join program",
    program: "Program",
    progressLabel: "My progress",
  },
} as const;
