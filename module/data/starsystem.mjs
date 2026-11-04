/**
 * A star system made with the Star System Generator (Core Rules pp.330–337), or by hand.
 *
 * stars[0] is the Primary star; the rest are Companion stars. Each star lists the bodies orbiting it (distance in
 * light seconds), each with its rings and moons. Names are derived by the book's convention unless a body has its
 * own. The civilisation block holds the installations, economy, government and allegiance.
 */
const fields = foundry.data.fields;

const body = () =>
   new fields.SchemaField({
      zone: new fields.StringField({ initial: "inner" }),
      distance: new fields.NumberField({ required: true, nullable: false, initial: 100, min: 0 }),
      type: new fields.StringField({ initial: "rocky" }),
      // An orbiting star's type and mass (type "star").
      starType: new fields.StringField({ initial: "" }),
      mass: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      rings: new fields.StringField({ initial: "" }),
      moons: new fields.ArrayField(new fields.StringField()),
      name: new fields.StringField({ initial: "" }),
   });

export class StarSystemData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         stars: new fields.ArrayField(
            new fields.SchemaField({
               type: new fields.StringField({ initial: "M" }),
               mass: new fields.NumberField({ required: true, nullable: false, initial: 0.3, min: 0 }),
               name: new fields.StringField({ initial: "" }),
               bodies: new fields.ArrayField(body()),
            }),
         ),
         civ: new fields.SchemaField({
            inhabited: new fields.BooleanField({ initial: true }),
            economies: new fields.ArrayField(new fields.StringField()),
            government: new fields.StringField({ initial: "" }),
            allegiance: new fields.StringField({ initial: "" }),
            // kind: station | outpost | settlement; at: "star.body" or "star.body.moon" (indexes), or "".
            installations: new fields.ArrayField(
               new fields.SchemaField({
                  kind: new fields.StringField({ initial: "station" }),
                  name: new fields.StringField({ initial: "" }),
                  at: new fields.StringField({ initial: "" }),
               }),
            ),
         }),
         notes: new fields.HTMLField({ initial: "" }),
      };
   }
}
