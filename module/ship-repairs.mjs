/**
 * Repairing a ship (Core Rules p.193), with the short-handed penalty (p.262).
 *
 * Emergency Repairs
 * - Only a disabled component (Strength 0 or less) can be repaired, never the hull or a weapon, and each component only
 *   once between spaceport visits.
 * - It takes an entire Action, and longer for bigger components: size 1–2 one turn, 3–4 two, 5–6 three, 7–8 four. You
 *   can't fly and fix a component at the same time: a pilot doing it gives up the ship's combat action each turn.
 * - Short-handed with nobody on repairs: twice as long in a medium ship, four times in a large one (p.262).
 * - Then a Repair check against the component's grade: E 8, D 9, C 10, B 11, A 12. Success: back to 1 Strength.
 *   Failure: it can't be fixed quickly (a Field Repair can try later).
 * Outside combat the work is done at once.
 *
 * Field Repairs: six hours with a Spaceship Repair Kit. Pick a component, weapon or the hull and make a Repair check:
 * it gets back that many Strength (or Hull) points, nothing on a natural 1. One each between spaceport visits.
 *
 * Spaceport Repairs: a component or weapon back to full for 1% of its price, or 10% if it was ever knocked to 0 (even
 * if it works now); the hull 100cr a point. A visit also makes Emergency and Field Repairs available again.
 *
 * Spaceship Repair Kits: the Basic kit allows Field Repairs; Advanced gives +2 and Professional +4 to Repair for
 * emergency and field repairs. The best kit carried by anyone aboard (or the ship's owner) counts.
 */
import { judge } from "./dice/resolve.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const fmt = (n) => Number(n).toLocaleString("en-GB");

/**
 * The best Spaceship Repair Kit aboard: carried by the crew or the ship's owner.
 *
 * @param {Actor} ship
 *
 * @returns {{name: string, bonus: number}|null}
 */
export function shipRepairKit(ship) {
   const uuids = [...(ship.system.crew?.people ?? []), ship.system.owner].filter(Boolean);
   let best = null;
   for (const u of new Set(uuids)) {
      const a = fromUuidSync(u);
      for (const item of a?.items ?? []) {
         if (item.type !== "gear" || !/spaceship repair kit/i.test(item.name) || item.system.location === "stored") continue;
         const bonus = (item.system.rollBonuses ?? []).filter((b) => b.skill === "repair").reduce((n, b) => Math.max(n, b.value || 0), 0);
         if (!best || bonus > best.bonus) best = { name: item.name, bonus };
      }
   }
   return best;
}

/** Repair Difficulty by component grade. */
export const REPAIR_DN = { E: 8, D: 9, C: 10, B: 11, A: 12 };

/** Turns of work by component size. */
export function repairTurns(size) {
   const n = Number(size) || 1;
   return n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
}

/**
 * A roster component's size and grade: from its Ship Component item, or its name ("Sensors 5C", "4A Shield Booster").
 *
 * @param {Actor} ship
 *
 * @param {object} c  A roster entry.
 *
 * @returns {{size: number, grade: string}}
 */
export function componentCode(ship, c) {
   const item = c.item ? ship.items?.get?.(c.item) : null;
   if (item?.type === "shipComponent" && item.system.grade) return { size: item.system.size || 1, grade: item.system.grade.toUpperCase() };
   const m = String(c.name ?? "").match(/\b(\d)\s?([A-E])\b/i);
   if (m) return { size: Number(m[1]) || 1, grade: m[2].toUpperCase() };
   return { size: 1, grade: "E" };
}

/**
 * Why this component can't have an Emergency Repair (a language key), or null if it can.
 *
 * @param {object} c
 *
 * @returns {string|null}
 */
export function repairBlocked(c) {
   if (!c) return "EDRPG.repair.none";
   if (c.kind === "weapon") return "EDRPG.repair.noWeapons";
   if ((c.strength?.value ?? 1) > 0) return "EDRPG.repair.notDisabled";
   if (c.emergencyRepaired) return "EDRPG.repair.used";
   return null;
}

/** Components that can be repaired now, with their roster index. */
export function repairable(ship) {
   return (ship.system.components ?? []).map((c, index) => ({ ...c, index })).filter((c) => !repairBlocked(c));
}

/** Who can do the work: everyone aboard (the pilot, gunners, station crew, hired crew). */
export function repairers(ship) {
   return ship.system.crew.people.map((u) => fromUuidSync(u)).filter(Boolean);
}

/** The work needed on a component, in turns (after the short-handed penalty). */
export function workTurns(ship, c) {
   return repairTurns(componentCode(ship, c).size) * ship.system.crew.repairFactor;
}

const inCombat = (ship) => !!game.combat?.started && game.combat.combatants.some((cb) => cb.actor?.uuid === ship.uuid);

async function card(ship, lines, rolls = []) {
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ship }),
      content: `<div class="edrpg edrpg-chat edrpg-repair"><h3><i class="fa-solid fa-screwdriver-wrench"></i> ${L("EDRPG.repair.title")}</h3>${lines.map((l) => `<p>${l}</p>`).join("")}</div>`,
      rolls,
      sound: rolls.length && !game.dice3d ? CONFIG.sounds.dice : null,
   });
}

/**
 * Make the Repair check now.
 *
 * @param {Actor} ship
 *
 * @param {number} index
 *
 * @param {Actor} by
 *
 * @returns {Promise<{success: boolean, total: number, dn: number}>}
 */
export async function rollEmergencyRepair(ship, index, by) {
   const c = ship.system.components[index];
   const { grade } = componentCode(ship, c);
   const dn = REPAIR_DN[grade] ?? 8;
   const kit = shipRepairKit(ship);
   const bonus = (by?.system?.skillBonus?.("repair") ?? 0) + (kit?.bonus ?? 0);
   const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
   const natural = roll.dice[0].total;
   const { outcome } = judge({ natural, total: roll.total, dn });
   const success = outcome === "success" || outcome === "critSuccess";
   const components = foundry.utils.deepClone(ship.system.components);
   components[index].emergencyRepaired = true;
   if (success) components[index].strength.value = 1;
   await ship.update({ "system.components": components, "system.combat.repair": { index: -1, by: "", turns: 0 } });
   await card(
      ship,
      [
         L("EDRPG.repair.check", { name: esc(by?.name ?? "?"), component: esc(c.name), natural, bonus, total: roll.total, dn, grade }) + (kit?.bonus ? ` ${L("EDRPG.repair.kitNote", { kit: esc(kit.name), bonus: kit.bonus })}` : ""),
         `<b>${L(success ? "EDRPG.repair.fixed" : "EDRPG.repair.failed", { component: esc(c.name) })}</b>`,
      ],
      [roll],
   );
   return { success, total: roll.total, dn };
}

/**
 * Start an Emergency Repair: at once outside combat; in combat the work takes its turns first.
 *
 * @param {Actor} ship
 *
 * @param {number} index
 *
 * @param {Actor} by
 */
export async function startEmergencyRepair(ship, index, by) {
   const c = ship.system.components[index];
   const blocked = repairBlocked(c);
   if (blocked) return void ui.notifications.warn(L(blocked, { component: c?.name ?? "" }));
   if ((ship.system.combat?.repair?.index ?? -1) >= 0) return void ui.notifications.warn(L("EDRPG.repair.busy", { name: ship.name }));
   const turns = workTurns(ship, c);
   const pilot = by?.uuid === ship.system.pilot;
   const notes = [L("EDRPG.repair.started", { name: esc(by.name), component: esc(c.name), turns })];
   if (ship.system.crew.repairFactor > 1) notes.push(L("EDRPG.repair.shortHanded", { factor: ship.system.crew.repairFactor }));
   if (!inCombat(ship)) {
      await card(ship, notes);
      return rollEmergencyRepair(ship, index, by);
   }
   if (pilot) notes.push(L("EDRPG.repair.pilotNote", { name: esc(by.name) }));
   const update = { "system.combat.repair": { index, by: by.uuid, turns: turns - 1 } };
   if (pilot) update["system.combat.lostAction"] = true;
   await ship.update(update);
   await card(ship, notes);
   if (turns <= 1) return rollEmergencyRepair(ship, index, by);
}

/**
 * At the start of the ship's turn: another turn of work; the check once it's done.
 *
 * @param {Actor} ship
 */
export async function continueEmergencyRepair(ship) {
   const r = ship.system.combat?.repair;
   if (!r || r.index < 0) return;
   const by = r.by ? await fromUuid(r.by) : null;
   const left = Math.max(0, r.turns - 1);
   const update = { "system.combat.repair.turns": left };
   if (r.by === ship.system.pilot) update["system.combat.lostAction"] = true;
   await ship.update(update);
   if (left <= 0) return rollEmergencyRepair(ship, r.index, by);
   await card(ship, [L("EDRPG.repair.working", { name: esc(by?.name ?? "?"), component: esc(ship.system.components[r.index]?.name ?? ""), turns: left + 1 })]);
}

/** Stop a repair under way. */
export async function abandonEmergencyRepair(ship) {
   return ship.update({ "system.combat.repair": { index: -1, by: "", turns: 0 } });
}

/* -------------------------------------------- */
/*  Field Repairs                               */
/* -------------------------------------------- */

/**
 * What can have a Field Repair now: damaged components and weapons (and the hull) not yet field-repaired this visit.
 *
 * @param {Actor} ship
 *
 * @returns {{key: string, name: string, value: number, max: number}[]}  key "hull" or "c:<index>".
 */
export function fieldRepairable(ship) {
   const sys = ship.system;
   const out = (sys.components ?? [])
      .map((c, index) => ({ key: `c:${index}`, name: c.name, value: c.strength.value, max: c.strength.max, used: c.fieldRepaired }))
      .filter((c) => c.value < c.max && !c.used);
   if (sys.hull.value < sys.hull.max && !sys.hullFieldRepaired) out.unshift({ key: "hull", name: L("EDRPG.vehicle.hull"), value: sys.hull.value, max: sys.hull.max });
   return out;
}

/**
 * Make a Field Repair: a Repair check (+ the kit's bonus); that many points back, nothing on a natural 1.
 *
 * @param {Actor} ship
 *
 * @param {string} key  "hull" or "c:<index>".
 *
 * @param {Actor} by
 *
 * @returns {Promise<{restored: number}|null>}
 */
export async function fieldRepair(ship, key, by) {
   const kit = shipRepairKit(ship);
   if (!kit) return void ui.notifications.warn(L("EDRPG.repair.needKit", { name: ship.name }));
   if (inCombat(ship)) return void ui.notifications.warn(L("EDRPG.repair.fieldInCombat"));
   const target = fieldRepairable(ship).find((t) => t.key === key);
   if (!target) return void ui.notifications.warn(L("EDRPG.repair.fieldUsed"));
   const bonus = (by?.system?.skillBonus?.("repair") ?? 0) + kit.bonus;
   const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
   const natural = roll.dice[0].total;
   const restored = natural === 1 ? 0 : Math.max(0, Math.min(roll.total, target.max - target.value));
   if (key === "hull") {
      await ship.update({ "system.hull.value": target.value + restored, "system.hullFieldRepaired": true });
   } else {
      const index = Number(key.slice(2));
      const components = foundry.utils.deepClone(ship.system.components);
      components[index].strength.value = target.value + restored;
      components[index].fieldRepaired = true;
      await ship.update({ "system.components": components });
   }
   await card(
      ship,
      [
         L("EDRPG.repair.fieldCheck", { name: esc(by?.name ?? "?"), target: esc(target.name), natural, bonus, total: roll.total }) + (kit.bonus ? ` ${L("EDRPG.repair.kitNote", { kit: esc(kit.name), bonus: kit.bonus })}` : ""),
         `<b>${natural === 1 ? L("EDRPG.repair.fieldNothing", { target: esc(target.name) }) : L("EDRPG.repair.fieldRestored", { target: esc(target.name), points: restored, before: target.value, after: target.value + restored, max: target.max })}</b>`,
      ],
      [roll],
   );
   return { restored };
}

/** The sheet's Field Repair button. */
export async function openFieldRepair(ship) {
   const kit = shipRepairKit(ship);
   if (!kit) return void ui.notifications.warn(L("EDRPG.repair.needKit", { name: ship.name }));
   if (inCombat(ship)) return void ui.notifications.warn(L("EDRPG.repair.fieldInCombat"));
   const list = fieldRepairable(ship);
   if (!list.length) return void ui.notifications.warn(L("EDRPG.repair.fieldNothingToDo", { name: ship.name }));
   const crew = repairers(ship);
   const owner = ship.system.owner ? fromUuidSync(ship.system.owner) : null;
   if (owner && !crew.includes(owner)) crew.push(owner);
   if (!crew.length) return void ui.notifications.warn(L("EDRPG.repair.noCrew", { name: ship.name }));
   const stationed = ship.system.crewing?.repairs;
   const res = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.repair.fieldTitle"), icon: "fa-solid fa-toolbox" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.repair.fieldWhat")}</label><div class="form-fields"><select name="key">${list.map((t) => `<option value="${t.key}">${esc(t.name)} (${t.value}/${t.max})</option>`).join("")}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.repair.who")}</label><div class="form-fields"><select name="by">${crew.map((a) => `<option value="${a.uuid}"${a.uuid === stationed ? " selected" : ""}>${esc(a.name)} (${L("EDRPG.repair.bonus", { bonus: a.system?.skillBonus?.("repair") ?? 0 })})</option>`).join("")}</select></div></div>
         <p class="hint">${L("EDRPG.repair.fieldHint", { kit: esc(kit.name), bonus: kit.bonus })}</p>`,
      rejectClose: false,
   });
   if (!res) return;
   return fieldRepair(ship, res.key, crew.find((a) => a.uuid === res.by));
}

/* -------------------------------------------- */
/*  Spaceport Repairs                           */
/* -------------------------------------------- */

const credits = (text) => {
   const digits = String(text ?? "").replace(/[^\d]/g, "");
   return digits ? Number(digits) : null;
};

/**
 * What a spaceport would fix, and for how much: damaged components and weapons (1% of the price, 10% if it was ever
 * knocked to 0), and the hull at 100cr a point. A price that isn't known is null (the GM charges it by hand).
 *
 * @param {Actor} ship
 *
 * @returns {{key: string, name: string, value: number, max: number, cost: number|null, crippled: boolean}[]}
 */
export function spaceportQuote(ship) {
   const sys = ship.system;
   const out = [];
   if (sys.hull.value < sys.hull.max) out.push({ key: "hull", name: L("EDRPG.vehicle.hull"), value: sys.hull.value, max: sys.hull.max, cost: (sys.hull.max - sys.hull.value) * 100, crippled: false });
   (sys.components ?? []).forEach((c, index) => {
      const crippled = !!c.crippled || c.strength.value <= 0;
      if (c.strength.value >= c.strength.max && !crippled) return;
      const price = credits(c.item ? ship.items?.get?.(c.item)?.system?.cost : null);
      out.push({ key: `c:${index}`, name: c.name, value: c.strength.value, max: c.strength.max, crippled, cost: price === null ? null : Math.round(price * (crippled ? 0.1 : 0.01)) });
   });
   return out;
}

/**
 * Pay for Spaceport Repairs (from the owner's credits) and fix what was chosen. Any visit also makes Emergency and
 * Field Repairs available again.
 *
 * @param {Actor} ship
 *
 * @param {string[]} keys
 *
 * @returns {Promise<boolean>}
 */
export async function spaceportRepairs(ship, keys = []) {
   const quote = spaceportQuote(ship).filter((q) => keys.includes(q.key));
   const total = quote.reduce((n, q) => n + (q.cost ?? 0), 0);
   const owner = ship.system.owner ? await fromUuid(ship.system.owner) : null;
   if (owner && total) {
      const cash = owner.system.cash?.cr ?? 0;
      if (cash < total) {
         ui.notifications.warn(L("EDRPG.upkeep.cantAfford", { name: owner.name, cost: fmt(total), cash: fmt(cash) }));
         return false;
      }
      await owner.update({ "system.cash.cr": cash - total });
   }
   const components = foundry.utils.deepClone(ship.system.components ?? []);
   for (const c of components) {
      c.emergencyRepaired = false;
      c.fieldRepaired = false;
   }
   const update = { "system.hullFieldRepaired": false };
   for (const q of quote) {
      if (q.key === "hull") update["system.hull.value"] = ship.system.hull.max;
      else {
         const c = components[Number(q.key.slice(2))];
         c.strength.value = c.strength.max;
         c.crippled = false;
      }
   }
   update["system.components"] = components;
   await ship.update(update);
   const lines = quote.map((q) => L("EDRPG.repair.portLine", { name: esc(q.name), cost: q.cost === null ? L("EDRPG.repair.priceUnknown") : `${fmt(q.cost)}cr`, why: q.key === "hull" ? L("EDRPG.repair.portHull", { points: q.max - q.value }) : L(q.crippled ? "EDRPG.repair.portCrippled" : "EDRPG.repair.portDamaged") }));
   if (quote.length) lines.push(`<b>${L(owner && total ? "EDRPG.repair.portPaid" : "EDRPG.repair.portTotal", { total: fmt(total), owner: esc(owner?.name ?? "") })}</b>`);
   if (quote.some((q) => q.cost === null)) lines.push(L("EDRPG.repair.portUnknownNote"));
   lines.push(L("EDRPG.repair.portReset", { name: esc(ship.name) }));
   await card(ship, lines);
   return true;
}

/** A spaceport visit with no repairs bought: Emergency and Field Repairs are available again. */
export async function spaceportVisit(ship) {
   return spaceportRepairs(ship, []);
}

/** The sheet's Spaceport button: choose what to have fixed. */
export async function openSpaceport(ship) {
   const quote = spaceportQuote(ship);
   const rows = quote
      .map((q) => `<label class="ed-check"><input type="checkbox" name="fix.${q.key}" checked> ${esc(q.name)} <span class="muted">(${q.value}/${q.max}${q.crippled ? `, ${L("EDRPG.repair.crippledShort")}` : ""})</span> — ${q.cost === null ? L("EDRPG.repair.priceUnknown") : `${fmt(q.cost)}cr`}</label>`)
      .join("");
   const content = `<p class="hint">${L("EDRPG.repair.portIntro")}</p>${quote.length ? `<fieldset><legend>${L("EDRPG.repair.portFix")}</legend>${rows}</fieldset>` : `<p>${L("EDRPG.repair.portNothing")}</p>`}`;
   const res = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.repair.portTitle", { name: ship.name }), icon: "fa-solid fa-warehouse" },
      classes: ["edrpg", "edrpg-dialog"],
      content,
      rejectClose: false,
   });
   if (!res) return;
   const keys = quote.filter((q) => res[`fix.${q.key}`] || foundry.utils.getProperty(res, `fix.${q.key}`)).map((q) => q.key);
   return spaceportRepairs(ship, keys);
}

/** The sheet's button: pick the component and who works on it. */
export async function openEmergencyRepair(ship, index = null) {
   const list = repairable(ship);
   if (!list.length) return void ui.notifications.warn(L("EDRPG.repair.nothing", { name: ship.name }));
   const crew = repairers(ship);
   if (!crew.length) return void ui.notifications.warn(L("EDRPG.repair.noCrew", { name: ship.name }));
   const stationed = ship.system.crewing?.repairs;
   const comps = list
      .map((c) => {
         const { size, grade } = componentCode(ship, c);
         return `<option value="${c.index}"${c.index === index ? " selected" : ""}>${esc(c.name)} — ${L("EDRPG.repair.option", { turns: workTurns(ship, c), dn: REPAIR_DN[grade] ?? 8, code: `${size}${grade}` })}</option>`;
      })
      .join("");
   const people = crew
      .map((a) => `<option value="${a.uuid}"${a.uuid === stationed ? " selected" : ""}>${esc(a.name)} (${L("EDRPG.repair.bonus", { bonus: a.system?.skillBonus?.("repair") ?? 0 })})</option>`)
      .join("");
   const res = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.repair.title"), icon: "fa-solid fa-screwdriver-wrench" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.repair.component")}</label><div class="form-fields"><select name="index">${comps}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.repair.who")}</label><div class="form-fields"><select name="by">${people}</select></div></div>
         <p class="hint">${L("EDRPG.repair.hint")}</p>`,
      rejectClose: false,
   });
   if (!res) return;
   const by = crew.find((a) => a.uuid === res.by);
   return startEmergencyRepair(ship, Number(res.index), by);
}
