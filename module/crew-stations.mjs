/**
 * Flying without crew (Core Rules p.262), and vehicle crews (p.220).
 *
 * A ship's Crew rating is the minimum crew to run it properly. Anyone can fly any ship single-handed, but a medium or
 * larger ship that is short-handed suffers, for each job nobody is doing:
 * - Sensors: no sensor bonuses (Dogfighting, Initiative), and scanning means leaving the pilot's seat.
 * - Power distributor: no Floating Bonuses.
 * - Repairs: Emergency Repairs take twice as long (medium) or four times (large and up).
 * - Turrets fire on automatic (Spaceship Weapons bonus 3): turrets with no gunner already do.
 * - Between Adventures: no earning money; the ship needs servicing instead, or it may fail to start.
 * With the full crew, none of this applies. A vehicle can always be driven by one person, but its weapons can only be
 * used with the full crew aboard.
 *
 * Who counts as aboard: the pilot, turret gunners, the crew at the ship's stations, hired crew signed on for this
 * craft, and any others the sheet lists (other characters doing jobs nobody tracks).
 */

/** Crew stations a ship can assign (UUIDs). */
export const STATIONS = ["sensors", "power", "repairs"];

/** Ships big enough to suffer for being short-handed. */
export const CREWED_SIZES = ["medium", "large", "huge"];

/** Is the "Flying without crew" rule in use (a world setting, on by default)? */
export function crewRuleOn() {
   try {
      return game.settings.get("edrpg", "flyingWithoutCrew") !== false;
   } catch {
      return true;
   }
}

/** Hired crew (Employing Crew) signed on for this craft. */
function hiredFor(craft) {
   const uuid = craft?.uuid;
   if (!uuid) return [];
   const actors = game.actors?.contents ?? (game.actors ? Array.from(game.actors) : []);
   return actors.filter((a) => a.getFlag?.("edrpg", "crew")?.ship === uuid).map((a) => a.uuid);
}

/**
 * The crew situation of a vehicle or ship.
 *
 * @param {object} sys  The craft's system data.
 *
 * @returns {{aboard: number, needed: number, full: boolean, short: boolean, ship: boolean, sensors: boolean,
 *            power: boolean, repairs: boolean, repairFactor: number, weaponsLocked: boolean, people: string[]}}
 *          `short` = the penalties apply; `sensors`/`power`/`repairs` = that job is undone and penalised.
 */
export function crewStatus(sys) {
   const ship = !!sys?.isShip;
   const st = sys?.crewing ?? {};
   const gunners = (sys?.parent?.itemTypes?.craftWeapon ?? []).map((w) => w.system?.gunner);
   const people = new Set([sys?.pilot, ...gunners, ...(ship ? STATIONS.map((k) => st[k]) : []), ...hiredFor(sys?.parent)].filter(Boolean));
   const aboard = people.size + (st.others ?? 0);
   const needed = sys?.crewSize ?? 1;
   const full = aboard >= needed;
   const exempt = !!sys?.npc?.enabled || !!sys?.drone?.enabled || !crewRuleOn();
   const short = !full && !exempt && (!ship || CREWED_SIZES.includes(sys.category));
   const job = (k) => ship && short && !st[k];
   return {
      aboard,
      needed,
      full,
      short,
      ship,
      sensors: job("sensors"),
      power: job("power"),
      repairs: job("repairs"),
      repairFactor: job("repairs") ? (sys.category === "medium" ? 2 : 4) : 1,
      // A vehicle's weapons need its whole crew aboard.
      weaponsLocked: !ship && short,
      people: [...people],
   };
}

/**
 * The turrets of a short-handed ship fire on automatic, even if the pilot is named as their gunner (they can't be in
 * two seats).
 *
 * @param {object} sys
 *
 * @param {string} gunner  The turret's gunner UUID.
 *
 * @returns {boolean}
 */
export function pilotOnTurret(sys, gunner) {
   return !!gunner && gunner === sys?.pilot && sys?.isShip && crewStatus(sys).short;
}
