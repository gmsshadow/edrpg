/**
 * Check resolution: the Core Rules' D10 + bonus against a difficulty, or the d100 roll-under variant.
 *
 * The world setting "resolution" picks one (it needs a reload). Everything that makes a check — skill checks,
 * contests, personal and craft attacks, grabs, driving checks, engineering — rolls and judges through here, so the
 * two modes share the same cards, Karma and follow-ups.
 *
 * Core (Core Rules p.44): D10 + skill bonus + modifiers ≥ difficulty. A natural 1 always fails, a natural 10 always
 * succeeds. The margin is how far the total beats the difficulty (Burst).
 *
 * d100 (Nicholas's conversion): roll d100 equal to or under a target.
 *   Target = Skill score + (11 − difficulty) × 10 + every d10 modifier × 10.
 * - 01–05 always succeed (SL 0), 96–00 always fail (this replaces the Rule of 1 and 10).
 * - A success's Success Level (SL) is its tens die, +1 per full 10 the target is over 100. SL replaces the margin.
 * - A success is a critical if it is a double (11, 22 … 88) or exactly the target (this replaces the natural 10).
 * - Opposed checks: success beats failure, then the higher SL, then the higher roll.
 * Manoeuvre contests (Dogfight, Ram, Pursuit, Chicken, Tailing), Initiative, damage and the GM's tables stay on d10.
 */

/** Is the world using the d100 variant? */
export function isD100() {
   try {
      return game.settings.get("edrpg", "resolution") === "d100";
   } catch {
      return false;
   }
}

/** The difficulty bands of the d100 variant (their d10 equivalents). */
export const D100_BANDS = [
   { key: "veryEasy", dn: 5 },
   { key: "easy", dn: 8 },
   { key: "average", dn: 11 },
   { key: "hard", dn: 14 },
   { key: "veryHard", dn: 17 },
   { key: "almostImpossible", dn: 20 },
];

/**
 * A d10 difficulty number as a d100 modifier.
 *
 * @param {number} dn
 *
 * @returns {number}
 */
export function dnModifier(dn) {
   return (11 - (Number(dn) || 0)) * 10;
}

/**
 * A d100 target: a Skill score, d10-unit modifiers (×10), a d10 difficulty and native d100 modifiers.
 *
 * @param {object} p
 *
 * @param {number} [p.score=0]
 *
 * @param {number} [p.points=0]   d10 modifiers (each +1 is +10).
 *
 * @param {number} [p.dn=11]      d10 difficulty (11 = no modifier).
 *
 * @param {number} [p.flat=0]     d100 modifiers, as entered.
 *
 * @returns {number}
 */
export function target100({ score = 0, points = 0, dn = 11, flat = 0 }) {
   return score + points * 10 + dnModifier(dn) + flat;
}

/**
 * A skill's d100 score for an actor: the Skill score for characters, or the stat block's bonus × 10.
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {number} [bonus]  The d10 bonus being used, if known (e.g. an opponent's To Hit).
 *
 * @returns {number}
 */
export function scoreFor(actor, skill, bonus) {
   const s = actor?.system?.skillScore?.(skill);
   if (s !== undefined && s !== null) return s;
   return (bonus ?? actor?.system?.skillBonus?.(skill) ?? 0) * 10;
}

/**
 * Roll a d100 for a check.
 *
 * @returns {Promise<{roll: Roll, natural: number}>}
 */
export async function rollD100() {
   const roll = await new Roll("1d100").evaluate();
   return { roll, natural: roll.total };
}

/**
 * Was this roll a d100 automatic failure (96–00)?
 *
 * @param {number} natural
 *
 * @returns {boolean}
 */
export function autoFail100(natural) {
   return natural >= 96;
}

/**
 * Judge a d100 roll against its target.
 *
 * @param {number} natural  1–100 (100 is "00").
 *
 * @param {number} target
 *
 * @returns {{success: boolean, sl: number, critical: boolean, fumble: boolean, auto: string|null}}
 */
export function judge100(natural, target) {
   const fumble = autoFail100(natural);
   const autoWin = natural <= 5;
   const success = !fumble && (autoWin || natural <= target);
   const over = target > 100 ? Math.floor((target - 100) / 10) : 0;
   const sl = success ? (natural <= 9 ? 0 : Math.floor(natural / 10)) + over : 0;
   const double = natural % 11 === 0 && natural <= 88;
   const critical = success && (natural === target || (double && natural <= target));
   const auto = fumble ? "fail" : autoWin && natural > target ? "success" : null;
   return { success, sl, critical, fumble, auto };
}

/**
 * Judge a check in the current mode. The result is the same shape either way.
 *
 * - Core: pass `natural` (the d10) and `total` (with every bonus), against `dn`.
 * - d100: pass `natural` (the d100) and `target`.
 *
 * @param {object} p
 *
 * @param {number} p.natural
 *
 * @param {number} [p.total]
 *
 * @param {number} [p.dn]
 *
 * @param {number} [p.target]
 *
 * @param {boolean} [p.d100]  Force a mode (defaults to the world setting).
 *
 * @returns {{success: boolean, margin: number, critical: boolean, fumble: boolean, outcome: string, reason: string|null}}
 *          outcome: critFailure | critSuccess | success | failure. reason: why the dice overrode the numbers.
 */
export function judge({ natural, total, dn, target, d100 = isD100() }) {
   if (d100) {
      const j = judge100(natural, target);
      const outcome = j.fumble ? "critFailure" : j.critical ? "critSuccess" : j.success ? "success" : "failure";
      return { success: j.success, margin: j.sl, critical: j.critical, fumble: j.fumble, outcome, reason: j.auto ? `auto.${j.auto}` : null };
   }
   const fumble = natural === 1;
   const critical = natural === 10;
   const success = critical || (!fumble && total >= dn);
   const outcome = fumble ? "critFailure" : critical ? "critSuccess" : success ? "success" : "failure";
   const reason = fumble ? "natural1" : critical && total < dn ? "natural10" : null;
   return { success, margin: success ? Math.max(0, total - dn) : 0, critical, fumble, outcome, reason };
}

/**
 * Can Karma reroll this roll ("Re-rolling a 1"; in d100, a 96–00 automatic failure)?
 *
 * @param {number} natural
 *
 * @param {boolean} [d100]
 *
 * @returns {boolean}
 */
export function karmaRerollable(natural, d100 = isD100()) {
   return d100 ? autoFail100(natural) : natural === 1;
}

/**
 * Who wins an opposed check.
 *
 * - Core: a natural 1 always loses and a natural 10 always wins (unless both rolled it); then the higher total.
 * - d100: success beats failure, then the higher SL, then the higher roll.
 * Ties follow the contest's tie rule.
 *
 * @param {object} a  Initiator: {natural, total} (core) or {natural, target} (d100).
 *
 * @param {object} d  Defender.
 *
 * @param {"initiator"|"defender"} ties
 *
 * @returns {{winner: "initiator"|"defender", reason: string}}
 */
export function opposed(a, d, ties, d100 = a.target !== undefined && a.target !== null) {
   if (d100) {
      const ja = judge100(a.natural, a.target);
      const jd = judge100(d.natural, d.target);
      if (ja.success !== jd.success) return { winner: ja.success ? "initiator" : "defender", reason: "success" };
      if (ja.success && ja.sl !== jd.sl) return { winner: ja.sl > jd.sl ? "initiator" : "defender", reason: "sl" };
      // Two failures: an automatic failure loses to an ordinary one.
      if (!ja.success && ja.fumble !== jd.fumble) return { winner: ja.fumble ? "defender" : "initiator", reason: "auto.fail" };
      // Equal SL, or two failures: the higher roll.
      if (a.natural !== d.natural) return { winner: a.natural > d.natural ? "initiator" : "defender", reason: "roll" };
      return { winner: ties, reason: "tie" };
   }
   if (a.natural === 1 && d.natural !== 1) return { winner: "defender", reason: "natural1" };
   if (d.natural === 1 && a.natural !== 1) return { winner: "initiator", reason: "natural1" };
   if (a.natural === 10 && d.natural !== 10) return { winner: "initiator", reason: "natural10" };
   if (d.natural === 10 && a.natural !== 10) return { winner: "defender", reason: "natural10" };
   if (a.total > d.total) return { winner: "initiator", reason: "total" };
   if (d.total > a.total) return { winner: "defender", reason: "total" };
   return { winner: ties, reason: "tie" };
}

/**
 * A d100 result's SL (0 on a failure).
 *
 * @param {number} natural
 *
 * @param {number} target
 *
 * @returns {number}
 */
export function successLevel(natural, target) {
   return judge100(natural, target).sl;
}

/**
 * A d100 roll shown as the dice read it ("00" for 100, two digits otherwise).
 *
 * @param {number} natural
 *
 * @returns {string}
 */
export function d100Label(natural) {
   return natural === 100 ? "00" : String(natural).padStart(2, "0");
}

/**
 * The tens die of a d100 roll read as a d10 (1–10), for rules that need a d10 total from a check (Treat wounds).
 *
 * @param {number} natural
 *
 * @returns {number}
 */
export function tensAsD10(natural) {
   return (Math.floor((natural % 100) / 10) || 10);
}
