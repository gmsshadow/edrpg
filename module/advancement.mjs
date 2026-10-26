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
 * Confirm, apply and announce the end-of-adventure skill improvements for one actor.
 *
 * @param {Actor} actor
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.confirm=true]  Ask before applying.
 *
 * @returns {Promise<boolean>}  Whether anything was applied.
 */
export async function endAdventure(actor, { confirm = true } = {}) {
   const plan = planEndOfAdventure(actor);
   if (!plan.improved.length && !plan.atCap.length) {
      ui.notifications.info(game.i18n.format("EDRPG.endAdventure.nothing", { name: actor.name }));
      return false;
   }

   const content = await foundry.applications.handlebars.renderTemplate(
      "systems/edrpg/templates/chat/end-adventure.hbs",
      { ...plan, actorName: actor.name, confirming: true },
   );

   if (confirm) {
      const ok = await foundry.applications.api.DialogV2.confirm({
         window: { title: "EDRPG.endAdventure.title", icon: "fa-solid fa-flag-checkered" },
         classes: ["edrpg", "edrpg-dialog"],
         content,
         yes: { label: "EDRPG.endAdventure.apply", icon: "fa-solid fa-check" },
         rejectClose: false,
      });
      if (!ok) return false;
   }

   await actor.update(plan.update);
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await foundry.applications.handlebars.renderTemplate("systems/edrpg/templates/chat/end-adventure.hbs", {
         ...plan,
         actorName: actor.name,
         confirming: false,
      }),
   });
   return true;
}
