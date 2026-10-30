/**
 * Combat zones for vehicle and space combat (Core Rules p.63): up-close inside the circle on the combat maps,
 * at-distance outside it. Scenes from the Combat Maps compendium carry the circle in flags.edrpg.combatMap.
 */

/**
 * The combat map settings of a scene, if it is one.
 *
 * @param {Scene} [scene]
 *
 * @returns {{kind: string, upClose: {x: number, y: number, radius: number}}|null}
 */
export function combatMapOf(scene = canvas?.scene) {
   return scene?.getFlag("edrpg", "combatMap") ?? null;
}

/**
 * Which zone a token is in on a combat map.
 *
 * @param {TokenDocument} token
 *
 * @returns {"upClose"|"atDistance"|null}  Null when the scene isn't a combat map.
 */
export function zoneOfToken(token) {
   const map = combatMapOf(token?.parent);
   if (!map?.upClose) return null;
   const size = token.parent.grid?.size ?? 100;
   const cx = token.x + (token.width * size) / 2;
   const cy = token.y + (token.height * size) / 2;
   return Math.hypot(cx - map.upClose.x, cy - map.upClose.y) <= map.upClose.radius ? "upClose" : "atDistance";
}
