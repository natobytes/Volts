import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

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

interface CatalogItem {
  slug: string;
  category: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  thumbnail: string | null;
  files: FileEntry[];
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

function listFiles(dir: string, baseUrl: string, category: string, slug: string): FileEntry[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name !== "meta.yaml")
    .map((f) => ({
      name: f.name,
      downloadUrl: `${baseUrl}/content/${category}/${slug}/${f.name}`,
    }));
}

function buildCatalog(): CatalogItem[] {
  const baseUrl = readBaseUrl();
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

      // Add downloadUrl to meta.files entries if present
      if (Array.isArray(meta.files)) {
        for (const file of meta.files) {
          if (typeof file === "object" && file !== null && "name" in file) {
            (file as Record<string, unknown>).downloadUrl =
              `${baseUrl}/content/${category}/${slug}/${(file as Record<string, unknown>).name}`;
          }
        }
      }

      items.push({
        slug,
        category,
        title: meta.title || slug,
        author: meta.author || "Unknown",
        description: meta.description || "",
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        thumbnail: typeof meta.thumbnail === "string" ? meta.thumbnail : null,
        files: listFiles(itemDir, baseUrl, category, slug),
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
