// @bun
// src/commands/file/rename/rename.ts
import fs from "fs/promises";
import path from "path";
function splitWords(s) {
  const parts = s.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).map((p) => p.trim()).filter(Boolean);
  return parts;
}
function transformBasename(basename, style) {
  if (!basename)
    return basename;
  const leadingDot = basename.startsWith(".") ? "." : "";
  let core = leadingDot ? basename.slice(1) : basename;
  let ext = "";
  const firstDot = core.indexOf(".");
  if (firstDot !== -1) {
    ext = core.slice(firstDot);
    core = core.slice(0, firstDot);
  }
  const words = splitWords(core);
  if (words.length === 0)
    return basename;
  switch (style) {
    case "title_underscore":
      return leadingDot + titleCase(words).join("_") + ext;
    case "snake":
      return leadingDot + words.map((w) => w.toLowerCase()).join("_") + ext;
    case "kebab":
      return leadingDot + words.map((w) => w.toLowerCase()).join("-") + ext;
    case "camel":
      return leadingDot + words.map((w, i) => i === 0 ? w.toLowerCase() : cap(w)).join("") + ext;
    case "pascal":
      return leadingDot + words.map(cap).join("") + ext;
    case "pascal_underscore":
      return leadingDot + titleCase(words).join("_") + ext;
    case "upper":
      return leadingDot + words.join("_").toUpperCase() + ext;
    case "lower":
      return leadingDot + words.join("_").toLowerCase() + ext;
    default:
      return leadingDot + core + ext;
  }
}
function isAllCaps(s) {
  return s.length > 0 && s === s.toUpperCase() && s !== s.toLowerCase();
}
function cap(s) {
  if (!s)
    return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}
function titleCase(words) {
  const smallWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "from",
    "in",
    "into",
    "nor",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with"
  ]);
  return words.map((word, index) => {
    if (isAllCaps(word)) {
      return word;
    }
    if (index === 0) {
      return cap(word);
    }
    if (smallWords.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return cap(word);
  });
}
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function uniqueDestination(dest) {
  if (!await exists(dest))
    return dest;
  const dir = path.dirname(dest);
  const parsed = path.parse(dest);
  let i = 1;
  while (true) {
    const candidate = path.join(dir, `${parsed.name}_${i}${parsed.ext}`);
    if (!await exists(candidate))
      return candidate;
    i++;
  }
}
async function safeRename(oldPath, newPath) {
  const oldLower = oldPath.toLowerCase();
  const newLower = newPath.toLowerCase();
  if (oldLower === newLower && oldPath !== newPath) {
    const tmp = newPath + "__tmp_renaming__";
    await fs.rename(oldPath, tmp);
    try {
      await fs.rename(tmp, newPath);
    } catch (err) {
      await fs.rename(tmp, oldPath).catch(() => {});
      throw err;
    }
  } else {
    const final = await uniqueDestination(newPath);
    if (final !== newPath) {
      await fs.rename(oldPath, final);
    } else {
      await fs.rename(oldPath, newPath);
    }
  }
}
async function updateFileReferences(filePath, renames) {
  const content = await fs.readFile(filePath, "utf-8");
  let updated = content;
  for (const { from, to } of renames) {
    const fromBasename = path.basename(from);
    const toBasename = path.basename(to);
    if (fromBasename === toBasename)
      continue;
    const fromWithoutExt = fromBasename.replace(/\.[^.]+$/, "");
    const toWithoutExt = toBasename.replace(/\.[^.]+$/, "");
    const importPattern1 = new RegExp(`(['"\`])([./]*(?:[^'"\`]*/)?)${escapeRegex(fromWithoutExt)}\\1`, "g");
    updated = updated.replace(importPattern1, (_match, quote, pathPart) => {
      return `${quote}${pathPart}${toWithoutExt}${quote}`;
    });
    const importPattern2 = new RegExp(`(['"\`])([./]*(?:[^'"\`]*/)?)${escapeRegex(fromBasename)}\\1`, "g");
    updated = updated.replace(importPattern2, (_match, quote, pathPart) => {
      return `${quote}${pathPart}${toBasename}${quote}`;
    });
  }
  if (updated !== content) {
    await fs.writeFile(filePath, updated, "utf-8");
    return true;
  }
  return false;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function isTextFile(filePath) {
  try {
    const fd = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await fd.read(buffer, 0, 512, 0);
    await fd.close();
    if (bytesRead === 0)
      return true;
    for (let i = 0;i < bytesRead; i++) {
      if (buffer[i] === 0)
        return false;
    }
    let printableCount = 0;
    for (let i = 0;i < bytesRead; i++) {
      const byte = buffer[i];
      if (byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13) {
        printableCount++;
      }
    }
    return printableCount / bytesRead > 0.85;
  } catch {
    return false;
  }
}
async function renameRecursive(root, style = "title_underscore", options = {}) {
  const performed = [];
  const updateContentEnabled = options.updateContent ?? true;
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isFile()) {
        const parsed = path.parse(e.name);
        const newBase = transformBasename(parsed.name, style) + parsed.ext;
        if (newBase !== e.name) {
          const dest = path.join(current, newBase);
          if (options.dryRun) {
            performed.push({ from: full, to: dest });
          } else {
            await safeRename(full, dest);
            performed.push({ from: full, to: dest });
          }
        }
      }
    }
    const entries2 = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries2) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        await walk(full);
        const newBase = transformBasename(e.name, style);
        if (newBase !== e.name) {
          const dest = path.join(current, newBase);
          if (options.dryRun) {
            performed.push({ from: full, to: dest });
          } else {
            await safeRename(full, dest);
            performed.push({ from: full, to: dest });
          }
        }
      }
    }
  }
  await walk(root);
  if (!options.dryRun && updateContentEnabled && performed.length > 0) {
    const filesToUpdate = [];
    async function collectFiles(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isFile()) {
          filesToUpdate.push(full);
        } else if (e.isDirectory()) {
          await collectFiles(full);
        }
      }
    }
    await collectFiles(root);
    for (const file of filesToUpdate) {
      try {
        if (await isTextFile(file)) {
          await updateFileReferences(file, performed);
        }
      } catch (err) {}
    }
  }
  return performed;
}
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  const args = process.argv.slice(2);
  const rootArg = args[0];
  const styleArg = args[1];
  if (args.includes("--help") || args.includes("-h") || args.includes("/help") || args.includes("/h") || args.includes("/?")) {
    console.log("Usage: rename <root> <style> [--dry|-n] [--no-update-content]");
    console.log("Styles: title_underscore, pascal_underscore, snake, kebab, camel, pascal, upper, lower");
    console.log("Options:");
    console.log("  --dry, -n              Preview changes without applying them");
    console.log("  --no-update-content    Skip updating import/require statements in files");
    process.exit(0);
  }
  const dryRun = args.includes("--dry") || args.includes("-n");
  const updateContent = !args.includes("--no-update-content");
  if (!rootArg || !styleArg) {
    console.error("Usage: rename <root> <style> [--dry|-n] [--no-update-content]");
    console.error("Styles: title_underscore, pascal_underscore, snake, kebab, camel, pascal, upper, lower");
    process.exit(1);
  }
  renameRecursive(rootArg, styleArg, { dryRun, updateContent }).then((performed) => {
    if (dryRun) {
      console.log(`Dry run - would rename ${performed.length} items:`);
    } else {
      console.log(`Renamed ${performed.length} items:`);
    }
    performed.forEach(({ from, to }) => {
      console.log(`  ${from} \u2192 ${to}`);
    });
  }).catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}
var rename_default = {
  transformBasename,
  renameRecursive
};
export {
  rename_default as default,
  renameRecursive,
  transformBasename
};
