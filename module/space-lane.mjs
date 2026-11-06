/**
 * Space Lane Encounters (Super Traders Supplement pp.44–49) as event cards, and Sneak into Port (p.46).
 *
 * The security rating picks the column; Star Port encounters come last when several are rolled. Each card has the
 * event's checks, fights, interdiction, heist rules and its own D10 sub-table where it has one.
 */
import { EVENT_TABLES, OPPONENT_TABLES } from "./generation-data.mjs";
import { HEIST_LIMPETS } from "./supplement-data.mjs";
import { MISSION_REWARDS } from "./mission-data.mjs";
import { registerKind, postEvent, damageHtml, fightHtml, d } from "./event-cards.mjs";
import { toolLink, opponentFor, opponentUuid, partyInfo } from "./encounters.mjs";
import { rowFor, link, partyActors } from "./planet.mjs";
import { checkDn } from "./infiltration.mjs";
import { skillLabel } from "./dice/skill-check.mjs";
import { rollRareItem } from "./between-adventures.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cr = (n) => `${Number(n).toLocaleString()}cr`;

const heistNote = () => {
   const row = (k) => { const [c, acc, ov, n] = HEIST_LIMPETS[k]; return `${L(`EDRPG.base.size.${k}`)} ${c} (+${acc}, Override ${ov}, ${n}/turn)`; };
   return L("EDRPG.lane.heistNote", { small: row("small"), medium: row("medium"), large: row("large") });
};
const interdict = (attacker) => toolLink("interdict", { attacker }, "EDRPG.lane.interdict", "fa-solid fa-magnet");
const sneak = () => toolLink("sneak", {}, "EDRPG.lane.sneak", "fa-solid fa-user-secret");
const market = () => toolLink("market", {}, "EDRPG.lane.market", "fa-solid fa-scale-balanced");
const person = (name) => toolLink("person", { name }, name, "fa-solid fa-user");
const cargoRoll = (column = 0) => {
   const roll = d(100);
   return { roll, name: rowFor("randomCargo", column, roll)?.name ?? "—" };
};
const pirates = (difficulty) => ({
   text: `An ${difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : "Hard"} Criminal group tries to interdict the group, then performs a Heist.`,
   fights: [["criminal", "spaceship", difficulty]],
   tools: [() => interdict("Pirates")],
   note: heistNote,
});

export const SPACE_LANE_EVENTS = {
   "A Better Offer": { tag: "mission", actions: ["betterOffer"], text: "A rival offers better pay to fail the current mission on purpose: paid as if a rank higher and the mission were done. If they accept, roll a D10: even, the old employer sends Bounty Hunters." },
   "Abandoned Ship": { auto: ["derelict"], actions: ["board"], text: "A powerless ship drifts in deep space. Board it and roll a D10 for what's inside. A salvaged ship needs a pilot (crew, or a player leaving their own ship)." },
   "Agency Assault": { tag: "mission", fights: [["security", "spaceship", "medium"]], tools: [() => interdict("Agency")], text: "An espionage agency wants the mission to fail: a Medium Security group interdicts a ship and tries to destroy as many as it can. If it fails one interdiction it tries one other player before giving up." },
   "Asteroid Base": { actions: ["investigate"], text: "A hidden asteroid base. Bypass it, or investigate and roll a D10." },
   "Attacked near Star Port": { tag: "port", fights: [["criminal", "spaceship", "medium"]], note: heistNote, text: "A Medium Criminal group jumps in as they approach to dock: a Heist, with no interdiction needed. After six rounds the station's Vipers arrive and the pirates flee." },
   "Bounty Hunters": { tag: "missionBounty", fights: [["criminal", "spaceship", "medium", null, { title: "Bounty hunters" }]], tools: [() => interdict("Bounty hunters")], text: "A Medium Criminal group of bounty hunters tries to interdict the players, then to destroy as many ships as it can." },
   "Bull Market": { tag: "port", tools: [market], text: "Excellent conditions: roll on the Advanced Trading Table as if it were the first visit, twice, and take the better." },
   "Cargo Illegal": { random: true, tools: [sneak], text: "A recent scandal makes this player's cargo illegal here: they must Sneak into Port." },
   "Cargo Switch": { random: true, auto: ["switch"], tools: [sneak], text: "A mix-up at the last stop: this player's whole hold is a different cargo. Go back and demand an exchange (Sneak into Port if it's illegal), or keep it." },
   "Cargo Thieves": { tag: "port", random: true, fights: [["criminal", "personal", "easy"]], text: "An Easy Criminal group boards this player's ship; security has been bribed. Surrender the cargo (tied up, unhurt), or fight: every three rounds another player (at random) arrives to help." },
   "Corrupt Cops": { tools: [() => person("Patrol Viper"), () => interdict("Corrupt police")], text: "Four Police Vipers demand 20,000cr from each player (or all they have). Defy them and they try to interdict; escape and they give up. Interdicted: arrested. Resisting means a fight and a bounty; going quietly means jail and a failed mission (released without charge)." },
   "Dangerous Cargo": { random: true, auto: ["animal"], actions: ["lockBridge"], text: "Something is loose in this player's ship, chewing the power cables. Hunt it down, or lock the bridge and roll a D10." },
   "Drifting Salvage": { auto: ["salvage"], actions: ["scoop"], text: "3D10 canisters of cargo drifting in space. Scoop them up and roll a D10." },
   "Frame Shift Drive Failure": { random: true, checks: [{ lv: "average", skills: ["repair"], note: "Others can dock and help." }], text: "This player's FSD gives out and drops them into realspace. Average Repair to fix it. If no one can, a tow to dock costs a tenth of the ship's value and fails any mission." },
   "Gambling Opportunity": { tag: "port", checks: [{ lv: "easy", skills: ["gambling"], note: "Stake back" }, { lv: "average", skills: ["gambling"], note: "×2" }, { lv: "hard", skills: ["gambling"], note: "×3" }], note: (s) => L("EDRPG.lane.stake", { amount: cr(MISSION_REWARDS[s.rank]?.[1] ?? 0) }), text: "After any trades: high-stakes gambling. Stake the Treasure Income for your rank and make a Gambling check: Easy gets the stake back, Average doubles it, Hard triples it; failure loses it." },
   "Market Glut": { tag: "port", tools: [market], text: "Terrible conditions: treat any Advanced Trading roll here as a 1." },
   "Military Checkpoint": { fights: [["military", "spaceship", "medium"]], tools: [() => interdict("Military patrol")], actions: ["scan"], text: "A Medium Military group interdicts the players. Anyone who submits or is pulled out is scanned: roll a D10. Attacked players gain a bounty; with one, they must Sneak into Port or be attacked." },
   "No Event": { text: "Nothing happens." },
   "Pirate Attack – Easy": pirates("easy"),
   "Pirate Attack – Medium": pirates("medium"),
   "Pirate Attack – Hard": pirates("hard"),
   Saboteur: { random: true, tools: [() => person("Saboteur")], fights: [["criminal", "personal", "medium", "Medium group of Saboteurs (large ship)", { only: "Saboteur" }]], text: "Power and life support fail: a Saboteur is aboard this player's ship to steal it. Defeat him (a Medium group of Saboteurs on a large ship); the crew can help." },
   "Ship in danger": { actions: (st) => (st.extra.orphansLeft ? ["orphans"] : ["distress"]), text: "A distress beacon. Investigate and roll a D10." },
   Stowaway: { actions: ["confront"], text: "A stowaway is eating a sandwich in the hold. Jettison them (illegal, but who's to know), or confront them and roll a D10." },
   "Surprise Inspection": { random: true, tools: [() => person("Patrol Viper"), () => interdict("Police inspection")], text: "Five Police Vipers interdict this player. If they escape, everyone does. Otherwise they and anyone dropping out with them are scanned: a bounty or illegal cargo means an attack. Attacking the police earns a bounty." },
   "Tip Off": { tools: [market], text: "A trader sells trading tips for 50,000cr: if paid, roll twice on the Advanced Trading Table here and take the better." },
   "Tricky Docking Manoeuvre": { tag: "port", checks: [{ lv: "easy", skills: ["shipPiloting"], note: "each player" }], tools: [() => damageHtml(0, "", false, true)], text: "Busy space dock: each player makes an Easy Spaceship Piloting check or is crushed between freighters for 1D10×10 Hull." },
   "Unofficial Docking Tax": { tag: "port", actions: ["two"], text: "Corrupt customs demand 80,000cr from each player to unload. Otherwise go to another star port across the system: roll twice more on this table." },
   // Not on the table: the Sneak into Port effect (p.46), for the links above.
   "Sneak into Port": { checks: [{ lv: "easy", skills: ["systems"], note: "small ship" }, { lv: "average", skills: ["systems"], note: "medium ship" }, { lv: "hard", skills: ["systems"], note: "large ship" }], tools: [() => person("Patrol Viper")], text: "Silent Running past security (Core p.268) with a Systems check by ship size. Detected: a fine of twice the illegal cargo's value and the cargo seized (Federation slavers may be arrested). Resisting means six Patrol Vipers, and firing on police brings a bounty (Core p.323)." },
};

/** D10 sub-tables for the actions. */
const SUB = {
   board: [[3, "board1"], [6, "board2"], [9, "board3"], [10, "board4"]],
   investigate: [[3, "base1"], [6, "base2"], [8, "base3"], [10, "base4"]],
   lockBridge: [[5, "bridge1"], [9, "bridge2"], [10, "bridge3"]],
   scoop: [[8, "scoop1"], [9, "scoop2"], [10, "scoop3"]],
   scan: [[3, "scan1"], [6, "scan2"], [10, "scan3"]],
   distress: [[3, "distress1"], [6, "distress2"], [8, "distress3"], [10, "distress4"]],
   confront: [[3, "stow1"], [7, "stow2"], [10, "stow3"]],
};
const sub = (key) => {
   const roll = d(10);
   return { roll, out: SUB[key].find(([m]) => roll <= m)[1] };
};

const ACTIONS = {
   async betterOffer(s) {
      const roll = d(10);
      s.log.push(L(roll % 2 ? "EDRPG.lane.r.offerSafe" : "EDRPG.lane.r.offerHunted", { roll }) + (roll % 2 ? "" : ` ${fightHtml(["criminal", "spaceship", "medium", "Bounty hunters"])}`));
      s.done = true;
   },
   async board(s) {
      const { roll, out } = sub("board");
      let line = L(`EDRPG.lane.r.${out}`, { roll });
      if (out === "board1") line += ` ${checkLine("hard", "repair")}`;
      if (out === "board2") line += ` ${L("EDRPG.lane.cargoLine", cargoRoll())}`;
      if (out === "board3") line += ` ${["easy", "medium", "hard"].map((df) => fightHtml(["criminal", "personal", df])).join(" ")}`;
      if (out === "board4") {
         const r = d(10);
         const what = r <= 3 ? ["Gorillalion", 1] : r <= 6 ? ["Kai", 2] : ["Mortis Claw", 1];
         line += ` ${L("EDRPG.lane.r.creature", { roll: r, n: what[1], name: link({ name: what[0], uuid: await opponentUuid(what[0]) }) })}`;
      }
      s.log.push(line);
      s.done = true;
   },
   async investigate(s) {
      const { roll, out } = sub("investigate");
      let line = L(`EDRPG.lane.r.${out}`, { roll });
      if (out === "base1") line += ` ${checkLine("average", "repair")} ${partyActors().map((a) => `${esc(a.name)}: ${esc(cargoRoll(2).name)}`).join(", ")}`;
      if (out === "base2") line += ` ${market()}`;
      if (out === "base3") {
         const rare = await rollRareItem(s.rank);
         line += ` ${fightHtml(["criminal", "personal", "medium"])} ${partyActors().map((a) => `${esc(a.name)}: ${d(10) + d(10) + d(10)} × ${esc(cargoRoll(1).name)}`).join(", ")}. ${L("EDRPG.planet.rareItem", { item: link(rare), cost: cr(rare.cost) })}`;
      }
      s.log.push(line);
      s.done = true;
   },
   async lockBridge(s) {
      const { roll, out } = sub("lockBridge");
      s.log.push(L(`EDRPG.lane.r.${out}`, { roll }) + (out === "bridge2" ? ` ${checkLine("easy", "repair")}` : ""));
      s.done = true;
   },
   async scoop(s) {
      const { roll, out } = sub("scoop");
      let line = L(`EDRPG.lane.r.${out}`, { roll });
      if (out === "scoop2") line += ` ${fightHtml(["criminal", "spaceship", "medium"])}`;
      if (out === "scoop3") line += ` ${toolLink("lane", { event: "Dangerous Cargo" }, "Dangerous Cargo", "fa-solid fa-spider")}`;
      s.log.push(line);
      s.done = true;
   },
   async scan(s) {
      const { roll, out } = sub("scan");
      s.log.push(L(`EDRPG.lane.r.${out}`, { roll }));
      s.done = true;
   },
   async distress(s) {
      const { roll, out } = sub("distress");
      let line = L(`EDRPG.lane.r.${out}`, { roll });
      if (out === "distress1") line += ` ${checkLine("average", "repair")}`;
      if (out === "distress2") line += ` ${person("Armoured Transport")} ${fightHtml(["criminal", "spaceship", "hard"])}`;
      if (out === "distress4") line += ` ${fightHtml(["criminal", "spaceship", "medium"])}`;
      s.log.push(line);
      if (out === "distress3") {
         s.extra.orphans = 0;
         s.extra.orphansLeft = 100;
      } else s.done = true;
   },
   /** The burning Type-7: each click, one ship unloads D10 orphans, then D10: 10 it explodes. */
   async orphans(s) {
      if (!s.extra.orphansLeft) return false;
      const n = Math.min(d(10), s.extra.orphansLeft);
      s.extra.orphans += n;
      s.extra.orphansLeft -= n;
      const boom = d(10);
      s.log.push(L(boom === 10 ? "EDRPG.lane.r.boom" : "EDRPG.lane.r.unloaded", { n, total: s.extra.orphans, boom }));
      if (boom === 10 || !s.extra.orphansLeft) {
         s.log.push(L(s.extra.orphans >= 100 ? "EDRPG.lane.r.allSaved" : s.extra.orphans ? "EDRPG.lane.r.someSaved" : "EDRPG.lane.r.noneSaved"));
         s.extra.orphansLeft = 0;
         s.done = true;
      }
   },
   async confront(s) {
      const { roll, out } = sub("confront");
      s.log.push(L(`EDRPG.lane.r.${out}`, { roll }) + (out === "stow2" ? ` ${person("Stowaway")}` : ""));
      s.done = true;
   },
   async two(s) {
      await rollSpaceLane({ column: s.extra.column ?? 1, count: 2 });
      s.done = true;
   },
};

/** A check line for a sub-result. */
function checkLine(lv, skill) {
   const { dn } = checkDn(lv, partyInfo().rank);
   return `<a class="ed-pe-check" data-skill="${skill}" data-dn="${dn}" data-actor=""><i class="fa-solid fa-dice-d10"></i> ${esc(L(`EDRPG.infil.level.${lv}`))} ${esc(skillLabel(skill))} (${dn})</a>`;
}

const AUTOS = {
   async derelict(s) {
      const r = opponentFor(OPPONENT_TABLES.criminal.spaceship, s.tier, d(100));
      return L("EDRPG.lane.derelict", { ship: r ? link(r) : "—" });
   },
   async switch() {
      return L("EDRPG.lane.cargoLine", cargoRoll());
   },
   async animal(s) {
      const r = opponentFor(OPPONENT_TABLES.alienAnimals.personal, s.tier, d(100));
      return L("EDRPG.lane.animal", { animal: r ? link(r) : "Stump" });
   },
   async salvage() {
      const n = d(10) + d(10) + d(10);
      const c = cargoRoll();
      return L("EDRPG.lane.salvage", { n, cargo: esc(c.name), roll: c.roll });
   },
};

registerKind("lane", { events: SPACE_LANE_EVENTS, actions: ACTIONS, autos: AUTOS, icon: "fa-solid fa-route" });

/** Star Port encounters (they come last). */
const isPort = (name) => SPACE_LANE_EVENTS[name]?.tag === "port";

/**
 * Roll Space Lane encounters and post their cards.
 *
 * @param {object} o  { column: 0 High | 1 Average | 2 Low, count, place, event }
 */
export async function rollSpaceLane({ column = 1, count = 1, place = "", event = null } = {}) {
   const t = EVENT_TABLES.spaceLane;
   const label = t.columns[column] ?? "";
   if (event) return postEvent("lane", event, { place, columnLabel: label, page: 46, extra: { column } });
   const top = 100;
   const rolled = [];
   for (let i = 0; i < count; i++) {
      const roll = d(top);
      const row = rowFor("spaceLane", column, roll);
      if (row) rolled.push({ roll, row });
   }
   rolled.sort((a, b) => Number(isPort(a.row.name)) - Number(isPort(b.row.name)));
   for (const { roll, row } of rolled) await postEvent("lane", row.name, { roll, page: row.page, place, columnLabel: label, extra: { column } });
}

/** The security column for a star system's government (high 0, average 1, low 2). */
export const securityColumn = (security) => ({ high: 0, average: 1, low: 2 })[security] ?? 1;
