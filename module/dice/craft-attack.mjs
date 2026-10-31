import { isCraft } from "../data/vehicle.mjs";
import { rollCritical, damageComponent, targetableComponents } from "./ship-damage.mjs";
import { zoneOf } from "../zones.mjs";

/** Missiles, torpedoes (and mines) can be shot down by Point Defence; seekers are jammed by ECM. */
const isMissile = (weapon) => /missile|torpedo/i.test(weapon.name);
const isSeeker = (weapon) => /seeker/i.test(weapon.name);
const TEMPLATE = "systems/edrpg/templates/chat/craft-attack.hbs";
const SOCKET = "system.edrpg";

/**
 * Vehicle (and later spaceship) weapon fire (Core Rules pp.68, 75).
 * - To Hit: D10 + Vehicle Weapons bonus (the gunner's, 3 for an automatic turret) + Accuracy + the Speed Table's
 *   Attack penalty, against the target's Defence (0 if stationary). A natural 1 misses, a natural 10 hits.
 * - Damage: fixed, or base + Burst: 5 per point over the Defence, up to the weapon's maximum.
 * - Damage hits Shields first; if they collapse the rest goes to the Hull. Energy weapons' bonus against shields
 *   counts even when the excess carries through; kinetic weapons add their bonus to the Hull. Missiles may do less
 *   to Shields. Hull 0 or less: destroyed.
 */

/**
 * Prompt and fire a craft weapon.
 *
 * @param {Actor} vehicle
 *
 * @param {Item} weapon
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.prompt=true]
 *
 * @param {Actor} [options.target]     Fire at this vehicle (combat actions); otherwise the user's target.
 *
 * @param {number} [options.modifier]  Extra To Hit (e.g. +1 when Sniping).
 *
 * @param {string} [options.note]      Localisation key labelling the modifier.
 *
 * @param {string} [options.action]    Localisation key of the combat action, shown on the card.
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollCraftAttack(vehicle, weapon, { prompt = true, target: forced = null, modifier: extra = 0, note = null, action = null, forward = false } = {}) {
   const s = weapon.system;
   const sys = vehicle.system;
   if (s.usesAmmo && s.ammo.value < 1) {
      ui.notifications.warn(game.i18n.format("EDRPG.attack.noAmmo", { weapon: weapon.name }));
      return null;
   }
   const target = forced ?? [...game.user.targets].map((t) => t.actor).find((a) => a && a !== vehicle && isCraft(a)) ?? null;
   // Fixed-mount vehicle weapons can't target a flying vehicle (skimmers, Core Rules p.318).
   if (target?.system.flying && s.mount?.kind === "fixed") {
      ui.notifications.warn(game.i18n.format("EDRPG.drone.fixedVsFlying", { weapon: weapon.name, target: target.name }));
      return null;
   }
   // A weapon knocked out by a critical hit can't fire.
   if (sys.weaponDestroyed?.(weapon)) {
      ui.notifications.warn(game.i18n.format("EDRPG.crit.weaponOut", { weapon: weapon.name }));
      return null;
   }
   const gun = sys.gunnery(weapon, { forward });
   // Defence modifiers from the target's equipment (Core Rules pp.197–198).
   const defenceNotes = [];
   let defenceMods = 0;
   const ts = target?.system;
   if (ts?.combat?.chaff && (s.mount?.kind === "gimballed" || gun.auto)) {
      defenceMods += 4;
      defenceNotes.push("EDRPG.equip.chaffNote");
   }
   if (ts?.equipment?.ecm && isSeeker(weapon)) {
      defenceMods += 4;
      defenceNotes.push("EDRPG.equip.ecmNote");
   }
   // A targeted component: shields down, both up-close, a gimballed weapon (p.70).
   const canAim = !!ts?.isShip && s.mount?.kind === "gimballed" && (ts.shields.max === 0 || ts.shields.down || ts.shields.value <= 0) && zoneOf(target) === "upClose" && zoneOf(vehicle) === "upClose";
   let aim = null;
   let opts = { defence: (ts?.defence ?? 0) + defenceMods, modifier: 0, mode: undefined };
   if (prompt) {
      const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
      const row = (label, field, hint = "") =>
         `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
      let content = target
         ? `<p class="ed-attack-target">${i18n("EDRPG.vehicle.targetLine", { name: foundry.utils.escapeHTML(target.name), defence: target.system.defence, speed: target.system.speed })}</p>`
         : `<p class="hint">${i18n("EDRPG.vehicle.noTarget")}</p>`;
      content += row(i18n("EDRPG.vehicle.targetDefence"), `<input type="number" name="defence" value="${opts.defence}" step="1">`, i18n("EDRPG.vehicle.targetDefenceHint"));
      content += row(i18n("EDRPG.test.BonusModifier"), `<input type="number" name="modifier" value="0" step="1">`);
      const aimChoices = canAim ? targetableComponents(target) : [];
      if (aimChoices.length) {
         const options = aimChoices.map((c) => `<option value="${c.key}">${foundry.utils.escapeHTML(c.name)}</option>`).join("");
         content += row(i18n("EDRPG.crit.aim"), `<select name="aim"><option value="">${i18n("EDRPG.crit.aimNone")}</option>${options}</select>`, i18n("EDRPG.crit.aimHint"));
      }
      const result = await foundry.applications.api.DialogV2.input({
         window: { title: game.i18n.format("EDRPG.attack.title", { weapon: weapon.name }), icon: "fa-solid fa-crosshairs" },
         classes: ["edrpg", "edrpg-dialog"],
         content,
         ok: { label: "EDRPG.attack.roll", icon: "fa-solid fa-dice-d10" },
         rejectClose: false,
      });
      if (!result) return null;
      opts = { defence: Number(result.defence) || 0, modifier: Number(result.modifier) || 0 };
      const chosen = result.aim ? aimChoices.find((c) => c.key === result.aim) : null;
      if (chosen) {
         aim = { kind: chosen.kind, name: chosen.name, item: chosen.item ?? null };
         opts.defence += 4;
         defenceNotes.push("EDRPG.crit.aimNote");
      }
   }

   const ship = !!sys.isShip;
   const parts = gun.drone
      ? [{ label: ship ? "EDRPG.ship.part.listed" : "EDRPG.drone.toHit", value: s.accuracy ?? 0 }]
      : [
           { label: gun.auto ? "EDRPG.vehicle.part.autoTurret" : ship ? "EDRPG.ship.part.gunnery" : "EDRPG.vehicle.part.gunnery", value: gun.bonus, note: gun.gunner?.name ?? "" },
           { label: "EDRPG.craft.accuracy", value: s.accuracy ?? 0 },
        ];
   if (sys.weaponPenalty) parts.push({ label: "EDRPG.ship.part.modifiers", value: sys.weaponPenalty });
   if (sys.speedRow.attack) parts.push({ label: "EDRPG.vehicle.part.speed", value: sys.speedRow.attack, note: game.i18n.format("EDRPG.vehicle.speedNow", { speed: sys.speed }) });
   if (extra) parts.push({ label: note ?? "EDRPG.attack.part.modifier", value: extra });
   if (opts.modifier) parts.push({ label: "EDRPG.attack.part.modifier", value: opts.modifier });
   const bonus = parts.reduce((n, p) => n + p.value, 0);
   const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
   const natural = roll.dice[0].total;
   // A Sniping target is hit automatically (Core Rules p.67).
   const sniping = !!target?.system.combat?.sniping;
   let hit = sniping || natural === 10 || (natural !== 1 && roll.total >= opts.defence);
   // Point Defence: an incoming missile or torpedo is shot down on an even D10 (p.198).
   let pointDefence = null;
   if (hit && isMissile(weapon) && (ts?.equipment?.pointDefence?.value ?? 0) > 0) {
      const pd = await new Roll("1d10").evaluate();
      pointDefence = { roll: pd.total, destroyed: pd.total % 2 === 0 };
      if (pointDefence.destroyed) hit = false;
      await spendPointDefence(target);
   }
   const margin = hit ? Math.max(0, roll.total - opts.defence) : 0;
   const burst = s.burst.max ? Math.min(margin * (s.burst.perPoint || 5), s.burst.max) : 0;

   let ammo = null;
   if (s.usesAmmo) {
      ammo = { left: s.ammo.value - 1, max: s.ammo.max };
      await weapon.update({ "system.ammo.value": ammo.left });
   }

   const state = {
      vehicleUuid: vehicle.uuid,
      vehicleName: vehicle.name,
      weaponName: weapon.name,
      targetUuid: target?.uuid ?? null,
      targetName: target?.name ?? null,
      parts: parts.map((p) => ({ ...p, signed: p.value >= 0 ? `+${p.value}` : `${p.value}` })),
      natural,
      total: roll.total,
      defence: opts.defence,
      hit,
      margin,
      action,
      sniping,
      defenceNotes,
      aim,
      pointDefence,
      // Critical hits only matter against ships (vehicles have no components).
      shipTarget: !!ts?.isShip,
      reason: sniping ? null : natural === 1 ? "natural1" : natural === 10 && roll.total < opts.defence ? "natural10" : null,
      damage: hit ? { base: s.damage, burst, total: s.damage + burst, vsShields: s.damageVsShields, bonusVsHull: s.bonusVsHull, bonusVsShields: s.bonusVsShields } : null,
      critical: natural === 10,
      ammo,
      applied: [],
   };
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: vehicle }),
      flavor: game.i18n.format("EDRPG.attack.title", { weapon: weapon.name }),
      content: await renderCraftAttack(state),
      rolls: [roll],
      sound: game.dice3d ? null : CONFIG.sounds.dice,
      flags: { edrpg: { craftAttack: state } },
   });
}

/**
 * @param {object} state
 *
 * @returns {Promise<string>}
 */
export async function renderCraftAttack(state) {
   return foundry.applications.handlebars.renderTemplate(TEMPLATE, state);
}

/**
 * Damage to a vehicle: Shields first, then Hull.
 *
 * @param {Actor} target
 *
 * @param {object} damage  { total, vsShields, bonusVsHull, bonusVsShields }
 *
 * @returns {Promise<object>}  What happened, for the card.
 */
export async function applyCraftDamage(target, damage) {
   const sh = target.system.shields;
   const hullBefore = target.system.hull.value;
   const shieldsBefore = sh.value;
   const update = {};
   let toHull = 0;
   let toShields = 0;
   const shieldsUp = sh.max > 0 && !sh.down && sh.value > 0;
   if (shieldsUp) {
      toShields = (damage.vsShields ?? damage.total) + (damage.bonusVsShields ?? 0);
      if (toShields < sh.value) {
         update["system.shields.value"] = sh.value - toShields;
      } else {
         // The shields collapse; the excess (including any energy bonus) carries through to the Hull.
         toHull = toShields - sh.value;
         update["system.shields.value"] = 0;
         update["system.shields.down"] = true;
         if (toHull > 0) toHull += damage.bonusVsHull ?? 0;
      }
   } else {
      toHull = damage.total + (damage.bonusVsHull ?? 0);
   }
   if (toHull) update["system.hull.value"] = hullBefore - toHull;
   await target.update(update);
   const hullAfter = hullBefore - toHull;
   return {
      uuid: target.uuid,
      name: target.name,
      shieldsBefore,
      shieldsAfter: update["system.shields.value"] ?? shieldsBefore,
      collapsed: !!update["system.shields.down"],
      toShields: shieldsUp ? Math.min(toShields, shieldsBefore) : 0,
      toHull,
      hullBefore,
      hullAfter,
      destroyed: hullAfter <= 0,
   };
}

/**
 * Apply on this client if allowed, otherwise through the active GM.
 *
 * @param {object} action  { messageId, targetUuid }
 */
async function perform(action) {
   if (game.user.isGM) return execute(action);
   if (!game.users.activeGM) return ui.notifications.warn("EDRPG.contest.needsGM", { localize: true });
   game.socket.emit(SOCKET, { action: "craftDamage", payload: action });
}

/** @param {object} action */
async function execute({ messageId, targetUuid }) {
   const message = game.messages.get(messageId);
   const state = foundry.utils.deepClone(message?.getFlag("edrpg", "craftAttack"));
   const target = targetUuid ? await fromUuid(targetUuid) : null;
   if (!state?.damage || !isCraft(target)) return;
   // An aimed shot puts all its Damage on the component (p.70).
   if (state.aim && target.system.isShip) {
      const comp = await damageComponent(target, state.aim, state.damage.total);
      state.applied.push({ uuid: target.uuid, name: target.name, component: comp });
   } else {
      const sh = target.system.shields;
      const shieldsUp = sh.max > 0 && !sh.down && sh.value > 0;
      const record = await applyCraftDamage(target, state.damage);
      // Critical hit: a natural 10 against a ship whose shields were down (p.68).
      if (state.critical && target.system.isShip && !shieldsUp && !record.destroyed) record.crit = await rollCritical(target, state.damage.total);
      state.applied.push(record);
   }
   await message.update({ content: await renderCraftAttack(state), "flags.edrpg.craftAttack": state });
}

/**
 * Use one Point Defence ammo on a ship (through the GM if needed).
 *
 * @param {Actor} target
 */
export async function spendPointDefence(target) {
   if (target.isOwner) return target.update({ "system.equipment.pointDefence.value": Math.max(0, target.system.equipment.pointDefence.value - 1) });
   game.socket.emit(SOCKET, { action: "craftPD", payload: { uuid: target.uuid } });
}

/** Socket listener (call at `ready`). */
export function registerCraftSocket() {
   game.socket.on(SOCKET, async (data) => {
      if (!game.user.isActiveGM) return;
      if (data?.action === "craftDamage") await execute(data.payload);
      if (data?.action === "craftPD") {
         const t = await fromUuid(data.payload.uuid);
         if (t) await t.update({ "system.equipment.pointDefence.value": Math.max(0, t.system.equipment.pointDefence.value - 1) });
      }
   });
}

/**
 * Render hook: damage buttons for the attacker's owner or the GM.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderCraftAttack(message, html) {
   const state = message.getFlag("edrpg", "craftAttack");
   const controls = html.querySelector(".edrpg-craft-attack .attack-controls");
   if (!state || !controls) return;
   const vehicle = fromUuidSync(state.vehicleUuid);
   if (!state.hit || !(game.user.isGM || vehicle?.isOwner)) return controls.remove();
   const add = (label, onClick) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = label;
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
   const done = new Set(state.applied.map((a) => a.uuid));
   if (state.targetUuid && !done.has(state.targetUuid)) {
      add(`<i class="fa-solid fa-crosshairs"></i> ${game.i18n.format("EDRPG.damage.applyTarget", { name: foundry.utils.escapeHTML(state.targetName) })}`, () =>
         perform({ messageId: message.id, targetUuid: state.targetUuid }),
      );
   }
   add(`<i class="fa-solid fa-users"></i> ${game.i18n.localize("EDRPG.damage.applySelected")}`, async () => {
      const targets = (canvas?.tokens?.controlled ?? []).map((t) => t.actor).filter((a) => isCraft(a));
      if (!targets.length) return ui.notifications.warn("EDRPG.vehicle.selectVehicles", { localize: true });
      for (const t of targets) await perform({ messageId: message.id, targetUuid: t.uuid });
   });
   if (!controls.children.length) controls.remove();
}
