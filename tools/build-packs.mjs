/**
 * Compile packs/_source/<pack>/*.json into Foundry LevelDB packs at packs/<pack>,
 * or with --extract, unpack them back to JSON (after editing a compendium inside Foundry).
 */
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";

const SOURCE = "packs/_source";
const extract = process.argv.includes("--extract");

for (const pack of readdirSync(SOURCE, { withFileTypes: true }).filter((d) => d.isDirectory())) {
   const src = path.join(SOURCE, pack.name);
   const dest = path.join("packs", pack.name);
   if (extract) {
      await extractPack(dest, src, { clean: true });
      console.log(`Extracted ${dest} -> ${src}`);
   } else {
      rmSync(dest, { recursive: true, force: true });
      await compilePack(src, dest);
      console.log(`Compiled ${src} -> ${dest}`);
   }
}
