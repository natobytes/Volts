# Volts Catalog Site — Improvement Plan

Tracked remediation plan from the 2026-06-04 audit of `natobytes/Volts` + the contract with the `natobytes/VoltsApp` app. Check items off as they land. Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low. Items marked **[OWNER]** require repo/settings access.

**Owner decisions applied:** custom horns are Boombox → drop `.ogg` from hornsounds; committed binaries are **fixtures to be replaced** with real assets (add real binary validation; reject stubs).

---

## F — Build & deploy integrity  _(task #2)_

- [x] 🟠 **F1** `deploy.yml` never runs validation → a push straight to `main` ships an unvalidated catalog. Add `npm ci` + `npm run validate` as a required step **before** build (fail on non-zero). File: `.github/workflows/deploy.yml`.
- [x] 🟠 **F2** `build.ts` emits top-level `files[]` from a **disk glob**, not declared `meta.files` → stray/extra/renamed files reach the feed. Emit `files[]` from validated `meta.files` (intersect disk ∩ meta); log/fail loud on missing files or defaulted `title`/`author` instead of silently defaulting. File: `scripts/build.ts:74-121`.
- [x] 🟡 **F3** _(added `.github/workflows/build-check.yml`)_ No build/Jekyll gate on PRs → a change that breaks `build.ts` or `jekyll build` only fails on the `main` deploy (then serves the last good artifact silently). Add `npm run build` + `bundle exec jekyll build` (no deploy) as a required PR check.
- [ ] 🟠 **F4** **[OWNER]** Branch-protect `main` to require the validate + build checks; commit a `CNAME` (or confirm Pages custom-domain settings); enable Enforce-HTTPS + deploy-failure alerting.

## G — Content validation depth  _(task #3)_

- [x] 🟠 **G1** No fseq/audio pairing check. Add a lightshow rule: exactly one `.fseq` + one audio file with matching base name; `meta.audio` must match. File: `scripts/validate.ts`.
- [x] 🟠 **G2** **No binary format validation** — current samples are 36-byte `.fseq` / 421-byte `.mp3` / 69-byte `.png` stubs that pass clean. Add magic-byte checks (`PSEQ` fseq, `RIFF/WAVE` wav, `ID3`/`0xFFFB` mp3, PNG signature) and reject implausibly small files (e.g. < 1 KB).
- [x] 🟡 **G3** Add: PNG **dimension** validation for wraps (512–1024 px, decode IHDR); **(category, slug)** + **title** uniqueness (two horn sounds both titled "La Cucaracha"); cross-check `meta.audio`/`meta.files` extensions against the category allow-list.
- [x] 🟠 **G4** Drop **`.ogg`** from `hornsounds` `ALLOWED_EXTENSIONS` (Boombox plays WAV/MP3 only) — pairs with the app routing hornsounds → Boombox. File: `scripts/validate.ts:25`.

## Contributor docs & tags  _(task #4)_

- [x] 🟡 **G5** _(added `SCHEMA.md`; fixed all 5 PR templates)_ Reconcile `.github/PULL_REQUEST_TEMPLATE/*.md` with `validate.ts` required fields (`files[]`, `audio`, `thumbnail`); add a `SCHEMA.md`; clarify the `audio` field (required here but currently dropped by the app's model).
- [~] ⚪ **G6** Tags: added a **sync assertion** in `validate.ts` (errors if `_data/tags.yaml` or `tags/*.md` drift from `content/tags.yaml`). _Remaining:_ optional GitHub **Issue Form** intake for non-technical contributors (currently git+npm only).

## H — Cross-repo contract  _(task #13)_

- [x] 🟡 **H1** _(documented in `SCHEMA.md` → "API contract")_ Treat the JSON shape as a contract: keep the 5 category keys stable (the app's `CATEGORY_KEYS` is hardcoded — new categories are dropped until the app updates); `downloadUrl` must stay root-relative incl. the `/Volts` prefix (driven by `_config.yml baseurl`); `meta.files[].label` is relied on by the app. Document in `SCHEMA.md`; the path literal is duplicated in 4+ places (`build.ts`).

---

## [OWNER] items (need repo settings)
- Branch protection on `main` requiring validate + build checks (F4)
- `CNAME` / Pages custom-domain + Enforce-HTTPS + deploy-failure monitoring (F4)
- Replace the placeholder stub binaries with real assets before launch
