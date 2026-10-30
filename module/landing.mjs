/**
 * The Landing scene: on a brand-new world (no scenes yet) the active GM imports it from the system's scene
 * compendium and activates it, so it's what everyone sees on joining. Runs once per world; delete or replace the
 * scene freely afterwards.
 */
const PACK = "edrpg.combat-maps";

export function registerLandingSetting() {
   game.settings.register("edrpg", "landingSceneCreated", { scope: "world", config: false, type: Boolean, default: false });
}

export async function ensureLandingScene() {
   if (!game.user.isActiveGM || game.settings.get("edrpg", "landingSceneCreated")) return;
   if (game.scenes.size) return game.settings.set("edrpg", "landingSceneCreated", true);
   const pack = game.packs.get(PACK);
   const index = await pack?.getIndex({ fields: ["flags.edrpg.landing"] });
   const entry = index?.find((e) => e.flags?.edrpg?.landing);
   if (!entry) return;
   const scene = await game.scenes.importFromCompendium(pack, entry._id, {}, { keepId: true });
   await game.settings.set("edrpg", "landingSceneCreated", true);
   await scene?.activate();
}
