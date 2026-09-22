# devto-content

GitHub -> DEV Community (dev.to) auto-publish loop, same pattern as `~/qiita-content`.

Push a Markdown file to `articles/` on `main` -> GitHub Actions posts it to
dev.to via the Forem API -> the assigned article `id`/`url` is written back
into the file's frontmatter and committed automatically (so the next push
updates the same article instead of creating a duplicate).

## One-time setup (do this once)

1. Create a **new GitHub repo** named `devto-content` under
   `github.com/hideki-tamae` and push this folder to it:
   ```bash
   cd ~/devto-content
   git init
   git add .
   git commit -m "chore: scaffold devto publish pipeline"
   git branch -M main
   git remote add origin https://github.com/hideki-tamae/devto-content.git
   git push -u origin main
   ```
2. Get a dev.to API key: dev.to -> profile icon -> **Settings** ->
   **Extensions** -> **DEV API Keys** -> generate a key.
3. In the GitHub repo: **Settings -> Secrets and variables -> Actions ->
   New repository secret** -> name `DEVTO_API_KEY`, paste the key.
4. Make sure the dev.to profile itself has the Japanese name / bio already
   set (done) and is connected to X (done via "Connect Twitter (X) Account").

## Writing an article

Add a file to `articles/`, e.g. `articles/my-post.md`:

```markdown
---
title: "記事タイトル"
published: true
tags: [ai, agenticai]
canonical_url: https://zenn.dev/your-handle/articles/xxxx   # if cross-posting from Zenn/Qiita/note
---

本文（Markdown）
```

Notes specific to dev.to (different from Qiita):

- `tags`: max **4**, each must be a single lowercase alphanumeric word (no
  spaces, no Japanese, no hyphens) — e.g. `agenticai`, not `AI駆動開発`.
- `canonical_url`: set this when cross-posting an article that already
  exists on note/Zenn/Qiita, so Google treats the *original* as authoritative
  and dev.to as a syndicated copy (avoids duplicate-content SEO dilution).
- `published: false` saves it as a draft on dev.to without going public.

Commit and push to `main` (or run the workflow manually from the Actions
tab) and the article appears on `https://dev.to/hidekitamae` within
about a minute.

## Removing the sample article

`articles/sample-hello-devto.md` is a placeholder with `published: false`.
Delete it (or flip it to a real draft) once the pipeline is confirmed
working.
