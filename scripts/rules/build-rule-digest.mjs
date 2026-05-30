import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_FILES = ["GEMINI.md", "AI_RULE.md"];
const OUTPUT_DIR = path.join(ROOT, ".planning");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "rule-digest.md");
const META_FILE = path.join(OUTPUT_DIR, "rule-digest.meta.json");

const KEYWORD_RE =
  /\b(MUST|NEVER|ALWAYS|DO NOT|DON'T|REQUIRED|PHAI|PHẢI|BẮT BUỘC|BAT BUOC|KHÔNG|KHONG|NÊN|NEN)\b/i;

const MAX_LINES_PER_FILE = 24;

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function isImportantLine(line) {
  if (!line) return false;
  if (KEYWORD_RE.test(line)) return true;
  if (/`(useCallback|useMemo|React\.memo)`/i.test(line)) return true;
  if (/inline arrow|UTF-8|Language Protocol|Encoding safety|React/i.test(line))
    return true;
  return false;
}

function extractHighlights(content) {
  const lines = content.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const output = [];
  let currentHeading = "";

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      currentHeading = line.replace(/^#{1,6}\s+/, "").trim();
      continue;
    }

    if (!isImportantLine(line)) continue;

    const cleaned = line
      .replace(/^>\s*/, "")
      .replace(/^[-*]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .trim();

    if (!cleaned) continue;
    if (/^\*{0,2}\/[a-z0-9-]+/i.test(cleaned)) continue;
    if (/^(\*\*)?(AI Master|API Standards|Compliance|Database Master|Design System|Domain Blueprints|I18n Master|Infra Blueprints|Metrics|Security Armor|Testing Master|UI\/UX Pro Max|Vitals Templates|Malware Protection|Auto-Update|Error Logging|Docs Sync)/i.test(cleaned)) {
      continue;
    }

    const item = currentHeading ? `[${currentHeading}] ${cleaned}` : cleaned;
    if (!output.includes(item)) {
      output.push(item);
    }

    if (output.length >= MAX_LINES_PER_FILE) break;
  }

  return output;
}

async function loadExistingMeta() {
  if (!existsSync(META_FILE)) return null;
  try {
    const raw = await readFile(META_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  return {
    force: argv.includes("--force"),
    check: argv.includes("--check"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = {};
  const contents = {};

  for (const file of SOURCE_FILES) {
    const abs = path.join(ROOT, file);
    const text = await readFile(abs, "utf8");
    contents[file] = text;
    sources[file] = {
      path: file,
      hash: sha256(text),
    };
  }

  const previousMeta = await loadExistingMeta();
  const unchanged =
    previousMeta &&
    SOURCE_FILES.every(
      (file) =>
        previousMeta.sources?.[file]?.hash &&
        previousMeta.sources[file].hash === sources[file].hash,
    );

  if (args.check) {
    process.stdout.write(
      unchanged
        ? "Rule files unchanged. Safe to read .planning/rule-digest.md only.\n"
        : "Rule files changed. Refresh digest before coding.\n",
    );
    process.exit(unchanged ? 0 : 2);
  }

  if (unchanged && !args.force && existsSync(OUTPUT_FILE)) {
    process.stdout.write("Rule digest is up to date.\n");
    return;
  }

  const geminiHighlights = extractHighlights(contents["GEMINI.md"]);
  const aiRuleHighlights = extractHighlights(contents["AI_RULE.md"]);

  const digestLines = [
    "# Rule Digest",
    "",
    "Auto-generated from `GEMINI.md` and `AI_RULE.md`.",
    "Read this digest first. If source hashes changed, re-read full rule files.",
    "",
    "## Source Hashes",
    ...SOURCE_FILES.map((file) => `- \`${file}\`: \`${sources[file].hash}\``),
    "",
    "## Global Coding Checklist",
    "- Use Vietnamese for communication and reasoning output.",
    "- Keep code identifiers/comments in English.",
    "- Treat UTF-8 as mandatory for read/write operations.",
    "- Follow React performance rules in `AI_RULE.md` for all React/TS components.",
    "- Prefer stable references (`useCallback`, `useMemo`) and avoid inline callbacks in child props.",
    "",
    "## Highlights: GEMINI.md",
    ...geminiHighlights.map((line) => `- ${line}`),
    "",
    "## Highlights: AI_RULE.md",
    ...aiRuleHighlights.map((line) => `- ${line}`),
    "",
  ];

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${digestLines.join("\n")}`, "utf8");
  await writeFile(
    META_FILE,
    JSON.stringify({ sources, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );

  process.stdout.write("Rule digest refreshed at .planning/rule-digest.md\n");
}

main().catch((error) => {
  process.stderr.write(`Failed to build rule digest: ${error.message}\n`);
  process.exit(1);
});
