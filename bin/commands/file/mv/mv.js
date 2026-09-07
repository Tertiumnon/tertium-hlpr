#!/usr/bin/env bun
// @bun

// src/commands/file/mv/mv.ts
import fs from "fs/promises";
import path from "path";
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
function pathsEqual(a, b) {
  const ra = path.resolve(a);
  const rb = path.resolve(b);
  return process.platform === "win32" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
}
function namesEqual(a, b) {
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
function stripKnownExt(p, ext) {
  if (ext && p.toLowerCase().endsWith(ext.toLowerCase())) {
    return { base: p.slice(0, p.length - ext.length), hadExt: true };
  }
  return { base: p, hadExt: false };
}
function toPosix(p) {
  return p.split(path.sep).join("/");
}
async function isTextFile(filePath) {
  try {
    const fd = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await fd.read(buffer, 0, 4096, 0);
    await fd.close();
    if (bytesRead === 0)
      return true;
    const sample = buffer.subarray(0, bytesRead);
    for (let i = 0;i < bytesRead; i++) {
      if (sample[i] === 0)
        return false;
    }
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(sample, { stream: true });
      return true;
    } catch {}
    let printableCount = 0;
    for (let i = 0;i < bytesRead; i++) {
      const byte = sample[i];
      if (byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13) {
        printableCount++;
      }
    }
    return printableCount / bytesRead > 0.85;
  } catch {
    return false;
  }
}
var DEFAULT_IGNORED_DIRS = new Set([".git", "node_modules"]);
async function collectFiles(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && DEFAULT_IGNORED_DIRS.has(e.name))
      continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await collectFiles(full, out);
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}
async function findDefaultRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (await exists(path.join(dir, ".git")))
      return dir;
    const parent = path.dirname(dir);
    if (parent === dir)
      return startDir;
    dir = parent;
  }
}
async function performRename(oldAbs, newAbs, force) {
  await fs.mkdir(path.dirname(newAbs), { recursive: true });
  const destExists = await exists(newAbs);
  const caseOnlyChange = destExists && oldAbs !== newAbs && oldAbs.toLowerCase() === newAbs.toLowerCase();
  if (destExists && !caseOnlyChange) {
    if (!force) {
      throw new Error(`Destination already exists: ${newAbs} (use --force to overwrite)`);
    }
    await fs.rm(newAbs);
  }
  if (caseOnlyChange) {
    const tmp = newAbs + "__tmp_renaming__";
    await fs.rename(oldAbs, tmp);
    try {
      await fs.rename(tmp, newAbs);
    } catch (err) {
      await fs.rename(tmp, oldAbs).catch(() => {});
      throw err;
    }
  } else {
    await fs.rename(oldAbs, newAbs);
  }
}
function isExternalLink(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//");
}
function splitFragment(target) {
  const idx = target.indexOf("#");
  if (idx === -1)
    return { path: target, fragment: "" };
  return { path: target.slice(0, idx), fragment: target.slice(idx) };
}
function safeDecodeURIComponent(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
function encodeLikeOriginal(newPathStr, original) {
  if (/%20/.test(original)) {
    return newPathStr.replace(/ /g, "%20");
  }
  return newPathStr;
}
function resolveTargetMatch(candidatePath, fileDir, root, oldAbs) {
  if (candidatePath.startsWith("/")) {
    const resolved = path.resolve(root, "." + candidatePath);
    return pathsEqual(resolved, oldAbs) ? "root-relative" : null;
  }
  const fileResolved = path.resolve(fileDir, candidatePath);
  if (pathsEqual(fileResolved, oldAbs))
    return "file-relative";
  const rootResolved = path.resolve(root, candidatePath);
  if (pathsEqual(rootResolved, oldAbs))
    return "root-relative";
  return null;
}
function tryRewriteTarget(rawTarget, fileDir, root, oldAbs, newAbs, allowBareBasename) {
  if (!rawTarget || isExternalLink(rawTarget))
    return null;
  const { path: targetPath, fragment } = splitFragment(rawTarget);
  if (!targetPath)
    return null;
  const decoded = safeDecodeURIComponent(targetPath);
  const oldExt = path.extname(oldAbs);
  const newExt = path.extname(newAbs);
  const oldBaseNoExt = path.basename(oldAbs, oldExt);
  const newBaseNoExt = path.basename(newAbs, newExt);
  const hasSlash = decoded.includes("/") || decoded.includes("\\");
  let matchKind = null;
  let hadExt = false;
  if (allowBareBasename && !hasSlash) {
    const stripped = stripKnownExt(decoded, oldExt);
    if (namesEqual(stripped.base, oldBaseNoExt)) {
      matchKind = "bare-basename";
      hadExt = stripped.hadExt;
    }
  }
  if (!matchKind) {
    const stripped = stripKnownExt(decoded, oldExt);
    hadExt = stripped.hadExt;
    const candidate = hadExt ? decoded : decoded + oldExt;
    matchKind = resolveTargetMatch(candidate, fileDir, root, oldAbs);
  }
  if (!matchKind)
    return null;
  let newTargetPath;
  if (matchKind === "bare-basename") {
    newTargetPath = hadExt ? newBaseNoExt + newExt : newBaseNoExt;
  } else {
    const base = matchKind === "root-relative" ? root : fileDir;
    let rel = toPosix(path.relative(base, newAbs));
    if (!hadExt && newExt && rel.endsWith(newExt)) {
      rel = rel.slice(0, -newExt.length);
    }
    const wasRootAbsolute = decoded.startsWith("/");
    const wasExplicitRelative = decoded.startsWith("./") || decoded.startsWith("../");
    if (wasRootAbsolute) {
      newTargetPath = "/" + rel;
    } else if (wasExplicitRelative || rel.startsWith("..")) {
      newTargetPath = rel.startsWith(".") ? rel : "./" + rel;
    } else {
      newTargetPath = rel;
    }
  }
  return encodeLikeOriginal(newTargetPath, targetPath) + fragment;
}
function parseMdTarget(raw) {
  const s = raw.trim();
  if (s.startsWith("<")) {
    const end = s.indexOf(">");
    if (end !== -1) {
      return { link: s.slice(1, end), suffix: s.slice(end + 1), wrapped: true };
    }
  }
  const titleIdx = s.search(/\s+["']/);
  if (titleIdx !== -1) {
    return { link: s.slice(0, titleIdx), suffix: s.slice(titleIdx), wrapped: false };
  }
  return { link: s, suffix: "", wrapped: false };
}
function parseWikiTarget(raw) {
  const idx = raw.search(/[#|]/);
  if (idx === -1)
    return { link: raw, rest: "" };
  return { link: raw.slice(0, idx), rest: raw.slice(idx) };
}
function rewriteContent(content, fileDir, root, oldAbs, newAbs, allowBareBasename) {
  let count = 0;
  let updated = content;
  updated = updated.replace(/(!?\[[^\]]*\])\(([^)]+)\)/g, (full, textPart, rawTarget) => {
    const { link, suffix, wrapped } = parseMdTarget(rawTarget);
    const newLink = tryRewriteTarget(link, fileDir, root, oldAbs, newAbs, false);
    if (newLink === null)
      return full;
    count++;
    const rebuilt = wrapped ? `<${newLink}>` : newLink;
    return `${textPart}(${rebuilt}${suffix})`;
  });
  updated = updated.replace(/\[\[([^\]]+)\]\]/g, (full, inner) => {
    const { link, rest } = parseWikiTarget(inner);
    const newLink = tryRewriteTarget(link, fileDir, root, oldAbs, newAbs, allowBareBasename);
    if (newLink === null)
      return full;
    count++;
    return `[[${newLink}${rest}]]`;
  });
  updated = updated.replace(/(['"`])([^'"`]*\/[^'"`]*)\1/g, (full, quote, rawTarget) => {
    const newLink = tryRewriteTarget(rawTarget, fileDir, root, oldAbs, newAbs, false);
    if (newLink === null)
      return full;
    count++;
    return `${quote}${newLink}${quote}`;
  });
  return { content: updated, count };
}
async function renameFile(oldPathArg, newPathArg, options = {}) {
  const oldAbs = path.resolve(oldPathArg);
  const hasDirSeparator = newPathArg.includes("/") || newPathArg.includes("\\");
  const newAbs = hasDirSeparator ? path.resolve(newPathArg) : path.join(path.dirname(oldAbs), newPathArg);
  const root = path.resolve(options.root ?? await findDefaultRoot(path.dirname(oldAbs)));
  const updateContentEnabled = options.updateContent ?? true;
  const dryRun = options.dryRun ?? false;
  const force = options.force ?? false;
  if (!await exists(oldAbs)) {
    throw new Error(`Source file does not exist: ${oldAbs}`);
  }
  const oldStat = await fs.stat(oldAbs);
  if (!oldStat.isFile()) {
    throw new Error(`Source is not a file: ${oldAbs}`);
  }
  if (pathsEqual(oldAbs, newAbs) && oldAbs === newAbs) {
    throw new Error("Source and destination are the same path");
  }
  const result = { from: oldAbs, to: newAbs, root, updatedFiles: [], bareBasenameAmbiguous: false };
  const allFiles = updateContentEnabled ? await collectFiles(root) : [];
  const oldBasenameLower = path.basename(oldAbs).toLowerCase();
  const sameBasenameElsewhere = allFiles.some((f) => !pathsEqual(f, oldAbs) && path.basename(f).toLowerCase() === oldBasenameLower);
  const allowBareBasename = !sameBasenameElsewhere;
  result.bareBasenameAmbiguous = sameBasenameElsewhere;
  if (!dryRun) {
    await performRename(oldAbs, newAbs, force);
  }
  if (updateContentEnabled) {
    for (const file of allFiles) {
      if (pathsEqual(file, oldAbs) || pathsEqual(file, newAbs))
        continue;
      if (!await isTextFile(file))
        continue;
      const original = await fs.readFile(file, "utf-8");
      const { content: updated, count } = rewriteContent(original, path.dirname(file), root, oldAbs, newAbs, allowBareBasename);
      if (count > 0) {
        result.updatedFiles.push({ file, count });
        if (!dryRun) {
          await fs.writeFile(file, updated, "utf-8");
        }
      }
    }
  }
  return result;
}
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes("--help") || rawArgs.includes("-h") || rawArgs.includes("/help") || rawArgs.includes("/h") || rawArgs.includes("/?")) {
    console.log("Usage: mv <oldPath> <newPath> [--root <dir>] [--dry|-n] [--force] [--no-update-content]");
    console.log("Renames/moves a single file and updates references to it (markdown links, wikilinks,");
    console.log("imports, href/src) in every text file under <dir>, recursively.");
    console.log("Options:");
    console.log("  --root <dir>           Directory to scan for references");
    console.log("                         (default: nearest git repo root of <oldPath>, or its own directory)");
    console.log("  --dry, -n              Preview changes without applying them");
    console.log("  --force                Overwrite destination file if it already exists");
    console.log("  --no-update-content    Skip updating references in other files");
    process.exit(0);
  }
  const positional = [];
  let root;
  let dryRun = false;
  let force = false;
  let updateContent = true;
  for (let i = 0;i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === "--dry" || a === "-n")
      dryRun = true;
    else if (a === "--force")
      force = true;
    else if (a === "--no-update-content")
      updateContent = false;
    else if (a === "--root")
      root = rawArgs[++i];
    else
      positional.push(a);
  }
  const [oldPathArg, newPathArg] = positional;
  if (!oldPathArg || !newPathArg) {
    console.error("Usage: mv <oldPath> <newPath> [--root <dir>] [--dry|-n] [--force] [--no-update-content]");
    process.exit(1);
  }
  renameFile(oldPathArg, newPathArg, { root, dryRun, force, updateContent }).then((result) => {
    if (dryRun) {
      console.log(`Dry run - would rename:
  ${result.from} \u2192 ${result.to}`);
    } else {
      console.log(`Renamed:
  ${result.from} \u2192 ${result.to}`);
    }
    console.log(`Scanned for references under: ${result.root}`);
    if (result.updatedFiles.length > 0) {
      console.log(`
${dryRun ? "Would update" : "Updated"} ${result.updatedFiles.length} file(s):`);
      result.updatedFiles.forEach(({ file, count }) => {
        console.log(`  ${file} (${count} reference${count === 1 ? "" : "s"})`);
      });
    } else {
      console.log(`
No references found to update.`);
    }
    if (result.bareBasenameAmbiguous) {
      console.log(`
Note: another file also named "${path.basename(result.from)}" exists under the scanned root, ` + "so bare wikilinks (e.g. [[name]]) were not auto-matched to avoid an ambiguous rewrite.");
    }
  }).catch((err) => {
    console.error("Error:", err.message ?? err);
    process.exit(1);
  });
}
var mv_default = {
  renameFile
};
export {
  mv_default as default,
  renameFile
};
