# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Volts** is the community content catalog for Tesla USB customizations — light shows, lock sounds, boombox tracks, wraps, and horn sounds. It is a **Jekyll** site (human-browsable HTML) that **also emits a JSON API** consumed by the companion **VOLTS** Kotlin Multiplatform app (`natobytes/VoltsApp`, the `app/` folder in this workspace).

- Repo: `natobytes/Volts`. Deployed via **GitHub Pages** at `https://natobytes.com/Volts/` (custom domain) — also reachable at `https://natobytes.github.io/Volts/`.
- The app fetches **`https://natobytes.com/Volts/api/catalog.json`**. The JSON is the contract between this repo and the app — see **Data Contract** below. Don't change its shape without coordinating with `app/.../catalog/CatalogApi.kt`.
- Two toolchains live side by side: **Ruby/Jekyll** renders the website; **Node/TypeScript** generates the JSON API. They are independent and only joined in CI (`cp -r public/api _site/api`).

## Build & Development Commands

```bash
# One-time install (both toolchains)
bundle install     # Ruby/Jekyll deps (Gemfile)
npm install        # Node deps for the build/validate scripts (package.json)

# Run the website locally (http://localhost:4000/Volts/)
bundle exec jekyll serve

# Generate the JSON API into public/api/ (catalog.json, <category>.json, tags.json)
npm run build      # -> ts-node scripts/build.ts

# Validate all content (run this before committing new content)
npm run validate   # -> ts-node scripts/validate.ts
npm run validate -- --collection lightshows   # validate just one category
```

> `public/api/` is **gitignored** — the JSON is a build artifact, not committed. It only exists locally after `npm run build`, and in the deployed Pages artifact.

## Repository Structure

```
content/                     # Jekyll collections live here (collections_dir: content)
  _lightshows/  _locksounds/  _boombox/  _wraps/  _hornsounds/
    <slug>.md                #   item metadata (front matter) — sits BESIDE the folder
    <slug>/                  #   item's binary assets (.fseq, .mp3, .wav, .png, ...)
      <files>
  tags.yaml                  # canonical allowed-tags list (validation source of truth)
_layouts/                    # category.html, item.html, tag.html, tags.html, default.html
_includes/                   # nav.html, tag-filter.html
_plugins/copy_collection_files.rb  # copies collection binaries into _site/content/...
scripts/build.ts             # generates public/api/*.json  (the app's feed)
scripts/validate.ts          # content linter (required fields, tags, file existence, sizes)
<category>.md                # category index pages (lightshows.md, locksounds.md, ...)
tags/*.md                    # one page per tag (mirrors content/tags.yaml — kept in sync by hand)
_data/tags.yaml              # duplicate of content/tags.yaml used by templates
search.json                  # Jekyll-rendered client-side search index for the website
```

**Identity rule:** an item's **slug is its folder name** (`content/_<category>/<slug>/`). The metadata file must be the sibling `content/_<category>/<slug>.md` — one level **up** from the folder, not inside it. `build.ts` and `validate.ts` both key off the folder name and skip a folder with no matching `<slug>.md`.

## JSON Build Pipeline (`scripts/build.ts`)

`npm run build` reads every `content/_<category>/<slug>/` folder, parses the sibling `<slug>.md` front matter (gray-matter), and writes to `public/api/`:

- **`catalog.json`** — top-level `{ generatedAt, totalItems, lightshows[], locksounds[], boombox[], wraps[], hornsounds[] }`. **This is the file the app consumes.**
- **`<category>.json`** — per-category `{ category, totalItems, items[] }`.
- **`tags.json`** — `{ totalTags, tags: { <tag>: ["<category>/<slug>", ...] } }`.

Each catalog **item** is: `slug`, `category`, `title` (defaults to slug), `author` (defaults to `"Unknown"`), `description` (defaults to `""`), `tags[]`, `thumbnail` (string or `null`), `files[]`, and `meta` (the full front matter). `download` URLs are `"<baseurl>/content/<category>/<slug>/<filename>"` where `baseurl` is read from `_config.yml` (`/Volts`).

> ⚠️ **`files[]` is built from a disk glob of the slug folder, NOT from `meta.files`.** `build.ts` lists every file in the folder and emits `{name, downloadUrl}` for each. `meta.files[]` (with human `label`s) is carried under `meta` and separately gets `downloadUrl` injected. So the top-level `files[]` and `meta.files[]` are derived independently — a stray/extra/renamed file in the folder will appear in the feed even if it isn't declared in front matter. The app joins labels from `meta.files[]` back onto `files[]` by `name`.

## Data Contract (with the VOLTS app)

The app (`app/shared/data/.../catalog/CatalogApi.kt`) fetches `catalog.json`, reads the top-level object, and iterates a **hardcoded** list of category keys (`lightshows`, `locksounds`, `boombox`, `wraps`, `hornsounds`). Per item it reads `slug`, `category`, `title`, `author`, `description`, `tags`, `files[] {name, downloadUrl}`, `thumbnail`, `meta`, and joins per-file `label`s from `meta.files[]`.

Cross-repo invariants to preserve:
- **Category key names** must stay exactly these five. Adding a new category here is **silently dropped** by the app until the app ships an update with the new key.
- **`downloadUrl` is root-relative and includes the `/Volts` prefix** (e.g. `/Volts/content/lightshows/<slug>/<slug>.fseq`). The app resolves it against the host **only** (`https://natobytes.com`). Changing `_config.yml`'s `baseurl` silently breaks the app's URL resolution.
- `meta.files[].label` is currently **required** by `validate.ts`; the app relies on it for display.

## Content Authoring (adding an item)

1. Pick the category. Create the folder `content/_<category>/<slug>/` (slug = lowercase alphanumeric + hyphens) and drop the binary asset(s) in it.
2. Create the sibling `content/_<category>/<slug>.md` with front matter. Minimum required (enforced by `validate.ts`):
   - `title`, `author`, `description`
   - `files:` — a list of `{ name, label }`, each `name` must exist in the folder
   - `tags:` — every tag must already exist in `content/tags.yaml` (add it there first)
   - `audio: <filename>` — **required** for `lightshows`, `locksounds`, `boombox`, `hornsounds`
   - `thumbnail: <filename>` — **required** for `wraps` (must exist; png/jpg/jpeg/webp/svg)
3. Allowed file extensions & size caps per category live in `scripts/validate.ts` (`ALLOWED_EXTENSIONS`, `MAX_FILE_SIZE_PER_CATEGORY`: locksounds & wraps 1 MB, else 50 MB).
4. Run `npm run validate` and fix any errors. See `content/_<category>/README.md` and `.github/PULL_REQUEST_TEMPLATE/<type>.md` for per-type guidance.

Example (`content/_lightshows/thunderstruck-rock-show.md`):
```yaml
---
title: Thunderstruck Rock Show
author: Community (XLightShows)
description: A high-energy rock-themed synchronized light show.
audio: thunderstruck-rock-show.mp3
files:
  - name: thunderstruck-rock-show.fseq
    label: Light Sequence
  - name: thunderstruck-rock-show.mp3
    label: Audio Track
tags: [rock, synchronized]
---
```

## CI / Deployment

- **`.github/workflows/deploy.yml`** — on push to `main`: `npm install` → `npm run build` → `bundle exec jekyll build` → `cp -r public/api _site/api` → deploy `_site` to GitHub Pages.
  > ⚠️ Deploy does **not** run `npm run validate`. A direct push to `main` (or admin merge) can ship an unvalidated catalog. Validation only gates PRs.
- **`.github/workflows/validate-pr.yml`** + the per-category `validate-<category>.yml` — run `npm run validate` on PRs to `main`.
- **`.github/workflows/validate-single-component.yml`** — enforces that a PR touches only **one** collection.
- **Renovate** (`renovate.json`) manages dependency updates.
- Deployment domain (`natobytes.com`) is configured in the repo's Pages settings; there is **no committed `CNAME`** file.

## Conventions

- Commits/PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) (`.github/semantic.yml` enforces it). Content PRs commonly use the `content:` type/scope.
- Tags are governed: the allowed set is `content/tags.yaml`. It is **duplicated** in `_data/tags.yaml` and one `tags/<tag>.md` page per tag — keep all three in sync when adding a tag.
- Validation, not types, is the schema authority. There is no committed JSON Schema; `scripts/validate.ts` + the per-category README/PR templates are the de-facto spec.

## MCP servers

`.mcp.json` configures two servers for this repo:
- **codegraph** — code-intelligence knowledge graph (indexed; the TS build/validate scripts and the Ruby plugin are in the graph — markdown/Jekyll templates are not parsed). Re-run `codegraph sync` after large changes.
- **context7** — up-to-date library/framework docs (use for Jekyll, kramdown, gray-matter, ts-node, GitHub Actions).
