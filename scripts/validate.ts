import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import matter from "gray-matter";

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content");
const TAGS_FILE = path.join(CONTENT_DIR, "tags.yaml");
const DATA_TAGS_FILE = path.join(ROOT_DIR, "_data", "tags.yaml");
const TAG_PAGES_DIR = path.join(ROOT_DIR, "tags");

const CATEGORIES = [
  "lightshows",
  "locksounds",
  "boombox",
  "wraps",
  "hornsounds",
] as const;

type Category = (typeof CATEGORIES)[number];

// Allowed file extensions per category (per Tesla USB spec)
const ALLOWED_EXTENSIONS: Record<Category, string[]> = {
  lightshows: [".fseq", ".mp3"],
  locksounds: [".wav"],
  boombox: [".mp3", ".wav", ".flac"],
  wraps: [".png"],
  // Custom horns play through the Boombox feature, which only supports WAV/MP3.
  hornsounds: [".mp3", ".wav"],
};

// Required frontmatter fields
const REQUIRED_META_FIELDS = ["title", "author", "description"];

// Default max file size: 50 MB
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Per-category max file size overrides (per Tesla USB spec)
const MAX_FILE_SIZE_PER_CATEGORY: Partial<Record<Category, number>> = {
  locksounds: 1 * 1024 * 1024, // 1 MB per Tesla spec
  wraps: 1 * 1024 * 1024,      // 1 MB per image per Tesla spec
};

// Allowed thumbnail extensions
const THUMBNAIL_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

// Slug pattern: lowercase alphanumeric + hyphens
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors: string[] = [];
const warnings: string[] = [];

// Strict mode promotes content-integrity warnings (binary magic bytes,
// stub-sized files, image dimensions, duplicate titles) into hard errors.
// Enable it — `npm run validate -- --strict` or `VALIDATE_STRICT=1` — once the
// placeholder fixture binaries have been replaced with real assets.
const STRICT =
  process.argv.includes("--strict") || process.env.VALIDATE_STRICT === "1";

function error(msg: string): void {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
}

function warn(msg: string): void {
  if (STRICT) {
    error(msg);
    return;
  }
  warnings.push(msg);
  console.warn(`  ⚠ ${msg}`);
}

function loadKnownTags(): Set<string> {
  if (!fs.existsSync(TAGS_FILE)) {
    error(`Tags file not found: ${TAGS_FILE}`);
    return new Set();
  }
  try {
    const raw = fs.readFileSync(TAGS_FILE, "utf-8");
    const tags = yaml.load(raw) as string[];
    if (!Array.isArray(tags)) {
      error("content/tags.yaml must be a YAML array of strings");
      return new Set();
    }
    return new Set(tags.map((t) => String(t).toLowerCase().trim()));
  } catch (e) {
    error(`Failed to parse content/tags.yaml: ${e}`);
    return new Set();
  }
}

// content/tags.yaml is the source of truth; _data/tags.yaml (used by templates)
// and the tags/<tag>.md pages are duplicates that must not drift from it.
function validateTagSync(knownTags: Set<string>): void {
  if (fs.existsSync(DATA_TAGS_FILE)) {
    try {
      const data = yaml.load(fs.readFileSync(DATA_TAGS_FILE, "utf-8"));
      const dataSet = new Set(
        (Array.isArray(data) ? data : []).map((t) => String(t).toLowerCase().trim())
      );
      for (const t of knownTags) {
        if (!dataSet.has(t)) error(`_data/tags.yaml out of sync: missing "${t}" (in content/tags.yaml)`);
      }
      for (const t of dataSet) {
        if (!knownTags.has(t)) error(`_data/tags.yaml out of sync: extra "${t}" (not in content/tags.yaml)`);
      }
    } catch (e) {
      error(`Failed to parse _data/tags.yaml: ${e}`);
    }
  } else {
    error("_data/tags.yaml not found");
  }

  if (fs.existsSync(TAG_PAGES_DIR)) {
    const pages = new Set(
      fs
        .readdirSync(TAG_PAGES_DIR)
        .filter((f) => f.endsWith(".md") && f !== "index.md")
        .map((f) => f.slice(0, -3).toLowerCase())
    );
    for (const t of knownTags) {
      if (!pages.has(t)) error(`tags/${t}.md page missing for tag "${t}"`);
    }
    for (const p of pages) {
      if (!knownTags.has(p)) error(`tags/${p}.md has no matching tag in content/tags.yaml`);
    }
  }
}

function validateSlug(slug: string, category: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    error(
      `${category}/${slug}: folder name must be lowercase alphanumeric with hyphens (got "${slug}")`
    );
  }
}

function validateMeta(
  meta: Record<string, unknown>,
  category: string,
  slug: string,
  knownTags: Set<string>,
  itemDir: string
): void {
  for (const field of REQUIRED_META_FIELDS) {
    if (!meta[field] || String(meta[field]).trim() === "") {
      error(`${category}/${slug}.md: missing required field "${field}"`);
    }
  }

  if (meta.tags !== undefined) {
    if (!Array.isArray(meta.tags)) {
      error(`${category}/${slug}.md: "tags" must be an array`);
    } else {
      for (const tag of meta.tags) {
        const normalized = String(tag).toLowerCase().trim();
        if (!knownTags.has(normalized)) {
          error(
            `${category}/${slug}.md: unknown tag "${tag}". Add it to content/tags.yaml first.`
          );
        }
      }
    }
  }

  if (meta.thumbnail !== undefined) {
    if (typeof meta.thumbnail !== "string" || meta.thumbnail.trim() === "") {
      error(`${category}/${slug}.md: "thumbnail" must be a non-empty string`);
    } else {
      const thumbExt = path.extname(String(meta.thumbnail)).toLowerCase();
      if (!THUMBNAIL_EXTENSIONS.includes(thumbExt)) {
        error(
          `${category}/${slug}.md: thumbnail "${meta.thumbnail}" has invalid extension "${thumbExt}" (allowed: ${THUMBNAIL_EXTENSIONS.join(", ")})`
        );
      }
      const thumbPath = path.join(itemDir, String(meta.thumbnail));
      if (!fs.existsSync(thumbPath)) {
        error(
          `${category}/${slug}.md: thumbnail file "${meta.thumbnail}" not found`
        );
      }
    }
  }
}

function validateFiles(
  itemDir: string,
  category: Category,
  slug: string
): void {
  const allowed = ALLOWED_EXTENSIONS[category];
  const files = fs
    .readdirSync(itemDir, { withFileTypes: true })
    .filter((f) => f.isFile());

  if (files.length === 0) {
    error(
      `${category}/${slug}: no content files found (expected ${allowed.join(", ")})`
    );
    return;
  }

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();

    // Check extension
    if (!allowed.includes(ext)) {
      error(
        `${category}/${slug}/${file.name}: invalid file type "${ext}" (allowed: ${allowed.join(", ")})`
      );
    }

    // Check file size (use per-category limit if defined, else global default)
    const filePath = path.join(itemDir, file.name);
    const stat = fs.statSync(filePath);
    const maxSize = MAX_FILE_SIZE_PER_CATEGORY[category] ?? MAX_FILE_SIZE_BYTES;
    if (stat.size > maxSize) {
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      error(
        `${category}/${slug}/${file.name}: file too large (${sizeMB} MB, max ${maxMB} MB)`
      );
    }
  }
}

// Categories that require an "audio" frontmatter field
const AUDIO_REQUIRED_CATEGORIES: readonly Category[] = [
  "locksounds",
  "hornsounds",
  "boombox",
  "lightshows",
];

// Categories that require a "thumbnail" frontmatter field
const THUMBNAIL_REQUIRED_CATEGORIES: readonly Category[] = ["wraps"];

function validateFilesField(
  meta: Record<string, unknown>,
  category: string,
  slug: string,
  itemDir: string
): void {
  if (meta.files === undefined) {
    error(`${category}/${slug}.md: missing required field "files"`);
    return;
  }

  if (!Array.isArray(meta.files)) {
    error(`${category}/${slug}.md: "files" must be an array`);
    return;
  }

  if (meta.files.length === 0) {
    error(`${category}/${slug}.md: "files" must contain at least one entry`);
    return;
  }

  for (const entry of meta.files) {
    if (!entry || typeof entry !== "object") {
      error(`${category}/${slug}.md: each entry in "files" must be an object with "name" and "label" fields`);
      continue;
    }
    const fileEntry = entry as Record<string, unknown>;
    if (!fileEntry.name || typeof fileEntry.name !== "string" || fileEntry.name.trim() === "") {
      error(`${category}/${slug}.md: each entry in "files" must have a non-empty "name" string`);
      continue;
    }
    if (!fileEntry.label || typeof fileEntry.label !== "string" || fileEntry.label.trim() === "") {
      error(`${category}/${slug}.md: each entry in "files" must have a non-empty "label" string`);
      continue;
    }
    const filePath = path.join(itemDir, String(fileEntry.name));
    if (!fs.existsSync(filePath)) {
      error(
        `${category}/${slug}.md: file "${fileEntry.name}" listed in "files" not found on disk`
      );
    }
  }
}

function validateAudioField(
  meta: Record<string, unknown>,
  category: string,
  slug: string,
  itemDir: string
): void {
  if (!AUDIO_REQUIRED_CATEGORIES.includes(category as Category)) return;

  if (meta.audio === undefined) {
    error(`${category}/${slug}.md: missing required field "audio"`);
    return;
  }

  if (typeof meta.audio !== "string" || meta.audio.trim() === "") {
    error(`${category}/${slug}.md: "audio" must be a non-empty string`);
    return;
  }

  const audioPath = path.join(itemDir, String(meta.audio));
  if (!fs.existsSync(audioPath)) {
    error(`${category}/${slug}.md: audio file "${meta.audio}" not found`);
  }
}

function validateThumbnailRequired(
  meta: Record<string, unknown>,
  category: string,
  slug: string,
  itemDir: string
): void {
  if (!THUMBNAIL_REQUIRED_CATEGORIES.includes(category as Category)) return;

  if (meta.thumbnail === undefined) {
    error(`${category}/${slug}.md: missing required field "thumbnail"`);
    return;
  }
  // Actual thumbnail format/existence validation is handled in validateMeta
}

// --- Binary content integrity ---------------------------------------------

// Anything smaller than this is almost certainly a placeholder stub, not a
// real asset.
const MIN_BINARY_SIZE_BYTES = 1024;

// Tesla wrap image dimension bounds (px).
const WRAP_MIN_DIM = 512;
const WRAP_MAX_DIM = 1024;

function ascii(s: string): number[] {
  return Array.from(s).map((c) => c.charCodeAt(0));
}

function hasMagic(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

// Validates a binary asset's magic bytes (and PNG dimensions) so corrupt files
// or sub-1KB stubs never reach the catalog the app consumes.
function validateBinaryContents(
  filePath: string,
  category: string,
  slug: string
): void {
  const name = path.basename(filePath);
  const ext = path.extname(name).toLowerCase();

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return; // existence is handled by validateFiles/validateFilesField
  }

  if (stat.size < MIN_BINARY_SIZE_BYTES) {
    warn(
      `${category}/${slug}/${name}: only ${stat.size} bytes — looks like a placeholder stub, not a real asset`
    );
  }

  let buf: Buffer;
  try {
    const fd = fs.openSync(filePath, "r");
    buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);
  } catch {
    return;
  }

  switch (ext) {
    case ".fseq":
      // Tesla light-show sequences are FSEQ v2.x ("PSEQ" magic).
      if (!hasMagic(buf, ascii("PSEQ"))) {
        warn(`${category}/${slug}/${name}: not a valid FSEQ file (missing "PSEQ" magic header)`);
      }
      break;
    case ".png":
      if (!hasMagic(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        warn(`${category}/${slug}/${name}: not a valid PNG (bad signature)`);
      } else {
        // IHDR width/height are big-endian uint32 at offsets 16 and 20.
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        if (
          width < WRAP_MIN_DIM || width > WRAP_MAX_DIM ||
          height < WRAP_MIN_DIM || height > WRAP_MAX_DIM
        ) {
          warn(
            `${category}/${slug}/${name}: ${width}x${height}px is outside Tesla's ${WRAP_MIN_DIM}-${WRAP_MAX_DIM}px wrap range`
          );
        }
      }
      break;
    case ".wav":
      if (!hasMagic(buf, ascii("RIFF")) || !hasMagic(buf, ascii("WAVE"), 8)) {
        warn(`${category}/${slug}/${name}: not a valid WAV (missing RIFF/WAVE header)`);
      }
      break;
    case ".mp3": {
      const isId3 = hasMagic(buf, ascii("ID3"));
      const isFrameSync = buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
      if (!isId3 && !isFrameSync) {
        warn(`${category}/${slug}/${name}: not a valid MP3 (no ID3 tag or MPEG frame sync)`);
      }
      break;
    }
    case ".flac":
      if (!hasMagic(buf, ascii("fLaC"))) {
        warn(`${category}/${slug}/${name}: not a valid FLAC (missing "fLaC" magic)`);
      }
      break;
    default:
      break;
  }
}

// Tesla requires each light show's audio file to share the .fseq base name.
function validateLightshowPairing(
  itemDir: string,
  slug: string,
  meta: Record<string, unknown>
): void {
  const files = fs
    .readdirSync(itemDir, { withFileTypes: true })
    .filter((f) => f.isFile())
    .map((f) => f.name);

  const fseqs = files.filter((f) => path.extname(f).toLowerCase() === ".fseq");
  const audioExts = ALLOWED_EXTENSIONS.lightshows.filter((e) => e !== ".fseq");
  const audios = files.filter((f) => audioExts.includes(path.extname(f).toLowerCase()));

  if (fseqs.length !== 1) {
    error(`lightshows/${slug}: expected exactly one .fseq file, found ${fseqs.length}`);
    return;
  }

  const base = path.basename(fseqs[0], path.extname(fseqs[0]));
  const matchingAudio = audios.find((a) => path.basename(a, path.extname(a)) === base);
  if (!matchingAudio) {
    error(
      `lightshows/${slug}: .fseq "${fseqs[0]}" has no matching audio file named "${base}.{${audioExts.map((e) => e.slice(1)).join("|")}}" (Tesla requires the audio to share the sequence's base name)`
    );
  }

  if (
    typeof meta.audio === "string" &&
    path.basename(String(meta.audio), path.extname(String(meta.audio))) !== base
  ) {
    error(`lightshows/${slug}.md: "audio" (${meta.audio}) must share the .fseq base name "${base}"`);
  }
}

function parseArgs(): { collection?: Category } {
  const args = process.argv.slice(2);
  const collectionIdx = args.indexOf("--collection");
  if (collectionIdx === -1) return {};

  const name = args[collectionIdx + 1];
  if (!name) {
    console.error("Error: --collection requires a value. Valid collections: " + CATEGORIES.join(", "));
    process.exit(1);
  }
  if (!CATEGORIES.includes(name as Category)) {
    console.error(`Error: unknown collection "${name}". Valid collections: ${CATEGORIES.join(", ")}`);
    process.exit(1);
  }
  return { collection: name as Category };
}

function main(): void {
  const { collection } = parseArgs();
  const categoriesToValidate = collection ? [collection] : CATEGORIES;

  console.log(
    collection
      ? `Validating content/_${collection}/...\n`
      : "Validating content/...\n"
  );

  const knownTags = loadKnownTags();
  validateTagSync(knownTags);
  const seenTitles = new Map<string, string>();
  let itemCount = 0;

  for (const category of categoriesToValidate) {
    const categoryDir = path.join(CONTENT_DIR, `_${category}`);
    if (!fs.existsSync(categoryDir)) continue;

    const entries = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const entry of entries) {
      const slug = entry.name;
      const itemDir = path.join(categoryDir, slug);
      const mdPath = path.join(categoryDir, `${slug}.md`);

      itemCount++;

      // Validate slug naming convention
      validateSlug(slug, category);

      // Check .md file exists
      if (!fs.existsSync(mdPath)) {
        error(`${category}/${slug}: missing ${slug}.md`);
        continue;
      }

      // Parse and validate frontmatter
      let meta: Record<string, unknown>;
      try {
        const raw = fs.readFileSync(mdPath, "utf-8");
        const { data } = matter(raw);
        meta = data as Record<string, unknown>;
        if (!meta || typeof meta !== "object") {
          error(`${category}/${slug}.md: invalid frontmatter (not an object)`);
          continue;
        }
      } catch (e) {
        error(`${category}/${slug}.md: failed to parse frontmatter: ${e}`);
        continue;
      }

      validateMeta(meta, category, slug, knownTags, itemDir);
      validateFiles(itemDir, category, slug);
      validateFilesField(meta, category, slug, itemDir);
      validateAudioField(meta, category, slug, itemDir);
      validateThumbnailRequired(meta, category, slug, itemDir);

      // Binary content integrity (magic bytes, stub size, image dimensions)
      for (const f of fs.readdirSync(itemDir, { withFileTypes: true })) {
        if (f.isFile()) {
          validateBinaryContents(path.join(itemDir, f.name), category, slug);
        }
      }

      // Light shows require a base-name-matched .fseq + audio pair
      if (category === "lightshows") {
        validateLightshowPairing(itemDir, slug, meta);
      }

      // Title uniqueness (warn — duplicates are confusing but not fatal)
      const title =
        typeof meta.title === "string" ? meta.title.trim().toLowerCase() : "";
      if (title) {
        const prior = seenTitles.get(title);
        if (prior) {
          warn(`${category}/${slug}.md: duplicate title "${meta.title}" (also used by ${prior})`);
        } else {
          seenTitles.set(title, `${category}/${slug}`);
        }
      }
    }
  }

  console.log(`\nChecked ${itemCount} items across ${categoriesToValidate.length} categor${categoriesToValidate.length === 1 ? "y" : "ies"}.`);

  if (warnings.length > 0 && !STRICT) {
    console.warn(
      `\n${warnings.length} content-integrity warning(s). Run with --strict (or VALIDATE_STRICT=1) to enforce them once placeholder assets are replaced.`
    );
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s) found.`);
    process.exit(1);
  } else {
    console.log(
      `\nAll checks passed${warnings.length ? ` (${warnings.length} warning(s))` : ""}.`
    );
  }
}

main();
