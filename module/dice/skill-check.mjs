import { skillCategory, difficulties } from "../config.mjs";

const CHAT_TEMPLATE = "systems/edrpg/templates/chat/skill-check.hbs";

/**
 * Prompt for and roll a skill check: D10 + skill bonus + modifier vs. a difficulty number.
 * A natural 1 always fails and a natural 10 always succeeds (Core Rules p.44).
 *
 * @param {Actor} actor
 *
 * @param {string} skill
 *
 * @param {object} [options]
 *
 * @param {number} [options.difficulty]   Skip the prompt's default difficulty.
 *
 * @param {number} [options.modifier=0]
 *
 * @param {string} [options.mode]         A key of CONFIG.ChatMessage.modes. Defaults to the chat setting.
 *
 * @param {boolean} [options.prompt=true] Show the dialog.
 *
 * @param {boolean} [options.karmaReroll=false]
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollSkillCheck(actor, skill, options = {}) {
   const category = skillCategory[skill];
   if (!category) throw new Error(`EDRPG | Unknown skill "${skill}"`);
   const skillData = actor.system.skills[category][skill];
   const skillName = game.i18n.localize(`EDRPG.sheet.skills.${category}.${skill}.name`);

   let { difficulty, modifier = 0, mode, prompt = true, karmaReroll = false } = options;
   difficulty ??= game.settings.get("edrpg", "defaultDifficultyNumber");

   if (prompt) {
      const result = await promptSkillCheck(skillName, { difficulty, modifier, mode });
      if (!result) return null;
      ({ difficulty, modifier, mode } = result);
   }

   const roll = new Roll("1d10 + @bonus + @modifier", { bonus: skillData.bonus, modifier });
   await roll.evaluate();

   const natural = roll.dice[0].total;
   let outcome;
   if (natural === 1) outcome = "critFailure";
   else if (natural === 10) outcome = "critSuccess";
   else outcome = roll.total >= difficulty ? "success" : "failure";

   const canReroll =
      (natural === 1 || game.settings.get("edrpg", "allowToRerollAllTests")) && actor.system.karma.standard.value > 0;

   const content = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATE, {
      skillName,
      natural,
      skillBonus: skillData.bonus,
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
      flags: { edrpg: { skillCheck: { actorUuid: actor.uuid, skill, difficulty, modifier, mode: mode ?? null } } },
   };
   ChatMessage.applyMode(messageData, mode || undefined);
   return ChatMessage.create(messageData);
}

/**
 * @param {string} skillName
 *
 * @param {object} defaults
 *
 * @returns {Promise<{difficulty: number, modifier: number, mode: string}|null>}
 */
async function promptSkillCheck(skillName, { difficulty, modifier, mode }) {
   const difficultyOptions = Object.entries(difficulties)
      .map(([dn, label]) => {
         const selected = Number(dn) === difficulty ? " selected" : "";
         return `<option value="${dn}"${selected}>${dn} — ${game.i18n.localize(label)}</option>`;
      })
      .join("");
   const modeOptions = Object.entries(CONFIG.ChatMessage.modes ?? {})
      .map(([key, cfg]) => {
         const selected = key === mode ? " selected" : "";
         return `<option value="${key}"${selected}>${game.i18n.localize(cfg.label)}</option>`;
      })
      .join("");
   const dnLabel = game.i18n.localize("EDRPG.test.DifficultyNumber");

   const content = `
      <div class="form-group">
         <label>${dnLabel}</label>
         <div class="form-fields">
            <input type="number" name="difficulty" value="${difficulty}" step="1">
            <select name="difficultyPreset" data-edrpg-dn-preset>
               <option value=""></option>${difficultyOptions}
            </select>
         </div>
      </div>
      <div class="form-group">
         <label>${game.i18n.localize("EDRPG.test.BonusModifier")}</label>
         <div class="form-fields"><input type="number" name="modifier" value="${modifier}" step="1"></div>
      </div>
      <div class="form-group">
         <label>${game.i18n.localize("EDRPG.test.RollType")}</label>
         <div class="form-fields">
            <select name="mode"><option value="">${game.i18n.localize("EDRPG.test.DefaultMode")}</option>${modeOptions}</select>
         </div>
      </div>`;

   const result = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.format("EDRPG.test.SkillCheck", { skill: skillName }), icon: "fa-solid fa-dice-d10" },
      classes: ["edrpg", "edrpg-dialog"],
      content,
      ok: { label: "EDRPG.test.Roll", icon: "fa-solid fa-dice-d10" },
      render: (_event, dialog) => {
         const root = dialog.element ?? dialog;
         const preset = root.querySelector("[data-edrpg-dn-preset]");
         preset?.addEventListener("change", () => {
            if (preset.value) root.querySelector("input[name=difficulty]").value = preset.value;
         });
      },
      rejectClose: false,
   });
   if (!result) return null;
   return {
      difficulty: Number(result.difficulty) || 0,
      modifier: Number(result.modifier) || 0,
      mode: result.mode || undefined,
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
   const category = skillCategory[data.skill];
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p>${game.i18n.format("EDRPG.chat.ReRollUsingKarmaMessage", {
         actorName: foundry.utils.escapeHTML(actor.name),
         testName: game.i18n.localize(`EDRPG.sheet.skills.${category}.${data.skill}.name`),
      })}</p>`,
   });
   return rollSkillCheck(actor, data.skill, {
      difficulty: data.difficulty,
      modifier: data.modifier,
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
export function onRenderChatMessage(message, html) {
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
