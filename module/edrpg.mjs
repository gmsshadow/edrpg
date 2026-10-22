import * as EDRPG from "./config.mjs";
import { CharacterData, NPCIndividualData } from "./data/actor.mjs";
import { BackgroundData, EnhancementData, KarmaCapabilityData } from "./data/item.mjs";
import { EDActor, EDItem } from "./documents.mjs";
import EDActorSheet from "./sheets/actor-sheet.mjs";
import EDItemSheet from "./sheets/item-sheet.mjs";
import { rollSkillCheck, onRenderChatMessage } from "./dice/skill-check.mjs";
import registerSettings from "./settings.mjs";

Hooks.once("init", () => {
   console.log("EDRPG | Initialising Elite: Dangerous RPG system");

   CONFIG.EDRPG = EDRPG;
   game.edrpg = { config: EDRPG, rollSkillCheck };

   registerSettings();

   CONFIG.Actor.documentClass = EDActor;
   CONFIG.Item.documentClass = EDItem;
   Object.assign(CONFIG.Actor.dataModels, {
      character: CharacterData,
      npcIndividual: NPCIndividualData,
   });
   Object.assign(CONFIG.Item.dataModels, {
      background: BackgroundData,
      enhancement: EnhancementData,
      karma: KarmaCapabilityData,
   });

   // Token bars: max values are derived, so declare them explicitly.
   const trackable = { bar: ["endurance", "karma.standard", "karma.cyber"], value: ["rankPoints"] };
   CONFIG.Actor.trackableAttributes = { character: trackable, npcIndividual: trackable };

   // Initiative: D10 + Tactics bonus (Core Rules, Personal Combat).
   CONFIG.Combat.initiative = { formula: "1d10 + @initiative", decimals: 0 };

   const { DocumentSheetConfig } = foundry.applications.apps;
   DocumentSheetConfig.registerSheet(foundry.documents.Actor, "edrpg", EDActorSheet, {
      types: ["character", "npcIndividual"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.actor",
   });
   DocumentSheetConfig.registerSheet(foundry.documents.Item, "edrpg", EDItemSheet, {
      types: ["background", "enhancement", "karma"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.item",
   });

   foundry.applications.handlebars.loadTemplates({
      "edrpg.itemList": "systems/edrpg/templates/actor/item-list.hbs",
   });
});

Hooks.on("renderChatMessageHTML", onRenderChatMessage);
