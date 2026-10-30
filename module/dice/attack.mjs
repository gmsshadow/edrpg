import { attackRules, rangedAttackSkills, fighting as FIGHTING, scatterDirections, missTables } from "../config.mjs";
import { rollSkillDice, skillLabel, signed } from "./skill-check.mjs";
import { showDice } from "./contest.mjs";
import { useKarmaCapability } from "../karma.mjs";
import { rollDamage, STATUS } from "./damage.mjs";
import { rollGrabCheck, performGrab } from "./grab.mjs";

const CARD_TEMPLATE = "systems/edrpg/templates/chat/attack.hbs";
const SOCKET = "system.edrpg";

/**
 * Personal-combat attacks (Core Rules pp.54–61).
 *
 * Difficulty To Hit = the weapon's Range (or Finesse) difficulty + the target's Defence (+2 if the target is in cover
 * against a ranged weapon). Ranged attacks can only be Dodged; Melee and Fighting can be Dodged or Parried.
 * Explosives aimed at the ground: 3 + range difficulty. Thrown grenades: 7 or the number of squares, whichever is
 * greater (+2 per interposing cover, +2 in zero gravity). Aiming gives +5 To Hit; two weapons −2 each; a character who
 * starts their turn knocked over adds no skill bonus. A natural 1 always misses, a natural 10 always hits.
 *
 * The card keeps its state in message flags. The attacker (and the GM) update it; anyone else — e.g. a defender
 * spending Karma on Duck! — sends the change to the active GM over the system socket.
 */

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Fighting as a weapon-like object: Finesse 5, 1D10 halved (Core Rules p.120).
 *
 * @returns {object}
 */
export function fightingWeapon() {
   return {
      id: "fighting",
      name: game.i18n.localize("EDRPG.sheet.skills.combat.fighting.name"),
      system: {
         skill: "fighting",
         damageType: "fighting",
         isMelee: true,
         finesse: FIGHTING.finesse,
         damage: FIGHTING.damage,
         halveDamage: FIGHTING.halve,
         ranges: {},
         usesAmmo: false,
         ammo: { value: 0, max: null },
         blast: { fatal: null },
         burst: { kind: "none", max: "" },
         burstLabel: "",
         attackBonus: 0,
         toHit: null,
         divideFire: false,
         destroyCover: false,
      },
   };
}

/**
 * A target's Defence. Opponents with no score can't use that defence (it counts as 0).
 *
 * @param {Actor} target
 *
 * @param {"dodge"|"parry"} type
 *
 * @returns {{value: number, available: boolean}}
 */
export function defenceOf(target, type) {
   if (!target) return { value: 0, available: false };
   // Grabbing or grabbed: Defence (Dodge) 0 and no Parry (Core Rules p.61).
   if (target.statuses?.has(STATUS.grabbed) || target.statuses?.has(STATUS.grabbing)) {
      return type === "dodge" ? { value: 0, available: true, grab: true } : { value: 0, available: false, grab: true };
   }
   const v = target.system[type];
   if (v === null || v === undefined) return { value: 0, available: false };
   return { value: Number(v) || 0, available: true };
}

/**
 * The explosives mode for a card: the world setting, unless it is "ask" (then whatever was chosen, or null to offer
 * both on the card).
 *
 * @param {string} chosen
 *
 * @returns {"mapped"|"mapless"|null}
 */
function modeSetting(chosen) {
   const setting = game.settings.get("edrpg", "explosiveMode");
   if (setting === "mapped" || setting === "mapless") return setting;
   return chosen ?? null;
}

/** Kind of attack, for matching Karma Capability bonuses. */
function attackKind(weapon) {
   if (weapon.system.isMelee) return "melee";
   return rangedAttackSkills.includes(weapon.system.skill) ? "ranged" : "other";
}

/** First usable range band key (short/medium/long). */
function firstBand(weapon) {
   return ["short", "medium", "long"].find((k) => weapon.system.ranges?.[k]?.dn !== null && weapon.system.ranges?.[k]?.dn !== undefined);
}

/* -------------------------------------------- */
/*  Rolling an attack                           */
/* -------------------------------------------- */

/**
 * Prompt for and roll an attack.
 *
 * @param {Actor} actor
 *
 * @param {Item|object} weapon  A weapon item, or {@link fightingWeapon}.
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.prompt=true]
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollAttack(actor, weapon, { prompt = true, target: forcedTarget = null, counter = false } = {}) {
   const s = weapon.system;
   const target = forcedTarget ?? [...game.user.targets].map((t) => t.actor).find((a) => a && a !== actor) ?? null;
   const isGrenade = s.skill === "grenade" && !firstBand(weapon);
   const isExplosive = s.blast?.fatal !== null && s.blast?.fatal !== undefined;

   let opts = {
      band: firstBand(weapon),
      defence: "dodge",
      cover: false,
      // Aiming last turn (the Aiming status) gives +5; it is used up by the attack (p.61).
      aim: actor.statuses?.has(STATUS.aiming) ?? false,
      free: false,
      grab: false,
      twoWeapons: false,
      knockedOver: actor.statuses?.has(STATUS.knockedOver) ?? false,
      divideFire: false,
      groundTarget: isGrenade,
      squares: 0,
      coverPieces: 0,
      zeroG: false,
      // Battle map or not, for explosives: the world setting, or chosen in the dialog when it is "ask".
      explosiveMode: game.settings.get("edrpg", "explosiveMode") === "mapless" ? "mapless" : "mapped",
      throwWith: "advantage",
      adjust: 0,
      modifier: 0,
      mode: undefined,
   };
   if (prompt) {
      const result = await promptAttack(actor, weapon, target, { isGrenade, isExplosive, counter, ...opts });
      if (!result) return null;
      opts = { ...opts, ...result };
   }
   if (!s.isMelee) opts.defence = "dodge"; // Ranged attacks can only be dodged.

   // Ammunition: one point per ranged attack (Core Rules p.100).
   if (s.usesAmmo && weapon.id !== "fighting") {
      if (s.ammo.value < 1) {
         ui.notifications.warn(game.i18n.format("EDRPG.attack.noAmmo", { weapon: weapon.name }));
         return null;
      }
   }

   // Difficulty To Hit.
   const parts = [];
   let cantEvade = false;
   if (isGrenade && opts.explosiveMode === "mapless") {
      // Without a map: 7 thrown with advantage (round a corner, down stairs), 12 with disadvantage (p.59).
      const advantage = opts.throwWith !== "disadvantage";
      parts.push({
         label: advantage ? "EDRPG.attack.part.withAdvantage" : "EDRPG.attack.part.withDisadvantage",
         value: advantage ? attackRules.grenadeAdvantage : attackRules.grenadeDisadvantage,
      });
      if (opts.zeroG) parts.push({ label: "EDRPG.attack.part.zeroG", value: attackRules.zeroGravity });
   } else if (isGrenade) {
      parts.push({ label: "EDRPG.attack.part.grenadeSquares", value: Math.max(attackRules.grenadeMinimum, opts.squares) });
      if (opts.coverPieces) parts.push({ label: "EDRPG.attack.part.interposingCover", value: opts.coverPieces * 2 });
      if (opts.zeroG) parts.push({ label: "EDRPG.attack.part.zeroG", value: attackRules.zeroGravity });
   } else if (s.isMelee) {
      parts.push({ label: "EDRPG.attack.part.finesse", value: s.finesse ?? 0 });
   } else {
      const band = s.ranges[opts.band];
      parts.push({ label: `EDRPG.attack.part.${opts.band}`, value: band?.dn ?? 0, note: band?.distance });
      if (opts.groundTarget) {
         parts.push({ label: "EDRPG.attack.part.groundTarget", value: attackRules.groundTarget });
         if (opts.coverPieces) parts.push({ label: "EDRPG.attack.part.interposingCover", value: opts.coverPieces * 2 });
      }
   }
   const targeted = !isGrenade && !opts.groundTarget;
   if (targeted && target) {
      const def = defenceOf(target, opts.defence);
      if (def.available) parts.push({ label: `EDRPG.attack.part.${opts.defence}`, value: def.value });
      else cantEvade = true;
   } else if (targeted && opts.targetDefence) {
      parts.push({ label: `EDRPG.attack.part.${opts.defence}`, value: opts.targetDefence });
   }
   if (targeted && opts.cover && !s.isMelee) parts.push({ label: "EDRPG.attack.part.cover", value: attackRules.cover });
   if (opts.adjust) parts.push({ label: "EDRPG.attack.part.adjust", value: opts.adjust });
   const dn = parts.reduce((n, p) => n + p.value, 0);

   // To Hit roll.
   const mods = [];
   if (opts.aim) mods.push({ label: "EDRPG.attack.part.aim", value: attackRules.aim });
   // Ambidextrous reduces the two-weapon penalty to -1, then 0.
   const twoWeapons = actor.system.twoWeaponPenalty ?? attackRules.twoWeapons;
   if (opts.twoWeapons && twoWeapons) mods.push({ label: "EDRPG.attack.part.twoWeapons", value: twoWeapons });
   if (opts.modifier) mods.push({ label: "EDRPG.attack.part.modifier", value: opts.modifier });
   const bonus = opts.knockedOver ? 0 : actor.weaponBonus(weapon);
   const modifier = mods.reduce((n, m) => n + m.value, 0);
   const result = await rollSkillDice(actor, s.skill, { bonus, modifier, socialFactor: false });

   // The aim is used up once you attack.
   if (actor.statuses?.has(STATUS.aiming) && actor.isOwner) await actor.toggleStatusEffect(STATUS.aiming, { active: false });

   let ammo = null;
   if (s.usesAmmo && weapon.id !== "fighting") {
      ammo = { spent: 1, left: s.ammo.value - 1, max: s.ammo.max };
      await weapon.update({ "system.ammo.value": ammo.left });
   }

   const state = evaluate({
      actorUuid: actor.uuid,
      actorName: actor.name,
      weaponId: weapon.id,
      weaponName: weapon.name,
      kind: attackKind(weapon),
      skill: s.skill,
      damageType: s.damageType,
      isMelee: s.isMelee,
      isExplosive,
      burstLabel: s.burstLabel ?? "",
      burst: s.burst ? { kind: s.burst.kind, max: s.burst.max } : { kind: "none", max: "" },
      band: s.isMelee || isGrenade ? null : opts.band,
      // Damage at this range: some weapons (shotguns) do less at medium and long range.
      damage: (!s.isMelee && opts.band && s.rangeDamage?.[opts.band]) || s.damage || "",
      blast: isExplosive ? { ...s.blast } : null,
      // Explosives: thrown grenades use the Grenade Miss Table, anything fired (missiles, launchers) the Missile one.
      explosiveKind: isExplosive ? (isGrenade ? "grenade" : "missile") : null,
      explosiveMode: isExplosive ? modeSetting(prompt ? opts.explosiveMode : null) : null,
      scatter: null,
      caught: null,
      damageMessageId: null,
      halveDamage: !!s.halveDamage,
      counter,
      free: !!opts.free,
      grab: !!opts.grab && s.skill === "fighting",
      grabResult: null,
      countered: false,
      divideFire: !!opts.divideFire,
      destroyCover: !!s.destroyCover && targeted && opts.cover,
      targetUuid: targeted ? (target?.uuid ?? null) : null,
      targetName: targeted ? (target?.name ?? null) : null,
      cantEvade,
      defence: opts.defence,
      parts,
      baseDn: dn,
      roll: { natural: result.natural, bonus, knockedOver: opts.knockedOver, mods, base: result.total, json: result.roll.toJSON() },
      boosts: [],
      rerolls: 0,
      ammo,
   });

   const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.format("EDRPG.attack.title", { weapon: weapon.name }),
      content: await renderAttackCard(state),
      rolls: [result.roll],
      sound: game.dice3d ? null : CONFIG.sounds.dice,
      flags: { edrpg: { attack: state } },
   };
   ChatMessage.applyMode(messageData, opts.mode || undefined);
   return ChatMessage.create(messageData);
}

/**
 * Work out the outcome from the roll, the difficulty and any Karma boosts.
 *
 * @param {object} state
 *
 * @returns {object}  The same state, with dn/total/outcome/margin set.
 */
export function evaluate(state) {
   const attackBoost = state.boosts.filter((b) => b.side === "attack").reduce((n, b) => n + b.value, 0);
   const defenceBoost = state.boosts.filter((b) => b.side === "defence").reduce((n, b) => n + b.value, 0);
   state.total = state.roll.base + attackBoost;
   state.dn = state.baseDn + defenceBoost;
   const natural = state.roll.natural;
   if (natural === 1) state.outcome = "miss";
   else if (natural === 10) state.outcome = "hit";
   else state.outcome = state.total >= state.dn ? "hit" : "miss";
   state.hit = state.outcome === "hit";
   // Burst counts every point the attack exceeds the difficulty (Core Rules p.57).
   state.margin = state.hit ? Math.max(0, state.total - state.dn) : 0;
   state.reason = natural === 1 ? "natural1" : natural === 10 && state.total < state.dn ? "natural10" : null;
   return state;
}

/* -------------------------------------------- */
/*  Dialog                                      */
/* -------------------------------------------- */

/**
 * @param {Actor} actor
 *
 * @param {object} weapon
 *
 * @param {Actor|null} target
 *
 * @param {object} defaults
 *
 * @returns {Promise<object|null>}
 */
async function promptAttack(actor, weapon, target, defaults) {
   const s = weapon.system;
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
   const esc = foundry.utils.escapeHTML;
   const row = (label, field, hint = "") =>
      `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const check = (name, checked = false) => `<input type="checkbox" name="${name}" ${checked ? "checked" : ""}>`;
   const num = (name, value = 0) => `<input type="number" name="${name}" value="${value}" step="1">`;

   let html = "";
   const dodge = defenceOf(target, "dodge");
   const parry = defenceOf(target, "parry");
   if (target) {
      const show = (d) => (d.available ? d.value : i18n("EDRPG.attack.cantUse"));
      html += `<p class="ed-attack-target">${i18n("EDRPG.attack.targetLine", {
         name: esc(target.name),
         dodge: show(dodge),
         parry: show(parry),
      })}</p>`;
   } else {
      html += `<p class="hint">${i18n("EDRPG.attack.noTarget")}</p>`;
   }

   const askMode = defaults.isExplosive && game.settings.get("edrpg", "explosiveMode") === "ask";
   if (askMode) {
      const opt = (k) => `<option value="${k}" ${defaults.explosiveMode === k ? "selected" : ""}>${i18n(`EDRPG.settings.explosiveMode.${k}`)}</option>`;
      html += row(i18n("EDRPG.attack.explosiveMode"), `<select name="explosiveMode">${opt("mapped")}${opt("mapless")}</select>`);
   }
   if (defaults.isGrenade) {
      const mapped = (field) => `<div data-explosive-mode="mapped">${field}</div>`;
      const mapless = (field) => `<div data-explosive-mode="mapless">${field}</div>`;
      html += mapped(row(i18n("EDRPG.attack.squares"), num("squares", 0), i18n("EDRPG.attack.squaresHint")));
      html += mapped(row(i18n("EDRPG.attack.interposingCover"), num("coverPieces", 0)));
      html += mapless(
         row(
            i18n("EDRPG.attack.throwWith"),
            `<select name="throwWith"><option value="advantage">${i18n("EDRPG.attack.withAdvantage")}</option><option value="disadvantage">${i18n("EDRPG.attack.withDisadvantage")}</option></select>`,
            i18n("EDRPG.attack.throwWithHint"),
         ),
      );
      html += row(i18n("EDRPG.attack.zeroG"), check("zeroG"));
   } else if (!s.isMelee) {
      const bands = ["short", "medium", "long"]
         .filter((k) => s.ranges[k]?.dn !== null && s.ranges[k]?.dn !== undefined)
         .map((k) => {
            const b = s.ranges[k];
            return `<option value="${k}" ${k === defaults.band ? "selected" : ""}>${i18n(`EDRPG.sheet.range.${k}`)}: ${esc(b.distance)} (${b.dn})</option>`;
         })
         .join("");
      html += row(i18n("EDRPG.weapon.range"), `<select name="band">${bands}</select>`);
      if (defaults.isExplosive) {
         html += row(i18n("EDRPG.attack.groundTarget"), check("groundTarget"), i18n("EDRPG.attack.groundTargetHint"));
         html += row(i18n("EDRPG.attack.interposingCover"), num("coverPieces", 0));
      }
      html += row(i18n("EDRPG.attack.cover"), check("cover"), i18n("EDRPG.attack.coverHint"));
   } else {
      const best = parry.available && parry.value > dodge.value ? "parry" : "dodge";
      const opt = (k, d) =>
         `<option value="${k}" ${k === best ? "selected" : ""} ${target && !d.available ? "disabled" : ""}>${i18n(`EDRPG.opponent.${k}`)}${
            target && d.available ? ` ${d.value}` : ""
         }</option>`;
      html += row(i18n("EDRPG.attack.defence"), `<select name="defence">${opt("dodge", dodge)}${opt("parry", parry)}</select>`, i18n("EDRPG.attack.defenceHint"));
   }
   if (!target && !defaults.isGrenade) {
      html += row(i18n("EDRPG.attack.targetDefence"), num("targetDefence", 0));
   }

   if (defaults.counter) html = `<p class="ed-attack-counter"><i class="fa-solid fa-shield-halved"></i> ${i18n("EDRPG.attack.counterIntro")}</p>${html}`;
   html += row(i18n("EDRPG.attack.aim"), check("aim", defaults.aim), i18n("EDRPG.attack.aimHint"));
   if (s.isMelee && !defaults.counter) {
      html += row(i18n("EDRPG.attack.free"), check("free"), i18n("EDRPG.attack.freeHint"));
   }
   if (s.skill === "fighting") html += row(i18n("EDRPG.attack.grab"), check("grab"), i18n("EDRPG.attack.grabHint"));
   if (s.oneHanded || s.isMelee) html += row(i18n("EDRPG.attack.twoWeapons"), check("twoWeapons"));
   html += row(i18n("EDRPG.attack.knockedOver"), check("knockedOver", defaults.knockedOver), i18n("EDRPG.attack.knockedOverHint"));
   if (s.divideFire) html += row(i18n("EDRPG.weapon.divideFire"), check("divideFire"), i18n("EDRPG.attack.divideFireHint"));
   html += row(i18n("EDRPG.test.BonusModifier"), num("modifier", 0));
   html += row(i18n("EDRPG.attack.adjust"), num("adjust", 0), i18n("EDRPG.attack.adjustHint"));
   const modes = Object.entries(CONFIG.ChatMessage.modes ?? {})
      .map(([key, cfg]) => `<option value="${key}">${i18n(cfg.label)}</option>`)
      .join("");
   html += row(i18n("EDRPG.test.RollType"), `<select name="mode"><option value="">${i18n("EDRPG.test.DefaultMode")}</option>${modes}</select>`);

   const result = await foundry.applications.api.DialogV2.input({
      window: { title: i18n("EDRPG.attack.title", { weapon: weapon.name }), icon: "fa-solid fa-crosshairs" },
      classes: ["edrpg", "edrpg-dialog", "edrpg-attack-dialog"],
      content: html,
      ok: { label: "EDRPG.attack.roll", icon: "fa-solid fa-dice-d10" },
      render: (_event, dialog) => {
         // Show only the fields for the chosen kind of combat (with or without a map).
         const root = dialog.element ?? dialog;
         const select = root.querySelector("select[name=explosiveMode]");
         const sync = () => {
            const mode = select?.value ?? defaults.explosiveMode;
            for (const el of root.querySelectorAll("[data-explosive-mode]")) el.hidden = el.dataset.explosiveMode !== mode;
            dialog.setPosition?.({ height: "auto" });
         };
         select?.addEventListener("change", sync);
         sync();
      },
      rejectClose: false,
   });
   if (!result) return null;
   const n = (v) => Number(v) || 0;
   return {
      band: result.band ?? defaults.band,
      defence: result.defence ?? "dodge",
      cover: !!result.cover,
      aim: !!result.aim,
      free: !!result.free,
      grab: !!result.grab,
      twoWeapons: !!result.twoWeapons,
      knockedOver: !!result.knockedOver,
      divideFire: !!result.divideFire,
      groundTarget: defaults.isGrenade || !!result.groundTarget,
      squares: n(result.squares),
      coverPieces: n(result.coverPieces),
      zeroG: !!result.zeroG,
      explosiveMode: result.explosiveMode ?? defaults.explosiveMode,
      throwWith: result.throwWith ?? "advantage",
      targetDefence: n(result.targetDefence),
      modifier: n(result.modifier),
      adjust: n(result.adjust),
      mode: result.mode || undefined,
   };
}

/* -------------------------------------------- */
/*  Card                                        */
/* -------------------------------------------- */

/**
 * @param {object} state
 *
 * @returns {Promise<string>}
 */
export async function renderAttackCard(state) {
   const burstNote = (() => {
      if (!state.hit || state.burst.kind === "none" || !state.margin) return "";
      return game.i18n.format(`EDRPG.attack.burstNote.${state.burst.kind}`, { points: state.margin, max: state.burst.max.toUpperCase() });
   })();
   return foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      ...state,
      skillName: skillLabel(state.skill),
      parts: state.parts.map((p) => ({ ...p, value: p.value })),
      mods: state.roll.mods.map((m) => ({ ...m, signed: signed(m.value) })),
      attackBoosts: state.boosts.filter((b) => b.side === "attack"),
      defenceBoosts: state.boosts.filter((b) => b.side === "defence"),
      burstNote,
      canRerollHint: state.roll.natural === 1,
   });
}

/**
 * Apply a change to an attack card (on a client allowed to update it).
 *
 * @param {ChatMessage} message
 *
 * @param {object} change  { type: "boost", boost } or { type: "reroll", roll }
 */
async function applyAttackChange(message, change) {
   const state = foundry.utils.deepClone(message.getFlag("edrpg", "attack"));
   if (!state) return;
   if (change.type === "boost") {
      if (state.boosts.some((b) => b.itemId === change.boost.itemId && b.side === change.boost.side)) return;
      state.boosts.push(change.boost);
   } else if (change.type === "damageRolled") {
      state.damageMessageId = change.messageId;
   } else if (change.type === "grab") {
      state.grabResult = change.grabResult;
      if (change.grabResult.success) {
         await performGrab({ type: "set", grabberUuid: change.grabResult.grabberUuid, targetUuid: change.grabResult.targetUuid });
      }
   } else if (change.type === "countered") {
      state.countered = true;
   } else if (change.type === "scatter") {
      state.scatter = change.scatter;
   } else if (change.type === "caught") {
      state.caught = change.caught;
   } else if (change.type === "reroll") {
      state.roll = { ...state.roll, ...change.roll };
      state.rerolls += 1;
   }
   evaluate(state);
   await message.update({ content: await renderAttackCard(state), "flags.edrpg.attack": state });
}

/**
 * Send a change: directly if allowed, otherwise through the active GM.
 *
 * @param {ChatMessage} message
 *
 * @param {object} change
 */
async function submitAttackChange(message, change) {
   if (message.canUserModify(game.user, "update")) return applyAttackChange(message, change);
   if (!game.users.activeGM) return ui.notifications.warn("EDRPG.contest.needsGM", { localize: true });
   game.socket.emit(SOCKET, { action: "attackUpdate", messageId: message.id, change });
}

/** Register the socket listener (call once, at `ready`). */
export function registerAttackSocket() {
   game.socket.on(SOCKET, async (data) => {
      if (data?.action !== "attackUpdate" || !game.user.isActiveGM) return;
      const message = game.messages.get(data.messageId);
      if (message) await applyAttackChange(message, data.change);
   });
}

/* -------------------------------------------- */
/*  Card buttons                                */
/* -------------------------------------------- */

/**
 * Karma Capabilities that can boost this attack (attacker) or the defence (target), not yet applied.
 *
 * @param {Actor} actor
 *
 * @param {object} state
 *
 * @param {"attack"|"defence"} side
 *
 * @returns {Item[]}
 */
function boostOptions(actor, state, side) {
   if (!actor) return [];
   const applied = new Set(state.boosts.filter((b) => b.side === side).map((b) => b.itemId));
   const pool = actor.system.karma?.standard.value ?? 0;
   return actor.itemTypes.karma.filter((k) => {
      const s = k.system;
      if (applied.has(k.id)) return false;
      if (side === "attack") {
         if (!s.attackBonus || !(s.attackApplies === "any" || s.attackApplies === state.kind)) return false;
      } else {
         if (!s.defenceBonus || !(s.defenceApplies === "any" || s.defenceApplies === state.defence)) return false;
         if (state.cantEvade) return false;
      }
      if (actor.type === "opponent") return (s.timesUsed ?? 0) < (s.usesPerBattle ?? 1);
      return !s.usedThisTurn && pool >= s.cost;
   });
}

/**
 * Render hook: add Karma buttons for whoever may use them.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderAttack(message, html) {
   const state = message.getFlag("edrpg", "attack");
   const card = html.querySelector(".edrpg-attack");
   if (!state || !card) return;
   const attacker = fromUuidSync(state.actorUuid);
   const target = state.targetUuid ? fromUuidSync(state.targetUuid) : null;
   const controls = card.querySelector(".attack-controls");
   if (!controls) return;

   const add = (label, title, onClick, cls = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = cls;
      button.innerHTML = label;
      if (title) button.dataset.tooltip = title;
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

   const canAct = !!attacker && (attacker.isOwner || game.user.isGM);
   // A missed explosive still goes off somewhere: scatter on the map, or the miss table without one.
   if (canAct && state.isExplosive && !state.hit && !state.scatter) {
      const modes = state.explosiveMode ? [state.explosiveMode] : ["mapped", "mapless"];
      for (const mode of modes) {
         add(
            `<i class="fa-solid ${mode === "mapped" ? "fa-map" : "fa-table-list"}"></i> ${game.i18n.localize(`EDRPG.scatter.button.${mode}`)}`,
            game.i18n.localize(`EDRPG.scatter.hint.${mode}`),
            () => scatter(message, mode),
            "scatter",
         );
      }
   }
   // Without a map, the GM may roll how many people are caught in the blast.
   if (canAct && state.isExplosive && state.hit && state.explosiveMode === "mapless" && !state.caught) {
      add(`<i class="fa-solid fa-users"></i> ${game.i18n.localize("EDRPG.scatter.button.caught")}`, game.i18n.localize("EDRPG.scatter.hint.caught"), () =>
         rollCaught(message),
      );
   }
   // Grab: on a hit, an opposed Athletics check instead of damage.
   if (canAct && state.grab && state.hit && !state.grabResult && target) {
      add(`<i class="fa-solid fa-hands"></i> ${game.i18n.localize("EDRPG.grab.resolve")}`, game.i18n.localize("EDRPG.grab.resolveHint"), () =>
         resolveGrab(message, attacker, target),
      );
   }
   // Defender who Parried a Melee or Fighting attack that missed: an immediate counter-attack (p.56).
   if (target?.isOwner && state.isMelee && !state.hit && state.defence === "parry" && !state.countered && attacker) {
      if (!state.counter) {
         add(`<i class="fa-solid fa-shield-halved"></i> ${game.i18n.format("EDRPG.attack.counter", { name: target.name })}`, game.i18n.localize("EDRPG.attack.counterHint"), () =>
            counterAttack(message, target, attacker),
            "counter",
         );
      } else {
         // A counter-attack can't be countered — except with the Riposte Karma Capability.
         const riposte = target.itemTypes.karma?.find((k) => /riposte/i.test(k.name));
         if (riposte) {
            add(`<i class="fa-solid fa-yin-yang"></i> ${game.i18n.format("EDRPG.attack.riposte", { name: riposte.name })}`, game.i18n.localize("EDRPG.attack.riposteHint"), async () => {
               const { useKarmaCapability: use } = await import("../karma.mjs");
               if (await use(target, riposte)) return counterAttack(message, target, attacker);
            }, "karma");
         }
      }
   }
   // Attacker (or GM): roll the damage for a hit, or for a missed explosive wherever it landed.
   const explodes = (state.hit && !state.grab) || (state.isExplosive && state.scatter && !state.scatter.harmless);
   if (canAct && explodes && !state.damageMessageId) {
      add(
         `<i class="fa-solid fa-burst"></i> ${game.i18n.localize(state.isExplosive ? "EDRPG.damage.explosion" : "EDRPG.damage.roll")}`,
         null,
         async () => {
            const damage = await rollDamage(message.getFlag("edrpg", "attack"), attacker);
            if (damage) await submitAttackChange(message, { type: "damageRolled", messageId: damage.id });
         },
         "damage",
      );
   }
   if (state.damageMessageId) {
      if (!controls.children.length) controls.remove();
      return;
   }
   // Attacker: reroll a natural 1 (as often as Karma lasts), or any roll once with the house rule.
   if (attacker?.isOwner && attacker.type !== "opponent") {
      const allowAll = game.settings.get("edrpg", "allowToRerollAllTests") && !state.rerolls;
      const karma = attacker.system.karma?.standard.value ?? 0;
      if ((state.roll.natural === 1 || allowAll) && karma > 0) {
         add(`<i class="fa-solid fa-yin-yang"></i> ${game.i18n.localize("EDRPG.chat.ReRollUsingKarmaTitle")}`, null, () =>
            rerollAttack(message, attacker),
         );
      }
   }
   // Attacker: "+2 to the attack you just made" — offered while the attack misses.
   if (attacker?.isOwner && !state.hit) {
      for (const item of boostOptions(attacker, state, "attack")) {
         add(
            `<i class="fa-solid fa-yin-yang"></i> ${item.name} +${item.system.attackBonus}`,
            game.i18n.localize("EDRPG.attack.boostHint"),
            () => boost(message, attacker, item, "attack"),
            "karma",
         );
      }
   }
   // Defender: "+N Defence against an attack that would hit you" — offered while the attack hits.
   if (target?.isOwner && state.hit) {
      for (const item of boostOptions(target, state, "defence")) {
         add(
            `<i class="fa-solid fa-shield"></i> ${item.name} +${item.system.defenceBonus}`,
            game.i18n.format("EDRPG.attack.defenceBoostHint", { name: target.name }),
            () => boost(message, target, item, "defence"),
            "karma defence",
         );
      }
   }
   if (!controls.children.length) controls.remove();
}

/**
 * Spend a Karma Capability and add its bonus to the card.
 *
 * @param {ChatMessage} message
 *
 * @param {Actor} actor
 *
 * @param {Item} item
 *
 * @param {"attack"|"defence"} side
 */
async function boost(message, actor, item, side) {
   const used = await useKarmaCapability(actor, item);
   if (!used) return;
   const value = side === "attack" ? item.system.attackBonus : item.system.defenceBonus;
   return submitAttackChange(message, { type: "boost", boost: { side, itemId: item.id, name: item.name, value } });
}

/**
 * Spend a Karma point to reroll the attack (Core Rules p.31, "Re-rolling a 1").
 *
 * @param {ChatMessage} message
 *
 * @param {Actor} actor
 */
async function rerollAttack(message, actor) {
   const state = message.getFlag("edrpg", "attack");
   const karma = actor.system.karma.standard.value;
   if (karma < 1) return ui.notifications.warn("EDRPG.chat.NoKarmaPoints", { localize: true });
   await actor.update({ "system.karma.standard.value": karma - 1 });
   const modifier = state.roll.mods.reduce((n, m) => n + m.value, 0);
   const result = await rollSkillDice(actor, state.skill, { bonus: state.roll.bonus, modifier, socialFactor: false });
   await showDice(result.roll);
   return submitAttackChange(message, {
      type: "reroll",
      roll: { natural: result.natural, base: result.total, json: result.roll.toJSON() },
   });
}

/* -------------------------------------------- */
/*  Missed explosives                           */
/* -------------------------------------------- */

/**
 * Where a missed explosive ends up (Core Rules pp.59–60).
 *
 * @param {object} state  Attack card state.
 *
 * @param {"mapped"|"mapless"} mode
 *
 * @returns {Promise<{result: object, rolls: Roll[]}>}
 */
export async function rollScatter(state, mode) {
   const rolls = [];
   const d = async (formula) => {
      const roll = await new Roll(formula).evaluate();
      rolls.push(roll);
      return roll.total;
   };
   if (mode === "mapped") {
      const direction = await d("1d10");
      const squares = await d("1d10");
      return {
         rolls,
         result: {
            mode,
            direction,
            squares,
            metres: squares * 2,
            overshoot: direction >= 9,
            label: direction >= 9 ? "EDRPG.scatter.overshoot" : scatterDirections[direction],
         },
      };
   }
   const kind = state.explosiveKind === "grenade" ? "grenade" : "missile";
   const roll = await d("1d10");
   const [, key, extra, harmless] = missTables[kind].find(([max]) => roll <= max);
   const metres = extra ? await d(extra) : null;
   return { rolls, result: { mode, kind, roll, key: `EDRPG.scatter.table.${key}`, metres, harmless } };
}

/**
 * Roll and record the scatter on the card.
 *
 * @param {ChatMessage} message
 *
 * @param {"mapped"|"mapless"} mode
 */
async function scatter(message, mode) {
   const state = message.getFlag("edrpg", "attack");
   const { result, rolls } = await rollScatter(state, mode);
   for (const roll of rolls) await showDice(roll);
   return submitAttackChange(message, { type: "scatter", scatter: result });
}

/**
 * Mapless hit: how many people are caught in the blast, if the GM is unsure — a D10, halved (rounded up).
 *
 * @param {ChatMessage} message
 */
async function rollCaught(message) {
   const roll = await new Roll("1d10").evaluate();
   await showDice(roll);
   return submitAttackChange(message, { type: "caught", caught: { roll: roll.total, people: Math.ceil(roll.total / 2) } });
}

/* -------------------------------------------- */
/*  Counter-attacks and grabs                   */
/* -------------------------------------------- */

/**
 * Counter-attack the attacker with Fighting or a Melee weapon in hand.
 *
 * @param {ChatMessage} message  The missed attack.
 *
 * @param {Actor} defender
 *
 * @param {Actor} attacker
 */
async function counterAttack(message, defender, attacker) {
   const melee = defender.itemTypes.weapon.filter((w) => w.system.isMelee && w.system.skill !== "fighting" && (defender.type === "opponent" || w.system.equipped));
   let weapon = fightingWeapon();
   if (melee.length) {
      const options = [`<option value="fighting">${foundry.utils.escapeHTML(weapon.name)}</option>`, ...melee.map((w) => `<option value="${w.id}">${foundry.utils.escapeHTML(w.name)}</option>`)];
      const result = await foundry.applications.api.DialogV2.input({
         window: { title: game.i18n.format("EDRPG.attack.counter", { name: defender.name }), icon: "fa-solid fa-shield-halved" },
         classes: ["edrpg", "edrpg-dialog"],
         content: `<div class="form-group"><label>${game.i18n.localize("EDRPG.attack.counterWith")}</label><div class="form-fields"><select name="weapon">${options.join("")}</select></div></div>`,
         ok: { label: "EDRPG.attack.roll", icon: "fa-solid fa-dice-d10" },
         rejectClose: false,
      });
      if (!result) return;
      if (result.weapon !== "fighting") weapon = defender.items.get(result.weapon) ?? weapon;
   }
   await submitAttackChange(message, { type: "countered" });
   return rollAttack(defender, weapon, { target: attacker, counter: true });
}

/**
 * Resolve a grab that hit: opposed Athletics (+ Strength damage bonus); the grabber must win.
 *
 * @param {ChatMessage} message
 *
 * @param {Actor} attacker
 *
 * @param {Actor} target
 */
async function resolveGrab(message, attacker, target) {
   const { mine, theirs } = await rollGrabCheck(attacker, target);
   const success = mine.total > theirs.total;
   return submitAttackChange(message, {
      type: "grab",
      grabResult: { grabber: mine, target: theirs, success, grabberUuid: attacker.uuid, targetUuid: target.uuid },
   });
}
