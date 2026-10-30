"""
Source data for the Backgrounds and Enhancements compendia (Core Rules pp.15-25).

Names, skill bonuses and game mechanics only; the book's flavour text is left out. Run
`python3 tools/backgrounds.py` to regenerate packs/_source/backgrounds and packs/_source/enhancements,
then `npm run packs`.
"""
import hashlib, json, os, re

HERE = os.path.dirname(__file__)

# Book skill names -> system skill keys.
SKILLS = {
    "Athletics": "athletics", "Bargain": "bargain", "Bluff": "bluff", "Charm": "charm", "Computer": "computer",
    "Culture & Law": "cultureLaw", "Cyber": "cyber", "Diplomacy": "diplomacy", "Dodge": "dodge",
    "Energy Weapons": "energyWeapons", "Fighting": "fighting", "Gambling": "gambling", "Grenade": "grenade",
    "Heavy Weapons": "heavyWeapons", "Insight": "insight", "Intimidate": "intimidate",
    "Kinetic Weapons": "kineticWeapons", "Medicine": "medicine", "Melee Weapons": "meleeWeapons",
    "Navigation": "navigation", "Parry": "parry", "Perception": "perception",
    "Planetary Knowledge": "planetaryKnowledge", "Repair": "repair", "Science": "science", "Security": "security",
    "Sleight of Hand": "sleightOfHand", "Spaceship Piloting": "shipPiloting", "Spaceship Weapons": "shipWeapons",
    "Stealth": "stealth", "Streetwise": "streetwise", "Survival": "survival", "Systems": "systems",
    "Tactics": "tactics", "Trading": "trading", "Vehicle Piloting": "vehiclePiloting",
    "Vehicle Weapons": "vehicleWeapons",
}


def S(text):
    """'Dodge +10, Fighting +10' -> [(key, 10), ...]"""
    out = []
    for part in text.split(","):
        name, bonus = part.strip().rsplit("+", 1)
        out.append((SKILLS[name.strip()], int(bonus)))
    return out


# (name, choices, d100, skills, enhancements [(name, skill)], options)
BACKGROUNDS = [
    ("Accountant", 1, "01", "Bluff +10, Computer +10, Culture & Law +20, Dodge +10", []),
    ("Anarchist", 1, "02-03", "Dodge +10, Fighting +10, Grenade +20, Intimidate +10", []),
    ("Army Trained", 2, "04-06", "Dodge +10, Energy Weapons +20, Fighting +10, Grenade +10, Heavy Weapons +10, Kinetic Weapons +20, Medicine +10, Vehicle Weapons +10", []),
    ("Borderland Homeworld", 1, "07-08", "Dodge +10, Fighting +10, Kinetic Weapons +10, Repair +10, Survival +10", []),
    ("Born on the Streets", 1, "09-10", "Stealth +10, Streetwise +20", [("Tough", "")]),
    ("Boxer", 1, "11-12", "Fighting +20, Parry +10", [("Strong", "")]),
    ("Cheerleader", 1, "13-14", "Athletics +20, Charm +10, Sleight of Hand +10, Stealth +10", []),
    ("Child Actor", 1, "15", "Bluff +20, Diplomacy +20, Melee Weapons +10", []),
    ("Community Youth Worker", 1, "16-17", "Insight +20, Kinetic Weapons +10, Parry +10, Streetwise +10", []),
    ("Computer Game Designer", 1, "18-19", "Computer +20, Spaceship Piloting +10, Tactics +10, Vehicle Piloting +10", []),
    ("Criminal Family", 1, "20-21", "Bluff +10, Charm +10, Gambling +10, Security +10, Stealth +10", []),
    ("Cyborg", 1, "22-23", "", [], {"notes": "Start with 100,000 credits' worth of Cybernetics."}),
    ("Docking Bay Operative", 1, "24-25", "Navigation +10, Planetary Knowledge +10, Repair +10, Security +10, Trading +10", []),
    ("Engineer", 1, "26-27", "Computer +10, Cyber +10, Energy Weapons +10, Repair +20", []),
    ("Explorer Corp", 1, "28-29", "Navigation +20, Planetary Knowledge +10, Survival +10, Vehicle Piloting +10", []),
    ("Fighter Pilot", 1, "30-31", "Spaceship Piloting +10, Spaceship Weapons +10, Systems +20, Tactics +10", []),
    ("Freedom Fighter", 1, "32-33", "Dodge +10, Energy Weapons +10, Grenade +10, Stealth +10, Vehicle Piloting +10", []),
    ("Frontier Trader", 1, "34-35", "Bargain +10, Dodge +10, Kinetic Weapons +10, Trading +20", []),
    ("Fuel Rat", 1, "36", "Navigation +20, Planetary Knowledge +10, Spaceship Piloting +10, Trading +10", []),
    ("Gene Mod Baby", 1, "37-38", "", [], {"enhancementChoices": 2, "notes": "Choose any two Enhancements."}),
    ("Gym Freak", 1, "39-40", "Athletics +10", [("Quick Runner", ""), ("Strong", "")]),
    ("Hacker", 1, "41-42", "Computer +20, Security +10", [("Natural Genius", "computer")]),
    ("High Tech Homeworld", 1, "43-44", "Computer +10, Cyber +10, Energy Weapons +10, Science +10, Systems +10", []),
    ("Hoopy Casino Croupier", 1, "45-46", "Gambling +20, Perception +10, Sleight of Hand +20", []),
    ("Lave Radio Host", 1, "47", "Bluff +20, Charm +10, Insight +20", []),
    ("Martial Artist", 2, "48-49", "Athletics +20, Dodge +20, Fighting +20, Melee Weapons +20, Parry +20", []),
    ("Mercenary", 2, "50-51", "Dodge +20, Fighting +10, Heavy Weapons +20, Kinetic Weapons +10, Tactics +10, Vehicle Weapons +10", [("Tough", "")]),
    ("Mining Engineer", 1, "52-53", "Grenade +10, Heavy Weapons +20, Repair +10, Systems +10", []),
    ("Minor Politician", 1, "54", "Bargain +10, Culture & Law +10, Diplomacy +10, Perception +10, Tactics +10", []),
    ("Monk/Nun", 1, "55", "Fighting +10, Insight +20, Medicine +10, Stealth +10", []),
    ("Navy Trained", 2, "56-58", "Dodge +10, Energy Weapons +10, Fighting +10, Repair +20, Security +10, Spaceship Piloting +10, Spaceship Weapons +10, Systems +20", []),
    ("Officer", 1, "59-60", "Diplomacy +10, Intimidate +10, Perception +10, Tactics +20", [], {"requires": "Army Trained, Navy Trained"}),
    ("Partner", 1, "61-62", "", [], {"partner": True, "notes": "You gain a partner: use Create partner on this background's card. A partner's partner can't take this background."}),
    ("Petty Criminal", 1, "63-64", "Fighting +10, Kinetic Weapons +10, Parry +10, Sleight of Hand +10, Streetwise +10", []),
    ("Pilot Trained", 1, "", "Spaceship Piloting +20, Spaceship Weapons +20, Systems +10", [],
     {"free": True, "pilot": True, "notes": "Every player character has this for free (the sheet adds it automatically). Add it only to NPCs or partners who should have it."}),
    ("Police Officer", 2, "65-66", "Culture & Law +10, Diplomacy +10, Dodge +10, Energy Weapons +20, Fighting +10, Perception +20, Spaceship Piloting +10, Spaceship Weapons +10", []),
    ("Private Detective", 1, "67-68", "Energy Weapons +10, Insight +10, Perception +10, Security +10, Stealth +10", []),
    ("Ran Away from Home", 1, "69-70", "Dodge +10, Perception +10, Sleight of Hand +10, Streetwise +10, Survival +10", []),
    ("Scientist", 1, "71-72", "Computer +10, Science +20", [("Natural Genius", "science")]),
    ("Scout Leader", 1, "73-74", "Athletics +10, Charm +10, Kinetic Weapons +10, Navigation +10, Survival +10", []),
    ("Second Hand Spaceship Dealer", 1, "75-76", "Bargain +20, Planetary Knowledge +10, Repair +10, Trading +10", []),
    ("Secret Agent", 2, "77-78", "Bluff +10, Charm +10, Computer +10, Dodge +10, Energy Weapons +10, Insight +10, Security +20, Stealth +20", []),
    ("Self-Taught", 1, "79-80", "", [], {"blank": [10, 10], "enhancementChoices": 1,
     "notes": "Any two Skills +10 (choose them in the skill list), and gain an Enhancement of your choice."}),
    ("Ship Hand", 1, "80-81", "Kinetic Weapons +10, Repair +10, Spaceship Weapons +10, Systems +20", []),
    ("Sports College", 1, "82-83", "Athletics +20, Dodge +10", [("Quick Runner", "")]),
    ("Stockbroker", 1, "84-85", "Bluff +10, Fighting +10, Intimidate +10, Trading +20", []),
    ("Teacher", 1, "86-87", "Culture & Law +10, Diplomacy +10, Intimidate +10, Perception +10, Science +10", []),
    ("Trained Doctor", 1, "88-89", "Cyber +20, Medicine +20, Science +10", []),
    ("Treasure Hunter", 1, "89-90", "Fighting +10, Kinetic Weapons +10, Navigation +10, Planetary Knowledge +10, Vehicle Piloting +10", []),
    ("Trucker", 1, "91-92", "Trading +10, Vehicle Piloting +10, Vehicle Weapons +10", [("Tough", "")]),
    ("University Graduate", 1, "93-94", "", [], {"blank": [20, 10, 10],
     "notes": "One Intelligence Skill +20 and two Intelligence Skills +10 (choose them in the skill list)."}),
    ("Vehicle Nut", 1, "95-96", "Repair +10, Vehicle Piloting +20, Vehicle Weapons +20", []),
    ("Wise Guy", 2, "97-00", "Dodge +10, Gambling +10, Heavy Weapons +10, Kinetic Weapons +10, Medicine +10, Melee Weapons +10, Streetwise +20, Tactics +10, Vehicle Weapons +10", []),
]

# (name, effect, mechanics)
ENHANCEMENTS = [
    ("Ambidextrous", "ambidextrous",
     "No main hand. Attacking with a weapon in each hand: -1 To Hit instead of -2. Taken again: no penalty at all."),
    ("Awareness", "awareness", "Roll Initiative with your Perception bonus instead of your Tactics bonus."),
    ("Confident", "confident", "No Social Factor penalties from your equipment, armour or cybernetics."),
    ("Cybernetic Affinity", "cyberneticAffinity",
     "Gain 2 Karma points that can only be spent on Cybernetic upgrades. Each time you take it again: another 2."),
    ("Dynamic Karma", "dynamicKarma",
     "When you use two Karma Capabilities during your turn, pay only for the most expensive. Taken again: three "
     "capabilities, paying only for the most expensive. Only during your own turn (not when Dodging, Parrying or "
     "counter-attacking)."),
    ("Hard to Kill", "hardToKill",
     "You die only when your Endurance reaches a negative number equal to your maximum Endurance (instead of half). "
     "Taken again: Escape Death costs at most 4 Karma points."),
    ("Natural Genius", "naturalGenius",
     "One Skill (named by your background, or your choice) has its Skill Cap raised by 10, to a maximum of 100. "
     "Remains 10 higher at every Rank."),
    ("Quick Runner", "quickRunner", "Move 2 metres further per turn. Stacks up to three times."),
    ("Strong", "strong",
     "+2 damage in Fighting and Melee combat; lift an extra 20kg (a normal person lifts 80kg). Stacks, but the "
     "damage bonus cannot exceed +10."),
    ("Tough", "tough", "Endurance +5. Stacks, up to the natural human maximum of 80 Endurance (without cybernetics)."),
]

ICONS = {"background": "icons/svg/book.svg", "enhancement": "icons/svg/upgrade.svg"}


def doc_id(kind, name):
    return hashlib.sha1(f"edrpg-{kind}-{name}".encode()).hexdigest()[:16]


def clean(root):
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))


def write(root, doc):
    slug = re.sub(r"[^a-z0-9]+", "-", doc["name"].lower()).strip("-")
    with open(os.path.join(root, f"{slug}_{doc['_id']}.json"), "w") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def background_doc(entry, sort):
    name, choices, roll, skills, grants, *rest = entry
    opts = rest[0] if rest else {}
    _id = doc_id("background", name)
    mods = [{"skill": k, "bonus": b} for k, b in (S(skills) if skills else [])]
    mods += [{"skill": "", "bonus": b} for b in opts.get("blank", [])]
    html = ""
    if roll:
        html += f"<p><strong>Random background (D100):</strong> {roll}</p>"
    if opts.get("requires"):
        html += f"<p><strong>Requires:</strong> {opts['requires'].replace(', ', ' or ')} background.</p>"
    if skills:
        html += f"<p><strong>Skills:</strong> {skills}</p>"
    if grants:
        names = [f"{n} ({next(k for k, v in SKILLS.items() if v == s)})" if s else n for n, s in grants]
        html += f"<p><strong>Enhancement{'s' if len(names) > 1 else ''}:</strong> {' &amp; '.join(names)}</p>"
    if opts.get("notes"):
        html += f"<p>{opts['notes']}</p>"
    return {
        "_id": _id, "_key": f"!items!{_id}", "name": name, "type": "background", "img": ICONS["background"],
        "system": {
            "description": html, "choices": choices, "free": opts.get("free", False), "skills": mods,
            "enhancements": [{"name": n, "skill": s} for n, s in grants],
            "enhancementChoices": opts.get("enhancementChoices", 0), "requires": opts.get("requires", ""),
        },
        "effects": [], "folder": None, "sort": sort, "ownership": {"default": 0},
        "flags": {"edrpg": {"pilotTrained": True}} if opts.get("pilot") else {"edrpg": {"partner": True}} if opts.get("partner") else {},
    }


def enhancement_doc(entry, sort):
    name, effect, text = entry
    _id = doc_id("enhancement", name)
    return {
        "_id": _id, "_key": f"!items!{_id}", "name": name, "type": "enhancement", "img": ICONS["enhancement"],
        "system": {"description": f"<p>{text}</p>", "effect": effect, "skill": ""},
        "effects": [], "folder": None, "sort": sort, "ownership": {"default": 0}, "flags": {},
    }


def main():
    # Sanity check: a background choice is worth 50 points, an Enhancement 20.
    for entry in BACKGROUNDS:
        name, choices, _, skills, grants, *rest = entry
        opts = rest[0] if rest else {}
        if not skills or opts.get("blank"):
            continue
        total = sum(b for _, b in S(skills)) + 20 * len(grants)
        if total != 50 * choices:
            print(f"warning: {name} totals {total}")

    root = os.path.join(HERE, "..", "packs", "_source", "backgrounds")
    clean(root)
    for i, entry in enumerate(BACKGROUNDS):
        write(root, background_doc(entry, (i + 1) * 100))
    print(f"{len(BACKGROUNDS)} backgrounds written to {os.path.normpath(root)}")

    root = os.path.join(HERE, "..", "packs", "_source", "enhancements")
    clean(root)
    for i, entry in enumerate(ENHANCEMENTS):
        write(root, enhancement_doc(entry, (i + 1) * 100))
    print(f"{len(ENHANCEMENTS)} enhancements written to {os.path.normpath(root)}")


if __name__ == "__main__":
    main()
