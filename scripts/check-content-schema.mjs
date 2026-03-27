import { getContentRoot, loadCollection, validateEntry } from "../src/content-utils.mjs";

const contentRoot = getContentRoot();
const collections = ["blog", "changelog", "rules"];
const errors = [];
let count = 0;

for (const collection of collections) {
  const docs = loadCollection(contentRoot, collection);
  for (const doc of docs) {
    count += 1;
    errors.push(...validateEntry(doc));
  }
}

if (count === 0) errors.push("no content markdown documents found in source collections");

if (errors.length > 0) {
  console.error("content-schema-check: FAIL");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("content-schema-check: PASS");
console.log(`validated documents: ${count}`);
