import { skills } from "./config.mjs";

/**
 * Work out what the end of an adventure does to an actor's ticked skills (Core Rules p.49,
 * "Improving your Character"): each ticked skill gains +1 to its score, unless that would take it
 * over the Skill Cap; every tick is then rubbed out.
 *
 * The Skill Cap limits Base + Learn; equipment and temporary modifiers don't count towards it.
 *
 * @param {Actor} actor
 *
 * @returns {{improved: object[], atCap: object[], update: object}}
 */
export function planEndOfAdventure(actor) {
   const improved = [];
   const atCap = [];
   const update = {};
   for (const [category, list] of Object.entries(skills)) {
      for (const key of list) {
         const skill = actor.system.skills[category][key];
         if (!skill.used) continue;
         const path = `system.skills.${category}.${key}`;
         const entry = { key, category, label: `EDRPG.sheet.skills.${category}.${key}.name` };
         update[`${path}.used`] = false;
         if (skill.natural + 1 <= skill.cap) {
            update[`${path}.learning`] = skill.learning + 1;
            improved.push({ ...entry, from: skill.natural, to: skill.natural + 1 });
         } else {
            atCap.push({ ...entry, natural: skill.natural, cap: skill.cap });
         }
      }
   }
   return { improved, atCap, update };
}

/**
 * Confirm, apply and announce the end of an adventure for one actor: ticked skills improve, ticks are cleared,
 * and (optionally) Karma is restored in full for the next adventure (Core Rules p.31, "Recovering Karma Points").
 *
 * @param {Actor} actor
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.confirm=true]       Ask before applying.
 *
 * @param {boolean} [options.restoreKarma=true]  Refill Karma (default when not asking).
 *
 * @returns {Promise<boolean>}  Whether anything was applied.
 */
export async function endAdventure(actor, { confirm = true, restoreKarma = true } = {}) {
   const plan = planEndOfAdventure(actor);
   const karma = actor.system.karma.standard;
   const karmaMissing = karma.value < karma.max;
   if (!plan.improved.length && !plan.atCap.length && !karmaMissing) {
      ui.notifications.info(game.i18n.format("EDRPG.endAdventure.nothing", { name: actor.name }));
      return false;
   }

   if (confirm) {
      const summary = await foundry.applications.handlebars.renderTemplate(
         "systems/edrpg/templates/chat/end-adventure.hbs",
         { ...plan, actorName: actor.name, confirming: true },
      );
      const karmaField = karmaMissing
         ? `<div class="form-group">
               <label>${game.i18n.format("EDRPG.endAdventure.restoreKarma", { value: karma.value, max: karma.max })}</label>
               <div class="form-fields"><input type="checkbox" name="restoreKarma" checked></div>
            </div>`
         : "";
      const result = await foundry.applications.api.DialogV2.input({
         window: { title: "EDRPG.endAdventure.title", icon: "fa-solid fa-flag-checkered" },
         classes: ["edrpg", "edrpg-dialog"],
         content: summary + karmaField,
         ok: { label: "EDRPG.endAdventure.apply", icon: "fa-solid fa-check" },
         rejectClose: false,
      });
      if (!result) return false;
      restoreKarma = !!result.restoreKarma;
   }

   const update = { ...plan.update };
   const karmaRestored = restoreKarma && karmaMissing;
   if (karmaRestored) update["system.karma.standard.value"] = karma.max;
   if (!Object.keys(update).length) return false;

   await actor.update(update);
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await foundry.applications.handlebars.renderTemplate("systems/edrpg/templates/chat/end-adventure.hbs", {
         ...plan,
         actorName: actor.name,
         confirming: false,
         karmaRestored,
         karmaMax: karma.max,
      }),
   });
   return true;
}
