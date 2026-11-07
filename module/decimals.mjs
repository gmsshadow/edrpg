/**
 * Rule Variant: Playing the Decimals (Core Rules p.263). Everyone has this Karma Capability for free:
 * 1 Karma, after a Skill check or Attack roll — roll another D10 and add the unit digit of the Skill score
 * (3 for a Repair of 23). On 10 or more, +1 to the roll. Once per roll.
 */
import { skillCategory } from "./config.mjs";
import { karmaPayer } from "./partner.mjs";
import { rule } from "./rules.mjs";

const MAX_SKILL_SCORE = 100;

/**
 * The unit digit of a character's Skill score (with a rare weapon's Skill score bonus), or null for anyone without
 * Skill scores (opponents).
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {number} [extra=0]  A rare weapon's Skill score bonus.
 *
 * @returns {number|null}
 */
export function scoreDigit(actor, skill, extra = 0) {
   const data = actor?.system?.skills?.[skillCategory[skill]]?.[skill];
   if (!Number.isFinite(data?.score)) return null;
   return Math.min(data.score + (extra || 0), MAX_SKILL_SCORE) % 10;
}

/**
 * Can this actor play the decimals now? (Rule on, a Skill score, someone to pay a Karma point.)
 *
 * @param {Actor} actor
 *
 * @param {number|null} digit
 *
 * @returns {boolean}
 */
export function canPlayDecimals(actor, digit) {
   if (!rule("playingDecimals") || digit === null || digit === undefined || !actor?.isOwner) return false;
   const payer = karmaPayer(actor);
   return (payer?.system.karma?.standard.value ?? 0) >= 1;
}

/**
 * Spend the Karma point and roll.
 *
 * @param {Actor} actor
 *
 * @param {number} digit
 *
 * @returns {Promise<{die: number, digit: number, total: number, ok: boolean, roll: Roll}|null>}
 */
export async function playDecimals(actor, digit) {
   const payer = karmaPayer(actor);
   const karma = payer?.system.karma?.standard.value ?? 0;
   if (karma < 1) {
      ui.notifications.warn("EDRPG.chat.NoKarmaPoints", { localize: true });
      return null;
   }
   await payer.update({ "system.karma.standard.value": karma - 1 });
   const roll = await new Roll("1d10").evaluate();
   const die = roll.total;
   const total = die + digit;
   return { die, digit, total, ok: total >= 10, roll };
}
