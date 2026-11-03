"""
Source data for the Cybernetics, Clothing and Equipment compendia (Core Rules pp.123-133).

Names, costs and game mechanics only; flavour text is left out. Rarity follows the book's table colours (green
common, blue rare). Run `python3 tools/gear.py`, then `npm run packs`.
"""
import hashlib, json, os, re

HERE = os.path.dirname(__file__)
C, R = "common", "rare"
DMG = ["kinetic", "energy", "explosive", "fighting", "melee", "toxic"]


def doc_id(kind, name):
    return hashlib.sha1(f"edrpg-{kind}-{name}".encode()).hexdigest()[:16]


# ---------------------------------------------------------------- Cybernetics (pp.125-127)

def cyber(name, karma, cost, rarity, *, discreet=False, max_installed=None, requires="", damage=0, speed=0,
          resist=0, endurance=0, initiative=0, mods=None, absorb=None, toxic_all=False, hardened=None,
          space_suit=False, weapon="", notes="", group="", fighting="", uses=None, bonuses=None, source=""):
    return dict(name=name, karma=karma, cost=cost, rarity=rarity, discreet=discreet, max=max_installed, fighting=fighting, uses=uses,
                bonuses=bonuses or [], source=source,
                requires=requires, damage=damage, speed=speed, resist=resist, endurance=endurance,
                initiative=initiative, mods=mods or [], absorb=absorb or {}, toxic_all=toxic_all, hardened=hardened,
                space_suit=space_suit, weapon=weapon, notes=notes, group=group)


ARM_COST = ["30,000cr", "312,000cr", "1,042,000cr", "4,700,000cr", "12,050,000cr"]
LEG_COST = ["40,000cr", "235,000cr", "903,000cr", "3,650,000cr", "8,750,000cr"]
INT_COST = ["50,000cr", "720,000cr", "2,310,000cr", "6,600,000cr", "18,500,000cr"]
NERVE_COST = ["50,000cr", "690,000cr", "2,100,000cr", "6,000,000cr", "17,900,000cr"]
EYE_COST = ["20,000cr", "120,500cr", "1,100,000cr", "2,200,000cr", "5,500,000cr"]
CARAPACE = [
    ("40,000cr", {"kinetic": 4, "energy": 2, "explosive": 4, "fighting": 2, "melee": 2}, False, 9),
    ("242,000cr", {"kinetic": 5, "energy": 3, "explosive": 5, "fighting": 3, "melee": 3}, False, 8),
    ("2,880,000cr", {"kinetic": 6, "energy": 5, "explosive": 10, "fighting": 4, "melee": 4}, True, 7),
    ("8,200,000cr", {"kinetic": 8, "energy": 6, "explosive": 12, "fighting": 5, "melee": 5}, True, 6),
    ("50,300,000cr", {"kinetic": 10, "energy": 7, "explosive": 15, "fighting": 6, "melee": 6}, True, 5),
]
rare_from = lambda t, n: R if t >= n else C  # Types 4-5 (and some add-ons) are rare.

CYBERNETICS = [
    cyber("Replacement Organ", 1, "3,000cr", C, discreet=True, notes="Replaces a damaged or missing heart, lungs, eyes, kidneys, etc.", group="Replacements"),
    cyber("Replacement Cybernetic Arm", 3, "6,000cr", C, discreet=True, max_installed=2, notes="Replaces your existing arm.", group="Replacements"),
    cyber("Replacement Cybernetic Leg", 2, "7,000cr", C, discreet=True, max_installed=2, notes="Replaces your existing leg.", group="Replacements"),
]
for t in range(1, 6):
    CYBERNETICS.append(cyber(f"Type {t} Arm Upgrade", 3, ARM_COST[t - 1], rare_from(t, 4), max_installed=2, damage=2 * t,
                             notes=f"Replaces your existing arm. Carrying capacity +{20 * t}kg.", group="Arm Upgrades"))
for t, resist in zip(range(1, 6), [0, 1, 1, 2, 3]):
    CYBERNETICS.append(cyber(f"Type {t} Leg Upgrade", 4, LEG_COST[t - 1], rare_from(t, 4), speed=2 * t, resist=resist,
                             notes="Replaces both legs.", group="Leg Upgrades"))
for t in range(1, 6):
    CYBERNETICS.append(cyber(f"Type {t} Replacement Internals", 5, INT_COST[t - 1], rare_from(t, 4), discreet=t <= 3,
                             endurance=10 * t, notes="Replaces ribcage and essential torso organs with armoured components.",
                             group="Replacement Internals"))
for t, init in zip(range(1, 6), [0, 1, 1, 2, 3]):
    CYBERNETICS.append(cyber(f"Type {t} Replacement Nervous System", 5, NERVE_COST[t - 1], rare_from(t, 4), initiative=init,
                             mods=[("dodge", 5 * t)], notes="Replaces spinal cord and primary nerve endings.",
                             group="Replacement Nervous Systems"))
for t, (cost, absorb, toxic, hard) in enumerate(CARAPACE, 1):
    notes = "Can no longer wear clothes or other armour."
    if t >= 3:
        notes += " Counts as a space suit: 8 hours of air."
    CYBERNETICS.append(cyber(f"Type {t} Armoured Carapace", 4, cost, rare_from(t, 4), absorb=absorb, toxic_all=toxic,
                             hardened=hard, space_suit=t >= 3, notes=notes, group="Armoured Carapaces"))
for t in range(1, 6):
    CYBERNETICS.append(cyber(f"Type {t} Cybernetic Eyes", 2, EYE_COST[t - 1], rare_from(t, 4),
                             mods=[("kineticWeapons", 5 * t), ("energyWeapons", 5 * t), ("heavyWeapons", 5 * t), ("perception", 5 * t)],
                             notes="Replaces eyes.", group="Cybernetic Eyes"))
CYBERNETICS += [
    cyber("Class 1 Toxin Injector", 1, "10,000cr", C, requires="Arm Upgrade", fighting="1d10", uses=2,
          notes="When Fighting, inflict an extra 1D10 Toxic damage. Twice per day.", group="Arm Add-ons"),
    cyber("Class 2 Toxin Injector", 1, "189,000cr", R, requires="Arm Upgrade", fighting="2d10", uses=2,
          notes="When Fighting, inflict an extra 2D10 Toxic damage. Twice per day.", group="Arm Add-ons"),
    cyber("Class 1 Cyberclaws", 2, "20,000cr", C, requires="Arm Upgrade", weapon="Cyberclaws (Class 1)",
          notes="Cyberclaw Melee attack: Finesse 6, 2D10.", group="Arm Add-ons"),
    cyber("Class 2 Cyberclaws", 2, "300,000cr", R, requires="Arm Upgrade", weapon="Cyberclaws (Class 2)",
          notes="Cyberclaw Melee attack: Finesse 6, 3D10.", group="Arm Add-ons"),
    cyber("Class 1 Retractable Laser Pistol", 2, "20,000cr", C, requires="Arm Upgrade", weapon="Laser Pistol",
          notes="Hidden Laser Pistol in the arm.", group="Arm Add-ons"),
    cyber("Class 2 Retractable Laser Pistol", 2, "500,000cr", R, requires="Arm Upgrade", weapon="CS1 Burst Pistol",
          notes="Hidden CS1 Burst Pistol in the arm.", group="Arm Add-ons"),
    cyber("Class 3 Retractable Laser Pistol", 2, "4,000,000cr", R, requires="Arm Upgrade", weapon="Magnetising Hotshot Laserpistol",
          notes="Hidden Magnetising Hotshot Laserpistol in the arm.", group="Arm Add-ons"),
    cyber("Class 1 Leg Jets", 2, "20,000cr", C, requires="Leg Upgrade", notes="Fly 20 metres instead of moving. Once per hour.", group="Leg Add-ons"),
    cyber("Class 2 Leg Jets", 2, "124,000cr", C, requires="Leg Upgrade", notes="Fly 20 metres instead of moving. Twice per hour.", group="Leg Add-ons"),
    cyber("Class 3 Leg Jets", 2, "1,890,000cr", R, requires="Leg Upgrade", notes="Fly 30 metres instead of moving. Three times per hour.", group="Leg Add-ons"),
    cyber("Class 4 Leg Jets", 2, "5,000,000cr", R, requires="Leg Upgrade", notes="Fly 30 metres instead of moving. Unlimited use.", group="Leg Add-ons"),
]


def cyber_doc(c, sort):
    html = (f"<p>{c['notes']}</p>" if c["notes"] else "") + (f"<p><em>{c['source']}</em></p>" if c.get("source") else "")
    return {
        "name": c["name"], "type": "cybernetic", "img": "icons/svg/circle.svg",
        "system": {
            "description": html, "cost": c["cost"], "rarity": c["rarity"],
            "location": "carried", "karmaCost": c["karma"], "discreet": c["discreet"], "maxInstalled": c["max"],
            "requires": c["requires"], "damageBonus": c["damage"], "speedBonus": c["speed"],
            "resistKnockdown": c["resist"], "enduranceBonus": c["endurance"], "initiativeBonus": c["initiative"],
            "skillMods": [{"skill": s, "value": v} for s, v in c["mods"]],
            "absorb": {t: c["absorb"].get(t, 0) for t in DMG}, "toxicAll": c["toxic_all"], "hardened": c["hardened"],
            "spaceSuit": c["space_suit"], "grantsWeapon": c["weapon"], "notes": c["notes"],
            "fightingDamage": c["fighting"], "fightingDamageType": "toxic", "uses": {"value": c["uses"], "max": c["uses"]},
            "rollBonuses": c.get("bonuses", []), "destroyed": False,
        },
        "flags": {"edrpg": {"group": c["group"]}}, "sort": sort,
    }


# ---------------------------------------------------------------- Clothing & cosmetics (p.131)

def B(skill, value, kind="roll", when="always"):
    return {"skill": skill, "value": value, "kind": kind, "when": when}


# (name, SF, cost, rarity, options)
CLOTHING = [
    ("Casual Clothes", 0, "1cr", C, {}),
    ("Work Overalls", -1, "2cr", C, {}),
    ("Military Fatigues", 0, "5cr", C, {"notes": "Lots of pockets for ammunition."}),
    ("Arctic Clothes", -2, "20cr", C, {"notes": "Keeps you warm below zero."}),
    ("Environment Suit", -3, "30cr", C, {"toxic": 20, "notes": "Toxic resistance 20. Includes breathing equipment."}),
    ("Business Suit", 0, "10cr", C, {}),
    ("Tailored Business Suit", 1, "100cr", C, {}),
    ("Flight Suit", 0, "5cr", C, {"notes": "Temporary protection in a vacuum. Includes Magnetic Boots."}),
    ("Skin Tight Flight Suit", 1, "200cr", C, {}),
    ("Space Suit", -2, "10cr", C, {"space": True, "notes": "For long-term work in space. Includes breathing equipment and Magnetic Boots."}),
    ("EmoGoth Suicidal Clothes", 1, "5cr", C, {}),
    ("Studded Thug Outfit", -1, "2cr", C, {"bonuses": [B("intimidate", 1)], "notes": "+1 to Intimidate checks."}),
    ("Punky Anarchist Garb", -2, "3cr", C, {"bonuses": [B("intimidate", 2)], "notes": "+2 to Intimidate checks."}),
    ("Branded Casual Clothes", 1, "150cr", C, {}),
    ("Nightclub Dress", 1, "4cr", C, {}),
    ("Stunning Red Dress", 2, "1,000cr", C, {}),
    ("Tails and Hat", 2, "1,000cr", C, {}),
    ("Smart Business Suit", 1, "10,000cr", R, {"mods": [("computer", 5)], "notes": "+5 to Computer Skill score."}),
    ("Cubeo Liquid Dress", 3, "80,000cr", R, {"notes": "One use only; surgical knives needed to remove it."}),
    ("Original GalCop Flight Suit", 3, "425,000cr", R, {}),
    ("Imperial Noble Dress Suit", 3, "500,000cr", R, {}),
]

# ---------------------------------------------------------------- Equipment (pp.129-133)

# (name, category, cost, rarity, options)
GEAR = [
    # General
    ("Binoculars", "general", "1cr", C, {"notes": "20x magnification."}),
    ("Climbing Kit", "general", "3cr", C, {"notes": "100m rope, harness, grappler pitons."}),
    ("Field Rations", "general", "2cr", C, {"notes": "One week of emergency rations."}),
    ("Gas Mask", "general", "80mcr", C, {"sf": -3, "notes": "Immunity to gas-based Toxic damage."}),
    ("Magnesium Torch", "general", "40mcr", C, {"notes": "Bright light to 40 metres."}),
    ("Magnetic Boots", "general", "", C, {"notes": "Keep you on the deck in zero gravity. Included with Flight and Space Suits."}),
    ("Motion Sensor", "general", "70cr", C, {"notes": "Detects movement within 30 metres, through up to half a metre of dense material."}),
    ("Nightvision Goggles", "general", "250mcr", C, {"notes": "Range 100m."}),
    ("Oxygen Mask and Tank", "general", "2cr", C, {"notes": "12 hours of oxygen."}),
    ("Pack", "general", "70mcr", C, {"notes": "15kg capacity."}),
    ("Remlok", "general", "2cr", C, {"notes": "Emergency life support against explosive decompression and vacuum."}),
    ("Slate Computer", "general", "80mcr", C, {"notes": "Flat computer with a holo-display."}),
    ("Tent", "general", "2cr", C, {"notes": "Self-assembling, for two."}),
    ("Toxin Detector", "general", "30cr", C, {"notes": "Scans food and water for poisons; detects toxic gases."}),
    ("Water Flask", "general", "25mcr", C, {"notes": "2 litres."}),
    ("Water Purifier", "general", "60cr", C, {"notes": "Purifies 1 litre every 15 minutes."}),
    # Medical
    ("Medpack, Standard", "medical", "3cr", C, {"uses": 5, "notes": "Allows the Medicine Skill to treat injuries. About five uses."}),
    ("Medpack, Advanced", "medical", "4,000cr", R, {"uses": 5, "bonuses": [B("medicine", 2, when="medical")], "notes": "+2 to Medicine when stabilising or healing. About five uses."}),
    ("Medpack, Professional", "medical", "90,000cr", R, {"uses": 5, "bonuses": [B("medicine", 4, when="medical")], "notes": "+4 to Medicine when stabilising or healing. About five uses."}),
    # Repair
    ("Spaceship Repair Kit, Basic", "repair", "100cr", C, {"notes": "Allows emergency and field repairs on your ship."}),
    ("Spaceship Repair Kit, Advanced", "repair", "500,000cr", C, {"bonuses": [B("repair", 2, when="repair")], "notes": "+2 to Repair for emergency and field repairs on your ship."}),
    ("Spaceship Repair Kit, Professional", "repair", "3,000,000cr", C, {"bonuses": [B("repair", 4, when="repair")], "notes": "+4 to Repair for emergency and field repairs on your ship."}),
    ("Vehicle Repair Kit, Basic", "repair", "50cr", C, {"notes": "Allows emergency and field repairs on vehicles."}),
    ("Vehicle Repair Kit, Advanced", "repair", "100,000cr", C, {"bonuses": [B("repair", 2, when="repair")], "notes": "+2 to Repair for emergency and field repairs on your vehicle."}),
    ("Vehicle Repair Kit, Professional", "repair", "1,000,000cr", C, {"bonuses": [B("repair", 4, when="repair")], "notes": "+4 to Repair for emergency and field repairs on your vehicle."}),
    # Coms (p.133); Social Factor in non-battle, non-emergency situations
    ("Wrist Com", "com", "2cr", C, {"sf": -2, "notes": "Hands free."}),
    ("Hand Com, Cheap", "com", "50mcr", C, {"sf": -1}),
    ("Hand Com", "com", "3cr", C, {}),
    ("Hand Com, Ubifex", "com", "60cr", C, {"sf": 1, "notes": "Becomes a regular hand com after a month."}),
    ("Wrist Com, Drone Remote", "com", "145,000cr", R, {"sf": -2, "bonuses": [B("cyber", 10, "score", "drones")], "notes": "+10 to Cyber when controlling drones."}),
    ("Hand Com, Hacker Model", "com", "300,000cr", R, {"bonuses": [B("computer", 10, "score", "hacking")], "notes": "+10 to Computer when hacking."}),
    # Rare cosmetics (p.131): only one cosmetics bonus counts at a time
    ("Genome Inc Anti-grav Hairspray", "cosmetic", "500cr", R, {"sf": 1, "uses": 1, "notes": "One use. Flammable."}),
    ("Karetii Manscara", "cosmetic", "2,200cr", R, {"sf": 1, "uses": 5, "notes": "Five uses."}),
    ("Altarian Skin", "cosmetic", "5,000cr", R, {"sf": 2, "uses": 1, "notes": "One use, lasts one week."}),
    ("Dahan Gold No. 5", "cosmetic", "60,000cr", R, {"sf": 1, "notes": "One month supply."}),
    ("Sothis Permanent Lip Gloss", "cosmetic", "120,000cr", R, {"sf": 1, "uses": 1, "notes": "One use, lasts six months."}),
    ("NatureCheat Youthanising Cream", "cosmetic", "400,000cr", R, {"sf": 2, "notes": "One month supply."}),
    # Combat Stims (p.133)
    ("Combat Stim", "stim", "500cr", C, {"notes": "One dose for a Stim injector. For about an hour you can't fall unconscious at 0 Endurance or below (you still die at minus half your Endurance) and they don't stabilise you."}),
    ("Combat Stim: Paranoia Plus", "stim", "5,000cr", R, {"stim": "paranoia", "notes": "As Combat Stim; +10 to Dodge Skill score while in effect."}),
    ("Combat Stim: Brutal Plus", "stim", "10,000cr", R, {"stim": "brutal", "notes": "As Combat Stim; you gain Strong and Quick Runner while in effect."}),
    ("Manual Syringe", "injector", "2mcr", C, {"inject": 100, "notes": "Takes an action to apply."}),
    ("Jury Rigged 'Street Injector'", "injector", "90cr", C, {"inject": 50, "notes": "Automatic: roll percentile at 0 Endurance or below; 100 overloads your heart."}),
    ("Mercenary Stim Injector", "injector", "9,000cr", C, {"inject": 70, "notes": "Automatic: roll percentile at 0 Endurance or below; 100 overloads your heart."}),
    ("Federal Special Forces Medicator", "injector", "56,000cr", R, {"inject": 80, "notes": "Automatic: roll percentile at 0 Endurance or below; 100 overloads your heart."}),
    ("Imperial Emergency Support Aid", "injector", "700,000cr", R, {"inject": 90, "notes": "Automatic: roll percentile at 0 Endurance or below; 100 overloads your heart."}),
    # Ammunition (p.133), reloads matching weapons
    ("Autopistol Magazine", "ammo", "70mcr", C, {"ammo": "Autopistol"}),
    ("Sub Machinegun Magazine", "ammo", "1cr", C, {"ammo": "Sub Machinegun"}),
    ("Shotgun Shells", "ammo", "50mcr", C, {"ammo": "Shotgun"}),
    ("Assault Rifle Magazine", "ammo", "1cr", C, {"ammo": "Assault Rifle"}),
    ("Chain Gun Ammunition", "ammo", "10cr", C, {"ammo": "Chain Gun"}),
    ("Missile (Anti-Personnel)", "ammo", "40cr", C, {"ammo": "Anti-Personnel"}),
    ("Missile (Anti-Tank)", "ammo", "100cr", C, {"ammo": "Anti-Tank"}),
    ("Missile (Anti-Aircraft)", "ammo", "500cr", C, {"ammo": "Anti-Aircraft"}),
    ("Plasma Cannon Charge", "ammo", "1000cr", C, {"ammo": "Plasma Cannon"}),
    ("Underslung Grenade", "ammo", "5cr", C, {"ammo": "Underslung Grenade Launcher"}),
]

# ---------------------------------------------------------------- Supplements
# Each book's items go in a folder named after the book ("Book/Group" nests a group folder inside it).
ESP, EXP = "Espionage Supplement", "Exploration Supplement"
ALIEN_NOTE = "Alien artefact: making it usable by a human takes a Repair check (12, or 8 with 2,000cr and a week)."
CELL_NOTE = "Powered by an Alien Power Cell."

for n, cost in zip((1, 2, 3), ("30,000cr", "150,000cr", "1,000,000cr")):
    CYBERNETICS.append(cyber(f"Class {n} Brute Hacker", 3, cost, R, bonuses=[B("computer", n, when="brute"), B("security", n, when="brute")],
                             notes=(f"+{n} to Security and Computer checks; on a success the lock or computer is destroyed (doors stay open, data is lost). "
                                    "Installed into an existing cybernetic. After a successful Fighting attack on a drone or robot, roll D10 + Cyber bonus "
                                    "against D10 + the drone controller's Cyber bonus (or the robot's To Hit): higher deactivates it. Illegal."),
                             group=f"{ESP}", source=ESP))
for n, (dice, cost) in enumerate((("1d10", "20,000cr"), ("2d10", "350,000cr")), 1):
    CYBERNETICS.append(cyber(f"Class {n} Venomous Bite", 2, cost, R, fighting=dice, uses=2,
                             notes=f"After a successful Fighting attack, bite for an extra {dice.upper()} Toxic damage. Twice per day. Combines with Toxin Injectors.",
                             group=f"{ESP}", source=ESP))


def G(name, category, cost, rarity, book, group=None, **o):
    """A supplement gear entry: (name, category, cost, rarity, options) with its source and book folder."""
    o.update(source=book, group=f"{book}/{group}" if group else book)
    return (name, category, cost, rarity, o)


SHIELD_ALL = {"kinetic": True, "energy": True, "explosive": True, "fighting": True, "melee": True}
SHIELD_CPS = {"kinetic": True, "energy": True, "explosive": False, "fighting": False, "melee": False}
PSG_NOTE = ("Absorbs damage like a ship's shields, recharging 5 at the start of your turn; once knocked down it charges back up to half "
            "strength first. The battery lasts 1 minute (10 rounds); spare batteries weigh 10kg and take a minute to change. Switching it on "
            "or off isn't an action (not both in one round). While it's on: no pack, no Parry, no Fighting attacks, and switch it off to "
            "handle anything not on your person or squeeze through a gap under 120cm.")
CPS_NOTE = ("Absorbs Energy and Kinetic damage like a ship's shields (not Explosive, Melee or Fighting), recharging 10 at the start of your "
            "turn; once knocked down it charges back up to half strength first. Runs 10 rounds per Alien Power Cell; changing the cell is a "
            "combat action. " + ALIEN_NOTE)

SUPPLEMENT_GEAR = []
for tier, bonus, cost in (("Basic", 2, "5,000cr"), ("Advanced", 4, "500,000cr"), ("Professional", 6, "17,000,000cr")):
    SUPPLEMENT_GEAR.append(G(f"Assistant Computer Hack, {tier}", "hack", cost, R, ESP, "Hacks", bonuses=[B("computer", bonus, when="hacking")],
                             notes=f"+{bonus} to Computer checks to gain access to a computer. Reusable."))
for tier, bonus, cost in (("Basic", 2, "5,000cr"), ("Advanced", 4, "500,000cr"), ("Professional", 6, "17,000,000cr")):
    SUPPLEMENT_GEAR.append(G(f"Assistant Security Hack, {tier}", "hack", cost, R, ESP, "Hacks", bonuses=[B("security", bonus, when="locks")],
                             notes=f"+{bonus} to Security checks to open a lock. Reusable."))
for tier, value, cost in (("Basic", 8, "500cr"), ("Advanced", 11, "10,000cr"), ("Professional", 14, "100,000cr")):
    SUPPLEMENT_GEAR.append(G(f"Autonomous Computer Hack, {tier}", "hack", cost, R, ESP, "Hacks", uses=1,
                             notes=f"Makes an automatic Computer check of {value} to gain access to a computer: equal to or above the difficulty, it's unlocked. One use."))
for tier, value, cost in (("Basic", 8, "500cr"), ("Advanced", 11, "10,000cr"), ("Professional", 14, "100,000cr")):
    SUPPLEMENT_GEAR.append(G(f"Autonomous Security Hack, {tier}", "hack", cost, R, ESP, "Hacks", uses=1,
                             notes=f"Makes an automatic Security check of {value} to open a lock: equal to or above the difficulty, it opens. One use."))
SUPPLEMENT_GEAR += [
    G("Death Musk", "cosmetic", "2,000,000cr", R, ESP, "Illegal Cosmetics", uses=1,
      notes="Illegal. A poisonous aura for 1 hour: every other living creature within 4m takes 5 Toxic damage at the start of its turn, unless "
            "it has a Remlok or breathing equipment. Includes an antidote pill. One use."),
    G("Disruptive Perfume", "cosmetic", "40,000cr", R, ESP, "Illegal Cosmetics", uses=3,
      notes="Illegal. Opponents relying entirely on digital vision (drones, robots, cyborgs with replacement eyes) take -2 to all attacks against you. Three uses."),
    G("Face Mask", "cosmetic", "70,000cr", R, ESP, "Illegal Cosmetics", bonuses=[B("bluff", 5, when="impersonating")],
      notes="Illegal. Makes you look like someone else: +5 to Bluff when impersonating them."),
    G("Venomous Lipstick", "cosmetic", "1,000,000cr", R, ESP, "Illegal Cosmetics",
      notes="Illegal. On a successful Fighting attack (a kiss), instead of damage the target takes 10 Toxic damage at the start of each of its "
            "turns until someone makes a Medicine check (9) with a Medpack. Includes a jar of ten antidote pills."),
    G("Holo-Cloak", "general", "65,000cr", R, ESP, rounds=10,
      notes="While on, attackers behind or to your side take -2 To Hit, unless they rely entirely on digital vision. No Stealth checks while it's on. "
            "Runs 1 minute (10 rounds) before it needs recharging."),
    G("Mag Grapple", "general", "1,000cr", R, ESP, notes="Magnetic grapple: 50m range, carries up to 150kg."),
]
for grade, value, cost in (("A", 60, "19,000,000cr"), ("B", 50, "5,500,000cr"), ("C", 40, "1,800,000cr"), ("D", 30, "190,000cr"), ("E", 20, "20,000cr")):
    SUPPLEMENT_GEAR.append(G(f"Personal Shield Generator, {grade} Grade", "shield", cost, R, ESP, "Personal Shields",
                             shield={"value": value, "max": value, "recharge": 5, "down": False, "blocks": SHIELD_ALL}, rounds=10,
                             notes=f"Shield {value}. {PSG_NOTE}"))
for kind, value, cost in (("Intermittent", 40, "4,000,000cr"), ("Fluctuating", 70, "26,000,000cr"), ("Steady", 100, "51,000,000cr")):
    SUPPLEMENT_GEAR.append(G(f"{kind} Charged Particle Shield", "shield", cost, R, EXP, "Alien Artefacts",
                             shield={"value": value, "max": value, "recharge": 10, "down": False, "blocks": SHIELD_CPS}, rounds=10,
                             notes=f"Shield {value}. {CPS_NOTE}"))
SUPPLEMENT_GEAR += [
    G("Cellular Regeneration Emitter", "alien", "20,000,000cr", R, EXP, "Alien Artefacts", regenerate=10, rounds=10,
      notes=("Switching it on takes a combat action. While on, the wearer recovers 10 Endurance at the start of each turn, waking at 1 or more; "
             "someone dead for less than an hour revives and recovers at the same rate. Missing limbs regrow in five turns. A wearer with a "
             "cybernetic limb drops to -5 Endurance and bleeds out until it's switched off. Runs 10 rounds per Alien Power Cell. " + ALIEN_NOTE)),
    G("Shield Reconstructor", "alien", "35,000,000cr", R, EXP, "Alien Artefacts", uses=1,
      notes=("Spaceship utility mount. An Equipment action restores the ship's shields to full and drains its Alien Power Cell. "
             "Holds one cell; reloading takes at least ten minutes. " + ALIEN_NOTE)),
    G("Alien Power Cell (Charged)", "alien", "5,000,000cr", R, EXP, "Alien Artefacts",
      notes="Powers alien artefacts. Fitting one to a human-modified device takes a Repair check (10, or 7 with time). Sells for 5,000,000cr."),
    G("Alien Power Cell (Drained)", "alien", "100,000cr", R, EXP, "Alien Artefacts", notes="An empty Alien Power Cell. Sells for 100,000cr."),
]

ICON = {"general": "icons/svg/item-bag.svg", "medical": "icons/svg/heal.svg", "repair": "icons/svg/anvil.svg",
        "com": "icons/svg/sound.svg", "cosmetic": "icons/svg/mystery-man.svg", "stim": "icons/svg/pill.svg",
        "injector": "icons/svg/pill.svg", "ammo": "icons/svg/fire.svg", "hack": "icons/svg/padlock.svg",
        "shield": "icons/svg/shield.svg", "alien": "icons/svg/mystery-man.svg"}
GROUP = {"general": "General", "medical": "Medpacks", "repair": "Repair Kits", "com": "Coms", "cosmetic": "Cosmetics",
         "stim": "Combat Stims", "injector": "Combat Stims", "ammo": "Ammunition", "hack": "Hacks", "shield": "Personal Shields",
         "alien": "Alien Artefacts"}


def clothing_doc(entry, sort):
    name, sf, cost, rarity, o = entry
    return {
        "name": name, "type": "clothing", "img": "icons/svg/shield.svg",
        "system": {
            "description": f"<p>{o['notes']}</p>" if o.get("notes") else "", "cost": cost, "rarity": rarity,
            "location": "carried", "socialFactor": sf, "skillMods": [{"skill": s, "value": v} for s, v in o.get("mods", [])],
            "rollBonuses": o.get("bonuses", []), "toxicResistance": o.get("toxic", 0), "spaceSuit": o.get("space", False),
            "notes": o.get("notes", ""), "worn": False,
        },
        "flags": {}, "sort": sort,
    }


def gear_doc(entry, sort):
    name, category, cost, rarity, o = entry
    uses = o.get("uses")
    html = (f"<p>{o['notes']}</p>" if o.get("notes") else "") + (f"<p><em>{o['source']}</em></p>" if o.get("source") else "")
    shield = {"value": 0, "max": 0, "recharge": 0, "down": False, "blocks": SHIELD_ALL, **o.get("shield", {})}
    rounds = o.get("rounds", 0)
    return {
        "name": name, "type": "gear", "img": ICON[category],
        "system": {
            "description": html, "cost": cost, "rarity": rarity,
            "location": "carried", "category": category, "quantity": 1,
            "uses": {"value": uses, "max": uses}, "socialFactor": o.get("sf", 0), "rollBonuses": o.get("bonuses", []),
            "injectionSuccess": o.get("inject"), "stimEffect": o.get("stim", ""), "ammoFor": o.get("ammo", ""), "notes": o.get("notes", ""),
            "shield": shield, "regenerate": o.get("regenerate", 0), "rounds": {"value": rounds, "max": rounds},
            "active": False,
        },
        "flags": {"edrpg": {"group": o.get("group") or GROUP[category]}}, "sort": sort,
    }


def write_pack(pack, kind, docs):
    from equipment import write_folders
    root = os.path.join(HERE, "..", "packs", "_source", pack)
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    folders = write_folders(root, pack, docs)
    for doc in docs:
        _id = doc_id(kind, doc["name"])
        group = doc["flags"].get("edrpg", {}).get("group")
        doc = {"_id": _id, "_key": f"!items!{_id}", **doc, "effects": [], "folder": folders.get(group),
               "ownership": {"default": 0}}
        slug = re.sub(r"[^a-z0-9]+", "-", doc["name"].lower()).strip("-")
        with open(os.path.join(root, f"{slug}_{_id}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"{len(docs)} {kind} entries written to {os.path.normpath(root)}")


if __name__ == "__main__":
    write_pack("cybernetics", "cybernetic", [cyber_doc(c, (i + 1) * 100) for i, c in enumerate(CYBERNETICS)])
    write_pack("clothing", "clothing", [clothing_doc(c, (i + 1) * 100) for i, c in enumerate(CLOTHING)])
    write_pack("gear", "gear", [gear_doc(g, (i + 1) * 100) for i, g in enumerate(GEAR + SUPPLEMENT_GEAR)])
