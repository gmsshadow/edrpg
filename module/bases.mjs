/**
 * Corporate and Military base generator (Espionage Supplement pp.55–60, Military Sourcebook pp.60–64).
 *
 * - Size: small (at most 10 rooms), medium (30) or large (60). Once every room is used, further doors lead outside.
 * - Way in: the front (Reception / Guard Room) or a Side Room (locked 80%), which turns out to be a rolled room.
 * - Each door: D10, even a room, odd a corridor; a corridor's doors always open into rooms.
 * - Rooms: D100 on the base's room table; with a target room, +5 to every later roll, and 101+ (or the last room) is
 *   the target. Doors by room size. Who's there depends on the Alert.
 * - Corridors: length and doors, and what's at the end.
 * - Alert: skill checks one step harder, reinforcements in combat, and a D10 at the end of each combat round (10 raises
 *   it) while fighting inside without one.
 *
 * The base lives in a journal entry ("Bases" folder): its flags hold the state, its page is the log. The GM drives it
 * from the Base Explorer window.
 */
import { CORPORATE_ROOMS, MILITARY_ROOMS, BASE_SIZES, ROOM_DOORS, CORRIDORS, CORRIDOR_ENDS } from "./supplement-data.mjs";
import { toolLink, partyInfo } from "./encounters.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const d = (n, rng = Math.random) => 1 + Math.floor(rng() * n);
const pick = (table, roll) => table.find(([max]) => roll <= max);

export const BASE_TYPES = { corporate: { rooms: CORPORATE_ROOMS, faction: "security", front: "reception" }, military: { rooms: MILITARY_ROOMS, faction: "military", front: "guardRoom" } };

/**
 * A new base's state.
 *
 * @param {object} o  { type, size, target, alert, name }
 *
 * @returns {object}
 */
export function newBase({ type = "corporate", size = "small", target = "", alert = false, name = "" } = {}) {
   return { type, size, target, alert, name, max: BASE_SIZES[size], bonus: 0, found: false, rooms: [], log: [] };
}

/** Doors in a room of this size. */
export function doorsFor(size, roll) {
   return size ? pick(ROOM_DOORS[size], roll)[1] : 1;
}

/**
 * Roll a room (pure).
 *
 * @param {object} base
 *
 * @param {Function} [rng]
 *
 * @returns {object}  { key, name, size, roll, target, outside }
 */
export function rollRoom(base, rng = Math.random) {
   const table = BASE_TYPES[base.type].rooms;
   if (base.rooms.filter((r) => !r.entry).length >= base.max) return { outside: true };
   const lastRoom = base.rooms.filter((r) => !r.entry).length === base.max - 1;
   for (let guard = 0; guard < 50; guard++) {
      const roll = d(100, rng);
      const total = roll + (base.target && !base.found ? base.bonus : 0);
      if (base.target && !base.found && (total >= 101 || lastRoom)) {
         const t = table.find((r) => r.key === base.target);
         return { ...roomData(t), roll, total, target: true };
      }
      const room = table.find((r) => r.range && Math.min(total, 100) >= r.range[0] && Math.min(total, 100) <= r.range[1]);
      if (!room || (room.largeOnly && base.size !== "large")) continue;
      return { ...roomData(room), roll, total, target: room.key === base.target };
   }
   return { outside: true };
}

const roomData = (r) => ({ key: r.key, name: r.name, size: r.size, page: r.page });

/**
 * Who is in a room now (rolling each chance).
 *
 * @param {object} base
 *
 * @param {string} key
 *
 * @param {Function} [rng]
 *
 * @returns {{lines: string[], notes: string}}
 */
export function occupants(base, key, rng = Math.random) {
   const room = BASE_TYPES[base.type].rooms.find((r) => r.key === key);
   const faction = BASE_TYPES[base.type].faction;
   const lines = [];
   for (const [when, chance, kind, what, note] of room.o) {
      if (when === "normal" && base.alert) continue;
      if (when === "alert" && !base.alert) continue;
      const roll = chance < 100 ? d(100, rng) : null;
      if (roll !== null && roll > chance) {
         if (kind !== "text") lines.push(L("EDRPG.base.chanceNo", { chance, roll, what: describe(kind, what, faction) }));
         continue;
      }
      const chanceNote = roll !== null ? ` <span class="muted">(${chance}%: ${roll})</span>` : "";
      if (kind === "text") lines.push(`${esc(what)}${chanceNote}`);
      else lines.push(`${describe(kind, what, faction, true)}${chanceNote}${note ? ` <span class="muted">${esc(note)}</span>` : ""}`);
   }
   return { lines, notes: room.n };
}

/** A line (with a tool link) for a group or person. */
function describe(kind, what, faction, links = false) {
   if (kind === "guards") {
      const label = L(`EDRPG.base.group.${faction}`, { difficulty: L(`EDRPG.enc.difficulty.${what}`) });
      return links ? `${label} ${toolLink("encounter", { faction, scale: "personal", difficulty: what, direct: true }, "EDRPG.base.rollGroup")}` : label;
   }
   if (kind === "unarmed") {
      const label = L("EDRPG.base.group.unarmed", { difficulty: L(`EDRPG.enc.difficulty.${what}`) });
      return links ? `${label} ${toolLink("encounter", { faction: "military", scale: "personal", difficulty: what, humansOnly: true, direct: true, note: L("EDRPG.base.unarmedNote") }, "EDRPG.base.rollGroup")}` : label;
   }
   if (kind === "workers") {
      const label = L("EDRPG.base.group.workers", { difficulty: L(`EDRPG.enc.difficulty.${what}`) });
      return links ? `${label} ${toolLink("workers", { difficulty: what }, "EDRPG.base.howMany")}` : label;
   }
   if (kind === "person") return links ? `${toolLink("person", { name: what }, what, "fa-solid fa-user")}` : esc(what);
   return esc(what);
}

/* -------------------------------------------- */
/*  Persistence                                 */
/* -------------------------------------------- */

/** Create the journal entry for a base and open the explorer. */
export async function createBase(opts) {
   const state = newBase(opts);
   const label = state.name || L("EDRPG.base.defaultName", { type: L(`EDRPG.base.type.${state.type}`), size: L(`EDRPG.base.size.${state.size}`) });
   state.name = label;
   const fname = L("EDRPG.base.folder");
   const folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === fname) ?? (await Folder.implementation.create({ name: fname, type: "JournalEntry" }));
   const entry = await JournalEntry.implementation.create({
      name: label,
      folder: folder.id,
      ownership: { default: 0 },
      pages: [{ name: label, type: "text", text: { content: logHtml(state) } }],
      flags: { edrpg: { base: state } },
   });
   state.uuid = entry.uuid;
   await save(entry, state);
   return openBase(entry);
}

/** The journal page's HTML. */
function logHtml(state) {
   const head = `<p>${L("EDRPG.base.logHead", { type: L(`EDRPG.base.type.${state.type}`), size: L(`EDRPG.base.size.${state.size}`), max: state.max })}${state.target ? ` ${L("EDRPG.base.logTarget", { room: esc(roomName(state, state.target)) })}` : ""}</p>${state.uuid ? `<p>@EDRPG[base uuid=${state.uuid}]{${L("EDRPG.base.openExplorer")}}</p>` : ""}`;
   return head + state.log.map((l) => `<p>${l}</p>`).join("");
}

const roomName = (state, key) => BASE_TYPES[state.type].rooms.find((r) => r.key === key)?.name ?? key;

/** Save the state and the log. */
async function save(entry, state) {
   await entry.update({ "flags.edrpg.base": state });
   const page = entry.pages.contents[0];
   if (page) await page.update({ "text.content": logHtml(state) });
}

/* -------------------------------------------- */
/*  Explorer                                    */
/* -------------------------------------------- */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/** The GM's control window for a base. */
export class BaseExplorer extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(entry, options = {}) {
      super(options);
      this.entry = entry;
   }

   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-base-explorer"],
      window: { icon: "fa-solid fa-building-shield", resizable: true },
      position: { width: 520, height: 640 },
      actions: {
         enterFront: BaseExplorer.#onEnterFront,
         enterSide: BaseExplorer.#onEnterSide,
         door: BaseExplorer.#onDoor,
         corridorDoor: BaseExplorer.#onCorridorDoor,
         corridor: BaseExplorer.#onCorridor,
         alert: BaseExplorer.#onAlert,
         track: BaseExplorer.#onTrack,
         openLog: BaseExplorer.#onOpenLog,
      },
   };

   static PARTS = { body: { template: "systems/edrpg/templates/base/explorer.hbs", scrollable: [".ed-base-log"] } };

   get title() {
      return this.entry?.name ?? L("EDRPG.base.title");
   }

   get state() {
      return foundry.utils.deepClone(this.entry.getFlag("edrpg", "base"));
   }

   /** @override */
   async _prepareContext() {
      const s = this.state;
      const used = s.rooms.filter((r) => !r.entry).length;
      return {
         s,
         typeLabel: L(`EDRPG.base.type.${s.type}`),
         sizeLabel: L(`EDRPG.base.size.${s.size}`),
         used,
         target: s.target ? roomName(s, s.target) : "",
         log: [...s.log].reverse(),
         started: s.rooms.length > 0,
         front: roomName(s, BASE_TYPES[s.type].front),
         hasTarget: !!s.target,
      };
   }

   /** Add a log entry and save. */
   async #log(state, html) {
      state.log.push(html);
      await save(this.entry, state);
      this.render();
   }

   /** A room entered: who's there, doors, notes. */
   async #room(state, room, how) {
      if (room.outside) return this.#log(state, `<i class="fa-solid fa-door-open"></i> ${L("EDRPG.base.outside")}`);
      const doorRoll = d(10);
      const doors = doorsFor(room.size, doorRoll);
      const who = occupants(state, room.key);
      state.rooms.push({ key: room.key, entry: !!room.entry });
      if (!room.entry && state.target && !state.found) state.bonus += 5;
      if (room.target) state.found = true;
      const n = state.rooms.filter((r) => !r.entry).length;
      const rollText = room.roll ? ` <span class="muted">(${L("EDRPG.base.rolled", { roll: room.roll, total: room.total })})</span>` : "";
      const html = `<b>${room.entry ? "" : `${n}. `}${esc(room.name)}</b>${room.size ? ` <span class="muted">${L(`EDRPG.base.roomSize.${room.size}`)}</span>` : ""}${room.target ? ` <span class="ed-chip">${L("EDRPG.base.targetRoom")}</span>` : ""}${rollText}
         <br><span class="muted">${how}</span>
         ${who.lines.length ? `<br><i class="fa-solid fa-users"></i> ${who.lines.join("<br>")}` : `<br><span class="muted">${L("EDRPG.base.nobody")}</span>`}
         ${who.notes ? `<br><i class="fa-solid fa-circle-info"></i> ${esc(who.notes)}` : ""}
         <br><i class="fa-solid fa-door-closed"></i> ${L("EDRPG.base.doors", { n: doors, roll: doorRoll })} <span class="muted">${L("EDRPG.base.page", { page: room.page })}</span>`;
      return this.#log(state, html);
   }

   static async #onEnterFront() {
      const s = this.state;
      const t = BASE_TYPES[s.type].rooms.find((r) => r.key === BASE_TYPES[s.type].front);
      return this.#room(s, { ...roomData(t), entry: true }, L("EDRPG.base.viaFront"));
   }

   static async #onEnterSide() {
      const s = this.state;
      const lock = d(100);
      const how = lock <= 80 ? L("EDRPG.base.sideLocked", { roll: lock }) : L("EDRPG.base.sideOpen", { roll: lock });
      return this.#room(s, rollRoom(s), `${L("EDRPG.base.viaSide")} ${how}`);
   }

   static async #onDoor() {
      const s = this.state;
      const roll = d(10);
      if (roll % 2) return BaseExplorer.#corridor.call(this, s, L("EDRPG.base.doorCorridor", { roll }));
      return this.#room(s, rollRoom(s), L("EDRPG.base.doorRoom", { roll }));
   }

   static async #onCorridorDoor() {
      const s = this.state;
      return this.#room(s, rollRoom(s), L("EDRPG.base.fromCorridor"));
   }

   static async #onCorridor() {
      return BaseExplorer.#corridor.call(this, this.state, "");
   }

   static async #corridor(s, how) {
      const r1 = d(10);
      const r2 = d(10);
      const r3 = d(10);
      const [, length, doorTable] = pick(CORRIDORS, r1);
      const doors = pick(doorTable, r2)[1];
      const end = pick(CORRIDOR_ENDS, r3)[1];
      const html = `<b><i class="fa-solid fa-road"></i> ${L("EDRPG.base.corridor", { length })}</b>${how ? ` <span class="muted">${how}</span>` : ""}<br>${L("EDRPG.base.corridorDoors", { n: doors })} · ${L(`EDRPG.base.end.${end}`)} <span class="muted">(${r1}, ${r2}, ${r3})</span>`;
      return this.#log(s, html);
   }

   static async #onAlert() {
      const s = this.state;
      s.alert = !s.alert;
      return this.#log(s, `<i class="fa-solid fa-bell"></i> ${L(s.alert ? "EDRPG.base.alertOn" : "EDRPG.base.alertOff")}`);
   }

   static async #onTrack() {
      const s = this.state;
      return game.edrpg.trackCombat({ faction: BASE_TYPES[s.type].faction, scale: "personal", alertCheck: !s.alert });
   }

   static async #onOpenLog() {
      this.entry.sheet.render({ force: true });
   }
}

/** Open the explorer for a base journal entry. */
export async function openBase(entry) {
   if (typeof entry === "string") entry = await fromUuid(entry);
   if (!entry?.getFlag("edrpg", "base")) return null;
   const existing = foundry.applications.instances.get(`edrpg-base-${entry.id}`);
   if (existing) return existing.render({ force: true });
   return new BaseExplorer(entry, { id: `edrpg-base-${entry.id}` }).render({ force: true });
}

/**
 * The GM's dialog for a new base.
 *
 * @param {object} [preset]  { type, size, target, alert, name }
 */
export async function openBaseGenerator(preset = {}) {
   const type = preset.type ?? "corporate";
   const roomsOf = (t) => BASE_TYPES[t].rooms.filter((r) => r.range).map((r) => `<option value="${r.key}"${r.key === preset.target ? " selected" : ""}>${esc(r.name)}</option>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.base.newTitle"), icon: "fa-solid fa-building-shield" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<p class="hint">${L("EDRPG.base.intro")}</p>
         <div class="form-group"><label>${L("EDRPG.base.typeLabel")}</label><div class="form-fields"><select name="type">${Object.keys(BASE_TYPES).map((k) => `<option value="${k}"${k === type ? " selected" : ""}>${L(`EDRPG.base.type.${k}`)}</option>`).join("")}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.base.sizeLabel")}</label><div class="form-fields"><select name="size">${Object.keys(BASE_SIZES).map((k) => `<option value="${k}"${k === (preset.size ?? "small") ? " selected" : ""}>${L(`EDRPG.base.size.${k}`)} (${BASE_SIZES[k]})</option>`).join("")}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.base.targetLabel")}</label><div class="form-fields"><select name="target"><option value="">—</option>${roomsOf(type)}</select></div><p class="hint">${L("EDRPG.base.targetHint")}</p></div>
         <div class="form-group"><label>${L("EDRPG.base.alertLabel")}</label><div class="form-fields"><input type="checkbox" name="alert"${preset.alert ? " checked" : ""}></div></div>
         <div class="form-group"><label>${L("EDRPG.base.nameLabel")}</label><div class="form-fields"><input type="text" name="name" value="${esc(preset.name ?? "")}"></div></div>`,
      render: (_e, dialog) => {
         const root = dialog.element ?? dialog;
         root.querySelector("[name=type]").addEventListener("change", (ev) => (root.querySelector("[name=target]").innerHTML = `<option value="">—</option>${roomsOf(ev.target.value)}`));
      },
      ok: { label: "EDRPG.base.create", icon: "fa-solid fa-building-shield" },
      rejectClose: false,
   });
   if (!input) return null;
   return createBase({ type: input.type, size: input.size, target: input.target, alert: !!input.alert, name: input.name });
}

/** How many office workers are in a group (the opponent count for the difficulty). */
export function workersCount(difficulty) {
   const { players } = partyInfo();
   const roll = d(10);
   const add = { easy: [[4, -2], [7, -1], [10, 0]], medium: [[4, 0], [7, 1], [10, 2]], hard: [[4, 3], [7, 4], [10, 5]] }[difficulty].find(([m]) => roll <= m)[1];
   return { roll, count: Math.max(1, players + add) };
}
