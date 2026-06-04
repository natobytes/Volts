# Content & API Schema

The authoritative spec for content in this repo and the JSON it produces. `scripts/validate.ts` enforces the content rules; `scripts/build.ts` produces the JSON. The **VOLTS app** (`natobytes/VoltsApp`) consumes the JSON — treat the "API contract" section as a cross-repo contract.

## Authoring model

An item is a **folder** plus a **sibling Markdown file**:

```
content/_<category>/<slug>/        # binary assets live here
content/_<category>/<slug>.md      # front matter — sits BESIDE the folder, not inside it
```

- `<slug>` (= the folder name) must be lowercase alphanumeric with hyphens: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- The five categories: `lightshows`, `locksounds`, `boombox`, `wraps`, `hornsounds`.

## Front-matter fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ all | Display name |
| `author` | string | ✅ all | Creator name/handle |
| `description` | string | ✅ all | Short description |
| `files` | list of `{name, label}` | ✅ all | Each `name` must exist in the item folder; `label` is shown in the app |
| `tags` | string[] | optional | Every tag must already exist in `content/tags.yaml` |
| `audio` | string | ✅ `lightshows`, `locksounds`, `boombox`, `hornsounds` | Filename of the audio asset; must exist |
| `thumbnail` | string | ✅ `wraps` | Image filename; must exist; `.png/.jpg/.jpeg/.webp/.svg` |

## Per-category rules

| Category | Allowed file types | Max size | Special rules |
|---|---|---|---|
| `lightshows` | `.fseq`, `.mp3` | 50 MB | Exactly **one** `.fseq` + an audio file sharing its **base name**; `audio` must match that base name |
| `locksounds` | `.wav` | **1 MB** | Tesla lock chime; played from a single `LockChime.wav` on the drive |
| `boombox` | `.mp3`, `.wav`, `.flac` | 50 MB | Tesla reads the first 5 files alphabetically |
| `wraps` | `.png` | **1 MB** | PNG **512–1024 px** (square-ish); `thumbnail` required |
| `hornsounds` | `.mp3`, `.wav` | 50 MB | Custom horns play via **Boombox** — WAV/MP3 only (no `.ogg`) |

### Content-integrity (warnings → `--strict` errors)
`validate.ts` warns on these by default and **fails** under `npm run validate -- --strict` (or `VALIDATE_STRICT=1`). Turn strict on (in `validate-pr.yml` + `deploy.yml`) once the placeholder fixture binaries are replaced with real assets:
- File smaller than 1 KB (placeholder stub)
- Bad magic bytes (`PSEQ` for `.fseq`, `RIFF/WAVE` for `.wav`, `ID3`/frame-sync for `.mp3`, `fLaC`, PNG signature)
- Wrap PNG outside 512–1024 px
- Duplicate `title`

## API contract (consumed by the app)

`npm run build` emits (into the gitignored `public/api/`, copied to `/api/` at deploy):

- **`catalog.json`** — `{ generatedAt, totalItems, lightshows[], locksounds[], boombox[], wraps[], hornsounds[] }`
- **`<category>.json`** — `{ category, totalItems, items[] }`
- **`tags.json`** — `{ totalTags, tags: { <tag>: ["<category>/<slug>", …] } }`

Each **item**:
```jsonc
{
  "slug": "thunderstruck-rock-show",
  "category": "lightshows",
  "title": "Thunderstruck Rock Show",
  "author": "Community (XLightShows)",
  "description": "…",
  "tags": ["rock", "synchronized"],
  "thumbnail": null,                 // string filename for wraps, else null
  "files": [                         // derived from declared meta.files ∩ disk
    { "name": "…​.fseq", "downloadUrl": "/Volts/content/lightshows/<slug>/<slug>.fseq" }
  ],
  "meta": { /* full front matter; meta.files[] also gets downloadUrl + keeps label */ }
}
```

**Cross-repo invariants (do not break without updating the app):**
1. The five **category key names** are fixed. A new category is silently ignored by the app until it ships an update (`CatalogApi.kt` has a hardcoded `CATEGORY_KEYS`).
2. `downloadUrl` is **root-relative and includes the `/Volts` prefix** (driven by `_config.yml`'s `baseurl`). The app resolves it against the host only (`https://natobytes.com`). Changing `baseurl` breaks the app's URL resolution.
3. `meta.files[].label` is relied on by the app for display.
