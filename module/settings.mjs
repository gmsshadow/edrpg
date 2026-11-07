import { registerRules } from "./rules.mjs";

/**
 * Register world settings for the EDRPG system.
 */
export default function registerSettings() {
   // Optional rules (the books' rule variants): one hidden setting each, behind the Optional Rules window.
   registerRules();
   const settings = {
      systemMaxBackgrounds: { default: 4, type: Number },
      defaultDifficultyNumber: { default: 9, type: Number },
      allowToRerollAllTests: { default: false, type: Boolean },
      socialFactorCap: { default: 0, type: Number },
   };
   // Explosives work differently with and without a battle map (Core Rules pp.58–60).
   game.settings.register("edrpg", "explosiveMode", {
      name: "EDRPG.settings.explosiveMode.name",
      hint: "EDRPG.settings.explosiveMode.hint",
      scope: "world",
      config: true,
      default: "ask",
      type: String,
      choices: {
         ask: "EDRPG.settings.explosiveMode.ask",
         mapped: "EDRPG.settings.explosiveMode.mapped",
         mapless: "EDRPG.settings.explosiveMode.mapless",
      },
   });
   // Spaceship and vehicle turns: a step-by-step panel for the GM and the craft's owners.
   game.settings.register("edrpg", "vehicleTurnPanel", {
      name: "EDRPG.settings.vehicleTurnPanel.name",
      hint: "EDRPG.settings.vehicleTurnPanel.hint",
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
   });
   // Silent Running (Core Rules p.268): a minute is safe, but the book never says how long a round lasts. Its crew
   // damage ticks "every ten seconds", so by default a round is ten seconds and a minute six rounds.
   game.settings.register("edrpg", "silentRunningRounds", {
      name: "EDRPG.settings.silentRunningRounds.name",
      hint: "EDRPG.settings.silentRunningRounds.hint",
      scope: "world",
      config: true,
      default: 6,
      type: Number,
   });
   // Remembered choices for the GM's vehicle obstacle checks (Core Rules pp.73–74).
   game.settings.register("edrpg", "vehicleObstacleTable", { scope: "world", config: false, type: String, default: "light" });
   // Advanced Trading (Super Traders Supplement): how many times the players have traded at each star port.
   game.settings.register("edrpg", "marketVisits", { scope: "world", config: false, type: Object, default: {} });
   game.settings.register("edrpg", "vehicleGravity", { scope: "world", config: false, type: String, default: "g1" });
   for (const [key, { default: initial, type }] of Object.entries(settings)) {
      game.settings.register("edrpg", key, {
         name: `EDRPG.settings.${key}.name`,
         hint: `EDRPG.settings.${key}.hint`,
         scope: "world",
         config: true,
         default: initial,
         type,
      });
   }
}
