/**
 * Encounter generator (the supplements' Random Generation Systems: Espionage p.42, Exploration p.41, Military p.52,
 * Super Traders p.41).
 *
 * - Difficulty: Easy, Medium or Hard. Number of opponents: the number of players, adjusted by D10 (Easy −2 to 0,
 *   Medium 0 to +2, Hard +3 to +5); at least one.
 * - Type: faction and scale; each opponent is a D100 roll on the Tier column for the party (Security groups stop at
 *   Tier 3). High Threat opponents (*) count as three.
 * - Behaviour (personal scale): thoughtless, brute or cunning, from each book's table.
 * - Reinforcements (Espionage p.48, Military p.59): at the end of each combat round D10, +1 per round since the last
 *   group; on 10+ an Easy group of the same faction arrives. Base Alert: at the end of each round D10, a 10 raises it.
 *
 * The card lists the group with links, and the GM can place their tokens on the scene and track reinforcements and
 * the alert in the current combat.
 */
import { OPPONENT_TABLES } from "./generation-data.mjs";
import { NUMBER_OF_OPPONENTS, TIER_OF_RANK, BEHAVIOURS, ASSASSINS, NOT_HUMAN } from "./supplement-data.mjs";
import { ranks } from "./config.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const die = (n, rng = Math.random) => 1 + Math.floor(rng() * n);

export const FACTIONS = ["security", "military", "criminal", "alienAnimals", "tribals", "relicAI"];
export const DIFFICULTIES = ["easy", "medium", "hard"];

/**
 * The party: player characters, their highest rank and Tier (Core Rules p.242: use the highest rank).
 *
 * @returns {{players: number, rank: string, tier: number}}
 */
export function partyInfo() {
   const pcs = (game.actors ?? []).filter((a) => a.type === "character" && a.hasPlayerOwner);
   const order = ranks.map((r) => r.key);
   const rank = pcs.map((a) => a.system.rank?.key).filter(Boolean).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? "harmless";
   return { players: pcs.length || 3, rank, tier: TIER_OF_RANK[rank] ?? 1 };
}

/**
 * How many opponents (before High Threat counting).
 *
 * @param {string} difficulty
 *
 * @param {number} players
 *
 * @param {number} d10
 *
 * @returns {number}
 */
export function opponentCount(difficulty, players, d10) {
   const add = NUMBER_OF_OPPONENTS[difficulty].find(([max]) => d10 <= max)[1];
   return Math.max(1, players + add);
}

/** The table for a faction and scale (null if the books have none). */
export function tableFor(faction, scale) {
   return OPPONENT_TABLES[faction]?.[scale] ?? null;
}

/**
 * One opponent from a table.
 *
 * @param {object} table
 *
 * @param {number} tier  1–4 (capped at the table's last Tier).
 *
 * @param {number} d100
 *
 * @returns {object|null}  A row.
 */
export function opponentFor(table, tier, d100) {
   const col = Math.min(tier, table.tiers) - 1;
   return table.rows.find((r) => r.ranges[col] && d100 >= r.ranges[col][0] && d100 <= r.ranges[col][1]) ?? null;
}

/**
 * Roll a group (pure, with an injectable random source).
 *
 * @param {object} o
 *
 * @param {string} o.faction
 *
 * @param {string} o.scale        personal | vehicle | spaceship
 *
 * @param {string} o.difficulty   easy | medium | hard
 *
 * @param {number} o.players
 *
 * @param {number} o.tier
 *
 * @param {boolean} [o.humansOnly]  Soldiers / unarmed staff: re-roll drones, robots and animals.
 *
 * @param {string[]} [o.exclude]    Names to re-roll.
 *
 * @param {number} [o.count]        A fixed number instead of rolling.
 *
 * @param {Function} [rng]
 *
 * @returns {{count: number, d10: number|null, tier: number, opponents: object[], table: object}|null}
 */
export function rollGroup({ faction, scale, difficulty, players, tier, humansOnly = false, exclude = [], count = null, only = null }, rng = Math.random) {
   const table = tableFor(faction, scale);
   if (!table) return null;
   const d10 = count === null ? die(10, rng) : null;
   const n = count ?? opponentCount(difficulty, players, d10);
   const opponents = [];
   let left = n;
   // A group of one kind (an Alien Spawning Ground's animals).
   const fixed = only ? table.rows.find((r) => r.name === only) : null;
   if (fixed) {
      while (left > 0) {
         opponents.push({ name: fixed.name, uuid: fixed.uuid, threat: fixed.threat, behaviour: scale === "personal" ? (BEHAVIOURS[fixed.name] ?? null) : null });
         left -= fixed.threat ? 3 : 1;
      }
      return { count: n, d10, tier: Math.min(tier, table.tiers), opponents, table };
   }
   for (let guard = 0; left > 0 && guard < 200; guard++) {
      const row = opponentFor(table, tier, die(100, rng));
      if (!row) continue;
      if (exclude.includes(row.name) || (humansOnly && NOT_HUMAN.test(row.name))) continue;
      opponents.push({ name: row.name, uuid: row.uuid, threat: row.threat, behaviour: scale === "personal" ? (BEHAVIOURS[row.name] ?? null) : null });
      left -= row.threat ? 3 : 1;
   }
   return { count: n, d10, tier: Math.min(tier, table.tiers), opponents, table };
}

/** An opponent's compendium UUID by name. */
export async function opponentUuid(name) {
   const pack = game.packs.get("edrpg.opponents");
   const hit = (await pack?.getIndex())?.find((e) => e.name === name);
   return hit ? `Compendium.edrpg.opponents.Actor.${hit._id}` : null;
}

/** "Bruiser ×2, Police Officer" style grouping. */
function grouped(opponents) {
   const map = new Map();
   for (const o of opponents) {
      const k = o.name;
      if (!map.has(k)) map.set(k, { ...o, n: 0 });
      map.get(k).n += 1;
   }
   return [...map.values()];
}

/**
 * Post an encounter card.
 *
 * @param {object} group   rollGroup()
 *
 * @param {object} o       { faction, scale, difficulty, title, whisper }
 *
 * @returns {Promise<ChatMessage>}
 */
export async function postEncounter(group, { faction, scale, difficulty, title = null, whisper = true, note = "" } = {}) {
   const link = (o) => (o.uuid ? `@UUID[${o.uuid}]{${esc(o.name)}}` : esc(o.name));
   const lines = grouped(group.opponents)
      .map((o) => `<li>${link(o)}${o.n > 1 ? ` ×${o.n}` : ""}${o.threat ? ` <span class="ed-chip">${L("EDRPG.enc.highThreat")}</span>` : ""}${o.behaviour ? ` <span class="muted">${L(`EDRPG.enc.behaviour.${o.behaviour}`)}</span>` : ""}</li>`)
      .join("");
   const head = title ?? L("EDRPG.enc.title", { difficulty: L(`EDRPG.enc.difficulty.${difficulty}`), faction: L(`EDRPG.enc.faction.${faction}`), scale: L(`EDRPG.enc.scale.${scale}`) });
   const content = `<div class="edrpg edrpg-chat edrpg-encounter">
      <h3><i class="fa-solid fa-users-viewfinder"></i> ${esc(head)}</h3>
      <p class="muted">${L("EDRPG.enc.summary", { count: group.count, roll: group.d10 ?? "—", tier: group.tier, book: esc(group.table.book), page: group.table.page })}</p>
      <ul>${lines}</ul>
      ${note ? `<p class="hint">${note}</p>` : ""}
      <div class="ed-tool-row">${toolLink("place", {}, "EDRPG.enc.place", "fa-solid fa-chess-pawn")}${toolLink("track", { faction, scale }, "EDRPG.enc.trackReinforcements", "fa-solid fa-person-military-pointing")}</div>
   </div>`;
   const data = { speaker: ChatMessage.getSpeaker(), content, flags: { edrpg: { encounter: { faction, scale, opponents: group.opponents } } } };
   if (whisper) data.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
   return ChatMessage.create(data);
}

/**
 * A clickable GM tool link (handled by {@link registerTools}).
 *
 * @param {string} tool
 *
 * @param {object} args
 *
 * @param {string} label  Localisation key or text.
 *
 * @param {string} [icon]
 *
 * @returns {string}
 */
export function toolLink(tool, args, label, icon = "fa-solid fa-dice-d10") {
   return `<a class="edrpg-tool" data-tool="${tool}" data-args="${esc(JSON.stringify(args))}"><i class="${icon}"></i> ${esc(L(label))}</a>`;
}

/**
 * The GM's encounter dialog.
 *
 * @param {object} [preset]  { faction, scale, difficulty, humansOnly, title }
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function openEncounterGenerator(preset = {}) {
   const party = partyInfo();
   const opt = (list, cur, prefix) => list.map((k) => `<option value="${k}"${k === cur ? " selected" : ""}>${L(`${prefix}.${k}`)}</option>`).join("");
   const row = (label, field, hint = "") => `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.enc.dialogTitle"), icon: "fa-solid fa-users-viewfinder" },
      classes: ["edrpg", "edrpg-dialog"],
      content:
         `<p class="hint">${L("EDRPG.enc.intro")}</p>` +
         row(L("EDRPG.enc.factionLabel"), `<select name="faction">${opt(FACTIONS, preset.faction ?? "security", "EDRPG.enc.faction")}</select>`) +
         row(L("EDRPG.enc.scaleLabel"), `<select name="scale">${opt(["personal", "vehicle", "spaceship"], preset.scale ?? "personal", "EDRPG.enc.scale")}</select>`) +
         row(L("EDRPG.enc.difficultyLabel"), `<select name="difficulty">${opt(DIFFICULTIES, preset.difficulty ?? "medium", "EDRPG.enc.difficulty")}</select>`) +
         row(L("EDRPG.enc.players"), `<input type="number" name="players" value="${party.players}" min="1" step="1">`) +
         row(L("EDRPG.enc.tier"), `<select name="tier">${[1, 2, 3, 4].map((t) => `<option value="${t}"${t === party.tier ? " selected" : ""}>${L(`EDRPG.enc.tierName.${t}`)}</option>`).join("")}</select>`, L("EDRPG.enc.tierHint")) +
         row(L("EDRPG.enc.humansOnly"), `<input type="checkbox" name="humansOnly"${preset.humansOnly ? " checked" : ""}>`, L("EDRPG.enc.humansOnlyHint")),
      ok: { label: "EDRPG.enc.roll", icon: "fa-solid fa-dice-d10" },
      rejectClose: false,
   });
   if (!input) return null;
   return rollAndPost({ ...input, players: Number(input.players) || party.players, tier: Number(input.tier) || party.tier, title: preset.title ?? null });
}

/**
 * Roll a group and post it (no dialog). Missing values come from the party.
 *
 * @param {object} o
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollAndPost(o) {
   const party = partyInfo();
   const args = { faction: o.faction, scale: o.scale ?? "personal", difficulty: o.difficulty ?? "medium", players: o.players ?? party.players, tier: o.tier ?? party.tier, humansOnly: !!o.humansOnly, exclude: o.exclude ?? [], only: o.only ?? null };
   const group = rollGroup(args);
   if (!group) {
      ui.notifications.warn(L("EDRPG.enc.noTable", { faction: L(`EDRPG.enc.faction.${args.faction}`), scale: L(`EDRPG.enc.scale.${args.scale}`) }));
      return null;
   }
   return postEncounter(group, { ...args, title: o.title ?? null, note: o.note ?? "" });
}

/**
 * A Rank Appropriate Assassin for the party (Espionage p.48).
 *
 * @returns {Promise<ChatMessage>}
 */
export async function postAssassin() {
   const { rank } = partyInfo();
   const name = ASSASSINS[rank];
   const uuid = await opponentUuid(name);
   const group = { count: 1, d10: null, tier: TIER_OF_RANK[rank], opponents: [{ name, uuid, threat: name === "Unstoppable Assassin", behaviour: BEHAVIOURS[name] ?? null }], table: { book: "Espionage Supplement", page: 48 } };
   return postEncounter(group, { faction: "security", scale: "personal", difficulty: "easy", title: L("EDRPG.enc.assassinTitle", { rank: L(ranks.find((r) => r.key === rank)?.name ?? "") }) });
}

/* -------------------------------------------- */
/*  Placing opponents                           */
/* -------------------------------------------- */

/** A world copy of a compendium opponent (reused if already imported). */
async function worldActor(uuid) {
   const existing = game.actors.find((a) => a._stats?.compendiumSource === uuid || a.flags?.core?.sourceId === uuid);
   if (existing) return existing;
   const doc = await fromUuid(uuid);
   if (!doc) return null;
   const name = L("EDRPG.enc.folder");
   const folder = game.folders.find((f) => f.type === "Actor" && f.name === name) ?? (await Folder.implementation.create({ name, type: "Actor" }));
   return Actor.implementation.create({ ...game.actors.fromCompendium(doc), folder: folder.id });
}

/**
 * Put an encounter's opponents on the current scene, hidden, in a ring around its centre (or the view).
 *
 * @param {ChatMessage} message
 */
export async function placeEncounter(message) {
   const opponents = message?.getFlag("edrpg", "encounter")?.opponents ?? [];
   const scene = canvas?.scene;
   if (!scene || !opponents.length) return void ui.notifications.warn(L("EDRPG.enc.noScene"));
   const grid = scene.grid.size;
   const cx = canvas.stage?.pivot?.x ?? scene.width / 2;
   const cy = canvas.stage?.pivot?.y ?? scene.height / 2;
   const tokens = [];
   for (const [i, o] of opponents.entries()) {
      if (!o.uuid) continue;
      const actor = await worldActor(o.uuid);
      if (!actor) continue;
      const angle = (i / opponents.length) * Math.PI * 2;
      const r = grid * (1 + Math.floor(i / 8));
      const t = await actor.getTokenDocument({ x: Math.round(cx + Math.cos(angle) * r * 2), y: Math.round(cy + Math.sin(angle) * r * 2), hidden: true });
      tokens.push(t.toObject());
   }
   if (tokens.length) await scene.createEmbeddedDocuments("Token", tokens);
   ui.notifications.info(L("EDRPG.enc.placed", { count: tokens.length }));
}

/* -------------------------------------------- */
/*  Reinforcements and the Alert in combat      */
/* -------------------------------------------- */

/**
 * Track reinforcements (and optionally a base Alert check) in the current combat.
 *
 * @param {object} o  { faction, scale, alertCheck }
 */
export async function trackCombat({ faction, scale = "personal", alertCheck = false } = {}) {
   const combat = game.combat;
   if (!combat) return void ui.notifications.warn(L("EDRPG.enc.noCombat"));
   const current = combat.getFlag("edrpg", "reinforce") ?? {};
   await combat.setFlag("edrpg", "reinforce", { faction: faction ?? current.faction ?? "security", scale, bonus: 0, alertCheck: alertCheck || !!current.alertCheck, on: true });
   ui.notifications.info(L("EDRPG.enc.tracking", { faction: L(`EDRPG.enc.faction.${faction ?? current.faction ?? "security"}`) }));
}

/**
 * The end-of-round checks (run by the active GM when the round advances).
 *
 * @param {Combat} combat
 */
export async function endOfRound(combat) {
   const r = combat.getFlag("edrpg", "reinforce");
   if (!r?.on) return;
   const notes = [];
   const rolls = [];
   let bonus = r.bonus ?? 0;
   const roll = await new Roll(`1d10 + ${bonus}`).evaluate();
   rolls.push(roll);
   const arrive = roll.total >= 10;
   notes.push(L(arrive ? "EDRPG.enc.reinforcementsArrive" : "EDRPG.enc.reinforcementsNot", { roll: roll.total, bonus }));
   bonus = arrive ? 0 : bonus + 1;
   if (r.alertCheck) {
      const a = await new Roll("1d10").evaluate();
      rolls.push(a);
      if (a.total === 10) notes.push(L("EDRPG.enc.alertRaised"));
      else notes.push(L("EDRPG.enc.alertNot", { roll: a.total }));
   }
   await combat.setFlag("edrpg", "reinforce", { ...r, bonus });
   const button = arrive ? `<div class="ed-tool-row">${toolLink("encounter", { faction: r.faction, scale: r.scale, difficulty: "easy", direct: true }, "EDRPG.enc.rollReinforcements")}</div>` : "";
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
      rolls,
      content: `<div class="edrpg edrpg-chat edrpg-encounter"><h3><i class="fa-solid fa-person-military-pointing"></i> ${L("EDRPG.enc.roundEnd", { round: combat.round - 1 })}</h3>${notes.map((n) => `<p>${n}</p>`).join("")}${button}</div>`,
   });
}

/** Register the round-end hook. */
export function registerEncounterHooks() {
   Hooks.on("updateCombat", (combat, changes) => {
      if (!game.user.isActiveGM || !("round" in changes) || combat.round <= 1) return;
      const previous = combat.previous?.round ?? combat.round - 1;
      if (combat.round > previous) endOfRound(combat);
   });
}
