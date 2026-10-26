import { skillCategory, socialFactorSkills, contestPairs, DEFAULT_CONTEST_TIES } from "../config.mjs";
import { startContest } from "./contest.mjs";

const CHAT_TEMPLATE = "systems/edrpg/templates/chat/skill-check.hbs";

/**
 * Localised skill name.
 *
 * @param {string} skill
 *
 * @returns {string}
 */
export function skillLabel(skill) {
   return game.i18n.localize(`EDRPG.sheet.skills.${skillCategory[skill]}.${skill}.name`);
}

/**
 * @param {number} n
 *
 * @returns {string}  The number with an explicit sign.
 */
export function signed(n) {
   return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Roll D10 + skill bonus (+ Social Factor) + modifier for an actor, and tick the skill as used
 * ("Whenever you use a Skill put a tick in the tick-box", Core Rules p.43).
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {object} [options]
 *
 * @param {number} [options.modifier=0]
 *
 * @param {boolean} [options.socialFactor]  Apply Social Factor (only for the four social skills).
 *
 * @returns {Promise<object>}  { roll, natural, total, bonus, socialFactor, modifier }
 */
export async function rollSkillDice(actor, skill, { modifier = 0, socialFactor = true } = {}) {
   const category = skillCategory[skill];
   const skillData = actor.system.skills[category][skill];
   const sfBonus = socialFactor && socialFactorSkills.includes(skill) ? (actor.system.socialFactor?.value ?? 0) : 0;
   const formula = sfBonus ? "1d10 + @bonus + @socialFactor + @modifier" : "1d10 + @bonus + @modifier";
   const roll = await new Roll(formula, { bonus: skillData.bonus, socialFactor: sfBonus, modifier }).evaluate();

   if (!skillData.used && actor.isOwner) {
      await actor.update({ [`system.skills.${category}.${skill}.used`]: true });
   }
   return { roll, natural: roll.dice[0].total, total: roll.total, bonus: skillData.bonus, socialFactor: sfBonus, modifier };
}

/**
 * Roll D10 + a flat bonus, for opponents without a full skill list (Core Rules, Opponents).
 *
 * @param {number} bonus
 *
 * @param {number} [modifier=0]
 *
 * @returns {Promise<object>}  Same shape as {@link rollSkillDice}.
 */
export async function rollFlatDice(bonus, modifier = 0) {
   const roll = await new Roll("1d10 + @bonus + @modifier", { bonus, modifier }).evaluate();
   return { roll, natural: roll.dice[0].total, total: roll.total, bonus, socialFactor: 0, modifier };
}

/**
 * Prompt for and roll a skill check: D10 + skill bonus + modifier vs. a difficulty number, or start a
 * contested check against a target. A natural 1 always fails and a natural 10 always succeeds (Core Rules p.44).
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {object} [options]
 *
 * @param {number} [options.difficulty]   Default difficulty (world setting otherwise).
 *
 * @param {number} [options.modifier=0]
 *
 * @param {string} [options.mode]         A key of CONFIG.ChatMessage.modes. Defaults to the chat setting.
 *
 * @param {boolean} [options.prompt=true] Show the dialog.
 *
 * @param {boolean} [options.karmaReroll=false]
 *
 * @param {boolean} [options.socialFactor]  Add the actor's Social Factor. Defaults to true for Bargain, Bluff,
 *                                          Charm and Diplomacy; the GM may rule it doesn't apply (Core Rules p.128).
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollSkillCheck(actor, skill, options = {}) {
   const category = skillCategory[skill];
   if (!category) throw new Error(`EDRPG | Unknown skill "${skill}"`);
   const skillName = skillLabel(skill);

   const sfEligible = socialFactorSkills.includes(skill);
   const sfValue = actor.system.socialFactor?.value ?? 0;
   let { difficulty, modifier = 0, mode, prompt = true, karmaReroll = false, socialFactor = sfEligible } = options;
   difficulty ??= game.settings.get("edrpg", "defaultDifficultyNumber");
   socialFactor &&= sfEligible;

   if (prompt) {
      const result = await promptSkillCheck(actor, skill, {
         difficulty,
         modifier,
         mode,
         socialFactor: sfEligible ? { apply: socialFactor, value: sfValue } : null,
      });
      if (!result) return null;
      if (result.against !== "dn") return startContest(actor, skill, result);
      ({ difficulty, modifier, mode } = result);
      socialFactor = sfEligible && result.socialFactor;
   }

   const { roll, natural, bonus, socialFactor: sfBonus } = await rollSkillDice(actor, skill, { modifier, socialFactor });

   let outcome;
   if (natural === 1) outcome = "critFailure";
   else if (natural === 10) outcome = "critSuccess";
   else outcome = roll.total >= difficulty ? "success" : "failure";

   const canReroll =
      (natural === 1 || game.settings.get("edrpg", "allowToRerollAllTests")) && actor.system.karma.standard.value > 0;

   const content = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATE, {
      skillName,
      natural,
      skillBonus: bonus,
      socialFactor: sfBonus,
      modifier,
      difficulty,
      total: roll.total,
      outcome,
      outcomeLabel: {
         critFailure: "EDRPG.chat.TestCritFailure",
         critSuccess: "EDRPG.chat.TestCritSuccess",
         success: "EDRPG.chat.TestSuccess",
         failure: "EDRPG.chat.TestFailure",
      }[outcome],
      success: outcome === "success" || outcome === "critSuccess",
      karmaReroll,
      canReroll,
      rollHTML: await roll.render(),
   });

   const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.format("EDRPG.test.SkillCheck", { skill: skillName }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags: {
         edrpg: { skillCheck: { actorUuid: actor.uuid, skill, difficulty, modifier, socialFactor, mode: mode ?? null } },
      },
   };
   ChatMessage.applyMode(messageData, mode || undefined);
   return ChatMessage.create(messageData);
}

/**
 * The skill check dialog. The difficulty is free-typed by the GM (pre-filled with the world default and
 * selected, so typing replaces it). "Against" switches to a contested check.
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {object} defaults
 *
 * @returns {Promise<object|null>}
 */
async function promptSkillCheck(actor, skill, { difficulty, modifier, mode, socialFactor }) {
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
   const esc = foundry.utils.escapeHTML;
   const modeOptions = Object.entries(CONFIG.ChatMessage.modes ?? {})
      .map(([key, cfg]) => `<option value="${key}"${key === mode ? " selected" : ""}>${i18n(cfg.label)}</option>`)
      .join("");

   const target = [...game.user.targets].find((t) => t.actor && t.actor !== actor)?.actor;
   const pair = contestPairs[skill];
   const opposing = pair?.opposing ?? skill;
   const ties = pair?.ties ?? DEFAULT_CONTEST_TIES;
   const skillOptions = Object.entries(skillCategory)
      .map(([key]) => ({ key, label: skillLabel(key) }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ key, label }) => `<option value="${key}"${key === opposing ? " selected" : ""}>${esc(label)}</option>`)
      .join("");
   const tieOptions = ["initiator", "defender"]
      .map((t) => `<option value="${t}"${t === ties ? " selected" : ""}>${i18n(`EDRPG.contest.ties.${t}`)}</option>`)
      .join("");

   const content = `
      <div class="form-group">
         <label>${i18n("EDRPG.contest.against")}</label>
         <div class="form-fields">
            <select name="against">
               <option value="dn" selected>${i18n("EDRPG.test.DifficultyNumber")}</option>
               ${target ? `<option value="target">${i18n("EDRPG.contest.target", { name: esc(target.name) })}</option>` : ""}
               <option value="other">${i18n("EDRPG.contest.other")}</option>
            </select>
         </div>
      </div>
      <div class="form-group" data-against="dn">
         <label>${i18n("EDRPG.test.DifficultyNumber")}</label>
         <div class="form-fields"><input type="number" name="difficulty" value="${difficulty}" step="1" data-edrpg-dn></div>
      </div>
      <div class="form-group" data-against="other" hidden>
         <label>${i18n("EDRPG.contest.opponentName")}</label>
         <div class="form-fields"><input type="text" name="opponentName" placeholder="${i18n("EDRPG.contest.opponent")}"></div>
      </div>
      <div class="form-group" data-against="other" hidden>
         <label>${i18n("EDRPG.contest.opponentBonus")}</label>
         <div class="form-fields"><input type="number" name="opponentBonus" value="1" step="1"></div>
         <p class="hint">${i18n("EDRPG.contest.opponentBonusHint")}</p>
      </div>
      <div class="form-group" data-against="target other" hidden>
         <label>${i18n("EDRPG.contest.opposingSkill")}</label>
         <div class="form-fields"><select name="opposingSkill">${skillOptions}</select></div>
      </div>
      <div class="form-group" data-against="target other" hidden>
         <label>${i18n("EDRPG.contest.tiesLabel")}</label>
         <div class="form-fields"><select name="ties">${tieOptions}</select></div>
         ${pair ? `<p class="hint">${i18n(pair.hint)}</p>` : ""}
      </div>
      <div class="form-group" data-against="target other" hidden>
         <label>${i18n("EDRPG.contest.hidden")}</label>
         <div class="form-fields"><input type="checkbox" name="hidden" ${pair?.hidden ? "checked" : ""}></div>
      </div>
      <div class="form-group">
         <label>${i18n("EDRPG.test.BonusModifier")}</label>
         <div class="form-fields"><input type="number" name="modifier" value="${modifier}" step="1"></div>
      </div>
      ${
         socialFactor
            ? `<div class="form-group">
         <label>${i18n("EDRPG.test.ApplySocialFactor", { value: signed(socialFactor.value) })}</label>
         <div class="form-fields"><input type="checkbox" name="socialFactor" ${socialFactor.apply ? "checked" : ""}></div>
      </div>`
            : ""
      }
      <div class="form-group" data-against="dn">
         <label>${i18n("EDRPG.test.RollType")}</label>
         <div class="form-fields">
            <select name="mode"><option value="">${i18n("EDRPG.test.DefaultMode")}</option>${modeOptions}</select>
         </div>
      </div>`;

   const result = await foundry.applications.api.DialogV2.input({
      window: { title: i18n("EDRPG.test.SkillCheck", { skill: skillLabel(skill) }), icon: "fa-solid fa-dice-d10" },
      classes: ["edrpg", "edrpg-dialog"],
      content,
      ok: { label: "EDRPG.test.Roll", icon: "fa-solid fa-dice-d10" },
      render: (_event, dialog) => {
         const root = dialog.element ?? dialog;
         const against = root.querySelector("select[name=against]");
         const sync = () => {
            for (const el of root.querySelectorAll("[data-against]")) {
               el.hidden = !el.dataset.against.split(" ").includes(against.value);
            }
            dialog.setPosition?.({ height: "auto" });
         };
         against.addEventListener("change", sync);
         // Focus and select the difficulty so the GM can just type over the default.
         const dn = root.querySelector("[data-edrpg-dn]");
         setTimeout(() => {
            dn.focus();
            dn.select();
         }, 0);
      },
      rejectClose: false,
   });
   if (!result) return null;
   return {
      against: result.against ?? "dn",
      difficulty: Number(result.difficulty) || 0,
      modifier: Number(result.modifier) || 0,
      mode: result.mode || undefined,
      socialFactor: !!result.socialFactor,
      targetUuid: result.against === "target" ? target?.uuid : null,
      opposingSkill: result.opposingSkill,
      opponentName: result.opponentName?.trim() || game.i18n.localize("EDRPG.contest.opponent"),
      opponentBonus: Number(result.opponentBonus) || 0,
      ties: result.ties ?? DEFAULT_CONTEST_TIES,
      hidden: !!result.hidden,
   };
}

/**
 * Spend a Karma point to reroll a skill check from a chat card (Core Rules, "Re-rolling a 1").
 *
 * @param {ChatMessage} message
 */
export async function karmaReroll(message) {
   const data = message.getFlag("edrpg", "skillCheck");
   if (!data || data.rerolled) return;
   const actor = await fromUuid(data.actorUuid);
   if (!actor) return ui.notifications.warn("EDRPG.chat.ActorNotFound", { localize: true });
   if (!actor.isOwner) return;

   const karma = actor.system.karma.standard.value;
   if (karma < 1) return ui.notifications.warn("EDRPG.chat.NoKarmaPoints", { localize: true });

   await actor.update({ "system.karma.standard.value": karma - 1 });
   if (message.isOwner) await message.setFlag("edrpg", "skillCheck.rerolled", true);
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p>${game.i18n.format("EDRPG.chat.ReRollUsingKarmaMessage", {
         actorName: foundry.utils.escapeHTML(actor.name),
         testName: skillLabel(data.skill),
      })}</p>`,
   });
   return rollSkillCheck(actor, data.skill, {
      difficulty: data.difficulty,
      modifier: data.modifier,
      socialFactor: data.socialFactor ?? undefined,
      mode: data.mode ?? undefined,
      prompt: false,
      karmaReroll: true,
   });
}

/**
 * Wire up the Karma reroll button on skill-check chat cards.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderSkillCheck(message, html) {
   const button = html.querySelector("[data-edrpg-action=karmaReroll]");
   if (!button) return;
   const data = message.getFlag("edrpg", "skillCheck");
   const actor = data ? fromUuidSync(data.actorUuid) : null;
   if (!actor?.isOwner || data.rerolled) {
      button.remove();
      return;
   }
   button.addEventListener("click", async (event) => {
      event.preventDefault();
      button.disabled = true;
      try {
         await karmaReroll(message);
      } finally {
         button.disabled = false;
      }
   });
}
