/**
 * Supplement Mission Notes: how to run each random mission, in brief, with links to the generators
 * (`@EDRPG[tool …]{label}`, see tools.mjs). Espionage Supplement pp.49–54, Military Sourcebook pp.55–59, Exploration
 * Supplement pp.47–54, Super Traders Supplement pp.52–55.
 *
 * Each mission: { book, page, steps: [{ detail?: [low, high], twist?: [low, high], title?, text, tools?: [] }] }.
 * A step with `detail` (or `twist`) shows only when the rolled detail (or twist) is in range.
 */

const ENC = (faction, scale, difficulty, label, extra = "") => `@EDRPG[encounter faction=${faction} scale=${scale} difficulty=${difficulty} direct${extra ? ` ${extra}` : ""}]{${label}}`;
const INF = (args, label) => `@EDRPG[infiltration ${args}]{${label}}`;
const BASE = (args, label) => `@EDRPG[base ${args}]{${label}}`;
const LANE = (count, column, label) => `@EDRPG[spaceLane count=${count}${column !== null ? ` column=${column}` : ""}]{${label}}`;
const PLANET = (count, column, label) => `@EDRPG[planet count=${count} column=${column}]{${label}}`;
const TRAVEL = (count, label) => `@EDRPG[travel count=${count}]{${label}}`;
const ASSASSIN = "@EDRPG[assassin]{Rank Appropriate Assassin}";
const REINF = (faction, scale = "personal") => `@EDRPG[track faction=${faction} scale=${scale}]{Track reinforcements}`;

const TRAVEL_RULE = "Getting there: roll a die. 1–4 land close (no travel); 5–6 a short walk (two Travel encounters, or one if everyone drives); 7–10 far away (six Travel encounters, or two by vehicle).";

export const MISSION_NOTES = {
   /* ---------------- Espionage Supplement ---------------- */
   Assassination: {
      book: "Espionage Supplement", page: 49,
      steps: [
         { title: "Scoping the target", detail: [1, 9], text: "Eight random Infiltration challenges; complete four to make the attempt (more helps the escape).", tools: [INF("count=8 need=4", "8 challenges, need 4")] },
         { title: "Scoping the target", detail: [10, 10], text: "Passes to board the capital ship: complete three from a short list.", tools: [INF("list=befriendGuard,ventShaft,disguise,party,passOff need=3", "Choose 3 of 5")] },
         { title: "Taking the shot", text: "With the full arsenal, one player shoots from 300m. The target can't Dodge (range only). A hit of 15+ Damage kills; otherwise he's bundled away and you must run." },
         { title: "The escape", text: "Roll a D10 against the challenges completed: higher, a Hard Security group in a crowded gunfight. Then in the ships, roll again: higher, a Hard Security group of spaceships (you may flee after the first round). Paid if the target died.", tools: [ENC("security", "personal", "hard", "Hard Security group"), ENC("security", "spaceship", "hard", "Hard Security ships")] },
      ],
   },
   Capture: {
      book: "Espionage Supplement", page: 49,
      steps: [
         { title: "Space Interdiction", detail: [1, 9], text: "Needs an FSD Interdictor (size 2 for a medium target, 3 for a large). The target is a Security Freighter (medium) or Jobbing Trucker (large), Spaceship Piloting +2, escorted by a Medium Security group of ships with Reinforcements; one try to pull it out of supercruise. It surrenders when its escort is gone and its shields are down. Someone must fly it out (a partner or crew, or a player leaving their own ship).", tools: [ENC("security", "spaceship", "medium", "Medium Security escort"), REINF("security", "spaceship")] },
         { title: "Ship Heist", detail: [1, 9], text: "Or seize it at a neutral station: six random challenges, need three. Storming the ship: 3 done, a Hard Security group; 4, Medium; 5, Easy; 6, none. Then, unless all six were done, a Security group of ships attacks the escape on the same scale (one player flies the Type-6 Haulage Pro or Type-7 Capacity Max).", tools: [INF("count=6 need=3", "6 challenges, need 3")] },
         { title: "Container ship", detail: [10, 10], text: "No interdiction on a capital ship: ten random challenges, need five. Storming with an army of agents: 5 done, two Hard Security groups in turn; 6–7, two Medium; 8–9, two Easy; 10, none. Then roll a D10: less than the challenges done, you get it home; otherwise a cruiser interdicts and you abandon ship (mission failed).", tools: [INF("count=10 need=5", "10 challenges, need 5")] },
      ],
   },
   "Blueprint Acquisition": {
      book: "Espionage Supplement", page: 50,
      steps: [
         { detail: [1, 2], text: "An isolated, patrolled base: each player makes an Easy Athletics, Perception or Stealth check. If more than one fails, a Medium Security group intercepts and the Alert sounds.", tools: [ENC("security", "personal", "medium", "Medium Security group")] },
         { detail: [5, 6], text: "An isolated, patrolled base: each player makes an Easy Athletics, Perception or Stealth check. If more than one fails, a Medium Security group intercepts and the Alert sounds.", tools: [ENC("security", "personal", "medium", "Medium Security group")] },
         { detail: [3, 4], text: "Smuggled aboard the station on a transport. Hide in canisters (undetected, 1D10 Damage each) or slip out of the bay (one Easy Stealth check; if spotted, an Easy Security group and the Alert).", tools: [ENC("security", "personal", "easy", "Easy Security group")] },
         { detail: [7, 10], text: "Find the secret lab and a way in: four random challenges, need two.", tools: [INF("count=4 need=2", "4 challenges, need 2")] },
         { title: "The base", text: "A small corporate base; the Lab is the target room. An Easy Computer or Perception check finds the plans; if everyone fails, an Easy Security group with Reinforcements, then try again.", tools: [BASE("type=corporate size=small target=lab", "Small corporate base (target: Lab)")] },
      ],
   },
   Misinformation: {
      book: "Espionage Supplement", page: 51,
      steps: [
         { title: "First set", text: "Complete at least two of four.", tools: [INF("list=befriendGuard,depositBox,hackNetwork,passOff need=2", "Choose from 4, need 2")] },
         { text: "If the team has only two or three successes so far, a Medium Security group warns them off in the streets: fists only unless guns are drawn, ending when anyone drops to 0 Endurance. Four or more: not attacked.", tools: [ENC("security", "personal", "medium", "Medium Security group")] },
         { title: "Second set", text: "At least two more from five.", tools: [INF("list=bedroom,ventShaft,distract,party,shakeSpies need=2", "Choose from 5, need 2")] },
         { text: "With only two or three successes in this set, a Medium Security group attacks them in their hotel, with guns. Four or more: discreet." },
         { title: "Final set", text: "As many as they can from five.", tools: [INF("list=agentApartment,flatter,intimidateGangster,reasonPartner,youCanTellMe need=5", "Choose from 5")] },
         { title: "The stock sale", text: "Roll a D10: less than the total challenges completed in the mission, the enemy is fooled (success). Otherwise the mission fails." },
      ],
   },
   Kidnap: {
      book: "Espionage Supplement", page: 51,
      steps: [
         { text: "The kidnappers are criminals: use Criminal groups (Super Traders) or Security groups." },
         { detail: [1, 2], text: "Investigate on lawless Bunda: four random challenges, need two. With three or more they arrive unharassed; otherwise a Medium group of enemy ships intercepts and the base is on Alert.", tools: [INF("count=4 need=2", "4 challenges, need 2"), ENC("criminal", "spaceship", "medium", "Medium Criminal ships")] },
         { detail: [7, 8], text: "Investigate on lawless Bunda: four random challenges, need two. With three or more they arrive unharassed; otherwise a Medium group of enemy ships intercepts and the base is on Alert.", tools: [INF("count=4 need=2", "4 challenges, need 2"), ENC("criminal", "spaceship", "medium", "Medium Criminal ships")] },
         { detail: [3, 4], text: "The prisoner is aboard the Pirate Battleship The Terror (Core p.299). Ambush it (it ejects him in a pod at half Hull, or if its thrusters or life support go), or infiltrate Skyline High station: six random challenges, need three, then board against 3 done: Hard group; 4: Medium; 5: Easy; 6: unseen.", tools: [INF("count=6 need=3", "6 challenges, need 3")] },
         { detail: [5, 6], text: "Find the hideout on the station: at least two of four. Three or more: no Alert.", tools: [INF("list=blackmail,carChase,criminalConnections,pickpocket need=2", "Choose from 4, need 2")] },
         { detail: [9, 10], text: "Through the forest: each player makes an Average Survival check. On a failure roll a die: even, that much Damage; odd, an Easy Alien Animal (or kidnapper) group, fought together after all the checks.", tools: [ENC("alienAnimals", "personal", "easy", "Easy Alien Animals")] },
         { title: "Raiding the base", text: "A small corporate base; the Holding Cell is the target. Free the prisoner to win.", tools: [BASE("type=corporate size=small target=holdingCell", "Small corporate base (target: Holding Cell)")] },
      ],
   },
   "Contract Swap": {
      book: "Espionage Supplement", page: 52,
      steps: [
         { text: "Find where the paper contract is: five random challenges, need three.", tools: [INF("count=5 need=3", "5 challenges, need 3")] },
         { title: "The swap", text: "One player completes one of three challenges. If they fail, a different player tries a different one. Both fail: the real contract is signed and the mission fails.", tools: [INF("list=bedroom,agentApartment,depositBox need=1", "Choose 1 of 3")] },
      ],
   },
   "Computer Virus": {
      book: "Espionage Supplement", page: 52,
      steps: [
         { title: "The access code", text: "Four random challenges in Altair. 1 done: the code, but the base is on Alert and a Medium Security group of ships intercepts. 2: Alert, and an Easy group of ships. 3: no Alert. 4: no Alert, and every Security check in the base passes automatically.", tools: [INF("count=4 need=1", "4 challenges"), ENC("security", "spaceship", "medium", "Medium Security ships"), ENC("security", "spaceship", "easy", "Easy Security ships")] },
         { title: "Raiding the base", text: "A medium corporate base; the Computer Suite is the target. Beat any defenders and insert the virus.", tools: [BASE("type=corporate size=medium target=computerSuite", "Medium corporate base (target: Computer Suite)")] },
         { title: "Revenge strike", text: "If the Alert was raised, a Medium Security group of ships intercepts as they leave.", tools: [ENC("security", "spaceship", "medium", "Medium Security ships")] },
      ],
   },
   "Extracting a Spy": {
      book: "Espionage Supplement", page: 53,
      steps: [
         { title: "Finding the base", text: "Complete three of ten.", tools: [INF("list=blackmail,bribe,carChase,criminalConnections,crimeScene,followSuspect,intimidateGangster,observeWeakness,reasonPartner,tail need=3", "Choose from 10, need 3")] },
         { detail: [1, 3], text: "Vehicles only (an agency provides each player a Scarab SRV). If any challenge failed, a Medium Security group of vehicles intercepts.", tools: [ENC("security", "vehicle", "medium", "Medium Security vehicles")] },
         { detail: [4, 6], text: "Obscuring terrain: raid the base straight away." },
         { detail: [7, 9], text: "The platform's guard ships: a Medium Security group of ships if any challenge failed.", tools: [ENC("security", "spaceship", "medium", "Medium Security ships")] },
         { detail: [10, 10], text: "Pass as gang members: a Hard Bluff check if any challenge failed, otherwise Average. Fail and the mission is over. Pass, dock, and beat a Medium Security group with the Spy's help; you capture their Type-7 too.", tools: [ENC("security", "personal", "medium", "Medium Security group")] },
         { title: "Raiding the base", detail: [1, 9], text: "A large corporate base with no target room. At each Security group met, roll a D10 (+1 for each earlier group): on 10 the spy is with them. Fight that group with the Spy's help, then flee with her.", tools: [BASE("type=corporate size=large", "Large corporate base")] },
      ],
   },
   "Determining Who the Mole Is": {
      book: "Espionage Supplement", page: 53,
      steps: [
         { text: "Six random challenges, and each player may also Interrogate once. When done, roll a D10: equal to or less than the challenges completed, the mole is found; otherwise the mission fails.", tools: [INF("count=6 need=1 interrogate", "6 challenges + Interrogate")] },
         { title: "Revealing the mole", text: "He takes the CEO hostage. Let him go (normal pay), or shoot him (Hard Kinetic or Energy Weapons check: success kills him; failure, the CEO dies), or wrestle the gun (Average Fighting; failure, the CEO dies). A wrestler ends up on a ledge: Fighting only against a Rank Appropriate Assassin, and anyone knocked over or dropped to 0 falls. Pay: half if the CEO dies, double if a player rescues her.", tools: [ASSASSIN] },
      ],
   },
   "Expose Military Expansion Plans": {
      book: "Espionage Supplement", page: 54,
      steps: [
         { text: "Passes get them past the Reception or Guard Room. A large military (Military Sourcebook) or corporate base; the Computer Suite is the target, where an Average Computer check extracts the plans. In a military base a printed copy is in the Regimental HQ (no check).", tools: [BASE("type=military size=large target=computerSuite", "Large military base"), BASE("type=corporate size=large target=computerSuite", "Large corporate base")] },
         { title: "Revenge strike", text: "If the Alert was raised, a Medium Military or Security group of ships intercepts as they leave.", tools: [ENC("military", "spaceship", "medium", "Medium Military ships")] },
      ],
   },

   /* ---------------- Military Sourcebook ---------------- */
   Recon: {
      book: "Military Sourcebook", page: 55,
      steps: [
         { detail: [1, 4], text: "A Hard group of Military ships guards it (Reinforcements). If everyone flies that faction's military ships, a Hard Bluff check passes them; otherwise fight. Then each player makes an Average General Scan: a failure makes undefeated defenders attack, or brings Reinforcement checks each round until someone succeeds.", tools: [ENC("military", "spaceship", "hard", "Hard Military ships"), REINF("military", "spaceship")] },
         { detail: [5, 10], text: `A ground installation. On a die roll of 9–10 a Medium group of Military ships intercepts on entry (a Hard Bluff check avoids it). ${TRAVEL_RULE} Then scan it quietly and leave.`, tools: [ENC("military", "spaceship", "medium", "Medium Military ships"), TRAVEL(2, "2 Travel encounters"), TRAVEL(6, "6 Travel encounters")] },
      ],
   },
   "Disruption at Checkpoint Zulu": {
      book: "Military Sourcebook", page: 55,
      steps: [
         { detail: [1, 6], text: "An Easy group of Military ships attacks; after a round the fastest tries to flee (if it escapes, the mission is blown). Then ambush the convoy: one Security Freighter per player and a Military Escort (Expert and above: Military Transports and a Heavy Interceptor). After a round the freighters run; they get Reinforcements. Destroy one for the reward, +50% for each more.", tools: [ENC("military", "spaceship", "easy", "Easy Military ships"), REINF("military", "spaceship")] },
         { detail: [7, 10], text: `${TRAVEL_RULE} Clear the Railhead (a small military base, normal guards), rest six hours, then three Haulage Trucks arrive: an Easy Bluff check makes them unload; otherwise chase and destroy them.`, tools: [TRAVEL(2, "2 Travel encounters"), TRAVEL(6, "6 Travel encounters"), BASE("type=military size=small", "Small military base")] },
      ],
   },
   Raid: {
      book: "Military Sourcebook", page: 55,
      steps: [
         { detail: [1, 4], text: "A Medium group of Military ships with Reinforcements; then destroying the small outpost is easy (they may let it evacuate).", tools: [ENC("military", "spaceship", "medium", "Medium Military ships"), REINF("military", "spaceship")] },
         { detail: [5, 9], text: "As above, but it must be boarded: a medium military base on Alert, target the Generator. Rig it to blow and escape.", tools: [ENC("military", "spaceship", "medium", "Medium Military ships"), BASE("type=military size=medium target=generator alert", "Medium military base (Alert)")] },
         { detail: [10, 10], text: "No space defenders and no Alert: board the medium base, target the Generator.", tools: [BASE("type=military size=medium target=generator", "Medium military base")] },
      ],
   },
   "Snatch Squad": {
      book: "Military Sourcebook", page: 56,
      steps: [
         { text: "A large military base, not on Alert; the VIP Lounge is the target, where an Easy group of soldiers guards the target (he surrenders once they're beaten).", tools: [BASE("type=military size=large target=vip", "Large military base (target: VIP Lounge)"), ENC("military", "personal", "easy", "Easy soldier group", "humansOnly")] },
         { detail: [1, 9], text: "On leaving, the Alert sounds and a Hard group of Military ships pursues: each player makes a Pursuit check against a different ship. Failures fight, and may try again in round two. Win when the ship with the target escapes or the pursuers are destroyed.", tools: [ENC("military", "spaceship", "hard", "Hard Military ships")] },
         { detail: [10, 10], text: "No pursuit, but an Average Streetwise check to get out of the city; on a failure a Hard group of soldiers corners them.", tools: [ENC("military", "personal", "hard", "Hard soldier group", "humansOnly")] },
      ],
   },
   "Hostage Release": {
      book: "Military Sourcebook", page: 56,
      steps: [
         { text: "2D10 hostages. Once the Alert sounds, one dies per combat round or skill check. Double pay if all survive, none if all die. Terrorists are Criminal or Military groups. One player may stay to negotiate (Average Bluff or Diplomacy: every later check one step easier). Beating a group: hand-to-hand (Melee and Fighting only, both sides), Stealth (Average; failure means a fight and the Alert; not the last group), technical (after the first group: Average Systems or Computer locks them in; failure raises the Alert; not the last group) or ambush (only the last group: they lose their first turn at Defence 0; flashbangs only)." },
         { detail: [1, 2], text: "A ship: in space, a Hard Systems check for a silent run to the hatch; landed, an Average Stealth check. Groups: Easy, Easy, Medium.", tools: [`@EDRPG[hostages groups=easy,easy,medium]{Hostage tracker}`] },
         { detail: [9, 10], text: "A ship: in space, a Hard Systems check for a silent run to the hatch; landed, an Average Stealth check. Groups: Easy, Easy, Medium.", tools: [`@EDRPG[hostages groups=easy,easy,medium]{Hostage tracker}`] },
         { detail: [3, 4], text: "The moon base: by vehicle a Hard Vehicle Piloting check each, on foot two Average Stealth checks each. The door hacks automatically (Average Security after an Alert), or ram it (Alert). Groups: Easy, Easy, Easy, Medium.", tools: [`@EDRPG[hostages groups=easy,easy,easy,medium]{Hostage tracker}`] },
         { detail: [5, 6], text: "As a ship, but four groups: Easy, Easy, Medium, Medium.", tools: [`@EDRPG[hostages groups=easy,easy,medium,medium]{Hostage tracker}`] },
         { detail: [7, 8], text: "A station building: no approach needed, and technical skills work on the first group. Groups: Medium, Medium, Hard, Hard.", tools: [`@EDRPG[hostages groups=medium,medium,hard,hard]{Hostage tracker}`] },
      ],
   },
   "Defensive Action": {
      book: "Military Sourcebook", page: 57,
      steps: [
         { detail: [1, 6], text: "On the ground (spacesuits on rocky or icy worlds), in good cover with a Sentinel Turret on your side (20 ammo, no reload). Waves: two Medium groups; a Medium and a Hard; two Hard.", tools: [ENC("military", "personal", "medium", "Medium Military group"), ENC("military", "personal", "hard", "Hard Military group")] },
         { detail: [7, 9], text: "In space, no cover or allies. Waves: Medium, Medium, Hard.", tools: [ENC("military", "spaceship", "medium", "Medium Military ships"), ENC("military", "spaceship", "hard", "Hard Military ships")] },
         { detail: [10, 10], text: "Defending a capital ship (Initiative +5), which fires three Huge Pulse Lasers at different enemies each turn (+5 Accuracy, 40 Damage, +5 vs Shields). Waves: Medium, Hard, Hard.", tools: [ENC("military", "spaceship", "medium", "Medium Military ships"), ENC("military", "spaceship", "hard", "Hard Military ships")] },
      ],
   },
   "Prisoner of War": {
      book: "Military Sourcebook", page: 57,
      steps: [
         { text: "Roll a D10. Even: it goes smoothly (paid, no Rank points). Odd: a breakout, a Hard group of unarmed humans using Fighting, who take the weapons of anyone they disarm or drop. Non-lethal only (blunt Melee and Fighting) pays double.", tools: [ENC("military", "personal", "hard", "Hard group (humans)", "humansOnly")] },
      ],
   },
   "Denial Operations": {
      book: "Military Sourcebook", page: 57,
      steps: [
         { title: "Interception", text: "A Medium group of enemy ships intercepts on approach; no bluffing.", tools: [ENC("military", "spaceship", "medium", "Medium Military ships")] },
         { detail: [1, 4], text: "Joust the power supply from the air (it is never drawn up-close; Defence 0; 50 Shields and 150 Hull per Tier). Three rounds, then an Easy group of Military ships arrives.", tools: [ENC("military", "spaceship", "easy", "Easy Military ships")] },
         { detail: [5, 9], text: `${TRAVEL_RULE} Then a small military base; the Generator is the target.`, tools: [TRAVEL(2, "2 Travel encounters"), TRAVEL(6, "6 Travel encounters"), BASE("type=military size=small target=generator", "Small military base (target: Generator)")] },
         { detail: [10, 10], text: "As 1–4, plus turrets: each round each player's ship is attacked by turrets (30 Damage, +5 vs Shields): Tier 1 one at +6, Tier 2 two at +8, Tier 3 three at +10, Tier 4 four at +12.", tools: [ENC("military", "spaceship", "easy", "Easy Military ships")] },
      ],
   },
   "Main Assault": {
      book: "Military Sourcebook", page: 58,
      steps: [
         { detail: [1, 4], text: "Spacesuits; visibility 30m on the perimeter: all ranged attacks −2, and the snipers can't fire." },
         { detail: [5, 8], text: "Spacesuits, but clear: the snipers fire." },
         { detail: [9, 10], text: "Fine weather: fatigues, and the snipers fire at will." },
         { title: "Perimeter", text: "An Easy Military group in cover; the players start in the open. After each player's turn a sniper attacks them unless they killed an enemy that turn: laser rifle at 400m, 15 Energy Damage, To Hit +3/+5/+7/+9 by Tier; they can't be attacked back. Each round one player may declare total cover.", tools: [ENC("military", "personal", "easy", "Easy Military group")] },
         { title: "Tunnels", text: "Two-metre fortified passages: a Medium group of soldiers.", tools: [ENC("military", "personal", "medium", "Medium soldier group", "humansOnly")] },
         { title: "Fortifications", text: "The control tower: a Medium group of soldiers. Beat them to complete the mission.", tools: [ENC("military", "personal", "medium", "Medium soldier group", "humansOnly")] },
      ],
   },
   "Military Transport": {
      book: "Military Sourcebook", page: 58,
      steps: [
         { title: "Escort", text: "Roll a die: odd, a Medium group of spacecraft attacks (the transports hang back).", tools: [ENC("military", "spaceship", "medium", "Medium Military ships")] },
         { detail: [1, 6], text: "Paid once the transports arrive; no Rank points if nobody intercepted." },
         { detail: [7, 10], text: "Then by road (no vehicle? drive a Longhaul Truck). Roll a die: odd, a Medium group of Military vehicles attacks. Rank points only if there was a fight in space.", tools: [ENC("military", "vehicle", "medium", "Medium Military vehicles")] },
      ],
   },

   /* ---------------- Exploration Supplement ---------------- */
   "Stellar Cartography": {
      book: "Exploration Supplement", page: 47,
      steps: [
         { detail: [1, 4], text: "Explore the Earth-like world: four Life-bearing Planet encounters, investigating every point of interest.", tools: [PLANET(4, 0, "4 Life-bearing encounters")] },
         { detail: [5, 8], text: "The first system that can have an Earth-like world has one. Every fourth lifeless planet explored has a Lifeless encounter; Earth-like and Water worlds a Life-bearing one.", tools: [PLANET(1, 1, "Lifeless encounter"), PLANET(1, 0, "Life-bearing encounter")] },
         { detail: [9, 10], text: "The first Metal Rich planet or moon holds Alien Ruins (see the Lifeless table)." },
      ],
   },
   "Exploration Feat": {
      book: "Exploration Supplement", page: 47,
      steps: [
         { detail: [1, 2], text: "Each player says how many seconds past the predicted moment they'll wait (up to 10). Roll a D10: those who waited less earn an extra mission payment per second; the rest are vaporised (Escape Death: out at 50% Hull with no sensors or pay)." },
         { detail: [3, 4], text: "SRVs only. The navigator's Navigation check: passes Hard, piloting checks pass automatically; Average, they're Easy; Easy, they're Average; fails, they're Hard. Each vehicle makes two Vehicle Piloting checks (one failure 20 Hull; two, totalled), Easy Repair at halfway (one check per player), then two more. Paid per intact SRV; a bonus mission reward if at most one SRV was lost." },
         { detail: [5, 6], text: "Certain Death Valley (double pay). Each player makes an Average Survival check: failure costs 10 Endurance, and below Easy also draws a random Alien Animal (they attack together after the checks). Three successes in total reach the anomaly, then D10: 1–2 a Rare item; 3–4 ten Combat Stims (two Paranoia Plus, one Brutal Plus); 5–6 a crashed Asp (Hard Perception each for a Rare item); 7–8 an abandoned Cobra Mk III Discretion (Average Repair or Systems to fly it out); 9 an Alien Obelisk (Hard Science: an Alien Item); 10 a Relic AI wreck (a Medium Relic AI group; then two Rare or one Alien item). Leave the same way.", tools: [ENC("alienAnimals", "personal", "easy", "Alien Animal"), ENC("relicAI", "personal", "medium", "Medium Relic AI group")] },
         { detail: [7, 8], text: "Each pilot makes an Average Spaceship Piloting check to land, else out of control: a Hard check or crash (eject). Explore on foot: three Life-bearing encounters; outdoors, ranged attacks −2 (not alien animals'). Taking off: a Hard Spaceship Piloting check, else out of control (a Hard check or crash, killing everyone aboard).", tools: [PLANET(3, 0, "3 Life-bearing encounters")] },
         { detail: [9, 10], text: "Navigator (Easy Navigation), Engineer (Average Repair), Pilot (Easy Spaceship Piloting); others may assist. A pilot failure can be saved by the navigator (Average Navigation) and vice versa; otherwise off course. An engineer failure is a fuel leak. Stranded: 5 Supply points; each player eats 1 a week or takes 15 Damage (no recovery); each week a D10 of 10 brings the Fuel Rats (no reward, Karma, and a 200,000,000cr debt). If they arrive: a K-class main sequence star; an encounter on every planet and moon (no pirates); paid once everything is explored.", tools: ["@EDRPG[starSystem]{Star system}"] },
      ],
   },
   "Investigate Anomaly": {
      book: "Exploration Supplement", page: 50,
      steps: [
         { detail: [1, 3], text: "Run an Alien Obelisk encounter (Planet Encounter table)." },
         { detail: [4, 5], text: "An ancient Anaconda infested with Relic AI: treat it as a Relic AI Base encounter." },
         { detail: [6, 8], text: "A small military base with no one left. In each room roll a D10, +1 per room already explored: on 10, Alien Animals attack (Easy, then Medium, then Hard; no Borchucks). The tenth room is the Main Armoury: two random Rare weapons.", tools: [BASE("type=military size=small", "Small military base"), ENC("alienAnimals", "personal", "easy", "Easy Alien Animals"), ENC("alienAnimals", "personal", "medium", "Medium Alien Animals"), ENC("alienAnimals", "personal", "hard", "Hard Alien Animals")] },
         { detail: [9, 10], text: "30,000 LY from home: jumps = 30,000 ÷ the shortest Range in the group. Ships without Fuel Scoops must be abandoned (passengers limited by seats). Every 100 jumps roll on the long journey table. Home safe: five times the usual reward.", tools: ["@EDRPG[journey]{Long journey (every 100 jumps)}"] },
      ],
   },
   "Zoological Expedition": {
      book: "Exploration Supplement", page: 51,
      steps: [
         { detail: [1, 3], text: "Three Life-bearing encounters on the way (points of interest optional). Three samples, each an Easy Science or Survival check (five attempts in all). A natural 1: poisoned, 10 Damage, and an Average Medicine check (repeat on failure).", tools: [PLANET(3, 0, "3 Life-bearing encounters")] },
         { detail: [4, 6], text: "The herd creature (a Gollunk; a Tengoroth at Master and above): fight it while one player captures the animal, or lure it off with pheromones (1,000cr, Average Science; on a failure it goes berserk: double Endurance, +1 To Hit, and everyone fights it). Capture: Easy Survival (one try if fighting, two if it was lured away).", tools: ["@EDRPG[person name=Gollunk]{Gollunk}", "@EDRPG[person name=Tengoroth]{Tengoroth}"] },
         { detail: [7, 9], text: "A Mordrake Spider or Mortis Claw (50/50) into the cage. Fake bait: Hard Survival. Live bait: Average Survival, then the bait makes an Average Dodge check to escape (or is attacked in the cage, where the animal has cover and can't be hit in melee). A failed Survival check: it attacks the hunters.", tools: ["@EDRPG[person name=Mordrake_Spider]{Mordrake Spider}", "@EDRPG[person name=Mortis_Claw]{Mortis Claw}"] },
         { detail: [10, 10], text: "Monstrous Tribals (Master and above only, else re-roll). Life-bearing encounters until opponents appear, as Monstrous Tribals. Capture one by dropping it to 0 with Fighting; keep it sedated (Average Medicine) or it breaks loose on the trip.", tools: [PLANET(1, 0, "Life-bearing encounter"), "@EDRPG[person name=Monstrous_Tribal]{Monstrous Tribal}"] },
      ],
   },
   "Search and Rescue": {
      book: "Exploration Supplement", page: 53,
      steps: [
         { detail: [1, 2], text: "A random system. For each body they choose to scan, each player makes a Hard Systems check (+ General Scan); each success rolls a D10, and a 10 finds him. Everything scanned without luck: too late.", tools: ["@EDRPG[starSystem]{Star system}"] },
         { detail: [3, 3], text: "D10: 10 a life-bearing world, otherwise lifeless. A Hard Systems check (+ General Scan) finds the pod from orbit. Otherwise sweep by SRV: on a lifeless world an Easy Systems, Easy Navigation and Easy Vehicle Piloting check (a failure loses that player; someone else takes the check); on a living world, an enraged Trelym attacks. The rescue: one Average Repair, Science or Athletics check; failure loses the pod and the reward.", tools: ["@EDRPG[person name=Trelym]{Trelym}"] },
         { detail: [4, 6], text: "The ruins, D10: 1–4 a Tribal Village, 5–7 Alien Ruins, 8–10 a Relic AI Base (Planet Encounter table). Half pay: the crew are dead." },
         { detail: [7, 8], text: "Persuade the colonists: Hard Diplomacy, Hard Intimidate, or Average Medicine or Science. On a failure they attack: twice as many as the players, as Conscripts. Subduing at least half with Fighting still gets paid.", tools: ["@EDRPG[person name=Conscript]{Conscript}"] },
         { detail: [9, 10], text: "An Average Survival or Perception check finds tracks to a Relic AI Base (Planet Encounter table). Paid regardless, for news of the crew's fate." },
      ],
   },
   "Found a Colony": {
      book: "Exploration Supplement", page: 54,
      steps: [{ text: "Beyond the random system: re-roll, or help the colonists find a site with a Stellar Cartography mission." }],
   },

   /* ---------------- Super Traders Supplement ---------------- */
   "Special Delivery": {
      book: "Super Traders Supplement", page: 52,
      steps: [
         { text: "Space Lane encounters for the trip: 1–3 three, 4–6 four, 7–8 five, 9–10 six (by the detail roll; re-roll No Event if you like). Then sign off the cargo.", tools: [LANE(3, null, "3 Space Lane"), LANE(4, null, "4 Space Lane"), LANE(5, null, "5 Space Lane"), LANE(6, null, "6 Space Lane")] },
      ],
   },
   "Drop Point Delivery": {
      book: "Super Traders Supplement", page: 52,
      steps: [
         { text: "Three Space Lane encounters (re-roll Star Port ones). Then a Longhaul Truck (a player drives, or escort it). D10: 1–3 an Average Navigation or Survival check, or a Hard Criminal vehicle group; 4–7 an Easy Criminal vehicle group ambush; 8–10 it breaks down: up to two players try an Average Repair; if both fail, a Medium Criminal vehicle group attacks while the truck can only Broadside with its turret.", tools: [LANE(3, null, "3 Space Lane"), ENC("criminal", "vehicle", "easy", "Easy Criminal vehicles"), ENC("criminal", "vehicle", "medium", "Medium Criminal vehicles"), ENC("criminal", "vehicle", "hard", "Hard Criminal vehicles")] },
         { text: "Fuel: under 160 LY of fuel means refuelling stops (16T none; 8T one; 4T four; 2T eight)." },
      ],
   },
   "Too Good to Pass Up": {
      book: "Super Traders Supplement", page: 53,
      steps: [
         { text: "Buy at 1,000cr a ton (sell parts if needed). Jumps by the slowest ship's FSD Range: 7LY 22, 8 19, 9 17, 10 15, 11 14, 12 13, 13 12, 14 11, 15–16 10, 17–18 9, 19–21 8, 22–23 7, 24+ 6. Refuelling adds 3 jumps at a port, 1 for a safe scoop, 0 for an emergency scoop. One navigator: Easy −1 jump, Average −2, Hard −3, failure +2. A Space Lane encounter (Average security) every two jumps; port encounters count as No Event. At the station roll 2D10: at least the jumps made, sell at 20,000cr a ton; otherwise 500cr.", tools: [LANE(1, 1, "Space Lane (Average)")] },
      ],
   },
   "Much in Demand": {
      book: "Super Traders Supplement", page: 54,
      steps: [
         { text: "Two Space Lane encounters out, buy at the average price (Core p.270), two back. It's dull, so roll the twist.", tools: [LANE(2, null, "2 Space Lane")] },
         { twist: [1, 3], text: "Pay double, or interdict an Armoured Transport and take its cargo with Hatch Breaker limpets. Four Police Vipers arrive after eight rounds; after twenty, withdraw." },
         { twist: [4, 6], text: "The strikers are a Hard Criminal group (or armed traders): fight them (the police look away), up to three players try Hard Diplomacy or Intimidate, or sneak past (Sneak into Port).", tools: [ENC("criminal", "spaceship", "hard", "Hard Criminal ships")] },
      ],
   },
   "Hell’s Space Trip": {
      book: "Super Traders Supplement", page: 54,
      steps: [
         { text: "Three Space Lane encounters (Low security), plus at least one assassination attempt.", tools: [LANE(3, 2, "3 Space Lane (Low)")] },
         { detail: [1, 3], text: "Bounty hunters: a Medium Criminal group (run the Bounty Hunters encounter).", tools: [ENC("criminal", "spaceship", "medium", "Medium Criminal ships")] },
         { detail: [4, 6], text: "The bounty hunters, plus a Cargo Thieves encounter for each player at the star port.", tools: [ENC("criminal", "spaceship", "medium", "Medium Criminal ships")] },
         { detail: [7, 10], text: "Both of those, and a Medium Criminal group attacks in the star port before they reach their ships.", tools: [ENC("criminal", "spaceship", "medium", "Medium Criminal ships"), ENC("criminal", "personal", "medium", "Medium Criminal group")] },
      ],
   },
   "It’s Legal if They Don’t See It": {
      book: "Super Traders Supplement", page: 54,
      steps: [{ text: "Four Space Lane encounters (High security); the police act on the illegal cargo. At the star port each ship carrying it must Sneak into Port.", tools: [LANE(4, 0, "4 Space Lane (High)")] }],
   },
   "Second Hand Goods": {
      book: "Super Traders Supplement", page: 54,
      steps: [{ text: "Enough cargo space first. One Space Lane encounter (Low security) out to the freighter; 20% a Hard Criminal group attacks during the transfer (the trader helps). Then three Space Lane encounters to port.", tools: [LANE(1, 2, "Space Lane (Low)"), ENC("criminal", "spaceship", "hard", "Hard Criminal ships"), LANE(3, null, "3 Space Lane")] }],
   },
   "Traders’ Instincts": {
      book: "Super Traders Supplement", page: 54,
      steps: [
         { text: "Split up or stay together, and name the systems. Each is Average security: two Space Lane encounters per group. At a port roll a D10: 1–3 the first system is right, 4–6 the second, 7–9 the third (re-roll 10). The right one pays the mission reward; otherwise go on (two more encounters).", tools: [LANE(2, 1, "2 Space Lane (Average)")] },
         { twist: [4, 6], text: "The strikers: a Hard Criminal group (or armed traders), or talk past (up to three Hard Diplomacy or Intimidate checks), or Sneak into Port.", tools: [ENC("criminal", "spaceship", "hard", "Hard Criminal ships")] },
         { twist: [7, 10], text: "On the way back: the Pirate Attack – Hard encounter, and no other encounters after it.", tools: [ENC("criminal", "spaceship", "hard", "Hard Criminal ships")] },
      ],
   },
   "Helping Old Joe": {
      book: "Super Traders Supplement", page: 55,
      steps: [
         { detail: [1, 3], text: "Uszza's crooked security holds him. Each player takes one Infiltration challenge: more successes than failures finds and frees him.", tools: [INF("perPlayer", "One challenge each")] },
         { detail: [4, 6], text: "A cave network, vehicles only. Easy Navigation through the tunnels (a failure loses that player until the end; try again). A pirate camp: an Easy Criminal vehicle group, or a Hard Criminal group on foot. Win to free him.", tools: [ENC("criminal", "vehicle", "easy", "Easy Criminal vehicles"), ENC("criminal", "personal", "hard", "Hard Criminal group")] },
         { detail: [7, 10], text: "Crack the cypher (each player a Computer or Science check), then find him as for 1–3.", tools: [INF("perPlayer", "One challenge each")] },
         { text: "Without the Espionage Supplement: complete three of these (one player at a time).", tools: [INF("list=crimeScene,followSuspect,distract,hackNetwork need=3", "4 tasks, need 3")] },
      ],
   },
   "Copycat Traders": {
      book: "Super Traders Supplement", page: 55,
      steps: [{ text: "Run a Special Delivery; at the port the doubles are about to dock ahead of you. A Hard Intimidate check warns them off (they may return); otherwise fight them: same ships and skills, no Karma Capabilities. Destroying them pays a bounty equal to the mission reward.", tools: [LANE(3, null, "3 Space Lane")] }],
   },
};

/**
 * The notes for a rolled mission, as HTML (or "" if none).
 *
 * @param {object} m  rollMission()
 *
 * @returns {string}
 */
export function notesHTML(m) {
   const n = MISSION_NOTES[m.name];
   if (!n) return "";
   const inRange = (r, v) => !r || (v !== undefined && v !== null && v >= r[0] && v <= r[1]);
   const steps = n.steps.filter((s) => inRange(s.detail, m.detailRoll) && (!s.twist || inRange(s.twist, m.twistRoll)));
   if (!steps.length) return "";
   const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
   const items = steps
      .map((s) => `<li>${s.title ? `<strong>${esc(s.title)}:</strong> ` : ""}${esc(s.text)}${s.tools?.length ? `<br>${s.tools.join(" ")}` : ""}</li>`)
      .join("");
   return `<div class="ed-mission-notes"><p><strong>${game.i18n.format("EDRPG.mission.notes", { book: esc(n.book), page: n.page })}</strong></p><ul>${items}</ul></div>`;
}
