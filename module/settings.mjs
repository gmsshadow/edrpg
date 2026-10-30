/**
 * Register world settings for the EDRPG system.
 */
export default function registerSettings() {
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
   // Remembered choices for the GM's vehicle obstacle checks (Core Rules pp.73–74).
   game.settings.register("edrpg", "vehicleObstacleTable", { scope: "world", config: false, type: String, default: "light" });
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
