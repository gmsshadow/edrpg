import { skillCategory, socialFactorSkills, contestPairs, DEFAULT_CONTEST_TIES } from "../config.mjs";
import { startContest } from "./contest.mjs";
import { isD100, judge, karmaRerollable, rollD100, scoreFor, dnModifier, D100_BANDS, d100Label, tensAsD10 } from "./resolve.mjs";

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
export async function rollSkillDice(actor, skill, { modifier = 0, points = 0, socialFactor = true, bonus, score, equipment = 0, equipment100, dn = 11 } = {}) {
   const category = skillCategory[skill];
   // Characters have full skills; opponents give a bonus from their stat block. A weapon attack may override it.
   const override = bonus !== undefined && bonus !== null;
   bonus ??= actor.system.skillBonus?.(skill) ?? 0;
   const sfBonus = socialFactor && socialFactorSkills.includes(skill) ? (actor.system.socialFactor?.value ?? 0) : 0;
   let result;
   if (isD100()) {
      // d100: roll under Skill score + Social Factor × 10 + equipment + modifiers + the difficulty's modifier.
      score ??= override ? bonus * 10 : scoreFor(actor, skill, bonus);
      const { roll, natural } = await rollD100();
      const equip = equipment100 ?? equipment * 10;
      const target = score + sfBonus * 10 + equip + points * 10 + modifier + dnModifier(dn);
      result = { roll, natural, total: natural, target, score, bonus, socialFactor: sfBonus, modifier, points, equipment: equip, dn, d100: true };
   } else {
      let formula = sfBonus ? "1d10 + @bonus + @socialFactor + @modifier" : "1d10 + @bonus + @modifier";
      if (equipment) formula += " + @equipment";
      const roll = await new Roll(formula, { bonus, socialFactor: sfBonus, modifier: modifier + points, equipment }).evaluate();
      result = { roll, natural: roll.dice[0].total, total: roll.total, bonus, socialFactor: sfBonus, modifier: modifier + points, equipment };
   }

   const skillData = actor.system.skills?.[category]?.[skill];
   if (skillData && !skillData.used && actor.isOwner) {
      await actor.update({ [`system.skills.${category}.${skill}.used`]: true });
   }
   return result;
}

/**
 * An equipment bonus in the current mode: as listed (d10), or in d100 the Skill score bonus itself or the bonus × 10.
 *
 * @param {{kind: string, value: number, raw: number}} b
 *
 * @returns {number}
 */
export function equipmentValue(b) {
   if (!isD100()) return b.value;
   return b.kind === "score" ? b.raw : b.value * 10;
}

/**
 * Equipment bonuses that apply by default: "always" ones, and the best Medpack for stabilising or treating.
 *
 * @param {object[]} bonuses  From IndividualData#itemSkillBonuses.
 *
 * @param {object|null} followUp
 *
 * @returns {string[]}  Bonus keys.
 */
function defaultItemBonuses(bonuses, followUp) {
   const keys = bonuses.filter((b) => b.when === "always").map((b) => b.key);
   if (["stabilise", "treat"].includes(followUp?.kind)) {
      const best = bonuses.filter((b) => b.when === "medical").sort((a, b) => b.value - a.value)[0];
      if (best) keys.push(best.key);
   }
   return keys;
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
   if (isD100()) {
      // The "other" opponent of a contest gives a Skill score in d100.
      const { roll, natural } = await rollD100();
      return { roll, natural, total: natural, target: bonus + modifier, score: bonus, bonus, socialFactor: 0, modifier, d100: true };
   }
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
   // Weapon attacks pass their own bonus (rare weapon Skill score bonus / opponent To Hit) and title.
   const { bonus: bonusOverride, label, allowContest = true, followUp = null } = options;
   const itemBonuses = actor.system.itemSkillBonuses?.(skill) ?? [];
   let itemBonusKeys = options.itemBonusKeys ?? defaultItemBonuses(itemBonuses, followUp);
   const title = label ?? game.i18n.format("EDRPG.test.SkillCheck", { skill: skillName });
   if (difficulty === undefined || difficulty === null) {
      difficulty = game.settings.get("edrpg", "defaultDifficultyNumber");
      // d100 uses fixed bands: a world default that isn't one starts the dialog at Average.
      if (isD100() && !D100_BANDS.some((b) => b.dn === difficulty)) difficulty = 11;
   }
   socialFactor &&= sfEligible;

   if (prompt) {
      const result = await promptSkillCheck(actor, skill, {
         difficulty,
         modifier,
         mode,
         title,
         allowContest,
         socialFactor: sfEligible ? { apply: socialFactor, value: sfValue } : null,
         itemBonuses,
         itemBonusKeys,
      });
      if (!result) return null;
      if (result.against !== "dn") return startContest(actor, skill, result);
      ({ difficulty, modifier, mode } = result);
      itemBonusKeys = result.itemBonusKeys;
      socialFactor = sfEligible && result.socialFactor;
   }

   const chosen = itemBonuses.filter((b) => itemBonusKeys.includes(b.key));
   const equipment = chosen.reduce((n, b) => n + b.value, 0);
   const d100 = isD100();
   const result = await rollSkillDice(actor, skill, {
      modifier,
      socialFactor,
      bonus: bonusOverride,
      equipment,
      equipment100: d100 ? chosen.reduce((n, b) => n + equipmentValue(b), 0) : undefined,
      dn: difficulty,
   });
   const { roll, natural, bonus, socialFactor: sfBonus } = result;
   const judged = judge({ natural, total: roll.total, dn: difficulty, target: result.target, d100 });
   const outcome = judged.outcome;

   const canReroll =
      (karmaRerollable(natural, d100) || game.settings.get("edrpg", "allowToRerollAllTests")) &&
      (actor.system.karma?.standard.value ?? 0) > 0;

   const content = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATE, {
      skillName,
      natural: d100 ? d100Label(natural) : natural,
      skillBonus: bonus,
      socialFactor: d100 ? sfBonus * 10 : sfBonus,
      modifier,
      equipment: chosen.map((b) => ({ label: b.label, value: signed(equipmentValue(b)) })),
      difficulty,
      d100: d100
         ? {
              score: result.score,
              difficulty: signed(dnModifier(difficulty)),
              band: D100_BANDS.find((b) => b.dn === difficulty)?.key ?? null,
              target: result.target,
              sl: judged.margin,
              critical: judged.critical,
              auto: judged.reason,
           }
         : null,
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
      flavor: title,
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags: {
         edrpg: {
            skillCheck: {
               actorUuid: actor.uuid,
               skill,
               difficulty,
               modifier,
               socialFactor,
               mode: mode ?? null,
               bonus: bonusOverride ?? null,
               label: label ?? null,
               followUp,
               itemBonusKeys,
               outcome,
               total: roll.total,
            },
         },
      },
   };
   ChatMessage.applyMode(messageData, mode || undefined);
   const message = await ChatMessage.create(messageData);
   // Lets other parts of the system act on the result, e.g. a Medicine check to stabilise someone.
   // In d100, rules that need a d10 total (Treat wounds) read the tens die as the d10 and add the d10 bonuses.
   const total = d100 ? tensAsD10(natural) + bonus + sfBonus + equipment + Math.trunc(modifier / 10) : roll.total;
   if (message) Hooks.callAll("edrpg.skillCheck", message, { actor, skill, outcome, natural, total, sl: judged.margin, critical: judged.critical, followUp });
   return message;
}

/**
 * The d100 variant's difficulty bands as a select (a published d10 difficulty that isn't a band is kept as its own
 * option, at (11 − number) × 10).
 *
 * @param {number} dn  The d10 difficulty to select.
 *
 * @param {string} [name="difficulty"]
 *
 * @returns {string}
 */
export function difficultySelect(dn, name = "difficulty") {
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
   const bands = D100_BANDS.map((b) => ({ dn: b.dn, label: `${i18n(`EDRPG.d100.band.${b.key}`)} (${signed(dnModifier(b.dn))})` }));
   if (!D100_BANDS.some((b) => b.dn === dn)) bands.push({ dn, label: i18n("EDRPG.d100.customBand", { dn, modifier: signed(dnModifier(dn)) }) });
   bands.sort((a, b) => a.dn - b.dn);
   return `<select name="${name}" data-dtype="Number" data-edrpg-dn>${bands.map((b) => `<option value="${b.dn}"${b.dn === dn ? " selected" : ""}>${b.label}</option>`).join("")}</select>`;
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
async function promptSkillCheck(actor, skill, { difficulty, modifier, mode, socialFactor, title, allowContest = true, itemBonuses = [], itemBonusKeys = [] }) {
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
   const d100 = isD100();
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
      <div class="form-group" ${allowContest ? "" : "hidden"}>
         <label>${i18n("EDRPG.contest.against")}</label>
         <div class="form-fields">
            <select name="against">
               <option value="dn" selected>${i18n("EDRPG.test.DifficultyNumber")}</option>
               ${allowContest && target ? `<option value="target">${i18n("EDRPG.contest.target", { name: esc(target.name) })}</option>` : ""}
               ${allowContest ? `<option value="other">${i18n("EDRPG.contest.other")}</option>` : ""}
            </select>
         </div>
      </div>
      <div class="form-group" data-against="dn">
         <label>${i18n(d100 ? "EDRPG.d100.difficulty" : "EDRPG.test.DifficultyNumber")}</label>
         <div class="form-fields">${d100 ? difficultySelect(difficulty) : `<input type="number" name="difficulty" value="${difficulty}" step="1" data-edrpg-dn>`}</div>
      </div>
      <div class="form-group" data-against="other" hidden>
         <label>${i18n("EDRPG.contest.opponentName")}</label>
         <div class="form-fields"><input type="text" name="opponentName" placeholder="${i18n("EDRPG.contest.opponent")}"></div>
      </div>
      <div class="form-group" data-against="other" hidden>
         <label>${i18n(d100 ? "EDRPG.d100.opponentScore" : "EDRPG.contest.opponentBonus")}</label>
         <div class="form-fields"><input type="number" name="opponentBonus" value="${d100 ? 10 : 1}" step="1"></div>
         <p class="hint">${i18n(d100 ? "EDRPG.d100.opponentScoreHint" : "EDRPG.contest.opponentBonusHint")}</p>
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
         <label>${i18n(d100 ? "EDRPG.d100.modifier" : "EDRPG.test.BonusModifier")}</label>
         <div class="form-fields"><input type="number" name="modifier" value="${modifier}" step="${d100 ? 5 : 1}"></div>
      </div>
      ${
         socialFactor
            ? `<div class="form-group">
         <label>${i18n("EDRPG.test.ApplySocialFactor", { value: signed(d100 ? socialFactor.value * 10 : socialFactor.value) })}</label>
         <div class="form-fields"><input type="checkbox" name="socialFactor" ${socialFactor.apply ? "checked" : ""}></div>
      </div>`
            : ""
      }
      ${itemBonuses
         .map(
            (b) => `<div class="form-group">
         <label>${esc(b.label)}: ${signed(equipmentValue(b))}${b.kind === "score" && !d100 ? ` <span class="hint">(${i18n("EDRPG.bonusKind.scoreShort", { value: signed(b.raw) })})</span>` : ""}${
            b.when !== "always" ? ` <span class="hint">— ${i18n(`EDRPG.bonusWhen.${b.when}`)}</span>` : ""
         }</label>
         <div class="form-fields"><input type="checkbox" name="item.${b.key}" ${itemBonusKeys.includes(b.key) ? "checked" : ""}></div>
      </div>`,
         )
         .join("")}
      <div class="form-group" data-against="dn">
         <label>${i18n("EDRPG.test.RollType")}</label>
         <div class="form-fields">
            <select name="mode"><option value="">${i18n("EDRPG.test.DefaultMode")}</option>${modeOptions}</select>
         </div>
      </div>`;

   const result = await foundry.applications.api.DialogV2.input({
      window: { title: title ?? i18n("EDRPG.test.SkillCheck", { skill: skillLabel(skill) }), icon: "fa-solid fa-dice-d10" },
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
            dn?.focus();
            dn?.select?.();
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
      itemBonusKeys: itemBonuses.filter((b) => result[`item.${b.key}`] || result.item?.[b.key.split(".")[0]]?.[b.key.split(".")[1]]).map((b) => b.key),
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
      bonus: data.bonus ?? undefined,
      label: data.label ?? undefined,
      followUp: data.followUp ?? undefined,
      itemBonusKeys: data.itemBonusKeys ?? undefined,
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
