/**
 * The party: characters that a player owns. In a solo game, where the GM plays and nobody else owns a character, it is
 * every character in the world.
 *
 * @returns {Actor[]}
 */
export function partyCharacters() {
   const chars = (game.actors ?? []).filter((a) => a.type === "character");
   const owned = chars.filter((a) => a.hasPlayerOwner);
   return owned.length ? owned : chars;
}
