import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import matter from "gray-matter";

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content");
const OUTPUT_DIR = path.join(ROOT_DIR, "public", "api");
const CONFIG_PATH = path.join(ROOT_DIR, "_config.yml");

function readBaseUrl(): string {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = yaml.load(raw) as Record<string, unknown>;
    return typeof config.baseurl === "string" ? config.baseurl : "";
  } catch {
    return "";
  }
}

const CATEGORIES = [
  "lightshows",
  "locksounds",
  "boombox",
  "wraps",
  "hornsounds",
];

// Bumped whenever the emitted JSON shape changes in a way the app should know
// about. The app may read this to gate parsing of newer optional fields.
const SCHEMA_VERSION = 1;

interface ItemMeta {
  title: string;
  author?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  [key: string]: unknown;
}

interface FileEntry {
  name: string;
  downloadUrl: string;
}

// Best-effort media specs parsed from an item's binaries. Every field is
// nullable: today's fixtures are placeholder stubs, so most values are null,
// and any parse failure leaves the relevant field null rather than throwing.
interface ItemSpecs {
  channels: number | null;
  sampleRate: number | null;
  durationSeconds: number | null;
}

interface CatalogItem {
  slug: string;
  category: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  thumbnail: string | null;
  thumbnailUrl: string | null;
  files: FileEntry[];
  specs: ItemSpecs;
  meta: ItemMeta;
}

function readFrontmatter(filePath: string): ItemMeta | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    return data as ItemMeta;
  } catch {
    console.warn(`Warning: could not read ${filePath}, skipping.`);
    return null;
  }
}

function listItemDirs(categoryDir: string): string[] {
  if (!fs.existsSync(categoryDir)) return [];
  return fs
    .readdirSync(categoryDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function urlFor(baseUrl: string, category: string, slug: string, name: string): string {
  return `${baseUrl}/content/${category}/${slug}/${name}`;
}

// --- Best-effort media-spec parsing ----------------------------------------
//
// These helpers crack open an item's binaries to surface display specs
// (channels / sampleRate / durationSeconds). They mirror the magic-byte
// approach in scripts/validate.ts, but here every parse is wrapped in a
// try/catch and returns nulls on ANY failure: the committed fixtures are
// tiny placeholder stubs (e.g. a 36-byte .fseq), so a header read may be
// truncated or nonsensical. We must NEVER throw — a malformed asset should
// just yield null specs, not break the whole catalog build.

const EMPTY_SPECS: ItemSpecs = {
  channels: null,
  sampleRate: null,
  durationSeconds: null,
};

function matches(buf: Buffer, ascii: string, offset = 0): boolean {
  if (buf.length < offset + ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (buf[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

// FSEQ v2.x light-show sequence ("PSEQ" magic). Per the Tesla/xLights layout:
//   offset 0  : "PSEQ" magic
//   offset 10 : uint32 LE channelCount
//   offset 14 : uint32 LE frameCount
//   offset 18 : uint8     stepTime (ms per frame)
// durationSeconds = frameCount * stepTime / 1000.
function parseFseqSpecs(filePath: string): ItemSpecs {
  try {
    const buf = fs.readFileSync(filePath);
    if (!matches(buf, "PSEQ")) return EMPTY_SPECS;
    if (buf.length < 19) return EMPTY_SPECS;
    const channelCount = buf.readUInt32LE(10);
    const frameCount = buf.readUInt32LE(14);
    const stepTime = buf.readUInt8(18);
    return {
      channels: channelCount,
      sampleRate: null,
      durationSeconds: (frameCount * stepTime) / 1000,
    };
  } catch {
    return EMPTY_SPECS;
  }
}

// WAV (RIFF/WAVE). Walk the chunk list to find `fmt ` (sampleRate, channels,
// bitsPerSample) and `data` (byte size), then derive duration for PCM:
//   durationSeconds = dataSize / (sampleRate * channels * bitsPerSample / 8).
function parseWavSpecs(filePath: string): ItemSpecs {
  try {
    const buf = fs.readFileSync(filePath);
    if (!matches(buf, "RIFF") || !matches(buf, "WAVE", 8)) return EMPTY_SPECS;

    let sampleRate: number | null = null;
    let channels: number | null = null;
    let bitsPerSample: number | null = null;
    let dataSize: number | null = null;

    // Chunks start after "RIFF"(4) + size(4) + "WAVE"(4) = offset 12.
    let off = 12;
    while (off + 8 <= buf.length) {
      const id = buf.toString("ascii", off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      const body = off + 8;
      if (id === "fmt " && body + 16 <= buf.length) {
        channels = buf.readUInt16LE(body + 2);
        sampleRate = buf.readUInt32LE(body + 4);
        bitsPerSample = buf.readUInt16LE(body + 14);
      } else if (id === "data") {
        dataSize = size;
      }
      // Chunks are word-aligned: an odd size carries a trailing pad byte.
      off = body + size + (size % 2);
    }

    let durationSeconds: number | null = null;
    if (
      dataSize !== null &&
      sampleRate &&
      channels &&
      bitsPerSample &&
      sampleRate > 0 &&
      channels > 0 &&
      bitsPerSample > 0
    ) {
      durationSeconds = dataSize / (sampleRate * channels * (bitsPerSample / 8));
    }

    return { channels, sampleRate, durationSeconds };
  } catch {
    return EMPTY_SPECS;
  }
}

// Picks the binary worth probing for an item and returns its specs. Lightshows
// are described by their .fseq; the audio categories by their .wav. MP3 is
// intentionally left unparsed (VBR makes duration/sampleRate unreliable from a
// header read), so an mp3-only item yields all-null specs. Any item with no
// parseable binary also yields all-null specs.
function buildSpecs(category: string, itemDir: string, files: FileEntry[]): ItemSpecs {
  const find = (ext: string): string | null => {
    const hit = files.find((f) => path.extname(f.name).toLowerCase() === ext);
    return hit ? path.join(itemDir, hit.name) : null;
  };

  if (category === "lightshows") {
    const fseq = find(".fseq");
    return fseq ? parseFseqSpecs(fseq) : EMPTY_SPECS;
  }

  // locksounds / hornsounds / boombox (and anything else that ships a .wav).
  const wav = find(".wav");
  if (wav) return parseWavSpecs(wav);

  return EMPTY_SPECS;
}

// Build the catalog's top-level files[] from the DECLARED meta.files (the
// contract the app consumes), intersected with what's actually on disk. Falls
// back to a disk glob only when an item declares no files, and warns loudly on
// any drift so stray/renamed/missing files can't silently ship to the app.
function buildFiles(
  meta: ItemMeta,
  itemDir: string,
  baseUrl: string,
  category: string,
  slug: string
): FileEntry[] {
  const onDisk = new Set(
    fs
      .readdirSync(itemDir, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name)
  );

  const declared = Array.isArray(meta.files)
    ? (meta.files as unknown[])
        .map((f) =>
          f && typeof f === "object" && typeof (f as Record<string, unknown>).name === "string"
            ? ((f as Record<string, unknown>).name as string)
            : null
        )
        .filter((n): n is string => n !== null)
    : [];

  if (declared.length === 0) {
    console.warn(`  ! ${category}/${slug}: no meta.files declared — falling back to disk glob`);
    return [...onDisk].map((name) => ({ name, downloadUrl: urlFor(baseUrl, category, slug, name) }));
  }

  for (const name of declared) {
    if (!onDisk.has(name)) {
      console.warn(`  ! ${category}/${slug}: declared file "${name}" missing on disk — omitted from catalog`);
    }
  }
  for (const name of onDisk) {
    if (!declared.includes(name)) {
      console.warn(`  ! ${category}/${slug}: file "${name}" on disk but not declared in meta.files — omitted from catalog`);
    }
  }

  return declared
    .filter((name) => onDisk.has(name))
    .map((name) => ({ name, downloadUrl: urlFor(baseUrl, category, slug, name) }));
}

function buildCatalog(): CatalogItem[] {
  const baseUrl = readBaseUrl();
  const items: CatalogItem[] = [];

  for (const category of CATEGORIES) {
    const categoryDir = path.join(CONTENT_DIR, `_${category}`);
    const slugs = listItemDirs(categoryDir);

    for (const slug of slugs) {
      const itemDir = path.join(categoryDir, slug);
      const mdPath = path.join(categoryDir, `${slug}.md`);

      if (!fs.existsSync(mdPath)) continue;

      const meta = readFrontmatter(mdPath);
      if (!meta) continue;

      // Add downloadUrl to meta.files entries if present
      if (Array.isArray(meta.files)) {
        for (const file of meta.files) {
          if (typeof file === "object" && file !== null && "name" in file) {
            (file as Record<string, unknown>).downloadUrl =
              `${baseUrl}/content/${category}/${slug}/${(file as Record<string, unknown>).name}`;
          }
        }
      }

      if (!meta.title) {
        console.warn(`  ! ${category}/${slug}: missing "title" — defaulting to slug`);
      }
      if (!meta.author) {
        console.warn(`  ! ${category}/${slug}: missing "author" — defaulting to "Unknown"`);
      }

      const thumbnail = typeof meta.thumbnail === "string" ? meta.thumbnail : null;
      const files = buildFiles(meta, itemDir, baseUrl, category, slug);

      items.push({
        slug,
        category,
        title: meta.title || slug,
        author: meta.author || "Unknown",
        description: meta.description || "",
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        thumbnail,
        // Root-relative, same convention as files[].downloadUrl; null when no
        // thumbnail is declared in front matter.
        thumbnailUrl: thumbnail ? urlFor(baseUrl, category, slug, thumbnail) : null,
        files,
        specs: buildSpecs(category, itemDir, files),
        meta,
      });
    }
  }

  return items;
}

function buildTagIndex(items: CatalogItem[]): Record<string, string[]> {
  const tagMap: Record<string, string[]> = {};

  for (const item of items) {
    for (const tag of item.tags) {
      const normalized = tag.toLowerCase().trim();
      if (!normalized) continue;
      if (!tagMap[normalized]) tagMap[normalized] = [];
      tagMap[normalized].push(`${item.category}/${item.slug}`);
    }
  }

  // Sort tags alphabetically
  const sorted: Record<string, string[]> = {};
  for (const key of Object.keys(tagMap).sort()) {
    sorted[key] = tagMap[key];
  }
  return sorted;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`  → ${path.relative(process.cwd(), filePath)}`);
}

function main(): void {
  console.log("Building catalog from content/...\n");

  const items = buildCatalog();
  ensureDir(OUTPUT_DIR);

  // Full catalog — grouped by category
  const catalog: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
  };
  for (const category of CATEGORIES) {
    catalog[category] = items.filter((i) => i.category === category);
  }
  writeJSON(path.join(OUTPUT_DIR, "catalog.json"), catalog);

  // Per-category files
  for (const category of CATEGORIES) {
    const categoryItems = items.filter((i) => i.category === category);
    writeJSON(path.join(OUTPUT_DIR, `${category}.json`), {
      schemaVersion: SCHEMA_VERSION,
      category,
      totalItems: categoryItems.length,
      items: categoryItems,
    });
  }

  // Tag index
  const tags = buildTagIndex(items);
  writeJSON(path.join(OUTPUT_DIR, "tags.json"), {
    totalTags: Object.keys(tags).length,
    tags,
  });

  console.log(
    `\nDone. ${items.length} items across ${CATEGORIES.length} categories.`
  );
}

main();
