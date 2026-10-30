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
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollCraftAttack(vehicle, weapon, { prompt = true } = {}) {
   const s = weapon.system;
   const sys = vehicle.system;
   if (s.usesAmmo && s.ammo.value < 1) {
      ui.notifications.warn(game.i18n.format("EDRPG.attack.noAmmo", { weapon: weapon.name }));
      return null;
   }
   const target = [...game.user.targets].map((t) => t.actor).find((a) => a && a !== vehicle && a.type === "vehicle") ?? null;
   const gun = sys.gunnery(weapon);
   let opts = { defence: target?.system.defence ?? 0, modifier: 0, mode: undefined };
   if (prompt) {
      const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
      const row = (label, field, hint = "") =>
         `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
      let content = target
         ? `<p class="ed-attack-target">${i18n("EDRPG.vehicle.targetLine", { name: foundry.utils.escapeHTML(target.name), defence: target.system.defence, speed: target.system.speed })}</p>`
         : `<p class="hint">${i18n("EDRPG.vehicle.noTarget")}</p>`;
      content += row(i18n("EDRPG.vehicle.targetDefence"), `<input type="number" name="defence" value="${opts.defence}" step="1">`, i18n("EDRPG.vehicle.targetDefenceHint"));
      content += row(i18n("EDRPG.test.BonusModifier"), `<input type="number" name="modifier" value="0" step="1">`);
      const result = await foundry.applications.api.DialogV2.input({
         window: { title: game.i18n.format("EDRPG.attack.title", { weapon: weapon.name }), icon: "fa-solid fa-crosshairs" },
         classes: ["edrpg", "edrpg-dialog"],
         content,
         ok: { label: "EDRPG.attack.roll", icon: "fa-solid fa-dice-d10" },
         rejectClose: false,
      });
      if (!result) return null;
      opts = { defence: Number(result.defence) || 0, modifier: Number(result.modifier) || 0 };
   }

   const parts = [
      { label: gun.auto ? "EDRPG.vehicle.part.autoTurret" : "EDRPG.vehicle.part.gunnery", value: gun.bonus, note: gun.gunner?.name ?? "" },
      { label: "EDRPG.craft.accuracy", value: s.accuracy ?? 0 },
   ];
   if (sys.speedRow.attack) parts.push({ label: "EDRPG.vehicle.part.speed", value: sys.speedRow.attack, note: game.i18n.format("EDRPG.vehicle.speedNow", { speed: sys.speed }) });
   if (opts.modifier) parts.push({ label: "EDRPG.attack.part.modifier", value: opts.modifier });
   const bonus = parts.reduce((n, p) => n + p.value, 0);
   const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
   const natural = roll.dice[0].total;
   const hit = natural === 10 || (natural !== 1 && roll.total >= opts.defence);
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
      reason: natural === 1 ? "natural1" : natural === 10 && roll.total < opts.defence ? "natural10" : null,
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
   if (!state?.damage || target?.type !== "vehicle") return;
   state.applied.push(await applyCraftDamage(target, state.damage));
   await message.update({ content: await renderCraftAttack(state), "flags.edrpg.craftAttack": state });
}

/** Socket listener (call at `ready`). */
export function registerCraftSocket() {
   game.socket.on(SOCKET, async (data) => {
      if (data?.action !== "craftDamage" || !game.user.isActiveGM) return;
      await execute(data.payload);
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
      const targets = (canvas?.tokens?.controlled ?? []).map((t) => t.actor).filter((a) => a?.type === "vehicle");
      if (!targets.length) return ui.notifications.warn("EDRPG.vehicle.selectVehicles", { localize: true });
      for (const t of targets) await perform({ messageId: message.id, targetUuid: t.uuid });
   });
   if (!controls.children.length) controls.remove();
}
