#!/usr/bin/env node
/**
 * Markdown and Template Link Scanner (DEVOPS-215)
 *
 * Scans markdown files, templates, and workflows for broken local or remote links.
 * Keep it deterministic and fast: remote URL verification is disabled by default.
 *
 * Usage:
 *   node scripts/scan-markdown-links.js [--check-remote] [--json] [--verbose] [--warn-only] [files...]
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");

// Cache for target files' anchors to avoid re-parsing
const anchorCache = new Map();

// Cache for remote checks to avoid re-fetching
const remoteCache = new Map();

// ---------------------------------------------------------------------------
// Slugification (GitHub markdown heading anchor style)
// ---------------------------------------------------------------------------
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/[^\w\s-]/g, "") // Remove non-word characters except space and dash
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
}

// ---------------------------------------------------------------------------
// Link Parsing logic
// ---------------------------------------------------------------------------
function extractLinksFromLine(line, lineNum, isYaml = false) {
  const links = [];
  const cleanedLine = line.replace(/`[^`]+`/g, " ");

  // 1. Markdown inline links: [text](url)
  const mdInlineRegex = /\[([^\]]*?)\]\(([^)\s]+)(?:\s+["'].*?["'])?\)/g;
  let match;
  while ((match = mdInlineRegex.exec(cleanedLine)) !== null) {
    links.push({ url: match[2], type: "inline", lineNum });
  }

  // 2. Markdown reference link definitions: [ref]: url
  const mdRefRegex = /^\[([^\]]+)\]:\s*(\S+)/g;
  while ((match = mdRefRegex.exec(cleanedLine)) !== null) {
    links.push({ url: match[2], type: "reference", lineNum });
  }

  // 3. HTML anchor links: <a href="url">
  const htmlHrefRegex = /<a\s+[^>]*?href=["']([^"']+)["']/gi;
  while ((match = htmlHrefRegex.exec(cleanedLine)) !== null) {
    links.push({ url: match[1], type: "html", lineNum });
  }

  // 4. Raw remote URLs in text (excluding those already matched as inline/html/etc.)
  const rawUrlRegex = /(?<![("'])(https?:\/\/[^\s<>)\]"]+)/gi;
  while ((match = rawUrlRegex.exec(cleanedLine)) !== null) {
    links.push({ url: match[1], type: "raw_url", lineNum });
  }

  // 5. Raw file paths in comments or plain text (e.g. docs/wave/REVIEWER_PLAYBOOK.md)
  // Skip raw path parsing in YAML/workflow files to avoid treating shell commands as links
  if (!isYaml) {
    let pathLine = cleanedLine;
    // Strip inline markdown links entirely
    pathLine = pathLine.replace(/\[[^\]]*?\]\([^)\s]+(?:\s+["'].*?["'])?\)/g, " ");
    // Strip reference link definitions
    pathLine = pathLine.replace(/^\[[^\]]+\]:\s*\S+/g, " ");
    // Strip HTML anchor tags
    pathLine = pathLine.replace(/<a\s+[^>]*?href=["']([^"']+)["'][^>]*>/gi, " ");

    const rawPathRegex = /(?:\b|(?<=[\s"'/]))((?:\.\.?\/|[a-zA-Z0-9_.-]+\/)[a-zA-Z0-9_./-]+\.(?:md|yml|yaml|js|ts|sh|png|jpg|jpeg|gif|svg|json))\b/g;
    while ((match = rawPathRegex.exec(pathLine)) !== null) {
      const matchedPath = match[1];

      // Filter out if it is a subsegment of any already extracted URL on this line
      const isSubsegment = links.some((existing) => existing.url.includes(matchedPath));
      if (isSubsegment) {
        continue;
      }
      links.push({ url: matchedPath, type: "raw_path", lineNum });
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// File Walking Helpers
// ---------------------------------------------------------------------------
function getFilesToScan(repoRoot) {
  const files = [];

  function walk(dir, allowedExts) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        walk(fullPath, allowedExts);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExts.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  // Scan docs surface recursively
  walk(path.join(repoRoot, "docs"), [".md"]);

  // Scan .github recursively (includes templates, workflows, PR template)
  walk(path.join(repoRoot, ".github"), [".md", ".yml", ".yaml"]);

  // Scan root-level markdown files
  if (fs.existsSync(repoRoot)) {
    const rootEntries = fs.readdirSync(repoRoot, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
        files.push(path.join(repoRoot, entry.name));
      }
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// Validation Logic
// ---------------------------------------------------------------------------
function getValidAnchors(filePath) {
  if (anchorCache.has(filePath)) {
    return anchorCache.get(filePath);
  }

  const anchors = new Set();
  try {
    const content = fs.readFileSync(filePath, "utf8");
    
    // 1. Markdown headings (e.g. ## Heading)
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      anchors.add(slugify(match[2]));
    }

    // 2. HTML name/id attributes
    const htmlAnchorRegex = /<(?:a|div|span|section|h[1-6])\s+[^>]*?(?:name|id)=["']([^"']+)["']/gi;
    while ((match = htmlAnchorRegex.exec(content)) !== null) {
      anchors.add(match[1]);
    }
  } catch (err) {
    // Return empty set on failure to read target file
  }

  anchorCache.set(filePath, anchors);
  return anchors;
}

function validateLocalLink(srcFile, target, repoRoot) {
  try {
    const parts = target.split("#");
    const linkPath = parts[0];
    const anchor = parts[1] || "";

    let resolvedPath;
    if (linkPath === "") {
      // Self-reference anchor
      resolvedPath = srcFile;
    } else {
      const decodedPath = decodeURIComponent(linkPath);
      if (decodedPath.startsWith("/")) {
        // Relative to repo root
        resolvedPath = path.join(repoRoot, decodedPath);
      } else {
        // Relative to containing folder
        resolvedPath = path.resolve(path.dirname(srcFile), decodedPath);
      }
    }

    // Check if target is a GitHub native reference (e.g. issues/123 or pull/456)
    const relativeToRoot = path.relative(repoRoot, resolvedPath);
    if (
      relativeToRoot.startsWith("issues/") ||
      relativeToRoot.startsWith("pull/") ||
      relativeToRoot.startsWith("commit/")
    ) {
      return { ok: true };
    }

    // Verify file/directory existence
    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, error: `Target path does not exist: "${linkPath}" (resolved to: ${path.relative(repoRoot, resolvedPath)})` };
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      if (anchor) {
        return { ok: false, error: `Cannot reference anchor "#${anchor}" on directory target: "${linkPath}"` };
      }
      return { ok: true };
    }

    // Verify anchor existence in target markdown file
    if (anchor && path.extname(resolvedPath).toLowerCase() === ".md") {
      const validAnchors = getValidAnchors(resolvedPath);
      const slugifiedAnchor = slugify(anchor);
      if (!validAnchors.has(anchor) && !validAnchors.has(slugifiedAnchor)) {
        return { ok: false, error: `Anchor "#${anchor}" not found in target file: "${path.relative(repoRoot, resolvedPath)}"` };
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Validation error: ${err.message}` };
  }
}

function validateRemoteLink(urlStr, verbose = false) {
  // Remote checking disabled, skip or return true
  if (remoteCache.has(urlStr)) {
    return Promise.resolve(remoteCache.get(urlStr));
  }

  // Filter out local, placeholder, and non-http links
  if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
    return Promise.resolve({ ok: true, skipped: true });
  }

  const hostname = (() => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return "";
    }
  })();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "rpc-proxy" ||
    hostname === "0.0.0.0" ||
    urlStr.includes("...") ||
    urlStr.includes("example.com")
  ) {
    return Promise.resolve({ ok: true, skipped: true });
  }

  return new Promise((resolve) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(urlStr);
    } catch {
      remoteCache.set(urlStr, { ok: false });
      return resolve({ ok: false, error: "Malformed URL" });
    }

    const client = parsedUrl.protocol === "https:" ? https : http;
    const options = {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Range": "bytes=0-0",
      },
      timeout: 5000,
    };

    const req = client.request(parsedUrl, (res) => {
      req.destroy();
      
      if (res.statusCode === 429) {
        if (verbose) console.log(`[Remote 429] Rate limited: ${urlStr}`);
        remoteCache.set(urlStr, { ok: true });
        return resolve({ ok: true });
      }

      const ok = res.statusCode >= 200 && res.statusCode < 400;
      remoteCache.set(urlStr, { ok, statusCode: res.statusCode });
      
      if (ok) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: `HTTP status ${res.statusCode}` });
      }
    });

    req.on("error", (err) => {
      req.destroy();
      if (verbose) console.log(`[Remote Error] ${urlStr}: ${err.message}`);
      remoteCache.set(urlStr, { ok: false });
      resolve({ ok: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      if (verbose) console.log(`[Remote Timeout] ${urlStr}`);
      remoteCache.set(urlStr, { ok: false });
      resolve({ ok: false, error: "Request timed out" });
    });

    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main Command Line Execution
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const checkRemote = args.includes("--check-remote");
  const jsonOutput = args.includes("--json");
  const verbose = args.includes("--verbose");
  const warnOnly = args.includes("--warn-only");

  // Determine repository root directory
  const repoRoot = path.resolve(__dirname, "..");

  // Filter out CLI option flags to get targets
  const targets = args.filter((a) => !a.startsWith("--"));

  let filesToScan = [];
  if (targets.length > 0) {
    for (const target of targets) {
      const fullPath = path.resolve(repoRoot, target);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // Recursively find .md, .yml, .yaml in specified dir
          const walkDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const subPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                if (entry.name !== "node_modules" && entry.name !== ".git") {
                  walkDir(subPath);
                }
              } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if ([".md", ".yml", ".yaml"].includes(ext)) {
                  filesToScan.push(subPath);
                }
              }
            }
          };
          walkDir(fullPath);
        } else {
          filesToScan.push(fullPath);
        }
      } else {
        console.error(`Error: target does not exist: ${target}`);
        process.exit(1);
      }
    }
  } else {
    filesToScan = getFilesToScan(repoRoot);
  }

  const results = [];
  let totalLinksScanned = 0;
  let totalBrokenLinks = 0;

  for (const file of filesToScan) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch (err) {
      console.error(`Error reading file ${file}: ${err.message}`);
      continue;
    }

    const lines = content.split("\n");
    const fileErrors = [];
    let fileCheckedLinksCount = 0;

    const isYaml = file.endsWith(".yml") || file.endsWith(".yaml");
    let inCodeBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Toggle fenced code block state
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip parsing if we are inside a code block
      if (inCodeBlock) {
        continue;
      }

      const links = extractLinksFromLine(line, lineNum, isYaml);

      // Deduplicate targets on the same line to avoid spam/redundancy
      const seenOnLine = new Set();
      const uniqueLinks = [];
      for (const item of links) {
        if (!seenOnLine.has(item.url)) {
          seenOnLine.add(item.url);
          uniqueLinks.push(item);
        }
      }

      for (const linkObj of uniqueLinks) {
        const urlStr = linkObj.url;
        const isRemote = urlStr.startsWith("http://") || urlStr.startsWith("https://") || urlStr.startsWith("mailto:");

        totalLinksScanned++;
        fileCheckedLinksCount++;

        if (isRemote) {
          if (checkRemote) {
            const res = await validateRemoteLink(urlStr, verbose);
            if (!res.ok && !res.skipped) {
              totalBrokenLinks++;
              fileErrors.push({
                line: lineNum,
                link: urlStr,
                type: "remote",
                error: res.error,
              });
            }
          }
        } else {
          // Local path or anchor
          const res = validateLocalLink(file, urlStr, repoRoot);
          if (!res.ok) {
            totalBrokenLinks++;
            fileErrors.push({
              line: lineNum,
              link: urlStr,
              type: "local",
              error: res.error,
            });
          }
        }
      }
    }

    results.push({
      file: path.relative(repoRoot, file),
      checkedLinksCount: fileCheckedLinksCount,
      errors: fileErrors,
    });
  }

  const filesWithErrors = results.filter((r) => r.errors.length > 0);

  if (jsonOutput) {
    const jsonReport = {
      summary: {
        totalFilesScanned: filesToScan.length,
        totalLinksScanned,
        totalBrokenLinks,
        filesWithErrorsCount: filesWithErrors.length,
        checkRemoteEnabled: checkRemote,
      },
      results,
    };
    console.log(JSON.stringify(jsonReport, null, 2));
  } else {
    console.log("=== Markdown and Template Link Scan Report ===");
    console.log(`Scanned:  ${filesToScan.length} files`);
    console.log(`Checked:  ${totalLinksScanned} links (Remote checking: ${checkRemote ? "ENABLED" : "DISABLED"})`);
    console.log(`Broken:   ${totalBrokenLinks} broken links detected`);
    console.log("");

    if (filesWithErrors.length === 0) {
      console.log("✓ All links are healthy!");
    } else {
      for (const f of filesWithErrors) {
        console.log(`File: [${f.file}](file://${path.resolve(repoRoot, f.file)})`);
        for (const err of f.errors) {
          const typeLabel = err.type === "remote" ? "Remote URL" : "Local path";
          console.log(`  Line ${err.line}: [${typeLabel}] "${err.link}" → ${err.error}`);
        }
        console.log("");
      }
    }
  }

  if (totalBrokenLinks > 0 && !warnOnly) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Unhandled execution error:", err);
    process.exit(1);
  });
} else {
  module.exports = {
    slugify,
    extractLinksFromLine,
    validateLocalLink,
    validateRemoteLink,
    getValidAnchors,
    getFilesToScan,
  };
}
