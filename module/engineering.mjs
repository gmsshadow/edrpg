/**
 * Engineering (Espionage Supplement pp.6–12) and the Overclocking enhancement (p.33).
 *
 * - Pick a weapon, utility mount, fixed or internal component (or the bulkhead) and make a Repair check: D10 + Repair
 *   bonus (a professional engineer has 5, great ones 7, the best 9 or 10). Look the total up on that component's
 *   Engineering Table: natural 1 is Ruined, below 10 a Malfunction (no change), 10–20 a positive effect and maybe a
 *   fault (totals above 20 read as 20). A professional engineer rolls twice and you choose. It costs 50% of the
 *   component's base cost, and a component can only be engineered once.
 * - Overclocking: on a new ship, pick any positive effect from the component's table, with no fault.
 * - Effects the system models are applied to the ship's numbers when engineered (Agility, Speed, bonuses, recharge,
 *   floating bonuses, strengths, weapon Damage/Accuracy, Shield Cell Banks, shields). The rest are recorded on the
 *   component. Faults that act in play: Faulty (50%) and Unreliable (10%) break a component when it's activated,
 *   Burnout does it 10 damage each use, Flashpoint breaks it when the shields collapse (or on Hull damage with none).
 */

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** Rows 10–20 of each table: "effect, effect | fault". */
const T = (rows) => Object.fromEntries(rows.map((r, i) => {
   const [effects, faults] = r.split("|").map((s) => s.trim());
   return [10 + i, { effects: effects ? effects.split(",").map((s) => s.trim()) : [], faults: faults ? faults.split(",").map((s) => s.trim()) : [] }];
}));

export const TABLES = {
   weapon: T(["damageBoost|faulty", "steadyMount|fragile", "damageBoost|powerHungry", "steadyMount|flashpoint", "damageBoost|", "steadyMount|", "damageBoost|", "steadyMount|", "damageBoost,conservePower|", "steadyMount,conservePower|", "damageBoost,steadyMount|"]),
   utility: T(["conservePower|flashpoint", "hardened|drag", "magnified|burnout", "conservePower|fragile", "hardened|", "magnified|", "conservePower|", "hardened|", "magnified|", "conservePower,magnified|", "hardened,magnified|"]),
   bulkhead: T(["boosted|clumsy", "boosted|clumsy", "hardened|drag", "boosted|clumsy", "boosted|", "boosted|", "boosted|", "boosted|", "hardened|", "hardened|", "boosted,hardened|"]),
   powerPlant: T(["charged|clumsy,drag", "charged|drag", "energised|flashpoint", "charged|fragile", "charged|", "charged|", "charged|", "charged,hardened|", "energised|", "energised|", "charged,energised|"]),
   thrusters: T(["boosted|powerHungry", "fleet|powerHungry", "overdrive|flashpoint", "boosted|fragile", "conservePower|", "fleet|", "boosted|", "overdrive|", "boosted,fleet|", "overdrive,fleet|", "boosted,overdrive|"]),
   fsd: T(["conservePower|flashpoint", "jumpBoost|unreliable", "jumpExtension|faulty", "jumpBoost|fragile", "conservePower|", "jumpBoost|", "jumpBoost,hardened|", "jumpExtension|", "jumpBoost,conservePower|", "jumpExtension,conservePower|", "jumpBoost,jumpExtension|"]),
   lifeSupport: T(["hardened|faulty", "cycling|fragile", "conservePower|flashpoint", "hardened|powerHungry", "hardened|", "cycling|", "conservePower|", "hardened,conservePower|", "conservePower,cycling|", "cycling,hardened|", "cycling,hardened,conservePower|"]),
   powerDistributor: T(["conservePower|clumsy", "quickCharge|drag", "accurate|powerHungry", "fleet|fragile", "conservePower|", "quickCharge|", "accurate|", "fleet|", "extraBonus|", "extraBonus,hardened|", "extraBonus,conservePower|"]),
   sensors: T(["conservePower|flashpoint", "focused|clumsy", "awareness|fragile", "tracking|powerHungry", "hardened|", "conservePower|", "focused|", "awareness|", "tracking|", "focused,awareness|", "awareness,tracking|"]),
   afmu: T(["hardened|bulky", "conservePower|fragile", "enhancedSupply|bulky", "improvedRepair|powerHungry", "hardened|", "conservePower|", "enhancedSupply|", "improvedRepair|", "hardened,conservePower|", "enhancedSupply,conservePower|", "enhancedSupply,improvedRepair|"]),
   interdictor: T(["hardened|bulky", "conservePower|faulty", "tightGrapple|unreliable", "wideGrapple|powerHungry", "hardened|", "conservePower|", "tightGrapple|", "wideGrapple|", "hardened,conservePower|", "tightGrapple,conservePower|", "tightGrapple,wideGrapple|"]),
   fuelScoop: T(["hardened|bulky", "conservePower|faulty", "improvedScooping|unreliable", "improvedScooping|powerHungry", "hardened|", "conservePower|", "improvedScooping|", "improvedScooping|", "hardened,conservePower|", "improvedScooping,hardened|", "improvedScooping,conservePower|"]),
   refinery: T(["hardened|bulky", "conservePower|faulty", "improvedResonators|unreliable", "improvedResonators|powerHungry", "hardened|", "conservePower|", "improvedResonators|", "improvedResonators|", "hardened,conservePower|", "improvedResonators,hardened|", "improvedResonators,conservePower|"]),
   cellBank: T(["hardened|bulky", "conservePower|faulty", "recharger|unreliable", "extraCells|powerHungry", "hardened|", "conservePower|", "recharger|", "extraCells|", "hardened,conservePower|", "recharger,conservePower|", "recharger,extraCells|"]),
   // The book prints no fault for a 11 on the Shield Generator table.
   shieldGenerator: T(["hardened|bulky", "conservePower|", "quickCharge|flashpoint", "powerful|powerHungry", "hardened|", "conservePower|", "quickCharge|", "powerful|", "hardened,conservePower|", "quickCharge,conservePower|", "quickCharge,powerful|"]),
};

/** Professional engineers' Repair bonuses (p.7). */
export const ENGINEER_BONUSES = { 5: "EDRPG.engineering.pro5", 7: "EDRPG.engineering.pro7", 9: "EDRPG.engineering.pro9", 10: "EDRPG.engineering.pro10" };

/** Faults that break a component when it's activated, and their chance. */
const ACTIVATION_FAULTS = { faulty: 50, unreliable: 10 };

/**
 * The Engineering Table for a component or weapon (null: it can't be engineered).
 *
 * @param {{kind: string, name?: string}} c
 *
 * @returns {string|null}
 */
export function tableFor(c) {
   if (!c) return null;
   if (c.kind === "bulkhead") return "bulkhead";
   if (c.kind === "weapon") return "weapon";
   if (c.kind === "utility") return "utility";
   if (["powerPlant", "thrusters", "fsd", "lifeSupport", "powerDistributor", "sensors", "shieldGenerator"].includes(c.kind)) return c.kind;
   const n = (c.name ?? "").toLowerCase();
   if (n.includes("shield cell bank")) return "cellBank";
   if (n.includes("field maintenance") || /\bafmu\b/.test(n)) return "afmu";
   if (n.includes("interdictor")) return "interdictor";
   if (n.includes("fuel scoop")) return "fuelScoop";
   if (n.includes("refinery")) return "refinery";
   return null;
}

/**
 * Look a Repair check up on a table.
 *
 * @param {string} table
 *
 * @param {number} total
 *
 * @param {number} natural
 *
 * @returns {{effects: string[], faults: string[], ruined?: boolean, malfunction?: boolean}}
 */
export function lookup(table, total, natural) {
   if (natural === 1) return { effects: [], faults: ["ruined"], ruined: true };
   if (total < 10) return { effects: [], faults: ["malfunction"], malfunction: true };
   const row = TABLES[table][Math.min(20, total)];
   return { effects: [...row.effects], faults: [...row.faults] };
}

/** Every positive effect a table can give (for Overclocking). */
export function positiveEffects(table) {
   return [...new Set(Object.values(TABLES[table] ?? {}).flatMap((r) => r.effects))];
}

/** A ship's engineerable targets: its components, weapons and bulkhead. */
export function engineeringTargets(ship) {
   const sys = ship.system;
   const out = [{ key: "bulkhead", kind: "bulkhead", name: L("EDRPG.engineering.bulkhead"), engineered: sys.bulkhead?.effects?.length || sys.bulkhead?.faults?.length }];
   sys.components.forEach((c, index) => {
      if (c.kind === "weapon") return;
      const table = tableFor(c);
      if (table) out.push({ key: `c:${index}`, kind: c.kind, name: c.name, index, table, engineered: !!(c.engineered?.effects?.length || c.engineered?.faults?.length) });
   });
   for (const w of ship.itemTypes.craftWeapon) out.push({ key: `w:${w.id}`, kind: "weapon", name: w.name, item: w.id, table: "weapon", engineered: !!(w.system.engineered?.effects?.length || w.system.engineered?.faults?.length) });
   for (const t of out) t.table ??= tableFor(t);
   return out;
}

const SIZE_BOOST = { small: 5, medium: 10, large: 15, huge: 20 };

/**
 * Apply an engineering result to a ship.
 *
 * @param {Actor} ship
 *
 * @param {object} target  From {@link engineeringTargets}.
 *
 * @param {{effects: string[], faults: string[]}} result
 *
 * @returns {Promise<string[]>}  What changed, for the chat card.
 */
export async function applyEngineering(ship, target, result) {
   const sys = ship.system;
   const src = ship.system.toObject();
   const update = {};
   const changes = [];
   const effects = result.effects ?? [];
   const faults = (result.faults ?? []).filter((f) => f !== "malfunction");
   if (result.malfunction) return [L("EDRPG.engineering.malfunctionDone")];
   const has = (k) => effects.includes(k) || faults.includes(k);
   const addTo = (path, n, label) => {
      const current = foundry.utils.getProperty(src, path) ?? 0;
      foundry.utils.setProperty(src, path, current + n);
      update[`system.${path}`] = current + n;
      changes.push(`${label} ${current} → ${current + n}`);
   };

   // Ship-wide effects.
   if (has("fleet")) addTo("agility", 1, L("EDRPG.vehicle.agility"));
   if (has("clumsy")) addTo("agility", -1, L("EDRPG.vehicle.agility"));
   const speedDelta = (has("boosted") ? 1 : 0) + (has("overdrive") ? 2 : 0) - (has("drag") ? 1 : 0);
   if (speedDelta) {
      addTo("speed", speedDelta, L("EDRPG.vehicle.speed"));
      if (src.maxSpeed) update["system.maxSpeed"] = (src.maxSpeed ?? 0) + speedDelta;
   }
   if (has("awareness")) addTo("bonuses.initiative", 1, L("EDRPG.sheet.initiative"));
   if (has("tracking")) addTo("bonuses.dogfighting", 1, L("EDRPG.ship.dogfighting"));
   if (has("accurate")) addTo("bonuses.toHit", 1, L("EDRPG.ship.bonusToHit"));
   if (has("quickCharge")) addTo("shields.recharge", 5, L("EDRPG.vehicle.recharge"));
   if (has("extraBonus")) addTo("equipment.floating", 1, L("EDRPG.equip.floatingCount"));

   if (target.kind === "bulkhead") {
      const bulkhead = { effects, faults };
      update["system.bulkhead"] = bulkhead;
      if (has("hardened")) changes.push(L("EDRPG.engineering.bulkheadHardened"));
   } else if (target.kind === "weapon") {
      const weapon = ship.items.get(target.item);
      if (!weapon) return changes;
      const ws = weapon.system;
      const wu = { "system.engineered": { effects, faults } };
      if (has("damageBoost")) {
         const n = SIZE_BOOST[ws.mount.size] ?? 5;
         wu["system.damage"] = ws.damage + n;
         if (ws.damageVsShields !== null) wu["system.damageVsShields"] = ws.damageVsShields + n;
         changes.push(`${weapon.name}: ${L("EDRPG.sheet.damage")} ${ws.damage} → ${ws.damage + n}`);
      }
      if (has("steadyMount")) {
         wu["system.accuracy"] = ws.accuracy + 1;
         changes.push(`${weapon.name}: ${L("EDRPG.craft.accuracy")} ${ws.accuracy} → ${ws.accuracy + 1}`);
      }
      await weapon.update(wu);
      // Fragile / Ruined weapons: their roster entry (created at the default strength when missing).
      if (has("fragile") || result.ruined) {
         let i = src.components.findIndex((c) => c.kind === "weapon" && c.item === weapon.id);
         if (i < 0) {
            const strength = sys.npc?.critical || 20;
            src.components.push({ name: weapon.name, kind: "weapon", strength: { value: strength, max: strength }, notes: "", item: weapon.id });
            i = src.components.length - 1;
         }
         const c = src.components[i];
         if (result.ruined) c.strength.value = 0;
         else {
            c.strength.max = Math.ceil(c.strength.max / 2);
            c.strength.value = Math.min(c.strength.value, c.strength.max);
         }
         update["system.components"] = src.components;
         changes.push(`${weapon.name}: ${L("EDRPG.ship.strength")} ${c.strength.value}/${c.strength.max}`);
      }
   } else {
      const c = src.components[target.index];
      if (!c) return changes;
      c.engineered = { effects, faults };
      const before = `${c.strength.value}/${c.strength.max}`;
      if (has("hardened")) {
         c.strength.max *= 2;
         c.strength.value *= 2;
      }
      if (has("fragile")) {
         c.strength.max = Math.ceil(c.strength.max / 2);
         c.strength.value = Math.min(c.strength.value, c.strength.max);
      }
      if (result.ruined) c.strength.value = 0;
      if (`${c.strength.value}/${c.strength.max}` !== before) changes.push(`${c.name}: ${L("EDRPG.ship.strength")} ${before} → ${c.strength.value}/${c.strength.max}`);
      // Powerful: the generator's shields are 25% stronger.
      if (has("powerful")) {
         const power = Number(c.notes.match(/Shield Power\s*(\d+)/i)?.[1]) || src.shields.max;
         const n = Math.round(power * 0.25);
         update["system.shields.max"] = src.shields.max + n;
         update["system.shields.value"] = src.shields.value + n;
         changes.push(`${L("EDRPG.vehicle.shields")} ${src.shields.max} → ${src.shields.max + n}`);
      }
      // Shield Cell Banks: Recharger +10, Extra Cells +2 duration.
      if (has("recharger") || has("extraCells")) {
         const bank = src.equipment.cellBanks.find((b) => b.name === c.name) ?? src.equipment.cellBanks[0];
         if (bank) {
            if (has("recharger")) bank.boost += 10;
            if (has("extraCells")) bank.duration += 2;
            update["system.equipment.cellBanks"] = src.equipment.cellBanks;
            changes.push(`${bank.name}: +${bank.boost} × ${bank.duration}`);
         }
      }
      update["system.components"] = src.components;
   }
   await ship.update(update);
   return changes;
}

/**
 * Faults that act when a component is activated (chaff, Shield Cell Bank, point defence, a weapon firing):
 * Faulty (50%) / Unreliable (10%) break it; Burnout does it 10 damage.
 *
 * @param {Actor} ship
 *
 * @param {{index?: number, item?: string}} ref  A roster component (index) or a weapon (item id).
 *
 * @returns {Promise<{broken: boolean, notes: string[]}>}
 */
export async function activationFaults(ship, ref) {
   const sys = ship.system;
   const weapon = ref.item ? ship.items.get(ref.item) : null;
   const faults = weapon ? (weapon.system.engineered?.faults ?? []) : (sys.components[ref.index]?.engineered?.faults ?? []);
   const notes = [];
   let broken = false;
   if (!faults.length) return { broken, notes };
   const src = sys.toObject().components;
   let i = ref.item ? src.findIndex((c) => c.kind === "weapon" && c.item === ref.item) : ref.index;
   const entry = () => {
      if (i < 0) {
         const strength = sys.npc?.critical || 20;
         src.push({ name: weapon.name, kind: "weapon", strength: { value: strength, max: strength }, notes: "", item: weapon.id });
         i = src.length - 1;
      }
      return src[i];
   };
   for (const [fault, chance] of Object.entries(ACTIVATION_FAULTS)) {
      if (!faults.includes(fault) || broken) continue;
      const roll = await new Roll("1d100").evaluate();
      if (roll.total <= chance) {
         broken = true;
         entry().strength.value = 0;
         notes.push(L("EDRPG.engineering.sparks", { name: esc(entry().name), fault: L(`EDRPG.engineering.fault.${fault}`), roll: roll.total }));
      }
   }
   if (!broken && faults.includes("burnout")) {
      const c = entry();
      c.strength.value -= 10;
      broken = c.strength.value <= 0;
      notes.push(L("EDRPG.engineering.burnoutHit", { name: esc(c.name), value: c.strength.value }));
   }
   if (notes.length) await ship.update({ "system.components": src });
   return { broken, notes };
}

/**
 * Flashpoint: components (and weapons) with it fail when the ship's shields collapse, or on Hull damage if it has none.
 *
 * @param {Actor} ship
 *
 * @returns {Promise<string[]>}  Names of what failed.
 */
export async function flashpoint(ship) {
   const sys = ship.system;
   const flagged = (sys.components ?? []).some((c) => c.engineered?.faults?.includes("flashpoint")) ||
      (ship.itemTypes?.craftWeapon ?? []).some((w) => w.system.engineered?.faults?.includes("flashpoint"));
   if (!flagged) return [];
   const src = sys.toObject().components;
   const failed = [];
   src.forEach((c) => {
      if (c.engineered?.faults?.includes("flashpoint") && c.strength.value > 0) {
         c.strength.value = 0;
         failed.push(c.name);
      }
   });
   for (const w of ship.itemTypes.craftWeapon) {
      if (!w.system.engineered?.faults?.includes("flashpoint")) continue;
      let c = src.find((x) => x.kind === "weapon" && x.item === w.id);
      if (!c) {
         const strength = sys.npc?.critical || 20;
         c = { name: w.name, kind: "weapon", strength: { value: strength, max: strength }, notes: "", item: w.id };
         src.push(c);
      }
      if (c.strength.value > 0) {
         c.strength.value = 0;
         failed.push(w.name);
      }
   }
   if (failed.length) await ship.update({ "system.components": src });
   return failed;
}

/** Is a utility mount A* grade (Magnified)? Matched by name, e.g. "Chaff", "ECM", "Point Defence". */
export function aStar(ship, pattern) {
   return (ship?.system?.components ?? []).some((c) => c.kind === "utility" && pattern.test(c.name) && c.strength.value > 0 && c.engineered?.effects?.includes("magnified"));
}

/** Label list for effects / faults. */
export function labels(keys, kind) {
   return (keys ?? []).map((k) => L(`EDRPG.engineering.${kind}.${k}`)).join(", ");
}

/**
 * The engineering dialog: choose the target, who does the work, and roll (or pick an Overclocking effect).
 *
 * @param {Actor} ship
 *
 * @param {string} [preselect]  A target key.
 */
export async function engineerDialog(ship, preselect) {
   if (!ship?.system?.isShip) return;
   const targets = engineeringTargets(ship).filter((t) => t.table);
   const pilot = ship.system.pilotActor;
   const repair = pilot?.system?.skillBonus?.("repair") ?? 0;
   const options = targets.map((t) => `<option value="${t.key}" ${t.key === preselect ? "selected" : ""}>${esc(t.name)}${t.engineered ? ` (${L("EDRPG.engineering.already")})` : ""}</option>`).join("");
   const content = `
      <div class="form-group"><label>${L("EDRPG.engineering.component")}</label><div class="form-fields"><select name="target">${options}</select></div></div>
      <div class="form-group"><label>${L("EDRPG.engineering.who")}</label><div class="form-fields"><select name="who">
         <option value="self">${L("EDRPG.engineering.self")}</option>
         ${Object.entries(ENGINEER_BONUSES).map(([b, k]) => `<option value="pro${b}">${L(k)}</option>`).join("")}
         <option value="overclock">${L("EDRPG.engineering.overclock")}</option>
      </select></div></div>
      <div class="form-group"><label>${L("EDRPG.engineering.repairBonus")}</label><div class="form-fields"><input type="number" name="bonus" value="${repair}" step="1"></div>
      <p class="hint">${L("EDRPG.engineering.hint")}</p></div>`;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.engineering.title", { name: ship.name }) },
      classes: ["edrpg", "edrpg-dialog"],
      content,
      rejectClose: false,
   });
   if (!input) return;
   const target = targets.find((t) => t.key === input.target);
   if (!target) return;
   if (target.engineered && input.who !== "overclock") {
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: L("EDRPG.engineering.title", { name: ship.name }) }, content: `<p>${L("EDRPG.engineering.againWarning", { name: esc(target.name) })}</p>`, rejectClose: false });
      if (!ok) return;
   }

   let result;
   let rollText = "";
   const rolls = [];
   if (input.who === "overclock") {
      const choices = positiveEffects(target.table);
      const pick = await foundry.applications.api.DialogV2.input({
         window: { title: L("EDRPG.engineering.overclock") },
         classes: ["edrpg", "edrpg-dialog"],
         content: `<p>${L("EDRPG.engineering.overclockHint")}</p><div class="form-group"><label>${L("EDRPG.engineering.effectLabel")}</label><div class="form-fields"><select name="effect">${choices.map((k) => `<option value="${k}">${L(`EDRPG.engineering.effect.${k}`)}</option>`).join("")}</select></div></div>`,
         rejectClose: false,
      });
      if (!pick) return;
      result = { effects: [pick.effect], faults: [] };
      rollText = L("EDRPG.engineering.overclock");
   } else {
      const bonus = input.who === "self" ? Number(input.bonus) || 0 : Number(input.who.slice(3));
      const times = input.who === "self" ? 1 : 2;
      const outcomes = [];
      for (let n = 0; n < times; n++) {
         const roll = await new Roll(`1d10 + ${bonus}`).evaluate();
         rolls.push(roll);
         const natural = roll.dice[0]?.total ?? roll.total - bonus;
         outcomes.push({ total: roll.total, natural, ...lookup(target.table, roll.total, natural) });
      }
      const describe = (o) => `${o.total}${o.natural === 1 ? ` (${L("EDRPG.engineering.natural1")})` : ""}: ${labels(o.effects, "effect") || "—"}${o.faults.length ? ` / ${labels(o.faults, "fault")}` : ""}`;
      let chosen = outcomes[0];
      if (outcomes.length > 1) {
         if (game.dice3d) for (const r of rolls) game.dice3d.showForRoll(r, game.user, true);
         const buttons = outcomes.map((o, i) => ({ action: String(i), label: describe(o), default: i === 0 }));
         const which = await foundry.applications.api.DialogV2.wait({
            window: { title: L("EDRPG.engineering.chooseTitle") },
            classes: ["edrpg", "edrpg-dialog"],
            content: `<p>${L("EDRPG.engineering.chooseHint")}</p>`,
            buttons,
            rejectClose: false,
         });
         if (which === null || which === undefined) return;
         chosen = outcomes[Number(which)] ?? chosen;
      }
      result = chosen;
      rollText = outcomes.map(describe).join("; ");
   }

   const changes = await applyEngineering(ship, target, result);
   const content2 = `<div class="edrpg edrpg-chat edrpg-engineering">
      <h3><i class="fa-solid fa-screwdriver-wrench"></i> ${L("EDRPG.engineering.cardTitle", { name: esc(target.name) })}</h3>
      <p class="muted">${esc(rollText)}</p>
      ${result.effects.length ? `<p><strong>${L("EDRPG.engineering.effects")}:</strong> ${labels(result.effects, "effect")}</p>` : ""}
      ${result.faults.length ? `<p class="ed-fault"><strong>${L("EDRPG.engineering.faults")}:</strong> ${labels(result.faults, "fault")}</p>` : ""}
      ${changes.length ? `<ul>${changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
      <p class="hint">${L("EDRPG.engineering.costNote")}</p></div>`;
   await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: ship }), content: content2, rolls, sound: rolls.length && !game.dice3d ? CONFIG.sounds.dice : null });
}
