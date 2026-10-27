"""
Source data for the Weapons and Armour compendia (Core Rules ch.5, pp.100-122).

Names, statistics, costs and game mechanics only - no flavour text. Rarity follows the book's colours
(green = common, blue = rare). Run `python3 tools/equipment.py`, then `npm run packs`.

Range bands are (distance, difficulty To Hit); None means the band can't be used (e.g. inside a minimum range).
"""
import hashlib, json, os, re

KW, EW, HW, GR, MW = "kineticWeapons", "energyWeapons", "heavyWeapons", "grenade", "meleeWeapons"
C, R = "common", "rare"


def W(name, skill, dtype, ranges, damage, ammo, cost, rarity, *, one=False, burst=None, heavy=False,
      finesse=None, blast=None, bonus=0, mods=None, cover=False, divide=False, notes="", range_damage=None,
      group=""):
    return dict(kind="weapon", name=name, skill=skill, dtype=dtype, ranges=ranges, damage=damage, ammo=ammo,
                cost=cost, rarity=rarity, one=one, burst=burst, heavy=heavy, finesse=finesse, blast=blast,
                bonus=bonus, mods=mods or [], cover=cover, divide=divide, notes=notes,
                range_damage=range_damage or {}, group=group)


def bands(s, m, l):
    return {"short": s, "medium": m, "long": l}


AP = bands(("6m", 5), ("50m", 8), ("100m", 14))
LP = bands(("10m", 4), ("80m", 7), ("120m", 11))
SMG = bands(("10m", 5), ("60m", 8), ("120m", 14))
SMG_LONG = bands(("12m", 5), ("64m", 8), ("128m", 14))
AB = bands(("12m", 4), ("70m", 7), ("200m", 10))
SG = bands(("6m", 3), ("12m", 7), ("50m", 12))
AR = bands(("16m", 6), ("100m", 7), ("400m", 10))
LR = bands(("20m", 5), ("150m", 6), ("500m", 9))
CG = bands(("30m", 5), ("60m", 8), ("180m", 14))
ML = bands(("Min. 26m", None), ("200m", 9), ("2km", 12))
PC = bands(("Min. 36m", None), ("500m", 9), ("3km", 12))
UGL = bands(("Min. 18m", None), ("60m", 9), ("150m", 14))
NONE = bands(("", None), ("", None), ("", None))

UGL_NOTE = "Includes an underslung grenade launcher."
HALF_SHIELDS = "Half damage against shields."

WEAPONS = [
    # Autopistols (p.102)
    W("Autopistol", KW, "kinetic", AP, "1d10", 3, "4cr", C, one=True, burst=("burst", "2d10"), group="Autopistols"),
    W("NG75 Autopistol", KW, "kinetic", AP, "1d10", 2, "42,000cr", R, one=True, burst=("burst", "3d10"), group="Autopistols"),
    W("Micronite Doubleclip Sentinel", KW, "kinetic", AP, "1d10", 6, "50,000cr", R, one=True, burst=("burst", "2d10"), bonus=5, group="Autopistols"),
    W("Gold & Perry 'Watcher' Autopistol", KW, "kinetic", bands(("10m", 5), ("60m", 8), ("120m", 14)), "1d10", 3, "65,000cr", R, one=True, burst=("burst", "2d10"), group="Autopistols"),
    W("GTN 195 Autopistol", KW, "kinetic", bands(("8m", 5), ("56m", 8), ("110m", 14)), "2d10", 3, "225,000cr", R, one=True, burst=("burst", "2d10"), group="Autopistols"),
    W("Imperial 'Stimmer' Autopistol", KW, "kinetic", AP, "1d10", 3, "400,500cr", R, one=True, burst=("burst", "2d10"), bonus=5,
      notes="Injects Combat Stims (80%) when you reach 0 Endurance.", group="Autopistols"),
    W("Asellus Deflector Pistol", KW, "kinetic", AP, "1d10", 3, "1,005,000cr", R, one=True, burst=("burst", "2d10"), bonus=10,
      notes="Absorbs 3 Kinetic and Energy damage.", group="Autopistols"),
    W("LX10 Energised Autopistol", KW, "energy", bands(("10m", 5), ("60m", 8), ("120m", 14)), "2d10", 4, "1,400,000cr", R, one=True,
      burst=("burst", "2d10"), bonus=5, notes="Damage counts as an Energy weapon (can be switched to normal rounds).", group="Autopistols"),
    W("Corvus Inc Devastation Pistol", KW, "kinetic", bands(("8m", 5), ("56m", 8), ("110m", 14)), "1d10", 4, "2,900,000cr", R, one=True, burst=("burst", "4d10"), bonus=15, group="Autopistols"),
    W("Delman Autopistol", KW, "kinetic", bands(("10m", 5), ("60m", 8), ("120m", 14)), "3d10", 2, "5,000,000cr", R, one=True, burst=("burst", "2d10"), bonus=20, group="Autopistols"),
    # Laser pistols (p.104)
    W("Laser Pistol", EW, "energy", LP, "8", None, "3cr", C, one=True, group="Laser Pistols"),
    W("Hyperion Laser Pistol", EW, "energy", LP, "8", None, "47,000cr", R, one=True, bonus=5, group="Laser Pistols"),
    W("Evex Long-barrel Laser Pistol", EW, "energy", bands(("16m", 4), ("100m", 7), ("150m", 11)), "8", None, "98,000cr", R, one=True, group="Laser Pistols"),
    W("Cauldus Nerve-blocker Laser Pistol", EW, "energy", LP, "8", None, "196,000cr", R, one=True,
      notes="Knocks the target over on a natural 9 or 10 To Hit; a target knocked over is disarmed.", group="Laser Pistols"),
    W("CS1 Burst Pistol", EW, "energy", bands(("8m", 4), ("60m", 7), ("90m", 11)), "5", None, "244,000cr", R, one=True, burst=("energy", "15"), group="Laser Pistols"),
    W("Nadion Twin Barrel Laser Pistol", EW, "energy", LP, "12", None, "863,000cr", R, one=True, group="Laser Pistols"),
    W("Paris Eleganté Laser Pistol", EW, "energy", LP, "10", None, "1,809,000cr", R, one=True, bonus=15, group="Laser Pistols"),
    W("Magnetising Hotshot Laserpistol", EW, "energy", bands(("12m", 4), ("90m", 7), ("130m", 11)), "12", None, "3,550,000cr", R, one=True, bonus=10,
      notes="+1 To Hit against a target you have previously hit with this weapon.", group="Laser Pistols"),
    W("GL779 Intellipistol", EW, "energy", bands(("12m", 4), ("90m", 7), ("130m", 11)), "12", None, "8,200,000cr", R, one=True,
      notes="Fires with an Energy Weapons bonus of 9, ignoring the firer's skill.", group="Laser Pistols"),
    # Sub machineguns (p.107)
    W("Sub Machinegun", KW, "kinetic", SMG, "1d10", 4, "9cr", C, burst=("burst", "3d10"), group="Sub Machineguns"),
    W("Underslung Grenade Launcher", GR, "explosive", UGL, "", 2, "40cr fitted to an SMG, 90cr to an assault rifle", C,
      blast=(25, 10, 6, 16), notes="Direct-fire explosive. Uses the Grenade skill.", group="Sub Machineguns"),
    W("Ergon Tommygun", KW, "kinetic", SMG_LONG, "1d10", 8, "74,000cr", R, burst=("burst", "3d10"), group="Sub Machineguns"),
    W("K33 Multifire SMG", KW, "kinetic", SMG, "1d10", 3, "175,500cr", R, burst=("burst", "4d10"), group="Sub Machineguns"),
    W("Longarm Deadfire SMG", KW, "kinetic", SMG_LONG, "1d10", 4, "310,000cr", R, burst=("burst", "3d10"), bonus=5, notes=UGL_NOTE, group="Sub Machineguns"),
    W("Skollanga 'Slammer' SMG", KW, "kinetic", SMG, "2d10", 4, "985,000cr", R, burst=("burst", "3d10"),
      notes="Knocks the target over on a natural 9 or 10 To Hit.", group="Sub Machineguns"),
    W("IntSys JR4 SMG", KW, "kinetic", SMG, "1d10", 4, "1,345,000cr", R, burst=("burst", "4d10"), bonus=10, group="Sub Machineguns"),
    W("Krakoff Demolisher Rifle", KW, "kinetic", SMG, "2d10", 6, "3,050,000cr", R, burst=("burst", "4d10"), notes=UGL_NOTE, group="Sub Machineguns"),
    # Assault beamers (p.109)
    W("Assault Beamer", EW, "energy", AB, "5", None, "50cr", C, burst=("energy", "20"), cover=True, divide=True, group="Assault Beamers"),
    W("Ingram Wide-Beam Carbine", EW, "energy", bands(("10m", 4), ("60m", 7), ("150m", 10)), "5", None, "62,000cr", R, burst=("energy", "20"), bonus=5, cover=True, divide=True, group="Assault Beamers"),
    W("Laifan AB5 Serrator", EW, "energy", AB, "5", None, "2,134,000cr", R, burst=("energy", "30"), cover=True, divide=True,
      notes="On a natural 1 To Hit the weapon deals 10 Energy damage to its user.", group="Assault Beamers"),
    W("Magnotan Searching Beamer", EW, "energy", AB, "10", None, "13,599,000cr", R, burst=("energy", "20"), bonus=20, cover=True, divide=True, group="Assault Beamers"),
    # Shotguns (p.110)
    W("Shotgun", KW, "kinetic", SG, "3d10", 6, "5cr", C, range_damage={"medium": "2d10", "long": "1d10"}, group="Shotguns"),
    W("Exalt Widescatter Shotgun", KW, "kinetic", bands(("8m", 3), ("12m", 7), ("30m", 12)), "3d10", 6, "78,000cr", R, divide=True,
      range_damage={"medium": "2d10", "long": "1d10"},
      notes="Must always divide fire, but every target in the area takes full damage instead of half.", group="Shotguns"),
    W("Micro-Shotgun", KW, "kinetic", bands(("6m", 3), ("10m", 7), ("30m", 12)), "3d10", 3, "190,000cr", R, one=True,
      range_damage={"medium": "2d10", "long": "1d10"}, group="Shotguns"),
    W("BD90 Warhammer", KW, "kinetic", SG, "5d10", 6, "209,000cr", R, range_damage={"medium": "3d10", "long": "1d10"},
      notes="At short range, knocks the target over on a natural 8, 9 or 10 To Hit. On a natural 1 To Hit it malfunctions and needs three hours' servicing.",
      group="Shotguns"),
    W("Jupiter 'Lockon' Short Barrelled Rifle", KW, "kinetic", bands(("8m", 3), ("16m", 7), ("70m", 12)), "4d10", 6, "867,000cr", R, bonus=10,
      range_damage={"medium": "2d10", "long": "1d10"}, group="Shotguns"),
    W("ZX9000 Auto-Shotgun", KW, "kinetic", SG, "3d10", 3, "19,400,000cr", R, burst=("burst", "4d10"),
      range_damage={"medium": "2d10", "long": "1d10"}, notes="Base damage drops at medium and long range; Burst still applies.", group="Shotguns"),
    # Assault rifles (p.112)
    W("Assault Rifle", KW, "kinetic", AR, "1d10", 4, "15cr", C, burst=("burst", "3d10"), group="Assault Rifles"),
    W("C&G 45 AutoRifle", KW, "kinetic", AR, "1d10", 4, "30,000cr", R, burst=("burst", "3d10"), bonus=5, group="Assault Rifles"),
    W("GalSpec 109 Sniper Rifle", KW, "kinetic", bands(("16m", 6), ("100m", 7), ("800m", 8)), "1d10", 5, "101,000cr", R, burst=("burst", "3d10"),
      notes="Two modes. Assault mode: 1D10 + Burst. Sniper mode: +15 Kinetic Weapons score, a fixed 15 Damage, no Burst, and it only uses an ammo point after twelve shots in a row.",
      group="Assault Rifles"),
    W("Arkana 'Nighthawk'", KW, "kinetic", AR, "2d10", 6, "495,000cr", R, burst=("burst", "3d10"), notes=UGL_NOTE, group="Assault Rifles"),
    W("Perun Light Machinegun", KW, "kinetic", bands(("18m", 6), ("140m", 7), ("600m", 10)), "1d10", 4, "1,788,000cr", R, burst=("burst", "5d10"), group="Assault Rifles"),
    W("BN799 Carbine", KW, "kinetic", bands(("20m", 6), ("160m", 7), ("650m", 10)), "3d10", 4, "3,600,000cr", R, burst=("burst", "3d10"), bonus=10, notes=UGL_NOTE, group="Assault Rifles"),
    # Laser rifles (p.114)
    W("Laser Rifle", EW, "energy", LR, "15", None, "40cr", C, group="Laser Rifles"),
    W("MLR40 Infantry Rifle", EW, "energy", LR, "15", None, "49,000cr", R, bonus=5, group="Laser Rifles"),
    W("Kopernicus Incinerator", EW, "energy", LR, "20", None, "264,000cr", R, group="Laser Rifles"),
    W("LR17 Long Barrel", EW, "energy", bands(("24m", 5), ("200m", 6), ("700m", 9)), "15", None, "327,500cr", R, group="Laser Rifles"),
    W("Vortigen Multi-Scope Energy Rifle", EW, "energy", LR, "20", None, "1,450,000cr", R, bonus=10, group="Laser Rifles"),
    W("Ergon Burst Rifle", EW, "energy", LR, "10", None, "2,100,000cr", R, burst=("energy", "20"), group="Laser Rifles"),
    W("Kosha Inc LasRifle", EW, "energy", bands(("22m", 5), ("170m", 6), ("600m", 9)), "24", None, "4,225,000cr", R, group="Laser Rifles"),
    W("Lance & Ferman 'Deadeye' Rifle", EW, "energy", bands(("24m", 5), ("200m", 6), ("700m", 9)), "15", None, "5,000,000cr", R, bonus=20, group="Laser Rifles"),
    W("Fairlight Excelsior", EW, "energy", LR, "30", None, "28,799,000cr", R, bonus=15, group="Laser Rifles"),
    # Grenades (p.116)
    W("Frag Grenade", GR, "explosive", NONE, "", None, "5cr", C, blast=(25, 10, 6, 16), group="Grenades"),
    W("Flashbang Grenade", GR, "explosive", NONE, "", None, "4cr", C, blast=(None, None, 4, 12),
      notes="No damage. Targets in the Fatal radius must pass a Perception check (difficulty 10), and those in the Injury radius a difficulty 7 check, or be stunned: they miss their next turn and have a Defence of 0 until it starts.",
      group="Grenades"),
    W("Concussion Grenade", GR, "explosive", NONE, "", None, "100cr", R, blast=(40, 5, 2, 6), group="Grenades"),
    W("EMP Grenade", GR, "explosive", NONE, "", None, "1000cr", R, blast=(60, 20, 6, 16),
      notes="Damages robotic targets only. Energy weapons in the Fatal radius are disabled until repaired. Harmless to people, except those with cybernetic organs.",
      group="Grenades"),
    W("Plasma Grenade", GR, "explosive", NONE, "", None, "10,000cr", R, blast=(80, 30, 8, 20), group="Grenades"),
    # Chain guns (p.117)
    W("Chain Gun", HW, "kinetic", CG, "2d10", 10, "1000cr", C, heavy=True, burst=("heavy", "6d10"), cover=True, divide=True, group="Chain Guns"),
    W("G910 Heavy Repeater", HW, "kinetic", CG, "2d10", 6, "7,600,000cr", R, heavy=True, burst=("heavy", "8d10"), cover=True, divide=True, group="Chain Guns"),
    W("Lance & Ferman Gimballed Minigun", HW, "kinetic", CG, "2d10", 10, "9,000,000cr", R, heavy=True, burst=("heavy", "6d10"), bonus=15, cover=True, divide=True,
      notes="Aimed through a linked firing helmet, which must be worn.", group="Chain Guns"),
    W("Maitz PP9 Support Cannon", HW, "kinetic", bands(("40m", 5), ("80m", 8), ("200m", 14)), "3d10", 10, "42,000,000cr", R, heavy=True,
      burst=("heavy", "10d10"), bonus=5, cover=True, divide=True, group="Chain Guns"),
    # Missile launchers (p.118)
    W("Missile Launcher (Anti-Personnel)", HW, "explosive", ML, "", 1, "200cr", C, heavy=True, blast=(50, 20, 10, 24), notes=HALF_SHIELDS, group="Missile Launchers"),
    W("Missile Launcher (Anti-Tank)", HW, "explosive", ML, "", 1, "700cr", C, heavy=True, blast=(100, 20, 2, 20), notes=HALF_SHIELDS, group="Missile Launchers"),
    W("Missile Launcher (Anti-Aircraft)", HW, "explosive", bands(("Min. 26m", None), ("2km", 10), ("6km", 13)), "", 1, "2000cr", C, heavy=True,
      blast=(120, 20, 2, 40), notes=f"{HALF_SHIELDS} Ignores the Range difficulty when attacking spacecraft.", group="Missile Launchers"),
    W("Acane Model 5 Bazooka", HW, "explosive", ML, "", 1, "97,000cr", R, heavy=True, blast=(60, 20, 10, 24), bonus=5, notes=HALF_SHIELDS, group="Missile Launchers"),
    W("ODO 15 Light Anti-Tank Weapon", HW, "explosive", ML, "", 1, "816,000cr", R, heavy=True, blast=(130, 30, 2, 20), notes=HALF_SHIELDS, group="Missile Launchers"),
    W("XLS Omega Recoilless Rifle", HW, "explosive", ML, "", 4, "23,300,000cr", R, heavy=True, blast=(60, 30, 10, 24), bonus=15,
      notes=f"{HALF_SHIELDS} Requires the Strong enhancement or cybernetic strength.", group="Missile Launchers"),
    # Plasma cannons (p.119)
    W("Plasma Cannon", HW, "energy", PC, "", 4, "4000cr", C, heavy=True, blast=(100, 40, 12, 34),
      notes="The firer is knocked over unless the weapon is tripod mounted.", group="Plasma Cannons"),
    W("Altair JP60 Accelerator", HW, "energy", PC, "", 2, "13,500,000cr", R, heavy=True, blast=(140, 50, 12, 34),
      notes="The firer is knocked over unless the weapon is tripod mounted.", group="Plasma Cannons"),
    # Melee weapons (p.120). Fighting is built into every character sheet.
    W("Club/Baton", MW, "melee", NONE, "1d10", None, "50mcr", C, one=True, finesse=6, group="Melee Weapons"),
    W("Sword", MW, "melee", NONE, "1d10", None, "100cr", C, one=True, finesse=4, group="Melee Weapons"),
    W("Knife", MW, "melee", NONE, "1d10", None, "1cr", C, one=True, finesse=7, group="Melee Weapons"),
    W("Axe/Hammer", MW, "melee", NONE, "2d10", None, "150mcr", C, finesse=8, group="Melee Weapons"),
    W("Spear", MW, "melee", NONE, "1d10", None, "5cr", C, one=True, finesse=6, notes="One or two handed: +2 damage when used two-handed.", group="Melee Weapons"),
    W("Chainsaw", MW, "melee", NONE, "3d10", None, "2cr", C, finesse=9, notes="After using it you cannot use the Dodge defence until the start of your next turn.", group="Melee Weapons"),
    W("Nanofibre Sword", MW, "melee", NONE, "3d10", None, "53,000cr", R, one=True, finesse=4, group="Melee Weapons"),
    W("Neo-Samurai Sword", MW, "melee", NONE, "2d10", None, "425,000cr", R, one=True, finesse=4, bonus=15, mods=[("parry", 10)], group="Melee Weapons"),
    W("Imperial Sabre", MW, "melee", NONE, "3d10", None, "31,000,000cr", R, one=True, finesse=4, bonus=20, mods=[("parry", 15)], group="Melee Weapons"),
]


def A(name, absorb, cost, rarity, *, hardened=None, discreet=False, sf=0, mods=None, toxic_all=False, enhancement="", notes=""):
    return dict(kind="armour", name=name, absorb=absorb, cost=cost, rarity=rarity, hardened=hardened, discreet=discreet,
                sf=sf, mods=mods or [], toxic_all=toxic_all, enhancement=enhancement, notes=notes)


ARMOUR = [
    A("Stab Vest", {"melee": 3}, "2cr", C, discreet=True),
    A("Bullet Proof Vest", {"kinetic": 5}, "4cr", C, discreet=True),
    A("Reflec Vest", {"energy": 3}, "60cr", C, discreet=True),
    A("Riot Armour", {"melee": 5, "fighting": 3}, "90cr", C, sf=-2, mods=[("athletics", -20)]),
    A("Reactive Armour", {"kinetic": 4, "energy": 2, "explosive": 8}, "50cr", C, sf=-2),
    A("Alloyed Breastplate", {"kinetic": 8, "energy": 3, "melee": 3}, "40,000cr", C, hardened=7, sf=-1, mods=[("athletics", -10)]),
    A("Reflec Breastplate", {"kinetic": 5, "energy": 5, "melee": 3}, "90,000cr", C, hardened=7, sf=-1, mods=[("athletics", -10)]),
    A("Assault Combat Armour", {"kinetic": 10, "energy": 4, "explosive": 6}, "2,700,000cr", R, hardened=6, sf=-2,
      mods=[("intimidate", 10), ("athletics", -20)]),
    A("Field Combat Armour", {"kinetic": 6, "energy": 6, "explosive": 6}, "4,000,000cr", R, hardened=6, sf=-2,
      mods=[("intimidate", 10), ("athletics", -20)]),
    A("Powered Armour", {"kinetic": 10, "energy": 6, "explosive": 10, "melee": 6}, "38,000,000cr", R, hardened=5, sf=-3,
      mods=[("intimidate", 20), ("athletics", -10)], toxic_all=True, enhancement="Strong",
      notes="Grants the Strong enhancement while worn; it stacks with other physical or cybernetic enhancements."),
]

ICONS = {
    "kineticWeapons": "icons/svg/target.svg",
    "energyWeapons": "icons/svg/lightning.svg",
    "heavyWeapons": "icons/svg/explosion.svg",
    "grenade": "icons/svg/explosion.svg",
    "meleeWeapons": "icons/svg/sword.svg",
    "armour": "icons/svg/shield.svg",
}


def doc_id(kind, name):
    return hashlib.sha1(f"edrpg-{kind}-{name}".encode()).hexdigest()[:16]


def weapon_doc(w, sort):
    burst_kind, burst_max = w["burst"] or ("none", "")
    fatal, injury, fr, ir = w["blast"] or (None, None, None, None)
    html = f"<p>{w['notes']}</p>" if w["notes"] else ""
    return {
        "name": w["name"], "type": "weapon", "img": ICONS[w["skill"]],
        "system": {
            "description": html, "cost": w["cost"], "rarity": w["rarity"], "location": "carried",
            "skill": w["skill"], "damageType": w["dtype"], "heavy": w["heavy"],
            "ranges": {k: {"distance": v[0], "dn": v[1]} for k, v in w["ranges"].items()},
            "finesse": w["finesse"], "damage": w["damage"],
            "rangeDamage": {"medium": w["range_damage"].get("medium", ""), "long": w["range_damage"].get("long", "")},
            "burst": {"kind": burst_kind, "max": burst_max},
            "blast": {"fatal": fatal, "injury": injury, "fatalRadius": fr, "injuryRadius": ir},
            "ammo": {"value": w["ammo"] or 0, "max": w["ammo"]},
            "oneHanded": w["one"], "destroyCover": w["cover"], "divideFire": w["divide"],
            "attackBonus": w["bonus"], "skillMods": [{"skill": s, "value": v} for s, v in w["mods"]],
            "notes": w["notes"], "equipped": False,
        },
        "flags": {"edrpg": {"group": w["group"]}}, "sort": sort,
    }


def armour_doc(a, sort):
    absorb = {t: a["absorb"].get(t, 0) for t in ["kinetic", "energy", "explosive", "fighting", "melee", "toxic"]}
    html = f"<p>{a['notes']}</p>" if a["notes"] else ""
    return {
        "name": a["name"], "type": "armour", "img": ICONS["armour"],
        "system": {
            "description": html, "cost": a["cost"], "rarity": a["rarity"], "location": "carried",
            "absorb": absorb, "toxicAll": a["toxic_all"], "hardened": a["hardened"], "discreet": a["discreet"],
            "wornOpenly": False, "socialFactor": a["sf"], "skillMods": [{"skill": s, "value": v} for s, v in a["mods"]],
            "enhancement": a["enhancement"], "worn": False,
        },
        "flags": {}, "sort": sort,
    }


def write_pack(pack, docs, kind):
    root = os.path.join(os.path.dirname(__file__), "..", "packs", "_source", pack)
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    # One compendium folder per group (Autopistols, Laser Pistols, ...), in book order.
    folders = {}
    for doc in docs:
        group = doc["flags"].get("edrpg", {}).get("group")
        if group and group not in folders:
            fid = doc_id("folder", f"{pack}-{group}")
            folders[group] = fid
            folder = {"_id": fid, "_key": f"!folders!{fid}", "name": group, "type": "Item", "folder": None,
                      "description": "", "sorting": "m", "sort": len(folders) * 100, "color": None, "flags": {}}
            with open(os.path.join(root, f"_folder-{re.sub(r'[^a-z0-9]+', '-', group.lower())}_{fid}.json"), "w") as fh:
                json.dump(folder, fh, indent=2)
                fh.write("\n")
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
    write_pack("weapons", [weapon_doc(w, (i + 1) * 100) for i, w in enumerate(WEAPONS)], "weapon")
    write_pack("armour", [armour_doc(a, (i + 1) * 100) for i, a in enumerate(ARMOUR)], "armour")
