/**
 * Outfitting a spaceship (Core Rules pp.192–193) with Ship Component and Craft Weapon items.
 *
 * A ship made from the compendium knows its hull's slots (`system.outfit`): hardpoints by size, utility mounts, the
 * class of each fixed component, and its internal slots (some military). Its components are embedded Ship Component
 * items, each `fitted` to a slot and linked from the component roster (the critical-hit list); its weapons have a
 * `hardpoint`.
 *
 * The rules:
 * - Fixed components must be the hull's class, grade E or better; they and the bulkhead can be replaced, not removed.
 * - An internal component can't be larger than its slot; military slots take only Hull and Module Reinforcement
 *   Packages and Shield Cell Banks. A weapon can't be larger than its hardpoint.
 * - One Shield Generator, Collector, Prospector, Refinery, Discovery Scanner and Detailed Surface Scanner per ship.
 * - Fighter Hangars only on ships designed for them; Spaceship Hangars only on Huge ships (Super Traders pp.29–30).
 * - Components and weapons can't draw more power than the power plant produces.
 * - Old parts sell for 70% of their value (Upgrading your Ship, p.193).
 *
 * The ship's ratings change by the difference each swap makes (so the book's printed figures, and Engineering's
 * bonuses, stay as they were): Agility and Speed (thrusters, power distributor), Hull (bulkhead bonus on the hull's
 * starting value, Hull Reinforcement Packages), Shields (generator plus boosters, each a % of the generator rounded up
 * to 5), recharge, To Hit, Initiative, Dogfighting, Floating bonuses, chaff, point defence, ECM, shield cell banks,
 * cargo capacity, jump range (+50% for Explorer hulls), and component Strength from E-grade Module Reinforcement
 * Packages. Ships without a layout (older ones, GM opponents) keep the plain roster: a component goes on it as before.
 */
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

export const FIXED = ["powerPlant", "thrusters", "fsd", "lifeSupport", "powerDistributor", "sensors"];
const MOUNTS = ["small", "medium", "large", "huge"];
const MILITARY_OK = new Set(["hullReinforcement", "moduleReinforcement", "shieldCellBank"]);
const ONE_PER_SHIP = { shieldGenerator: "shieldGenerator", collector: "collector", prospector: "prospector", refinery: "refinery" };
const ROSTER_KIND = { ...Object.fromEntries(FIXED.map((k) => [k, k])), shieldGenerator: "shieldGenerator", utility: "utility" };
const OFF_ROSTER = new Set(["bulkhead", "hullReinforcement", "moduleReinforcement", "fuelTank", "cargoHatch"]);
// Ships designed to carry fighters (Super Traders Supplement p.29).
const FIGHTER_CARRIERS = new Set(["anaconda", "beluga liner", "boa mk iii", "federal corvette", "federal gunship", "imperial cutter", "imperial explorer", "keelback", "type-9 heavy", "type-10 transport"]);
const ceil5 =(x) => Math.ceil(x / 5 - 1e-9) * 5;
const credits = (s) => Number(String(s ?? "").replace(/[^\d]/g, "")) || 0;
const cr = (n) => `${Number(n).toLocaleString("en-GB")}cr`;

/** An actor's items as an array (a Collection's contents, or an array). */
const itemsOf = (actor) => actor.items?.contents ?? Array.from(actor.items ?? []);

/** A Ship Component as plain data: { id, name, ...system }. */
const plain = (item) => ({ id: item.id ?? item._id ?? "", name: item.name, ...(item.system?.toObject?.() ?? foundry.utils.deepClone(item.system)) });

/** The discovery-scanner family a planetary scanner belongs to (one of each per ship). */
const scannerFamily = (c) => (c.category !== "planetaryScanner" ? "" : /Detailed Surface/.test(c.name) ? "dss" : "discovery");

/* -------------------------------------------- Ratings -------------------------------------------- */

/**
 * What a set of components gives the ship.
 *
 * @param {object[]} comps    Plain components.
 *
 * @param {object} outfit     The ship's `system.outfit`.
 *
 * @param {object[]} weapons  Plain craft weapons ({ power }).
 */
export function contribution(comps, outfit, weapons = []) {
   const of = (cat) => comps.filter((c) => c.category === cat);
   const one = (cat) => of(cat)[0]?.stats ?? {};
   const sum = (list, f) => list.reduce((n, c) => n + (f(c) || 0), 0);
   const thr = one("thrusters");
   const pd = one("powerDistributor");
   const sen = one("sensors");
   const fsd = one("fsd");
   const sg = one("shieldGenerator").shields ?? 0;
   const utility = of("utility");
   const named = (prefix) => utility.filter((c) => c.name.startsWith(prefix));
   const mrpAll = of("moduleReinforcement").filter((c) => c.grade === "E").map((c) => c.stats.strengthBonus || 0);
   return {
      agility: (thr.agility || 0) + (pd.agility || 0),
      maxSpeed: thr.speed || 0,
      hull: Math.round(((outfit.baseHull || 0) * (one("bulkhead").hullBonus || 0)) / 100) + sum(of("hullReinforcement"), (c) => c.stats.hull),
      shields: sg ? sg + sum(utility, (c) => (c.stats.shieldBoost ? ceil5((sg * c.stats.shieldBoost) / 100) : 0)) : 0,
      recharge: pd.shieldRecharge || 0,
      toHit: pd.toHit || 0,
      initiative: sen.initiative || 0,
      dogfighting: sen.dogfighting || 0,
      floating: pd.floating || 0,
      chaff: sum(named("Chaff Launcher"), (c) => c.ammo?.max),
      pointDefence: sum(named("Point Defence"), (c) => c.ammo?.max),
      heatSinks: sum(named("Heat Sink Launcher"), (c) => c.ammo?.max),
      ecm: named("ECM").length,
      cargo: sum(of("cargoRack"), (c) => c.stats.capacity),
      range: Math.floor((fsd.range || 0) * (outfit.explorer ? 1.5 : 1)),
      output: one("powerPlant").output || 0,
      draw: Math.round((sum(comps, (c) => (c.category === "powerPlant" ? 0 : c.power)) + sum(weapons, (w) => w.power)) * 100) / 100,
      strengthAll: mrpAll.length ? Math.max(...mrpAll) : 0,
   };
}

/** The power budget of a ship as it is. */
export function powerBudget(ship) {
   const comps = itemsOf(ship).filter((i) => i.type === "shipComponent" && i.system.fitted).map(plain);
   const weapons = itemsOf(ship).filter((i) => i.type === "craftWeapon" && i.system.hardpoint >= 0).map((w) => ({ power: w.system.power }));
   const c = contribution(comps, ship.system.outfit, weapons);
   return { output: c.output, draw: c.draw, over: c.draw > c.output + 1e-9 };
}

/* -------------------------------------------- Slots -------------------------------------------- */

/** "Size 5 (military)", "Medium hardpoint 2", "Utility mount 1", "Thrusters (class 5)", "Bulkhead". */
export function slotLabel(outfit, key) {
   const [kind, rest] = key.split(".");
   if (kind === "bulkhead") return L("EDRPG.outfit.cat.bulkhead");
   if (kind === "fixed") return L("EDRPG.outfit.fixedSlot", { kind: L(`EDRPG.ship.component.${rest}`), size: outfit.fixed[rest] });
   if (kind === "utility") return L("EDRPG.outfit.utilitySlot", { n: Number(rest) + 1 });
   if (kind === "hardpoint") return L("EDRPG.outfit.hardpointSlot", { size: L(`EDRPG.craft.size.${outfit.hardpoints[rest]}`), n: Number(rest) + 1 });
   const s = outfit.internal[Number(rest)];
   return L(s?.military ? "EDRPG.outfit.militarySlot" : "EDRPG.outfit.internalSlot", { size: s?.size ?? "?" });
}

/** Every slot key of a ship, in display order. */
export function slotKeys(outfit) {
   return [
      "bulkhead",
      ...FIXED.map((k) => `fixed.${k}`),
      ...outfit.internal.map((_, i) => `internal.${i}`),
      ...Array.from({ length: outfit.utility }, (_, i) => `utility.${i}`),
   ];
}

/**
 * The state of a ship for planning: components, weapons, roster and the stored ratings (plain data).
 *
 * @param {Actor} ship
 */
export function snapshot(ship) {
   const src = ship.system._source ?? ship.system;
   return {
      outfit: foundry.utils.deepClone(src.outfit),
      comps: itemsOf(ship).filter((i) => i.type === "shipComponent").map(plain),
      weapons: itemsOf(ship).filter((i) => i.type === "craftWeapon").map((w) => ({ id: w.id, name: w.name, ...foundry.utils.deepClone(w.system._source ?? w.system) })),
      roster: foundry.utils.deepClone(src.components),
      system: foundry.utils.deepClone(src),
   };
}

/** What's in a slot: { comp?, rosterIndex, name } (a roster entry without an item still occupies its slot). */
export function occupant(state, key) {
   const comp = state.comps.find((c) => c.fitted === key);
   const rosterIndex = comp ? state.roster.findIndex((r) => r.item === comp.id) : state.roster.findIndex((r) => r.slot === key);
   if (!comp && rosterIndex < 0) return null;
   return { comp: comp ?? null, rosterIndex, name: comp?.name ?? state.roster[rosterIndex].name };
}

/**
 * Where a component could go: [{ key, label, occupant }], or { error }.
 *
 * @param {object} state  snapshot()
 *
 * @param {object} c      Plain component.
 */
export function candidates(state, c) {
   const o = state.outfit;
   const list = (keys) => keys.map((key) => ({ key, label: slotLabel(o, key), occupant: occupant(state, key) }));
   if (c.category === "cargoHatch") return { error: L("EDRPG.outfit.err.cargoHatch") };
   if (c.category === "bulkhead") {
      const m = c.name.match(/\((.+)\)$/);
      if (m && m[1].toLowerCase() !== (o.hull ?? "").toLowerCase()) return { error: L("EDRPG.outfit.err.bulkheadHull", { hull: m[1], ship: o.hull }) };
      return { slots: list(["bulkhead"]) };
   }
   if (FIXED.includes(c.category)) {
      const size = o.fixed[c.category];
      if (c.size !== size) return { error: L("EDRPG.outfit.err.fixedClass", { kind: L(`EDRPG.ship.component.${c.category}`), size }) };
      return { slots: list([`fixed.${c.category}`]) };
   }
   if (c.category === "utility") {
      if (!o.utility) return { error: L("EDRPG.outfit.err.noUtility") };
      return { slots: list(Array.from({ length: o.utility }, (_, i) => `utility.${i}`)) };
   }
   // Hangars (Super Traders Supplement pp.29–30): fighters only on ships designed for them, spaceships only on Huge ones.
   if (c.category === "fighterHangar" && !FIGHTER_CARRIERS.has((o.hull ?? "").toLowerCase())) return { error: L("EDRPG.outfit.err.fighterHangar", { ship: o.hull }) };
   if (c.category === "spaceshipHangar" && state.system.category !== "huge") return { error: L("EDRPG.outfit.err.spaceshipHangar") };
   // Internal: one-per-ship components may only replace the one fitted.
   let keys = o.internal
      .map((s, i) => ({ s, key: `internal.${i}` }))
      .filter(({ s }) => s.size >= c.size && (!s.military || MILITARY_OK.has(c.category)))
      .map(({ key }) => key);
   const unique = ONE_PER_SHIP[c.category] ?? scannerFamily(c);
   if (unique) {
      const same = state.comps.find((x) => x.fitted && x.id !== c.id && (x.category === c.category && (!scannerFamily(c) || scannerFamily(x) === scannerFamily(c))));
      if (same) {
         if (!keys.includes(same.fitted)) return { error: L("EDRPG.outfit.err.onePerShip", { name: same.name }) };
         keys = [same.fitted];
      }
   }
   if (!keys.length) return { error: L("EDRPG.outfit.err.noSlot", { size: c.size }) };
   return { slots: list(keys) };
}

/** Hardpoints a weapon could go in: [{ key, label, occupant }], or { error }. */
export function weaponCandidates(state, w) {
   const o = state.outfit;
   const size = MOUNTS.indexOf(w.mount?.size ?? "small");
   const keys = o.hardpoints.map((h, i) => ({ h, i })).filter(({ h }) => MOUNTS.indexOf(h) >= size);
   if (!keys.length) return { error: L("EDRPG.outfit.err.noHardpoint", { size: L(`EDRPG.craft.size.${w.mount?.size}`) }) };
   return {
      slots: keys.map(({ i }) => {
         const occ = state.weapons.find((x) => x.hardpoint === i);
         return { key: `hardpoint.${i}`, label: slotLabel(o, `hardpoint.${i}`), occupant: occ ? { weapon: occ, name: occ.name } : null };
      }),
   };
}

/* -------------------------------------------- Planning -------------------------------------------- */

/** The order a new roster entry takes: utility mounts after the last utility mount, everything else at the end. */
function insertRoster(roster, entry) {
   if (entry.kind === "utility") {
      const last = roster.findLastIndex((c) => c.kind === "utility");
      const at = last >= 0 ? last + 1 : roster.findIndex((c) => !FIXED.includes(c.kind));
      roster.splice(at < 0 ? roster.length : at, 0, entry);
   } else roster.push(entry);
}

/** A component's roster entry (null for ones critical hits can't strike). */
export function rosterEntry(c, slot = "", extraStrength = 0) {
   if (OFF_ROSTER.has(c.category) || c.strength === null || c.strength === undefined) return null;
   const kind = ROSTER_KIND[c.category] ?? "internal";
   const str = c.strength + extraStrength;
   return { name: c.name, kind, strength: { value: str, max: str }, notes: c.special ?? "", item: c.id ?? "", slot, engineered: { effects: [], faults: [] } };
}

/**
 * Plan a change: put `incoming` (a plain component or weapon; null = empty the slot) in slot `key`.
 * Returns { error } or { updates, create, remove, roster, lines, cost, refund, before, after }.
 *
 * @param {object} state  snapshot()
 *
 * @param {string} key
 *
 * @param {object|null} incoming
 *
 * @param {object} [o]  { isWeapon }
 */
export function plan(state, key, incoming, { isWeapon = false } = {}) {
   const o = state.outfit;
   const comps = state.comps.filter((c) => c.fitted);
   const weapons = state.weapons.filter((w) => w.hardpoint >= 0);
   const before = contribution(comps, o, weapons);
   let afterComps = comps;
   let afterWeapons = weapons;
   let old = null;
   const remove = [];
   const create = [];
   let roster = foundry.utils.deepClone(state.roster);
   if (isWeapon) {
      const i = Number(key.split(".")[1]);
      old = state.weapons.find((w) => w.hardpoint === i) ?? null;
      if (old) remove.push(old.id);
      afterWeapons = weapons.filter((w) => w !== old).concat(incoming ? [{ ...incoming, hardpoint: i }] : []);
      if (incoming) create.push({ ...incoming, hardpoint: i });
   } else {
      const occ = occupant(state, key);
      old = occ?.comp ?? (occ ? { name: occ.name, unlinked: true } : null);
      if (!incoming && (key === "bulkhead" || key.startsWith("fixed."))) return { error: L("EDRPG.outfit.err.cantRemove") };
      if (occ?.comp) remove.push(occ.comp.id);
      afterComps = comps.filter((c) => c !== occ?.comp).concat(incoming ? [{ ...incoming, fitted: key }] : []);
      if (incoming) create.push({ ...incoming, fitted: key });
      // Roster: the new entry takes the old one's place; or the old one goes.
      const after0 = contribution(afterComps, o, weapons);
      const entry = incoming ? rosterEntry(incoming, key, OFF_ROSTER.has(incoming.category) ? 0 : after0.strengthAll) : null;
      if (occ && occ.rosterIndex >= 0) {
         if (entry) roster[occ.rosterIndex] = entry;
         else roster.splice(occ.rosterIndex, 1);
      } else if (entry) insertRoster(roster, entry);
   }
   const after = contribution(afterComps, o, afterWeapons);
   // Power: no change may leave the ship drawing more than its plant makes (unless it reduces an existing overdraw).
   if (after.draw > after.output + 1e-9 && (after.draw > before.draw + 1e-9 || after.output < before.output - 1e-9)) {
      return { error: L("EDRPG.outfit.err.power", { draw: after.draw.toFixed(2), output: after.output }) };
   }
   // Ratings change by the difference.
   const s = state.system;
   const d = (k) => after[k] - before[k];
   const updates = {};
   const lines = [];
   const bump = (path, label, delta, { min = -Infinity } = {}) => {
      if (!delta) return;
      const cur = foundry.utils.getProperty(s, path) ?? 0;
      updates[`system.${path}`] = Math.max(min, cur + delta);
      lines.push(`${label} ${delta > 0 ? "+" : ""}${delta}`);
   };
   bump("agility", L("EDRPG.vehicle.agility"), d("agility"));
   bump("maxSpeed", L("EDRPG.vehicle.speed"), d("maxSpeed"), { min: 0 });
   if (d("hull")) {
      const max = Math.max(0, s.hull.max + d("hull"));
      updates["system.hull.max"] = max;
      updates["system.hull.value"] = Math.min(max, Math.max(s.hull.value > 0 ? 1 : s.hull.value, s.hull.value + d("hull")));
      lines.push(`${L("EDRPG.vehicle.hull")} ${d("hull") > 0 ? "+" : ""}${d("hull")}`);
   }
   if (d("shields")) {
      const max = Math.max(0, s.shields.max + d("shields"));
      updates["system.shields.max"] = max;
      updates["system.shields.value"] = Math.min(max, Math.max(0, s.shields.value + d("shields")));
      lines.push(`${L("EDRPG.vehicle.shields")} ${d("shields") > 0 ? "+" : ""}${d("shields")}`);
   }
   bump("shields.recharge", L("EDRPG.vehicle.recharge"), d("recharge"), { min: 0 });
   bump("bonuses.toHit", L("EDRPG.ship.bonusToHit"), d("toHit"));
   bump("bonuses.initiative", L("EDRPG.sheet.initiative"), d("initiative"));
   bump("bonuses.dogfighting", L("EDRPG.ship.dogfighting"), d("dogfighting"));
   bump("equipment.floating", L("EDRPG.equip.floatingCount"), d("floating"), { min: 0 });
   for (const k of ["chaff", "pointDefence", "heatSinks"]) {
      if (!d(k)) continue;
      const cur = s.equipment[k] ?? { value: 0, max: 0 };
      const max = Math.max(0, cur.max + d(k));
      updates[`system.equipment.${k}.max`] = max;
      updates[`system.equipment.${k}.value`] = Math.min(max, Math.max(0, cur.value + d(k)));
      lines.push(`${L(`EDRPG.outfit.ammo.${k}`)} ${d(k) > 0 ? "+" : ""}${d(k)}`);
   }
   if (Boolean(before.ecm) !== Boolean(after.ecm)) updates["system.equipment.ecm"] = after.ecm > 0;
   if (d("cargo")) {
      updates["system.cargo"] = after.cargo ? `${after.cargo}T` : L("EDRPG.outfit.none");
      lines.push(L("EDRPG.outfit.cargoLine", { cargo: after.cargo }));
   }
   if (d("range")) {
      updates["system.range"] = `${after.range}LY`;
      lines.push(L("EDRPG.outfit.rangeLine", { range: after.range }));
   }
   // Shield cell banks: the combat equipment list follows the fitted banks.
   if (!isWeapon && (old?.category === "shieldCellBank" || incoming?.category === "shieldCellBank")) {
      const banks = foundry.utils.deepClone(s.equipment.cellBanks ?? []);
      if (old?.category === "shieldCellBank") {
         const i = banks.findIndex((b) => b.name === old.name);
         if (i >= 0) banks.splice(i, 1);
      }
      if (incoming?.category === "shieldCellBank") banks.push({ name: incoming.name, boost: incoming.stats.recharge, duration: incoming.stats.duration, uses: 3 });
      updates["system.equipment.cellBanks"] = banks;
   }
   // E-grade Module Reinforcement: every roster component's Strength moves with the strongest package.
   const dStr = d("strengthAll");
   if (dStr) {
      const fresh = incoming && !isWeapon ? key : null;
      roster = roster.map((r) => (r.slot === fresh ? r : { ...r, strength: { max: Math.max(0, r.strength.max + dStr), value: Math.max(0, r.strength.value + dStr) } }));
      lines.push(L("EDRPG.outfit.strengthLine", { n: `${dStr > 0 ? "+" : ""}${dStr}` }));
   }
   if (incoming?.category === "moduleReinforcement" && incoming.grade !== "E") lines.push(L("EDRPG.outfit.mrpOneGroup"));
   if (!isWeapon) updates["system.components"] = roster;
   const cost = incoming ? credits(incoming.cost) : 0;
   const refund = old && !old.unlinked ? Math.floor(credits(old.cost) * 0.7) : 0;
   return { updates, create, remove, roster, lines, cost, refund, before, after, old };
}

/* -------------------------------------------- Applying -------------------------------------------- */

/** The ship owner (a character) whose credits pay for the work, if this user may spend them. */
function payer(ship) {
   const owner = ship.system.owner ? fromUuidSync(ship.system.owner) : null;
   return owner?.isOwner && owner.system?.cash ? owner : null;
}

/**
 * Ask where to fit something (and whether to pay), then fit it.
 *
 * @param {Actor} ship
 *
 * @param {Item} item  A Ship Component or Craft Weapon (from a compendium, the sidebar or another actor).
 */
export async function fitItem(ship, item) {
   const isWeapon = item.type === "craftWeapon";
   if (ship.type !== "ship") return void ui.notifications.warn(L("EDRPG.outfit.shipsOnly"));
   if (!ship.system.outfit?.enabled) return isWeapon ? null : legacyFit(ship, item);
   const state = snapshot(ship);
   const incoming = isWeapon
      ? { name: item.name, ...foundry.utils.deepClone(item.system._source ?? item.system) }
      : plain(item);
   delete incoming.id;
   incoming.img = item.img;
   const c = isWeapon ? weaponCandidates(state, incoming) : candidates(state, incoming);
   if (c.error) return void ui.notifications.warn(c.error);
   const owner = payer(ship);
   const pick = c.slots.find((s) => !s.occupant) ?? c.slots[0];
   const options = c.slots
      .map((s) => `<label class="ed-outfit-option"><input type="radio" name="slot" value="${s.key}" ${s === pick ? "checked" : ""}> <b>${esc(s.label)}</b> — ${s.occupant ? L("EDRPG.outfit.replaces", { name: esc(s.occupant.name) }) : L("EDRPG.outfit.empty")}</label>`)
      .join("");
   const cost = credits(incoming.cost);
   const content = `<div class="edrpg ed-outfit-dialog"><p>${L("EDRPG.outfit.fitWhere", { name: esc(item.name) })}</p>${options}
      ${owner && cost ? `<label class="ed-check"><input type="checkbox" name="pay" checked> ${L("EDRPG.outfit.payFrom", { cost: cr(cost), name: esc(owner.name) })}</label>` : ""}</div>`;
   const res = await foundry.applications.api.DialogV2.input({ window: { title: L("EDRPG.outfit.fitTitle"), icon: "fa-solid fa-screwdriver-wrench" }, content, rejectClose: false });
   if (!res?.slot) return;
   return applyPlan(ship, plan(state, res.slot, incoming, { isWeapon }), { pay: owner && res.pay ? owner : null, label: item.name, slot: slotLabel(state.outfit, res.slot) });
}

/** Empty a slot (selling what was there). */
export async function emptySlot(ship, key) {
   const state = snapshot(ship);
   const isWeapon = key.startsWith("hardpoint.");
   const p = plan(state, key, null, { isWeapon });
   if (p.error) return void ui.notifications.warn(p.error);
   const owner = payer(ship);
   const content = `<p>${L("EDRPG.outfit.removeAsk", { name: esc(p.old?.name ?? "") })}</p>${owner && p.refund ? `<label class="ed-check"><input type="checkbox" name="pay" checked> ${L("EDRPG.outfit.sellTo", { refund: cr(p.refund), name: esc(owner.name) })}</label>` : ""}`;
   const res = await foundry.applications.api.DialogV2.input({ window: { title: L("EDRPG.outfit.removeTitle"), icon: "fa-solid fa-screwdriver-wrench" }, content: `<div class="edrpg">${content}</div>`, rejectClose: false });
   if (!res) return;
   return applyPlan(ship, p, { pay: owner && res.pay ? owner : null, label: p.old?.name ?? "", slot: slotLabel(state.outfit, key), removing: true });
}

/** Carry out a plan on the ship (and the payer's credits), and post what changed. */
export async function applyPlan(ship, p, { pay = null, label = "", slot = "", removing = false } = {}) {
   if (p.error) return void ui.notifications.warn(p.error);
   const net = (p.cost || 0) - (p.refund || 0);
   if (pay && net > 0 && (pay.system.cash?.cr ?? 0) < net) return void ui.notifications.warn(L("EDRPG.outfit.err.credits", { name: pay.name, cost: cr(net) }));
   if (p.remove.length) await ship.deleteEmbeddedDocuments("Item", p.remove);
   let updates = p.updates;
   if (p.create.length) {
      const docs = p.create.map(({ id, ...data }) => {
         const { name, ...system } = data;
         return { name, type: "fitted" in system ? "shipComponent" : "craftWeapon", img: system.img, system };
      });
      for (const d of docs) delete d.system.img;
      const [created] = await ship.createEmbeddedDocuments("Item", docs);
      // Link the new roster entry to the created item.
      if (created && updates["system.components"]) {
         updates = { ...updates, "system.components": updates["system.components"].map((r) => (r.slot && r.slot === created.system.fitted && !r.item ? { ...r, item: created.id } : r)) };
      }
   }
   if (Object.keys(updates).length) await ship.update(updates);
   if (pay && net) await pay.update({ "system.cash.cr": (pay.system.cash.cr ?? 0) - net });
   const money = pay ? [p.cost ? L("EDRPG.outfit.paid", { cost: cr(p.cost) }) : "", p.refund ? L("EDRPG.outfit.sold", { name: esc(p.old?.name ?? ""), refund: cr(p.refund) }) : ""].filter(Boolean).join(" ") : "";
   const headline = removing
      ? L("EDRPG.outfit.removed", { name: esc(label), ship: esc(ship.name), slot: esc(slot) })
      : L("EDRPG.outfit.fittedIn", { name: esc(label), ship: esc(ship.name), slot: esc(slot) }) + (p.old ? ` ${L("EDRPG.outfit.replacing", { name: esc(p.old.name) })}` : "");
   const budget = powerBudget(ship);
   const content = `<div class="edrpg edrpg-chat edrpg-outfit"><h3><i class="fa-solid fa-screwdriver-wrench"></i> ${headline}</h3>
      ${p.lines.length ? `<p>${p.lines.map(esc).join(" · ")}</p>` : ""}
      <p class="muted">${L("EDRPG.outfit.powerLine", { draw: budget.draw.toFixed(2), output: budget.output })}${money ? ` · ${money}` : ""}</p></div>`;
   await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: ship }), content });
   return true;
}

/** The Outfitting tab: power, then each slot with what's fitted. */
export function outfitView(ship) {
   const state = snapshot(ship);
   const o = state.outfit;
   const budget = powerBudget(ship);
   const fmt = (n) => (n === null || n === undefined ? "—" : String(Number(Number(n).toFixed(2))));
   const row = (key) => {
      const occ = occupant(state, key);
      const c = occ?.comp;
      const r = occ && occ.rosterIndex >= 0 ? state.roster[occ.rosterIndex] : null;
      return {
         key, label: slotLabel(o, key), name: occ?.name ?? "", empty: !occ, itemId: c?.id ?? "", note: c?.special ?? r?.notes ?? "",
         power: c ? fmt(c.category === "powerPlant" ? null : c.power) : "", output: c?.category === "powerPlant" ? fmt(c.stats.output) : "",
         strength: r ? `${r.strength.value}/${r.strength.max}` : "", unlinked: occ && !c,
         removable: !!occ && !key.startsWith("fixed.") && key !== "bulkhead",
      };
   };
   const weapons = state.weapons;
   const hardpoints = o.hardpoints.map((size, i) => {
      const w = weapons.find((x) => x.hardpoint === i);
      return { key: `hardpoint.${i}`, label: slotLabel(o, `hardpoint.${i}`), name: w?.name ?? "", empty: !w, itemId: w?.id ?? "", power: w ? fmt(w.power) : "", removable: !!w };
   });
   const keys = slotKeys(o);
   return {
      budget: { ...budget, drawLabel: fmt(budget.draw), outputLabel: fmt(budget.output), pct: budget.output ? Math.min(100, Math.round((budget.draw / budget.output) * 100)) : 100 },
      fixed: keys.filter((k) => k === "bulkhead" || k.startsWith("fixed.")).map(row),
      internal: keys.filter((k) => k.startsWith("internal.")).map(row),
      utility: keys.filter((k) => k.startsWith("utility.")).map(row),
      hardpoints,
      unmounted: weapons.filter((w) => w.hardpoint < 0).map((w) => ({ name: w.name, itemId: w.id })),
      summary: { hull: o.hull, cargo: ship.system.cargo || "—", range: ship.system.range || "—", explorer: o.explorer },
   };
}

/* -------------------------------------------- Older ships -------------------------------------------- */

/** Ships without a layout: the component simply goes on the roster (fixed ones and the generator replace theirs). */
async function legacyFit(ship, item) {
   const c = plain(item);
   const entry = rosterEntry(c);
   if (!entry) return void ui.notifications.info(L("EDRPG.outfit.notRoster", { component: item.name }));
   entry.item = "";
   const roster = foundry.utils.deepClone(ship.system._source.components);
   const single = new Set([...FIXED, "shieldGenerator"]);
   let replaced = "";
   const i = single.has(entry.kind) ? roster.findIndex((r) => r.kind === entry.kind) : -1;
   if (i >= 0) {
      replaced = roster[i].name;
      roster[i] = entry;
   } else insertRoster(roster, entry);
   await ship.update({ "system.components": roster });
   ui.notifications.info(L("EDRPG.outfit.fitted", { component: item.name, ship: ship.name, replaced: replaced ? L("EDRPG.outfit.replaced", { old: replaced }) : "" }));
   return true;
}

/** Kept for older callers: fit a component (opens the slot dialog on outfitted ships). */
export const fitComponent = fitItem;
