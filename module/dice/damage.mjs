import { useKarmaCapability, builtInEscapeDeath } from "../karma.mjs";
import { rollSkillCheck } from "./skill-check.mjs";

const CARD_TEMPLATE = "systems/edrpg/templates/chat/damage.hbs";
const SOCKET = "system.edrpg";

/**
 * Damage, armour and dying (Core Rules pp.57–62, 121).
 *
 * - Damage is the weapon's damage (by range band where it changes, e.g. shotguns), plus Burst: an extra D10 for every
 *   point the attack beat the difficulty (2D10 for Heavy Burst, 5 points for Energy Burst) up to the weapon's maximum.
 *   Divided fire halves it. Explosives do their Fatal or Injury damage to everyone in that radius.
 * - Armour absorbs damage of its types (the best worn piece for that type). Hardened N: roll a D10, and on N or more the
 *   protection is doubled. A hit always does at least 1 damage, except Toxic.
 * - A 10 on any damage die knocks the target over (never for lasers / Energy weapons); explosions knock over everyone
 *   caught in them.
 * - Endurance 0 or less: unconscious. Exactly 0, or knocked out by Fighting: no danger. Below 0: bleeding out — at the
 *   start of each turn lose a D10; odd stabilises, even keeps bleeding. Dropped by an Energy weapon: the wound is
 *   cauterised — stabilise unless the bleeding roll is a 10. Dead at a negative score of half maximum Endurance.
 * - Stabilising: Medicine check, difficulty 8 (Energy) or 10 (anything else). Treating wounds: heals the Medicine
 *   check's total. Natural healing: 5 a day.
 */

/** Status effect ids used by the system (core ids where Foundry has one). */
export const STATUS = {
   knockedOver: "prone",
   unconscious: "unconscious",
   bleeding: "bleeding",
   stabilised: "edrpgStabilised",
   dead: "dead",
   aiming: "edrpgAiming",
   grabbed: "edrpgGrabbed",
   grabbing: "edrpgGrabbing",
   stimmed: "edrpgStimmed",
};

/** Rename/add the status effects at init, listing the system's conditions first. */
export function registerStatusEffects() {
   const ours = [
      { id: STATUS.knockedOver, name: "EDRPG.status.knockedOver", img: "icons/svg/falling.svg" },
      { id: STATUS.unconscious, name: "EDRPG.status.unconscious", img: "icons/svg/unconscious.svg" },
      { id: STATUS.bleeding, name: "EDRPG.status.bleeding", img: "icons/svg/blood.svg" },
      { id: STATUS.stabilised, name: "EDRPG.status.stabilised", img: "icons/svg/regen.svg" },
      { id: STATUS.dead, name: "EDRPG.status.dead", img: "icons/svg/skull.svg" },
      { id: STATUS.aiming, name: "EDRPG.status.aiming", img: "icons/svg/target.svg" },
      { id: STATUS.grabbed, name: "EDRPG.status.grabbed", img: "icons/svg/net.svg" },
      { id: STATUS.grabbing, name: "EDRPG.status.grabbing", img: "icons/svg/combat.svg" },
      { id: STATUS.stimmed, name: "EDRPG.status.stimmed", img: "icons/svg/pill.svg" },
   ];
   const rest = CONFIG.statusEffects.filter((e) => !ours.some((o) => o.id === e.id));
   CONFIG.statusEffects = [...ours.map((o) => ({ ...CONFIG.statusEffects.find((e) => e.id === o.id), ...o })), ...rest];
}

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

const has = (actor, id) => actor.statuses?.has(id) ?? false;

/**
 * Extra Burst damage for the margin an attack beat the difficulty by.
 *
 * @param {{kind: string, max: string}} burst
 *
 * @param {number} margin
 *
 * @returns {{dice?: number, flat?: number}|null}
 */
export function burstExtra(burst, margin) {
   if (!margin || !burst || burst.kind === "none") return null;
   const max = String(burst.max ?? "").toLowerCase().trim();
   if (burst.kind === "energy") return { flat: Math.min(5 * margin, Number(max) || Infinity) };
   const cap = Number(max.match(/^(\d+)\s*d\s*10/)?.[1]) || Infinity;
   return { dice: Math.min((burst.kind === "heavy" ? 2 : 1) * margin, cap) };
}

/**
 * The worn armour that best absorbs a damage type.
 *
 * @param {Actor} actor
 *
 * @param {string} type
 *
 * @returns {{name: string, absorb: number, hardened: number|null, all: boolean}|null}
 */
export function bestArmour(actor, type) {
   let best = null;
   // Worn armour, Armoured Carapace cybernetics, and the Environment Suit's Toxic resistance.
   const protective = [
      ...(actor.itemTypes?.armour ?? []).filter((a) => a.system.worn),
      ...(actor.itemTypes?.cybernetic ?? []).filter((c) => c.system.isArmour),
   ];
   if (type === "toxic") {
      for (const item of (actor.itemTypes?.clothing ?? []).filter((c) => c.system.worn && c.system.toxicResistance)) {
         if (!best || item.system.toxicResistance > best.absorb) {
            best = { name: item.name, absorb: item.system.toxicResistance, hardened: null, all: false };
         }
      }
   }
   for (const item of protective) {
      const s = item.system;
      const all = type === "toxic" && s.toxicAll;
      const absorb = all ? Infinity : (s.absorb?.[type] ?? 0);
      if (absorb <= 0) continue;
      if (!best || absorb > best.absorb) best = { name: item.name, absorb, hardened: s.hardened ?? null, all };
   }
   return best;
}

/** Natural results of every active d10 in some rolls. */
function d10Results(...rolls) {
   return rolls
      .filter(Boolean)
      .flatMap((r) => r.dice)
      .filter((d) => d.faces === 10)
      .flatMap((d) => d.results.filter((x) => x.active !== false).map((x) => x.result));
}

/** Endurance at which the actor dies: a negative score equal to half its maximum. */
function deathAt(actor) {
   const max = actor.system.endurance.max ?? 0;
   // Hard to Kill: die only at a negative score equal to maximum Endurance.
   return actor.system.hardToKill ? -max : -max / 2;
}

/* -------------------------------------------- */
/*  Rolling damage                              */
/* -------------------------------------------- */

/**
 * Roll the damage for a hit and post the damage card.
 *
 * @param {object} attack  The attack card's state (flags.edrpg.attack).
 *
 * @param {Actor} attacker
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollDamage(attack, attacker) {
   const state = {
      actorUuid: attack.actorUuid,
      actorName: attack.actorName,
      weaponName: attack.weaponName,
      damageType: attack.damageType,
      isFighting: attack.skill === "fighting",
      targetUuid: attack.targetUuid,
      targetName: attack.targetName,
      divided: !!attack.divideFire,
      explosive: !!attack.isExplosive,
      // A free attack (point blank / running away) that knocks the target over ends their turn (p.60).
      free: !!attack.free,
      amounts: [],
      applied: [],
   };
   const rolls = [];

   if (attack.isExplosive) {
      const b = attack.blast ?? {};
      state.knock = true;
      state.blast = b;
      if (b.fatal !== null && b.fatal !== undefined) {
         state.amounts.push({ key: "fatal", value: b.fatal, label: game.i18n.format("EDRPG.damage.fatal", { radius: b.fatalRadius ?? "?" }) });
      }
      if (b.injury !== null && b.injury !== undefined) {
         state.amounts.push({ key: "injury", value: b.injury, label: game.i18n.format("EDRPG.damage.injury", { radius: b.injuryRadius ?? "?" }) });
      }
   } else {
      const formula = String(attack.damage || "0");
      const roll = await new Roll(formula).evaluate();
      rolls.push(roll);
      state.base = { formula, total: roll.total };
      // Fighting: 1D10 halved, rounding up; an even die disarms the target (Core Rules p.60).
      if (attack.halveDamage) {
         state.base = { formula: game.i18n.format("EDRPG.damage.halved", { formula }), total: Math.ceil(roll.total / 2) };
         state.disarm = d10Results(roll).some((r) => r % 2 === 0);
      }
      const extra = burstExtra(attack.burst, attack.margin);
      let burstTotal = 0;
      if (extra?.dice) {
         const burstRoll = await new Roll(`${extra.dice}d10`).evaluate();
         rolls.push(burstRoll);
         burstTotal = burstRoll.total;
         state.burst = { formula: `${extra.dice}D10`, total: burstTotal };
      } else if (extra?.flat) {
         burstTotal = extra.flat;
         state.burst = { formula: game.i18n.format("EDRPG.damage.energyBurst", { points: attack.margin }), total: burstTotal };
      }
      // Strong: +2 Fighting and Melee damage per Enhancement (max +10).
      const strong = attack.isMelee ? (attacker.system.damageBonus ?? 0) : 0;
      if (strong) state.strong = strong;
      let total = state.base.total + burstTotal + strong;
      if (state.divided) total = Math.floor(total / 2);
      const tenCount = d10Results(...rolls).filter((r) => r === 10).length;
      const tens = tenCount > 0;
      state.tens = tens;
      state.tenCount = tenCount;
      state.knock = tens && attack.damageType !== "energy";
      state.noKnockEnergy = tens && attack.damageType === "energy";
      state.dice = d10Results(...rolls);
      state.amounts.push({ key: "hit", value: total, label: game.i18n.localize("EDRPG.damage.title") });
   }

   const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      flavor: game.i18n.format("EDRPG.damage.flavor", { weapon: attack.weaponName }),
      content: await renderDamageCard(state),
      rolls,
      sound: rolls.length && !game.dice3d ? CONFIG.sounds.dice : null,
      flags: { edrpg: { damage: state } },
   };
   return ChatMessage.create(messageData);
}

/**
 * @param {object} state
 *
 * @returns {Promise<string>}
 */
export async function renderDamageCard(state) {
   return foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      ...state,
      damageTypeLabel: `EDRPG.damage.${state.damageType}`,
      main: state.amounts.length === 1 ? state.amounts[0] : null,
      applied: state.applied.map((a) => ({
         ...a,
         stimText: a.stim ? stimText(a.name, a.stim) : null,
         flags: [
            a.knocked && !a.stayedStanding && !a.conditions.includes("dead") ? "EDRPG.status.knockedOver" : null,
            a.stayedStanding ? "EDRPG.damage.stayedStanding" : null,
            a.resisted ? "EDRPG.damage.resistedKnockdown" : null,
            ...(a.escaped ? ["EDRPG.damage.escapedDeath"] : a.conditions.map((c) => `EDRPG.status.${c}`)),
         ].filter(Boolean),
      })),
   });
}

/* -------------------------------------------- */
/*  Applying damage                             */
/* -------------------------------------------- */

/**
 * Apply damage to an actor: armour, Endurance, knockdown and dying.
 *
 * @param {Actor} actor
 *
 * @param {object} hit
 *
 * @param {number} hit.amount
 *
 * @param {string} hit.damageType
 *
 * @param {boolean} [hit.knock]       Knock the target over.
 *
 * @param {boolean} [hit.isFighting]  Fighting damage knocks out without bleeding.
 *
 * @returns {Promise<object>}  A record of what happened, for the card.
 */
export async function applyDamage(actor, { amount, damageType, knock = false, isFighting = false }) {
   const armour = bestArmour(actor, damageType);
   let absorb = 0;
   let hardened = null;
   const rolls = [];
   if (armour) {
      absorb = armour.all ? amount : armour.absorb;
      if (armour.hardened && !armour.all) {
         const r = await new Roll("1d10").evaluate();
         rolls.push(r);
         hardened = { roll: r.total, target: armour.hardened, doubled: r.total >= armour.hardened };
         if (hardened.doubled) absorb *= 2;
      }
   }
   const taken = Math.max(amount - absorb, damageType === "toxic" ? 0 : 1);
   const before = actor.system.endurance.value;
   const after = before - taken;
   const statusesBefore = Object.values(STATUS).filter((id) => has(actor, id));
   const dyingBefore = actor.getFlag("edrpg", "dying") ?? null;

   await actor.update({ "system.endurance.value": after });
   // Taking damage spoils an aim (Core Rules p.61).
   if (taken > 0 && has(actor, STATUS.aiming)) await actor.toggleStatusEffect(STATUS.aiming, { active: false });
   const conditions = await updateCondition(actor, after, { knock, isFighting, cauterised: damageType === "energy", wounded: taken > 0 });
   if (rolls.length && game.dice3d) for (const r of rolls) game.dice3d.showForRoll(r, game.user, true);
   // Dropped: an automatic Stim injector may fire (p.130).
   let stim = null;
   if (conditions.includes("unconscious")) {
      stim = await tryAutoInjector(actor);
      if (stim?.injected) conditions.splice(conditions.indexOf("unconscious"), 1, "stimmed");
      if (stim?.died) conditions.splice(0, conditions.length, "dead");
   }

   return {
      uuid: actor.uuid,
      name: actor.name,
      amount,
      armour: armour ? { name: armour.name, absorb: armour.all ? amount : armour.absorb } : null,
      hardened,
      absorbed: Math.min(absorb, amount),
      taken,
      before,
      after,
      max: actor.system.endurance.max,
      knocked: knock,
      conditions,
      stim,
      statusesBefore,
      dyingBefore,
   };
}

/**
 * Set the conditions that follow from a new Endurance score.
 *
 * @param {Actor} actor
 *
 * @param {number} endurance
 *
 * @param {object} [options]
 *
 * @returns {Promise<string[]>}  Conditions now applied (status keys of {@link STATUS}).
 */
async function updateCondition(actor, endurance, { knock = false, isFighting = false, cauterised = false, wounded = true } = {}) {
   const set = async (key, active) => {
      if (has(actor, STATUS[key]) !== active) {
         await actor.toggleStatusEffect(STATUS[key], { active, overlay: key === "dead" });
      }
   };
   if (knock) await set("knockedOver", true);
   const result = [];
   if (endurance <= deathAt(actor) && endurance < 0) {
      await set("bleeding", false);
      await set("stabilised", false);
      await set("unconscious", false);
      await set("dead", true);
      await markDefeated(actor);
      result.push("dead");
   } else if (endurance <= 0) {
      // Combat Stims keep you conscious at 0 Endurance or below (you still bleed and can still die).
      if (!has(actor, STATUS.stimmed)) {
         await set("unconscious", true);
         result.push("unconscious");
      }
      if (endurance < 0 && wounded && !isFighting) {
         await set("stabilised", false);
         await set("bleeding", true);
         await actor.setFlag("edrpg", "dying", { cauterised });
         result.push("bleeding");
      } else if (has(actor, STATUS.bleeding)) {
         result.push("bleeding");
      }
   }
   return result;
}

/** Mark the actor's combatants defeated. */
async function markDefeated(actor) {
   for (const combat of game.combats) {
      for (const c of combat.combatants) {
         if (c.actor?.uuid === actor.uuid && !c.defeated) await c.update({ defeated: true });
      }
   }
}

/**
 * Undo a hit (Escape Death): restore Endurance and the conditions from before it.
 *
 * @param {Actor} actor
 *
 * @param {object} record  From {@link applyDamage}.
 */
async function revertHit(actor, record) {
   await actor.update({ "system.endurance.value": record.before });
   for (const id of Object.values(STATUS)) {
      const wanted = record.statusesBefore.includes(id);
      if (has(actor, id) !== wanted) await actor.toggleStatusEffect(id, { active: wanted, overlay: id === STATUS.dead });
   }
   if (record.dyingBefore) await actor.setFlag("edrpg", "dying", record.dyingBefore);
   else await actor.unsetFlag("edrpg", "dying");
   for (const combat of game.combats) {
      for (const c of combat.combatants) {
         if (c.actor?.uuid === actor.uuid && c.defeated && !record.statusesBefore.includes(STATUS.dead)) await c.update({ defeated: false });
      }
   }
}

/**
 * Heal Endurance (treatment, natural healing), clearing unconsciousness and bleeding once above 0.
 *
 * @param {Actor} actor
 *
 * @param {number} amount
 *
 * @param {string} [source]  Chat line, e.g. "Treated by Jenya".
 */
export async function heal(actor, amount, source = "") {
   if (has(actor, STATUS.dead) || amount <= 0) return;
   const { value, max } = actor.system.endurance;
   const after = Math.min(max, value + amount);
   await actor.update({ "system.endurance.value": after });
   if (after > 0) {
      for (const key of ["unconscious", "bleeding", "stabilised"]) {
         if (has(actor, STATUS[key])) await actor.toggleStatusEffect(STATUS[key], { active: false });
      }
      await actor.unsetFlag("edrpg", "dying");
   }
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${game.i18n.format("EDRPG.damage.healed", {
         name: foundry.utils.escapeHTML(actor.name),
         amount: after - value,
         value: after,
         max,
      })}${source ? ` <span class="muted">(${foundry.utils.escapeHTML(source)})</span>` : ""}</p></div>`,
   });
}

/**
 * Stop the bleeding.
 *
 * @param {Actor} actor
 */
export async function stabilise(actor) {
   if (has(actor, STATUS.bleeding)) await actor.toggleStatusEffect(STATUS.bleeding, { active: false });
   if (!has(actor, STATUS.dead) && actor.system.endurance.value < 0 && !has(actor, STATUS.stabilised)) {
      await actor.toggleStatusEffect(STATUS.stabilised, { active: true });
   }
   await actor.unsetFlag("edrpg", "dying");
}

/**
 * Roll for bleeding out at the start of the actor's turn.
 *
 * @param {Actor} actor
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function bleedOut(actor) {
   if (!has(actor, STATUS.bleeding) || has(actor, STATUS.dead)) return null;
   const roll = await new Roll("1d10").evaluate();
   const dying = actor.getFlag("edrpg", "dying") ?? {};
   let loss = roll.total;
   let stabilised;
   let key;
   if (dying.cauterised) {
      if (roll.total === 10) {
         stabilised = false;
         key = "cauterisedTen";
         await actor.setFlag("edrpg", "dying", { cauterised: false });
      } else {
         loss = 0;
         stabilised = true;
         key = "cauterised";
      }
   } else {
      stabilised = roll.total % 2 === 1;
      key = stabilised ? "odd" : "even";
   }
   const after = actor.system.endurance.value - loss;
   if (loss) await actor.update({ "system.endurance.value": after });
   let dead = false;
   if (after <= deathAt(actor)) {
      await updateCondition(actor, after);
      dead = true;
   } else if (stabilised) await stabilise(actor);

   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.localize("EDRPG.damage.bleedOutTitle"),
      content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${game.i18n.format(`EDRPG.damage.bleed.${key}`, {
         name: foundry.utils.escapeHTML(actor.name),
         roll: roll.total,
         loss,
      })}</p><p>${game.i18n.format(dead ? "EDRPG.damage.bleed.died" : "EDRPG.damage.enduranceNow", {
         name: foundry.utils.escapeHTML(actor.name),
         value: after,
         max: actor.system.endurance.max,
      })}</p></div>`,
      rolls: [roll],
      sound: game.dice3d ? null : CONFIG.sounds.dice,
   });
}

/* -------------------------------------------- */
/*  Medicine                                    */
/* -------------------------------------------- */

/**
 * The character who helps: a controlled token's actor other than the patient, else the user's character.
 *
 * @param {Actor} patient
 *
 * @returns {Actor|null}
 */
function findMedic(patient) {
   const controlled = canvas?.tokens?.controlled?.map((t) => t.actor).find((a) => a && a.uuid !== patient.uuid && a.isOwner);
   return controlled ?? (game.user.character && game.user.character.uuid !== patient.uuid ? game.user.character : null);
}

/**
 * Medicine check to stabilise a bleeding patient (difficulty 8 if dropped by an Energy weapon, 10 otherwise).
 *
 * @param {Actor} patient
 */
export async function promptStabilise(patient) {
   const medic = findMedic(patient);
   if (!medic) return ui.notifications.warn("EDRPG.damage.noMedic", { localize: true });
   const energy = patient.getFlag("edrpg", "dying")?.cauterised;
   return rollSkillCheck(medic, "medicine", {
      difficulty: energy ? 8 : 10,
      allowContest: false,
      label: game.i18n.format("EDRPG.damage.stabiliseTitle", { name: patient.name }),
      followUp: { kind: "stabilise", targetUuid: patient.uuid },
   });
}

/**
 * Medicine check to treat wounds: heals the check's total (at most every six hours, with a Medpack or proper kit).
 *
 * @param {Actor} patient
 */
export async function promptTreatWounds(patient) {
   const medic = findMedic(patient) ?? (patient.system.endurance.value > 0 ? patient : null);
   if (!medic) return ui.notifications.warn("EDRPG.damage.noMedic", { localize: true });
   return rollSkillCheck(medic, "medicine", {
      difficulty: 0,
      allowContest: false,
      label: game.i18n.format("EDRPG.damage.treatTitle", { name: patient.name }),
      followUp: { kind: "treat", targetUuid: patient.uuid },
   });
}

/**
 * Hook: act on Medicine checks made to stabilise or treat someone.
 *
 * @param {ChatMessage} message
 *
 * @param {object} result  { actor, outcome, natural, total, followUp }
 */
async function onSkillCheckResult(message, { actor, outcome, natural, total, followUp }) {
   if (!followUp?.targetUuid) return;
   const success = outcome === "success" || outcome === "critSuccess";
   if (followUp.kind === "stabilise" && success) {
      await perform({ type: "stabilise", actorUuid: followUp.targetUuid });
   } else if (followUp.kind === "treat" && natural !== 1) {
      await perform({ type: "heal", actorUuid: followUp.targetUuid, amount: total, source: game.i18n.format("EDRPG.damage.treatedBy", { name: actor.name }) });
   }
}

/* -------------------------------------------- */
/*  Actions & socket                            */
/* -------------------------------------------- */

/**
 * Run an action on the GM's client if this user can't (the target belongs to someone else, or the card needs updating).
 *
 * @param {object} action
 */
async function perform(action) {
   const actor = action.actorUuid ? await fromUuid(action.actorUuid) : null;
   const local = game.user.isGM || (actor?.isOwner && !action.messageId);
   if (local) return execute(action);
   if (!game.users.activeGM) return ui.notifications.warn("EDRPG.contest.needsGM", { localize: true });
   game.socket.emit(SOCKET, { action: "damageAction", payload: action });
}

/**
 * Carry out an action (GM or owner).
 *
 * @param {object} action
 */
async function execute(action) {
   if (action.type === "heal") {
      const actor = await fromUuid(action.actorUuid);
      if (actor) await heal(actor, action.amount, action.source);
      return;
   }
   if (action.type === "stabilise") {
      const actor = await fromUuid(action.actorUuid);
      if (actor) {
         await stabilise(actor);
         await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${game.i18n.format("EDRPG.damage.stabilised", { name: foundry.utils.escapeHTML(actor.name) })}</p></div>`,
         });
      }
      return;
   }

   const message = game.messages.get(action.messageId);
   const state = foundry.utils.deepClone(message?.getFlag("edrpg", "damage"));
   if (!state) return;

   if (action.type === "apply") {
      const amount = state.amounts.find((a) => a.key === action.amountKey);
      if (!amount) return;
      for (const uuid of action.targetUuids) {
         const actor = await fromUuid(uuid);
         if (!actor?.system?.endurance) continue;
         // Resist Knockdown (N): ignore the first N tens on the damage dice (Core Rules p.125).
         const resist = actor.system.resistKnockdown ?? 0;
         const knock = state.explosive ? state.knock : state.knock && (state.tenCount ?? 1) > resist;
         const record = await applyDamage(actor, {
            amount: amount.value,
            damageType: state.damageType,
            knock,
            isFighting: state.isFighting,
         });
         if (state.knock && !knock) record.resisted = true;
         record.amountKey = amount.key;
         state.applied.push(record);
      }
   } else if (action.type === "escapeDeath" || action.type === "stayStanding") {
      const record = state.applied[action.index];
      const actor = record ? await fromUuid(record.uuid) : null;
      if (!actor) return;
      if (action.type === "escapeDeath") {
         await revertHit(actor, record);
         record.escaped = true;
      } else {
         if (has(actor, STATUS.knockedOver) && !record.statusesBefore.includes(STATUS.knockedOver)) {
            await actor.toggleStatusEffect(STATUS.knockedOver, { active: false });
         }
         record.stayedStanding = true;
      }
   }
   await message.update({ content: await renderDamageCard(state), "flags.edrpg.damage": state });
}

/** Socket listener and hooks (call once, at `ready`). */
export function registerDamageHooks() {
   game.socket.on(SOCKET, async (data) => {
      if (data?.action !== "damageAction" || !game.user.isActiveGM) return;
      await execute(data.payload);
   });
   Hooks.on("edrpg.skillCheck", (message, result) => onSkillCheckResult(message, result));
   // Bleeding out: roll at the start of the bleeding combatant's turn.
   Hooks.on("combatTurnChange", async (combat, prior) => {
      if (!game.user.isActiveGM) return;
      // A failed automatic Stim injector tries again at the end of each of the wearer's turns.
      const previous = prior?.combatantId ? combat.combatants.get(prior.combatantId)?.actor : null;
      if (previous?.getFlag("edrpg", "injectorPending") && has(previous, STATUS.unconscious) && !has(previous, STATUS.dead)) {
         const result = await tryAutoInjector(previous);
         if (result) await postStimMessage(previous, result);
      }
      const actor = combat.combatant?.actor;
      if (actor && has(actor, STATUS.bleeding)) bleedOut(actor);
   });
}

/* -------------------------------------------- */
/*  Card buttons                                */
/* -------------------------------------------- */

/**
 * Karma Capabilities on an actor that stop a knockdown (Stay Standing), usable now.
 *
 * @param {Actor} actor
 *
 * @returns {Item[]}
 */
function stayStandingOptions(actor) {
   const pool = actor.system.karma?.standard.value ?? 0;
   return actor.itemTypes.karma.filter((k) => {
      if (!k.system.preventsKnockdown) return false;
      if (actor.type === "opponent") return (k.system.timesUsed ?? 0) < (k.system.usesPerBattle ?? 1);
      return !k.system.usedThisTurn && pool >= k.system.cost;
   });
}

/**
 * Escape Death for an actor: its own item, or the built-in one for player characters.
 *
 * @param {Actor} actor
 *
 * @returns {Item|object|null}
 */
function escapeDeathFor(actor) {
   const item = actor.itemTypes.karma.find((k) => k.system.costAll);
   if (item) {
      if (actor.type === "opponent") return (item.system.timesUsed ?? 0) < (item.system.usesPerBattle ?? 1) ? item : null;
      return (actor.system.karma?.standard.value ?? 0) > 0 ? item : null;
   }
   if (actor.type === "character" && (actor.system.karma?.standard.value ?? 0) > 0) return builtInEscapeDeath();
   return null;
}

/**
 * Render hook: apply buttons for the GM / attacker, Karma buttons for the targets' owners.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderDamage(message, html) {
   const state = message.getFlag("edrpg", "damage");
   const card = html.querySelector(".edrpg-damage");
   if (!state || !card) return;
   const controls = card.querySelector(".damage-controls");
   if (!controls) return;
   const attacker = fromUuidSync(state.actorUuid);

   const add = (label, onClick, cls = "", tooltip = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = cls;
      button.innerHTML = label;
      if (tooltip) button.dataset.tooltip = tooltip;
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
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));

   if (game.user.isGM || attacker?.isOwner) {
      for (const amount of state.amounts) {
         const suffix = state.amounts.length > 1 ? ` — ${amount.label} (${amount.value})` : ` (${amount.value})`;
         const appliedToTarget = state.applied.some((a) => a.uuid === state.targetUuid && a.amountKey === amount.key);
         if (state.targetUuid && !state.explosive && !appliedToTarget) {
            add(
               `<i class="fa-solid fa-crosshairs"></i> ${i18n("EDRPG.damage.applyTarget", { name: foundry.utils.escapeHTML(state.targetName ?? "") })}${suffix}`,
               () => perform({ type: "apply", messageId: message.id, amountKey: amount.key, targetUuids: [state.targetUuid] }),
            );
         }
         add(
            `<i class="fa-solid fa-users"></i> ${i18n("EDRPG.damage.applySelected")}${suffix}`,
            () => {
               const uuids = (canvas?.tokens?.controlled ?? []).map((t) => t.actor?.uuid).filter(Boolean);
               if (!uuids.length) return ui.notifications.warn("EDRPG.damage.noneSelected", { localize: true });
               return perform({ type: "apply", messageId: message.id, amountKey: amount.key, targetUuids: uuids });
            },
            "",
            i18n("EDRPG.damage.applySelectedHint"),
         );
      }
   }

   // Attacker: a Toxin Injector (or similar) adds its extra damage to a Fighting hit, once per hit.
   if (attacker?.isOwner && state.isFighting && !state.explosive) {
      const used = new Set(state.extraRolled ?? []);
      for (const item of attacker.itemTypes?.cybernetic ?? []) {
         const s = item.system;
         if (!s.fightingDamage || used.has(item.id)) continue;
         const left = s.uses?.max !== null ? (s.uses.value ?? 0) : null;
         if (left === 0) continue;
         add(
            `<i class="fa-solid fa-syringe"></i> ${foundry.utils.escapeHTML(item.name)} (+${s.fightingDamage.toUpperCase()}${left !== null ? `, ${i18n("EDRPG.stim.usesLeft", { left })}` : ""})`,
            async () => {
               await rollExtraDamage(state, attacker, item);
               if (message.isOwner) await message.setFlag("edrpg", "damage.extraRolled", [...used, item.id]);
            },
            "karma",
         );
      }
   }

   // Targets' owners: Stay Standing after a knockdown, Escape Death after a hit that dropped them below 1.
   state.applied.forEach((record, index) => {
      if (record.escaped) return;
      const actor = fromUuidSync(record.uuid);
      if (!actor?.isOwner) return;
      if (record.knocked && !record.stayedStanding && !record.conditions.includes("dead")) {
         for (const item of stayStandingOptions(actor)) {
            add(
               `<i class="fa-solid fa-yin-yang"></i> ${foundry.utils.escapeHTML(actor.name)}: ${foundry.utils.escapeHTML(item.name)}`,
               async () => {
                  if (await useKarmaCapability(actor, item)) await perform({ type: "stayStanding", messageId: message.id, index });
               },
               "karma",
            );
         }
      }
      if (record.after < 1) {
         const capability = escapeDeathFor(actor);
         if (capability) {
            add(
               `<i class="fa-solid fa-skull"></i> ${foundry.utils.escapeHTML(actor.name)}: ${foundry.utils.escapeHTML(capability.name)}`,
               async () => {
                  if (await useKarmaCapability(actor, capability)) await perform({ type: "escapeDeath", messageId: message.id, index });
               },
               "karma",
               i18n("EDRPG.damage.escapeDeathHint"),
            );
         }
      }
   });
   if (!controls.children.length) controls.remove();
}

/* -------------------------------------------- */
/*  Sheet condition panel                       */
/* -------------------------------------------- */

/**
 * Context for the condition panel on actor sheets.
 *
 * @param {Actor} actor
 *
 * @returns {object}
 */
export function conditionView(actor) {
   const statuses = Object.entries(STATUS)
      .filter(([, id]) => has(actor, id))
      .map(([key]) => ({ key, label: `EDRPG.status.${key}` }));
   const { value, max } = actor.system.endurance;
   return {
      statuses,
      value,
      max,
      deathAt: actor.system.hardToKill ? -max : -Math.ceil(max / 2),
      knockedOver: has(actor, STATUS.knockedOver),
      bleeding: has(actor, STATUS.bleeding),
      dead: has(actor, STATUS.dead),
      wounded: value < max && !has(actor, STATUS.dead),
      aiming: has(actor, STATUS.aiming),
      grabbed: has(actor, STATUS.grabbed),
      grabbing: has(actor, STATUS.grabbing),
      stimmed: has(actor, STATUS.stimmed),
      canStim: !has(actor, STATUS.stimmed) && !has(actor, STATUS.dead) && stimDrugs(actor).length > 0,
      alive: !has(actor, STATUS.dead),
      cauterised: !!actor.getFlag("edrpg", "dying")?.cauterised,
      speed: typeof actor.system.speed === "number" ? actor.system.speed : null,
   };
}

/**
 * Sheet actions shared by the character and opponent sheets.
 *
 * @param {Actor} actor
 *
 * @param {string} which  standUp | bleedOut | stabilise | treatWounds | restDay
 */
export async function conditionAction(actor, which) {
   switch (which) {
      case "standUp":
         if (has(actor, STATUS.knockedOver)) await actor.toggleStatusEffect(STATUS.knockedOver, { active: false });
         return;
      case "bleedOut":
         return bleedOut(actor);
      case "stabilise":
         return promptStabilise(actor);
      case "treatWounds":
         return promptTreatWounds(actor);
      case "restDay": {
         // A day's rest: natural healing, and per-day cybernetics (Toxin Injectors) recharge.
         const recharge = actor.itemTypes?.cybernetic?.filter((c) => c.system.uses?.max !== null && c.system.uses.value < c.system.uses.max) ?? [];
         if (recharge.length) await actor.updateEmbeddedDocuments("Item", recharge.map((c) => ({ _id: c.id, "system.uses.value": c.system.uses.max })));
         return heal(actor, 5, game.i18n.localize("EDRPG.damage.naturalHealing"));
      }
      case "aim":
         return actor.toggleStatusEffect(STATUS.aiming, { active: !has(actor, STATUS.aiming) });
      case "escapeGrab":
         return (await import("./grab.mjs")).escapeGrab(actor);
      case "releaseGrab":
         return (await import("./grab.mjs")).releaseGrab(actor);
      case "injectStim":
         return promptInjectStim(actor);
      case "stimEnds":
         return endStim(actor);
   }
}

/* -------------------------------------------- */
/*  Combat Stims                                */
/* -------------------------------------------- */

/**
 * Carried Combat Stim doses.
 *
 * @param {Actor} actor
 *
 * @returns {Item[]}
 */
function stimDrugs(actor) {
   return (actor.itemTypes?.gear ?? []).filter((g) => g.system.category === "stim" && g.system.quantity > 0 && g.system.location === "carried");
}

/**
 * Carried Stim injectors, best first.
 *
 * @param {Actor} actor
 *
 * @param {boolean} [automatic]  Only automatic dispensers (below 100%: the manual syringe needs an action).
 *
 * @returns {Item[]}
 */
function stimInjectors(actor, automatic = false) {
   return (actor.itemTypes?.gear ?? [])
      .filter((g) => g.system.category === "injector" && g.system.location === "carried" && g.system.injectionSuccess !== null)
      .filter((g) => !automatic || g.system.injectionSuccess < 100)
      .sort((a, b) => b.system.injectionSuccess - a.system.injectionSuccess);
}

/**
 * Inject a dose: use it up, set the Stimmed status, and wake an unconscious character (who starts their next turn
 * knocked over). An automatic dispenser fires as you black out, so you never fall unconscious or over.
 *
 * @param {Actor} actor
 *
 * @param {Item} drug
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.automatic]
 */
async function injectStim(actor, drug, { automatic = false } = {}) {
   await drug.update({ "system.quantity": drug.system.quantity - 1 });
   await actor.setFlag("edrpg", "stim", { name: drug.name, effect: drug.system.stimEffect ?? "" });
   await actor.unsetFlag("edrpg", "injectorPending");
   if (!has(actor, STATUS.stimmed)) await actor.toggleStatusEffect(STATUS.stimmed, { active: true });
   if (has(actor, STATUS.unconscious)) {
      await actor.toggleStatusEffect(STATUS.unconscious, { active: false });
      if (!automatic && !has(actor, STATUS.knockedOver)) await actor.toggleStatusEffect(STATUS.knockedOver, { active: true });
   }
}

/**
 * An automatic dispenser fires when its wearer drops to 0 Endurance or less: roll percentile against its Injection
 * Success score; a roll of 100 overloads the heart (Core Rules p.130).
 *
 * @param {Actor} actor
 *
 * @returns {Promise<object|null>}  { roll, chance, injector, drug, injected, died } or null if no dispenser and dose.
 */
async function tryAutoInjector(actor) {
   const injector = stimInjectors(actor, true)[0];
   const drug = stimDrugs(actor)[0];
   if (!injector || !drug || has(actor, STATUS.stimmed)) return null;
   const roll = await new Roll("1d100").evaluate();
   if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);
   const chance = injector.system.injectionSuccess;
   const result = { roll: roll.total, chance, injector: injector.name, drug: drug.name, injected: false, died: false };
   if (roll.total === 100) {
      result.died = true;
      await actor.unsetFlag("edrpg", "injectorPending");
      for (const key of ["unconscious", "bleeding", "stabilised"]) {
         if (has(actor, STATUS[key])) await actor.toggleStatusEffect(STATUS[key], { active: false });
      }
      await actor.toggleStatusEffect(STATUS.dead, { active: true, overlay: true });
      await markDefeated(actor);
   } else if (roll.total <= chance) {
      result.injected = true;
      // On the first try the dispenser fires before you black out; a later retry wakes you, knocked over.
      await injectStim(actor, drug, { automatic: !actor.getFlag("edrpg", "injectorPending") });
   } else {
      await actor.setFlag("edrpg", "injectorPending", true);
   }
   return result;
}

/**
 * Chat line for an automatic injector roll made outside a damage card.
 *
 * @param {Actor} actor
 *
 * @param {object} result
 */
async function postStimMessage(actor, result) {
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.localize("EDRPG.stim.title"),
      content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${stimText(actor.name, result)}</p></div>`,
   });
}

/**
 * @param {string} name
 *
 * @param {object} result
 *
 * @returns {string}
 */
export function stimText(name, result) {
   const key = result.died ? "EDRPG.stim.overload" : result.injected ? "EDRPG.stim.injected" : "EDRPG.stim.failed";
   return game.i18n.format(key, { name: foundry.utils.escapeHTML(name), ...result });
}

/**
 * Inject a Combat Stim by hand (or with a dispenser), choosing the dose.
 *
 * @param {Actor} actor
 */
async function promptInjectStim(actor) {
   const drugs = stimDrugs(actor);
   if (!drugs.length) return ui.notifications.warn("EDRPG.stim.noDose", { localize: true });
   if (!stimInjectors(actor).length) return ui.notifications.warn("EDRPG.stim.noInjector", { localize: true });
   let drug = drugs[0];
   if (drugs.length > 1) {
      const result = await foundry.applications.api.DialogV2.input({
         window: { title: game.i18n.localize("EDRPG.stim.inject"), icon: "fa-solid fa-syringe" },
         classes: ["edrpg", "edrpg-dialog"],
         content: `<div class="form-group"><label>${game.i18n.localize("EDRPG.stim.dose")}</label><div class="form-fields"><select name="drug">${drugs
            .map((d) => `<option value="${d.id}">${foundry.utils.escapeHTML(d.name)} (${d.system.quantity})</option>`)
            .join("")}</select></div></div>`,
         ok: { label: "EDRPG.stim.inject", icon: "fa-solid fa-syringe" },
         rejectClose: false,
      });
      if (!result) return;
      drug = actor.items.get(result.drug) ?? drug;
   }
   await injectStim(actor, drug);
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${game.i18n.format("EDRPG.stim.manual", { name: foundry.utils.escapeHTML(actor.name), drug: foundry.utils.escapeHTML(drug.name) })}</p></div>`,
   });
}

/**
 * The stim wears off (about an hour): at 0 Endurance or less you fall unconscious.
 *
 * @param {Actor} actor
 */
async function endStim(actor) {
   if (has(actor, STATUS.stimmed)) await actor.toggleStatusEffect(STATUS.stimmed, { active: false });
   await actor.unsetFlag("edrpg", "stim");
   if (actor.system.endurance.value <= 0 && !has(actor, STATUS.dead) && !has(actor, STATUS.unconscious)) {
      await actor.toggleStatusEffect(STATUS.unconscious, { active: true });
   }
}

/* -------------------------------------------- */
/*  Toxin Injector                              */
/* -------------------------------------------- */

/**
 * Extra damage from a cybernetic on a Fighting hit (Toxin Injector), posted as its own damage card.
 *
 * @param {object} damage    The Fighting hit's damage card state.
 *
 * @param {Actor} attacker
 *
 * @param {Item} item        The cybernetic.
 */
export async function rollExtraDamage(damage, attacker, item) {
   const s = item.system;
   if (s.uses?.max !== null && (s.uses.value ?? 0) < 1) return ui.notifications.warn(game.i18n.format("EDRPG.stim.noUses", { name: item.name }));
   const roll = await new Roll(s.fightingDamage).evaluate();
   if (s.uses?.max !== null) await item.update({ "system.uses.value": s.uses.value - 1 });
   const state = {
      actorUuid: damage.actorUuid,
      actorName: damage.actorName,
      weaponName: item.name,
      damageType: s.fightingDamageType || "toxic",
      isFighting: false,
      targetUuid: damage.targetUuid,
      targetName: damage.targetName,
      divided: false,
      explosive: false,
      free: false,
      // An injection, not a blow: it doesn't knock anyone over.
      knock: false,
      extra: true,
      base: { formula: s.fightingDamage.toUpperCase(), total: roll.total },
      dice: d10Results(roll),
      amounts: [{ key: "hit", value: roll.total, label: game.i18n.localize("EDRPG.damage.title") }],
      applied: [],
   };
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      flavor: game.i18n.format("EDRPG.damage.flavor", { weapon: item.name }),
      content: await renderDamageCard(state),
      rolls: [roll],
      sound: game.dice3d ? null : CONFIG.sounds.dice,
      flags: { edrpg: { damage: state } },
   });
}
