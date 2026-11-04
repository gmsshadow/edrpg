/**
 * A character's fleet: the ships and vehicles they own (system.owner on the craft holds the character's UUID).
 *
 * - The character sheet lists them; dropping a craft on the sheet assigns it, and one can be marked as the current
 *   ship (flags.edrpg.activeShip).
 * - Between Adventures uses the character's own ships, the current one first.
 * - Character creation (Core Rules p.38): choose one of the eight starting ships. It is copied from the compendium,
 *   given the name the player chooses, and owned and piloted by the character. The Sidewinder Discovery comes with a
 *   Scarab SRV. A character with a partner needs a ship with room for them (a Hauler or an Adder).
 */
import { isCraft } from "./data/vehicle.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** The eight starting ships (p.38), as named in the Spaceships compendium; `partner`: room for a partner (p.38). */
export const STARTING_SHIPS = [
   { name: "Sidewinder – FD-4", key: "sidewinderFd4", partner: false },
   { name: "Sidewinder – Warden DCC", key: "sidewinderWarden", partner: false },
   { name: "Sidewinder – Discovery Alpha", key: "sidewinderDiscovery", partner: false, srv: true },
   { name: "Eagle Mk II – Interceptor MR 1", key: "eagleInterceptor", partner: false },
   { name: "Eagle Mk II – Defender 3400", key: "eagleDefender", partner: false },
   { name: "Hauler – Hatchback Zeta", key: "haulerZeta", partner: true },
   { name: "Hauler – Vantage Drigger", key: "haulerDrigger", partner: true },
   { name: "Adder – Cornucopia", key: "adderCornucopia", partner: true },
];

/** The Scarab SRV variants for the Sidewinder Discovery (Core Rules p.221). */
export const DISCOVERY_SRVS = ["Scarab SRV – Surveyor", "Scarab SRV – Ranger", "Scarab SRV – Interceptor", "Scarab SRV – Prowler"];

/** Most you can spend building your own starting ship instead (p.38). */
export const OWN_SHIP_BUDGET = 100000;

/**
 * The craft a character owns: ships first, then vehicles, by name.
 *
 * @param {Actor} actor
 *
 * @returns {Actor[]}
 */
export function fleetOf(actor) {
   if (!actor?.uuid) return [];
   return (game.actors?.filter((a) => isCraft(a) && a.system.owner === actor.uuid) ?? []).sort((a, b) => Number(b.type === "ship") - Number(a.type === "ship") || a.name.localeCompare(b.name));
}

/** The character's current ship, if it's still theirs. */
export function activeShip(actor) {
   const uuid = actor?.getFlag?.("edrpg", "activeShip");
   return uuid ? (fleetOf(actor).find((a) => a.uuid === uuid) ?? null) : null;
}

/**
 * Does this character have a partner (a Partner background, or a partner actor hosted by them)?
 *
 * @param {Actor} actor
 *
 * @returns {boolean}
 */
export function hasPartner(actor) {
   const bg = (actor.itemTypes?.background ?? []).some((b) => b.getFlag?.("edrpg", "partner") || b.name?.trim().toLowerCase() === "partner");
   return bg || !!game.actors?.some((a) => a.type === "partner" && a.system.host === actor.uuid);
}

/**
 * Give a craft to a character (or take it away with null).
 *
 * @param {Actor} craft
 *
 * @param {Actor|null} owner
 *
 * @returns {Promise<void>}
 */
export async function assignCraft(craft, owner) {
   if (!isCraft(craft)) return;
   if (!craft.isOwner) return void ui.notifications.warn(L("EDRPG.fleet.noPermission", { craft: craft.name }));
   await craft.update({ "system.owner": owner?.uuid ?? "" });
   if (owner && craft.type === "ship" && !activeShip(owner) && owner.isOwner) await owner.setFlag("edrpg", "activeShip", craft.uuid);
}

/**
 * Mark a ship as the character's current one.
 *
 * @param {Actor} actor
 *
 * @param {Actor} ship
 */
export async function setActiveShip(actor, ship) {
   if (actor.isOwner) await actor.setFlag("edrpg", "activeShip", ship?.uuid ?? null);
}

/** The players who own a character get full ownership of their craft. */
function ownershipFor(actor) {
   const ownership = { default: 0 };
   for (const u of game.users ?? []) if (!u.isGM && actor.testUserPermission(u, "OWNER")) ownership[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
   return ownership;
}

/** A compendium actor's data by name. */
async function packActor(packId, name) {
   const pack = game.packs.get(`edrpg.${packId}`);
   const hit = (await pack?.getIndex())?.find((e) => e.name === name);
   if (!hit) return null;
   const doc = await pack.getDocument(hit._id);
   return doc ? game.actors.fromCompendium(doc) : null;
}

/** The "Player Ships" folder (made if needed). */
async function fleetFolder() {
   const name = L("EDRPG.fleet.folder");
   return game.folders.find((f) => f.type === "Actor" && f.name === name) ?? Folder.implementation.create({ name, type: "Actor" });
}

/**
 * Copy a craft from the compendium into a character's fleet.
 *
 * @param {Actor} actor       The owner.
 *
 * @param {string} packId     ships | vehicles
 *
 * @param {string} model      Compendium name.
 *
 * @param {object} [options]
 *
 * @param {string} [options.name]   The name to give it (default: the model).
 *
 * @param {boolean} [options.pilot] Make the owner its pilot.
 *
 * @returns {Promise<Actor|null>}
 */
export async function addCraftFromPack(actor, packId, model, { name = "", pilot = true } = {}) {
   const data = await packActor(packId, model);
   if (!data) {
      ui.notifications.warn(L("EDRPG.fleet.notFound", { name: model }));
      return null;
   }
   const folder = await fleetFolder();
   const finalName = name.trim() || model;
   foundry.utils.mergeObject(data, {
      name: finalName,
      folder: folder?.id ?? null,
      ownership: ownershipFor(actor),
      system: { owner: actor.uuid, model, ...(pilot ? { pilot: actor.uuid } : {}) },
      prototypeToken: { name: finalName, actorLink: true },
   });
   return Actor.implementation.create(data);
}

/**
 * Character creation: choose a starting ship (p.38).
 *
 * @param {Actor} actor
 *
 * @returns {Promise<Actor|null>}  The new ship, or null (cancelled, or building their own).
 */
export async function promptStartingShip(actor) {
   const partner = hasPartner(actor);
   const option = (s) => `<option value="${s.key}"${!s.partner && partner ? " disabled" : ""}>${esc(s.name)}</option>`;
   const firstOk = STARTING_SHIPS.find((s) => s.partner || !partner);
   const row = (label, field, hint = "", cls = "") => `<div class="form-group ${cls}"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const content = `
      <p class="hint">${L("EDRPG.fleet.startIntro")}</p>
      ${partner ? `<p class="ed-between-warn">${L("EDRPG.fleet.partnerRule")}</p>` : ""}
      ${row(L("EDRPG.fleet.ship"), `<select name="ship">${STARTING_SHIPS.map(option).join("")}<option value="own">${L("EDRPG.fleet.buildOwn")}</option></select>`)}
      <p class="hint ed-ship-blurb"></p>
      ${row(L("EDRPG.fleet.name"), `<input type="text" name="name" placeholder="">`, L("EDRPG.fleet.nameHint"), "not-own")}
      ${row(L("EDRPG.fleet.srv"), `<select name="srv">${DISCOVERY_SRVS.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}</select>`, L("EDRPG.fleet.srvHint"), "srv-only")}`;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.fleet.startTitle", { name: actor.name }), icon: "fa-solid fa-shuttle-space" },
      classes: ["edrpg", "edrpg-dialog", "edrpg-starting-ship"],
      position: { width: 440 },
      content,
      ok: { label: "EDRPG.fleet.take", icon: "fa-solid fa-check" },
      render: (_event, dialog) => {
         const root = dialog.element ?? dialog;
         const select = root.querySelector("[name=ship]");
         if (firstOk) select.value = firstOk.key;
         const sync = () => {
            const pick = STARTING_SHIPS.find((s) => s.key === select.value);
            root.querySelector(".ed-ship-blurb").textContent = pick ? L(`EDRPG.fleet.blurb.${pick.key}`) : L("EDRPG.fleet.buildOwnHint", { budget: OWN_SHIP_BUDGET.toLocaleString() });
            root.querySelector("[name=name]").placeholder = pick?.name ?? "";
            for (const el of root.querySelectorAll(".srv-only")) el.hidden = !pick?.srv;
            for (const el of root.querySelectorAll(".not-own")) el.hidden = !pick;
            dialog.setPosition?.({ height: "auto" });
         };
         select.addEventListener("change", sync);
         sync();
      },
      rejectClose: false,
   });
   if (!input) return null;
   if (input.ship === "own") {
      await actor.update({ "system.creation.ship": true });
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="edrpg edrpg-chat"><p>${L("EDRPG.fleet.buildOwnChat", { name: esc(actor.name), budget: OWN_SHIP_BUDGET.toLocaleString() })}</p></div>` });
      return null;
   }
   const pick = STARTING_SHIPS.find((s) => s.key === input.ship);
   if (!pick || (!pick.partner && partner)) return null;
   const ship = await addCraftFromPack(actor, "ships", pick.name, { name: input.name ?? "" });
   if (!ship) return null;
   const extras = [];
   if (pick.srv && input.srv) {
      const srv = await addCraftFromPack(actor, "vehicles", input.srv, { name: "", pilot: true });
      if (srv) extras.push(srv);
   }
   await actor.setFlag("edrpg", "activeShip", ship.uuid);
   await actor.update({ "system.creation.ship": true });
   const link = (a) => `@UUID[${a.uuid}]{${esc(a.name)}}`;
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="edrpg edrpg-chat"><p>${L("EDRPG.fleet.tookShip", { name: esc(actor.name), ship: link(ship), model: esc(pick.name) })}${extras.length ? ` ${L("EDRPG.fleet.withSrv", { srv: extras.map(link).join(", ") })}` : ""}</p></div>`,
   });
   return ship;
}

/**
 * The Fleet section of the character sheet.
 *
 * @param {Actor} actor
 *
 * @returns {object[]}
 */
export function fleetView(actor) {
   const current = actor.getFlag?.("edrpg", "activeShip");
   return fleetOf(actor).map((a) => {
      const s = a.system;
      return {
         uuid: a.uuid,
         name: a.name,
         img: a.img,
         model: s.model && s.model !== a.name ? s.model : "",
         kind: L(a.type === "ship" ? "EDRPG.ship.tag" : "EDRPG.vehicle.tag"),
         isShip: a.type === "ship",
         active: a.uuid === current,
         hull: `${s.hull?.value ?? 0}/${s.hull?.max ?? 0}`,
         destroyed: !!s.destroyed || (s.hull?.value ?? 1) <= 0,
         pilot: s.pilotActor?.name ?? "",
      };
   });
}

/**
 * Keep owners' sheets up to date when a craft joins, leaves or changes (call once at init).
 */
export function registerFleetHooks() {
   const refresh = (uuid) => {
      const actor = uuid ? fromUuidSync(uuid) : null;
      if (actor?.sheet?.rendered) actor.sheet.render();
   };
   Hooks.on("updateActor", (actor, changes) => {
      if (!isCraft(actor)) return;
      const before = foundry.utils.getProperty(changes, "system.owner");
      refresh(actor.system.owner);
      if (before !== undefined) for (const a of game.actors) if (a.type === "character" && a.sheet?.rendered) a.sheet.render();
   });
   Hooks.on("createActor", (actor) => isCraft(actor) && refresh(actor.system.owner));
   Hooks.on("deleteActor", (actor) => isCraft(actor) && refresh(actor.system.owner));
}
