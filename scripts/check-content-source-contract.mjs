import fs from "node:fs";
import path from "node:path";

const contract = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "contracts/content-source-contract.json"), "utf8")
);

if (!contract.policy?.sourceOfTruthLocked) {
  console.error("source lock must be enabled");
  process.exit(1);
}

const sourcePath = path.resolve(process.cwd(), contract.sourcePath);
if (!fs.existsSync(sourcePath)) {
  console.error(`source repo path not found: ${sourcePath}`);
  process.exit(1);
}

for (const collection of contract.consumedCollections) {
  const collectionPath = path.join(sourcePath, collection);
  if (!fs.existsSync(collectionPath)) {
    console.error(`missing content collection in source repo: ${collectionPath}`);
    process.exit(1);
  }
}

for (const forbidden of contract.policy.forbiddenLocalOverrides || []) {
  const forbiddenPath = path.resolve(process.cwd(), forbidden);
  if (fs.existsSync(forbiddenPath)) {
    console.error(`forbidden local content override present: ${forbidden}`);
    process.exit(1);
  }
}

console.log("content-source-contract-check: PASS");
console.log(`Kriegspiel/content source lock is valid at ${sourcePath}`);
