## Lock Sound Submission

**Content type:** Lock Sound

See [SCHEMA.md](../../SCHEMA.md) for the full spec. Run `npm run validate` before submitting.

### Checklist

#### Required files
- [ ] `<slug>.md` with frontmatter containing all required fields
- [ ] One `.wav` audio file (Tesla lock chime: 24 kHz mono PCM recommended, ≤ 5 s)

#### Frontmatter fields (in `<slug>.md`)
- [ ] `title` — display name for this lock sound
- [ ] `author` — creator name or handle
- [ ] `description` — brief description of the lock sound
- [ ] `files` — list of `{ name, label }` for each asset (must exist in the folder)
- [ ] `audio` — the `.wav` filename (must exist)
- [ ] `tags` — array of tags from `content/tags.yaml` (optional)

#### Naming & structure
- [ ] Folder placed in `content/_locksounds/<slug>/`
- [ ] Slug is lowercase alphanumeric with hyphens (e.g. `r2d2-beep`)
- [ ] WAV file is **≤ 1 MB**

### Description

<!-- Describe your lock sound: what it sounds like, inspiration, etc. -->
