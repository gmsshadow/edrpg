/**
 * Between Adventures income (Core Rules pp.272–276) and Rare Item Availability (pp.324–325).
 *
 * A character picks a ship and an activity. Its requirements and numbers come from the ship's components:
 * - Safe Trading (needs a Cargo Rack): profit per ton (D100) × Trading bonus × cargo capacity.
 * - Asteroid Mining (a mining laser, a refinery, a Cargo Rack): (Mining Bonuses of the lasers, refinery and limpet
 *   controllers + cargo capacity) × Planetary Knowledge bonus × yield value (D100).
 * - Exploration (a Discovery Scanner): Exploration Value from the jump range, scanners, SRV hangar, fuel scoop and
 *   Navigation bonus → Discovery Yield.
 * - Bounty Hunting (enough weapon points for the risk): Spaceship Piloting and Spaceship Weapons checks against the
 *   Risk Number. Both pass: the bounty (D100), plus any Kill Warrant Scanner bonus. One fails: nothing. Both fail:
 *   repairs cost the same table's roll, or write the ship off; both fail by more than 3: the ship is destroyed.
 * - An employee can fly a spare ship instead (not Bounty Hunting): the player's bonuses are used, and a D10 equal to or
 *   over the activity's Employee Risk Number loses the ship and its crew.
 *
 * Rulings: a mining laser's Mining Bonus is 1 (small) or 2 (medium), from the equipment list (p.196), as ship rosters
 * don't record it. Mining lasers don't count as weapons for Bounty Hunting. An Exploration Value under 1 earns the
 * lowest yield.
 */
import { ranks } from "./config.mjs";
import { judge } from "./dice/resolve.mjs";
import { addictionPhase } from "./addiction.mjs";
import { crewOf } from "./crew.mjs";
import { fleetOf, activeShip } from "./fleet.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cr = (n) => `${Math.round(n).toLocaleString()}cr`;

/** The D100 bands shared by the Safe Trading, Asteroid Mining and Bounty Hunting tables. */
const BANDS = [5, 15, 25, 35, 45, 75, 80, 85, 90, 95, 100];
const band = (roll) => BANDS.findIndex((max) => roll <= max);

export const SAFE_TRADING = [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500];
export const MINING_YIELD = [200, 400, 600, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000];
/** Bounty Hunting: weapon points needed, Risk Number, and the payouts. */
export const BOUNTY = {
   low: { points: 2, risk: 8, values: [3000, 6000, 8000, 12000, 16000, 20000, 25000, 30000, 35000, 40000, 50000] },
   medium: { points: 6, risk: 10, values: [30000, 60000, 80000, 120000, 160000, 200000, 250000, 300000, 350000, 400000, 500000] },
   high: { points: 8, risk: 12, values: [90000, 180000, 240000, 360000, 480000, 600000, 750000, 900000, 1050000, 1200000, 1500000] },
   hazardous: { points: 14, risk: 15, values: [180000, 360000, 480000, 720000, 960000, 1200000, 1500000, 1800000, 2100000, 2400000, 3000000] },
};
/** Jump range (ly) → Exploration Value. */
const RANGE_VALUE = [[9, 0], [13, 1], [17, 2], [20, 3], [23, 4], [26, 5], [29, 6], [32, 7], [Infinity, 8]];
/** Exploration Value → Discovery Yield. */
const DISCOVERY_YIELD = [[5, 8000], [10, 40000], [15, 180000], [20, 300000], [25, 1000000], [Infinity, 3000000]];
/** Employee Risk Numbers. */
export const EMPLOYEE_RISK = { trading: 10, mining: 9, exploration: 8 };
/** Weapon points per mount size. */
export const WEAPON_POINTS = { tiny: 1, small: 1, medium: 2, large: 4, huge: 6 };

/** Between Adventures income guide by rank (p.322). */
export const INCOME_GUIDE = { harmless: 40000, mostlyHarmless: 50000, novice: 240000, competent: 400000, expert: 500000, master: 1000000, dangerous: 1000000, deadly: 3500000, elite: 4500000 };

/* -------------------------------------------- */
/*  What a ship can do                          */
/* -------------------------------------------- */

const num = (text, re) => {
   const m = String(text ?? "").match(re);
   return m ? Number(m[1].replace(/,/g, "")) : 0;
};

/**
 * Everything the Between Adventures activities need to know about a ship. Broken components don't count.
 *
 * @param {Actor} ship
 *
 * @returns {object}
 */
export function shipProfile(ship) {
   const sys = ship.system;
   const working = (sys.components ?? []).filter((c) => (c.strength?.value ?? 1) > 0);
   const named = (re) => working.filter((c) => re.test(c.name));
   const racks = named(/cargo rack/i);
   let cargo = racks.reduce((n, c) => n + num(c.notes, /capacity\s*:?\s*(\d+)/i), 0);
   if (!cargo && racks.length) cargo = num(sys.cargo, /(\d+)/);
   const weapons = [...(ship.itemTypes?.craftWeapon ?? [])];
   const lasers = weapons.filter((w) => /mining laser/i.test(w.name));
   const laserBonus = lasers.reduce((n, w) => n + (w.system.mount?.size === "medium" ? 2 : 1), 0);
   const miningKit = named(/refinery|limpet (controller|drone)|limper controller/i).filter((c) => /mining bonus/i.test(c.notes ?? ""));
   const kitBonus = miningKit.reduce((n, c) => n + num(c.notes, /mining bonus\s*:?\s*(\d+)/i), 0);
   const fsd = working.find((c) => c.kind === "fsd");
   const range = num(fsd?.notes, /range\s*:?\s*([\d.]+)/i) || num(sys.range, /([\d.]+)/);
   const scanner = named(/advanced discovery/i).length ? "advanced" : named(/intermediate discovery/i).length ? "intermediate" : named(/basic discovery|discovery scanner/i).length ? "basic" : "";
   const kws = named(/kill warrant/i).reduce((best, c) => Math.max(best, num(c.notes, /(\d+)\s*%/)), 0);
   const points = weapons.filter((w) => !/mining laser/i.test(w.name)).reduce((n, w) => n + (WEAPON_POINTS[w.system.mount?.size] ?? 1), 0);
   return {
      cargo,
      cargoRack: racks.length > 0,
      miningLaser: lasers.length > 0,
      refinery: named(/refinery/i).length > 0,
      miningBonus: laserBonus + kitBonus,
      range,
      scanner,
      surfaceScanner: named(/detailed (surface|planetary) scanner/i).length > 0,
      srvHangar: named(/vehicle hang[ae]r/i).length > 0,
      fuelScoop: named(/fuel scoop/i).length > 0,
      weaponPoints: points,
      killWarrant: kws,
      size: sys.category,
      crewSize: sys.crewSize ?? 0,
   };
}

/**
 * Why a ship can't do an activity (null: it can).
 *
 * @param {object} p  shipProfile.
 *
 * @param {string} activity
 *
 * @returns {string|null}
 */
export function activityBlocked(p, activity) {
   if (activity === "trading" && !p.cargoRack) return L("EDRPG.between.needs.trading");
   if (activity === "mining" && !(p.miningLaser && p.refinery && p.cargoRack)) return L("EDRPG.between.needs.mining");
   if (activity === "exploration" && !p.scanner) return L("EDRPG.between.needs.exploration");
   if (activity === "bounty" && p.weaponPoints < BOUNTY.low.points) return L("EDRPG.between.needs.bounty", { points: p.weaponPoints });
   return null;
}

/**
 * The Exploration Value and its parts.
 *
 * @param {object} p
 *
 * @param {number} navigation  Navigation bonus.
 *
 * @param {boolean} srv  The hangar has an SRV in it.
 *
 * @returns {{value: number, parts: {label: string, value: number}[]}}
 */
export function explorationValue(p, navigation, srv = true) {
   const parts = [];
   const rangeValue = RANGE_VALUE.find(([max]) => p.range <= max)[1];
   parts.push({ label: L("EDRPG.between.part.range", { range: p.range }), value: rangeValue });
   if (p.scanner === "intermediate") parts.push({ label: L("EDRPG.between.part.intermediate"), value: 2 });
   if (p.scanner === "advanced") parts.push({ label: L("EDRPG.between.part.advanced"), value: 5 });
   if (p.surfaceScanner) parts.push({ label: L("EDRPG.between.part.surface"), value: 3 });
   if (p.srvHangar && srv) parts.push({ label: L("EDRPG.between.part.srv"), value: 2 });
   if (p.fuelScoop) parts.push({ label: L("EDRPG.between.part.scoop"), value: 1 });
   parts.push({ label: L("EDRPG.between.part.navigation"), value: navigation });
   return { value: parts.reduce((n, x) => n + x.value, 0), parts };
}

/** Discovery Yield for an Exploration Value. */
export function discoveryYield(value) {
   return DISCOVERY_YIELD.find(([max]) => value <= max)[1];
}

/* -------------------------------------------- */
/*  Running an activity                         */
/* -------------------------------------------- */

/**
 * Work out one activity (pure: rolls are passed in, so it can be tested).
 *
 * @param {object} o
 *
 * @param {string} o.activity     trading | mining | exploration | bounty
 *
 * @param {object} o.profile      shipProfile
 *
 * @param {object} o.bonus        {trading, planetaryKnowledge, navigation, shipPiloting, shipWeapons}
 *
 * @param {number} o.d100         The table roll.
 *
 * @param {string} [o.risk]       Bounty Hunting risk level.
 *
 * @param {object[]} [o.checks]   Bounty Hunting: [{natural, total}] for Piloting and Weapons.
 *
 * @param {boolean} [o.srv=true]
 *
 * @returns {object}  {income, lines[], outcome, repairs, destroyed}
 */
export function workOut({ activity, profile: p, bonus, d100, risk = "low", checks = [], srv = true }) {
   const lines = [];
   const i = band(d100);
   if (activity === "trading") {
      const perTon = SAFE_TRADING[i];
      lines.push(L("EDRPG.between.line.trading", { roll: d100, perTon: cr(perTon), bonus: bonus.trading, cargo: p.cargo }));
      return { income: perTon * bonus.trading * p.cargo, lines, outcome: "income" };
   }
   if (activity === "mining") {
      const value = MINING_YIELD[i];
      const base = p.miningBonus + p.cargo;
      lines.push(L("EDRPG.between.line.mining", { mining: p.miningBonus, cargo: p.cargo, bonus: bonus.planetaryKnowledge, roll: d100, value }));
      return { income: base * bonus.planetaryKnowledge * value, lines, outcome: "income" };
   }
   if (activity === "exploration") {
      const ev = explorationValue(p, bonus.navigation, srv);
      lines.push(L("EDRPG.between.line.exploration", { value: ev.value, parts: ev.parts.filter((x) => x.value).map((x) => `${x.label} ${x.value}`).join(", ") || "—" }));
      return { income: discoveryYield(ev.value), lines, outcome: "income", explorationValue: ev.value };
   }
   // Bounty Hunting.
   const r = BOUNTY[risk];
   const [pilot, guns] = checks;
   const jp = judge({ natural: pilot.natural, total: pilot.total, dn: r.risk });
   const jw = judge({ natural: guns.natural, total: guns.total, dn: r.risk });
   lines.push(L("EDRPG.between.line.bountyChecks", { risk: r.risk, pilot: pilot.total, pilotOk: L(jp.success ? "EDRPG.between.pass" : "EDRPG.between.fail"), guns: guns.total, gunsOk: L(jw.success ? "EDRPG.between.pass" : "EDRPG.between.fail") }));
   const value = r.values[i];
   if (jp.success && jw.success) {
      const extra = Math.round((value * p.killWarrant) / 100);
      lines.push(L("EDRPG.between.line.bountyPaid", { roll: d100, value: cr(value) }) + (extra ? ` ${L("EDRPG.between.line.kws", { pct: p.killWarrant, extra: cr(extra) })}` : ""));
      return { income: value + extra, lines, outcome: "income" };
   }
   if (jp.success || jw.success) return { income: 0, lines, outcome: "nothing" };
   // Both failed: by more than 3 each, the ship is destroyed; otherwise repairs.
   const destroyed = r.risk - pilot.total > 3 && r.risk - guns.total > 3 && pilot.natural !== 10 && guns.natural !== 10;
   if (destroyed) return { income: 0, lines, outcome: "destroyed", destroyed: true };
   lines.push(L("EDRPG.between.line.repairs", { roll: d100, value: cr(value) }));
   return { income: -value, lines, outcome: "repairs", repairs: value };
}

/**
 * The ships a character can use: their own fleet (current ship first); failing that, ones they fly or that their
 * players own.
 *
 * @param {Actor} actor
 *
 * @returns {Actor[]}
 */
export function shipsFor(actor) {
   // The character's own fleet, the current ship first.
   const own = fleetOf(actor).filter((a) => a.type === "ship");
   if (own.length) {
      const current = activeShip(actor);
      return current ? [current, ...own.filter((a) => a !== current)] : own;
   }
   // Otherwise (older worlds): ships they pilot, or that their players own.
   const players = game.users.filter((u) => !u.isGM && actor.testUserPermission(u, "OWNER"));
   return game.actors.filter((a) => a.type === "ship" && (a.system.pilot === actor.uuid || players.some((u) => a.testUserPermission(u, "OWNER")) || (game.user.isGM && !players.length)));
}

/**
 * The Between Adventures dialog for a character: choose the ship and the activity, roll, pay out.
 *
 * @param {Actor} actor  A character.
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function betweenAdventures(actor) {
   // An addict deals with the habit first (Core Rules p.253).
   const habit = await addictionPhase(actor);
   if (!habit.proceed) return null;
   const ships = shipsFor(actor);
   if (!ships.length) return void ui.notifications.warn(L("EDRPG.between.noShips", { name: actor.name }));
   const sb = (k) => actor.system.skillBonus?.(k) ?? 0;
   const bonus = { trading: sb("trading"), planetaryKnowledge: sb("planetaryKnowledge"), navigation: sb("navigation"), shipPiloting: sb("shipPiloting"), shipWeapons: sb("shipWeapons") };
   const rank = actor.system.rank?.key;
   const guide = INCOME_GUIDE[rank];
   const crew = crewOf(actor);
   const wages = crew.reduce((n, c) => n + (c.getFlag("edrpg", "crew")?.salary ?? 0), 0);

   const activities = ["trading", "mining", "exploration", "bounty"];
   const shipOptions = ships.map((s) => `<option value="${s.id}">${esc(s.name)}${s.system.model && s.system.model !== s.name ? ` (${esc(s.system.model)})` : ""}</option>`).join("");
   const row = (label, field, hint = "", cls = "") => `<div class="form-group ${cls}"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const riskOptions = Object.entries(BOUNTY).map(([k, r]) => `<option value="${k}">${L(`EDRPG.between.risk.${k}`)} (${L("EDRPG.between.riskInfo", { points: r.points, risk: r.risk })})</option>`).join("");
   const content = `
      <p class="hint">${L("EDRPG.between.intro")}${guide ? ` ${L("EDRPG.between.guide", { rank: L(ranks.find((r) => r.key === rank)?.name ?? ""), amount: cr(guide) })}` : ""}</p>
      ${row(L("EDRPG.between.ship"), `<select name="ship">${shipOptions}</select>`)}
      ${row(L("EDRPG.between.activity"), `<select name="activity">${activities.map((a) => `<option value="${a}">${L(`EDRPG.between.activityName.${a}`)}</option>`).join("")}</select>`)}
      <div class="ed-between-info"></div>
      ${row(L("EDRPG.between.riskLabel"), `<select name="risk">${riskOptions}</select>`, L("EDRPG.between.riskHint"), "bounty-only")}
      ${row(L("EDRPG.between.srv"), `<input type="checkbox" name="srv" checked>`, L("EDRPG.between.srvHint"), "exploration-only")}
      ${row(L("EDRPG.between.employee"), `<input type="checkbox" name="employee">`, L("EDRPG.between.employeeHint"), "not-bounty")}
      ${row(L("EDRPG.between.pay"), `<input type="checkbox" name="pay" checked>`, wages ? L("EDRPG.between.payWages", { wages: cr(wages), count: crew.length }) : "")}
   `;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.between.title", { name: actor.name }), icon: "fa-solid fa-coins" },
      classes: ["edrpg", "edrpg-dialog", "edrpg-between"],
      position: { width: 460 },
      content,
      ok: { label: "EDRPG.between.roll", icon: "fa-solid fa-dice-d10" },
      render: (_event, dialog) => {
         const root = dialog.element ?? dialog;
         const info = root.querySelector(".ed-between-info");
         const sync = () => {
            const ship = ships.find((s) => s.id === root.querySelector("[name=ship]").value);
            const activity = root.querySelector("[name=activity]").value;
            const p = shipProfile(ship);
            const blocked = activityBlocked(p, activity);
            for (const el of root.querySelectorAll(".bounty-only")) el.hidden = activity !== "bounty";
            for (const el of root.querySelectorAll(".exploration-only")) el.hidden = activity !== "exploration" || !p.srvHangar;
            for (const el of root.querySelectorAll(".not-bounty")) el.hidden = activity === "bounty";
            for (const opt of root.querySelectorAll("[name=risk] option")) opt.disabled = BOUNTY[opt.value].points > p.weaponPoints;
            const shortCrew = ["medium", "large", "huge"].includes(p.size) && p.crewSize > 1;
            // Crew signed on for this ship (the employer flies it, so one fewer is needed).
            const aboard = crewOf(actor, ship).length;
            info.innerHTML = `<p class="${blocked ? "ed-between-warn" : "hint"}">${blocked ?? summary(p, activity, bonus)}</p>${shortCrew ? `<p class="hint">${L("EDRPG.between.crewNote", { crew: p.crewSize, aboard })}</p>` : ""}`;
            root.querySelector("button[data-action=ok]")?.toggleAttribute("disabled", !!blocked);
            dialog.setPosition?.({ height: "auto" });
         };
         root.querySelector("[name=ship]").addEventListener("change", sync);
         root.querySelector("[name=activity]").addEventListener("change", sync);
         sync();
      },
      rejectClose: false,
   });
   if (!input) return null;
   const ship = ships.find((s) => s.id === input.ship);
   const p = shipProfile(ship);
   const activity = input.activity;
   if (activityBlocked(p, activity)) return null;
   const risk = activity === "bounty" ? (BOUNTY[input.risk].points <= p.weaponPoints ? input.risk : "low") : null;
   const employee = !!input.employee && activity !== "bounty";

   const rolls = [];
   const d = async (f) => {
      const r = await new Roll(f).evaluate();
      rolls.push(r);
      return r;
   };
   const notes = [];
   let lost = false;
   if (employee) {
      const rr = await d("1d10");
      lost = rr.total >= EMPLOYEE_RISK[activity];
      notes.push(L(lost ? "EDRPG.between.employeeLost" : "EDRPG.between.employeeSafe", { roll: rr.total, risk: EMPLOYEE_RISK[activity], ship: esc(ship.name) }));
   }
   const table = await d("1d100");
   let checks = [];
   if (activity === "bounty") {
      const a = await d(`1d10 + ${bonus.shipPiloting}`);
      const b = await d(`1d10 + ${bonus.shipWeapons}`);
      checks = [{ natural: a.dice[0].total, total: a.total }, { natural: b.dice[0].total, total: b.total }];
   }
   let result = lost ? { income: 0, lines: [], outcome: "lost" } : workOut({ activity, profile: p, bonus, d100: table.total, risk, checks, srv: !!input.srv });
   // Both bounty checks failed: pay for repairs, or write the ship off.
   if (result.outcome === "repairs") {
      const writeOff = await foundry.applications.api.DialogV2.confirm({
         window: { title: L("EDRPG.between.repairsTitle") },
         content: `<p>${L("EDRPG.between.repairsAsk", { ship: esc(ship.name), cost: cr(result.repairs) })}</p>`,
         yes: { label: "EDRPG.between.writeOff" },
         no: { label: "EDRPG.between.payRepairs" },
         rejectClose: false,
      });
      if (writeOff) result = { ...result, income: 0, outcome: "writtenOff", lines: [...result.lines, L("EDRPG.between.line.writtenOff", { ship: esc(ship.name) })] };
   }
   if (result.outcome === "destroyed") result.lines.push(L("EDRPG.between.line.destroyed", { ship: esc(ship.name) }));
   if (result.outcome === "nothing") result.lines.push(L("EDRPG.between.line.nothing"));

   // Pay out (and pay the crew).
   const total = result.income - (input.pay ? wages : 0);
   if (input.pay) {
      const before = actor.system.cash?.cr ?? 0;
      await actor.update({ "system.cash.cr": Math.max(0, before + total) });
      if (before + total < 0) notes.push(L("EDRPG.between.shortfall", { amount: cr(-(before + total)) }));
   }
   if (wages) notes.push(L("EDRPG.between.wagesLine", { wages: cr(wages), count: crew.length }));
   const content2 = `<div class="edrpg edrpg-chat edrpg-between-card">
      <h3><i class="fa-solid fa-coins"></i> ${L(`EDRPG.between.activityName.${activity}`)}${risk ? ` — ${L(`EDRPG.between.risk.${risk}`)}` : ""}</h3>
      <p class="muted">${esc(actor.name)} · ${esc(ship.name)}${employee ? ` · ${L("EDRPG.between.byEmployee")}` : ""}</p>
      ${result.lines.map((l) => `<p>${l}</p>`).join("")}
      ${notes.map((l) => `<p>${l}</p>`).join("")}
      <div class="outcome ${result.income > 0 ? "success" : result.income < 0 || ["destroyed", "lost", "writtenOff"].includes(result.outcome) ? "failure" : ""}">${
         result.income > 0 ? L("EDRPG.between.earned", { amount: cr(result.income) }) : result.income < 0 ? L("EDRPG.between.cost", { amount: cr(-result.income) }) : L(`EDRPG.between.outcome.${result.outcome}`)
      }</div>
      ${input.pay ? `<p class="hint">${L("EDRPG.between.paid", { name: esc(actor.name), total: (total >= 0 ? "+" : "−") + cr(Math.abs(total)) })}</p>` : ""}
   </div>`;
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: content2, rolls, sound: game.dice3d ? null : CONFIG.sounds.dice });
}

/** The dialog's line about what the ship would bring to an activity. */
function summary(p, activity, bonus) {
   if (activity === "trading") return L("EDRPG.between.sum.trading", { cargo: p.cargo, bonus: bonus.trading });
   if (activity === "mining") return L("EDRPG.between.sum.mining", { mining: p.miningBonus, cargo: p.cargo, bonus: bonus.planetaryKnowledge });
   if (activity === "exploration") {
      const ev = explorationValue(p, bonus.navigation);
      return L("EDRPG.between.sum.exploration", { value: ev.value, yield: cr(discoveryYield(ev.value)) });
   }
   return L("EDRPG.between.sum.bounty", { points: p.weaponPoints, pilot: bonus.shipPiloting, guns: bonus.shipWeapons, kws: p.killWarrant });
}

/* -------------------------------------------- */
/*  Rare Item Availability                      */
/* -------------------------------------------- */

/** Which table each rank rolls on: highest D100 for Low, then Medium (rest High). */
export const RARE_AVAILABILITY = {
   harmless: [100, 100],
   mostlyHarmless: [100, 100],
   novice: [99, 100],
   competent: [87, 100],
   expert: [72, 100],
   master: [55, 99],
   dangerous: [40, 88],
   deadly: [27, 76],
   elite: [15, 60],
};

/** [highest D100, item, cost (cr), "each" with 1D10 available]. */
export const RARE_ITEMS = {
   low: [
      [3, "Concussion Grenade", 100, true], [6, "Genome Inc Anti-grav Hairspray (Cosmetics)", 500, true], [9, "Karetii Manscara (Cosmetics)", 2200], [12, "Medpack (Advanced Kit)", 4000],
      [15, "Altarian Skin (Cosmetics)", 5000], [18, "Combat Stim: Paranoia Plus (1D10 doses)", 5000], [21, "Smart Business Suit (Clothing)", 10000], [24, "Combat Stim: Brutal Plus (1D10 doses)", 10000],
      [27, "NG75 Autopistol", 42000], [30, "Hyperion Laser Pistol", 47000], [33, "MLR40 Infantry Rifle (Laser Rifle)", 49000], [36, "Micronite Doublelip Sentinel (Autopistol)", 50000],
      [39, "C&G 45 AutoRifle (Assault Rifle)", 50000], [42, "Nanofibre Sword", 53000], [45, "Federal Special Forces Medicator (Combat Stim Injector)", 56000], [48, "Dahan Gold No. 5 (Cosmetics)", 60000],
      [51, "Ingram Wide-Beam Carbine (Assault Beamer)", 62000], [54, "Gold & Perry 'Watcher' Autopistol", 65000], [57, "Ergon Tommygun (Sub Machinegun)", 74000], [60, "Exalt Widescatter Shotgun", 78000],
      [63, "Cubeo Liquid Dress (Clothing)", 80000], [66, "Medpack, Professional", 90000], [69, "Acane Model S Bazooka (Missile Launcher)", 97000], [72, "Evex Longbarrel Laser Pistol", 98000],
      [74, "GalSpec 109 Sniper Rifle (Assault Rifle)", 101000], [76, "Sothis Permanent Lip Gloss (Cosmetics)", 120000], [78, "Wrist Com, Drone Remote", 145000], [80, "K33 Multifire SMG", 175500],
      [82, "Class 2 Toxin Injector (Cybernetics)", 189000], [84, "Micro-Shotgun", 190000], [86, "Cauldus Nerve-blocker Laser Pistol", 196000], [88, "BD90 Warhammer (Shotgun)", 209000],
      [90, "GTN 195 Autopistol", 225000], [92, "CS1 Burst Pistol (Laser Pistol)", 244000], [94, "Kopernicus Incinerator (Laser Rifle)", 264000], [96, "Class 2 Cyberclaws (Cybernetics)", 300000],
      [98, "Longarm Deadfire SMG", 310000], [100, "LR17 Long Barrel (Laser Rifle)", 327500],
   ],
   medium: [
      [4, "EMP Grenade", 1000, true], [8, "Hand Com, Hacker Model", 300000], [12, "NatureCheat Youthanising Cream (Cosmetics)", 400000], [16, "Imperial 'Stimmer' Autopistol", 400500],
      [20, "Neo-Samurai Sword", 425000], [24, "Original GalCop Flight Suit (Clothing)", 425000], [28, "Arkana 'Nighthawk' (Assault Rifle)", 495000], [32, "Class 2 Retractable Laser Pistol (Cybernetics)", 500000],
      [36, "Imperial Noble Dress Suit (Clothing)", 500000], [40, "Imperial Emergency Support Aid (Combat Stim Injector)", 700000], [44, "ODO 15 Light Anti-Tank Weapon (Missile Launcher)", 816000], [48, "Nadion Twin Barrel Laser Pistol", 863000],
      [52, "Jupiter 'Lockon' Short Barrelled Rifle (Shotgun)", 867000], [55, "Skollanga 'Slammer' SMG", 985000], [58, "Asellus Deflector Pistol (Autopistol)", 1005000], [61, "IntSys JR4 SMG", 1345000],
      [64, "LX10 Energised Autopistol", 1400000], [67, "Vortigen Multi-Scope Energy Rifle (Laser Rifle)", 1450000], [70, "Perun Light Machinegun (Assault Rifle)", 1788000], [73, "Paris Elegante Laser Pistol", 1809000],
      [76, "Class 3 Leg Jets (Cybernetics)", 1890000], [79, "Ergon Burst Rifle (Laser Rifle)", 2100000], [82, "Laifan AB5 Serrator (Assault Beamer)", 2134000], [85, "Type 4 Cybernetic Eyes (Cybernetics)", 2200000],
      [88, "Assault Combat Armour", 2700000], [91, "Corvus Inc Devastation Pistol (Autopistol)", 2900000], [94, "Krakoff Demolisher Rifle (SMG)", 3050000], [97, "Magnetising Hotshot Laser Pistol", 3550000],
      [100, "BN799 Carbine (Assault Rifle)", 3600000],
   ],
   high: [
      [4, "Plasma Grenade", 10000, true], [8, "Type 4 Leg Upgrade (Cybernetics)", 3650000], [12, "Field Combat Armour", 4000000], [16, "Class 3 Retractable Laser Pistol (Cybernetics)", 4000000],
      [20, "Kosha Inc LasRifle (Laser Rifle)", 4225000], [24, "Type 4 Arm Upgrade (Cybernetics)", 4700000], [28, "Delman Autopistol", 5000000], [32, "Lance & Ferman 'Deadeye' Rifle (Laser Rifle)", 5000000],
      [36, "Class 4 Leg Jets (Cybernetics)", 5000000], [40, "Type 5 Cybernetic Eyes (Cybernetics)", 5500000], [44, "Type 4 Replacement Nervous System (Cybernetics)", 6000000], [48, "Type 4 Replacement Internals (Cybernetics)", 6600000],
      [52, "G910 Heavy Repeater (Chain Gun)", 7600000], [55, "GL779 Intellipistol (Laser Pistol)", 8200000], [58, "Type 4 Armoured Carapace (Cybernetics)", 8200000], [61, "Type 5 Leg Upgrade (Cybernetics)", 8750000],
      [64, "Lance & Ferman Gimballed Minigun (Chain Gun)", 9000000], [67, "Type 5 Arm Upgrade (Cybernetics)", 12050000], [70, "Altair JP60 Accelerator (Plasma Accelerator)", 13500000], [73, "Magnotan Searching Beamer (Assault Beamer)", 13599000],
      [76, "Type 5 Replacement Nervous System (Cybernetics)", 17900000], [79, "Type 5 Replacement Internals (Cybernetics)", 18500000], [82, "ZX9000 Auto-Shotgun", 19400000], [85, "XL5 Omega Recoilless Rifle (Missile Launcher)", 23300000],
      [88, "Fairlight Excelsior (Laser Rifle)", 28799000], [91, "Imperial Sabre", 31000000], [94, "Powered Armour", 38000000], [97, "Maitz PP9 Support Cannon (Chain Gun)", 42000000],
      [100, "Type 5 Armoured Carapace (Cybernetics)", 50300000],
   ],
};

/**
 * Roll one rare item for a rank (pure: rolls passed in).
 *
 * @param {string} rank
 *
 * @param {number} tierRoll  D100 for the value table.
 *
 * @param {number} itemRoll  D100 on that table.
 *
 * @returns {{tier: string, name: string, cost: number, each: boolean}}
 */
export function rareItem(rank, tierRoll, itemRoll) {
   const [low, medium] = RARE_AVAILABILITY[rank] ?? RARE_AVAILABILITY.harmless;
   const tier = tierRoll <= low ? "low" : tierRoll <= medium ? "medium" : "high";
   const [, name, cost, each] = RARE_ITEMS[tier].find(([max]) => itemRoll <= max);
   return { tier, name, cost, each: !!each };
}

/** Find an item in the system's compendiums by name (ignoring the bracketed type). */
export async function findItem(name) {
   const base = name.replace(/\s*\(.*\)\s*$/, "").replace(/[‘’]/g, "'").toLowerCase();
   for (const id of ["weapons", "armour", "cybernetics", "clothing", "gear"]) {
      const pack = game.packs.get(`edrpg.${id}`);
      const hit = (await pack?.getIndex())?.find((e) => e.name.replace(/[‘’]/g, "'").toLowerCase() === base);
      if (hit) return `Compendium.edrpg.${id}.Item.${hit._id}`;
   }
   return null;
}

/**
 * One random Rare item for a rank, linked to the compendium where it exists (for treasure finds).
 *
 * @param {string} rank
 *
 * @returns {Promise<{tier: string, name: string, cost: number, each: boolean, uuid: string|null, weapon: boolean, qty: number|null}>}
 */
export async function rollRareItem(rank) {
   const a = await new Roll("1d100").evaluate();
   const b = await new Roll("1d100").evaluate();
   const item = rareItem(rank, a.total, b.total);
   item.qty = item.each ? (await new Roll("1d10").evaluate()).total : null;
   item.uuid = await findItem(item.name);
   // Weapons: in the Weapons compendium, or a bracketed weapon type.
   item.weapon = !!item.uuid?.includes(".weapons.") || /\((?:[^)]*(?:pistol|rifle|gun|shotgun|smg|launcher|beamer|carbine|chain gun|accelerator|cannon))\)/i.test(item.name) || /grenade|sword|sabre|pistol|rifle|shotgun|smg|autopistol|launcher/i.test(item.name);
   return item;
}

/**
 * The GM's Rare Item Availability roll: a few rare items on sale (about one per player), by the party's rank.
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function openRareItems() {
   const counts = {};
   let players = 0;
   for (const a of game.actors ?? []) {
      if (a.type !== "character" || !a.hasPlayerOwner) continue;
      players += 1;
      counts[a.system.rank?.key] = (counts[a.system.rank?.key] ?? 0) + 1;
   }
   const partyRank = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "harmless";
   const rankOptions = ranks.map((r) => `<option value="${r.key}"${r.key === partyRank ? " selected" : ""}>${L(r.name)}</option>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.rare.title"), icon: "fa-solid fa-gem" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<p class="hint">${L("EDRPG.rare.intro")}</p>
         <div class="form-group"><label>${L("EDRPG.rare.rank")}</label><div class="form-fields"><select name="rank">${rankOptions}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.rare.count")}</label><div class="form-fields"><input type="number" name="count" value="${Math.max(1, players || 3)}" min="1" max="10" step="1"></div><p class="hint">${L("EDRPG.rare.countHint")}</p></div>
         <div class="form-group"><label>${L("EDRPG.mission.whisper")}</label><div class="form-fields"><input type="checkbox" name="whisper"></div></div>`,
      ok: { label: "EDRPG.rare.roll", icon: "fa-solid fa-dice-d10" },
      rejectClose: false,
   });
   if (!input) return null;
   const rolls = [];
   const items = [];
   for (let k = 0; k < Math.clamp(Number(input.count) || 1, 1, 10); k++) {
      const a = await new Roll("1d100").evaluate();
      const b = await new Roll("1d100").evaluate();
      rolls.push(a, b);
      const item = rareItem(input.rank, a.total, b.total);
      if (item.each) {
         const q = await new Roll("1d10").evaluate();
         rolls.push(q);
         item.qty = q.total;
      }
      item.uuid = await findItem(item.name);
      items.push(item);
   }
   const rankName = L(ranks.find((r) => r.key === input.rank)?.name ?? "");
   const content = `<div class="edrpg edrpg-chat edrpg-rare">
      <h3><i class="fa-solid fa-gem"></i> ${L("EDRPG.rare.cardTitle", { rank: esc(rankName) })}</h3>
      <ul>${items
         .map((i) => `<li><span class="ed-rare-tier ${i.tier}">${L(`EDRPG.rare.tier.${i.tier}`)}</span> ${i.uuid ? `@UUID[${i.uuid}]{${esc(i.name)}}` : esc(i.name)}${i.qty ? ` ×${i.qty}` : ""} — <b>${cr(i.cost)}</b>${i.each ? ` ${L("EDRPG.rare.each")}` : ""}</li>`)
         .join("")}</ul></div>`;
   const data = { speaker: ChatMessage.getSpeaker(), content, rolls, sound: game.dice3d ? null : CONFIG.sounds.dice };
   if (input.whisper) data.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
   return ChatMessage.create(data);
}
