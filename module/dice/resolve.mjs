/**
 * Check resolution (Core Rules p.44): D10 + skill bonus + modifiers against a difficulty.
 *
 * - A natural 1 always fails and a natural 10 always succeeds (the Rule of 1 and 10).
 * - The margin is how far the total beats the difficulty (Burst).
 * - Opposed checks: a natural 1 always loses and a natural 10 always wins (unless both rolled it), then the higher
 *   total. Ties follow the contest's tie rule.
 *
 * Skill checks, contests, personal and craft attacks, grabs and driving checks all judge through here.
 */

/**
 * Judge a check.
 *
 * @param {object} p
 *
 * @param {number} p.natural  The D10.
 *
 * @param {number} p.total    With every bonus.
 *
 * @param {number} p.dn       The difficulty.
 *
 * @returns {{success: boolean, margin: number, critical: boolean, fumble: boolean, outcome: string, reason: string|null}}
 *          outcome: critFailure | critSuccess | success | failure. reason: why the die overrode the numbers.
 */
export function judge({ natural, total, dn }) {
   const fumble = natural === 1;
   const critical = natural === 10;
   const success = critical || (!fumble && total >= dn);
   const outcome = fumble ? "critFailure" : critical ? "critSuccess" : success ? "success" : "failure";
   const reason = fumble ? "natural1" : critical && total < dn ? "natural10" : null;
   return { success, margin: success ? Math.max(0, total - dn) : 0, critical, fumble, outcome, reason };
}

/**
 * Can Karma reroll this roll ("Re-rolling a 1", Core Rules p.31)?
 *
 * @param {number} natural
 *
 * @returns {boolean}
 */
export function karmaRerollable(natural) {
   return natural === 1;
}

/**
 * Who wins an opposed check.
 *
 * @param {{natural: number, total: number}} a  Initiator.
 *
 * @param {{natural: number, total: number}} d  Defender.
 *
 * @param {"initiator"|"defender"} ties
 *
 * @returns {{winner: "initiator"|"defender", reason: string}}
 */
export function opposed(a, d, ties) {
   if (a.natural === 1 && d.natural !== 1) return { winner: "defender", reason: "natural1" };
   if (d.natural === 1 && a.natural !== 1) return { winner: "initiator", reason: "natural1" };
   if (a.natural === 10 && d.natural !== 10) return { winner: "initiator", reason: "natural10" };
   if (d.natural === 10 && a.natural !== 10) return { winner: "defender", reason: "natural10" };
   if (a.total > d.total) return { winner: "initiator", reason: "total" };
   if (d.total > a.total) return { winner: "defender", reason: "total" };
   return { winner: ties, reason: "tie" };
}
