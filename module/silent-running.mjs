/**
 * Silent Running (Core Rules p.268, with the Heat Sink Launcher, p.198).
 *
 * - A ship goes silent by closing its heat vents and dropping its shields; they only come back by recharging as normal
 *   once it stops hiding. Unless someone actively scans for it, it's invisible to sensors: it can't be targeted.
 * - A scan is an opposed check: the sensor operator's Systems + the scanning ship's General Scan, against the hidden
 *   ship's Systems + 4 (small ships; fighters too) or + 2 (medium; large ships get nothing), + 2 with a Heat Sink fired
 *   this turn. If the scanner wins, that ship can see it.
 * - Against a detected silent ship, gimballed weapons and automated turrets are at -4 To Hit, and seekers and
 *   torpedoes can't be fired.
 * - After a minute it overheats: each round crew members take 1D10 Damage and three random components take 1D10 each.
 *   Each Heat Sink fired buys another minute. The book never says how long a round is; its damage ticks every ten
 *   seconds, so a minute is six rounds by default (the "Silent Running: rounds per minute" setting).
 */
import { opposed } from "./dice/resolve.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** The hidden ship's bonus by size. */
export const SIZE_BONUS = { tiny: 4, small: 4, medium: 2, large: 0, huge: 0 };

/** Rounds in a minute (the world setting; 6 by default). */
export function minuteRounds() {
   const n = Number(game.settings?.get?.("edrpg", "silentRunningRounds"));
   return n > 0 ? n : 6;
}

/** How many rounds a ship can stay silent before overheating (a minute, plus a minute per heat sink). */
export function safeRounds(sys) {
   return minuteRounds() * (1 + (sys.combat?.silent?.sinks ?? 0));
}

/** A ship's General Scan bonus: its fitted sensors (outfitting) or the roster's "+N General Scan". */
export function generalScan(ship) {
   const items = ship.items?.contents ?? Array.from(ship.items ?? []);
   const fitted = items.find((i) => i.type === "shipComponent" && i.system?.fitted === "fixed.sensors");
   if (fitted) return fitted.system.stats?.generalScan ?? 0;
   const roster = (ship.system.components ?? []).find((c) => c.kind === "sensors");
   if (!roster || roster.strength?.value <= 0) return 0;
   return Number(roster.notes?.match(/\+(\d+)\s*General Scan/i)?.[1]) || 0;
}

/** Is the target hidden from this attacker? */
export function hiddenFrom(target, attacker) {
   const s = target?.system?.combat?.silent;
   return !!s?.active && !(s.seenBy ?? []).includes(attacker?.uuid);
}

/** Weapons that can't be fired at a silent ship: seekers and torpedoes. */
export const guided = (weapon) => /seeker|torpedo/i.test(weapon?.name ?? "");

/** The sensor operator's (or hider's) Systems bonus: the pilot's, 0 without one. */
function systemsBonus(ship) {
   const pilot = ship.system.pilotActor;
   return pilot?.system?.skillBonus?.("systems") ?? 0;
}

/**
 * The two sides of a scan: { scanner: {bonus, parts}, hider: {bonus, parts} }.
 *
 * @param {Actor} scanner
 *
 * @param {Actor} hider
 */
export function scanBonuses(scanner, hider) {
   const scan = generalScan(scanner);
   const sys = systemsBonus(scanner);
   const size = SIZE_BONUS[hider.system.category] ?? 0;
   const sink = hider.system.combat?.heatSink ? 2 : 0;
   const hide = systemsBonus(hider);
   return {
      scanner: { bonus: sys + scan, parts: [L("EDRPG.silent.partSystems", { n: sys }), L("EDRPG.silent.partScan", { n: scan })] },
      hider: { bonus: hide + size + sink, parts: [L("EDRPG.silent.partSystems", { n: hide }), L("EDRPG.silent.partSize", { n: size }), ...(sink ? [L("EDRPG.silent.partSink")] : [])] },
   };
}

/**
 * Scan for a silent ship (an opposed Systems check). The hider's side is rolled at once; ties keep it hidden.
 *
 * @param {Actor} scanner
 *
 * @param {Actor} hider
 *
 * @param {object} [o]  { relay } — how to update the hider (defaults to a direct update; the combat code passes its
 *                      GM relay, since the scanner's player rarely owns the hidden ship).
 */
export async function scanForSilent(scanner, hider, { relay = null } = {}) {
   if (!hider?.system?.combat?.silent?.active) return void ui.notifications.info(L("EDRPG.silent.notSilent", { name: hider?.name ?? "" }));
   if (!hiddenFrom(hider, scanner)) return void ui.notifications.info(L("EDRPG.silent.alreadySeen", { name: hider.name, by: scanner.name }));
   const b = scanBonuses(scanner, hider);
   const ra = await new Roll("1d10").evaluate();
   const rd = await new Roll("1d10").evaluate();
   const a = { natural: ra.total, total: ra.total + b.scanner.bonus };
   const d = { natural: rd.total, total: rd.total + b.hider.bonus };
   const { winner } = opposed(a, d, "defender");
   const found = winner === "initiator";
   if (found) {
      const data = { "system.combat.silent.seenBy": [...(hider.system.combat.silent.seenBy ?? []), scanner.uuid] };
      await (relay ? relay(hider, data) : hider.update(data));
   }
   const content = `<div class="edrpg edrpg-chat edrpg-silent"><h3><i class="fa-solid fa-satellite-dish"></i> ${L("EDRPG.silent.scanTitle", { scanner: esc(scanner.name), hider: esc(hider.name) })}</h3>
      <p>${esc(scanner.name)}: ${ra.total} + ${b.scanner.bonus} = <b>${a.total}</b> <span class="muted">(${b.scanner.parts.join(", ")})</span></p>
      <p>${esc(hider.name)}: ${rd.total} + ${b.hider.bonus} = <b>${d.total}</b> <span class="muted">(${b.hider.parts.join(", ")})</span></p>
      <div class="outcome ${found ? "success" : "failure"}">${L(found ? "EDRPG.silent.found" : "EDRPG.silent.notFound", { scanner: esc(scanner.name), hider: esc(hider.name) })}</div></div>`;
   await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: scanner }), content, rolls: [ra, rd] });
   return found;
}

/**
 * A silent ship overheats: each crew member takes 1D10, three random roster components 1D10 each.
 *
 * @param {Actor} ship
 */
export async function overheat(ship) {
   const { damageComponent } = await import("./dice/ship-damage.mjs");
   const { applyDamage } = await import("./dice/damage.mjs");
   const lines = [];
   for (const crew of ship.system.crewActors ?? []) {
      const r = await new Roll("1d10").evaluate();
      if (crew.system?.endurance) {
         const res = await applyDamage(crew, { amount: r.total, damageType: "heat" });
         lines.push(L("EDRPG.silent.crewBurn", { name: esc(crew.name), n: r.total, after: res?.after ?? "?" }));
      } else lines.push(L("EDRPG.silent.crewBurnNpc", { name: esc(crew.name), n: r.total }));
   }
   const roster = ship.system.components ?? [];
   const pool = roster.map((c, i) => i);
   for (let k = 0; k < 3 && pool.length; k++) {
      const i = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const r = await new Roll("1d10").evaluate();
      const res = await damageComponent(ship, { index: i }, r.total);
      lines.push(L(res.destroyed ? "EDRPG.silent.componentOut" : "EDRPG.silent.componentHit", { name: esc(res.name), n: r.total, after: res.after, max: res.max }));
   }
   const content = `<div class="edrpg edrpg-chat edrpg-silent"><h3><i class="fa-solid fa-temperature-arrow-up"></i> ${L("EDRPG.silent.overheatTitle", { name: esc(ship.name) })}</h3><p>${lines.join("<br>")}</p></div>`;
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: ship }), content });
}

/** The silent ships in this ship's fight (combat first, else the scene), other than itself. */
export function silentShips(ship) {
   const pool = game.combat?.combatants?.size ? game.combat.combatants.map((c) => c.actor) : (canvas?.tokens?.placeables ?? []).map((t) => t.actor);
   const seen = new Set();
   return pool.filter((a) => a && a.uuid !== ship.uuid && a.system?.combat?.silent?.active && !seen.has(a.uuid) && seen.add(a.uuid));
}

/**
 * Pick a hidden ship and scan for it.
 *
 * @param {Actor} scanner
 *
 * @param {object} [o]  { relay }
 */
export async function chooseAndScan(scanner, { relay = null } = {}) {
   const list = silentShips(scanner).filter((a) => hiddenFrom(a, scanner));
   if (!list.length) return void ui.notifications.info(L("EDRPG.silent.noneHidden"));
   let hider = list[0];
   if (list.length > 1) {
      const res = await foundry.applications.api.DialogV2.input({
         window: { title: L("EDRPG.silent.scan"), icon: "fa-solid fa-satellite-dish" },
         content: `<div class="form-group"><label>${L("EDRPG.silent.scanFor")}</label><div class="form-fields"><select name="target">${list.map((a) => `<option value="${a.uuid}">${esc(a.name)}</option>`).join("")}</select></div></div>`,
         rejectClose: false,
      });
      if (!res) return;
      hider = list.find((a) => a.uuid === res.target) ?? hider;
   }
   return scanForSilent(scanner, hider, { relay });
}
