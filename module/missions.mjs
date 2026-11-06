/**
 * Mission Generator (Core Rules pp.338–347).
 *
 * - Pick or roll a theme (Military, Espionage, Exploration). The book offers no roll for the theme, so a random theme
 *   is equally likely to be any of the three.
 * - D10 for the mission, D10 for its detail (where it happens) and, optionally, D10 for its twist.
 * - Several missions can be combined into one "super mission".
 * - Rewards per player by the party's rank: Mission Income and Treasure Income (p.338).
 * - Stellar Cartography can create the star systems it asks for (a G-type with an Earth-like world, D10 systems, or a
 *   Special Spectral star).
 * The result is posted to chat and can be saved as a journal entry. The summaries are short; the book has the scenes.
 */
import { MISSIONS, MISSION_REWARDS } from "./mission-data.mjs";
import { ranks } from "./config.mjs";
import { die } from "./starsystem.mjs";
import { makeStarSystem } from "./sheets/starsystem-sheet.mjs";
import { notesHTML } from "./mission-notes.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const THEMES = ["military", "espionage", "exploration", "trade"];
/** Random themes: the Core Rules three (Trade Missions are the Super Traders Supplement's, chosen on purpose). */
const CORE_THEMES = ["military", "espionage", "exploration"];

/** Look a D10 up on a [highest, …] list. */
function lookup(list, roll) {
   return list.find(([max]) => roll <= max) ?? list.at(-1);
}

/**
 * Roll one mission.
 *
 * @param {string} [theme]  military | espionage | exploration (rolled if not given).
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.twist=true]
 *
 * @param {Function} [rng]
 *
 * @returns {object}
 */
export function rollMission(theme, { twist = true } = {}, rng) {
   theme = THEMES.includes(theme) ? theme : CORE_THEMES[die(3, rng) - 1];
   const roll = die(10, rng);
   const m = MISSIONS[theme].find((x) => roll <= x.max);
   const detailRoll = die(10, rng);
   const [, detail, link] = lookup(m.details, detailRoll);
   const out = { theme, roll, name: m.name, page: m.page, book: m.book ?? null, brief: m.brief, detailRoll, detail, link: link ?? null };
   if (twist) {
      out.twistRoll = die(10, rng);
      out.twist = lookup(m.twists, out.twistRoll)[1];
   }
   // "D10 star systems": roll how many.
   if (link?.count) out.systems = die(10, rng);
   return out;
}

/**
 * Rewards per player for a rank.
 *
 * @param {string} rank
 *
 * @returns {{mission: number, treasure: number}|null}
 */
export function missionRewards(rank) {
   const r = MISSION_REWARDS[rank];
   return r ? { mission: r[0], treasure: r[1] } : null;
}

/**
 * The briefing as HTML (for the chat card and the journal page).
 *
 * @param {object[]} missions
 *
 * @param {object} options  {rank, systems: {missionIndex: [{uuid, name}…]}}
 *
 * @returns {string}
 */
export function briefingHTML(missions, { rank, systems = {}, notes = true } = {}) {
   const cr = (n) => `${n.toLocaleString()}cr`;
   const parts = missions.map((m, i) => {
      const links = (systems[i] ?? []).map((x) => `@UUID[${x.uuid}]{${esc(x.name)}}`).join(", ");
      return `<div class="ed-mission">
         <h4>${missions.length > 1 ? `${i + 1}. ` : ""}${esc(m.name)} <span class="muted">(${L(`EDRPG.mission.theme.${m.theme}`)} ${m.roll}, ${m.book ? `${esc(m.book)} ` : ""}p.${m.page})</span></h4>
         <p>${esc(m.brief)}</p>
         <p><strong>${L("EDRPG.mission.detail")} (${m.detailRoll}):</strong> ${esc(m.detail)}${m.systems ? ` <em>${L("EDRPG.mission.systemsRolled", { count: m.systems })}</em>` : ""}</p>
         ${m.twist ? `<p><strong>${L("EDRPG.mission.twist")} (${m.twistRoll}):</strong> ${esc(m.twist)}</p>` : ""}
         ${links ? `<p><strong>${L("EDRPG.mission.starSystems")}:</strong> ${links}</p>` : ""}
         ${notes ? notesHTML(m) : ""}
      </div>`;
   });
   const reward = missionRewards(rank);
   const rewardLine = reward
      ? `<p class="ed-mission-reward"><strong>${L("EDRPG.mission.rewards", { rank: L(`EDRPG.rank.pilots.${rank}`) })}</strong> ${L("EDRPG.mission.rewardLine", { mission: cr(reward.mission), treasure: cr(reward.treasure) })}</p>`
      : "";
   return `${parts.join("")}${rewardLine}<p class="hint">${L("EDRPG.mission.footer")}</p>`;
}

/**
 * The GM's Mission Generator: choose the theme, how many missions to combine, twists, the party's rank, and where
 * the result goes.
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function openMissionGenerator() {
   const row = (label, field, hint = "") => `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const themes = [`<option value="">${L("EDRPG.mission.randomTheme")}</option>`, ...THEMES.map((t) => `<option value="${t}">${L(`EDRPG.mission.theme.${t}`)}</option>`)].join("");
   // Default to the most common rank among the players' characters.
   const counts = {};
   for (const a of game.actors ?? []) if (a.type === "character" && a.hasPlayerOwner) counts[a.system.rank?.key] = (counts[a.system.rank?.key] ?? 0) + 1;
   const partyRank = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "harmless";
   const rankOptions = ranks.map((r) => `<option value="${r.key}"${r.key === partyRank ? " selected" : ""}>${L(r.name)}</option>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.mission.title"), icon: "fa-solid fa-clipboard-list" },
      classes: ["edrpg", "edrpg-dialog"],
      content:
         row(L("EDRPG.mission.themeLabel"), `<select name="theme">${themes}</select>`) +
         row(L("EDRPG.mission.count"), `<input type="number" name="count" value="1" min="1" max="4" step="1">`, L("EDRPG.mission.countHint")) +
         row(L("EDRPG.mission.withTwist"), `<input type="checkbox" name="twist" checked>`) +
         row(L("EDRPG.mission.rankLabel"), `<select name="rank">${rankOptions}</select>`, L("EDRPG.mission.rankHint")) +
         row(L("EDRPG.mission.makeSystems"), `<input type="checkbox" name="systems" checked>`, L("EDRPG.mission.makeSystemsHint")) +
         row(L("EDRPG.mission.journal"), `<input type="checkbox" name="journal" checked>`) +
         row(L("EDRPG.mission.whisper"), `<input type="checkbox" name="whisper" checked>`),
      ok: { label: "EDRPG.mission.generate", icon: "fa-solid fa-dice-d10" },
      rejectClose: false,
   });
   if (!input) return null;
   const count = Math.clamp(Number(input.count) || 1, 1, 4);
   // A super mission keeps one theme, rolled once if random.
   const theme = input.theme || CORE_THEMES[die(3) - 1];
   const missions = Array.from({ length: count }, () => rollMission(theme, { twist: !!input.twist }));
   return postMissions(missions, { rank: input.rank, systems: !!input.systems, journal: !!input.journal, whisper: !!input.whisper });
}

/**
 * Post (and optionally save) a set of rolled missions, creating any star systems they call for.
 *
 * @param {object[]} missions
 *
 * @param {object} options  {rank, systems, journal, whisper}
 *
 * @returns {Promise<ChatMessage>}
 */
export async function postMissions(missions, { rank, systems = true, journal = true, whisper = true } = {}) {
   const title = missions.length > 1 ? L("EDRPG.mission.superTitle", { names: missions.map((m) => m.name).join(" + ") }) : missions[0].name;
   const made = {};
   if (systems && game.user.isGM) {
      for (const [i, m] of missions.entries()) {
         if (!m.link) continue;
         const n = m.link.count ? m.systems : 1;
         made[i] = [];
         for (let k = 0; k < n; k++) {
            const name = `${L("EDRPG.mission.systemName")} ${String.fromCharCode(65 + Object.values(made).flat().length)}`;
            const actor = await makeStarSystem({
               name,
               primary: m.link.special ? "special" : m.link.primary,
               earthLike: !!m.link.earthLike,
               inhabited: false,
            });
            if (actor) made[i].push({ uuid: actor.uuid, name: actor.name });
         }
      }
   }
   const body = briefingHTML(missions, { rank, systems: made });
   let entry = null;
   if (journal && game.user.isGM) {
      entry = await JournalEntry.implementation.create({ name: title, pages: [{ name: title, type: "text", text: { content: body } }] });
   }
   const content = `<div class="edrpg edrpg-chat edrpg-mission"><h3><i class="fa-solid fa-clipboard-list"></i> ${esc(title)}</h3>${body}${entry ? `<p>@UUID[${entry.uuid}]{${esc(L("EDRPG.mission.openJournal"))}}</p>` : ""}</div>`;
   const data = { speaker: ChatMessage.getSpeaker(), content };
   if (whisper) data.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
   return ChatMessage.create(data);
}
