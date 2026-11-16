"""
Individual-scale opponents from the supplements (Espionage, Exploration, Military, Super Traders), hand-transcribed
from their stat blocks: numbers and mechanics only, no flavour text. Writes tools/opponents-supplements.json, which
tools/opponents.py reads (same format as opponents-data.json, plus each entry's "source" book).

Run `python3 tools/opponents-supplements.py`, then `python3 tools/opponents.py` and `npm run packs`.
"""
import json, os

HERE = os.path.dirname(__file__)
ESP, EXP, MIL, ST = "Espionage Supplement", "Exploration Supplement", "Military Sourcebook", "Super Traders Supplement"


def C(compendium, toHit, *, damage=None, burst=None, ammo=None, range=None, finesse=None, notes="", name=None):
    """A compendium weapon at the stat block's To Hit."""
    return {"name": name or compendium, "compendium": compendium, "toHit": toHit, "finesse": finesse, "damage": damage or "",
            "dtypeOverride": None, "burst": burst, "rangeDamage": {}, "blast": None, "blastRadius": None, "ammo": ammo,
            "range": range, "notes": notes}


def N(name, toHit, damage, *, finesse=None, range=None, skill="fighting", dtype="fighting", burst=None, ammo=None, notes=""):
    """A natural or built-in attack."""
    return {"name": name, "compendium": None, "toHit": toHit, "finesse": finesse, "damage": damage, "dtypeOverride": None,
            "burst": burst, "rangeDamage": {}, "blast": None, "blastRadius": None, "ammo": ammo, "range": range,
            "notes": notes, "skill": skill, "dtype": dtype}


def A(name, absorb, hardened=None, toxic_all=False):
    return {"name": name, "absorb": absorb, "hardened": hardened, "toxicAll": toxic_all}


REFLEC_VEST = A("Reflec Vest", {"energy": 3})
BULLET_VEST = A("Bullet Proof Vest", {"kinetic": 5})
REFLEC_BP = A("Reflec Breastplate", {"kinetic": 5, "energy": 5, "melee": 3}, 7)
ALLOYED_BP = A("Alloyed Breastplate", {"kinetic": 8, "energy": 3, "melee": 3}, 7)
PLATING = A("Armour Plating", {"kinetic": 5, "energy": 3})


def O(source, group, name, rank, role, dodge, parry, initiative, perception, endurance, toHit, speed="10m", *,
      armour=None, weapons=(), skills=(), karma=(), equipment="", notes=""):
    return {"source": source, "group": group, "name": name, "rank": rank, "role": role, "dodge": dodge, "parry": parry,
            "initiative": initiative, "perception": perception, "endurance": endurance, "toHit": toHit, "speed": speed,
            "equipment": equipment, "skills": [list(s) for s in skills], "armour": armour,
            "karma": [[k, 1] for k in karma], "weapons": list(weapons), "notes": notes}


POISON = "Poisoned: the target takes {dmg} Toxic damage at the start of each of its turns until treated with a Medicine check (difficulty {dn})."
ROBOT_VP = ("Robot: immune to Toxic damage. Verification protocols: it can't take reaction actions (counterattacks, attacks on an "
            "enemy moving away or firing point blank, grenade or missile reactions) and attacks at a flat +3 To Hit.")

OPPONENTS = [
    # ------------------------------------------------------------------ Espionage Supplement
    O(ESP, "Police & Security", "Office Worker", "harmless", "Security", 1, 1, 1, 2, 15, 1, skills=[("fighting", 1)],
      equipment="Hand Com"),
    O(ESP, "Police & Security", "War Front Security Guard", "novice", "Security", 3, 3, 4, 3, 25, 3, armour=REFLEC_VEST,
      weapons=[C("Laser Rifle", 3)], equipment="Wrist Com"),
    O(ESP, "Police & Security", "Heavy Support Officer", "expert", "Security", 5, 3, 4, 3, 40, 5, armour=REFLEC_BP,
      weapons=[C("Chain Gun", 5, ammo=10), C("Frag Grenade", 5)], equipment="Medpack, Wrist Com"),
    O(ESP, "Police & Security", "Counter Assault Security", "master", "Security", 6, 4, 6, 5, 45, 6, armour=ALLOYED_BP,
      weapons=[C("Assault Beamer", 6), C("Frag Grenade", 6)], equipment="Wrist Com, Medpack"),
    O(ESP, "Assassin", "Spy", "novice", "Assassin", 3, 3, 5, 3, 25, 3, armour=BULLET_VEST, weapons=[C("Laser Pistol", 3)],
      skills=[("fighting", 4)], karma=["Dive Aside"], equipment="Hand Com, Branded Casual Clothes"),
    O(ESP, "Assassin", "Special Agent", "dangerous", "Assassin", 7, 7, 9, 8, 50, 7, "12m", armour=BULLET_VEST,
      weapons=[C("Corvus Inc Devastation Pistol", 9, ammo=3)], skills=[("fighting", 7)], karma=["Dive Aside", "Eat Lead Sucker!"],
      equipment="Hand Com, Tailored Business Suit", notes="Fighting: 1D10 halved damage +2."),

    # ------------------------------------------------------------------ Exploration Supplement
    O(EXP, "Alien Animal", "Spit Viper", "mostlyHarmless", "Alien Animal", 2, None, 1, 2, 35, 3, "8m",
      weapons=[N("Bite", 2, "1d10", finesse=5),
               N("Spit Venom", 3, "", range="2m(5)/6m(8)/12m(12)", skill="kineticWeapons", dtype="toxic", notes="On a hit the target is poisoned.")],
      notes=POISON.format(dmg=5, dn=7) + " Blind: unaffected by Flashbang grenades; it can't Dodge ranged attacks made from more than "
            "12m away (Defence 0 against them). Its hearing and smell let it make Melee and Ranged attacks without penalty."),
    O(EXP, "Alien Animal", "Kavoraptor", "competent", "Alien Animal", 6, None, 3, 2, 35, 4, "20m",
      weapons=[N("Gouge", 4, "2d10+4", finesse=5)],
      notes="Impale: if it moves at least 10m before attacking, a hit does an extra 1D10 damage. Gruesome Attack: a target it hits "
            "can't attack it if it moves away."),
    O(EXP, "Alien Animal", "Blindwurm", "expert", "Alien Animal", 5, None, 5, 3, 80, 5, "12m",
      weapons=[N("Bite", 5, "2d10+2", finesse=5, notes="The target is reeling.")],
      notes="Reeling: the character can take no actions in its next turn and can only Parry incoming attacks. Blind: unaffected by "
            "Flashbang grenades and can't Dodge ranged attacks (Defence 0 against them); hearing and smell let it make Melee attacks "
            "without penalty."),
    O(EXP, "Relic AI", "Shambler", "novice", "Relic AI", 0, None, 1, 3, 100, 3, "6m",
      weapons=[N("Spew Shrapnel", 2, "2d10", range="6m(3)/12m(7)/30m(13)", skill="kineticWeapons", dtype="kinetic", notes="Ammo unlimited."),
               N("Shambler Slam", 3, "2d10+2", finesse=5)],
      notes="Slow Witted: it can't take reactions. Resist Knockdown 1. Self-Repair: inside a Relic AI facility it recovers 10 "
            "Endurance at the start of its turn, unless it took Explosive damage in the previous turn."),
    O(EXP, "Relic AI", "Holomancer", "expert", "Relic AI", 0, None, 5, 5, 20, 5, "0m (12m)",
      weapons=[N("Energy Blast", 5, "20", range="12m(4)/60m(7)/100m(11)", skill="energyWeapons", dtype="energy",
                 notes="Fired by its holograms.")],
      notes="Holomancer: a fixed energy projector that can't move or defend itself, usually hidden in a nearby chamber; its "
            "Endurance is the projector's. Holograms: it keeps up to four, projected up to 24m away (speed 12m, through walls, not "
            "slowed by terrain). Each attacks separately on the Holomancer's turn. Holograms can't be harmed, block enemies or make "
            "physical attacks, but spot enemies for it and interact with the facility. Destroying the projector ends them all."),
    O(EXP, "Relic AI", "Assembler", "mostlyHarmless", "Relic AI", 2, None, 2, 3, 10, 3, "14m",
      weapons=[N("Bite", 3, "1d10+2", finesse=5)],
      notes="Reassemble: a destroyed Assembler twitches harmlessly. Once two or more are destroyed the bodies recombine into a new "
            "Assembler with 5 Endurance per body, which does an extra 1D10 damage if made of more than two, and can act at once."),
    O(EXP, "Relic AI", "Progenitor", "competent", "Relic AI", 5, 4, 4, 3, 40, 4, "8m",
      weapons=[N("Metallic Tendril", 4, "1d10+4", finesse=6, notes="The target is Grabbed.")],
      notes="Whirling Tentacles: it makes two Metallic Tendril or Animate Machinery attacks. Animate Machinery: a Metallic Tendril "
            "attack on an enemy it can see within 30m who is standing in a Relic AI facility. Grabbed: take 1D10 halved damage at the "
            "start of your turn; you can't move and can only use your action to escape (Athletics, difficulty 11; close combat damage "
            "bonuses add). It can't be knocked over."),
    O(EXP, "Relic AI", "Disorientator", "master", "Relic AI", 6, 6, 6, 6, 50, 6,
      armour=A("Sealed Plating", {"explosive": 10, "kinetic": 6}),
      weapons=[N("Laser Jaw", 6, "20", range="12m(4)/60m(7)/100m(11)", skill="energyWeapons", dtype="energy"),
               N("Rotating Scalpel", 6, "2d10+4", finesse=5, skill="meleeWeapons", dtype="melee")],
      notes="Hallucinogenic Waves: living creatures within 12m can't tell friend from foe unless they pass a Tactics or Perception "
            "check (difficulty 10); on a failure they attack a random ally. Disorientating Burst: living creatures within 6m add no "
            "Skill bonuses to attacks or Skill checks."),
    O(EXP, "Tribal", "Tribal Hunter", "competent", "Tribal", 4, 4, 3, 5, 30, 6, "12m",
      weapons=[C("Axe/Hammer", 6, damage="2d10+4", name="Axe"),
               N("Hunting Bow", 6, "1d10", range="10m(5)/50m(7)/100m(11)", skill="kineticWeapons", dtype="kinetic", ammo=12)],
      skills=[("stealth", 5), ("survival", 5), ("intimidate", 4)], equipment="Axe, Hunting Bow, 12 Arrows"),
    O(EXP, "Tribal", "Tribal Young Blood", "mostlyHarmless", "Tribal", 2, 3, 2, 3, 20, 3,
      weapons=[C("Spear", 3, damage="1d10+2"),
               N("Throwing Spear", 3, "1d10", range="12m(4)/40m(7)/80m(13)", skill="kineticWeapons", dtype="kinetic", ammo=3)],
      skills=[("stealth", 3), ("survival", 3)], equipment="Spear, three Throwing Spears"),
    O(EXP, "Tribal", "Tribal Slayer", "expert", "Tribal", 4, 4, 3, 6, 35, 6, "12m",
      weapons=[C("Spear", 6, damage="1d10+6", notes="The target is poisoned."),
               N("Poisoned Hunting Bow", 6, "1d10", range="10m(5)/50m(7)/100m(11)", skill="kineticWeapons", dtype="kinetic", ammo=12,
                 notes="The target is poisoned.")],
      skills=[("stealth", 6), ("survival", 5)], equipment="Spear, Hunting Bow, 12 Arrows", notes=POISON.format(dmg=5, dn=10)),
    O(EXP, "Tribal", "Vengeful Tribal", "master", "Tribal", 6, 6, 4, 6, 40, 7,
      weapons=[C("Laser Rifle", 7), C("Knife", 7, damage="1d10+4")],
      skills=[("stealth", 6), ("survival", 5)], equipment="Laser Rifle, Knife",
      notes="Dead Eye: on a ranged attack it rerolls natural 1s on the attack die; on a natural 10 to hit, a target that takes any "
            "damage drops to 0 Endurance (not against vehicle or spaceship targets)."),
    O(EXP, "Tribal", "Monstrous Tribal", "dangerous", "Tribal", 4, 5, 3, 3, 80, 7, "14m",
      armour=A("Scaled Hide", {"energy": 5, "kinetic": 8, "toxic": 10}),
      weapons=[N("Claws", 7, "3d10+6", finesse=5)], skills=[("stealth", 3), ("survival", 3)],
      notes="Primal Scream: non-robotic enemies within 14m must pass a Tactics or Insight check (difficulty 11) or drop their weapons "
            "and spend their next turn fleeing directly away."),

    # ------------------------------------------------------------------ Military Sourcebook: robots
    O(MIL, "Robot", "Sentinel Turret", "novice", "Robot", 0, None, 10, 6, 10, 3, "0m",
      weapons=[C("Chain Gun", 3, ammo=20)],
      notes="Robot: immune to Toxic damage; no verification protocols. Firing Arc: it can only target opponents in a 180° arc in "
            "front of it. Continuous Attack. Just a gun: no Fighting or Melee attacks. Immobile: it can't move or Dodge. Constantly "
            "Alert: it always has an action readied before combat to shoot a target that enters its firing arc within 180m."),
    O(MIL, "Robot", "Death Spider", "mostlyHarmless", "Robot", 4, None, 3, 2, 8, 3,
      weapons=[N("Poison Needle", 3, "1", range="8m(5)/20m(9)/40m(12)", skill="kineticWeapons", dtype="kinetic", ammo=6,
                 notes="The target is poisoned."),
               N("Needle Jab", 3, "1", finesse=4, skill="meleeWeapons", dtype="melee", notes="The target is poisoned.")],
      notes=POISON.format(dmg=3, dn=8) + " " + ROBOT_VP + " It can't deactivate its verification protocols. Exceptional Mobility: "
            "not slowed by difficult terrain, and climbs sheer walls at full speed."),
    O(MIL, "Robot", "Eye Bot", "harmless", "Robot", 3, None, 4, 4, 15, 3, armour=PLATING,
      weapons=[N("Laser Painter", 3, "", range="20m(4)/150m(7)/500m(10)", skill="energyWeapons", dtype="energy",
                 notes="No damage: linked robots get +2 To Hit with ranged attacks against the target while the Eye Bot keeps it in sight.")],
      notes=ROBOT_VP + " It can deactivate them on command: Dodge 4 and To Hit +5. Fly: ignores difficult terrain and interposing "
            "enemies. Encounter building: Harmless alone, but robots linked to it count one threat rank higher."),
    O(MIL, "Robot", "Guard Bot", "competent", "High Threat Robot", 0, None, 3, 5, 50, 3, "6m",
      armour=A("Heavy Plating", {"kinetic": 8, "energy": 5, "fighting": 5}, 6),
      weapons=[C("Assault Beamer", 3)],
      notes="Hail of Fire: if it doesn't move it fires its Assault Beamer twice in its turn. Continuous Attack (a single attack "
            "between each turn). " + ROBOT_VP + " It can deactivate them on command: To Hit +6. Just a gun: no Fighting or Melee "
            "attacks. Resist Knockdown 1. Limited Mobility: flat surfaces only; once knocked down it can't get back up."),
    O(MIL, "Robot", "Achilles Combat Android", "competent", "Robot", 4, 4, 4, 4, 40, 4, armour=PLATING,
      weapons=[C("Assault Beamer", 4)], skills=[("fighting", 4)],
      notes="Fighting: 1D10+6 damage. " + ROBOT_VP.replace("a flat +3 To Hit", "a flat +4 To Hit (Advanced Design)") +
            " Secret Sentience: each time it loses Endurance roll a D10; on a 10 it becomes sentient (Deadly): it deactivates its "
            "verification protocols and those of every robot within 500km, and its Dodge, Parry, To Hit, Initiative and Perception "
            "become 8. Brotherhood of the Machine: robots without verification protocols never target a sentient android."),
    O(MIL, "Robot", "Dog Mortar", "expert", "Robot", 0, None, 1, 3, 40, 3, armour=PLATING,
      weapons=[C("Frag Grenade", 3, ammo=12), N("Slam", 3, "1d10", finesse=8)],
      notes=ROBOT_VP + " It can deactivate them on command: Dodge 4 and To Hit +5."),

    # ------------------------------------------------------------------ Super Traders Supplement
    O(ST, "Criminal", "Stowaway", "mostlyHarmless", "Criminal", 2, 3, 2, 3, 20, 3, armour=A("Reflec Vest", {"energy": 5}),
      skills=[("fighting", 3), ("streetwise", 3), ("shipPiloting", 3), ("shipWeapons", 3)],
      notes="Stolen Weapon: +3 To Hit with whatever it has picked up."),
    O(ST, "Criminal", "Saboteur", "novice", "Criminal", 3, 3, 3, 3, 25, 3, weapons=[C("Sub Machinegun", 3)],
      skills=[("fighting", 3), ("streetwise", 3), ("repair", 3), ("computer", 3)], notes="Wears a space suit (no armour)."),
    O(ST, "Criminal", "Cyber Pirate", "master", "Criminal", 6, 6, 3, 3, 60, 6,
      armour=A("Type 3 Armoured Carapace", {"kinetic": 6, "energy": 5, "explosive": 10, "fighting": 4, "melee": 4}, 7, True),
      weapons=[C("Jupiter 'Lockon' Short Barrelled Rifle", 7)],
      skills=[("fighting", 6), ("streetwise", 3), ("shipPiloting", 3), ("shipWeapons", 3)],
      notes="Fighting: 2D10 damage plus 2D10 Toxic damage."),
    O(ST, "Criminal", "Pirate Hotshot", "deadly", "Criminal", 8, 9, 7, 5, 50, 8, "12m", armour=REFLEC_BP,
      weapons=[C("Corvus Inc Devastation Pistol", 10, ammo=4), C("Neo-Samurai Sword", 10, damage="2d10+6")],
      karma=["Blur of Steel", "Crack Shot"]),
]

if __name__ == "__main__":
    with open(os.path.join(HERE, "opponents-supplements.json"), "w", encoding="utf-8") as fh:
        json.dump(OPPONENTS, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"{len(OPPONENTS)} supplement opponents written")
