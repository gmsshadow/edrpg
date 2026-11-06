/**
 * Planet exploration (Exploration Supplement pp.43–46, 38).
 *
 * - Which column: Earth-like and Water worlds use the Life-bearing column; other solid planets and moons the Lifeless
 *   one (Stellar Cartography notes, p.47). Gas giants, belts and stars can't be landed on.
 * - Survey mode (Stellar Cartography 5–8): only every fourth lifeless world explored has an encounter.
 * - Each result is a card with its mechanics: the checks (at the Relative Difficulty Number for the party's rank), the
 *   damage, the groups to fight, and step-by-step play for the Alien Ruins traps and the Relic AI Base. Alien Items,
 *   Rare items, the crashed ship and its cargo are rolled and linked to the compendiums.
 */
import { EVENT_TABLES, OPPONENT_TABLES } from "./generation-data.mjs";
import { MISSION_REWARDS } from "./mission-data.mjs";
import { BODY_TYPES } from "./starsystem.mjs";
import { partyInfo, toolLink, opponentFor } from "./encounters.mjs";
import { checkDn } from "./infiltration.mjs";
import { rollRareItem } from "./between-adventures.mjs";
import { skillLabel } from "./dice/skill-check.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const d = (n, rng = Math.random) => 1 + Math.floor(rng() * n);
const cr = (n) => `${Number(n).toLocaleString()}cr`;

/* -------------------------------------------- */
/*  Which column                                */
/* -------------------------------------------- */

/** Bodies that use the Life-bearing column. */
const LIFE = ["earthLike", "water"];

/**
 * Can a body (or moon type) be explored, and on which column?
 *
 * @param {string} type  A body or moon type.
 *
 * @returns {0|1|null}  0 Life-bearing, 1 Lifeless, null not landable.
 */
export function columnFor(type) {
   if (LIFE.includes(type)) return 0;
   const t = BODY_TYPES[type];
   return t?.solid ? 1 : null;
}

/* -------------------------------------------- */
/*  Events                                      */
/* -------------------------------------------- */

/**
 * The events. checks: [level, skills…]; fight: [faction, difficulty]; damage: amounts the card offers to apply;
 * random: a random player is affected; auto: rolled when the card is made; actions: GM buttons.
 */
export const PLANET_EVENTS = {
   "Alien Animal Attack – Easy": { fight: ["alienAnimals", "easy"], text: "Hungry alien animals bound towards the players." },
   "Alien Animal Attack – Medium": { fight: ["alienAnimals", "medium"], text: "A co-ordinated attack from the undergrowth." },
   "Alien Animal Attack – Hard": { fight: ["alienAnimals", "hard"], text: "A great wave of animals; they retreat once half their number are killed." },
   "Alien Obelisk": { poi: true, checks: [["hard", "science"]], actions: ["alienItem"], text: "A Hard Science check decodes the symbols and opens it: one random Alien Item inside." },
   "Alien Ruins": { poi: true, actions: ["trap"], text: "Traps first: a random player rolls a D10 each time until someone gets 9–10. 1–3 the wall collapses (30 Damage unless Average Dodge); 4–6 an energy wave (10 Damage to everyone); 7–8 a yellow beam (40 Damage and armour destroyed unless Hard Dodge). Then two Alien Items and treasure worth the mission's Treasure Income." },
   "Alien Ship": { poi: true, auto: ["alienItem"], text: "A small eight-sided ship; one compartment can be reached, holding an alien device." },
   "Alien Spawning Ground": { poi: true, auto: ["animal"], checks: [["hard", "intimidate"]], actions: ["spawnGroup"], text: "Dozens of one kind of Alien Animal around a pool, and four tons of gold canisters in the crater. A Hard Intimidation check (loud weapon fire) scares them off; on a failure a Hard group of them attacks. The gold needs vehicles nearby." },
   "Crashed Ship": { poi: true, auto: ["crashedShip", "cargo"], checks: [["hard", "repair"]], text: "Eight tons of cargo aboard. To fly it: at least three players pass three Hard Repair checks between them; it's then flyable at half Hull, with D10 damage to every component." },
   Lost: { checks: [["easy", "survival", "navigation"]], actions: ["two"], text: "An Easy Survival or Navigation check; on a failure, two more Planet Encounters before this world counts as explored." },
   "No Event": { text: "Nothing out of the ordinary." },
   "Pirate Attack – Medium": { fight: ["criminal", "medium"], checks: [["average", "survival"]], actions: ["outpost"], text: "A Medium Criminal group. Afterwards an Average Survival check tracks them home: the next encounter is their Pirate Outpost." },
   "Pirate Outpost": { poi: true, checks: [["average", "stealth"]], fight: ["criminal", "hard"], actions: ["rare"], treasure: true, text: "A hangar and a side building, held by a Hard Criminal group. An Average Stealth check gets the drop on them; on a failure they fire as the players come in. Whoever has surprise gets a free round against foes who can't Dodge. Victory: the mission's Treasure Income in money and gear, and a random Rare item." },
   Quicksand: { random: true, checks: [["easy", "athletics"], ["average", "survival"]], text: "With rope or a Mag Grapple, an Easy Athletics check pulls them out. Without, someone searches for a vine or stick: an Average Survival check, up to three tries, or they sink forever." },
   "Razor-crystal Stalagmites": { checks: [["average", "vehiclePiloting"], ["average", "survival"], ["average", "medicine"]], damage: [10], text: "In vehicles: Average Vehicle Piloting or 20 Hull. On foot: Average Survival or 10 Damage and lamed (can't walk unaided until another player passes an Average Medicine check)." },
   "Reactive Elemental Crust": { random: true, checks: [["average", "systems"], ["average", "vehiclePiloting"]], text: "On foot it's safe without heat (no laser fire at the ground). A random player makes an Average Systems check; on a failure the ground explodes under their vehicle: 50 Damage (shields absorb), then Average Vehicle Piloting to land or another 50, repeating until they pass or the vehicle is destroyed." },
   "Relic AI Base": { poi: true, checks: [["easy", "athletics"]], damage: [5], actions: ["relic"], text: "Going in: Easy Athletics or 5 Damage on the uneven floor. Then go deeper, one discovery at a time; they may leave after any. A repeated discovery is the storeroom instead (treasure and a Rare item), and then there's nothing more." },
   Sinkholes: { checks: [["average", "vehiclePiloting"], ["easy", "vehiclePiloting"]], text: "Vehicles: Average Vehicle Piloting (Easy in an SRV), or it's jammed in a crevice and abandoned. Those on foot ignore it." },
   "Sudden Drop": { random: true, checks: [["easy", "athletics"], ["average", "vehiclePiloting"]], damage: [20], text: "On foot: Easy Athletics or fall for 20 Damage. Driving: Average Vehicle Piloting or over the cliff (eject first)." },
   "Sudden Illness": { random: true, checks: [["average", "medicine"]], damage: [5], text: "They lose 5 Endurance per turn until treated: each turn one player tries an Average Medicine check (a failure costs another 5)." },
   "Treacherous Terrain": { checks: [["average", "survival"]], damage: [10], text: "No vehicles past here (collect them later). One at a time, Average Survival: each failure is 10 Damage and the next player tries, until someone finds a route." },
   "Tribal Village": { poi: true, checks: [["easy", "diplomacy"], ["average", "bargain"]], fight: ["tribals", "hard"], actions: ["village"], text: "Easy Diplomacy to be let in. Average Bargain to trade: they want weapons. A failure offends their champion: a duel to the death with Melee or Fighting only, against a Tribal of the player's rank. Interference or guns bring a Hard Tribal group." },
   "Tribals Attack – Easy": { fight: ["tribals", "easy"], checks: [["hard", "perception"]], text: "They want the players' weapons. They get a free round unless someone passes a Hard Perception check." },
   "Tribals Attack – Medium": { fight: ["tribals", "medium"], checks: [["average", "perception"]], text: "Resentful of outsiders. A free round unless someone passes an Average Perception check." },
   "Tribals Attack – Hard": { fight: ["tribals", "hard"], checks: [["easy", "perception"]], text: "They take the players for a war party. A free round unless someone passes an Easy Perception check." },
};

/** Relic AI Base discoveries (D10, no repeats). */
export const RELIC_EVENTS = [
   null,
   { text: "A tunnel of blades: leave, or Average Athletics to duck through (15 Melee Damage on a failure).", checks: [["average", "athletics"]], damage: [15] },
   { text: "The coms start to explode. Hand coms: Easy Grenade to throw clear, or 10 Explosive Damage. Wrist coms: Hard Computer, or the arm is blown off (down to −5 Endurance and bleeding).", checks: [["easy", "grenade"], ["hard", "computer"]], damage: [10] },
   { text: "An Easy Relic AI group lurches out of the dark.", fight: ["relicAI", "easy"] },
   { text: "Hypnotic screens: everyone passes Easy Tactics or Perception or attacks their friends, retrying at the end of each of their turns until they shake it off.", checks: [["easy", "tactics", "perception"]] },
   { text: "A relic room: a random Alien Item on a plinth, free to take.", auto: ["alienItem"] },
   { text: "The floor drops into magma: Easy Athletics to grab the walls (or burn). Metal limbs pull at them: attack one (point blank, no Dodge; roll 2D10, less than your Damage and it retreats, otherwise you're thrown in) or hold on with Average Athletics (or be plucked off and killed). After one turn the floor seals.", checks: [["easy", "athletics"], ["average", "athletics"]] },
   { text: "The junk comes alive: a Hard Relic AI group.", fight: ["relicAI", "hard"] },
   { text: "Dead explorers preserved in tanks; one holds a Rare item. Taking it gives −1 to all attacks against the Relic AI, unless they leave now.", auto: ["rare"] },
   { text: "Lost in twisting tunnels: each player makes an Average Navigation check, or dies when their oxygen runs out.", checks: [["average", "navigation"]] },
   { text: "The central processors: a Medium Relic AI group among six columns (no Dodge, 50 Damage each). Topple all six and the base tears itself apart: just time to escape.", fight: ["relicAI", "medium"] },
];

/* -------------------------------------------- */
/*  Rolls                                       */
/* -------------------------------------------- */

/** The party's characters (for random players and team damage). */
export function partyActors() {
   return (game.actors ?? []).filter((a) => a.type === "character" && a.hasPlayerOwner);
}

/** One row of an event table by roll. */
export function rowFor(key, column, roll) {
   return EVENT_TABLES[key].rows.find((r) => r.ranges[column] && roll >= r.ranges[column][0] && roll <= r.ranges[column][1]) ?? null;
}

/**
 * A random Alien Item (p.38), linked.
 *
 * @returns {Promise<{name: string, uuid: string|null, roll: number, note: string}>}
 */
export async function rollAlienItem() {
   const roll = d(100);
   const row = rowFor("alienItems", 0, roll);
   let name = row.name;
   let note = "";
   const m = name.match(/^(1D10|\d+) Alien Power Cells? \((\w+)\)/i);
   if (m) {
      const n = m[1].toUpperCase() === "1D10" ? d(10) : Number(m[1]);
      note = `×${n}`;
      name = `Alien Power Cell (${m[2]})`;
   } else note = L("EDRPG.planet.withCell");
   return { name, roll, note, uuid: await findByName(name) };
}

/** An item or actor in the system's compendiums by name. */
export async function findByName(name) {
   for (const id of ["weapons", "gear", "armour", "cybernetics", "clothing", "ships", "opponents"]) {
      const pack = game.packs.get(`edrpg.${id}`);
      const hit = (await pack?.getIndex())?.find((e) => e.name === name);
      if (hit) return `Compendium.edrpg.${id}.${pack.documentName}.${hit._id}`;
   }
   return null;
}

export const link = (x) => (x.uuid ? `@UUID[${x.uuid}]{${esc(x.name)}}` : esc(x.name));

/** One check as a roll link (for anyone: rolls for their token or character, or the named player). */
export function checkLinks([level, ...skills], rank, actorUuid = "") {
   const { dn } = checkDn(level, rank);
   return `${L(`EDRPG.infil.level.${level}`)} (${dn}): ${skills
      .map((s) => `<a class="ed-pe-check" data-skill="${s}" data-dn="${dn}" data-actor="${actorUuid}"><i class="fa-solid fa-dice-d10"></i> ${esc(skillLabel(s))}</a>`)
      .join(" ")}`;
}

/** Damage links (GM): to the named player, or everyone. */
export function damageLinks(amounts, actorUuid = "", all = false) {
   return amounts.map((n) => `<a class="ed-pe-damage" data-amount="${n}" data-actor="${actorUuid}" data-all="${all ? 1 : ""}"><i class="fa-solid fa-heart-crack"></i> ${L(all ? "EDRPG.planet.damageAll" : "EDRPG.planet.damage", { n })}</a>`).join(" ");
}

/** A GM action button. */
const actionLink = (action, label) => `<a class="ed-pe-action" data-pe="${action}"><i class="fa-solid fa-play"></i> ${esc(L(label))}</a>`;

/* -------------------------------------------- */
/*  The card                                    */
/* -------------------------------------------- */

/**
 * Explore: roll an encounter on a column and post its card.
 *
 * @param {object} o  { column: 0|1, place: "name of the world", event?: forced event name }
 *
 * @returns {Promise<ChatMessage>}
 */
export async function explore({ column, place = "", event = null } = {}) {
   const roll = event ? null : d(100);
   const row = event ? EVENT_TABLES.planet.rows.find((r) => r.name === event) : rowFor("planet", column, roll);
   const { rank, tier } = partyInfo();
   const state = { event: row.name, page: row.page, column, place, roll, rank, tier, log: [], relic: [], done: false, animal: null, player: null };
   const def = PLANET_EVENTS[row.name] ?? { text: "" };
   if (def.random) {
      const p = partyActors();
      const who = p.length ? p[d(p.length) - 1] : null;
      if (who) state.player = { uuid: who.uuid, name: who.name };
   }
   for (const a of def.auto ?? []) state.log.push(await runAuto(a, state));
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: render(state), flags: { edrpg: { planet: state } } });
}

/** Automatic rolls. */
async function runAuto(kind, state) {
   if (kind === "alienItem") {
      const x = await rollAlienItem();
      return L("EDRPG.planet.alienItem", { item: link(x), note: x.note, roll: x.roll });
   }
   if (kind === "rare") {
      const x = await rollRareItem(state.rank);
      return L("EDRPG.planet.rareItem", { item: link(x), cost: cr(x.cost) }) + (x.qty ? ` ×${x.qty}` : "");
   }
   if (kind === "animal") {
      const t = OPPONENT_TABLES.alienAnimals.personal;
      const r = opponentFor(t, state.tier, d(100));
      state.animal = r?.name ?? null;
      return L("EDRPG.planet.animal", { animal: r ? link(r) : "—" });
   }
   if (kind === "crashedShip") {
      const name = d(2) === 1 ? "Asp Scout – Voyager" : "Diamondback Explorer – Probe";
      return L("EDRPG.planet.ship", { ship: link({ name, uuid: await findByName(name) }) });
   }
   if (kind === "cargo") {
      const roll = d(100);
      const row = rowFor("randomCargo", 0, roll);
      return L("EDRPG.planet.cargo", { cargo: esc(row?.name ?? "Bertrandite"), roll });
   }
   return "";
}

/** The card's HTML. */
function render(state) {
   const def = PLANET_EVENTS[state.event] ?? { text: "" };
   const col = EVENT_TABLES.planet.columns[state.column] ?? "";
   const who = state.player ? `<p><i class="fa-solid fa-user"></i> ${L("EDRPG.planet.randomPlayer", { name: esc(state.player.name) })}</p>` : "";
   const checks = (def.checks ?? []).map((c) => `<li>${checkLinks(c, state.rank, state.player?.uuid ?? "")}</li>`).join("");
   const fight = def.fight ? toolLink("encounter", { faction: def.fight[0], scale: "personal", difficulty: def.fight[1], direct: true }, L("EDRPG.planet.fight", { difficulty: L(`EDRPG.enc.difficulty.${def.fight[1]}`), faction: L(`EDRPG.enc.faction.${def.fight[0]}`) }), "fa-solid fa-users-viewfinder") : "";
   const treasure = def.treasure || state.event === "Alien Ruins" ? `<p class="muted">${L("EDRPG.planet.treasure", { amount: cr(MISSION_REWARDS[state.rank]?.[1] ?? 0) })}</p>` : "";
   const actions = state.done ? "" : (def.actions ?? []).map((a) => actionLink(a, `EDRPG.planet.action.${a}`)).join(" ");
   return `<div class="edrpg edrpg-chat edrpg-planet">
      <h3><i class="fa-solid fa-earth-americas"></i> ${esc(state.event)}${def.poi ? ` <span class="ed-chip">${L("EDRPG.planet.poi")}</span>` : ""}</h3>
      <p class="muted">${state.place ? `${esc(state.place)} · ` : ""}${esc(col)}${state.roll ? ` · D100 ${state.roll}` : ""} · ${L("EDRPG.base.page", { page: state.page })}</p>
      <p>${esc(def.text)}</p>
      ${who}
      ${checks ? `<ul class="ed-pe-checks">${checks}</ul>` : ""}
      ${def.damage ? `<p>${damageLinks(def.damage, state.player?.uuid ?? "")}</p>` : ""}
      ${fight ? `<div class="ed-tool-row">${fight}</div>` : ""}
      ${treasure}
      ${state.log.length ? `<ol class="ed-pe-log">${state.log.map((l) => `<li>${l}</li>`).join("")}</ol>` : ""}
      ${actions ? `<div class="ed-tool-row" data-gm>${actions}</div>` : ""}
   </div>`;
}

/** Update a card (GM). */
async function change(message, fn) {
   const state = foundry.utils.deepClone(message.getFlag("edrpg", "planet"));
   await fn(state);
   await message.update({ content: render(state), "flags.edrpg.planet": state });
}

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/** The Alien Ruins traps: one roll. */
async function trap(state) {
   const party = partyActors();
   const who = party.length ? party[d(party.length) - 1] : null;
   const roll = d(10);
   const name = esc(who?.name ?? L("EDRPG.planet.someone"));
   if (roll <= 3) state.log.push(`${L("EDRPG.planet.trap.collapse", { name, roll })} ${checkLinks(["average", "dodge"], state.rank, who?.uuid ?? "")} ${damageLinks([30], who?.uuid ?? "")}`);
   else if (roll <= 6) state.log.push(`${L("EDRPG.planet.trap.wave", { name, roll })} ${damageLinks([10], "", true)}`);
   else if (roll <= 8) state.log.push(`${L("EDRPG.planet.trap.beam", { name, roll })} ${checkLinks(["hard", "dodge"], state.rank, who?.uuid ?? "")} ${damageLinks([40], who?.uuid ?? "")}`);
   else {
      state.log.push(L("EDRPG.planet.trap.clear", { name, roll }));
      state.log.push(await runAuto("alienItem", state));
      state.log.push(await runAuto("alienItem", state));
      state.done = true;
   }
}

/** The Relic AI Base: the next discovery. */
async function relic(state) {
   const roll = d(10);
   if (state.relic.includes(roll)) {
      state.log.push(L("EDRPG.planet.relic.storeroom", { roll, amount: cr(MISSION_REWARDS[state.rank]?.[1] ?? 0) }));
      state.log.push(await runAuto("rare", state));
      state.done = true;
      return;
   }
   state.relic.push(roll);
   const ev = RELIC_EVENTS[roll];
   let line = `<b>${roll}.</b> ${esc(ev.text)}`;
   for (const c of ev.checks ?? []) line += `<br>${checkLinks(c, state.rank)}`;
   if (ev.damage) line += `<br>${damageLinks(ev.damage)}`;
   if (ev.fight) line += `<br>${toolLink("encounter", { faction: ev.fight[0], scale: "personal", difficulty: ev.fight[1], direct: true }, L("EDRPG.planet.fight", { difficulty: L(`EDRPG.enc.difficulty.${ev.fight[1]}`), faction: L(`EDRPG.enc.faction.${ev.fight[0]}`) }), "fa-solid fa-users-viewfinder")}`;
   state.log.push(line);
   for (const a of ev.auto ?? []) state.log.push(await runAuto(a, state));
}

/** A Tribal Village trade: a Rare item, unless it's a weapon. */
async function village(state) {
   const x = await rollRareItem(state.rank);
   state.log.push(x.weapon ? L("EDRPG.planet.villageArt", { item: link(x) }) : L("EDRPG.planet.villageTrade", { item: link(x), cost: cr(x.cost) }));
   state.done = true;
}

/**
 * Apply damage from a card (GM).
 *
 * @param {number} amount
 *
 * @param {Actor[]} actors
 */
export async function hurt(amount, actors) {
   const { applyDamage } = await import("./dice/damage.mjs");
   const lines = [];
   for (const a of actors) {
      const r = await applyDamage(a, { amount, damageType: "kinetic" });
      lines.push(L("EDRPG.planet.took", { name: esc(a.name), taken: r.taken, before: r.before, after: r.after }));
   }
   if (lines.length) await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: `<div class="edrpg edrpg-chat edrpg-planet"><p>${lines.join("<br>")}</p></div>` });
}

/**
 * Chat hook: the card's links.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderPlanet(message, html) {
   const state = message.getFlag("edrpg", "planet");
   const card = html.querySelector(".edrpg-planet");
   if (!state || !card) return;
   if (!game.user.isGM) for (const el of card.querySelectorAll("[data-gm], .ed-pe-damage")) el.remove();
   card.addEventListener("click", async (event) => {
      const el = event.target.closest(".ed-pe-check, .ed-pe-damage, .ed-pe-action");
      if (!el) return;
      event.preventDefault();
      if (el.classList.contains("ed-pe-check")) {
         const named = el.dataset.actor ? await fromUuid(el.dataset.actor) : null;
         const actor = (named?.isOwner ? named : null) ?? canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? named;
         if (!actor?.isOwner) return void ui.notifications.warn(L("EDRPG.infil.noActor"));
         return game.edrpg.rollSkillCheck(actor, el.dataset.skill, { difficulty: Number(el.dataset.dn), label: `${state.event}: ${skillLabel(el.dataset.skill)}` });
      }
      if (!game.user.isGM) return;
      if (el.classList.contains("ed-pe-damage")) {
         const amount = Number(el.dataset.amount);
         let targets = [];
         if (el.dataset.all) targets = partyActors();
         else if (el.dataset.actor) targets = [await fromUuid(el.dataset.actor)].filter(Boolean);
         else targets = (canvas?.tokens?.controlled ?? []).map((t) => t.actor).filter((a) => a?.system?.endurance);
         if (!targets.length) return void ui.notifications.warn(L("EDRPG.damage.noneSelected"));
         return hurt(amount, targets);
      }
      const act = el.dataset.pe;
      if (act === "two") {
         await explore({ column: state.column, place: state.place });
         return explore({ column: state.column, place: state.place });
      }
      if (act === "outpost") return explore({ column: state.column, place: state.place, event: "Pirate Outpost" });
      if (act === "spawnGroup") return game.edrpg.runTool("encounter", { faction: "alienAnimals", scale: "personal", difficulty: "hard", only: state.animal, direct: true });
      return change(message, async (s) => {
         if (act === "trap") await trap(s);
         else if (act === "relic") await relic(s);
         else if (act === "village") await village(s);
         else if (act === "alienItem") {
            s.log.push(await runAuto("alienItem", s));
            s.done = true;
         } else if (act === "rare") {
            s.log.push(await runAuto("rare", s));
            s.done = true;
         }
      });
   });
}

/* -------------------------------------------- */
/*  From the Star System sheet                  */
/* -------------------------------------------- */

/**
 * Explore a body or moon of a star system: roll its encounter (or, in survey mode, count lifeless worlds and roll on
 * every fourth), and mark it explored.
 *
 * @param {Actor} system  A Star System.
 *
 * @param {string} key    "si.bi" or "si.bi.mi".
 *
 * @param {object} o      { type, name }
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function exploreBody(system, key, { type, name }) {
   const column = columnFor(type);
   if (column === null) return void ui.notifications.warn(L("EDRPG.planet.notLandable", { name }));
   const explored = [...(system.getFlag("edrpg", "explored") ?? [])];
   const survey = !!system.getFlag("edrpg", "survey");
   let count = system.getFlag("edrpg", "lifeless") ?? 0;
   if (!explored.includes(key)) explored.push(key);
   let message = null;
   if (column === 1 && survey) {
      count += 1;
      if (count % 4 === 0) message = await explore({ column, place: name });
      else ui.notifications.info(L("EDRPG.planet.surveyed", { name, n: 4 - (count % 4) }));
   } else message = await explore({ column, place: name });
   if (system.isOwner) await system.update({ "flags.edrpg.explored": explored, "flags.edrpg.lifeless": count });
   return message;
}
