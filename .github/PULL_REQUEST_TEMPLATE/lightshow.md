## Light Show Submission

**Content type:** Light Show

See [SCHEMA.md](../../SCHEMA.md) for the full spec. Run `npm run validate` before submitting.

### Checklist

#### Required files
- [ ] `<slug>.md` with frontmatter containing all required fields
- [ ] Exactly one `.fseq` sequence file
- [ ] One `.mp3` audio file **sharing the `.fseq` base name** (e.g. `my-show.fseq` + `my-show.mp3`)

#### Frontmatter fields (in `<slug>.md`)
- [ ] `title` — display name for this light show
- [ ] `author` — creator name or handle
- [ ] `description` — brief description of the light show
- [ ] `files` — list of `{ name, label }` for each asset (must exist in the folder)
- [ ] `audio` — the `.mp3` filename (must match the `.fseq` base name)
- [ ] `tags` — array of tags from `content/tags.yaml` (optional)

#### Naming & structure
- [ ] Folder placed in `content/_lightshows/<slug>/`
- [ ] Slug is lowercase alphanumeric with hyphens (e.g. `holiday-special`)
- [ ] No file exceeds 50 MB

### Description

<!-- Describe your light show: what song/theme, any special effects, etc. -->

### Preview

<!-- Link to a video preview if available -->
