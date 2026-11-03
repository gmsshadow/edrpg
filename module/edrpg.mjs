import { openMarket } from "./trading.mjs";
import * as EDRPG from "./config.mjs";
import { CharacterData, NPCIndividualData, OpponentData, PartnerData } from "./data/actor.mjs";
import {
   BackgroundData,
   EnhancementData,
   KarmaCapabilityData,
   WeaponData,
   ArmourData,
   CyberneticData,
   ClothingData,
   GearData,
} from "./data/item.mjs";
import { EDActor, EDItem } from "./documents.mjs";
import EDActorSheet from "./sheets/actor-sheet.mjs";
import EDOpponentSheet from "./sheets/opponent-sheet.mjs";
import EDVehicleSheet from "./sheets/vehicle-sheet.mjs";
import { VehicleData, ShipData, CraftWeaponData } from "./data/vehicle.mjs";
import EDItemSheet from "./sheets/item-sheet.mjs";
import { rollSkillCheck, onRenderSkillCheck } from "./dice/skill-check.mjs";
import { onRenderContest, registerContestSocket } from "./dice/contest.mjs";
import { onRenderAttack, registerAttackSocket } from "./dice/attack.mjs";
import { registerGrabSocket } from "./dice/grab.mjs";
import { rollCraftAttack, registerCraftSocket, onRenderCraftAttack } from "./dice/craft-attack.mjs";
import { onRenderDamage, registerDamageHooks, registerStatusEffects, bleedOut, heal } from "./dice/damage.mjs";
import registerSettings from "./settings.mjs";
import { registerLandingSetting, ensureLandingScene } from "./landing.mjs";
import { registerVehicleCombat, onRenderVehicleEvent, vehicleAction, checkObstacles, startVehicleTurn } from "./vehicle-combat.mjs";
import { endAdventure } from "./advancement.mjs";
import { useKarmaCapability, restKarma, registerKarmaHooks } from "./karma.mjs";

Hooks.once("init", () => {
   console.log("EDRPG | Initialising Elite: Dangerous RPG system");

   CONFIG.EDRPG = EDRPG;
   game.edrpg = { config: EDRPG, openMarket, rollSkillCheck, endAdventure, useKarmaCapability, restKarma, bleedOut, heal, rollCraftAttack, vehicleAction, checkObstacles, startVehicleTurn };
   registerKarmaHooks();

   registerSettings();
   registerLandingSetting();
   registerStatusEffects();

   CONFIG.Actor.documentClass = EDActor;
   CONFIG.Item.documentClass = EDItem;
   Object.assign(CONFIG.Actor.dataModels, {
      character: CharacterData,
      npcIndividual: NPCIndividualData,
      partner: PartnerData,
      opponent: OpponentData,
      vehicle: VehicleData,
      ship: ShipData,
   });
   Object.assign(CONFIG.Item.dataModels, {
      background: BackgroundData,
      enhancement: EnhancementData,
      karma: KarmaCapabilityData,
      weapon: WeaponData,
      armour: ArmourData,
      cybernetic: CyberneticData,
      clothing: ClothingData,
      gear: GearData,
      craftWeapon: CraftWeaponData,
   });

   // Token bars: max values are derived, so declare them explicitly.
   const trackable = { bar: ["endurance", "karma.standard", "karma.cyber"], value: ["rankPoints"] };
   CONFIG.Actor.trackableAttributes = {
      character: trackable,
      npcIndividual: trackable,
      partner: { bar: ["endurance"], value: ["rankPoints"] },
      opponent: { bar: ["endurance"], value: ["toHit", "perception"] },
      vehicle: { bar: ["hull", "shields"], value: ["speed"] },
      ship: { bar: ["hull", "shields"], value: ["speed"] },
   };

   // Initiative: D10 + Tactics bonus (Core Rules, Personal Combat).
   CONFIG.Combat.initiative = { formula: "1d10 + @initiative", decimals: 0 };

   const { DocumentSheetConfig } = foundry.applications.apps;
   DocumentSheetConfig.registerSheet(foundry.documents.Actor, "edrpg", EDActorSheet, {
      types: ["character", "npcIndividual", "partner"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.actor",
   });
   DocumentSheetConfig.registerSheet(foundry.documents.Actor, "edrpg", EDOpponentSheet, {
      types: ["opponent"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.opponent",
   });
   DocumentSheetConfig.registerSheet(foundry.documents.Actor, "edrpg", EDVehicleSheet, {
      types: ["vehicle", "ship"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.vehicle",
   });
   DocumentSheetConfig.registerSheet(foundry.documents.Item, "edrpg", EDItemSheet, {
      types: ["background", "enhancement", "karma", "weapon", "armour", "cybernetic", "clothing", "gear", "craftWeapon"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.item",
   });

   foundry.applications.handlebars.loadTemplates({
      edrpgSection: "systems/edrpg/templates/actor/section.hbs",
      edrpgStoredList: "systems/edrpg/templates/actor/stored-list.hbs",
      edrpgEquipmentDetails: "systems/edrpg/templates/item/equipment-details.hbs",
      edrpgCondition: "systems/edrpg/templates/actor/condition.hbs",
      edrpgCreation: "systems/edrpg/templates/actor/creation.hbs",
   });
});

Hooks.once("ready", () => {
   registerContestSocket();
   registerAttackSocket();
   registerDamageHooks();
   registerGrabSocket();
   registerCraftSocket();
   registerVehicleCombat();
   ensureLandingScene();
   // Controlled drones take their controller's Cyber bonus: refresh them once every actor exists, and when a
   // controller changes.
   const refreshDrones = (uuid) => {
      for (const a of game.actors) {
         if (a.type === "opponent" && a.system.controller && (!uuid || a.system.controller === uuid)) {
            a.reset();
            a.sheet?.rendered && a.sheet.render();
         }
      }
   };
   refreshDrones();
   Hooks.on("updateActor", (actor) => refreshDrones(actor.uuid));
});

// The GM's Star Port Market (Advanced Trading) button, at the top of the Actors sidebar.
Hooks.on("renderActorDirectory", (app, html) => {
   if (!game.user.isGM) return;
   const root = html instanceof HTMLElement ? html : html?.[0];
   const actions = root?.querySelector(".header-actions");
   if (!actions || actions.querySelector(".edrpg-market")) return;
   const button = document.createElement("button");
   button.type = "button";
   button.className = "edrpg-market";
   button.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> ${game.i18n.localize("EDRPG.trade.button")}`;
   button.addEventListener("click", () => openMarket());
   actions.append(button);
});

Hooks.on("renderChatMessageHTML", (message, html) => {
   onRenderSkillCheck(message, html);
   onRenderContest(message, html);
   onRenderAttack(message, html);
   onRenderDamage(message, html);
   onRenderCraftAttack(message, html);
   onRenderVehicleEvent(message, html);
});
