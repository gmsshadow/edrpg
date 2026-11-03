# Changelog

## 0.1.40

The d100 roll-under variant, as a world setting ("Check resolution": Core Rules or d100). It needs a reload; the two
modes share the same sheets, compendia and cards.

- **One resolver** (`module/dice/resolve.mjs`). Skill checks, contests, personal attacks, grabs, ship and vehicle
  attacks, driving checks and engineering all roll and judge through it. In Core Rules mode nothing changes.
- **The d100 check**: roll d100 equal to or under Skill score + (11 − difficulty) × 10 + every d10 modifier × 10.
  - 01–05 always succeed (SL 0) and 96–00 always fail.
  - The tens die is the Success Level, +1 for every full 10 the target is over 100.
  - A success is a critical on a double (11–88) or a roll of exactly the target.
- **Skill checks**: the difficulty is a choice of the six bands (Very Easy +60 to Almost Impossible −90). A world
  default that isn't a band starts at Average, and a published difficulty number keeps its own (11 − n) × 10 option.
  Social Factor and flat equipment bonuses are ×10; a Skill score bonus adds the score itself. The modifier you type
  is in d100 points. The card shows the score, each modifier, the target and the SL.
- **Attacks**: target = weapon Skill score + (11 − Range or Finesse) × 10 − Defence × 10, with cover −20, aiming +50,
  two weapons −20 and so on. Burst, Energy Burst and Heavy Burst count SL. The card lists every part as a d100
  modifier.
- **Opposed checks** (contests, grabs and escapes): a success beats a failure, then the higher SL, then the higher
  roll. The "other opponent" of a contest takes a Skill score.
- **Karma**: Capabilities' +2/+4 are +20/+40 to the target, and +5 Defence is −50. Karma rerolls a 96–00 instead of
  a 1.
- **Ship and vehicle attacks**: target = Weapons score + Accuracy × 10 + (11 − Defence) × 10, with the speed penalty,
  floating bonuses and Snipe ×10. Automatic turrets are Weapons 30. Defence 0 hits automatically and rolls only for
  SL. A critical replaces the natural 10 for component hits.
- **Driving checks**: Vehicle Piloting score + Agility × 10 + (11 − difficulty) × 10.
- **Unchanged on d10**: Dogfight, Ram, Chicken, Pursuit, Tailing, Initiative, damage, the GM's tables, scatter and
  point defence.
- **Rulings**:
  - Opponent, GM ship and drone stat blocks use their bonus × 10 as the score (an opponent's To Hit +5 is 50; a GM
    ship weapon's listed Accuracy +7 is 70).
  - Engineering is a Repair roll-under check: a failure is a Malfunction, a 96–00 is Ruined, and a success reads row
    10 + SL (at most 20). The professional engineers are Repair 50, 70, 90 and 100.
  - Initiative and other rules that add a skill bonus to a d10 keep the bonus (score ÷ 10).
  - Treat wounds heals the tens die (read as a d10) + the Medicine bonus and equipment bonuses, unless the roll is a
    96–00.
- Destroy Cover: the card now says the cover is destroyed only when the attack missed because of it. In d100, that's
  a roll over the target by no more than the cover penalty.

## 0.1.39

Supplements, step 6: trading, honorary ranks, drones, Aegis weapons and the random generation tables.

- **Commodity Market** (Super Traders Supplement pp.6–14). A GM button at the top of the Actors sidebar (or
  `game.edrpg.openMarket()`). Name the star port, pick its economy, and roll the column (D10+2 on the first visit,
  then D10, D8, D6 and D4 as the system is traded out) or pick one. It posts the price per ton of all 44 commodities
  from the economy's Price Index, with the column's meaning (black market, poor, at war, rich). Visits are counted
  per port; reset them when the system recovers. Colony, prison and terraforming economies are marked buy-only.
- **Honorary ranks** (Military Sourcebook). The Notes tab has Imperial and Federal honorary rank ladders, showing
  the ships each step unlocks. The rank's Social Factor bonus is offered on Social Factor skill rolls when dealing
  with that power.
- **Drones** (Espionage Supplement). Robotic opponents have a controller: drop a character on the drone's sheet and
  their Cyber skill bonus is added to its To Hit and Dodge, and kept up to date. Drone prices are in their notes.
- **Aegis and Thargoids** (Exploration Supplement). 8 AX weapons (AX Multi-Cannons, AX Missile Racks, Flak Launchers,
  Remote Release Flechette Launchers and so on) and the AX Xeno Scanner and Shutdown Field Neutraliser. Ships can be
  marked with an impervious hull (only AX weapons damage the Hull) or as a swarm (each hit does 1 Damage plus Burst,
  unless the weapon is flak). Neither can suffer critical hits. The Thargoid Invader and Thargon Swarm use these.
- **Roll Tables compendium** (new). 67 tables in a folder per book:
  - The supplements' opponent tables by Tier (personal, vehicle and spaceship scale), with each result linked to its
    stat block in the Opponents compendium.
  - Number of Opponents (Easy, Medium, Hard), Space Lane Encounters (by security rating), Planet Encounters (by
    planet type), Infiltration Challenges, Corporate and Military Base Rooms, Travel, Corridor Length and End of
    Corridor, Random Cargo and Alien Items.
  - Results that aren't opponents give the page to read.
- **Core vehicle-scale opponents**. The 17 missing from the Core Rules are added (Federal and Police Bikers, Merc
  APC, Assault Tank, Anti-Aircraft Battery, Mainline Battletank, Battlecar, War Truck, Police Ram Raider and the
  rest), plus the Trelym, so the opponent tables can link to them.
- Fix: the Pirate Cruiser is named as printed (it was "Pirate Cruiser High Threat").
- Rulings and gaps:
  - A drone's To Hit adds the controller's Cyber on top of its stat block.
  - The books leave a few table ranges empty: Military Spaceships Tier 1 21–29, and Relic AI Spaceships Tier 3 11–20.
    A draw on them returns nothing.
  - Imperial Slaves prices are printed in brackets in the book. They're shown as printed.
  - Trade missions aren't included.

## 0.1.38

Supplements, step 5: engineering and ship-launched fighters.

- **Engineering** (Espionage Supplement pp.6–12). The ship sheet's Specifications tab has an Engineer button (on the
  Components heading and each component row). Pick the component, weapon or bulkhead and who does the work:
  - Yourself: D10 + your Repair bonus (the pilot's by default). A professional engineer (Repair 5, 7, 9 or 10) rolls
    twice and you choose.
  - Overclocking (the enhancement): pick any positive effect from the component's table, with no fault.
  - All 15 Engineering Tables are in. A natural 1 is Ruined; below 10 is a Malfunction (no change).
  - Applied to the ship: Fleet/Clumsy (Agility), Boosted/Overdrive/Drag (Speed), Awareness (Initiative), Tracking
    (Dogfighting), Accurate (To Hit), Quick Charge (recharge), Extra Bonus (floating bonuses), Hardened/Fragile
    (Strength), Powerful (Shields), Recharger/Extra Cells (Shield Cell Banks), Damage Boost/Steady Mount (weapons).
    Power, range, scan and mining effects are recorded on the component. A chat card shows the roll and what changed.
  - Faults in play: Faulty (50%) and Unreliable (10%) break a component when it's activated (chaff, mines, a Shield
    Cell Bank, or a weapon firing), Burnout does it 10 Damage each use, and Flashpoint makes it fail when the shields
    collapse (or on Hull damage, with no shields).
  - A* grade utility mounts (Magnified): chaff and ECM give +6 Defence, and point defence destroys missiles on 3–10.
- **Ship-launched fighters** (Super Traders Supplement pp.26–30):
  - The F63 Condor, GU-97 Fighter and Taipan, each in the Aegis F, Gelid G, Rogue G and Gelid F loadouts (12 in the
    Ships compendium, Super Traders folder), with fighter weapons and their utility mount. They're a new "Tiny"
    size, and can't suffer critical hits or targeted shots.
  - Hangars: a ship's Fighter Hangars give it Fighter Bays, and a Spaceship Hangar takes a small ship. Drop a
    fighter on the carrier's sheet to dock it; the Specifications tab lists what's aboard.
  - Launch is an Equipment action (one craft a round). The craft appears beside the carrier in the same zone, joins
    the combat and rolls Initiative. Bring it back aboard after the battle.
  - A critical hit on a Fighter Hangar destroys the fighters still in it, and fighters flown remotely go dead; one
    on a Spaceship Hangar does its Strength in Hull damage to the docked ship.
  - The supplement's fighter opponents now take Agility, Speed and size from these fighters.
- Ruling: the Shield Generator table prints no fault for an 11, so there isn't one.

## 0.1.37

Supplements, step 4: the opponents. 68 stat blocks in the Opponents compendium, under a folder per book, then by scale
(Individual, Spaceship, Vehicle) and group.

- **Espionage**: 6 individual (security staff, Spy, Special Agent) and 9 spaceship-scale (mercenaries, a pirate,
  police and security, assassins).
- **Exploration**: 3 alien animals, 5 Relic AI and 5 Tribals; the Relic AI ships (Ghost Sidewinder, Possessed Krait,
  Cyber-Cobra, AspWinder), the Thargoid Invader and Thargon Swarm; and the Pod Shark at vehicle scale.
- **Military**: 6 robots (Sentinel Turret, Death Spider, Eye Bot, Guard Bot, Achilles Combat Android, Dog Mortar) and
  10 spaceship-scale soldiers, criminals and bounty hunters.
- **Super Traders**: 4 pirates; 11 spaceship-scale fighters, pirates and traders; the Kumo Dune Raider and Pirate
  Trash Tank at vehicle scale.
- Weapons come from the compendiums where they exist, at each stat block's To Hit; natural attacks are built in. Ships
  take Agility, Speed and size from their supplement ship variant, utility equipment (chaff, point defence, ECM,
  mines, Shield Cell Banks) from the block, and tokens from the token assets. Special rules (verification
  protocols, Thargoid Hearts, swarms, poisons, holograms…) are on each card.
- **Robots**: Relic AI and robots are ticked Robot. Robots and drones are now immune to Toxic damage (the Military
  Sourcebook's Mechanical rule, which the core drones already listed).
- Thargoid weapons and immunity (only AX weapons hurt the hull; no critical hits) are on the card rather than
  automated; the fighters have no Agility or Speed until ship-launched fighters arrive in step 5.

## 0.1.36

Supplements, step 3: the 56 ship variants, in the Ships compendium under a folder per book with a folder per ship.

- **Espionage**: Mamba Mk II, Merlin, Mongoose, Viper Mk IV (3 variants each).
- **Exploration**: Asp Scout, Diamondback Explorer, Imperial Explorer.
- **Military**: Federal Assault Ship, Federal Corvette, Federal Dropship, Federal Gunship, Imperial Clipper,
  Imperial Courier, Imperial Cutter (3 each), Imperial Eagle (4).
- **Super Traders**: Boa Mk III, Keelback (3 each), Cobra Mk IV (4).
- Each has its weapons, components (with strengths), utility equipment (chaff, point defence, ECM, mines, Shield Cell
  Banks, floating bonuses), Bonuses line, cargo, range, fuel and cost, and a token from the token assets where there
  is one. The Imperial Explorer and Boa Mk III have no token art yet.
- **Huge ships**: a new size for the Boa Mk III and Imperial Explorer (4×4 tokens). The book doesn't give their Chicken,
  Ram or cargo-scatter values, so they continue the size steps: 100, 40 and 4D10.
- Several mine launchers on one ship pool their mines.
- Fixes to the core ships: seven A-grade Power Distributors whose line wrapped in the book had Strength 10 instead of
  their real value (e.g. Viper Mk III – Damask Rose 55, Fer-de-Lance – A9 Excalibur 70). Weapon names are spelt one
  way (Multi-Cannon, Gimballed, Rail Gun).
- Hull and Shields boxes fit four-figure values.

## 0.1.35

Supplements, step 2: equipment and weapons. Each book's items are in its own folder in the Weapons, Armour,
Cybernetics and Equipment compendiums.

- **Weapons**:
  - Espionage: Heavy Pistol and four rare heavy pistols (the Leonis Hacker Pistol also adds +10 Computer and Security
    while equipped).
  - Military: Laser Carbine and three rare carbines; Rail Rifle and three rare rail rifles.
  - Exploration: the six Guardian Anti-Material Projectors, the Nausea Globe, and the Destabilisation Beam (a ship
    weapon you drag onto a spaceship).
- **Armour**: Enhanced Bullet Proof, Reflec and Stab Vests.
- **Cybernetics**: Brute Hacker (Class 1–3) and Venomous Bite (Class 1–2). Cybernetics can now carry bonuses to Skill
  checks, like gear.
- **Equipment**: Assistant and Autonomous Computer/Security Hacks, illegal cosmetics (Death Musk, Disruptive Perfume,
  Face Mask, Venomous Lipstick), Holo-Cloak, Mag Grapple, Personal Shield Generators (A–E), Charged Particle Shields,
  Cellular Regeneration Emitter, Shield Reconstructor and Alien Power Cells. New equipment kinds: Hacks, Personal
  Shields, Alien Artefacts.
- **Automated**:
  - Laser carbines: the base damage is Energy and the Burst Kinetic, and armour absorbs each separately (one Hardened
    roll per piece of armour). Matches the book's worked example.
  - Voltigen Armour Piercing Carbine: Kinetic armour doesn't absorb its damage.
  - Anti-Material Projectors: armour gives no protection against the hit, and is marked Destroyed (an Armoured
    Carapace too) until repaired. Opponents have a new Robot box (ticked for the drones), and robots take double
    damage.
  - Rail rifles' molten munitions: each damage die showing a 1 adds 1D10 Energy damage, rolled at the start of the
    target's next turn.
  - Personal shields: while switched on, they take the damage first (only the types they block), recharge at the
    start of the wearer's turn, charge back to half strength after being knocked down, and switch off when the
    battery or power cell runs out. The shield's value is shown and editable in the gear list.
  - Cellular Regeneration Emitter: heals 10 at the start of the wearer's turn while it has power.
  - Destabilisation Beam: a hit collapses the shields and the Damage goes to the Hull; a ship also takes it on every
    Fixed and Internal component (and its weapons and utility mounts on a critical hit); a vehicle is disabled.
- New Skill-check conditions: opening locks, brute hacking, impersonating. The Survivalist bonus now has a label.
- Rulings: an Anti-Material Projector's hit is taken without armour (the armour is destroyed by it). The Personal
  Shield Generator blocks every damage type except Toxic; the Charged Particle Shield only Energy and Kinetic.

## 0.1.34

Supplements, step 1: character options from the Espionage Supplement, Exploration Supplement, Military Sourcebook and
Super Traders Supplement.

- **Backgrounds** (14), each worth one background choice:
  - Espionage: Wage Slave, Insurgent, Corporate Security.
  - Exploration: Big Game Hunter, Castaway (with Survivalist), Xenobiologist.
  - Military: Federal Reservist, Slave Soldier, Military Courier, Drone Controller (starts with a T-90 Patrol
    Drone; the card carries the drone ownership, control and buying rules).
  - Super Traders: Disgraced Banker, Labour Slave (with Strong and Tough), Pit Fighter, Smuggler.
- **Enhancements** (3):
  - **Survivalist**: the skill check dialog offers your Survival bonus as an optional bonus on non-combat checks.
  - **Vengeful**: the damage card flags when an enemy attack drops you to 1–9 Endurance, so you can attack back.
  - **Overclocking**: rules text for now; it will plug into ship engineering when that's added.
- **Karma Capabilities** (16), used and paid for like the core ones (effects applied at the table):
  - Espionage: Follow Up, Kiss, Kiss, Bang, Bang, Quick Loader, Weak Point.
  - Exploration: Hunter, Iron Willed, Concentration, Don't Give Out on Me Yet!
  - Military: 3D Thinking, Drill Sergeant, Instinct, Penetrating Shot.
  - Super Traders: Burnout, Rapid Deployment, Secret Markets, Terrain Breaking.
- The Backgrounds, Enhancements and Karma Capabilities compendiums are now organised into a folder per book (Core
  Rules plus each supplement).
- The Xenobiologist's "Planetary Systems +10" (not a skill) is read as Planetary Knowledge +10.

## 0.1.33

Sheet layout fixes.

- **Hull and Shields** boxes on vehicle and ship sheets fit up to four digits (e.g. an Anaconda's 1,725 Hull). The
  Shields box now puts Recharge and the Down checkbox under the value instead of beside it.
- The ship header's **Landing Pad** field is wide enough for "Small", "Medium" or "Large".
- **Weapon names** wrap inside their column instead of running into the To Hit column, on vehicle and ship sheets
  and on the character sheet's weapon tables. The name column on craft sheets is also wider.

## 0.1.32

- Fixed "category: small,small is not a valid choice" when editing a spaceship (e.g. choosing a pilot). The ship sheet
  had a size selector in the header as well as on the Specifications tab, so the form sent the value twice; the
  header copy is removed (size stays on the Specifications tab). The vehicle, ship, actor and item sheets were checked
  for any other repeated form fields.

## 0.1.31

- Fixed vehicle and spaceship tokens failing data preparation ("Cannot read properties of undefined (reading
  'defence')"). Foundry asks for roll data while applying Active Effects, before derived data is prepared, and the
  Speed Table row didn't exist yet.
  - The combat values (Speed Table row, top speed, shield halfway point, ship damage states) are now prepared in the
    base phase as well.
  - Roll data prepares them on demand if needed.
- Fixed "speed: must be a number" when a combat started: the battle-start speed is now always a valid number.

## 0.1.30

Full individual-scale opponent compendium (Core Rules pp.284–319).

- The Opponents compendium now has all **51 individual-scale opponents**, in an *Individual-Scale Opponents* folder
  with subfolders: Soldier & Mercenary (10), Criminal (8), Police & Security (5), Assassin (6), Alien Animal (10),
  Biomod (6) and Drone (6). These replace the five earlier samples, which are all in the list.
- Each has:
  - Rank and role (High Threat noted), Dodge, Parry, Initiative, Perception, Endurance, Speed, To Hit, other skills
    and equipment.
  - Worn armour with its listed Absorb values and Hardened rating.
  - Its attacks: compendium weapons at the opponent's listed To Hit (with its damage, Burst, ammo and Finesse
    where the stat block differs), or natural and custom attacks built from the stat block. That includes ranges,
    Burst, blast radii, shotgun range damage, toxic attacks and halved bites.
  - Its listed Karma Capabilities, with uses per battle.
  - Special rules as short, rules-only notes; the book's descriptive text is left out.
- A plain "Fighting … 1D10/2" entry uses the sheet's built-in Fighting attack. Its bonus is recorded as a Fighting
  skill when it differs from To Hit −1.
- The stat blocks were extracted into tools/opponents-data.json; tools/opponents.py builds the pack from it.

## 0.1.29

Spaceship combat, step 3: the Ships compendium and GM opponent craft.

- New **Ships** compendium: all 63 ship variants from the Spaceships chapter, in a folder per ship family (Adder to
  Vulture). Each one has:
  - Agility, Speed, Hull, Shields and size, plus manufacturer, dimensions, landing pad, crew, passengers, cargo,
    range, fuel and cost.
  - Every weapon, with Accuracy, Damage, Burst, Ammo, damage against shields, and the +5 vs Shields (lasers) or +5 vs
    Hull (cannons) markers.
  - The full component roster in book order (fixed components, utility mounts, internal components) with strengths,
    so critical hits land on the right component.
  - Equipment: chaff, point defence, ECM, Shield Cell Banks (boost and duration) and floating bonuses.
  - The Bonuses line as new To Hit / Initiative / Dogfighting bonus fields (on the Specifications tab), plus the
    shield recharge bonus. Agility and Speed are already in the ratings.
  - A token from the uploaded ship art, sized 1/2/3 grid squares for small/medium/large ships. Pirate- and
    police-flavoured variants get the matching art.
- **Opponents compendium**: a *Spaceship-Scale Opponents* folder with the 38 GM ships, by Soldier & Mercenary,
  Criminal, Police & Security and Assassin.
  - Each has its fixed Defence, Dogfighting, Pursuit, Initiative, Critical, Hull, Shields, recharge and Shield Cell
    Bank, weapons at their listed To Hit, and utility equipment.
  - Agility, Speed, size and token come from the matching ship variant.
- *Vehicle-Scale Opponents* folder: the Corporate Tank and the Brazen Assassin (light tanks with fixed stat blocks;
  speed tables and tokens from the Vehicles compendium).
- The Pirate Lord's stat block prints "Agility 17" where every other block has Defence; it's read as Defence 17.

## 0.1.28

Spaceship combat, step 2: components, critical hits and equipment (Core Rules pp.65–71, 197–198, 214).

- **Components** editor on the ship's Specifications tab: name, type, strength and notes, in roster order. The Data
  Sheet tab shows each component's strength, with destroyed ones struck through.
- **Critical hits**: a natural 10 that hits a ship whose shields were down rolls on the Critical Hit Table when the
  damage is applied.
  - Weapon, Utility Mount and Internal Component results roll again for which one: 1–5 count from the top of the
    roster, 6–10 from the bottom.
  - The Damage hits both the Hull and the component. A component that isn't listed yet is added at the ship's
    Critical value, as GM ships use for every component.
  - The card states what a destroyed component does.
  - A destroyed Shield Generator takes the shields down for good, and a destroyed weapon can't fire. The other
    component effects work as in 0.1.27.
- **Targeted shots**: when the target's shields are down, both ships are up-close and the weapon is gimballed, the
  attack dialog offers "Target a component". The target gains +4 Defence, and all the Damage goes to that component,
  not the Hull.
- **Equipment** (Specifications tab to fit; Data Sheet bar to use):
  - **Chaff**: +4 Defence against gimballed weapons and automatic turrets until the next turn.
  - **Mines**: anyone Dogfighting the minelayer must beat the launcher's Difficulty (15), or they lose the Dogfight
    and take the mine's Damage (10).
  - **Point Defence**: automatically rolls against incoming missiles, torpedoes and mines; even shoots them down.
  - **ECM**: +4 Defence against seeker missiles.
  - **Shield Cell Banks**: one running at a time. Each adds its boost immediately and for its remaining rounds, with
    three uses per bank.
  - **Floating bonuses**: engines +1 Agility, weapons +1 To Hit, shields +5 recharge; one per area, kept until
    changed.
  - Ammo is tracked for each item; chaff and mines expire at the start of the ship's next turn.
- Ship attack cards now say "Spaceship Weapons" (or "Listed To Hit" for GM ships).

## 0.1.27

Spaceship combat, step 1 (Core Rules pp.63–71).

- New **Spaceship** actor type, using the vehicle sheet:
  - Agility, Speed (a fixed rating, with no Speed Table), landing pad, size, range, fuel and utility mounts.
  - Crew use Spaceship Piloting and Spaceship Weapons. Defence = Agility + Piloting; Pursuit = Speed + ½ Piloting.
  - **GM opponent stat block** option: fixed Defence, Dogfighting, Pursuit, Initiative and Critical value, with each
    weapon's Accuracy holding its listed To Hit.
- **Combat turn** for ships: no speed changes or obstacle checks; shields recharge as before.
  - At-distance: Joust, Snipe, Strafe, Chicken, Flee, Pass.
  - Up-close: **Dogfight** (rolled with the Dogfighting score for GM ships), Broadsides, **Flight Assist Off** (fire
    until a miss; no Agility in Defence until the next turn), Ram, Disengage, Pass.
  - **Chicken** collision: each ship inflicts 25/50/75 by its size on the other; speeds are unchanged.
  - **Ram**: 10/20/30 by the rammer's size, half to the rammer; a glance is 5 each. A ship rammed by one its size
    or larger spins out of control and can't start a Dogfight in its next turn.
  - **Small ships fix their turrets forwards** when Jousting, Sniping, Strafing or winning a Dogfight, firing them
    with the pilot's Spaceship Weapons.
- **Damaged components** (strength 0, stored on the ship; editing comes in step 2):
  - Destroyed Power Plant or Thrusters: immobilised, Defence 0, no actions.
  - Destroyed FSD: can't Flee.
  - Destroyed Power Distributor: −1 Agility and To Hit (−2 for GM ships), and no shield recharge.
  - Destroyed Sensors: −1 Defence.
- **Ship destruction**: everyone aboard dies unless the pilot makes an emergency eject (button: Systems, Difficulty
  12) or uses Escape Death. 1D10/2D10/3D10 cargo canisters scatter, by size.

## 0.1.26

- Ram card: a flying bomb (Stinger-2) that rams successfully now reads "rams … for X Damage and explodes, destroying
  itself" instead of "takes 0 itself".

## 0.1.25

Vehicle destruction, rescue and vehicle-scale drones (Core Rules pp.75, 318–319).

- **Destruction**: when a vehicle's Hull drops to 0 or less (by any route, including editing the sheet), it stops, its
  token gets the dead overlay, its combatants are marked defeated, and a card lists the crew caught in the wreck (pilot
  and turret gunners).
  - Each crew member gets a button to roll **4D10 Endurance Damage**. This posts an ordinary damage card aimed at them,
    so it is applied (and Escape Death used) as normal; armour doesn't help.
  - NPC crew are flagged as generally going down with the vehicle (GM's call).
  - Destroyed vehicles can't act and are skipped at turn start; raising the Hull repairs them.
- **Rescue**: a new action, shown while someone on the scene is stranded. The vehicle must be at Speed 0; choose the
  wreck and who to pick up. The wreck's stranded list shows on its sheet.
- **Drones**: a Drone section on the Specifications tab.
  - A drone has no crew: fixed Defence (+ speed bonus), Initiative and Pursuit (speed + bonus). Each weapon's
    Accuracy holds the listed To Hit.
  - **Flying**: no obstacle checks, and fixed-mount vehicle weapons refuse to target it.
  - **Flying bomb**: extra Damage when its Ram or Chicken connects (the lower figure if the target's shields are still
    up after the impact). The bomb is destroyed, and a Chicken victim isn't stopped dead.
- **Opponents compendium**: a new *Vehicle-Scale Drones* folder with the S4 Sentry, S5LM Guardian, Stinger-2 Attack
  and S9 Goliath skimmers, using the red skimmer tokens.

## 0.1.24

Vehicle combat turn (Core Rules pp.65–68, 72–75).

- **Combat panel** on the vehicle sheet: speed range for the turn, state chips (Fleeing, Disengaging, Sniping, Rammed,
  No action, Re-roll, Escaped) and the combat actions open in the vehicle's zone. GM tools: start turn, check
  obstacles, reset combat state. Forward Ram checkbox on the Specifications tab (set on the Federal Ram Raider).
- **Battle start**: vehicles begin at-distance at Speed 5 (or their maximum, if lower) unless already moving.
- **Turn start** (automatic when the combat tracker reaches a vehicle):
  - Fleeing vehicles escape; Disengaging ones move at-distance.
  - A vehicle up-close with no enemies up-close moves at-distance.
  - Sniping, Ram and lost-action effects end.
  - Shields recharge, or charge up while down and come back online at half.
  - A card offers the GM an obstacle check.
- **Speed**: during its turn a vehicle's speed can only change within Accelerate/Decelerate of its starting speed
  (out-of-range cells are greyed). In combat it is locked outside the vehicle's turn (the GM can still change it).
- **Obstacles**: the GM picks the Light/Medium/Heavy table and the planet's gravity (both remembered), then rolls or
  picks the result.
  - Rough terrain and large obstructions call for a Vehicle Piloting + Agility check at twice the speed. Failure
    means 5 or 10 Damage per speed point (an obstruction also stops the vehicle dead) and no action.
  - Sudden slopes follow the gravity table: safe, risky (DN 8), or launched (DN 12, Damage on a failed landing, the
    action lost either way).
- **Actions**:
  - **Joust**: fires everything. It moves up-close and drags a Sniping target with it. Against a Fleeing vehicle it
    starts a Pursuit first.
  - **Snipe**: +1 To Hit, but Defence 0 until the next turn; anyone firing at a Sniping vehicle hits automatically.
  - **Strafe**: fires weapons until one misses, then moves up-close and Disengages.
  - **Chicken**: needs higher Pursuit. Both sides choose impact or evade, and the target's controller answers on the
    chat card. A collision deals 5 × the combined speed to each vehicle and stops both; the winner of a swerve Tails
    at +2.
  - **Tail**: D10 + Defence each. The winner fires everything and the loser can return one turret's fire; a draw
    gives each a single turret. Against a Disengaging vehicle it starts a Pursuit first.
  - **Broadsides**: fires turrets until one misses.
  - **Ram**: rolled against the better of the target's Defence and Pursuit. A hit deals 10 per speed point, half to
    the rammer (none with Forward Ram); a draw sideswipes both for 5 per speed point. Any vehicle damaged loses its
    Agility from Defence until its next turn.
  - **Flee**, **Disengage**, **Pass** (re-roll tracked until the end of the next turn).
- **Pursuits**: D10 + Pursuit each, with the book's win, lose and tie outcomes for fleeing and disengaging vehicles.
- **Zones**: on the combat maps, actions move tokens into or out of the up-close circle; elsewhere the sheet's zone is
  updated.
- Actions on vehicles you don't own (damage, zone moves, chat updates) go through the GM.

## 0.1.23

- Vehicles compendium: each Scarab SRV variant now has its own token colour (Surveyor yellow, Interceptor red, Ranger
  green, Prowler purple). The Barracuda variants, Eranin Missile Tank, Federal Ram Raider, Imperial Avenger and
  Longhaul Truck still have no matching token art.

## 0.1.22

- The **Vehicle Combat Map** and **Space Combat Map** scenes are now added to every world automatically (new or
  existing) the first time the GM loads it with this version, in an "Elite: Dangerous RPG" scene folder, and appear in
  the scene navigation bar. Skipped if the world already has them; runs once, so deleted scenes don't come back.

## 0.1.21

- Swapped the artwork: the wide banner is now the system background and setup image, and the square cover art is the Landing scene (resized to 2481×2475).

## 0.1.20

- System artwork: the square cover is now the system's background image (world tiles on the setup screen and the join screen) and its cover media; the wide banner is the setup-screen media.
- New **Landing** scene in the "Scenes & Combat Maps" compendium (renamed from "Combat Maps"), using the banner art.
- On a brand-new world with no scenes, the GM's first load imports the Landing scene and activates it, so it's what players see when they join. This happens once per world; delete or replace it freely.

## 0.1.19
- **Assets**: the EDRPG combat maps (`assets/maps`) and 178 top-down ship and vehicle tokens (`assets/tokens/<group>`:
  Combat, Explorer, Fighter, Pirate, Empire, Federation, Police, Transport, Passenger, Skimmer, Thargoid, Vehicles),
  converted to WebP.
- New compendium **Combat Maps**: premade *Vehicle Combat Map* and *Space Combat Map* scenes (gridless zone maps:
  up-close inside the circle, at-distance outside). Each scene records its up-close circle, so tokens on it know
  which zone they're in.
- **Vehicles, step 1** (Core Rules pp.71–75, 220–235):
  - New **Vehicle** actor with a sheet laid out like the Vehicle Data Sheet (p.363): model, pilot, Agility / Max
    Speed / Accelerate / Decelerate, Defence, Initiative and Pursuit, Hull, Shields (recharge, down/charging), a
    weapons table and the Speed Table (click a speed to set it). A Specifications tab holds the stat-block details,
    an editable Speed Table and notes.
  - Crew: drag a character (or opponent) onto the sheet, or pick one, as pilot: their Vehicle Piloting gives Defence
    (Agility + Piloting + speed bonus; 0 when stationary) and Pursuit (½ Piloting + Speed), Tactics gives Initiative,
    Vehicle Weapons fires fixed and gimballed weapons. Turrets take a gunner, or fire automatically at bonus 3.
  - New **Vehicle/Ship Weapon** item: mount size and kind, Accuracy, damage, Burst maximum, damage vs Shields,
    bonuses vs Hull / Shields, ammo, special.
  - Clicking a weapon fires it: D10 + gunnery + Accuracy + the speed's Attack penalty against the targeted vehicle's
    Defence, Burst damage, ammo spent; the card applies damage to the target (or selected vehicles): Shields first,
    the excess to the Hull, with the bonuses vs Shields and Hull. Hull 0 or less is marked destroyed.
  - New compendium **Vehicles**: all 22 vehicles and variants with their weapons and Speed Tables; vehicles with a
    matching token (Scarab, Garriot Quadbike, Battlecar, APC, Light Tank) use it.

## 0.1.18
- Partners can chain **three** deep, as in the book: a partner (Endurance −5), their partner (−10) and their partner
  (−15). Only the third is refused the Partner background. Every partner in the chain uses the owning character's
  Karma (and the 30m check is against that character).

## 0.1.17
- **Partners** (Core Rules pp.27–30): a new *Partner* actor type on the character sheet, linked to its host.
  - *Create partner* on the host's Partner background card makes the partner (same folder and permissions as the
    host) and opens it; afterwards the button opens it. A partner's partner is allowed; a partner's partner can't
    have one (the Partner background is refused and gets no button).
  - Three background choices; Pilot Trained isn't free for partners (it uses a choice). No independent learning,
    no Karma points and no Karma Capabilities of their own.
  - Endurance: the host's rank Endurance −5 (−10 for a partner's partner), plus the partner's own Enhancements and
    cybernetics. The host's Enhancements and cybernetics don't count.
  - Karma: the partner's sheet lists the host's capabilities (the original player character's, for a partner's
    partner) with Use buttons that spend the host's Karma, and offers them on attack and damage cards (Duck!, Crack
    Shot, Stay Standing, Escape Death, Riposte). Blocked if the host turns off *My partner may spend my Karma* (in the
    Karma & Endurance window) or the partner has visible cybernetics. If their tokens are more than 30m apart (or
    not both on the scene), the player is asked to confirm the partner can see the host.
  - Rank follows the host: the host's Rank Points are copied to partners, and partners get their own *Rank up*:
    ten Skills +D10 and +5 Endurance, without a Karma point, capability or Enhancement.
  - Cybernetics are fitted against a virtual Karma pool equal to the host's total (shown on the partner's sheet,
    in red if exceeded).
  - Creation checklist for partners: backgrounds (3), open background skills, Enhancements to choose, Skill Cap and
    the personal starting kit (no ship, no ship equipment, no credits).

## 0.1.16
- **Ranking up** (Core Rules pp.49–50). When Rank Points reach a new rank, the Data Sheet shows a *Rank up* banner
  (and End of Adventure opens it straight after improving ticked skills). Ranks are applied one at a time, in order:
  - the Skill Cap, Karma and Endurance maximums follow the rank table as before; the current Karma goes up by 1 and
    Endurance by 5;
  - choose a new **Karma Capability or an Enhancement** — the compendium opens to drag one from;
  - choose **ten different Skills** and roll a D10 for each; nothing goes above the new Skill Cap (Natural Genius and
    per-skill cap changes count). The dialog shows each Skill's score and how much room it has; Skills already at the
    cap can't be picked.
  - A chat card lists the rolls and the new scores.
- The Karma Capability limit now drops by one for every rank-up where an Enhancement was chosen instead.
- Rank-ups are recorded on the character. Existing characters start tracking from their current rank the first
  time their Rank Points go up.
- Fix: positive Social Factor from worn clothing items is now lost when the wearer takes damage (it only checked the
  manual "worn" value).

## 0.1.15
- **Fighting** (Core Rules pp.60–61):
  - Fix: damage is 1D10 halved *rounding up* (it rounded down). A 10 still knocks the target over.
  - Disarm: an even number on the Fighting damage die knocks a weapon or item out of the target's hands (noted on
    the damage card).
  - *Grab instead of hitting* (attack dialog): on a hit, *Resolve the grab* rolls both sides' Athletics plus
    Strength damage bonuses (opponents use a listed Athletics or their To Hit); the grabber must win. Both get the
    Grabbing / Grabbed conditions: Dodge 0 and no Parry against attacks. The condition panel offers *Escape grab*
    (must exceed the grabber's check) and *Release grab*.
  - New Weapons compendium entry: Weapon Butt (rifle or SMG), a club: Finesse 6, 1D10.
- **Counter-attacks**: when a Melee or Fighting attack against you misses and you Parried, the attack card offers
  *Counter-attack* (Fighting or a Melee weapon in hand), aimed back at the attacker. A counter-attack can't be
  countered, except with the Riposte Karma Capability (offered on the card if you have it).
- **Free attacks**: the attack dialog's *Free attack (point blank / running away)* marks the card; if its damage
  knocks the target over, the damage card notes that their turn ends.
- **Aiming**: an Aim button on the condition panel sets the Aiming status; the next attack dialog pre-ticks +5 and
  the attack uses it up. Taking damage cancels it.
- **Combat Stims** (p.130):
  - Stimmed status: you don't fall unconscious at 0 Endurance or below (you still bleed and die as usual).
  - Automatic dispensers fire when you drop: percentile against the injector's score using a carried dose; a 100
    overloads the heart. If it fails, it tries again at the end of each of your turns (in combat), waking you knocked
    over. The result shows on the damage card.
  - *Use Combat Stim* on the condition panel (needs a syringe or injector) and *Stim wears off* (after about an hour;
    unconscious again if at 0 or less).
  - Paranoia Plus gives +10 Dodge score, Brutal Plus gives Strong and Quick Runner while stimmed.
- **Toxin Injectors**: a Fighting hit's damage card offers the injector's extra 1D10 / 2D10 Toxic damage as its own
  damage card (no knockdown), using one of its two uses per day. *Day's rest* recharges per-day cybernetics.

## 0.1.14
- **Explosives with or without a battle map** (Core Rules pp.58–60). New world setting *Explosives: battle map*:
  Ask each time (default), On a battle map, or Without a map.
  - With "Ask", grenade and missile attack dialogs have a *Combat* choice (map / no map) and show only the fields
    that apply. Shift-click rolls leave the choice to the card.
  - Grenade difficulty: on a map, 7 or the number of squares (+2 per interposing cover); without a map, 7 thrown with
    advantage or 12 with disadvantage. Both +2 in zero gravity.
  - **Missed explosives** get a button for each mode allowed (both when it hasn't been chosen):
    *Scatter (map)* rolls the D10 direction (1–8 clockwise from the square above the target, 9–10 overshoots along
    the line of fire) and D10 squares; *Miss table (no map)* rolls the Grenade Miss Table (thrown grenades) or the
    Missile Miss Table (missiles and launchers), including the extra metres. The result is written on the card for
    everyone.
  - A missed explosive can still roll its explosion damage once it has landed, unless the result was a harmless
    "Whoosh!".
  - Without a map, a hit offers *How many are caught?* (D10 halved, rounded up) for when the GM is unsure.

## 0.1.13
- New item types **Cybernetic**, **Clothing** and **Equipment**, each with a compendium (mechanics only; rarity from
  the book's table colours):
  - *Cybernetics* (44, pp.125–127): replacements, Type 1–5 arm and leg upgrades, internals, nervous systems,
    armoured carapaces and eyes, toxin injectors, cyberclaws, retractable pistols and leg jets.
  - *Clothing & Cosmetics* (21 clothes; the 6 rare cosmetics are under Equipment).
  - *Equipment* (55): general gear, Medpacks, repair kits, coms, cosmetics, Combat Stims and injectors, and
    ammunition.
- **Cybernetics are automated** while installed (every cybernetic on a character is installed):
  - Karma drain: each one's Karma cost comes off cybernetic Karma (Cybernetic Affinity) first, then off the Karma
    maximum. Set an upgrade's cost to 0 when it replaces a device you had.
  - Arm upgrades add Fighting and Melee damage (on top of Strong, which keeps its own +10 limit); leg upgrades add
    movement and Resist Knockdown (N): the first N tens on the damage dice are ignored; internals add Endurance
    beyond the natural 80; nervous systems add Dodge and Initiative; eyes add weapon and Perception Skill score;
    armoured carapaces protect like armour.
  - "Maximum 2" and "Requires Arm/Leg Upgrade" are enforced. Cyberclaws and retractable pistols add their weapon
    from the Weapons compendium (two Cyberclaws weapons added there), and remove it with the cybernetic.
  - Any non-Discreet cybernetic makes the cyborg Social Factor (−3) apply automatically.
- **Clothing and equipment feed Social Factor**: worn clothing (positive values lost once damaged), items in use
  (coms, gas mask) and the best applied cosmetic. Confident removes their penalties. The Environment Suit's Toxic
  resistance absorbs Toxic damage.
- **Equipment bonuses on Skill checks**: worn clothing and carried gear can give roll or Skill-score bonuses
  (Studded Thug Outfit +1 Intimidate; Medpacks +2/+4 Medicine; Hacker com +10 Computer when hacking). "Always"
  bonuses are added automatically; the rest are tick boxes in the check dialog, with the best Medpack pre-ticked for
  Stabilise and Treat wounds. They show as their own lines on the chat card.
- **Reloading** uses a matching spare magazine (Autopistol Magazine, Shotgun Shells, missiles …) when one is
  carried.
- Karma & Equipment tab: Clothing (with armour), Equipment (quantity or uses, an "in use" toggle) and Cybernetics
  (Karma cost, effects, Karma drained) sections; pack and ship lists include clothing and equipment. The Karma &
  Endurance window shows what cybernetics take or add.
- Character creation: *Add starting equipment* fills in the p.39 kit from the compendia (pistol choice ×1 or ×2 with
  two magazines for Autopistols, Flight Suit worn, Magnetic Boots, Remlok, hand or wrist com, a melee weapon or
  grenade if your Skill is 20+, a Space Suit (two with a partner), Medpack and repair kit on the ship) plus 1000
  credits.

## 0.1.12
- **Character creation checklist** on new player characters' Data Sheet tab (Core Rules pp.14–39), ticking itself
  off as you go: Harmless rank, background choices (4), open background skills to fill in (Self-Taught, University
  Graduate), Enhancements to choose (Gene Mod Baby, Self-Taught), three Karma Capabilities (Escape Death is extra),
  independent learning, no Skill above the Skill Cap (offending Skills listed), starting equipment and ship (tick
  boxes; the equipment list is in the tooltip).
  - *Independent learning:* a dialog to pick ten Skills in order for +10, +9 … +1, showing each Skill's score
    before the points and warning about anything over the cap. The points count towards Base and appear as their
    own line in each Skill's window.
  - *Finish creation* fills Endurance and Karma to their maximums and hides the checklist (it asks first if steps
    are still open). Existing characters don't get the checklist.

## 0.1.11
- New compendium **Backgrounds**: all 53 from the Core Rules (pp.15–23), including Pilot Trained, with their
  background choices, skill bonuses, granted Enhancements, prerequisites and the D100 random-background range.
  Mechanics only, no flavour text.
  - Backgrounds with open choices have blank skill lines to fill in: Self-Taught (any two Skills +10) and
    University Graduate (one Intelligence Skill +20, two +10). Cyborg, Partner and Gene Mod Baby carry their rule
    as text.
  - Adding a background to a character adds the Enhancements it grants (e.g. Hacker → Natural Genius (Computer))
    from the Enhancements compendium; removing the background removes them. Gene Mod Baby and Self-Taught remind
    you to choose Enhancements.
  - Officer can only be added after Army Trained or Navy Trained. Pilot Trained is refused on player characters,
    who already have it for free.
  - Background items have new fields for the Enhancements they grant, Enhancements to choose and a prerequisite.
- New compendium **Enhancements**: all 10 (p.25), each with an *Effect* the system automates, stacking when taken
  again:
  - Tough: +5 maximum Endurance (natural maximum 80), shown in the Karma & Endurance window.
  - Natural Genius: +10 to one Skill's Skill Cap (max 100), shown in that skill's window.
  - Strong: +2 Fighting and Melee damage (max +10), added on the damage card.
  - Ambidextrous: two-weapon penalty −1, then 0.
  - Awareness: Initiative uses the better of Tactics and Perception.
  - Confident: Social Factor ignores penalties from equipment, armour and cybernetics.
  - Cybernetic Affinity: +2 cybernetic Karma.
  - Hard to Kill: death at minus maximum Endurance; twice, Escape Death costs at most 4 Karma.
  - Quick Runner: +2m Speed (up to three times). Characters' Speed now shows in the Combat tab's condition panel.
  - Dynamic Karma: reminder only.

## 0.1.10
- **Damage.** A hit's attack card gets a *Roll damage* button (attacker or GM). The damage card shows the weapon's
  damage (at the range band rolled for, so shotguns drop to 2D10/1D10), Burst (an extra D10 per point over the
  difficulty, 2D10 for Heavy Burst, 5 points for Energy Burst, up to the weapon's maximum), and halves it for divided
  fire. Every d10 is shown; a 10 knocks the target over — except Energy weapons. Explosives offer their Fatal and
  Injury damage separately and knock everyone over.
- **Applying damage** to the target, or to all selected tokens (blast radius, divided fire). The best worn armour for
  the damage type absorbs; Hardened rolls a D10 and doubles the protection on its number or more; every hit does at
  least 1, except Toxic. The card lists what each target took and their Endurance before and after. Players' clicks
  are carried out by the GM.
- **Conditions** as token status effects: Knocked Over, Unconscious, Bleeding Out, Stabilised, Dead.
  - 0 Endurance (or knocked out by Fighting): unconscious, in no danger. Below 0: bleeding out. Dead at a negative
    score of half maximum Endurance (the combatant is marked defeated).
  - Bleeding out is rolled automatically at the start of the bleeding combatant's turn: lose a D10, odd stabilises,
    even keeps bleeding. Dropped by an Energy weapon: cauterised, so they stabilise unless that roll is a 10.
  - Karma on the damage card: *Stay Standing* cancels the knockdown; *Escape Death* (all Karma) undoes a hit that
    dropped you below 1 Endurance.
  - Starting a turn knocked over pre-ticks the attack dialog's "knocked over" box (no skill bonus).
- **Condition panel** on the Combat tab and the opponent sheet: status chips, the Endurance at which they die, and
  Stand up, Bleeding roll, Stabilise (an ally's Medicine check, difficulty 8 for Energy wounds or 10, with their token
  selected), Treat wounds (Medicine check; heals its total) and Day's rest (+5).
- Karma Capabilities have a "Stops a knockdown" option (set on Stay Standing in the compendium and sample opponents).

## 0.1.9
- **Attack card.** Clicking a weapon (or Fighting) opens an attack dialog and posts a card comparing To Hit with the
  Difficulty, both broken down line by line:
  - Difficulty = range band (or Finesse for melee/Fighting) + the targeted token's Dodge or Parry, +2 if the target is
    in cover (ranged only), plus any GM adjustment. Without a target, type the target's Defence instead. A target
    with no Defence listed (e.g. a drone) can't evade.
  - Grenades: 7 or the number of squares, whichever is greater, +2 per interposing cover, +2 in zero gravity.
    Explosives can be aimed at the ground (3 + range).
  - To Hit options: Aim +5, two weapons −2, knocked over (no skill bonus), a free modifier.
  - Natural 1 always misses, natural 10 always hits. The card shows how far a hit beat the difficulty and the Burst
    damage that earns; Divide Fire, Destroy Cover and explosive notes appear where they apply.
  - One ammo point is spent per ranged attack; an empty weapon refuses to fire.
  - Karma: reroll a natural 1; the attacker's "+N to the attack you just made" capabilities appear while it misses;
    the target's owner gets "+N Defence" capabilities (Duck!, Dive Aside, Last Minute Deflection) while it hits.
    The card updates for everyone (relayed through the GM).
- Karma Capabilities have attack/defence bonus fields (filled in on the compendium entries that grant one) and, on
  opponents, uses per battle (e.g. Dive Aside ×3).
- New compendium **Opponents (sample)**: Army Soldier, Heavy Weapons Support, Borchuck, Junga Pattern Walker Drone and
  Unstoppable Assassin, with their weapons, armour and Karma as items — for testing combat. The full opponent
  list will follow as a content release.

## 0.1.8
- Fix: clicking a weapon's name on the Combat tab (and an opponent's attack) now rolls the attack instead of opening
  the item. The roll uses the weapon's skill — with a rare weapon's Skill score bonus for characters, or the
  weapon's / stat block's To Hit for opponents — and the difficulty starts at the Finesse or the first usable range
  band. Shift-click skips the dialog. A pencil icon (on hover) still opens the weapon.

## 0.1.7
- New **Opponent (stat block)** actor type with a sheet laid out like the Core Rules' opponent boxes (e.g. p.285):
  name and rank/role header; Defence (Dodge/Parry; blank = can't use it), Initiative, Perception, Endurance, Speed,
  To Hit; Armour (worn armour items with absorb and Hardened); Attacks (weapon items written as the book does:
  ranges, To Hit, damage, blast, ammo); Fighting at To Hit −1 unless listed; Other Skills (clickable to roll);
  Karma Capabilities (once per battle, no points); Equipment; Abilities & Notes.
  - Opponents roll skill checks and contests from their stat block (listed skills, Perception, Initiative for
    Tactics, To Hit for weapon skills). Initiative uses their Initiative score. Endurance is a token bar.
  - A weapon on an opponent can override the general To Hit.
  - "NPC (individual scale)" is now labelled "NPC (full character)" for NPCs built like player characters.
- Character sheet: new **Combat** tab holding the Ranged Weapons and Close Combat tables (styled after the printed
  sheet, with the RANGE header), a Protection table of worn armour by damage type, and Combat Karma (personal and
  any-combat capabilities with Use buttons). The Data Sheet tab now holds backgrounds, skills and enhancements.

## 0.1.6
- Weapon and Armour item types (Core Rules ch.5).
  - Weapons: attack skill, damage type, short/medium/long range with difficulty To Hit (or Finesse for melee),
    damage formula with per-range damage (shotguns), Burst / Heavy Burst / energy Burst with maximum, explosive blast
    (Fatal/Injury damage and radii), ammo, One Handed, Destroy Cover, Divide Fire, a rare weapon's Skill score bonus
    (applied only when attacking with it) and skill modifiers while equipped (e.g. Neo-Samurai Sword +10 Parry).
  - Armour: absorb per damage type (incl. "all Toxic"), Hardened, Discreet / worn openly, Social Factor, skill
    modifiers while worn, granted enhancement.
- Worn armour and equipped weapons now feed the character: their skill modifiers appear under Modifiers in the
  skill edit window and change the score; worn armour's Social Factor is added to the Social Factor automatically
  (Confident still ignores the penalties).
- Character sheet: Ranged Weapons and Close Combat tables list carried weapons with To Hit (including a rare weapon's
  bonus), ranges, damage and ammo (edit inline, reload button). Karma & Equipment: Carried Weapons (equipped toggle),
  Clothing (armour, worn toggle), and Pack / Ship storage with a location selector.
- Compendia: Weapons (78, in folders by type) and Armour (10), with stats, costs, rarity (common/rare as in the
  book's green/blue) and mechanics only. Fighting stays built into the sheet.

## 0.1.5
- Fix: Dice So Nice now animates contested checks — the opening roll is attached to the card, and the opponent's roll
  and Karma rerolls are shown through Dice So Nice before the card updates (a hidden opponent's dice show to GMs only).
- Cleanup: removed 22 unused Exo 2 font files (only weights 400–800 are used), the empty FUNDING.yml, unused
  language keys (old tab names, Empire/Federation honorary ranks, which aren't in the Core Rules, etc.) and dead
  code; replaced the inherited .editorconfig (CRLF/JetBrains settings) with a short LF one; LevelDB LOG/LOCK files
  are no longer committed.

## 0.1.4
- Karma Capabilities compendium: all 40 capabilities from the Core Rules (pp.31–36) with name, cost, list
  (Defensive / Offensive / Skill-based & Other), where they're used, and prerequisite/effect mechanics in our own
  words. No flavour text. Escape Death is included (free, costs all Karma).
- Use button on each capability: spends the cost from current Karma and posts the effect to chat. Escape Death spends
  all Karma and can't be used at 0. Disabled when you can't afford it.
- Once per turn: in a started combat a used capability is marked "Used" until the start of that character's next turn
  (cleared automatically by the GM's client), and all marks clear when the combat is deleted.
- Rest +1 (Karma Capabilities header): a main rest regains 1 Karma.
- End of Adventure also offers to restore all Karma for the next adventure, and is always available.
- Karma Capability items have a List field (Defensive/Offensive/Other), a "costs all Karma" option and a new
  "Vehicle or Spaceship Combat" category; the sheet groups capabilities by list.
- Fix: contested checks allow repeated Karma rerolls of a natural 1, as the rules permit.
- Build tooling: `npm run packs` compiles `packs/_source` into the LevelDB packs (`tools/karma-capabilities.py`
  regenerates the capability source).

## 0.1.3
- Skill check dialog: the difficulty presets are gone. The GM types the difficulty; the box is pre-filled with the
  world default (9) and selected, so typing replaces it.
- Contested checks: choose "Against: Targeted …" or "Other opponent" in the skill dialog.
  - The acting character rolls straight away; the opponent's controller (the GM for a typed-in opponent) clicks Roll
    on the card. Opponents without the skill can use a flat bonus (e.g. Perception or To Hit from a stat block).
  - Natural 1 always loses, natural 10 always wins; if both roll the same natural, the totals decide.
  - Ties follow the book's two patterns: when the opponent's roll sets the difficulty (Stealth vs Perception p.267,
    Charm vs Insight p.33) ties go to the acting character; in a roll-off (Grab/Escape p.61) ties go to the opponent.
    Pairings and tie rule are pre-selected and can be changed.
  - The opponent's roll can be hidden from players (default for Stealth); the GM still sees it.
  - Each side can spend Karma to reroll a natural 1.
  - Players' rolls reach the card through the active GM (`socket: true`), so a GM must be logged in.
- Rolling a skill now ticks it as used (Core Rules p.43).

## 0.1.2
- End of Adventure button (Data Sheet tab, above the skills): every ticked skill gains +1 Learn unless that would
  take Base + Learn over the Skill Cap, then all ticks are cleared. Shows a confirmation listing the changes and posts
  a summary to chat. Also available as `game.edrpg.endAdventure(actor)` for macros.

## 0.1.1
- Social Factor: added to Bargain, Bluff, Charm and Diplomacy rolls as a roll bonus (not a Skill score change).
  - Sources (clothing/armour/equipment, cosmetics, other) are edited from the "SocFac" chip on the Social Skills header.
  - Positive clothing bonus is lost when the character takes damage (flagged automatically when Endurance drops).
  - Revealed cyborgs have a fixed −3; the Confident enhancement removes equipment penalties.
  - The skill check dialog has an "Apply Social Factor" toggle; the chat card shows the bonus.
  - The `socialFactorCap` setting is now an optional house rule and defaults to 0 (no cap), as in the Core Rules.
- Social skills show the Social Factor next to their bonus.

## 0.1.0
- Rebuilt for Foundry VTT v14: ApplicationV2 sheets, data models for every document type, no build step.
- Character sheet laid out after the official data sheet; skill Learn/modifiers/cap adjustments in an edit window.
- Skill checks with the rule of 1 and 10, Karma reroll, initiative, Fighting attack and damage.
