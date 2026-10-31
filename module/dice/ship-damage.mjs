/**
 * Spaceship components under fire (Core Rules pp.68–71).
 * - Critical hit: a natural 10 that hits a ship whose Shields are down. Roll D10 on the Critical Hit Table; Weapon,
 *   Utility Mount and Internal Component results roll again for which one (1–5: first to fifth on the roster;
 *   6–10: last to fifth-to-last). The Damage hits both the Hull and the component's strength; at 0 it is destroyed.
 * - GM ships use their Critical value as every component's strength.
 * - Targeted shots (Shields down, both up-close, gimballed weapon, +4 Defence) put all the Damage on the component.
 */

/** Critical Hit Table (p.69): index = D10 roll. */
export const CRIT_TABLE = [null, "powerPlant", "thrusters", "fsd", "lifeSupport", "powerDistributor", "sensors", "shieldGenerator", "weapon", "utility", "internal"];

/** Fixed components a shot can target (p.70). */
export const FIXED_KINDS = ["powerPlant", "thrusters", "fsd", "lifeSupport", "powerDistributor", "sensors"];

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/**
 * Pick the n-th entry of a roster list from a D10: 1–5 count from the top, 6–10 from the bottom (6 = last).
 *
 * @param {Array} list
 *
 * @param {number} roll
 *
 * @returns {*|undefined}
 */
export function rosterPick(list, roll) {
   if (!list.length) return undefined;
   const index = roll <= 5 ? roll - 1 : list.length - (roll - 5);
   return list[index];
}

/**
 * The things on a ship a hit can land on: its components, plus its weapons (as components).
 *
 * @param {Actor} ship
 *
 * @returns {{key: string, kind: string, name: string, item?: string}[]}
 */
export function targetableComponents(ship) {
   const sys = ship.system;
   const list = FIXED_KINDS.map((kind) => {
      const c = sys.components.find((x) => x.kind === kind);
      return { key: `kind:${kind}`, kind, name: c?.name || L(`EDRPG.ship.component.${kind}`) };
   });
   for (const w of ship.itemTypes.craftWeapon) list.push({ key: `item:${w.id}`, kind: "weapon", name: w.name, item: w.id });
   return list;
}

/**
 * Damage a component, creating its roster entry (at the default strength) when the ship doesn't list it yet.
 *
 * @param {Actor} ship
 *
 * @param {{kind: string, name?: string, item?: string, index?: number}} ref
 *
 * @param {number} amount
 *
 * @returns {Promise<object>}  { name, kind, before, after, max, destroyed, effect }
 */
export async function damageComponent(ship, ref, amount) {
   const sys = ship.system;
   const components = foundry.utils.deepClone(sys._source?.components ?? sys.components);
   let index = ref.index ?? -1;
   if (index < 0 && ref.item) index = components.findIndex((c) => c.kind === "weapon" && c.item === ref.item);
   if (index < 0 && ref.kind && ref.kind !== "weapon") index = components.findIndex((c) => c.kind === ref.kind);
   if (index < 0) {
      const strength = sys.npc?.critical || 20;
      components.push({ name: ref.name || L(`EDRPG.ship.component.${ref.kind}`), kind: ref.kind, strength: { value: strength, max: strength }, notes: "", item: ref.item ?? "" });
      index = components.length - 1;
   }
   const c = components[index];
   const before = c.strength.value;
   c.strength.value = before - amount;
   const destroyed = before > 0 && c.strength.value <= 0;
   const update = { "system.components": components };
   // A destroyed Shield Generator takes the shields down for good (until repaired).
   if (destroyed && c.kind === "shieldGenerator") Object.assign(update, { "system.shields.value": 0, "system.shields.down": true });
   await ship.update(update);
   return {
      name: c.name,
      kind: c.kind,
      damage: amount,
      before,
      after: c.strength.value,
      max: c.strength.max,
      destroyed,
      effect: destroyed ? L(`EDRPG.crit.effect.${c.kind}`) : null,
   };
}

/**
 * Roll a critical hit on a ship and damage the component.
 *
 * @param {Actor} ship
 *
 * @param {number} amount  The hit's Damage.
 *
 * @returns {Promise<object>}  { table, position, kindLabel, ... damageComponent result } or { table, nothing }.
 */
export async function rollCritical(ship, amount) {
   const first = await new Roll("1d10").evaluate();
   const kind = CRIT_TABLE[first.total];
   const result = { table: first.total, kindLabel: L(`EDRPG.ship.component.${kind}`) };
   if (game.dice3d) game.dice3d.showForRoll(first, game.user, true);
   let ref = { kind };
   if (["weapon", "utility", "internal"].includes(kind)) {
      const second = await new Roll("1d10").evaluate();
      result.position = second.total;
      let pick;
      if (kind === "weapon") {
         const weapons = [...ship.itemTypes.craftWeapon].sort((a, b) => (a.sort || 0) - (b.sort || 0));
         const w = rosterPick(weapons, second.total);
         if (w) pick = { kind, name: w.name, item: w.id };
      } else {
         const entries = ship.system.components.map((c, index) => ({ ...c, index })).filter((c) => c.kind === kind);
         const c = rosterPick(entries, second.total);
         if (c) pick = { kind, name: c.name, index: c.index };
      }
      if (!pick) return { ...result, nothing: true };
      ref = pick;
   }
   return { ...result, ...(await damageComponent(ship, ref, amount)) };
}
