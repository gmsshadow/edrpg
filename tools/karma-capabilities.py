"""
Source data for the Karma Capabilities compendium (Core Rules pp.31-36).

Names, costs and game mechanics only; the book's flavour text is deliberately left out and the
effects are paraphrased. Run `python3 tools/karma-capabilities.py` to regenerate
packs/_source/karma-capabilities/*.json, then `npm run packs` to compile the LevelDB pack.
"""
import hashlib, json, os, re

P, V, S, VS, ANY, GEN = "personal", "vehicle", "spaceship", "vehicleSpaceship", "anyCombat", "general"
D, O, X = "defensive", "offensive", "other"

# (name, role, category, cost, prerequisite, effect)   cost "all" = every Karma point
CAPABILITIES = [
    # Defensive
    ("Avoid Lock", D, V, 3, None, "Missiles cannot target your vehicle until your next turn."),
    ("Break Right!", D, V, 2, None, "+2 to your Vehicle Defence against an attack that would hit you."),
    ("Dive Aside", D, P, 5, None, "+5 to your Defence (Dodge) against an attack that would hit you."),
    ("Duck!", D, P, 2, None, "+2 to your Defence (Dodge) against an attack that would hit you."),
    ("Get Down!", D, P, 3, None, "Choose an ally who can see and hear you: they gain +2 to their Defence (Dodge or Parry) against an attack that just hit them."),
    ("Get Me Outta Here!", D, VS, 3, None, "+4 to your Pursuit check when disengaging."),
    ("Get Some Grip", D, V, 2, None, "+5 to your Vehicle Piloting check to avoid Obstacles."),
    ("Handbrake Turn", D, V, 5, None, "+5 to your Vehicle Defence against an attack that would hit you."),
    ("Incoming!", D, P, 3, None, "If you are in an explosive's fatal radius, move into its injury radius; if you are in the injury radius, move out of it. Anyone adjacent to you may do the same."),
    ("Jink", D, S, 2, None, "+2 to your Spaceship Defence against an attack that would hit you."),
    ("Last Minute Deflection", D, P, 3, None, "+3 to your Parry against an attack that would hit you."),
    ("Spin Wildly", D, S, 5, None, "+5 to your Spaceship Defence against an attack that would hit you."),
    ("Stay Standing", D, P, 1, None, "An attack that just hit you does not knock you down."),
    # Offensive
    ("Blur of Steel", O, P, 3, None, "+2 to the Melee attack you just made."),
    ("Crack Shot", O, P, 4, None, "+2 to the Kinetic, Energy or Heavy Weapons attack you just made."),
    ("Eat Lead Sucker!", O, P, 5, None, "If you hit with a Burst weapon, inflict maximum Burst damage."),
    ("Fire in the Hold!", O, P, 3, None, "Re-roll the scatter when you miss with a grenade."),
    ("Hard Boiled", O, P, 8, "A one-handed Energy or Kinetic weapon in each hand, and you are not knocked over.",
     "Make two ranged attacks, one with each weapon, with no penalty for using two weapons. Your Defence (Dodge) is 10 until your next turn, whatever your Dodge skill."),
    ("I Have You Now…", O, S, 3, None, "+2 to your current Dogfighting check."),
    ("In There First", O, ANY, 3, None, "+5 to your Initiative check."),
    ("Instinctive Aim", O, S, 4, None, "+2 to the Spaceship or Vehicle attack you just made."),
    ("Karmic Missile", O, S, 3, None, "ECM and Point Defence countermeasures have no effect against this missile attack."),
    ("Line 'em Up!", O, S, 3, None, "When firing broadsides, you may keep firing turrets at the same target even after a turret misses."),
    ("Point Blank Shot", O, P, 3, None, "Attacking at point-blank range does not provoke a free attack."),
    ("Power Bounce", O, V, 5, "You start up-close in vehicle combat, moving at Speed 3 or more.",
     "Use your action to bound away: fire your turret (if you have one) at any target up-close, then move to at-distance. Enemies cannot pursue you."),
    ("Riposte", O, P, 1, "An enemy's counter-attack against you missed while you were using your Parry defence.",
     "Counter-attack the enemy's counter-attack."),
    ("Slam", O, P, 2, "You have just hit an opponent with a Melee or Fighting attack.",
     "The enemy is knocked over, whatever the damage result."),
    ("Spinning Kick", O, P, 3, "You have just Parried and the enemy missed you.",
     "Make a Fighting attack against that enemy; they add no Parry or Dodge bonus against it. You may then make a counter-attack."),
    ("Sucker Punch", O, P, 2, "You have just made a Fighting attack, hit or miss.",
     "Make another Fighting attack immediately, ignoring the enemy's Dodge or Parry bonus."),
    ("Swipe", O, V, 4, None,
     "Instead of firing your weapons, make a Ram attack at +2 To Hit. On a hit you take half the normal damage and do not go out of control; the enemy takes full damage and must make two Obstacle checks in their next turn."),
    ("Without Even Looking…", O, P, 4, "A one-handed Energy or Kinetic weapon in hand, and you have just attacked and hit an opponent in front of you.",
     "Make a ranged attack with that weapon against a different enemy behind or beside you, with no To Hit penalty."),
    ("Worse Than It Looks", O, S, 3, None, "No To Hit penalties when targeting a ship's components."),
    # Skill-based & other
    ("Diligent Medic", X, GEN, 3, None, "Use a Medpack on someone again, even if they have been treated within the last six hours."),
    ("Everybody Pipe Down", X, GEN, 4, None, "You and your allies gain +2 to Stealth checks."),
    ("Ghost", X, GEN, 2, None, "+4 to Stealth checks when following someone."),
    ("Honey Trap", X, GEN, 4, "A non-hostile situation.",
     "Instead of Charming the target, seduce them (if they could be attracted to you): make a Charm check against their Insight check. On a success they cannot add their Insight bonus against your further Charm, Bargain or Diplomacy checks."),
    ("Liar, Liar!", X, GEN, 2, None, "+4 to an Insight check made to tell whether someone is lying to you."),
    ("Resuscitate", X, GEN, 8, "A party member was killed within the last minute.",
     "Make a Difficulty 13 Medicine check. On a success they do not die, but stay unconscious for 24 hours at 0 Endurance. You may try again while you have the Karma."),
    ("Skill Boost", X, GEN, 2, "When you take this capability, choose a skill that is not a Personal Combat or Vehicle skill and add it to the name (e.g. Skill Boost – Athletics).",
     "+2 to your chosen skill for this check."),
    # Free
    ("Escape Death", D, ANY, "all", "You have at least 1 Karma point.",
     "You escape or avoid an attack that just killed you or reduced your Endurance below 1. Your Karma points drop to 0."),
]

ICONS = {D: "icons/svg/shield.svg", O: "icons/svg/sword.svg", X: "icons/svg/book.svg"}


# Bonuses the attack card can apply: name -> (attackBonus, attackApplies, defenceBonus, defenceApplies)
BOOSTS = {
    "Blur of Steel": (2, "melee", 0, ""),
    "Crack Shot": (2, "ranged", 0, ""),
    "Duck!": (0, "", 2, "dodge"),
    "Dive Aside": (0, "", 5, "dodge"),
    "Last Minute Deflection": (0, "", 3, "parry"),
}


# Supplements: (source, name, role, category, cost, prerequisite, effect)
ESP, EXP, MIL, ST = "Espionage Supplement", "Exploration Supplement", "Military Sourcebook", "Super Traders Supplement"
SUPPLEMENT_CAPABILITIES = [
    (ESP, "Follow Up", O, P, 6, "You have just hit an opponent with a ranged weapon.",
     "Make another attack with the same weapon against that opponent immediately."),
    (ESP, "Kiss, Kiss, Bang, Bang", O, P, 4, "You are alone with your target and have just made a successful Charm check.",
     "You automatically hit the target with a One-Handed weapon you are carrying. A Burst weapon rolls its maximum "
     "number of dice; any other weapon inflicts double damage."),
    (ESP, "Quick Loader", X, P, 2, "You have just used the last ammo point of the weapon you are firing, and have a spare clip.",
     "Reload the weapon immediately; it doesn't use your next turn's action."),
    (ESP, "Weak Point", O, P, 3, "You have just hit an opponent with a ranged attack but haven't rolled the damage.",
     "The opponent makes a Hardened armour check (armour without the Hardened quality fails automatically). On a "
     "failure their armour gives no protection against this attack's damage."),
    (EXP, "Hunter", O, P, 1, None,
     "When making an attack roll against an Alien Animal or Biomod, add your Survival bonus to the roll as well as "
     "the weapon Skill bonus."),
    (EXP, "Iron Willed", D, P, 3, None,
     "You are unaffected by an attack or condition that would make you hallucinate or lose control of your actions."),
    (EXP, "Concentration", X, GEN, 3, "You have just failed a Skill check.", "Re-roll the failed Skill check."),
    (EXP, "Don't Give Out on Me Yet!", D, S, 5, "A component has just been reduced to 0 Strength by a critical hit.",
     "The component is reduced to 5 Strength instead, and still functions."),
    (MIL, "3D Thinking", D, S, 2, "You have just completed the Flight Assist Off action.",
     "Keep your spaceship's Agility when calculating your Defence."),
    (MIL, "Drill Sergeant", X, GEN, 1, None,
     "Double your Skill bonus for a Social skill check made to influence military personnel."),
    (MIL, "Instinct", X, VS, 4, None,
     "When you or an opponent makes a Chicken attack, your opponent must declare impact or evade before you do."),
    (MIL, "Penetrating Shot", O, P, 5, None, "When your opponent takes damage, their armour's absorption is ignored for this attack."),
    (ST, "Burnout", O, S, 3, "Your attack has damaged the enemy spaceship's hull.",
     "This attack becomes a critical hit."),
    (ST, "Rapid Deployment", O, S, 3, "You are flying a fighter that has just launched, or one has just launched from your hangar.",
     "The ship-launched fighter takes its turn immediately (use it yourself, or grant it to the fighter). After this "
     "free turn, roll Initiative for the fighter as normal and resume the mothership's turn."),
    (ST, "Secret Markets", X, GEN, 2, None,
     "Re-roll a result you or the GM just made on the Advanced Trading tables, then choose which result applies."),
    (ST, "Terrain Breaking", X, V, 1, None,
     "Unless the ground is perfectly flat (a road, an ice sheet…), you can accelerate or decelerate 1 point more "
     "than normal this turn."),
]


def doc_id(name):
    return hashlib.sha1(f"edrpg-karma-{name}".encode()).hexdigest()[:16]


def main():
    root = os.path.join(os.path.dirname(__file__), "..", "packs", "_source", "karma-capabilities")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    sources = ["Core Rules", ESP, EXP, MIL, ST]
    folders = {}
    for i, src in enumerate(sources):
        fid = doc_id(f"folder-{src}")
        folders[src] = fid
        with open(os.path.join(root, f"_folder-{re.sub(r'[^a-z0-9]+', '-', src.lower())}_{fid}.json"), "w") as fh:
            json.dump({"_id": fid, "_key": f"!folders!{fid}", "name": src, "type": "Item", "folder": None, "description": "",
                       "sorting": "a", "sort": (i + 1) * 100, "color": None, "flags": {}}, fh, indent=2)
            fh.write("\n")
    entries = [("Core Rules", *c) for c in CAPABILITIES] + list(SUPPLEMENT_CAPABILITIES)
    for sort, (source, name, role, category, cost, prereq, effect) in enumerate(entries):
        _id = doc_id(name)
        html = ""
        if prereq:
            html += f"<p><strong>Prerequisite:</strong> {prereq}</p>"
        html += f"<p><strong>Effect:</strong> {effect}</p>"
        if source != "Core Rules":
            html += f"<p><em>{source}</em></p>"
        escape = name == "Escape Death"
        doc = {
            "_id": _id,
            "_key": f"!items!{_id}",
            "name": name,
            "type": "karma",
            "img": "icons/svg/skull.svg" if escape else ICONS[role],
            "system": {
                "description": html,
                "role": role,
                "category": category,
                "cost": 0 if cost == "all" else cost,
                "costAll": cost == "all",
                "free": escape,
                "usedThisTurn": False,
                "attackBonus": BOOSTS.get(name, (0, "", 0, ""))[0],
                "attackApplies": BOOSTS.get(name, (0, "", 0, ""))[1],
                "defenceBonus": BOOSTS.get(name, (0, "", 0, ""))[2],
                "defenceApplies": BOOSTS.get(name, (0, "", 0, ""))[3],
                "preventsKnockdown": name == "Stay Standing",
                "usesPerBattle": 1,
                "timesUsed": 0,
            },
            "effects": [],
            "folder": folders[source],
            "sort": (sort + 1) * 100,
            "ownership": {"default": 0},
            "flags": {},
        }
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        with open(os.path.join(root, f"{slug}_{_id}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"{len(entries)} capabilities written to {os.path.normpath(root)}")


if __name__ == "__main__":
    main()
