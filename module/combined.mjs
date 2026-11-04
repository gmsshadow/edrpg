/**
 * Combined Scale Combat (Core Rules pp.254–259): individuals, vehicles and spaceships in one fight.
 *
 * - Scales: individual (characters, NPCs, opponents, partners), vehicle, spaceship.
 * - Defence: a smaller unit gets +5 against the next scale up and +10 against spaceships when an individual
 *   (individual vs vehicle +5, vs ship +10; vehicle vs ship +5).
 * - Damage: ×2 vehicle → individual, ×8 ship → individual, ×4 ship → vehicle; ½ individual → vehicle, ⅛ individual →
 *   ship, ¼ vehicle → ship (round down). Individuals take no Damage bonuses (vs shields, Burst) and are knocked over.
 * - Reach:
 *   - An individual attacks a vehicle (assume 50m) or a ship (assume 400m) only in its up-close zone, adding its Defence
 *     to the range difficulty as usual.
 *   - A vehicle attacks a ship only in the ship's up-close zone, and only with turrets (by Snipe or Broadsides, the
 *     latter even from at-distance); missile racks also reach ships at-distance.
 *   - A spaceship treats every vehicle and individual as up-close.
 * - Actions: no Tail or Dogfight across scales; a ship can't Snipe individuals and gets no +1 Sniping vehicles; ships'
 *   gimballed weapons lose their Accuracy against anything but ships; only a larger unit can Ram or play Chicken, and a
 *   ship only Chicken. No pursuit checks across scales, and a Joust by another scale doesn't draw anyone up-close.
 * - Cover: individuals +2 (obscuring) or +4 (hard) against vehicle and ship weapons, blown away by a shot that misses
 *   only because of it; vehicles +2 / +4 against ships on the Medium / Heavy obstacle tables (never blown away).
 */
import { isCraft } from "./data/vehicle.mjs";
import { zoneOf } from "./zones.mjs";

/** Size order of the scales. */
export const SCALES = ["individual", "vehicle", "ship"];

/** Damage multipliers: DAMAGE_SCALE[attacker][defender] (p.257). */
export const DAMAGE_SCALE = {
   individual: { individual: 1, vehicle: 1 / 2, ship: 1 / 8 },
   vehicle: { individual: 2, vehicle: 1, ship: 1 / 4 },
   ship: { individual: 8, vehicle: 4, ship: 1 },
};

/** Defence bonus for being smaller: SCALE_DEFENCE[attacker][defender] (pp.254–256). */
export const SCALE_DEFENCE = {
   vehicle: { individual: 5 },
   ship: { individual: 10, vehicle: 5 },
};

/** The distance an individual assumes to a craft it shoots at, unless the GM says otherwise (p.255). */
export const ASSUMED_RANGE = { vehicle: 50, ship: 400 };

/** Cover for individuals against vehicle and ship weapons (p.257). */
export const INDIVIDUAL_COVER = { none: 0, obscuring: 2, hard: 4 };

/** Cover for vehicles against ships, by the obstacle table they drive on (p.258). */
export const VEHICLE_COVER = { none: 0, light: 0, medium: 2, heavy: 4 };

/**
 * The scale of a unit.
 *
 * @param {Actor} actor
 *
 * @returns {"individual"|"vehicle"|"ship"|null}
 */
export function scaleOf(actor) {
   if (!actor) return null;
   if (isCraft(actor)) return actor.system?.isShip ? "ship" : "vehicle";
   return actor.system?.endurance ? "individual" : null;
}

/** Is `a` a bigger scale than `b`? */
export const bigger = (a, b) => SCALES.indexOf(a) > SCALES.indexOf(b);

/** Do these two fight across scales? */
export function crossScale(a, b) {
   const sa = scaleOf(a);
   const sb = scaleOf(b);
   return !!sa && !!sb && sa !== sb;
}

/**
 * Defence bonus for the defender's smaller scale.
 *
 * @param {string} attacker  Scale.
 *
 * @param {string} defender  Scale.
 *
 * @returns {number}
 */
export function scaleDefence(attacker, defender) {
   return SCALE_DEFENCE[attacker]?.[defender] ?? 0;
}

/**
 * Scale an amount of Damage (round down).
 *
 * @param {number} amount
 *
 * @param {string} from  Attacker's scale.
 *
 * @param {string} to    Defender's scale.
 *
 * @returns {number}
 */
export function scaleDamage(amount, from, to) {
   const f = DAMAGE_SCALE[from]?.[to] ?? 1;
   return Math.floor((Number(amount) || 0) * f);
}

/** "×8", "½", "¼"… for cards. */
export function factorLabel(from, to) {
   const f = DAMAGE_SCALE[from]?.[to] ?? 1;
   if (f >= 1) return `×${f}`;
   return { 0.5: "½", 0.25: "¼", 0.125: "⅛" }[f] ?? `×${f}`;
}

/**
 * The zone a target counts as being in, for this attacker: a ship sees every smaller unit as up-close, and a vehicle
 * sees individuals (who fight in its up-close zone) the same way.
 *
 * @param {Actor} attacker
 *
 * @param {Actor} target
 *
 * @returns {"upClose"|"atDistance"}
 */
export function effectiveZone(attacker, target) {
   const sa = scaleOf(attacker);
   const st = scaleOf(target);
   if (st === "individual" || (sa && st && bigger(sa, st))) return "upClose";
   return zoneOf(target);
}

/** Missiles and torpedoes. */
export const isMissile = (weapon) => /missile|torpedo/i.test(weapon?.name ?? "");

/**
 * Can this craft weapon be fired at this target (vehicle and ship scale rules)? Null if it can.
 *
 * @param {Actor} attacker  A vehicle or ship.
 *
 * @param {Item} weapon     A craft weapon.
 *
 * @param {Actor} target
 *
 * @returns {string|null}  A localisation key.
 */
export function craftWeaponBlocked(attacker, weapon, target) {
   const sa = scaleOf(attacker);
   const st = scaleOf(target);
   if (sa !== "vehicle" || st !== "ship") return null;
   // Vehicle missile racks reach ships anywhere; everything else needs a turret and the ship up-close.
   if (isMissile(weapon)) return null;
   if (weapon.system.mount?.kind !== "turret") return "EDRPG.combined.turretsOnly";
   if (zoneOf(target) !== "upClose") return "EDRPG.combined.shipNotClose";
   return null;
}

/**
 * Can an individual attack this craft at all (it must be in the craft's up-close zone)? Null if it can.
 *
 * @param {Actor} target
 *
 * @returns {string|null}  A localisation key.
 */
export function individualBlocked(target) {
   const st = scaleOf(target);
   if (st !== "vehicle" && st !== "ship") return null;
   return zoneOf(target) === "upClose" ? null : st === "ship" ? "EDRPG.combined.shipNotClose" : "EDRPG.combined.vehicleNotClose";
}

/**
 * Cross-scale limits on a vehicle or ship combat action against a target. Null if it's allowed (the usual rules still
 * apply).
 *
 * @param {Actor} actor
 *
 * @param {string} action
 *
 * @param {Actor} target
 *
 * @returns {string|null}  A localisation key.
 */
export function combinedActionBlocked(actor, action, target) {
   const sa = scaleOf(actor);
   const st = scaleOf(target);
   if (!sa || !st || sa === st) {
      // Hover and Crawl are only for attacking smaller units.
      if (action === "hover" || action === "crawl") return "EDRPG.combined.smallerOnly";
      return null;
   }
   if (action === "tail" || action === "dogfight") return "EDRPG.combined.noTail";
   if (action === "hover" && (sa !== "ship" || !bigger(sa, st))) return "EDRPG.combined.smallerOnly";
   if (action === "crawl" && st !== "individual") return "EDRPG.combined.individualsOnly";
   // Only the larger unit can collide, and a ship only by Chicken.
   if ((action === "ram" || action === "chicken") && !bigger(sa, st)) return "EDRPG.combined.noRamUp";
   if (action === "ram" && sa === "ship") return "EDRPG.combined.shipNoRam";
   if (sa === "ship" && action === "snipe" && st === "individual") return "EDRPG.combined.noSnipeIndividual";
   if (sa === "vehicle" && st === "ship") {
      if (!["snipe", "broadsides"].includes(action)) return "EDRPG.combined.vehicleVsShip";
      if (zoneOf(target) !== "upClose") return "EDRPG.combined.shipNotClose";
   }
   if (sa === "individual") return "EDRPG.combined.individualAction";
   return null;
}

/**
 * The band of a personal weapon that covers a distance: the first whose distance reaches it.
 *
 * @param {object} ranges  weapon.system.ranges
 *
 * @param {number} metres
 *
 * @returns {string|null}  short | medium | long, or null if out of range.
 */
export function bandFor(ranges, metres) {
   for (const key of ["short", "medium", "long"]) {
      const band = ranges?.[key];
      if (band?.dn === null || band?.dn === undefined) continue;
      const text = String(band.distance ?? "").trim();
      if (/^min/i.test(text) || !text) continue;
      const m = text.match(/([\d.]+)\s*(km|m)/i);
      if (!m) continue;
      const reach = Number(m[1]) * (m[2].toLowerCase() === "km" ? 1000 : 1);
      if (reach >= metres) return key;
   }
   return null;
}

/**
 * A craft weapon's damage type against people.
 *
 * @param {Item} weapon
 *
 * @returns {"energy"|"kinetic"|"explosive"}
 */
export function craftDamageType(weapon) {
   const n = weapon?.name ?? "";
   if (/missile|torpedo|mine/i.test(n)) return "explosive";
   if (/laser|beam|plasma/i.test(n) || (weapon?.system?.bonusVsShields ?? 0) > 0) return "energy";
   return "kinetic";
}

/**
 * A craft hit's Damage against another scale.
 * - Against individuals: the weapon's base Damage only (no Burst or shield/hull bonuses), scaled.
 * - Against other craft: every figure scaled.
 *
 * @param {object} damage  { base, burst, total, vsShields, bonusVsHull, bonusVsShields }
 *
 * @param {string} from
 *
 * @param {string} to
 *
 * @returns {object}
 */
export function scaleCraftDamage(damage, from, to) {
   if (!damage || from === to) return damage;
   const s = (n) => (n === null || n === undefined ? n : scaleDamage(n, from, to));
   if (to === "individual") return { ...damage, unscaled: damage.base, total: s(damage.base), burst: 0, vsShields: null, bonusVsHull: 0, bonusVsShields: 0, noBonuses: !!(damage.burst || damage.bonusVsHull || damage.bonusVsShields) };
   return { ...damage, unscaled: damage.total, total: s(damage.total), burst: s(damage.burst), vsShields: s(damage.vsShields), bonusVsHull: s(damage.bonusVsHull), bonusVsShields: s(damage.bonusVsShields) };
}

/**
 * Units of other scales on the scene still in the fight: individuals who aren't dead, craft that aren't destroyed
 * or gone.
 *
 * @param {Actor} actor
 *
 * @returns {Actor[]}
 */
export function individualsOnScene(actor) {
   const seen = new Set();
   return (globalThis.canvas?.scene?.tokens ?? [])
      .map((t) => t.actor)
      .filter((a) => a && a.uuid !== actor?.uuid && scaleOf(a) === "individual" && !seen.has(a.uuid) && seen.add(a.uuid))
      .filter((a) => !a.statuses?.has?.("dead"));
}

/** Are any spaceships still in this combat (vehicles can't Flee while there are, p.254)? */
export function shipsInFight(actor, combat = game.combat) {
   if (!combat) return false;
   return combat.combatants.some((cb) => {
      const a = cb.actor;
      return a && a.uuid !== actor.uuid && scaleOf(a) === "ship" && !a.system.destroyed && !a.system.combat?.escaped && !cb.defeated;
   });
}
