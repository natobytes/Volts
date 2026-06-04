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

      items.push({
        slug,
        category,
        title: meta.title || slug,
        author: meta.author || "Unknown",
        description: meta.description || "",
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        thumbnail: typeof meta.thumbnail === "string" ? meta.thumbnail : null,
        files: buildFiles(meta, itemDir, baseUrl, category, slug),
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
