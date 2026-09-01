const packageFiles = [
  "package.json",
  "apps/mcli/package.json",
  "apps/mcp/package.json",
  "apps/mtui/package.json",
  "packages/shared/package.json",
] as const;

const args = process.argv.slice(2);
const version = args[0];
const rootIndex = args.indexOf("--root");
const root = rootIndex === -1 ? process.cwd() : args[rootIndex + 1];

if (!version || !/^\d+\.\d+\.\d+(?:[-.][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("Usage: bun scripts/update-release-package-versions.ts <version> [--root <directory>]");
}

if (!root) {
  throw new Error("--root requires a directory");
}

for (const relativePath of packageFiles) {
  const filePath = `${root}/${relativePath}`;
  const contents = await Bun.file(filePath).text();
  const matches = contents.match(/^  "version": "[^"]+",$/gm);

  if (matches?.length !== 1) {
    throw new Error(`Expected exactly one top-level version in ${relativePath}`);
  }

  const updated = contents.replace(matches[0], `  "version": "${version}",`);
  if (updated !== contents) {
    await Bun.write(filePath, updated);
    console.log(`Updated ${relativePath} to ${version}`);
  }
}
