/**
 * Static rules data for the Elite: Dangerous RPG (Core Rules: character creation and ranks).
 */

/** Rank advancement table (Core Rules p.49). `maxRankPoints` is the last point total that stays at this rank. */
export const ranks = [
   { key: "harmless", name: "EDRPG.rank.pilots.harmless", maxRankPoints: 7, skillCap: 40, karmaPoints: 10, karmaCap: 3, endurance: 20 },
   { key: "mostlyHarmless", name: "EDRPG.rank.pilots.mostlyHarmless", maxRankPoints: 19, skillCap: 50, karmaPoints: 11, karmaCap: 4, endurance: 25 },
   { key: "novice", name: "EDRPG.rank.pilots.novice", maxRankPoints: 39, skillCap: 55, karmaPoints: 12, karmaCap: 5, endurance: 30 },
   { key: "competent", name: "EDRPG.rank.pilots.competent", maxRankPoints: 69, skillCap: 60, karmaPoints: 13, karmaCap: 6, endurance: 35 },
   { key: "expert", name: "EDRPG.rank.pilots.expert", maxRankPoints: 99, skillCap: 65, karmaPoints: 14, karmaCap: 7, endurance: 40 },
   { key: "master", name: "EDRPG.rank.pilots.master", maxRankPoints: 149, skillCap: 70, karmaPoints: 15, karmaCap: 8, endurance: 45 },
   { key: "dangerous", name: "EDRPG.rank.pilots.dangerous", maxRankPoints: 199, skillCap: 80, karmaPoints: 16, karmaCap: 9, endurance: 50 },
   { key: "deadly", name: "EDRPG.rank.pilots.deadly", maxRankPoints: 299, skillCap: 90, karmaPoints: 17, karmaCap: 10, endurance: 55 },
   { key: "elite", name: "EDRPG.rank.pilots.elite", maxRankPoints: Infinity, skillCap: 100, karmaPoints: 18, karmaCap: 11, endurance: 60 },
];

/** Skills grouped by sheet category. Categories have no game effect (Core Rules p.14). */
export const skills = {
   combat: ["dodge", "energyWeapons", "fighting", "grenade", "heavyWeapons", "kineticWeapons", "meleeWeapons", "parry"],
   intelligence: ["computer", "cultureLaw", "cyber", "medicine", "planetaryKnowledge", "science", "tactics", "trading"],
   social: ["bargain", "bluff", "charm", "diplomacy", "gambling", "insight", "intimidate", "streetwise"],
   vehicle: ["navigation", "repair", "shipPiloting", "shipWeapons", "systems", "vehiclePiloting", "vehicleWeapons"],
   espionage: ["athletics", "perception", "security", "sleightOfHand", "stealth", "survival"],
};

/** Every skill starts at 10 before backgrounds (Core Rules p.14). */
export const BASE_SKILL_SCORE = 10;

/** No Skill score can exceed 100, whatever the item bonus (Core Rules p.128). */
export const MAX_SKILL_SCORE = 100;

/** Fighting — the unarmed attack every character has (Core Rules, Basic Melee Weapons). */
export const fighting = { finesse: 5, damage: "floor(1d10 / 2)" };

/**
 * Skills whose rolls receive the Social Factor (Core Rules p.128, Clothing).
 * Social Factor is a bonus to the roll, not to the Skill score.
 */
export const socialFactorSkills = ["bargain", "bluff", "charm", "diplomacy"];

/** Cyborgs without Discreet cybernetics, or revealed, have a fixed Social Factor of -3 (Core Rules, Cybernetics). */
export const CYBORG_SOCIAL_FACTOR = -3;

/** Pilot Trained — free background for every player character (Core Rules, Backgrounds). */
export const pilotTrained = [
   { skill: "shipPiloting", bonus: 20 },
   { skill: "shipWeapons", bonus: 20 },
   { skill: "systems", bonus: 10 },
];

/** Maximum natural human Endurance (Core Rules p.49). */
export const MAX_HUMAN_ENDURANCE = 80;

/**
 * Contested checks. The book has no general rule; it handles opposition case by case in two patterns:
 * - the opponent's roll sets the difficulty, so equal-or-exceed succeeds (ties go to the initiator);
 * - a roll-off where the initiator must beat the opponent (ties go to the defender).
 * These are the pairings the Core Rules spell out. Any other skill defaults to a roll-off against itself.
 */
export const contestPairs = {
   stealth: { opposing: "perception", ties: "initiator", hidden: true, hint: "EDRPG.contest.pairs.stealth" },
   charm: { opposing: "insight", ties: "initiator", hidden: false, hint: "EDRPG.contest.pairs.charm" },
   athletics: { opposing: "athletics", ties: "defender", hidden: false, hint: "EDRPG.contest.pairs.athletics" },
};

/** Ties in a roll-off go to the defender ("If you equal or lose the check your opponent slips from your grasp"). */
export const DEFAULT_CONTEST_TIES = "defender";

/** Karma Capability groupings as printed in the Core Rules. */
export const karmaCategories = {
   general: "EDRPG.karmaCategory.general",
   anyCombat: "EDRPG.karmaCategory.anyCombat",
   personal: "EDRPG.karmaCategory.personal",
   vehicle: "EDRPG.karmaCategory.vehicle",
   spaceship: "EDRPG.karmaCategory.spaceship",
};

/** Flat lookup: skill key -> category key. */
export const skillCategory = Object.fromEntries(
   Object.entries(skills).flatMap(([category, list]) => list.map((skill) => [skill, category])),
);

/** Localised `{ skillKey: label }` map, for select inputs. */
export function skillChoices() {
   const choices = {};
   for (const [category, list] of Object.entries(skills)) {
      for (const skill of list) {
         choices[skill] = `EDRPG.sheet.skills.${category}.${skill}.name`;
      }
   }
   return choices;
}

/**
 * Find the rank for a rank point total.
 *
 * @param {number} points
 *
 * @returns {object}
 */
export function rankFor(points) {
   return ranks.find((rank) => points <= rank.maxRankPoints) ?? ranks.at(-1);
}
