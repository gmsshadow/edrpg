/**
 * Emergency Repairs (Core Rules p.193), with the short-handed penalty (p.262).
 *
 * - Only a disabled component (Strength 0 or less) can be repaired, never the hull or a weapon, and each component only
 *   once between spaceport visits.
 * - It takes an entire Action, and longer for bigger components: size 1–2 one turn, 3–4 two, 5–6 three, 7–8 four. You
 *   can't fly and fix a component at the same time: a pilot doing it gives up the ship's combat action each turn.
 * - Short-handed with nobody on repairs: twice as long in a medium ship, four times in a large one (p.262).
 * - Then a Repair check against the component's grade: E 8, D 9, C 10, B 11, A 12. Success: back to 1 Strength.
 *   Failure: it can't be fixed quickly (a Field Repair can try later).
 * Outside combat the work is done at once.
 */
import { judge } from "./dice/resolve.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

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
   const bonus = by?.system?.skillBonus?.("repair") ?? 0;
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
         L("EDRPG.repair.check", { name: esc(by?.name ?? "?"), component: esc(c.name), natural, bonus, total: roll.total, dn, grade }),
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

/** A spaceport visit: every component can have an Emergency Repair again. */
export async function spaceportVisit(ship) {
   const components = foundry.utils.deepClone(ship.system.components ?? []);
   if (!components.some((c) => c.emergencyRepaired)) return;
   for (const c of components) c.emergencyRepaired = false;
   await ship.update({ "system.components": components });
   ui.notifications.info(L("EDRPG.repair.portReset", { name: ship.name }));
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
