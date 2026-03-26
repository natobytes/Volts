import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import matter from "gray-matter";

const CONTENT_DIR = path.resolve(__dirname, "..", "content");
const TAGS_FILE = path.join(CONTENT_DIR, "tags.yaml");

const CATEGORIES = [
  "lightshows",
  "locksounds",
  "boombox",
  "wraps",
  "hornsounds",
] as const;

type Category = (typeof CATEGORIES)[number];

// Allowed file extensions per category (excluding meta.yaml)
const ALLOWED_EXTENSIONS: Record<Category, string[]> = {
  lightshows: [".fseq", ".mp3"],
  locksounds: [".wav"],
  boombox: [".mp3", ".wav", ".ogg"],
  wraps: [".png", ".jpg", ".jpeg", ".webp", ".svg"],
  hornsounds: [".mp3", ".wav", ".ogg"],
};

// Required frontmatter fields
const REQUIRED_META_FIELDS = ["title", "author", "description"];

// Max file size: 50 MB
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Allowed thumbnail extensions
const THUMBNAIL_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

// Slug pattern: lowercase alphanumeric + hyphens
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors: string[] = [];

function error(msg: string): void {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
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

    // Check file size
    const filePath = path.join(itemDir, file.name);
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
      error(
        `${category}/${slug}/${file.name}: file too large (${sizeMB} MB, max 50 MB)`
      );
    }
  }
}

function validateFilesField(
  meta: Record<string, unknown>,
  category: string,
  slug: string,
  itemDir: string
): void {
  if (meta.files === undefined) return;

  if (!Array.isArray(meta.files)) {
    error(`${category}/${slug}.md: "files" must be an array`);
    return;
  }

  for (const entry of meta.files) {
    if (!entry || typeof entry !== "object") {
      error(`${category}/${slug}.md: each entry in "files" must be an object with a "name" field`);
      continue;
    }
    const fileEntry = entry as Record<string, unknown>;
    if (!fileEntry.name || typeof fileEntry.name !== "string" || fileEntry.name.trim() === "") {
      error(`${category}/${slug}.md: each entry in "files" must have a non-empty "name" string`);
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

function main(): void {
  console.log("Validating content/...\n");

  const knownTags = loadKnownTags();
  let itemCount = 0;

  for (const category of CATEGORIES) {
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
    }
  }

  console.log(`\nChecked ${itemCount} items across ${CATEGORIES.length} categories.`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s) found.`);
    process.exit(1);
  } else {
    console.log("\nAll checks passed.");
  }
}

main();
