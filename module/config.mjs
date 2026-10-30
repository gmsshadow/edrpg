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
export const fighting = { finesse: 5, damage: "1d10", halve: true };

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

/** Where a Karma Capability is used, as printed after its name in the Core Rules (pp.31–36). */
export const karmaCategories = {
   general: "EDRPG.karmaCategory.general",
   anyCombat: "EDRPG.karmaCategory.anyCombat",
   personal: "EDRPG.karmaCategory.personal",
   vehicle: "EDRPG.karmaCategory.vehicle",
   spaceship: "EDRPG.karmaCategory.spaceship",
   vehicleSpaceship: "EDRPG.karmaCategory.vehicleSpaceship",
};

/** The book's three lists of Karma Capabilities (Core Rules p.31). */
export const karmaRoles = {
   defensive: "EDRPG.karmaRole.defensive",
   offensive: "EDRPG.karmaRole.offensive",
   other: "EDRPG.karmaRole.other",
};

/** Which attacks a capability's attack bonus applies to. */
/**
 * Enhancements (Core Rules p.25). The key selects what the system automates; taking one again stacks.
 * - ambidextrous: two-weapon penalty -1 (none the second time)
 * - awareness: Initiative may use the Perception bonus instead of Tactics
 * - confident: no Social Factor penalties from equipment, armour or cybernetics
 * - cyberneticAffinity: +2 Karma for cybernetic upgrades each time
 * - dynamicKarma: (reminder only) pay for the most expensive of two (three) capabilities used in your turn
 * - hardToKill: die at minus your maximum Endurance; the second time, Escape Death costs at most 4 Karma
 * - naturalGenius: +10 to one Skill's Skill Cap (max 100)
 * - quickRunner: +2m movement each time (max three times)
 * - strong: +2 Fighting and Melee damage each time (max +10), +20kg lifting
 * - tough: +5 Endurance each time (natural maximum 80)
 */
export const enhancementEffects = {
   none: "EDRPG.enhancement.effect.none",
   ambidextrous: "EDRPG.enhancement.effect.ambidextrous",
   awareness: "EDRPG.enhancement.effect.awareness",
   confident: "EDRPG.enhancement.effect.confident",
   cyberneticAffinity: "EDRPG.enhancement.effect.cyberneticAffinity",
   dynamicKarma: "EDRPG.enhancement.effect.dynamicKarma",
   hardToKill: "EDRPG.enhancement.effect.hardToKill",
   naturalGenius: "EDRPG.enhancement.effect.naturalGenius",
   quickRunner: "EDRPG.enhancement.effect.quickRunner",
   strong: "EDRPG.enhancement.effect.strong",
   tough: "EDRPG.enhancement.effect.tough",
};

/**
 * When an item's bonus to a Skill check applies. "always" bonuses are added automatically; the others are offered
 * as tick boxes in the skill check dialog (Medpacks are ticked for Stabilise and Treat wounds).
 */
export const bonusConditions = {
   always: "EDRPG.bonusWhen.always",
   medical: "EDRPG.bonusWhen.medical",
   repair: "EDRPG.bonusWhen.repair",
   hacking: "EDRPG.bonusWhen.hacking",
   drones: "EDRPG.bonusWhen.drones",
   other: "EDRPG.bonusWhen.other",
};

/** Whether a bonus adds to the roll, or to the Skill score (and so maybe the Skill bonus). */
export const bonusKinds = {
   roll: "EDRPG.bonusKind.roll",
   score: "EDRPG.bonusKind.score",
};

/** Kinds of general equipment (Core Rules pp.128–133). */
export const gearCategories = {
   general: "EDRPG.gear.category.general",
   medical: "EDRPG.gear.category.medical",
   repair: "EDRPG.gear.category.repair",
   com: "EDRPG.gear.category.com",
   cosmetic: "EDRPG.gear.category.cosmetic",
   stim: "EDRPG.gear.category.stim",
   injector: "EDRPG.gear.category.injector",
   ammo: "EDRPG.gear.category.ammo",
};

/** Base movement per turn for a person (Core Rules, Personal Combat). */
export const BASE_SPEED = 10;

export const karmaAttackKinds = {
   melee: "EDRPG.karmaAttack.melee",
   ranged: "EDRPG.karmaAttack.ranged",
   any: "EDRPG.karmaAttack.any",
};

/** Which defence a capability's defence bonus applies to. */
export const karmaDefenceKinds = {
   dodge: "EDRPG.attack.part.dodge",
   parry: "EDRPG.attack.part.parry",
   any: "EDRPG.karmaAttack.any",
};

/** Skills used for ranged personal-combat attacks (Crack Shot: "Kinetic, Energy or Heavy Weapon attack"). */
export const rangedAttackSkills = ["kineticWeapons", "energyWeapons", "heavyWeapons"];

/** Attack modifiers (Core Rules pp.57–61). */
/**
 * Missed explosives (Core Rules pp.59–60).
 * Mapped: D10 for direction (1–8 clockwise from the square "above" the target; 9–10 overshoot along the line of fire),
 * then D10 squares. Mapless: the Grenade or Missile Miss Table.
 */
export const scatterDirections = {
   1: "EDRPG.scatter.dir.1",
   2: "EDRPG.scatter.dir.2",
   3: "EDRPG.scatter.dir.3",
   4: "EDRPG.scatter.dir.4",
   5: "EDRPG.scatter.dir.5",
   6: "EDRPG.scatter.dir.6",
   7: "EDRPG.scatter.dir.7",
   8: "EDRPG.scatter.dir.8",
};

/** Mapless miss tables: [highest D10, result key, extra dice formula or null, harmless]. */
export const missTables = {
   grenade: [
      [2, "grenade.short", "1d10", false],
      [5, "grenade.whoosh", null, true],
      [9, "grenade.long", "1d10", false],
      [10, "grenade.random", null, false],
   ],
   missile: [
      [5, "missile.whoosh", null, true],
      [9, "missile.long", "2d10", false],
      [10, "missile.short", "2d10", false],
   ],
};

export const attackRules = {
   cover: 2, // Target in cover: +2 Defence against ranged weapons.
   aim: 5, // Aimed for a full turn: +5 To Hit.
   twoWeapons: -2, // Two one-handed weapons: -2 To Hit with each.
   groundTarget: 3, // Missiles/launchers aimed at the ground: 3 + range difficulty.
   grenadeMinimum: 7, // Thrown grenade: 7 or the number of squares, whichever is greater.
   zeroGravity: 2, // Grenades in zero gravity: +2 difficulty.
   grenadeAdvantage: 7, // Mapless grenade thrown with advantage (round a corner, down stairs).
   grenadeDisadvantage: 12, // Mapless grenade bowled in the open.
};

/** Common items are printed in green, rare in blue (Core Rules p.99). */
export const rarities = {
   common: "EDRPG.rarity.common",
   rare: "EDRPG.rarity.rare",
};

/** Where an item is kept, matching the character sheet's equipment sections. */
export const equipmentLocations = {
   carried: "EDRPG.location.carried",
   pack: "EDRPG.location.pack",
   ship: "EDRPG.location.ship",
};

/** Skills a weapon can attack with. */
export const weaponSkills = {
   kineticWeapons: "EDRPG.sheet.skills.combat.kineticWeapons.name",
   energyWeapons: "EDRPG.sheet.skills.combat.energyWeapons.name",
   heavyWeapons: "EDRPG.sheet.skills.combat.heavyWeapons.name",
   grenade: "EDRPG.sheet.skills.combat.grenade.name",
   meleeWeapons: "EDRPG.sheet.skills.combat.meleeWeapons.name",
   fighting: "EDRPG.sheet.skills.combat.fighting.name",
};

/** The six types of Damage armour can absorb (Core Rules p.121). */
export const damageTypes = {
   kinetic: "EDRPG.damage.kinetic",
   energy: "EDRPG.damage.energy",
   explosive: "EDRPG.damage.explosive",
   fighting: "EDRPG.damage.fighting",
   melee: "EDRPG.damage.melee",
   toxic: "EDRPG.damage.toxic",
};

/**
 * Burst: extra Damage for each point an attack beats the difficulty To Hit, up to the weapon's maximum.
 * Burst +1D10 per point; Heavy Burst +2D10 per point; energy weapons +5 per point (Core Rules p.57).
 */
export const burstKinds = {
   none: "EDRPG.burst.none",
   burst: "EDRPG.burst.burst",
   heavy: "EDRPG.burst.heavy",
   energy: "EDRPG.burst.energy",
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
