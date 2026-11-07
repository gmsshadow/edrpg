import { openRankPoints, giveRankPoints } from "./rank-points.mjs";
import { scanForSilent } from "./silent-running.mjs";
import { openMarket } from "./trading.mjs";
import { StarSystemData } from "./data/starsystem.mjs";
import EDStarSystemSheet, { createStarSystem } from "./sheets/starsystem-sheet.mjs";
import { openMissionGenerator, rollMission } from "./missions.mjs";
import { betweenAdventures, openRareItems } from "./between-adventures.mjs";
import { openHireCrew } from "./crew.mjs";
import { registerFleetHooks, promptStartingShip } from "./fleet.mjs";
import { registerTools, runTool } from "./tools.mjs";
import { openEncounterGenerator, trackCombat, registerEncounterHooks } from "./encounters.mjs";
import { openInfiltration, onRenderInfiltration } from "./infiltration.mjs";
import { openBaseGenerator, openBase } from "./bases.mjs";
import { onRenderPlanet, explore as explorePlanet } from "./planet.mjs";
import { onRenderEventCard } from "./event-cards.mjs";
import { onRenderInterdiction, openInterdiction } from "./interdiction.mjs";
import { onRenderHostages } from "./hostage.mjs";
import { rollSpaceLane } from "./space-lane.mjs";
import "./travel.mjs";
import { registerTurnPanel, openTurnPanel } from "./turn-panel.mjs";
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
import { VehicleData, ShipData, CraftWeaponData, ShipComponentData } from "./data/vehicle.mjs";
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
   game.edrpg = { config: EDRPG, openMarket, generateStarSystem: createStarSystem, generateMission: openMissionGenerator, rollMission, betweenAdventures, openRareItems, openHireCrew, promptStartingShip, openEncounterGenerator, openInfiltration, openBaseGenerator, openBase, trackCombat, runTool, explorePlanet, rollSpaceLane, openInterdiction, openRankPoints, giveRankPoints, scanForSilent, openTurnPanel, rollSkillCheck, endAdventure, useKarmaCapability, restKarma, bleedOut, heal, rollCraftAttack, vehicleAction, checkObstacles, startVehicleTurn };
   registerKarmaHooks();
   registerTools();

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
      starSystem: StarSystemData,
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
      shipComponent: ShipComponentData,
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
   DocumentSheetConfig.registerSheet(foundry.documents.Actor, "edrpg", EDStarSystemSheet, {
      types: ["starSystem"],
      makeDefault: true,
      label: "EDRPG.sheet.labels.starSystem",
   });
   DocumentSheetConfig.registerSheet(foundry.documents.Item, "edrpg", EDItemSheet, {
      types: ["background", "enhancement", "karma", "weapon", "armour", "cybernetic", "clothing", "gear", "craftWeapon", "shipComponent"],
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
   registerFleetHooks();
   registerTurnPanel();
   registerEncounterHooks();
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
   // Star System Generator (Core Rules pp.330–337).
   const gen = document.createElement("button");
   gen.type = "button";
   gen.className = "edrpg-starsystem";
   gen.innerHTML = `<i class="fa-solid fa-sun"></i> ${game.i18n.localize("EDRPG.star.button")}`;
   gen.addEventListener("click", () => createStarSystem());
   actions.append(gen);
   // Mission Generator (Core Rules pp.338–347).
   const mission = document.createElement("button");
   mission.type = "button";
   mission.className = "edrpg-mission-button";
   mission.innerHTML = `<i class="fa-solid fa-clipboard-list"></i> ${game.i18n.localize("EDRPG.mission.button")}`;
   mission.addEventListener("click", () => openMissionGenerator());
   actions.append(mission);
   // Rare Item Availability (Core Rules p.324).
   const rare = document.createElement("button");
   rare.type = "button";
   rare.className = "edrpg-rare-button";
   rare.innerHTML = `<i class="fa-solid fa-gem"></i> ${game.i18n.localize("EDRPG.rare.button")}`;
   rare.addEventListener("click", () => openRareItems());
   actions.append(rare);
   // Crew generator (Core Rules p.260).
   const crew = document.createElement("button");
   crew.type = "button";
   crew.className = "edrpg-crew-button";
   crew.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${game.i18n.localize("EDRPG.crew.button")}`;
   crew.addEventListener("click", () => openHireCrew());
   actions.append(crew);
   // Awarding Rank Points (Core Rules p.326).
   const rp = document.createElement("button");
   rp.type = "button";
   rp.className = "edrpg-rp-button";
   rp.innerHTML = `<i class="fa-solid fa-medal"></i> ${game.i18n.localize("EDRPG.rp.button")}`;
   rp.addEventListener("click", () => openRankPoints());
   actions.append(rp);
   // The supplements' Random Generation Systems: encounters, Infiltration, bases and travel tables.
   const tools = document.createElement("button");
   tools.type = "button";
   tools.className = "edrpg-generators-button";
   tools.innerHTML = `<i class="fa-solid fa-dice"></i> ${game.i18n.localize("EDRPG.tools.button")}`;
   tools.addEventListener("click", () => openGenerators());
   actions.append(tools);
});

Hooks.on("renderChatMessageHTML", (message, html) => {
   onRenderSkillCheck(message, html);
   onRenderContest(message, html);
   onRenderAttack(message, html);
   onRenderDamage(message, html);
   onRenderCraftAttack(message, html);
   onRenderVehicleEvent(message, html);
   onRenderInfiltration(message, html);
   onRenderPlanet(message, html);
   onRenderEventCard(message, html);
   onRenderInterdiction(message, html);
   onRenderHostages(message, html);
});

/** The GM's generators menu (supplement Random Generation Systems). */
async function openGenerators() {
   const L = (k) => game.i18n.localize(k);
   const pickTool = await foundry.applications.api.DialogV2.wait({
      window: { title: L("EDRPG.tools.button"), icon: "fa-solid fa-dice" },
      classes: ["edrpg", "edrpg-dialog", "edrpg-generators"],
      content: `<p class="hint">${L("EDRPG.tools.menuHint")}</p>`,
      buttons: [
         { action: "encounter", label: L("EDRPG.tools.encounter"), icon: "fa-solid fa-users-viewfinder" },
         { action: "infiltration", label: L("EDRPG.tools.infiltration"), icon: "fa-solid fa-user-secret" },
         { action: "base", label: L("EDRPG.tools.base"), icon: "fa-solid fa-building-shield" },
         { action: "spaceLane", label: L("EDRPG.tools.spaceLane"), icon: "fa-solid fa-route" },
         { action: "planet", label: L("EDRPG.tools.planet"), icon: "fa-solid fa-earth-americas" },
         { action: "travel", label: L("EDRPG.tools.travel"), icon: "fa-solid fa-person-hiking" },
         { action: "assassin", label: L("EDRPG.tools.assassin"), icon: "fa-solid fa-user-ninja" },
         { action: "alienItem", label: L("EDRPG.tools.alienItem"), icon: "fa-solid fa-atom" },
         { action: "interdict", label: L("EDRPG.tools.interdict"), icon: "fa-solid fa-magnet" },
         { action: "sneak", label: L("EDRPG.tools.sneak"), icon: "fa-solid fa-user-secret" },
         { action: "hostages", label: L("EDRPG.tools.hostages"), icon: "fa-solid fa-people-group" },
         { action: "journey", label: L("EDRPG.tools.journey"), icon: "fa-solid fa-shuttle-space" },
      ],
      rejectClose: false,
   });
   if (!pickTool) return;
   if (pickTool === "infiltration") return openInfiltration();
   if (pickTool === "spaceLane" || pickTool === "planet") return runTool(pickTool, { count: 1 });
   if (pickTool === "travel") {
      const n = await foundry.applications.api.DialogV2.input({ window: { title: L("EDRPG.tools.travel") }, content: `<div class="form-group"><label>${L("EDRPG.tools.count")}</label><div class="form-fields"><input type="number" name="count" value="1" min="1"></div></div><div class="form-group"><label>${L("EDRPG.infil.alert")}</label><div class="form-fields"><input type="checkbox" name="alert"></div></div>`, rejectClose: false });
      return n ? runTool("travel", { count: Number(n.count) || 1, alert: !!n.alert }) : null;
   }
   return runTool(pickTool, {});
}

