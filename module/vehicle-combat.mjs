import { rollCraftAttack, applyCraftDamage } from "./dice/craft-attack.mjs";
import { rollCrashDamage } from "./dice/damage.mjs";
import { zoneOf, moveToZone } from "./zones.mjs";

/**
 * Vehicle combat turn (Core Rules pp.65–68 for Space Combat, 72–75 for the vehicle differences).
 *
 * A turn: Adjust Speed (within Accelerate/Decelerate) → Equipment → Recharge Shields → Check for Obstacles (GM) →
 * Combat Action. At-distance actions: Chicken, Flee, Joust, Pass, Snipe, Strafe. Up-close: Broadsides, Disengage,
 * Tail (the vehicle Dogfight), Pass, Ram. Pursuits happen when a Fleeing vehicle is Jousted or a Disengaging one is
 * Tailed.
 *
 * Rolls are made on the acting player's client; anything that changes another actor (or a GM's chat card) goes
 * through the active GM.
 */

const SOCKET = "system.edrpg";
const TEMPLATE = "systems/edrpg/templates/chat/vehicle-event.hbs";

/** Combat actions by zone (Core Rules p.74). */
export const VEHICLE_ACTIONS = {
   atDistance: ["joust", "snipe", "strafe", "chicken", "flee", "pass", "rescue"],
   upClose: ["tail", "broadsides", "ram", "disengage", "pass", "rescue"],
};

/** Action icons for the sheet. */
export const ACTION_ICONS = {
   joust: "fa-solid fa-angles-right",
   snipe: "fa-solid fa-crosshairs",
   strafe: "fa-solid fa-wind",
   chicken: "fa-solid fa-car-burst",
   flee: "fa-solid fa-person-running",
   pass: "fa-solid fa-hourglass-half",
   tail: "fa-solid fa-route",
   broadsides: "fa-solid fa-arrows-left-right",
   ram: "fa-solid fa-truck-monster",
   disengage: "fa-solid fa-arrow-right-from-bracket",
   rescue: "fa-solid fa-hand-holding-medical",
};

/** Obstacle tables: [highest roll, result] (Core Rules p.73). */
export const OBSTACLE_TABLES = {
   light: [[7, "none"], [9, "rough"], [10, "slope"]],
   medium: [[6, "none"], [8, "rough"], [9, "large"], [10, "slope"]],
   heavy: [[5, "none"], [7, "rough"], [9, "large"], [10, "slope"]],
};

/** Sudden Slope table by gravity: safe up to `safe`, risky up to `risky`, auto failure above; impact Damage. */
export const SLOPE_TABLE = {
   lt05: { safe: 3, risky: 5, damage: 5 },
   g05: { safe: 4, risky: 6, damage: 5 },
   g1: { safe: 5, risky: 7, damage: 10 },
   g2: { safe: 6, risky: 8, damage: 20 },
   g3: { safe: 7, risky: 9, damage: 30 },
   g4: { safe: 8, risky: 10, damage: 40 },
};

/** Vehicle defaults at the start of a battle: Speed 5 or the maximum, whichever is less (p.72). */
export const START_SPEED = 5;

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

/* -------------------------------------------- */
/*  GM relay                                    */
/* -------------------------------------------- */

let queue = Promise.resolve();
/** Run operations one at a time so chat-card updates don't overwrite each other. */
function enqueue(fn) {
   const next = queue.then(fn, fn);
   queue = next.catch((err) => console.error("edrpg | vehicle combat", err));
   return next;
}

const OPS = {
   /** Update an actor. */
   async update({ uuid, data }) {
      const actor = await fromUuid(uuid);
      if (actor) await actor.update(data);
   },
   /** Move a vehicle to a zone (and its token on a combat map). */
   async zone({ uuid, zone, nearUuid }) {
      const actor = await fromUuid(uuid);
      if (actor) await moveToZone(actor, zone, nearUuid ? await fromUuid(nearUuid) : null);
   },
   /** Damage a vehicle (Shields then Hull) and record it on a chat card. */
   async damage({ uuid, amount, messageId, extra }) {
      const actor = await fromUuid(uuid);
      if (!actor || amount <= 0) return;
      const applied = await applyCraftDamage(actor, { total: amount });
      if (extra) await actor.update(extra);
      if (messageId) await editEvent(game.messages.get(messageId), (s) => s.applied.push(applied));
   },
   /**
    * A flying bomb connects: extra Damage to the target (less if its shields are still up after the impact), then the
    * bomb is destroyed.
    */
   async bomb({ uuid, bomberUuid, messageId }) {
      const target = await fromUuid(uuid);
      const bomber = await fromUuid(bomberUuid);
      if (!bomber) return;
      const b = bomber.system.bomb;
      if (target) {
         const sh = target.system.shields;
         const up = sh.max > 0 && !sh.down && sh.value > 0;
         const applied = await applyCraftDamage(target, { total: up ? b.vsShields : b.damage });
         if (messageId) {
            await editEvent(game.messages.get(messageId), (s) => {
               s.applied.push(applied);
               s.notes.push(L(up ? "EDRPG.drone.bombShields" : "EDRPG.drone.bombHull", { name: esc(bomber.name), damage: up ? b.vsShields : b.damage }));
            });
         }
      }
      if (bomber.system.hull.value > 0) await bomber.update({ "system.hull.value": 0, "system.speed": 0 });
   },
   /** Change a chat card's state. */
   async event({ messageId, patch }) {
      await editEvent(game.messages.get(messageId), (s) => foundry.utils.mergeObject(s, patch));
   },
   /** Resolve a Chicken once the target has chosen (always run by the GM). */
   async chicken({ messageId, choice }) {
      await resolveChicken(game.messages.get(messageId), choice);
   },
};

/**
 * Can this client run an operation itself?
 *
 * @param {string} name
 *
 * @param {object} payload
 *
 * @returns {boolean}
 */
function canRunLocally(name, payload) {
   if (game.user.isGM) return true;
   const owns = (uuid) => !uuid || !!fromUuidSync(uuid)?.isOwner;
   const ownsMessage = (id) => !id || !!game.messages.get(id)?.isOwner;
   if (name === "update" || name === "zone") return owns(payload.uuid);
   if (name === "damage") return owns(payload.uuid) && ownsMessage(payload.messageId);
   if (name === "event") return ownsMessage(payload.messageId);
   if (name === "bomb") return owns(payload.uuid) && owns(payload.bomberUuid) && ownsMessage(payload.messageId);
   return false;
}

/**
 * Run an operation here if allowed, otherwise through the active GM.
 *
 * @param {string} name
 *
 * @param {object} payload
 *
 * @returns {Promise<void>}
 */
async function op(name, payload) {
   if (canRunLocally(name, payload)) return enqueue(() => OPS[name](payload));
   if (!game.users.activeGM) return void ui.notifications.warn("EDRPG.contest.needsGM", { localize: true });
   game.socket.emit(SOCKET, { action: "vehicleOp", payload: { name, payload } });
}

const update = (actor, data) => op("update", { uuid: actor.uuid, data });
const setZone = (actor, zone, near = null) => op("zone", { uuid: actor.uuid, zone, nearUuid: near?.uuid ?? null });
const damage = (actor, amount, message, extra = null) => op("damage", { uuid: actor.uuid, amount, messageId: message?.id ?? null, extra });

/** Socket listener and combat hooks (call once, at `ready`). */
export function registerVehicleCombat() {
   game.socket.on(SOCKET, (data) => {
      if (data?.action !== "vehicleOp" || !game.user.isActiveGM) return;
      const { name, payload } = data.payload ?? {};
      if (OPS[name]) enqueue(() => OPS[name](payload));
   });

   // Battle start: vehicles begin at-distance at Speed 5 (or their maximum).
   Hooks.on("combatStart", (combat) => {
      if (!game.user.isActiveGM) return;
      for (const actor of vehiclesIn(combat)) {
         const sys = actor.system;
         enqueue(() =>
            actor.update({
               "system.speed": sys.speed || Math.min(START_SPEED, sys.topSpeed),
               "system.zone": "atDistance",
               "system.combat": freshState(),
            }),
         );
      }
   });

   Hooks.on("combatTurnChange", (combat, prior) => {
      if (!game.user.isActiveGM) return;
      const previous = prior?.combatantId ? combat.combatants.get(prior.combatantId)?.actor : null;
      if (previous?.type === "vehicle") enqueue(() => previous.update({ "system.combat.turnSpeed": null }));
      const actor = combat.combatant?.actor;
      if (actor?.type === "vehicle") enqueue(() => startVehicleTurn(actor, combat));
   });

   // Destruction: runs on the client that dropped the Hull to 0.
   Hooks.on("edrpg.vehicleDestroyed", (actor) => enqueue(() => onVehicleDestroyed(actor)));

   Hooks.on("deleteCombat", (combat) => {
      if (!game.user.isActiveGM) return;
      for (const actor of vehiclesIn(combat)) enqueue(() => actor.update({ "system.combat": freshState() }));
   });
}

/** @returns {object} A clean combat-turn state. */
function freshState() {
   return { turnSpeed: null, action: "", sniping: false, fleeing: false, disengaging: false, rammed: false, lostAction: false, pass: 0, escaped: false };
}

/**
 * Vehicle actors in a combat.
 *
 * @param {Combat} combat
 *
 * @returns {Actor[]}
 */
function vehiclesIn(combat) {
   const seen = new Set();
   return combat.combatants
      .map((c) => c.actor)
      .filter((a) => a?.type === "vehicle" && !seen.has(a.uuid) && seen.add(a.uuid));
}

/**
 * Is this vehicle in a started combat?
 *
 * @param {Actor} actor
 *
 * @returns {boolean}
 */
export function inCombat(actor) {
   return !!game.combats?.some((c) => c.started && c.combatants.some((cb) => cb.actor === actor || cb.actor?.uuid === actor.uuid));
}

/* -------------------------------------------- */
/*  Chat cards                                  */
/* -------------------------------------------- */

/**
 * Post a vehicle combat card.
 *
 * @param {Actor} speaker
 *
 * @param {object} state  { kind, title, subtitle, rolls[], outcome, outcomeClass, notes[], ... }
 *
 * @param {Roll[]} [rolls]
 *
 * @param {object} [options]  { whisperGM }
 *
 * @returns {Promise<ChatMessage>}
 */
async function postEvent(speaker, state, rolls = [], { whisperGM = false } = {}) {
   state = { rolls: [], notes: [], applied: [], ...state };
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: speaker }),
      content: await foundry.applications.handlebars.renderTemplate(TEMPLATE, state),
      rolls,
      sound: rolls.length && !game.dice3d ? CONFIG.sounds.dice : null,
      whisper: whisperGM ? ChatMessage.getWhisperRecipients("GM") : [],
      flags: { edrpg: { vehicleEvent: state } },
   });
}

/**
 * Change a card's state and re-render it.
 *
 * @param {ChatMessage} message
 *
 * @param {(state: object) => void} mutate
 */
async function editEvent(message, mutate) {
   const state = foundry.utils.deepClone(message?.getFlag("edrpg", "vehicleEvent"));
   if (!state) return;
   mutate(state);
   await message.update({
      content: await foundry.applications.handlebars.renderTemplate(TEMPLATE, state),
      "flags.edrpg.vehicleEvent": state,
   });
}

/**
 * A d10 roll with its breakdown for a card.
 *
 * @param {string} name
 *
 * @param {{label: string, value: number}[]} parts
 *
 * @returns {Promise<{roll: Roll, natural: number, total: number, view: object}>}
 */
async function rollWith(name, parts) {
   const bonus = parts.reduce((n, p) => n + p.value, 0);
   const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
   const natural = roll.dice[0].total;
   return {
      roll,
      natural,
      total: roll.total,
      view: {
         name,
         total: roll.total,
         parts: [{ label: L("EDRPG.contest.d10"), value: `${natural}` }, ...parts.filter((p) => p.value || p.always).map((p) => ({ label: p.label, value: signed(p.value) }))],
      },
   };
}

/* -------------------------------------------- */
/*  Turn start                                  */
/* -------------------------------------------- */

/**
 * Start of a vehicle's turn: Fleeing vehicles escape, Disengaging ones reach at-distance, last turn's effects end,
 * shields recharge (or charge up), speed may be adjusted, and the GM is offered an obstacle check.
 *
 * @param {Actor} actor
 *
 * @param {Combat} [combat]
 */
export async function startVehicleTurn(actor, combat = null) {
   const sys = actor.system;
   const c = sys.combat;
   const data = {
      "system.combat.turnSpeed": sys.speed,
      "system.combat.action": "",
      "system.combat.sniping": false,
      "system.combat.rammed": false,
      "system.combat.lostAction": false,
      "system.combat.pass": Math.max(0, c.pass - 1),
   };
   const notes = [];
   if (c.escaped || sys.destroyed) return actor.update(data);
   if (c.fleeing) {
      data["system.combat.fleeing"] = false;
      data["system.combat.escaped"] = true;
      notes.push(L("EDRPG.vcombat.escaped", { name: esc(actor.name) }));
   }
   let zone = zoneOf(actor);
   if (c.disengaging) {
      data["system.combat.disengaging"] = false;
      notes.push(L("EDRPG.vcombat.disengaged", { name: esc(actor.name) }));
      zone = "atDistance";
   } else if (zone === "upClose" && combat && !enemiesUpClose(actor, combat).length) {
      notes.push(L("EDRPG.vcombat.noOneUpClose", { name: esc(actor.name) }));
      zone = "atDistance";
   }
   // Shields: +recharge while up; while down they charge up and come back at half (p.65).
   const sh = sys.shields;
   if (sh.max > 0) {
      const value = Math.min(sh.max, sh.value + sh.recharge);
      if (sh.down) {
         data["system.shields.value"] = value;
         if (value >= sys.shields.halfway) {
            data["system.shields.down"] = false;
            notes.push(L("EDRPG.vcombat.shieldsBack", { value }));
         } else notes.push(L("EDRPG.vcombat.shieldsCharging", { value, need: sys.shields.halfway }));
      } else if (value !== sh.value) {
         data["system.shields.value"] = value;
         notes.push(L("EDRPG.vcombat.shieldsRecharge", { before: sh.value, value }));
      }
   }
   await actor.update(data);
   if (zone !== zoneOf(actor)) await moveToZone(actor, zone);
   if (data["system.combat.escaped"]) {
      return postEvent(actor, { kind: "turn", title: L("EDRPG.vcombat.turnStart", { name: actor.name }), notes, outcome: L("EDRPG.vcombat.escapedShort"), outcomeClass: "success" });
   }
   const range = actor.system.speedRange;
   notes.unshift(L("EDRPG.vcombat.speedRange", { speed: sys.speed, min: range.min, max: range.max }));
   return postEvent(actor, {
      kind: "turn",
      title: L("EDRPG.vcombat.turnStart", { name: actor.name }),
      subtitle: L("EDRPG.vcombat.turnOrder"),
      notes: sys.flying ? [...notes, L("EDRPG.drone.flyingNoObstacles", { name: esc(actor.name) })] : notes,
      obstacle: sys.flying ? null : { vehicleUuid: actor.uuid, done: false },
   });
}

/**
 * Enemy vehicles up-close in a combat (different token disposition, still in the fight).
 *
 * @param {Actor} actor
 *
 * @param {Combat} combat
 *
 * @returns {Actor[]}
 */
function enemiesUpClose(actor, combat) {
   const mine = actor.getActiveTokens?.()[0]?.document.disposition ?? actor.prototypeToken?.disposition;
   return combat.combatants
      .filter((cb) => cb.actor?.type === "vehicle" && cb.actor !== actor && !cb.defeated)
      .filter((cb) => (cb.token?.disposition ?? cb.actor.prototypeToken?.disposition) !== mine)
      .map((cb) => cb.actor)
      .filter((a) => !a.system.combat.escaped && a.system.hull.value > 0 && zoneOf(a) === "upClose");
}

/* -------------------------------------------- */
/*  Speed                                       */
/* -------------------------------------------- */

/**
 * Set a vehicle's speed, within Accelerate/Decelerate during its turn; locked during combat outside its turn.
 *
 * @param {Actor} actor
 *
 * @param {number} speed
 *
 * @returns {Promise<Actor|void>}
 */
export async function setVehicleSpeed(actor, speed) {
   const sys = actor.system;
   const range = sys.speedRange;
   speed = Math.max(0, Math.min(speed, sys.topSpeed));
   if (range && (speed < range.min || speed > range.max)) {
      return void ui.notifications.warn(L("EDRPG.vcombat.speedLimit", { min: range.min, max: range.max }));
   }
   if (!range && inCombat(actor) && !game.user.isGM) {
      return void ui.notifications.warn("EDRPG.vcombat.speedLocked", { localize: true });
   }
   return actor.update({ "system.speed": speed });
}

/* -------------------------------------------- */
/*  Obstacles and slopes                        */
/* -------------------------------------------- */

/**
 * The GM checks for obstacles in a vehicle's path (Core Rules pp.73–74). The GM can roll, or choose the result.
 *
 * @param {Actor} actor
 *
 * @param {ChatMessage} [fromMessage]  A turn-start card to mark as done.
 */
export async function checkObstacles(actor, fromMessage = null) {
   if (!game.user.isGM) return;
   const sys = actor.system;
   if (sys.flying) return void ui.notifications.info(L("EDRPG.drone.flyingNoObstaclesPlain", { name: actor.name }));
   if (sys.speed < 1) return void ui.notifications.info(L("EDRPG.vcombat.stationary", { name: actor.name }));
   const tables = Object.fromEntries(Object.keys(OBSTACLE_TABLES).map((k) => [k, `EDRPG.vcombat.table.${k}`]));
   const gravities = Object.fromEntries(Object.keys(SLOPE_TABLE).map((k) => [k, `EDRPG.vcombat.gravity.${k}`]));
   const results = { roll: "EDRPG.vcombat.rollTable", none: "EDRPG.vcombat.obstacle.none", rough: "EDRPG.vcombat.obstacle.rough", large: "EDRPG.vcombat.obstacle.large", slope: "EDRPG.vcombat.obstacle.slope" };
   const select = (name, choices, selected) =>
      `<select name="${name}">${Object.entries(choices).map(([k, v]) => `<option value="${k}" ${k === selected ? "selected" : ""}>${L(v)}</option>`).join("")}</select>`;
   const row = (label, field, hint = "") => `<div class="form-group"><label>${L(label)}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${L(hint)}</p>` : ""}</div>`;
   const content =
      `<p>${L("EDRPG.vcombat.obstacleIntro", { name: esc(actor.name), speed: sys.speed })}</p>` +
      row("EDRPG.vcombat.obstacleTable", select("table", tables, game.settings.get("edrpg", "vehicleObstacleTable"))) +
      row("EDRPG.vcombat.gravityLabel", select("gravity", gravities, game.settings.get("edrpg", "vehicleGravity"))) +
      row("EDRPG.vcombat.result", select("result", results, "roll"), "EDRPG.vcombat.resultHint");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.vcombat.checkObstacles"), icon: "fa-solid fa-mountain" },
      classes: ["edrpg", "edrpg-dialog"],
      content,
      ok: { label: "EDRPG.vcombat.check", icon: "fa-solid fa-dice-d10" },
      rejectClose: false,
   });
   if (!input) return;
   await game.settings.set("edrpg", "vehicleObstacleTable", input.table);
   await game.settings.set("edrpg", "vehicleGravity", input.gravity);
   let result = input.result;
   const rolls = [];
   let rolled = null;
   if (result === "roll") {
      const roll = await new Roll("1d10").evaluate();
      rolls.push(roll);
      rolled = roll.total;
      result = OBSTACLE_TABLES[input.table].find(([max]) => rolled <= max)[1];
   }
   if (fromMessage) await op("event", { messageId: fromMessage.id, patch: { obstacle: { done: true } } });
   const check = obstacleCheck(actor, result, input.gravity);
   const notes = [L(`EDRPG.vcombat.obstacleText.${result}`)];
   if (check?.note) notes.push(check.note);
   return postEvent(
      actor,
      {
         kind: "obstacle",
         title: L("EDRPG.vcombat.obstacleTitle", { name: actor.name }),
         subtitle: `${L(`EDRPG.vcombat.table.${input.table}`)}${rolled !== null ? ` — ${L("EDRPG.vcombat.rolled", { roll: rolled })}` : ""}`,
         outcome: L(`EDRPG.vcombat.obstacle.${result}`),
         outcomeClass: result === "none" || !check?.dn ? "success" : "failure",
         notes,
         pilotCheck: check?.dn ? { vehicleUuid: actor.uuid, ...check, done: false } : null,
      },
      rolls,
   );
}

/**
 * What an obstacle asks of the pilot.
 *
 * @param {Actor} actor
 *
 * @param {string} result  none | rough | large | slope
 *
 * @param {string} gravity  SLOPE_TABLE key
 *
 * @returns {object|null}  { kind, dn, speed, damage, onFail, note }
 */
export function obstacleCheck(actor, result, gravity) {
   const speed = actor.system.speed;
   if (result === "rough") return { kind: "rough", dn: speed * 2, speed, damage: 5 * speed, stop: false, alwaysLose: false };
   if (result === "large") return { kind: "large", dn: speed * 2, speed, damage: 10 * speed, stop: true, alwaysLose: false };
   if (result !== "slope") return null;
   const row = SLOPE_TABLE[gravity] ?? SLOPE_TABLE.g1;
   const band = speed <= row.safe ? "safe" : speed <= row.risky ? "risky" : "auto";
   const note = L(`EDRPG.vcombat.slope.${band}`, { speed, safe: row.safe, risky: row.risky, damage: row.damage });
   if (band === "safe") return { kind: "slope", dn: 0, note };
   if (band === "risky") return { kind: "slope", dn: 8, speed, damage: 0, stop: false, alwaysLose: false, note };
   return { kind: "slopeAuto", dn: 12, speed, damage: row.damage, stop: false, alwaysLose: true, note };
}

/**
 * The pilot's Vehicle Piloting check (+ Agility) against an obstacle or slope.
 *
 * @param {ChatMessage} message  The obstacle card.
 */
async function rollPilotCheck(message) {
   const state = message.getFlag("edrpg", "vehicleEvent");
   const check = state?.pilotCheck;
   const actor = check ? await fromUuid(check.vehicleUuid) : null;
   if (!actor || check.done) return;
   const sys = actor.system;
   const { roll, natural, total, view } = await rollWith(L("EDRPG.vcombat.pilotCheck"), [
      { label: L("EDRPG.vehicle.part.piloting"), value: sys.piloting, always: true },
      { label: L("EDRPG.vehicle.agility"), value: sys.agility, always: true },
   ]);
   view.parts.push({ label: L("EDRPG.vcombat.dn"), value: `${check.dn}` });
   const success = natural === 10 || (natural !== 1 && total >= check.dn);
   await op("event", { messageId: message.id, patch: { pilotCheck: { done: true } } });
   const notes = [];
   const extra = {};
   let loseAction = check.alwaysLose || !success;
   let hurt = 0;
   if (!success) {
      hurt = check.damage ?? 0;
      if (check.stop) extra["system.speed"] = 0;
   }
   if (check.kind === "rough") notes.push(L(success ? "EDRPG.vcombat.fail.roughOk" : "EDRPG.vcombat.fail.rough", { damage: hurt, speed: check.speed }));
   else if (check.kind === "large") notes.push(L(success ? "EDRPG.vcombat.fail.roughOk" : "EDRPG.vcombat.fail.large", { damage: hurt, speed: check.speed }));
   else if (check.kind === "slope") notes.push(L(success ? "EDRPG.vcombat.fail.slopeOk" : "EDRPG.vcombat.fail.slope"));
   else notes.push(L(success ? "EDRPG.vcombat.fail.slopeAutoOk" : "EDRPG.vcombat.fail.slopeAuto", { damage: hurt }));
   if (loseAction) extra["system.combat.lostAction"] = true;
   const card = await postEvent(
      actor,
      {
         kind: "pilot",
         title: L("EDRPG.vcombat.pilotCheckTitle", { name: actor.name }),
         subtitle: L(`EDRPG.vcombat.obstacle.${check.kind === "slopeAuto" ? "slope" : check.kind}`),
         rolls: [view],
         outcome: L(success ? "EDRPG.vcombat.success" : "EDRPG.vcombat.failure"),
         outcomeClass: success ? "success" : "failure",
         notes: loseAction ? [...notes, L("EDRPG.vcombat.noAction")] : notes,
      },
      [roll],
   );
   if (hurt) await damage(actor, hurt, card, Object.keys(extra).length ? extra : null);
   else if (Object.keys(extra).length) await update(actor, extra);
}

/* -------------------------------------------- */
/*  Targets and firing                          */
/* -------------------------------------------- */

/**
 * Choose a target vehicle: the user's single valid target, the only candidate, or one picked from a list.
 *
 * @param {Actor} actor
 *
 * @param {object} [options]
 *
 * @param {string} [options.zone]           Only targets in this zone.
 *
 * @param {(a: Actor) => boolean} [options.filter]
 *
 * @param {string} options.title
 *
 * @returns {Promise<Actor|null>}
 */
async function pickTarget(actor, { zone = null, filter = () => true, title, wrecks = false }) {
   const seen = new Set();
   const candidates = (canvas?.scene?.tokens ?? [])
      .map((t) => t.actor)
      .filter((a) => a?.type === "vehicle" && a !== actor && a.uuid !== actor.uuid && !seen.has(a.uuid) && seen.add(a.uuid))
      .filter((a) => (wrecks ? a.system.destroyed : !a.system.combat.escaped && !a.system.destroyed))
      .filter((a) => !zone || zoneOf(a) === zone)
      .filter(filter);
   if (!candidates.length) {
      ui.notifications.warn(L(wrecks ? "EDRPG.vdestroy.noStranded" : zone === "upClose" ? "EDRPG.vcombat.noTargetUpClose" : "EDRPG.vcombat.noTarget"));
      return null;
   }
   const targeted = [...game.user.targets].map((t) => t.actor).filter((a) => candidates.some((c) => c.uuid === a?.uuid));
   if (targeted.length === 1) return targeted[0];
   if (candidates.length === 1) return candidates[0];
   const options = candidates.map((a) => `<option value="${a.uuid}">${esc(a.name)} — ${L(`EDRPG.craft.zone.${zoneOf(a)}`)}</option>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title, icon: "fa-solid fa-crosshairs" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.vcombat.target")}</label><div class="form-fields"><select name="target">${options}</select></div></div>`,
      ok: { label: "EDRPG.vcombat.choose" },
      rejectClose: false,
   });
   return input ? (candidates.find((a) => a.uuid === input.target) ?? null) : null;
}

/**
 * Fire weapons one after another at a target.
 *
 * @param {Actor} actor
 *
 * @param {Actor} target
 *
 * @param {object} [options]
 *
 * @param {Item[]} [options.weapons]  Default: all of them.
 *
 * @param {boolean} [options.stopOnMiss]
 *
 * @param {number} [options.modifier]
 *
 * @param {string} [options.note]
 *
 * @param {string} [options.action]
 *
 * @returns {Promise<{fired: number, missed: boolean, left: Item[]}>}
 */
async function fireWeapons(actor, target, { weapons, stopOnMiss = false, modifier = 0, note = null, action = null } = {}) {
   weapons ??= sortedWeapons(actor);
   let fired = 0;
   let missed = false;
   for (const [i, weapon] of weapons.entries()) {
      const message = await rollCraftAttack(actor, weapon, { prompt: false, target, modifier, note, action });
      if (!message) continue;
      fired++;
      if (!message.getFlag("edrpg", "craftAttack")?.hit && stopOnMiss) {
         missed = true;
         return { fired, missed, left: weapons.slice(i + 1) };
      }
   }
   if (!weapons.length) ui.notifications.warn("EDRPG.vcombat.noWeapons", { localize: true });
   return { fired, missed, left: [] };
}

/**
 * @param {Actor} actor
 *
 * @returns {Item[]}
 */
function sortedWeapons(actor) {
   return [...actor.itemTypes.craftWeapon].sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

/**
 * @param {Actor} actor
 *
 * @returns {Item[]}
 */
function turrets(actor) {
   return sortedWeapons(actor).filter((w) => w.system.mount.kind === "turret");
}

/* -------------------------------------------- */
/*  Pursuits                                    */
/* -------------------------------------------- */

/**
 * A Pursuit: both roll D10 + Pursuit (p.68).
 *
 * @param {Actor} chaser
 *
 * @param {Actor} runner
 *
 * @param {"flee"|"disengage"} kind
 *
 * @returns {Promise<"chaser"|"runner"|"tie">}
 */
async function pursuit(chaser, runner, kind) {
   const a = await rollWith(chaser.name, [{ label: L("EDRPG.vehicle.pursuit"), value: chaser.system.pursuit, always: true }]);
   const b = await rollWith(runner.name, [{ label: L("EDRPG.vehicle.pursuit"), value: runner.system.pursuit, always: true }]);
   const winner = a.total > b.total ? "chaser" : b.total > a.total ? "runner" : "tie";
   const names = { chaser: esc(chaser.name), runner: esc(runner.name) };
   await postEvent(
      chaser,
      {
         kind: "pursuit",
         title: L("EDRPG.vcombat.pursuitTitle"),
         subtitle: L(`EDRPG.vcombat.pursuitKind.${kind}`, { chaser: chaser.name, runner: runner.name }),
         rolls: [a.view, b.view],
         outcome: L(`EDRPG.vcombat.pursuit.${kind}.${winner}`, names),
         outcomeClass: winner === "chaser" ? "success" : "failure",
      },
      [a.roll, b.roll],
   );
   return winner;
}

/* -------------------------------------------- */
/*  Combat actions                              */
/* -------------------------------------------- */

/**
 * Take a combat action.
 *
 * @param {Actor} actor
 *
 * @param {string} action  A key of {@link ACTION_ICONS}.
 */
export async function vehicleAction(actor, action) {
   const sys = actor.system;
   const zone = zoneOf(actor);
   if (sys.combat.escaped) return void ui.notifications.warn(L("EDRPG.vcombat.hasEscaped", { name: actor.name }));
   if (sys.destroyed) return void ui.notifications.warn(L("EDRPG.vdestroy.isDestroyed", { name: actor.name }));
   if (!VEHICLE_ACTIONS[zone].includes(action)) {
      return void ui.notifications.warn(L("EDRPG.vcombat.wrongZone", { action: L(`EDRPG.vcombat.action.${action}`), zone: L(`EDRPG.craft.zone.${zone}`) }));
   }
   if (sys.combat.lostAction) {
      const ok = await foundry.applications.api.DialogV2.confirm({
         window: { title: L(`EDRPG.vcombat.action.${action}`) },
         content: `<p>${L("EDRPG.vcombat.lostActionConfirm", { name: esc(actor.name) })}</p>`,
         rejectClose: false,
      });
      if (!ok) return;
   }
   const handler = ACTIONS[action];
   if (!handler) return;
   const done = await handler(actor);
   if (done !== false) await update(actor, { "system.combat.action": action });
}

/** Title for a target picker. */
const pickTitle = (action) => L("EDRPG.vcombat.pickTarget", { action: L(`EDRPG.vcombat.action.${action}`) });

/** Post a short "X does Y" card. */
const announce = (actor, action, target = null, notes = []) =>
   postEvent(actor, {
      kind: "action",
      title: L(`EDRPG.vcombat.action.${action}`),
      subtitle: target ? L("EDRPG.vcombat.versus", { name: actor.name, target: target.name }) : actor.name,
      notes: [L(`EDRPG.vcombat.actionText.${action}`, { name: esc(actor.name), target: esc(target?.name ?? "") }), ...notes],
   });

const ACTIONS = {
   /** Joust: fire everything at any target, then move up-close (drawing a Sniping target with you). */
   async joust(actor) {
      const target = await pickTarget(actor, { title: pickTitle("joust") });
      if (!target) return false;
      await announce(actor, "joust", target);
      if (target.system.combat.fleeing) {
         const winner = await pursuit(actor, target, "flee");
         if (winner !== "chaser") return;
         await fireWeapons(actor, target, { action: "EDRPG.vcombat.action.joust" });
         await update(target, { "system.combat.fleeing": false });
         await setZone(target, "upClose");
         await setZone(actor, "upClose", target);
         return;
      }
      await fireWeapons(actor, target, { action: "EDRPG.vcombat.action.joust" });
      if (target.system.combat.sniping && zoneOf(target) !== "upClose") await setZone(target, "upClose");
      await setZone(actor, "upClose", target);
   },

   /** Snipe: Defence 0 until the next turn, +1 To Hit with every weapon; stay at-distance. */
   async snipe(actor) {
      const target = await pickTarget(actor, { title: pickTitle("snipe") });
      if (!target) return false;
      await update(actor, { "system.combat.sniping": true });
      await announce(actor, "snipe", target);
      await fireWeapons(actor, target, { modifier: 1, note: "EDRPG.vcombat.snipeBonus", action: "EDRPG.vcombat.action.snipe" });
   },

   /** Strafe: fire weapons one at a time until one misses, then move up-close and Disengage. */
   async strafe(actor) {
      const target = await pickTarget(actor, { title: pickTitle("strafe"), filter: (a) => !a.system.combat.disengaging && !a.system.combat.fleeing });
      if (!target) return false;
      await announce(actor, "strafe", target);
      await fireWeapons(actor, target, { stopOnMiss: true, action: "EDRPG.vcombat.action.strafe" });
      await setZone(actor, "upClose", target);
      await update(actor, { "system.combat.disengaging": true });
   },

   /** Pass: one re-roll available until the end of the next turn. */
   async pass(actor) {
      await update(actor, { "system.combat.pass": 2 });
      await announce(actor, "pass");
   },

   /** Flee: escapes at the start of its next turn unless Jousted and caught. */
   async flee(actor) {
      await update(actor, { "system.combat.fleeing": true });
      await announce(actor, "flee");
   },

   /** Disengage: reaches at-distance at the start of its next turn unless Tailed and caught. No attack. */
   async disengage(actor) {
      await update(actor, { "system.combat.disengaging": true });
      await announce(actor, "disengage");
   },

   /** Chicken: needs a higher Pursuit than the target; both secretly choose impact or evade. */
   async chicken(actor) {
      const target = await pickTarget(actor, { title: pickTitle("chicken"), filter: (a) => !a.system.combat.disengaging });
      if (!target) return false;
      if (actor.system.pursuit <= target.system.pursuit) {
         ui.notifications.warn(L("EDRPG.vcombat.chickenPursuit", { mine: actor.system.pursuit, theirs: target.system.pursuit, target: target.name }));
         return false;
      }
      const choice = await chooseChicken(actor, target);
      if (!choice) return false;
      await postEvent(actor, {
         kind: "chicken",
         title: L("EDRPG.vcombat.action.chicken"),
         subtitle: L("EDRPG.vcombat.versus", { name: actor.name, target: target.name }),
         notes: [L("EDRPG.vcombat.chickenWaiting", { name: esc(actor.name), target: esc(target.name) })],
         chicken: { attackerUuid: actor.uuid, targetUuid: target.uuid, attacker: actor.name, target: target.name, attackerChoice: choice, resolved: false },
      });
   },

   /** Tail (the vehicle Dogfight): D10 + Defence each; whoever gets behind fires everything. */
   async tail(actor, { target = null, bonus = 0 } = {}) {
      target ??= await pickTarget(actor, { zone: "upClose", title: pickTitle("tail") });
      if (!target) return false;
      if (target.system.combat.disengaging) {
         await announce(actor, "tail", target);
         const winner = await pursuit(actor, target, "disengage");
         if (winner === "chaser") {
            await update(target, { "system.combat.disengaging": false });
            await fireWeapons(actor, target, { action: "EDRPG.vcombat.action.tail" });
         } else if (winner === "tie") {
            await update(target, { "system.combat.disengaging": false });
            await setZone(target, "atDistance");
            await setZone(actor, "atDistance");
         }
         return;
      }
      await dogfight(actor, target, bonus);
   },

   /** Broadsides: fire turrets at an up-close target until one misses. */
   async broadsides(actor) {
      const guns = turrets(actor);
      if (!guns.length) {
         ui.notifications.warn(L("EDRPG.vcombat.noTurrets", { name: actor.name }));
         return false;
      }
      const target = await pickTarget(actor, { zone: "upClose", title: pickTitle("broadsides") });
      if (!target) return false;
      await announce(actor, "broadsides", target);
      const { missed, left } = await fireWeapons(actor, target, { weapons: guns, stopOnMiss: true, action: "EDRPG.vcombat.action.broadsides" });
      if (missed && left.length) {
         await postEvent(actor, {
            kind: "action",
            title: L("EDRPG.vcombat.action.broadsides"),
            subtitle: actor.name,
            notes: [L("EDRPG.vcombat.broadsidesLeft", { weapons: left.map((w) => esc(w.name)).join(", ") })],
         });
      }
   },

   /** Ram: D10 + Defence against D10 + the target's Defence or Pursuit. */
   async ram(actor) {
      const target = await pickTarget(actor, { zone: "upClose", title: pickTitle("ram") });
      if (!target) return false;
      const ts = target.system;
      const useP = ts.pursuit > ts.defence;
      const a = await rollWith(actor.name, [{ label: L("EDRPG.vehicle.defence"), value: actor.system.defence, always: true }]);
      const b = await rollWith(target.name, [{ label: L(useP ? "EDRPG.vehicle.pursuit" : "EDRPG.vehicle.defence"), value: useP ? ts.pursuit : ts.defence, always: true }]);
      const speed = actor.system.speed;
      const names = { name: esc(actor.name), target: esc(target.name) };
      let outcome;
      let toTarget = 0;
      let toSelf = 0;
      const bomb = actor.system.bomb?.damage > 0;
      if (a.total > b.total) {
         toTarget = 10 * speed;
         toSelf = actor.system.forwardRam || bomb ? 0 : Math.floor(toTarget / 2);
         // A flying bomb doesn't share the Damage: it explodes and is destroyed.
         outcome = L(bomb ? "EDRPG.vcombat.ram.bomb" : "EDRPG.vcombat.ram.hit", { ...names, damage: toTarget, self: toSelf });
      } else if (a.total === b.total) {
         toTarget = toSelf = 5 * speed;
         outcome = L("EDRPG.vcombat.ram.sideswipe", { ...names, damage: toTarget });
      } else outcome = L("EDRPG.vcombat.ram.miss", names);
      const notes = [];
      if (toTarget && actor.system.forwardRam && a.total > b.total) notes.push(L("EDRPG.vcombat.forwardRam"));
      if (toTarget || toSelf) notes.push(L("EDRPG.vcombat.rammedNote"));
      const card = await postEvent(
         actor,
         {
            kind: "ram",
            title: L("EDRPG.vcombat.action.ram"),
            subtitle: L("EDRPG.vcombat.versus", { name: actor.name, target: target.name }),
            rolls: [a.view, b.view],
            outcome,
            outcomeClass: toTarget ? "success" : "failure",
            notes,
         },
         [a.roll, b.roll],
      );
      if (toTarget) await damage(target, toTarget, card, { "system.combat.rammed": true });
      if (toSelf) await damage(actor, toSelf, card, { "system.combat.rammed": true });
      if (bomb && a.total > b.total) await op("bomb", { uuid: target.uuid, bomberUuid: actor.uuid, messageId: card.id });
   },

   /** Rescue: stop (speed 0) and pick up crew stranded by a destroyed vehicle (Core Rules p.75). */
   async rescue(actor) {
      if (actor.system.speed !== 0) {
         ui.notifications.warn(L("EDRPG.vdestroy.mustStop", { name: actor.name }));
         return false;
      }
      const wreck = await pickTarget(actor, { title: pickTitle("rescue"), wrecks: true, filter: (a) => a.system.stranded.length > 0 });
      if (!wreck) return false;
      const stranded = wreck.system.stranded.map((u) => fromUuidSync(u)).filter(Boolean);
      let picked = stranded;
      if (stranded.length > 1) {
         const boxes = stranded.map((c) => `<label class="checkbox"><input type="checkbox" name="${c.uuid}" checked> ${esc(c.name)}</label>`).join("");
         const input = await foundry.applications.api.DialogV2.input({
            window: { title: L("EDRPG.vcombat.action.rescue"), icon: ACTION_ICONS.rescue },
            classes: ["edrpg", "edrpg-dialog"],
            content: `<p>${L("EDRPG.vdestroy.whoToRescue", { wreck: esc(wreck.name) })}</p><div class="form-group stacked">${boxes}</div>`,
            rejectClose: false,
         });
         if (!input) return false;
         picked = stranded.filter((c) => input[c.uuid]);
      }
      if (!picked.length) return false;
      const left = wreck.system.stranded.filter((u) => !picked.some((c) => c.uuid === u));
      await update(wreck, { "system.stranded": left });
      await postEvent(actor, {
         kind: "rescue",
         title: L("EDRPG.vcombat.action.rescue"),
         subtitle: actor.name,
         outcome: L("EDRPG.vdestroy.rescued", { name: esc(actor.name), crew: picked.map((c) => esc(c.name)).join(", "), wreck: esc(wreck.name) }),
         outcomeClass: "success",
         notes: left.length ? [L("EDRPG.vdestroy.stillStranded", { count: left.length })] : [],
      });
   },
};

/**
 * Tailing contest: D10 + Defence each (+bonus to the initiator after a Chicken). The winner fires all weapons; the
 * loser may fire back with one turret. A draw: both may fire one turret.
 *
 * @param {Actor} actor
 *
 * @param {Actor} target
 *
 * @param {number} bonus
 */
async function dogfight(actor, target, bonus = 0) {
   const a = await rollWith(actor.name, [
      { label: L("EDRPG.vehicle.defence"), value: actor.system.defence, always: true },
      { label: L("EDRPG.vcombat.chickenBonus"), value: bonus },
   ]);
   const b = await rollWith(target.name, [{ label: L("EDRPG.vehicle.defence"), value: target.system.defence, always: true }]);
   const names = { name: esc(actor.name), target: esc(target.name) };
   const [winner, loser] = a.total > b.total ? [actor, target] : b.total > a.total ? [target, actor] : [null, null];
   const returnFire = [];
   const offer = (from, at) => turrets(from).length && returnFire.push({ vehicleUuid: from.uuid, targetUuid: at.uuid, name: from.name, target: at.name, used: false });
   if (winner) offer(loser, winner);
   else {
      offer(actor, target);
      offer(target, actor);
   }
   // The winner fires on a client that owns it; otherwise its owner gets a button.
   const firesHere = winner?.isOwner;
   const fullFire = winner && !firesHere ? { vehicleUuid: winner.uuid, targetUuid: loser.uuid, name: winner.name, target: loser.name, used: false } : null;
   await postEvent(
      actor,
      {
         kind: "tail",
         fullFire,
         title: L("EDRPG.vcombat.action.tail"),
         subtitle: L("EDRPG.vcombat.versus", { name: actor.name, target: target.name }),
         rolls: [a.view, b.view],
         outcome: winner ? L("EDRPG.vcombat.tailWin", { name: esc(winner.name), target: esc(loser.name) }) : L("EDRPG.vcombat.tailDraw", names),
         outcomeClass: winner === actor ? "success" : "failure",
         notes: winner ? [L("EDRPG.vcombat.tailReturn", { name: esc(loser.name) })] : [],
         returnFire,
      },
      [a.roll, b.roll],
   );
   if (firesHere) await fireWeapons(winner, loser, { action: "EDRPG.vcombat.action.tail" });
}

/**
 * Ask for impact or evade.
 *
 * @param {Actor} actor
 *
 * @param {Actor} other
 *
 * @returns {Promise<"impact"|"evade"|null>}
 */
async function chooseChicken(actor, other) {
   return foundry.applications.api.DialogV2.wait({
      window: { title: L("EDRPG.vcombat.action.chicken"), icon: ACTION_ICONS.chicken },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<p>${L("EDRPG.vcombat.chickenChoose", { name: esc(actor.name), target: esc(other.name) })}</p>`,
      buttons: [
         { action: "impact", label: "EDRPG.vcombat.impact", icon: "fa-solid fa-car-burst" },
         { action: "evade", label: "EDRPG.vcombat.evade", icon: "fa-solid fa-person-walking-arrow-right" },
      ],
      rejectClose: false,
   });
}

/**
 * Resolve a Chicken (run by the GM): both impact → head-on collision; both evade → D10, even = collision, odd = the
 * initiator Tails at +2; one impacts → the impacting vehicle Tails at +2. Collisions do 5 × the combined speeds to
 * each and stop both. Both end up-close.
 *
 * @param {ChatMessage} message
 *
 * @param {"impact"|"evade"} targetChoice
 */
async function resolveChicken(message, targetChoice) {
   const state = message?.getFlag("edrpg", "vehicleEvent");
   const ch = state?.chicken;
   if (!ch || ch.resolved) return;
   const actor = await fromUuid(ch.attackerUuid);
   const target = await fromUuid(ch.targetUuid);
   if (!actor || !target) return;
   const choices = [ch.attackerChoice, targetChoice];
   const notes = [
      L("EDRPG.vcombat.chickenChose", { name: esc(actor.name), choice: L(`EDRPG.vcombat.${ch.attackerChoice}`) }),
      L("EDRPG.vcombat.chickenChose", { name: esc(target.name), choice: L(`EDRPG.vcombat.${targetChoice}`) }),
   ];
   const rolls = [];
   let collision = false;
   let tailer = null;
   if (choices[0] === "impact" && choices[1] === "impact") collision = true;
   else if (choices[0] === "evade" && choices[1] === "evade") {
      const roll = await new Roll("1d10").evaluate();
      rolls.push(roll);
      collision = roll.total % 2 === 0;
      notes.push(L(collision ? "EDRPG.vcombat.chickenEven" : "EDRPG.vcombat.chickenOdd", { roll: roll.total, name: esc(actor.name) }));
      if (!collision) tailer = actor;
   } else tailer = choices[0] === "impact" ? actor : target;

   await message.update({
      content: await foundry.applications.handlebars.renderTemplate(TEMPLATE, { ...state, notes, chicken: { ...ch, resolved: true, targetChoice } }),
      "flags.edrpg.vehicleEvent": { ...state, notes, chicken: { ...ch, resolved: true, targetChoice } },
   });
   await moveToZone(actor, "upClose");
   await moveToZone(target, "upClose", actor);

   if (collision) {
      const total = 5 * (actor.system.speed + target.system.speed);
      const hit = (v) => (v.system.forwardRam ? Math.floor(total / 2) : total);
      const isBomb = (v) => v.system.bomb?.damage > 0;
      // A flying bomb breaks apart: its victim isn't stopped dead.
      const stop = (v, other) => (isBomb(other) ? null : { "system.speed": 0 });
      const card = await postEvent(
         actor,
         {
            kind: "chicken",
            title: L("EDRPG.vcombat.collision"),
            subtitle: L("EDRPG.vcombat.versus", { name: actor.name, target: target.name }),
            outcome: L("EDRPG.vcombat.collisionText", { damage: total }),
            outcomeClass: "failure",
            notes: [actor, target].filter((v) => v.system.forwardRam).map((v) => L("EDRPG.vcombat.forwardRamChicken", { name: esc(v.name) })),
         },
         rolls,
      );
      await OPS.damage({ uuid: actor.uuid, amount: hit(actor), messageId: card.id, extra: stop(actor, target) });
      await OPS.damage({ uuid: target.uuid, amount: hit(target), messageId: card.id, extra: stop(target, actor) });
      if (isBomb(actor)) await OPS.bomb({ uuid: target.uuid, bomberUuid: actor.uuid, messageId: card.id });
      if (isBomb(target)) await OPS.bomb({ uuid: actor.uuid, bomberUuid: target.uuid, messageId: card.id });
      return;
   }
   const other = tailer === actor ? target : actor;
   await postEvent(tailer, { kind: "chicken", title: L("EDRPG.vcombat.action.chicken"), subtitle: tailer.name, outcome: L("EDRPG.vcombat.chickenTail", { name: esc(tailer.name), target: esc(other.name) }), outcomeClass: "success" }, rolls);
   await dogfight(tailer, other, 2);
}

/* -------------------------------------------- */
/*  Destruction                                 */
/* -------------------------------------------- */

/**
 * A vehicle is destroyed (Hull 0 or less): it stops, its token is marked dead, and its crew are caught in the wreck.
 * Player characters take 4D10 Endurance Damage and are stranded until someone stops to pick them up; other crew
 * generally go down with the vehicle (Core Rules p.75).
 *
 * @param {Actor} actor
 */
async function onVehicleDestroyed(actor) {
   const crew = actor.system.crewActors;
   await actor.update({
      "system.speed": 0,
      "system.stranded": crew.map((c) => c.uuid),
      "system.combat.fleeing": false,
      "system.combat.disengaging": false,
      "system.combat.sniping": false,
   });
   try {
      await actor.toggleStatusEffect("dead", { active: true, overlay: true });
   } catch (err) {
      console.warn("edrpg | couldn't mark the wreck", err);
   }
   if (game.user.isGM) {
      for (const combat of game.combats ?? []) {
         for (const c of combat.combatants) if (c.actor?.uuid === actor.uuid && !c.defeated) await c.update({ defeated: true });
      }
   }
   const notes = [];
   if (actor.system.drone?.enabled) notes.push(L("EDRPG.vdestroy.drone"));
   else if (!crew.length) notes.push(L("EDRPG.vdestroy.noCrew"));
   else {
      notes.push(L("EDRPG.vdestroy.crew", { crew: crew.map((c) => esc(c.name)).join(", ") }));
      notes.push(L("EDRPG.vdestroy.rescueHint"));
   }
   return postEvent(actor, {
      kind: "destroyed",
      title: L("EDRPG.vdestroy.title", { name: actor.name }),
      outcome: L("EDRPG.vdestroy.outcome"),
      outcomeClass: "failure",
      notes,
      vehicleUuid: actor.uuid,
      crewDamage: crew.map((c) => ({ uuid: c.uuid, name: c.name, npc: c.type === "opponent", rolled: false })),
   });
}

/* -------------------------------------------- */
/*  Card buttons                                */
/* -------------------------------------------- */

/**
 * Render hook for vehicle combat cards: pilot checks, obstacle checks, Chicken choices and return fire.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderVehicleEvent(message, html) {
   const state = message.getFlag("edrpg", "vehicleEvent");
   const controls = html.querySelector(".edrpg-vevent .vevent-controls");
   if (!state || !controls) return;
   const owns = (uuid) => game.user.isGM || !!fromUuidSync(uuid)?.isOwner;
   const add = (icon, label, onClick) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<i class="${icon}"></i> ${label}`;
      button.addEventListener("click", async (event) => {
         event.preventDefault();
         button.disabled = true;
         try {
            await onClick();
         } finally {
            button.disabled = false;
         }
      });
      controls.append(button);
   };
   if (state.obstacle && !state.obstacle.done && game.user.isGM) {
      add("fa-solid fa-mountain", L("EDRPG.vcombat.checkObstacles"), async () => {
         const actor = await fromUuid(state.obstacle.vehicleUuid);
         if (actor) await checkObstacles(actor, message);
      });
   }
   if (state.pilotCheck && !state.pilotCheck.done && owns(state.pilotCheck.vehicleUuid)) {
      add("fa-solid fa-dice-d10", L("EDRPG.vcombat.rollPilot", { dn: state.pilotCheck.dn }), () => rollPilotCheck(message));
   }
   if (state.chicken && !state.chicken.resolved && owns(state.chicken.targetUuid)) {
      const pick = (choice) => () => (game.user.isGM ? enqueue(() => resolveChicken(message, choice)) : op("chicken", { messageId: message.id, choice }));
      add("fa-solid fa-car-burst", L("EDRPG.vcombat.chickenAs", { name: esc(state.chicken.target), choice: L("EDRPG.vcombat.impact") }), pick("impact"));
      add("fa-solid fa-person-walking-arrow-right", L("EDRPG.vcombat.chickenAs", { name: esc(state.chicken.target), choice: L("EDRPG.vcombat.evade") }), pick("evade"));
   }
   for (const [i, cd] of (state.crewDamage ?? []).entries()) {
      if (cd.rolled || !owns(cd.uuid)) continue;
      add("fa-solid fa-dice-d10", L(cd.npc ? "EDRPG.vdestroy.rollNpc" : "EDRPG.vdestroy.rollCrew", { name: esc(cd.name) }), async () => {
         const crew = await fromUuid(cd.uuid);
         const vehicle = await fromUuid(state.vehicleUuid);
         if (!crew || !vehicle) return;
         await rollCrashDamage(crew, vehicle);
         const crewDamage = foundry.utils.deepClone(state.crewDamage);
         crewDamage[i].rolled = true;
         await op("event", { messageId: message.id, patch: { crewDamage } });
      });
   }
   const ff = state.fullFire;
   if (ff && !ff.used && owns(ff.vehicleUuid)) {
      add("fa-solid fa-burst", L("EDRPG.vcombat.fireAll", { name: esc(ff.name), target: esc(ff.target) }), async () => {
         const from = await fromUuid(ff.vehicleUuid);
         const at = await fromUuid(ff.targetUuid);
         if (!from || !at) return;
         await op("event", { messageId: message.id, patch: { fullFire: { used: true } } });
         await fireWeapons(from, at, { action: "EDRPG.vcombat.action.tail" });
      });
   }
   for (const [i, rf] of (state.returnFire ?? []).entries()) {
      if (rf.used || !owns(rf.vehicleUuid)) continue;
      add("fa-solid fa-crosshairs", L("EDRPG.vcombat.returnFire", { name: esc(rf.name), target: esc(rf.target) }), async () => {
         const from = await fromUuid(rf.vehicleUuid);
         const at = await fromUuid(rf.targetUuid);
         const weapon = from && at ? await pickTurret(from) : null;
         if (!weapon) return;
         const fired = await rollCraftAttack(from, weapon, { prompt: false, target: at, action: "EDRPG.vcombat.singleTurret" });
         if (fired) {
            const returnFire = foundry.utils.deepClone(state.returnFire);
            returnFire[i].used = true;
            await op("event", { messageId: message.id, patch: { returnFire } });
         }
      });
   }
   if (!controls.children.length) controls.remove();
}

/**
 * Choose one of a vehicle's turrets.
 *
 * @param {Actor} actor
 *
 * @returns {Promise<Item|null>}
 */
async function pickTurret(actor) {
   const guns = turrets(actor);
   if (guns.length <= 1) return guns[0] ?? null;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.vcombat.singleTurret") },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.vehicle.weaponName")}</label><div class="form-fields"><select name="weapon">${guns.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join("")}</select></div></div>`,
      rejectClose: false,
   });
   return input ? actor.items.get(input.weapon) : null;
}
