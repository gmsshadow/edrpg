/**
 * GM tool links: `@EDRPG[tool key=value …]{Label}` in journals and chat (and the same anchors written directly by the
 * system's cards) run the supplements' generators: encounters, Infiltration challenges, bases, Space Lane, Planet and
 * Travel encounters, Rank Appropriate Assassins and so on. Only the GM can run them.
 */
import { EVENT_TABLES } from "./generation-data.mjs";
import { LONG_JOURNEY } from "./supplement-data.mjs";
import { rollAndPost, openEncounterGenerator, placeEncounter, trackCombat, postAssassin, opponentUuid, toolLink, partyInfo } from "./encounters.mjs";
import { startInfiltration } from "./infiltration.mjs";
import { openBase, openBaseGenerator, workersCount } from "./bases.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const gmWhisper = () => ChatMessage.getWhisperRecipients("GM").map((u) => u.id);

/** Encounter links for event results that are fights. */
const EVENT_FIGHTS = {
   spaceLane: { "Pirate Attack – Easy": ["criminal", "spaceship", "easy"], "Pirate Attack – Medium": ["criminal", "spaceship", "medium"], "Pirate Attack – Hard": ["criminal", "spaceship", "hard"] },
   planet: {
      "Alien Animal Attack – Easy": ["alienAnimals", "personal", "easy"], "Alien Animal Attack – Medium": ["alienAnimals", "personal", "medium"], "Alien Animal Attack – Hard": ["alienAnimals", "personal", "hard"],
      "Tribals Attack – Easy": ["tribals", "personal", "easy"], "Tribals Attack – Medium": ["tribals", "personal", "medium"], "Tribals Attack – Hard": ["tribals", "personal", "hard"],
      "Pirate Attack – Medium": ["criminal", "personal", "medium"],
   },
   travel: { "Vehicle Patrol": ["military", "vehicle", "easy"], "Foot Patrol": ["military", "personal", "easy", true], "Snipers (unique; only on alert and on foot)": ["military", "personal", "easy", true] },
};

/**
 * Roll a number of times on an event table.
 *
 * @param {string} key      spaceLane | planet | travel
 *
 * @param {number} column   Which column (security rating, planet type); 0 for single-column tables.
 *
 * @param {number} count
 *
 * @param {Function} [rng]
 *
 * @returns {{roll: number, row: object}[]}
 */
export function rollEvents(key, column, count, rng = Math.random) {
   const t = EVENT_TABLES[key];
   const top = Math.max(...t.rows.map((r) => r.ranges[column]?.[1] ?? 0));
   const unique = new Set();
   const out = [];
   for (let i = 0; i < count; i++) {
      let roll = 1 + Math.floor(rng() * top);
      let row = t.rows.find((r) => r.ranges[column] && roll >= r.ranges[column][0] && roll <= r.ranges[column][1]);
      // A unique event happens once a mission; again, it counts as No Event (Military p.59).
      if (row && /unique/i.test(row.name)) {
         if (unique.has(row.name)) row = t.rows.find((r) => /^No Event/.test(r.name));
         else unique.add(row.name);
      }
      out.push({ roll, row });
   }
   return out;
}

/** Post event results with page references and fight links. */
async function postEvents(key, column, count, title) {
   const t = EVENT_TABLES[key];
   const results = rollEvents(key, column, count);
   // Star Port encounters come last (Super Traders p.44): results named for the port are moved to the end.
   if (key === "spaceLane") results.sort((a, b) => Number(/star port|docking/i.test(a.row?.name ?? "")) - Number(/star port|docking/i.test(b.row?.name ?? "")));
   const lines = results.map(({ roll, row }) => {
      if (!row) return `<li>${roll}: —</li>`;
      const fight = EVENT_FIGHTS[key]?.[row.name];
      const link = fight ? ` ${toolLink("encounter", { faction: fight[0], scale: fight[1], difficulty: fight[2], humansOnly: !!fight[3], direct: true }, "EDRPG.tools.rollGroup")}` : "";
      return `<li><b>${esc(row.name)}</b> <span class="muted">(${roll}; ${L("EDRPG.base.page", { page: row.page ?? t.page })})</span>${link}</li>`;
   });
   const col = t.columns[column] ? ` — ${esc(t.columns[column])}` : "";
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      whisper: gmWhisper(),
      content: `<div class="edrpg edrpg-chat edrpg-encounter"><h3><i class="fa-solid fa-route"></i> ${esc(title)}${col}</h3><p class="muted">${esc(t.book)}${t.note ? `. ${esc(t.note)}` : ""}</p><ol>${lines.join("")}</ol></div>`,
   });
}

/** Ask which column (security rating / planet type) when the link doesn't say. */
async function askColumn(key, preset, count) {
   const t = EVENT_TABLES[key];
   if (preset !== undefined && preset !== null && preset !== "") return { column: Number(preset), count };
   if (t.columns.length < 2) return { column: 0, count };
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L(`EDRPG.tools.${key}`) },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.tools.column")}</label><div class="form-fields"><select name="column">${t.columns.map((c, i) => `<option value="${i}">${esc(c)}</option>`).join("")}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.tools.count")}</label><div class="form-fields"><input type="number" name="count" value="${count}" min="1" step="1"></div></div>`,
      rejectClose: false,
   });
   return input ? { column: Number(input.column), count: Number(input.count) || count } : null;
}

/**
 * Run a tool.
 *
 * @param {string} tool
 *
 * @param {object} args
 *
 * @param {HTMLElement} [el]  The clicked link (to find its chat message or journal entry).
 */
export async function runTool(tool, args = {}, el = null) {
   if (!game.user.isGM) return void ui.notifications.warn(L("EDRPG.tools.gmOnly"));
   switch (tool) {
      case "encounter":
         return args.direct ? rollAndPost(args) : openEncounterGenerator(args);
      case "place":
         return placeEncounter(game.messages.get(el?.closest("[data-message-id]")?.dataset.messageId));
      case "track":
         return trackCombat(args);
      case "assassin":
         return postAssassin();
      case "infiltration":
         // One challenge per player, and more successes than failures (Helping Old Joe).
         if (args.perPlayer) {
            const { players } = partyInfo();
            return startInfiltration({ count: players, need: Math.floor(players / 2) + 1, alert: !!args.alert });
         }
         return startInfiltration({ count: Number(args.count) || 0, list: args.list ? String(args.list).split(",").map((s) => s.trim()).filter(Boolean) : [], need: Number(args.need) || 1, alert: !!args.alert, interrogate: !!args.interrogate, title: args.title ?? "" });
      case "base":
         // A base's own journal links back to its explorer; otherwise make a new base.
         return args.uuid ? openBase(args.uuid) : openBaseGenerator(args);
      case "workers": {
         const { roll, count } = workersCount(args.difficulty ?? "easy");
         const uuid = await opponentUuid("Office Worker");
         return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), whisper: gmWhisper(), content: `<div class="edrpg edrpg-chat"><p>${L("EDRPG.tools.workers", { count, roll, who: uuid ? `@UUID[${uuid}]{Office Worker}` : "Office Worker" })}</p></div>` });
      }
      case "person": {
         const uuid = await opponentUuid(args.name);
         return uuid ? (await fromUuid(uuid))?.sheet.render({ force: true }) : ui.notifications.warn(L("EDRPG.enc.notFound", { name: args.name }));
      }
      case "planet": {
         // Each encounter as its own card, with its mechanics (planet.mjs).
         const pick = await askColumn("planet", args.column, Number(args.count) || 1);
         if (!pick) return null;
         const { explore } = await import("./planet.mjs");
         for (let i = 0; i < pick.count; i++) await explore({ column: pick.column, place: args.place ?? "" });
         return null;
      }
      case "alienItem": {
         const { rollAlienItem } = await import("./planet.mjs");
         const x = await rollAlienItem();
         return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), whisper: gmWhisper(), content: `<div class="edrpg edrpg-chat edrpg-planet"><p>${L("EDRPG.planet.alienItem", { item: x.uuid ? `@UUID[${x.uuid}]{${esc(x.name)}}` : esc(x.name), note: x.note, roll: x.roll })}</p></div>` });
      }
      case "spaceLane": {
         // Each encounter as its own card (space-lane.mjs); Star Port encounters last.
         const pick = await askColumn(tool, args.column, Number(args.count) || 1);
         if (!pick) return null;
         const { rollSpaceLane } = await import("./space-lane.mjs");
         return rollSpaceLane({ column: pick.column, count: pick.count, place: args.place ?? "" });
      }
      case "lane": {
         const { rollSpaceLane } = await import("./space-lane.mjs");
         return rollSpaceLane({ event: args.event, column: args.column ?? 1 });
      }
      case "sneak": {
         const { rollSpaceLane } = await import("./space-lane.mjs");
         return rollSpaceLane({ event: "Sneak into Port", column: args.column ?? 1 });
      }
      case "interdict": {
         const { openInterdiction } = await import("./interdiction.mjs");
         return openInterdiction({ attacker: args.attacker, bonus: args.bonus, rank: args.rank });
      }
      case "market":
         return game.edrpg.openMarket();
      case "travel": {
         const { rollTravel } = await import("./travel.mjs");
         return rollTravel({ count: Number(args.count) || 1, alert: !!args.alert });
      }
      case "hostages": {
         const { startHostages } = await import("./hostage.mjs");
         return startHostages({ groups: String(args.groups ?? "easy,easy,medium").split(","), faction: args.faction ?? "criminal" });
      }
      case "journey": {
         const r = await new Roll("1d10").evaluate();
         const [, title, text] = LONG_JOURNEY.find(([max]) => r.total <= max);
         return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), rolls: [r], content: `<div class="edrpg edrpg-chat"><h3>${L("EDRPG.tools.journey")}: ${esc(title)}</h3><p>${esc(text)}</p></div>` });
      }
      case "rare":
         return game.edrpg.openRareItems();
      case "starSystem":
         return game.edrpg.generateStarSystem?.();
   }
   return null;
}

/** Parse "key=value key2=value2" (true/false and numbers converted). */
export function parseArgs(text) {
   const out = {};
   for (const part of String(text).trim().split(/\s+/)) {
      const [k, ...rest] = part.split("=");
      if (!k) continue;
      const v = rest.join("=");
      out[k] = v === "" || v === "true" ? true : v === "false" ? false : /^-?\d+$/.test(v) ? Number(v) : v.replace(/_/g, " ");
   }
   return out;
}

/** The enricher and the click handler (call at init). */
export function registerTools() {
   CONFIG.TextEditor.enrichers.push({
      id: "edrpgTool",
      pattern: /@EDRPG\[([^\]]+)\](?:\{([^}]+)\})?/g,
      enricher: async (match) => {
         const [tool, ...rest] = match[1].trim().split(/\s+/);
         const a = document.createElement("a");
         a.classList.add("edrpg-tool");
         a.dataset.tool = tool;
         a.dataset.args = JSON.stringify(parseArgs(rest.join(" ")));
         a.innerHTML = `<i class="fa-solid fa-dice-d10"></i> ${esc(match[2] ?? L(`EDRPG.tools.${tool}`))}`;
         return a;
      },
   });
   document.addEventListener("click", (event) => {
      const a = event.target.closest?.("a.edrpg-tool");
      if (!a) return;
      event.preventDefault();
      event.stopPropagation();
      let args = {};
      try {
         args = JSON.parse(a.dataset.args || "{}");
      } catch {
         args = {};
      }
      runTool(a.dataset.tool, args, a);
   });
}
