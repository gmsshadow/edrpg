import { STATUS } from "./damage.mjs";
import { showDice } from "./contest.mjs";

const SOCKET = "system.edrpg";

/**
 * Grabbing and escaping (Core Rules p.61).
 *
 * A Fighting attack can grab instead of hitting. On a hit both sides make an Athletics check, adding any Strength
 * damage bonuses (Strong, arm upgrades); opponents may use To Hit instead of Athletics. The grabber must beat the
 * target. While grabbed, both have Defence (Dodge) 0 and can't Parry; the grabbed one can only try to Escape: the
 * same check, which must exceed the grabber's.
 */

/**
 * Athletics + Strength damage bonus for a grab or escape.
 *
 * @param {Actor} actor
 *
 * @returns {number}
 */
export function grabBonus(actor) {
   const sys = actor.system;
   let athletics;
   if (actor.type === "opponent") {
      athletics = sys.otherSkills?.find((s) => s.skill === "athletics")?.bonus ?? sys.toHit ?? 0;
   } else {
      athletics = sys.skillBonus?.("athletics") ?? 0;
   }
   return athletics + (sys.damageBonus ?? 0);
}

/**
 * Roll the opposed check.
 *
 * @param {Actor} actor
 *
 * @param {Actor} other
 *
 * @returns {Promise<object>}  { mine, theirs } each { natural, bonus, total }
 */
export async function rollGrabCheck(actor, other) {
   const side = async (who) => {
      const bonus = grabBonus(who);
      const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
      await showDice(roll);
      return { name: who.name, natural: roll.dice[0].total, bonus, total: roll.total };
   };
   return { mine: await side(actor), theirs: await side(other) };
}

/**
 * Set or clear a grab (on a client that may update both actors).
 *
 * @param {object} action  { type: "set"|"clear", grabberUuid, targetUuid }
 */
async function execute({ type, grabberUuid, targetUuid }) {
   const grabber = grabberUuid ? await fromUuid(grabberUuid) : null;
   const target = targetUuid ? await fromUuid(targetUuid) : null;
   const active = type === "set";
   for (const [actor, status, flag, other] of [
      [grabber, STATUS.grabbing, "grabbing", targetUuid],
      [target, STATUS.grabbed, "grabbedBy", grabberUuid],
   ]) {
      if (!actor) continue;
      if (actor.statuses.has(status) !== active) await actor.toggleStatusEffect(status, { active });
      if (active) await actor.setFlag("edrpg", flag, other);
      else await actor.unsetFlag("edrpg", flag);
   }
}

/**
 * Run a grab change here if allowed, otherwise on the active GM's client.
 *
 * @param {object} action
 */
export async function performGrab(action) {
   const actors = await Promise.all([action.grabberUuid, action.targetUuid].filter(Boolean).map((u) => fromUuid(u)));
   if (game.user.isGM || actors.every((a) => a?.isOwner)) return execute(action);
   if (!game.users.activeGM) return ui.notifications.warn("EDRPG.contest.needsGM", { localize: true });
   game.socket.emit(SOCKET, { action: "grabAction", payload: action });
}

/** Socket listener (call once, at `ready`). */
export function registerGrabSocket() {
   game.socket.on(SOCKET, async (data) => {
      if (data?.action !== "grabAction" || !game.user.isActiveGM) return;
      await execute(data.payload);
   });
}

/**
 * Escape action for a grabbed actor: Athletics (+ Strength) must exceed the grabber's.
 *
 * @param {Actor} actor
 */
export async function escapeGrab(actor) {
   const grabberUuid = actor.getFlag("edrpg", "grabbedBy");
   const grabber = grabberUuid ? await fromUuid(grabberUuid) : null;
   if (!grabber) {
      // The grabber is gone: just clear the condition.
      return performGrab({ type: "clear", targetUuid: actor.uuid });
   }
   const { mine, theirs } = await rollGrabCheck(actor, grabber);
   const escaped = mine.total > theirs.total;
   if (escaped) await performGrab({ type: "clear", grabberUuid, targetUuid: actor.uuid });
   const line = (s) => `${foundry.utils.escapeHTML(s.name)}: ${s.natural} + ${s.bonus} = <b>${s.total}</b>`;
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.localize("EDRPG.grab.escapeTitle"),
      content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${line(mine)}<br>${line(theirs)}</p><p><b>${game.i18n.localize(
         escaped ? "EDRPG.grab.escaped" : "EDRPG.grab.stillHeld",
      )}</b></p></div>`,
   });
}

/**
 * Let go of a grabbed enemy.
 *
 * @param {Actor} actor
 */
export async function releaseGrab(actor) {
   return performGrab({ type: "clear", grabberUuid: actor.uuid, targetUuid: actor.getFlag("edrpg", "grabbing") ?? null });
}
