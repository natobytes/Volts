## Wrap Submission

**Content type:** Wrap

See [SCHEMA.md](../../SCHEMA.md) for the full spec. Run `npm run validate` before submitting.

### Checklist

#### Required files
- [ ] `<slug>.md` with frontmatter containing all required fields
- [ ] Wrap image: `.png`, **512–1024 px**, ≤ 1 MB

#### Frontmatter fields (in `<slug>.md`)
- [ ] `title` — display name for this wrap design
- [ ] `author` — creator name or handle
- [ ] `description` — brief description of the wrap
- [ ] `files` — list of `{ name, label }` for each asset (must exist in the folder)
- [ ] `thumbnail` — preview image filename (`.png/.jpg/.jpeg/.webp/.svg`, must exist)
- [ ] `tags` — array of tags from `content/tags.yaml` (optional)

#### Naming & structure
- [ ] Folder placed in `content/_wraps/<slug>/`
- [ ] Slug is lowercase alphanumeric with hyphens (e.g. `matte-black`)
- [ ] PNG file is **≤ 1 MB**

### Description

<!-- Describe your wrap: color scheme, style, which vehicle models it targets, etc. -->
