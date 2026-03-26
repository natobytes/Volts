import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const CONTENT_DIR = path.resolve(__dirname, "..", "content");
const OUTPUT_DIR = path.resolve(__dirname, "..", "public", "api");

const CATEGORIES = [
  "lightshows",
  "locksounds",
  "boombox",
  "wraps",
  "hornsounds",
];

interface ItemMeta {
  title: string;
  author?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  [key: string]: unknown;
}

interface CatalogItem {
  slug: string;
  category: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  thumbnail: string | null;
  files: string[];
  meta: ItemMeta;
}

function readMetaYaml(filePath: string): ItemMeta | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return yaml.load(raw) as ItemMeta;
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

function listFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name !== "meta.yaml")
    .map((f) => f.name);
}

function buildCatalog(): CatalogItem[] {
  const items: CatalogItem[] = [];

  for (const category of CATEGORIES) {
    const categoryDir = path.join(CONTENT_DIR, category);
    const slugs = listItemDirs(categoryDir);

    for (const slug of slugs) {
      const itemDir = path.join(categoryDir, slug);
      const metaPath = path.join(itemDir, "meta.yaml");

      if (!fs.existsSync(metaPath)) continue;

      const meta = readMetaYaml(metaPath);
      if (!meta) continue;

      items.push({
        slug,
        category,
        title: meta.title || slug,
        author: meta.author || "Unknown",
        description: meta.description || "",
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        thumbnail: typeof meta.thumbnail === "string" ? meta.thumbnail : null,
        files: listFiles(itemDir),
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

  // Full catalog
  writeJSON(path.join(OUTPUT_DIR, "catalog.json"), {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    categories: CATEGORIES,
    items,
  });

  // Per-category files
  for (const category of CATEGORIES) {
    const categoryItems = items.filter((i) => i.category === category);
    writeJSON(path.join(OUTPUT_DIR, `${category}.json`), {
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
