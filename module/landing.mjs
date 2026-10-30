/**
 * Premade scenes. The active GM imports them from the system's scene compendium into a world:
 * - Landing: on a brand-new world (no scenes yet) it's imported and activated, so it's what everyone sees on joining.
 * - Vehicle and Space Combat Maps: imported once into every world (new or existing) that doesn't already have them.
 * Each import runs once per world; delete, rename or replace the scenes freely afterwards.
 */
const PACK = "edrpg.combat-maps";
const FOLDER = "Elite: Dangerous RPG";

export function registerLandingSetting() {
   game.settings.register("edrpg", "landingSceneCreated", { scope: "world", config: false, type: Boolean, default: false });
   game.settings.register("edrpg", "combatScenesCreated", { scope: "world", config: false, type: Boolean, default: false });
}

/**
 * @param {CompendiumCollection} pack
 * @param {object} entry
 * @param {Folder|null} folder
 * @returns {Promise<Scene|null>}
 */
async function importScene(pack, entry, folder) {
   if (game.scenes.has(entry._id)) return game.scenes.get(entry._id);
   return game.scenes.importFromCompendium(pack, entry._id, { folder: folder?.id ?? null }, { keepId: true });
}

/** @returns {Promise<Folder>} */
async function sceneFolder() {
   return game.folders.find((f) => f.type === "Scene" && f.name === FOLDER) ?? Folder.implementation.create({ name: FOLDER, type: "Scene" });
}

export async function ensureLandingScene() {
   if (!game.user.isActiveGM) return;
   const pack = game.packs.get(PACK);
   const index = await pack?.getIndex({ fields: ["flags.edrpg"] });
   if (!index) return;

   if (!game.settings.get("edrpg", "landingSceneCreated")) {
      const isNew = !game.scenes.size;
      await game.settings.set("edrpg", "landingSceneCreated", true);
      const entry = index.find((e) => e.flags?.edrpg?.landing);
      if (isNew && entry) await (await importScene(pack, entry, null))?.activate();
   }

   if (!game.settings.get("edrpg", "combatScenesCreated")) {
      await game.settings.set("edrpg", "combatScenesCreated", true);
      const maps = index.filter((e) => e.flags?.edrpg?.combatMap && !game.scenes.some((s) => s.getFlag("edrpg", "combatMap")?.kind === e.flags.edrpg.combatMap.kind));
      if (!maps.length) return;
      const folder = await sceneFolder();
      for (const entry of maps) await importScene(pack, entry, folder);
      ui.notifications.info(game.i18n.format("EDRPG.scenes.imported", { folder: FOLDER }));
   }
}
