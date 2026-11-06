/**
 * Data for the supplements' Random Generation Systems that isn't a plain roll table: difficulty numbers, opponent
 * behaviours, Rank Appropriate Assassins, Infiltration challenges and the base rooms (Espionage Supplement pp.41–60,
 * Military Sourcebook pp.51–64, Exploration Supplement pp.39–54, Super Traders Supplement pp.40–55).
 * Mechanics only, in short; the books have the scenes.
 */

/** Relative Difficulty Numbers by rank: [Easy, Average, Hard] (Core Rules p.242). */
export const RELATIVE_DIFFICULTY = {
   harmless: [5, 7, 10],
   mostlyHarmless: [6, 8, 11],
   novice: [6, 8, 11],
   competent: [7, 9, 12],
   expert: [7, 9, 12],
   master: [8, 10, 13],
   dangerous: [9, 11, 14],
   deadly: [10, 12, 15],
   elite: [11, 13, 16],
};

/** The four Tiers by rank. */
export const TIER_OF_RANK = { harmless: 1, mostlyHarmless: 1, novice: 2, competent: 2, expert: 3, master: 3, dangerous: 4, deadly: 4, elite: 4 };

/** Number of Opponents by D10 (Easy, Medium, Hard): players + this. */
export const NUMBER_OF_OPPONENTS = {
   easy: [[4, -2], [7, -1], [10, 0]],
   medium: [[4, 0], [7, 1], [10, 2]],
   hard: [[4, 3], [7, 4], [10, 5]],
};

/** Personal-scale opponent behaviours (each supplement's Opponent Behaviours table). */
export const BEHAVIOURS = {
   "Achilles Combat Android": "cunning", "Apex-Fire Combat Drone": "thoughtless", "Army Officer": "cunning", "Army Soldier": "cunning",
   "Assault Trooper": "cunning", "Battlescarred Cyber Merc": "cunning", "Conscript": "thoughtless", "Dog Mortar": "thoughtless",
   "Eye Bot": "thoughtless", "Guard Bot": "thoughtless", "Heavy Weapons Support": "cunning", "Junga Pattern Walker Drone": "thoughtless",
   "Manticore HN Walker Drone": "thoughtless", "Mercenary Demolisher": "cunning", "Pendragon Support Drone": "thoughtless",
   "Sentinel Turret": "thoughtless", "Slave Soldier": "cunning", "Sniper": "cunning", "Special Forces": "cunning",
   "T-90 Patrol Drone": "thoughtless", "Type X Walker Drone": "thoughtless",
   "Bounty Hunter": "cunning", "Bruiser": "brute", "Counter Assault Security": "cunning", "GorillaLion": "brute",
   "Heavy Support Officer": "cunning", "Hired Gun": "cunning", "Panther Hound": "brute", "Police Detective": "cunning",
   "Police Officer": "cunning", "Police Raider": "cunning", "Private Military Contractor": "cunning", "Security Guard": "cunning",
   "SnakeWolf": "brute", "Vigilante": "cunning", "War Front Security Guard": "cunning",
   "Assembler": "brute", "Blindwurm": "brute", "Borchuck": "thoughtless", "Disorientator": "brute", "Frenick": "cunning",
   "Gollunk": "brute", "Holomancer": "cunning", "Kai": "brute", "Kavoraptor": "brute", "Monstrous Tribal": "brute",
   "Mordrake Spider": "thoughtless", "Mortis Claw": "brute", "Narseer": "brute", "Progenitor": "thoughtless", "Rock Runner": "brute",
   "Shambler": "brute", "Spit Viper": "thoughtless", "Stump": "brute", "Tengoroth": "thoughtless", "Tribal Hunter": "cunning",
   "Tribal Slayer": "brute", "Tribal Young Blood": "cunning", "Vengeful Tribal": "cunning",
   "Consigliere": "cunning", "Cyber Pirate": "cunning", "Gang Enforcer": "cunning", "Gang Leader": "cunning", "Gang Member": "cunning",
   "Pirate Hotshot": "cunning", "Saboteur": "cunning", "Street Punk": "cunning", "The Cleaner": "cunning", "The Don": "cunning",
   "Unstoppable Assassin": "brute", "Wise Guy": "cunning",
};

/** Rank Appropriate Assassin (Espionage p.48). */
export const ASSASSINS = {
   harmless: "Bruiser", mostlyHarmless: "Vigilante", novice: "Spy", competent: "Spy", expert: "Hired Gun", master: "Bounty Hunter",
   dangerous: "Special Agent", deadly: "Special Agent", elite: "Unstoppable Assassin",
};

/** Opponents that aren't human (re-rolled for groups of soldiers, p.60 of the Military Sourcebook). */
export const NOT_HUMAN = /drone|bot\b|android|turret|mortar|hound|snakewolf|gorillalion|walker|skimmer/i;

/* -------------------------------------------- */
/*  Infiltration challenges (Espionage pp.45–48) */
/* -------------------------------------------- */

/**
 * Each: name, D100 range, the checks in order ([difficulty, skills, note]), whether you get a second chance, and the
 * special reward / failure penalty in brief. `counts`: successes it's worth.
 */
export const INFILTRATION = [
   { key: "bedroom", name: "Bedroom Acquisition", range: [1, 4], checks: [["easy", ["charm"]], ["easy", ["sleightOfHand"]]], reward: "One-use keycard: automatically pass one Security check this mission.", penalty: "Fight a Rank Appropriate Assassin with no equipment, weapons or armour on either side." },
   { key: "befriendGuard", name: "Befriend Security Guard", range: [5, 8], checks: [["easy", ["charm"]], ["easy", ["bluff"]]], reward: "Patrol patterns: ignore one security group this mission." },
   { key: "blackmail", name: "Blackmail", range: [9, 12], checks: [["easy", ["streetwise", "gambling"]], ["easy", ["intimidate"]]], reward: "Instead of completing the challenge, extort the Treasure Income for your rank.", penalty: "If the Intimidate check fails, inform on them: remove one living opponent from your next Security group." },
   { key: "agentApartment", name: "Break into Agent’s Apartment", range: [13, 16], checks: [["average", ["security"]], ["easy", ["perception", "computer"]]], reward: "Then a Hard Perception check: on a success, a random Rare item (Core p.324).", penalty: "Failed Security check: two Police Officers. Accept arrest (jailed for the mission) or run, taking two shots each at 8m and 18m." },
   { key: "depositBox", name: "Break into Deposit Box", range: [17, 20], checks: [["hard", ["security"]]], reward: "Roll a die: on an even number, also a cash voucher worth the Treasure Income for your rank." },
   { key: "bribe", name: "Bribe", range: [21, 24], cost: "treasure", checks: [["easy", ["bargain"]]], counts: 2, reward: "Counts as two successes. First pay a bribe equal to the mission's Treasure Income." },
   { key: "carChase", name: "Car Chase", range: [25, 28], checks: [["easy", ["vehiclePiloting"]], ["average", ["vehiclePiloting"], "fail: crash into the police, jailed for the mission"], ["easy", ["vehiclePiloting"], "fail: 10 Damage as the car rolls"]], penalty: "Average check failed: jailed for the mission. Last check failed: take 10 Damage." },
   { key: "ventShaft", name: "Crawl through the Vent Shaft", range: [29, 32], checks: [["easy", ["athletics"]], ["easy", ["perception", "computer"]]], penalty: "Failed Athletics: stuck in the vents until the end of the mission." },
   { key: "criminalConnections", name: "Criminal Connections", range: [33, 36], checks: [["average", ["streetwise"]], ["easy", ["bargain"]]], reward: "Ignore the next encounter with the police (police in a combat group don't appear)." },
   { key: "disguise", name: "Disguise", range: [37, 40], checks: [["average", ["bluff"]]], reward: "You may raid the corporate base solo; security won't stop you unless the Alert is raised.", penalty: "An Easy security group tries to arrest you (holding cell until rescued). Fighting raises the Alert." },
   { key: "distract", name: "Distract", range: [41, 44], checks: [["average", ["bluff", "charm"]]], penalty: "The mission's corporate base goes on Alert." },
   { key: "crimeScene", name: "Evaluate Crime Scene", range: [45, 48], checks: [["average", ["perception"]]] },
   { key: "flatter", name: "Flatter", range: [49, 52], checks: [["average", ["charm"]]] },
   { key: "followSuspect", name: "Follow Suspect", range: [53, 56], checks: [["average", ["stealth"]]], penalty: "She attacks: a Rank Appropriate Assassin. Flee (Alert) or fight (win: no Alert, but no success)." },
   { key: "hackNetwork", name: "Hack Unsecured Network", range: [57, 60], checks: [["average", ["computer"]]] },
   { key: "intimidateGangster", name: "Intimidate Gangster", range: [61, 64], checks: [["easy", ["streetwise"]], ["easy", ["intimidate"]]], reward: "The gang disposes of the next Rank Appropriate Assassin sent after you." },
   { key: "party", name: "Invite to Party", range: [65, 68], doubleSocial: true, checks: [["average", ["streetwise"]], ["average", ["diplomacy", "insight"]]], reward: "Double Social Factor bonus (or penalty) on these checks.", penalty: "Second check failed: a Rank Appropriate Assassin, fought to the death." },
   { key: "observeWeakness", name: "Observe Weakness", range: [69, 72], checks: [["easy", ["intimidate"]], ["easy", ["insight"]]] },
   { key: "passOff", name: "Pass yourself off", range: [73, 76], checks: [["average", ["bluff"]]], reward: "Your fake ID works: the team infiltrates a corporate base without making any checks.", penalty: "An Easy security group tries to arrest you (holding cell until rescued). Fighting raises the Alert." },
   { key: "pickpocket", name: "Pickpocket", range: [77, 80], checks: [["average", ["sleightOfHand"]]], penalty: "The agent (Rank Appropriate Assassin) attacks; the police arrive after three rounds. Beat them first to take the com and win." },
   { key: "reasonPartner", name: "Reason with Partner", range: [81, 84], checks: [["average", ["bluff", "charm", "diplomacy"]]], reward: "You may draw two more random challenges.", penalty: "Ambushed by a Rank Appropriate Assassin, who gets a free attack ignoring your Defence." },
   { key: "shakeSpies", name: "Shake off Enemy Spies", range: [85, 88], checks: [["average", ["stealth", "vehiclePiloting"]]], penalty: "For the rest of the mission, each challenge you complete brings a Rank Appropriate Assassin." },
   { key: "tail", name: "Tail", range: [89, 92], checks: [["easy", ["vehiclePiloting"]], ["easy", ["stealth"]]] },
   { key: "threaten", name: "Threaten", range: [93, 96], checks: [["average", ["intimidate"]]], penalty: "The enemy goes on Alert." },
   { key: "youCanTellMe", name: "You can tell me…", range: [97, 100], checks: [["easy", ["charm"]], ["easy", ["insight"]]] },
];

/** The Determining the Mole mission's special challenge (each player may make it once, p.53). */
export const INTERROGATE = { key: "interrogate", name: "Interrogate", range: null, special: true, checks: [["easy", ["charm", "diplomacy", "intimidate"]]], penalty: "A false lead: one of your successful challenges now counts as a failure." };

/* -------------------------------------------- */
/*  Bases (Espionage pp.55–60, Military pp.60–64) */
/* -------------------------------------------- */

/** Most rooms in a base, by size. */
export const BASE_SIZES = { small: 10, medium: 30, large: 60 };

/** Doors in a room by its size (Military Sourcebook p.64): [highest D10, doors]. */
export const ROOM_DOORS = {
   small: [[3, 0], [8, 1], [10, 2]],
   medium: [[2, 0], [6, 1], [8, 2], [9, 3], [10, 4]],
   large: [[2, 0], [5, 1], [7, 2], [8, 3], [9, 4], [10, 5]],
};

/** Corridors: [highest D10, length, doors table] and what's at the end. */
export const CORRIDORS = [
   [3, 10, [[1, 0], [6, 1], [10, 2]]],
   [7, 20, [[1, 0], [3, 1], [5, 2], [8, 3], [10, 4]]],
   [10, 30, [[1, 0], [2, 1], [3, 2], [5, 3], [7, 4], [9, 5], [10, 6]]],
];
export const CORRIDOR_ENDS = [[2, "another"], [4, "left"], [6, "right"], [8, "tJunction"], [9, "crossroads"], [10, "door"]];

/**
 * Base rooms. `o`: who's there, as [when, chance %, kind, difficulty or count, note]:
 * - when: "always" | "normal" (no Alert) | "alert"
 * - kind: "guards" (the base's Security or Military group), "workers" (Office Workers group), "unarmed" (unarmed
 *   soldiers, humans only), "assassin" (Rank Appropriate Assassin), "person" (a named single opponent), "text".
 * `n`: notes (locks, rewards, special) in brief.
 */
export const CORPORATE_ROOMS = [
   { key: "reception", name: "Reception", size: "medium", range: null, page: 57, o: [["always", 100, "guards", "medium", "On guard; won't attack unless you go in without authorisation."]], n: "Visitor passes. At least one other exit." },
   { key: "sideRoom", name: "Side Room", size: null, range: null, page: 57, o: [], n: "Locked 80% (Easy Security or Average Athletics). Then roll the room it really is; it has a door to a corridor." },
   { key: "buzzerPad", name: "Buzzer Landing Pad", size: "medium", range: [1, 3], page: 57, o: [], n: "Buzzer here 80%: locked (pass or Average Security); seats five, an escape route (about 1,000cr)." },
   { key: "canteen", name: "Canteen", size: "large", range: [4, 6], page: 57, o: [["normal", 100, "workers", "medium"]], n: "Empty during an Alert." },
   { key: "carPark", name: "Car Park", size: "large", range: [7, 9], page: 57, o: [["always", 10, "person", "Office Worker", "Arriving, with a Security Pass."]], n: "Locked doors (Average Security or Hard Athletics). A way out." },
   { key: "classroom", name: "Classroom", size: "small", range: [10, 12], page: 57, o: [["normal", 20, "workers", "easy"]], n: "Empty during an Alert." },
   { key: "shop", name: "Company Shop", size: "medium", range: [13, 15], page: 57, o: [["normal", 100, "workers", "easy"]], n: "Alert: closed and locked (Easy Security, Average Athletics, or a pass)." },
   { key: "computerSuite", name: "Computer Suite", size: "medium", range: [16, 18], page: 57, o: [["alert", 100, "guards", "medium"]], n: "Locked (Hard Security or Computer). Destroying the servers raises the Alert but disables all drones and robots." },
   { key: "coms", name: "Coms Room", size: "medium", range: [19, 21], page: 57, o: [["alert", 100, "guards", "easy"]], n: "Average Computer: the Alert can't sound. After an Alert, Average Bluff over the intercom calls it off." },
   { key: "director", name: "Director’s Suite", size: "large", range: [22, 24], page: 58, o: [["always", 100, "text", "The PA: 50% a Rank Appropriate Assassin (bodyguard)."], ["always", 20, "text", "The Director (10% a Rank Appropriate Assassin)."], ["alert", 100, "guards", "medium"]], n: "Alert: locked (pass or Average Security). The Director's pass opens every door; if they surrender, the Vault code. An assassin carries a Rare item." },
   { key: "droneControl", name: "Drone Control Room", size: "medium", range: [25, 27], page: 58, o: [["always", 100, "guards", "easy"], ["always", 20, "text", "A Rank-appropriate Walker Drone."], ["alert", 100, "guards", "medium"]], n: "Take it to control the base's 1D10 drones and see through them. 5%: a Drone Remote Wrist Com." },
   { key: "droneHangar", name: "Drone Hangar", size: "large", range: [28, 30], page: 58, o: [], n: "No Alert: Easy Cyber to sabotage the drones (none in later groups); Hard Cyber to take one (Flying or Walker). Alert: empty." },
   { key: "generator", name: "Generator", size: "medium", range: [31, 33], page: 58, o: [["normal", 100, "guards", "easy"], ["alert", 100, "guards", "hard"]], n: "Locked (Hard Security). Average Repair rigs it to destroy the base in 15 minutes." },
   { key: "gym", name: "Gymnasium", size: "large", range: [34, 36], page: 58, o: [["normal", 100, "workers", "easy", "Likely not to notice you."]], n: "Empty during an Alert." },
   { key: "holdingCell", name: "Holding Cell", size: "medium", range: [37, 39], page: 58, o: [["always", 100, "guards", "easy"]], n: "Five cells (panel on the far wall); prisoners' gear in a cupboard. Arrested players are here." },
   { key: "hotel", name: "Hotel Block", size: "large", range: [40, 42], page: 58, o: [["always", 100, "text", "1D10 Office Workers asleep; they rarely come out."]], n: "" },
   { key: "interrogation", name: "Interrogation Room", size: "small", range: [43, 45], page: 58, o: [], n: "Locked (pass or Average Security). 20%: Combat Stims." },
   { key: "lab", name: "Lab", size: "medium", range: [46, 48], page: 58, o: [["always", 100, "workers", "medium", "Scientists; always ask for ID, even in an Alert."]], n: "50%: a Rare item." },
   { key: "meeting", name: "Meeting Room", size: "small", range: [49, 51], page: 59, o: [["normal", 20, "workers", "medium"]], n: "10%: a forgotten Security pass (Average Computer to put your face on it; works until an Alert)." },
   { key: "mtv", name: "MTV Transit Hub", size: "large", range: [52, 54], page: 59, o: [["always", 100, "guards", "hard", "Watching arrivals; easy to slip past from inside."]], n: "Only in cities and stations. A second way out." },
   { key: "officeStores", name: "Office Stores", size: "small", range: [55, 57], page: 59, o: [], n: "Locked (Easy Security). Blank badges (Average Computer): get past Office Workers, not Security." },
   { key: "openPlan", name: "Open Plan Office", size: "large", range: [58, 63], page: 59, o: [["always", 100, "text", "Dozens of Office Workers; only 20% chance you're challenged."], ["alert", 100, "guards", "medium"]], n: "When a fight starts the workers stampede to the Safe Room; Easy Athletics or Stealth slips out with them." },
   { key: "operations", name: "Operations Room", size: "small", range: [64, 66], page: 59, o: [["normal", 100, "guards", "easy"], ["alert", 100, "guards", "hard"], ["always", 100, "text", "Five Office Workers at the controls."]], n: "Unlock every door; control lights and coms. Before an Alert, jam coms so no Alert can be raised in combat." },
   { key: "privateOffice", name: "Private Office", size: "large", range: [67, 69], page: 59, o: [["always", 100, "person", "Office Worker"]], n: "5%: a Rare item (not a weapon or armour)." },
   { key: "display", name: "Product Display Hall", size: "large", range: [70, 72], page: 59, o: [], n: "Maybe something worth stealing (GM); solo: 5% a Rare item." },
   { key: "safeRoom", name: "Safe Room", size: "small", range: [73, 75], page: 59, o: [["alert", 100, "guards", "medium", "Outside the vault door; about a hundred Office Workers inside."]], n: "Vault door: Hard Security. An executive keycard can be taken inside." },
   { key: "checkpoint", name: "Security Check Point", size: "medium", range: [76, 78], page: 60, o: [["always", 100, "guards", "easy", "Without an Alert they only check people passing through."]], n: "Easy Computer: the next three locked doors open by themselves." },
   { key: "securityOffice", name: "Security Office", size: "large", range: [79, 81], page: 60, o: [["normal", 100, "guards", "hard"], ["alert", 100, "guards", "medium"]], n: "Locked (Hard Security). 1D10 security passes (open any door); laser rifles and pistols, Reflec and Bullet Proof Vests (Average Security); 50% a Rare weapon or armour." },
   { key: "hangar", name: "Spaceship Hangar", size: "large", range: [82, 84], page: 60, o: [], n: "One Security ship (roll it); can't launch without clearance from Operations. Alert: 50% out on patrol." },
   { key: "staffRoom", name: "Staff Room", size: "medium", range: [85, 87], page: 60, o: [["normal", 100, "workers", "medium"]], n: "Empty during an Alert." },
   { key: "toilets", name: "Toilet Block", size: "medium", range: [88, 90], page: 60, o: [["always", 50, "workers", "easy"]], n: "" },
   { key: "vault", name: "Vault", size: "medium", range: [91, 93], page: 60, o: [["alert", 100, "guards", "easy", "Outside the vault."]], n: "Passes don't open it; without the code, Hard Security +2. Credit packs worth four times the Treasure Income, and a Rare item." },
   { key: "vip", name: "VIP Lounge", size: "medium", range: [94, 96], page: 60, o: [], n: "Rarely guarded or occupied unless it's the target room." },
   { key: "welfare", name: "Welfare Room", size: "medium", range: [97, 100], page: 60, o: [["always", 100, "workers", "easy", "Medical staff: won't fight, will raise the Alert when safe."], ["alert", 100, "guards", "easy"]], n: "Three Standard Medpacks; 30% one is Advanced or Professional." },
];

export const MILITARY_ROOMS = [
   { key: "guardRoom", name: "Guard Room", size: "medium", range: null, page: 61, o: [["always", 100, "guards", "medium", "On active guard."]], n: "A spare Laser or Assault Rifle; 30% a Rare weapon or armour. One door to a corridor." },
   { key: "sideRoom", name: "Side Room", size: null, range: null, page: 61, o: [], n: "Locked 80% (Easy Security or Average Athletics). Then roll the room it really is; it has a door to a corridor." },
   { key: "ammo", name: "Ammo Store", size: "small", range: [1, 3], page: 61, o: [["alert", 100, "guards", "easy"]], n: "Locked (Hard Security; a failed first attempt raises the Alert). Ammo and common grenades; 50% a Rare grenade." },
   { key: "bar", name: "Bar", size: "medium", range: [4, 6], page: 61, o: [["normal", 40, "unarmed", "medium", "Open, and audible from outside."]], n: "Closed (Easy Security) otherwise, and always during an Alert." },
   { key: "bunks", name: "Bunk Room", size: "medium", range: [7, 9], page: 61, o: [["normal", 30, "unarmed", "medium", "Asleep: Easy Stealth to get by."]], n: "Empty during an Alert. 10%: a Rare item (Average Perception)." },
   { key: "canteen", name: "Canteen", size: "large", range: [10, 12], page: 61, o: [["normal", 100, "unarmed", "easy"]], n: "Empty during an Alert." },
   { key: "cinema", name: "Cinema", size: "medium", range: [13, 15], page: 61, o: [["always", 10, "unarmed", "medium", "Watching the film; unlikely to notice you."]], n: "" },
   { key: "classroom", name: "Classroom", size: "small", range: [16, 18], page: 62, o: [["normal", 20, "unarmed", "easy"]], n: "Empty during an Alert. An officer here carries a Security Key (opens every door)." },
   { key: "commonRoom", name: "Common Room", size: "medium", range: [19, 21], page: 62, o: [["normal", 100, "unarmed", "medium", "Audible; you can avoid them."]], n: "Empty during an Alert." },
   { key: "comsStore", name: "Coms Store", size: "small", range: [22, 24], page: 62, o: [["alert", 100, "guards", "easy"]], n: "Locked (Average Security). Coms of every kind." },
   { key: "computerSuite", name: "Computer Suite", size: "medium", range: [25, 27], page: 62, o: [["alert", 100, "guards", "medium"]], n: "Locked (Hard Security or Computer). Destroying the servers raises the Alert but disables all drones and robots." },
   { key: "comsWorkshop", name: "Coms Workshop", size: "small", range: [28, 30], page: 62, o: [["normal", 30, "person", "Army Soldier", "Unarmed."]], n: "Empty during an Alert." },
   { key: "droneControl", name: "Drone Control Room", size: "medium", range: [31, 33], page: 62, o: [["always", 100, "unarmed", "easy"], ["always", 20, "text", "A Rank-appropriate Walker Drone."], ["alert", 100, "guards", "medium"]], n: "Take it to control the base's 1D10 drones and see through them. 5%: a Drone Remote Wrist Com." },
   { key: "droneHangar", name: "Drone Hangar", size: "large", range: [34, 36], page: 62, o: [], n: "No Alert: Easy Cyber to sabotage the drones (none in later groups); Hard Cyber to take one (Flying or Walker). Alert: empty." },
   { key: "yard", name: "Exercise Yard", size: "large", range: [37, 39], page: 62, o: [["normal", 100, "unarmed", "hard", "Audible through the door; you can avoid them."], ["alert", 100, "guards", "easy"]], n: "" },
   { key: "stores", name: "General Stores", size: "medium", range: [40, 42], page: 62, o: [["always", 90, "person", "Army Soldier", "The Quartermaster, with a shotgun."], ["alert", 100, "guards", "easy"]], n: "Locked (Average Security). All common armour." },
   { key: "generator", name: "Generator", size: "medium", range: [43, 45], page: 62, o: [["normal", 100, "guards", "easy"], ["alert", 100, "guards", "hard"]], n: "Locked (Hard Security). Average Repair rigs it to destroy the base in 15 minutes." },
   { key: "gym", name: "Gymnasium", size: "large", range: [46, 48], page: 62, o: [["normal", 100, "unarmed", "easy", "Likely not to notice you."]], n: "Empty during an Alert." },
   { key: "range", name: "Indoor Firing Range", size: "large", range: [49, 51], page: 62, o: [["normal", 100, "unarmed", "easy", "Likely not to notice you."]], n: "Pistol cabinet (Average Security or Athletics): six autopistols and laser pistols, 12 clips; 10% a Rare pistol. Empty during an Alert." },
   { key: "armoury", name: "Main Armoury", size: "medium", range: [52, 54], page: 63, o: [["alert", 100, "guards", "medium"]], n: "Locked (Hard Security). Every common personal weapon, no ammo; 30% a Rare weapon." },
   { key: "medical", name: "Medical Reception Station", size: "medium", range: [55, 57], page: 63, o: [["always", 100, "text", "Medical staff: won't fight, will raise the Alert when safe."], ["alert", 100, "guards", "easy"]], n: "Three Standard Medpacks; 30% one is Advanced or Professional." },
   { key: "transport", name: "Military Transport Hub", size: "large", range: [58, 60], page: 63, o: [["normal", 100, "person", "Army Soldier"], ["alert", 100, "guards", "easy"]], n: "Longhaul Trucks and APCs; keys in a locked office (Average Security)." },
   { key: "office", name: "Office", size: "small", range: [61, 63], page: 63, o: [["normal", 70, "person", "Army Officer", "Suspicious of interruptions."]], n: "The officer's Security Card opens locked doors. Empty during an Alert." },
   { key: "mess", name: "Officers’ Mess", size: "medium", range: [64, 66], page: 63, o: [["always", 50, "text", "1D10 unarmed Army Officers eating."]], n: "A senior officer has a Security Pass." },
   { key: "operations", name: "Operations Room", size: "medium", range: [67, 69], page: 63, o: [["normal", 100, "guards", "easy"], ["alert", 100, "guards", "hard"], ["always", 100, "text", "Five unarmed soldiers at the controls."]], n: "Unlock every door; control lights and coms. Before an Alert, jam coms so no Alert can be raised in combat." },
   { key: "px", name: "Post Exchange Shop", size: "small", range: [70, 72], page: 63, o: [["normal", 100, "person", "Army Soldier"]], n: "Alert: empty and locked (Average Security). 10%: Combat Stims under the counter (Average Perception)." },
   { key: "quadbikes", name: "Quadbike Garage", size: "large", range: [73, 75], page: 63, o: [["normal", 5, "guards", "easy"]], n: "Locked (Average Security). Garriot Quadbike SRVs. Empty during an Alert." },
   { key: "readyRoom", name: "Ready Room", size: "medium", range: [76, 78], page: 63, o: [["normal", 50, "guards", "easy", "Being briefed."]], n: "Maps and plans. Alert: empty, unlocked, and cleared of anything sensitive." },
   { key: "hq", name: "Regimental HQ", size: "large", range: [79, 81], page: 63, largeOnly: true, o: [["always", 100, "text", "At least one senior officer."], ["normal", 100, "guards", "easy"], ["alert", 100, "guards", "medium"]], n: "Large bases only." },
   { key: "sim", name: "Sim Room", size: "medium", range: [82, 84], page: 63, o: [["always", 50, "unarmed", "easy", "Oblivious while the sim runs."]], n: "An officer here has a security card (Easy Sleight of Hand to take it)." },
   { key: "hangar", name: "Spaceship Hangar", size: "large", range: [85, 87], page: 63, o: [], n: "One military ship (roll it); can't launch without clearance from Operations. Alert: 50% out on patrol." },
   { key: "toilets", name: "Toilet Block", size: "medium", range: [88, 90], page: 63, o: [["always", 50, "unarmed", "easy", "Armed during an Alert."]], n: "" },
   { key: "turretControl", name: "Turret Control", size: "small", range: [91, 93], page: 64, o: [["always", 100, "text", "Several unarmed soldiers at the terminals."], ["alert", 100, "guards", "easy"]], n: "Destroying it raises the Alert but silences the base's turrets." },
   { key: "vehicleBay", name: "Vehicle Bay", size: "medium", range: [94, 96], page: 64, o: [], n: "Locked (Average Security). One military vehicle (roll it); 50% gone during an Alert." },
   { key: "weaponWorkshop", name: "Vehicle Weapon Workshop", size: "medium", range: [97, 99], page: 64, o: [["always", 50, "text", "A mechanic: no fight, but may raise the Alert unless tied up."]], n: "" },
   { key: "vip", name: "VIP Lounge", size: "medium", range: [100, 100], page: 64, o: [], n: "Rarely guarded or occupied unless it's the target room." },
];

/** Every 100 jumps on the long way home (Exploration Supplement p.51): [highest D10, title, effect]. */
export const LONG_JOURNEY = [
   [2, "No Event", "The journey goes on."],
   [4, "Mechanical Breakdown", "A random ship's FSD fails: Easy Repair by its crew, or Average Repair by players docking to help. If all fail, abandon the ship."],
   [6, "Navigation Challenge", "Average Navigation, or add 300 jumps."],
   [8, "Too Close", "A random ship scoops too close: 70 Hull damage, less 5 per point of a Spaceship Piloting check."],
   [9, "Simmering Tensions", "A ship with passengers: everyone aboard makes Hard Diplomacy; if none pass, a Fighting brawl until one is left standing. Unconscious players: odd die, they die (Escape Death saves)."],
   [10, "Thargoids", "A random ship is pulled out and (without a Shutdown Field Neutraliser) immobilised. D10: 1–5 scanned; 6–9 40 Hull and 40 to a critical component; 10 destroyed. Others fight or flee (Pursuit)."],
];

/** Opponents' Spaceship Piloting bonus by rank, for Interdiction (Super Traders p.45). */
export const RANK_PILOTING = { harmless: 2, mostlyHarmless: 3, novice: 3, competent: 4, expert: 5, master: 6, dangerous: 7, deadly: 8, elite: 9 };

/** Heist ships' limpets by size (Super Traders p.44): Hatch Breaker controller, Accuracy, Override, canisters per turn. */
export const HEIST_LIMPETS = { small: ["1C", 4, "5 (1D10 units)", 1], medium: ["3C", 6, "5 (2D10 units)", 2], large: ["5C", 8, "4 (3D10 units)", 3] };
