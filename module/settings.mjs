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
