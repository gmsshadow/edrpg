"""
Sample opponents for testing combat (Core Rules ch. 11). A small set only; the full opponent
compendium comes later. Stat-block numbers and mechanics only, no flavour text.

Run `python3 tools/opponents.py` (after tools/equipment.py and tools/karma-capabilities.py exist),
then `npm run packs`.
"""
import copy, hashlib, importlib.util, json, os, re

HERE = os.path.dirname(__file__)


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), os.path.join(HERE, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


eq = load("equipment")
karma = load("karma-capabilities")
WEAPONS = {w["name"]: w for w in eq.WEAPONS}
ARMOUR = {a["name"]: a for a in eq.ARMOUR}
KARMA = {c[0]: c for c in karma.CAPABILITIES}


def oid(*parts):
    return hashlib.sha1(("edrpg-opponent-" + "-".join(parts)).encode()).hexdigest()[:16]


def weapon(name, **over):
    """A compendium weapon, equipped, with optional overrides of its system data."""
    doc = eq.weapon_doc(WEAPONS[name], 0)
    doc["system"]["equipped"] = True
    for k, v in over.items():
        if k == "name":
            doc["name"] = v
        else:
            doc["system"][k] = v
    return doc


def custom_weapon(name, skill, dtype, damage, *, finesse=None, ranges=None, toHit=None, burst=None, ammo=None, notes=""):
    """A natural or built-in attack that isn't in the equipment lists."""
    w = eq.W(name, skill, dtype, ranges or eq.NONE, damage, ammo, "", "common", finesse=finesse, burst=burst, notes=notes)
    return weapon_from(w, toHit)


def weapon_from(w, toHit=None):
    doc = eq.weapon_doc(w, 0)
    doc["system"].update(equipped=True, toHit=toHit, cost="", description="")
    return doc


def armour(name=None, **custom):
    if name:
        doc = eq.armour_doc(ARMOUR[name], 0)
    else:
        doc = eq.armour_doc(eq.A(custom.pop("label"), custom.pop("absorb"), "", "common", **custom), 0)
        doc["system"]["description"] = ""
    doc["system"]["worn"] = True
    return doc


def karma_item(name, uses=1):
    _, role, category, cost, _, _ = KARMA[name]
    boost = karma.BOOSTS.get(name, (0, "", 0, ""))
    return {
        "name": name, "type": "karma", "img": karma.ICONS[role],
        "system": {
            "description": "", "role": role, "category": category, "cost": 0 if cost == "all" else cost,
            "costAll": cost == "all", "free": False, "usedThisTurn": False,
            "attackBonus": boost[0], "attackApplies": boost[1], "defenceBonus": boost[2], "defenceApplies": boost[3],
            "preventsKnockdown": name == "Stay Standing", "usesPerBattle": uses, "timesUsed": 0,
        },
        "flags": {},
    }


def notes(*paras):
    return "".join(f"<p>{p}</p>" for p in paras)


SR = "kineticWeapons"
OPPONENTS = [
    dict(name="Army Soldier", rank="novice", role="Soldier", dodge=3, parry=2, endurance=25, initiative=1,
         perception=2, speed="10m", toHit=3, equipment="Med Pac",
         items=[weapon("Laser Rifle"), weapon("Knife")],
         notes=notes("Variants: a Medic adds Medicine +3; a Sniper swaps the Laser Rifle for a sniper rifle; a Sergeant adds Leadership +3.")),
    dict(name="Heavy Weapons Support", rank="competent", role="Mercenary", dodge=4, parry=2, endurance=30, initiative=2,
         perception=3, speed="10m", toHit=4, equipment="Two spare missiles",
         items=[armour("Reflec Breastplate"), weapon("Missile Launcher (Anti-Personnel)"), weapon("Laser Pistol")]),
    dict(name="Borchuck", rank="harmless", role="Alien Animal", dodge=2, parry=None, endurance=15, initiative=1,
         perception=2, speed="12m", toHit=2, equipment="",
         items=[
             custom_weapon("Hoof", "fighting", "fighting", "1d10+2", finesse=5),
             custom_weapon("Slam", "fighting", "fighting", "2d10", finesse=6,
                           notes="If it knocks its target over, it makes a free Hoof attack."),
             custom_weapon("Toxic Vomit", SR, "toxic", "2d10", ranges=eq.bands(("2m", 5), ("6m", 8), ("10m", 12))),
         ]),
    dict(name="Junga Pattern Walker Drone", rank="mostlyHarmless", role="High Threat Drone", dodge=None, parry=None,
         endurance=100, initiative=1, perception=1, speed="8m", toHit=2, equipment="",
         items=[
             armour(label="Armour Plating", absorb={"kinetic": 5, "energy": 5}),
             custom_weapon("Chain Gun", SR, "kinetic", "2d10", ranges=eq.CG, burst=("heavy", "6d10"), ammo=10,
                           notes="Auto-loader: reloads itself."),
             custom_weapon("Walker Punch", "fighting", "fighting", "2d10", finesse=7),
         ],
         notes=notes("Auto-loader: the Chain Gun reloads itself at no cost.",
                     "Slow Witted: cannot take reactions.",
                     "Mechanical: immune to toxic damage.",
                     "No Karma.")),
    dict(name="Unstoppable Assassin", rank="elite", role="High Threat Assassin", dodge=10, parry=10, endurance=80,
         initiative=10, perception=10, speed="16m", toHit=10, equipment="",
         skills=[("fighting", 10), ("stealth", 10)],
         items=[weapon("Imperial Sabre", toHit=10, damage="3d10+8", attackBonus=0, skillMods=[]),
                karma_item("Dive Aside", 3), karma_item("Riposte", 2), karma_item("Stay Standing", 3)],
         notes=notes("Fighting damage: 1D10/2+8.",
                     "Continuous Driving Attack: each turn it hits, it pushes its target back and follows.")),
]


def main():
    root = os.path.join(HERE, "..", "packs", "_source", "opponents")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    for sort, o in enumerate(OPPONENTS):
        _id = oid(o["name"])
        items = []
        for i, item in enumerate(o["items"]):
            item = copy.deepcopy(item)
            iid = oid(o["name"], item["name"])
            item.pop("sort", None)
            item["flags"] = {}
            items.append({"_id": iid, "_key": f"!actors.items!{_id}.{iid}", **item, "effects": [],
                          "folder": None, "sort": (i + 1) * 100, "ownership": {"default": 0}})
        doc = {
            "_id": _id, "_key": f"!actors!{_id}", "name": o["name"], "type": "opponent",
            "img": "icons/svg/mystery-man.svg",
            "system": {
                "rank": o["rank"], "role": o["role"], "dodge": o["dodge"], "parry": o["parry"],
                "initiative": o["initiative"], "perception": o["perception"], "toHit": o["toHit"], "speed": o["speed"],
                "endurance": {"value": o["endurance"], "max": o["endurance"]},
                "otherSkills": [{"skill": s, "bonus": b} for s, b in o.get("skills", [])],
                "equipment": o["equipment"], "notes": o.get("notes", ""),
            },
            "prototypeToken": {"name": o["name"], "actorLink": False, "disposition": -1,
                               "displayBars": 20, "bar1": {"attribute": "endurance"}, "bar2": {"attribute": None}},
            "items": items, "effects": [], "folder": None, "sort": (sort + 1) * 100,
            "ownership": {"default": 0}, "flags": {},
        }
        slug = re.sub(r"[^a-z0-9]+", "-", o["name"].lower()).strip("-")
        with open(os.path.join(root, f"{slug}_{_id}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"{len(OPPONENTS)} opponents written to {os.path.normpath(root)}")


if __name__ == "__main__":
    main()
