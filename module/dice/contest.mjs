import { rollSkillDice, rollFlatDice, skillLabel } from "./skill-check.mjs";

const CARD_TEMPLATE = "systems/edrpg/templates/chat/contest.hbs";
const SOCKET = "system.edrpg";

/**
 * Contested checks (see `contestPairs` in config.mjs for the book's cases).
 *
 * The initiator rolls when the contest starts; the card then waits for the opponent. Whoever controls the
 * opponent (the GM for a flat-bonus opponent) clicks Roll on the card. Players can't edit a card someone else
 * created, so their result is relayed to the active GM over the system socket, and the GM's client updates it.
 */

/**
 * Who wins a contest. Natural 1 always loses and natural 10 always wins (Core Rules p.44, applied to both
 * sides); if both sides roll the same natural 1 or 10, compare totals. Ties follow the contest's tie rule.
 *
 * @param {{natural: number, total: number}} a   Initiator result.
 *
 * @param {{natural: number, total: number}} d   Defender result.
 *
 * @param {"initiator"|"defender"} ties
 *
 * @returns {{winner: "initiator"|"defender", reason: string}}
 */
export function contestWinner(a, d, ties) {
   if (a.natural === 1 && d.natural !== 1) return { winner: "defender", reason: "natural1" };
   if (d.natural === 1 && a.natural !== 1) return { winner: "initiator", reason: "natural1" };
   if (a.natural === 10 && d.natural !== 10) return { winner: "initiator", reason: "natural10" };
   if (d.natural === 10 && a.natural !== 10) return { winner: "defender", reason: "natural10" };
   if (a.total > d.total) return { winner: "initiator", reason: "total" };
   if (d.total > a.total) return { winner: "defender", reason: "total" };
   return { winner: ties, reason: "tie" };
}

/**
 * Serialise a roll result for storage in message flags.
 *
 * @param {object} result  From rollSkillDice / rollFlatDice.
 *
 * @returns {object}
 */
function storeResult({ roll, natural, total, bonus, socialFactor, modifier }) {
   return { natural, total, bonus, socialFactor, modifier, roll: roll.toJSON(), karma: false };
}

/**
 * Start a contested check from the skill dialog.
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {object} opts  Dialog result: targetUuid, opposingSkill, opponentName, opponentBonus, ties, hidden,
 *                       modifier, socialFactor.
 *
 * @returns {Promise<ChatMessage>}
 */
export async function startContest(actor, skill, opts) {
   const target = opts.targetUuid ? await fromUuid(opts.targetUuid) : null;
   const result = await rollSkillDice(actor, skill, { modifier: opts.modifier, socialFactor: opts.socialFactor });

   const contest = {
      ties: opts.ties,
      hidden: opts.hidden,
      initiator: {
         kind: "actor",
         actorUuid: actor.uuid,
         name: actor.name,
         skill,
         socialFactor: opts.socialFactor,
         result: storeResult(result),
      },
      defender: target
         ? { kind: "actor", actorUuid: target.uuid, name: target.name, skill: opts.opposingSkill, result: null }
         : { kind: "flat", name: opts.opponentName, skill: opts.opposingSkill, bonus: opts.opponentBonus, result: null },
      outcome: null,
   };

   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await renderContestCard(contest, { reveal: false }),
      sound: CONFIG.sounds.dice,
      flags: { edrpg: { contest } },
   });
}

/**
 * Render the card. Hidden opponent results are masked unless `reveal` (GM view).
 *
 * @param {object} contest
 *
 * @param {object} options
 *
 * @param {boolean} options.reveal
 *
 * @returns {Promise<string>}
 */
export async function renderContestCard(contest, { reveal }) {
   const side = (key) => {
      const s = contest[key];
      const masked = key === "defender" && contest.hidden && !reveal;
      const r = s.result;
      return {
         key,
         name: s.name,
         what: skillLabel(s.skill),
         rolled: !!r,
         masked: masked && !!r,
         natural: r?.natural,
         total: r?.total,
         bonus: r?.bonus,
         socialFactor: r?.socialFactor,
         modifier: r?.modifier,
         karma: r?.karma,
      };
   };
   const initiator = side("initiator");
   const defender = side("defender");
   const outcome = contest.outcome;
   return foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      title: `${initiator.what} ${game.i18n.localize("EDRPG.contest.vs")} ${defender.what}`,
      initiator,
      defender,
      hiddenNote: contest.hidden,
      tiesLabel: `EDRPG.contest.tiesShort.${contest.ties}`,
      outcome: outcome
         ? {
              winnerName: contest[outcome.winner].name,
              initiatorWins: outcome.winner === "initiator",
              reason: `EDRPG.contest.reason.${outcome.reason}`,
           }
         : null,
   });
}

/**
 * Apply a side's result to the card (must run on a client allowed to update the message).
 *
 * @param {ChatMessage} message
 *
 * @param {"initiator"|"defender"} sideKey
 *
 * @param {object} result
 */
async function applyContestUpdate(message, sideKey, result) {
   const contest = foundry.utils.deepClone(message.getFlag("edrpg", "contest"));
   if (!contest) return;
   contest[sideKey].result = result;
   contest.outcome =
      contest.initiator.result && contest.defender.result
         ? contestWinner(contest.initiator.result, contest.defender.result, contest.ties)
         : null;
   await message.update({
      content: await renderContestCard(contest, { reveal: false }),
      "flags.edrpg.contest": contest,
   });
}

/**
 * Send a result to the card: directly if this user may edit the message, otherwise via the active GM.
 *
 * @param {ChatMessage} message
 *
 * @param {"initiator"|"defender"} sideKey
 *
 * @param {object} result
 */
async function submitContestUpdate(message, sideKey, result) {
   if (message.canUserModify(game.user, "update")) return applyContestUpdate(message, sideKey, result);
   if (!game.users.activeGM) {
      ui.notifications.warn("EDRPG.contest.needsGM", { localize: true });
      return;
   }
   game.socket.emit(SOCKET, { action: "contestUpdate", messageId: message.id, sideKey, result });
}

/** Register the socket listener (call once, at `ready`). */
export function registerContestSocket() {
   game.socket.on(SOCKET, async (data) => {
      if (data?.action !== "contestUpdate" || !game.user.isActiveGM) return;
      const message = game.messages.get(data.messageId);
      if (message) await applyContestUpdate(message, data.sideKey, data.result);
   });
}

/**
 * Can the current user roll (or reroll) a side?
 *
 * @param {object} side
 *
 * @returns {boolean}
 */
function canControl(side) {
   if (side.kind === "flat") return game.user.isGM;
   return !!fromUuidSync(side.actorUuid)?.isOwner;
}

/**
 * Roll the opponent's side from the card.
 *
 * @param {ChatMessage} message
 *
 * @param {boolean} prompt  Ask for a modifier.
 */
async function rollDefender(message, prompt) {
   const contest = message.getFlag("edrpg", "contest");
   const side = contest?.defender;
   if (!side || side.result || !canControl(side)) return;

   let modifier = 0;
   if (prompt) {
      const input = await foundry.applications.api.DialogV2.input({
         window: { title: side.name, icon: "fa-solid fa-dice-d10" },
         classes: ["edrpg", "edrpg-dialog"],
         content: `<div class="form-group"><label>${game.i18n.localize("EDRPG.test.BonusModifier")}</label>
            <div class="form-fields"><input type="number" name="modifier" value="0" step="1" autofocus></div></div>`,
         ok: { label: "EDRPG.test.Roll", icon: "fa-solid fa-dice-d10" },
         rejectClose: false,
      });
      if (!input) return;
      modifier = Number(input.modifier) || 0;
   }

   let result;
   if (side.kind === "flat") result = await rollFlatDice(side.bonus, modifier);
   else {
      const actor = await fromUuid(side.actorUuid);
      if (!actor) return ui.notifications.warn("EDRPG.chat.ActorNotFound", { localize: true });
      result = await rollSkillDice(actor, side.skill, { modifier });
   }
   playDice();
   return submitContestUpdate(message, "defender", storeResult(result));
}

/**
 * Spend a Karma point to reroll one side's natural 1 (Core Rules, "Re-rolling a 1").
 *
 * @param {ChatMessage} message
 *
 * @param {"initiator"|"defender"} sideKey
 */
async function karmaRerollSide(message, sideKey) {
   const contest = message.getFlag("edrpg", "contest");
   const side = contest?.[sideKey];
   if (!side?.result || side.kind !== "actor" || !canKarmaReroll(side)) return;
   const actor = await fromUuid(side.actorUuid);
   const karma = actor.system.karma.standard.value;
   if (karma < 1) return ui.notifications.warn("EDRPG.chat.NoKarmaPoints", { localize: true });

   await actor.update({ "system.karma.standard.value": karma - 1 });
   const result = await rollSkillDice(actor, side.skill, {
      modifier: side.result.modifier,
      socialFactor: side.socialFactor ?? true,
   });
   playDice();
   return submitContestUpdate(message, sideKey, { ...storeResult(result), karma: true });
}

/**
 * @param {object} side
 *
 * @returns {boolean}
 */
function canKarmaReroll(side) {
   const r = side.result;
   if (!r || r.karma || side.kind !== "actor" || !canControl(side)) return false;
   const allowAll = game.settings.get("edrpg", "allowToRerollAllTests");
   const actor = fromUuidSync(side.actorUuid);
   return (r.natural === 1 || allowAll) && (actor?.system.karma.standard.value ?? 0) > 0;
}

/** Play the dice sound locally. */
function playDice() {
   foundry.audio?.AudioHelper?.play({ src: CONFIG.sounds.dice, volume: 0.8 });
}

/**
 * Render hook: show hidden values to the GM and wire up the card's buttons for whoever may use them.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export async function onRenderContest(message, html) {
   const contest = message.getFlag("edrpg", "contest");
   if (!contest) return;

   if (game.user.isGM && contest.hidden) {
      const card = html.querySelector(".edrpg-contest");
      if (card) {
         const wrapper = document.createElement("div");
         wrapper.innerHTML = await renderContestCard(contest, { reveal: true });
         card.replaceWith(wrapper.firstElementChild);
      }
   }

   for (const button of html.querySelectorAll("[data-contest-action]")) {
      const { contestAction, side: sideKey } = button.dataset;
      const side = contest[sideKey];
      const allowed =
         contestAction === "roll" ? !side.result && canControl(side) : contestAction === "karma" && canKarmaReroll(side);
      if (!allowed) {
         button.remove();
         continue;
      }
      button.addEventListener("click", async (event) => {
         event.preventDefault();
         button.disabled = true;
         try {
            if (contestAction === "roll") await rollDefender(message, !event.shiftKey);
            else await karmaRerollSide(message, sideKey);
         } finally {
            button.disabled = false;
         }
      });
   }
}
