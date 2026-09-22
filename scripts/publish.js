import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { postToX } from "./post-to-x.js";

const API_KEY = process.env.DEVTO_API_KEY;
const ARTICLES_DIR = path.resolve("articles");
const API_BASE = "https://dev.to/api/articles";

if (!API_KEY) {
  console.error("DEVTO_API_KEY is not set. Add it as a repo secret.");
  process.exit(1);
}

function splitFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    throw new Error("No frontmatter block found (expected --- ... ---)");
  }
  const frontmatter = yaml.load(m[1]) || {};
  const body = m[2].replace(/^\n+/, "");
  return { frontmatter, body };
}

function serialize(frontmatter, body) {
  const yamlStr = yaml.dump(frontmatter, { lineWidth: -1 });
  return `---\n${yamlStr}---\n\n${body.trim()}\n`;
}

async function callForem(method, url, payload) {
  const res = await fetch(url, {
    method,
    headers: {
      "api-key": API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Forem API ${method} ${url} failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    console.log("No articles found in articles/. Nothing to do.");
    return;
  }

  let changed = false;

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const { frontmatter, body } = splitFrontmatter(raw);

    if (frontmatter.skip === true) {
      console.log(`Skipping ${file} (skip: true)`);
      continue;
    }

    const payload = {
      article: {
        title: frontmatter.title,
        body_markdown: body,
        published: frontmatter.published !== false,
        tags: frontmatter.tags || [],
        series: frontmatter.series || undefined,
        canonical_url: frontmatter.canonical_url || undefined,
        main_image: frontmatter.cover_image || undefined,
      },
    };

    let articleUrl = frontmatter.url;

    if (frontmatter.id) {
      console.log(`Updating ${file} (id=${frontmatter.id})`);
      await callForem("PUT", `${API_BASE}/${frontmatter.id}`, payload);
    } else {
      console.log(`Creating ${file}`);
      const result = await callForem("POST", API_BASE, payload);
      frontmatter.id = result.id;
      frontmatter.url = result.url;
      articleUrl = result.url;
      console.log(`  -> published at ${result.url}`);
    }

    const isPublished = payload.article.published;
    if (isPublished && !frontmatter.posted_to_x && articleUrl) {
      const tweetText = frontmatter.x_post
        ? `${frontmatter.x_post}\n${articleUrl}`
        : `新しい記事を公開しました\n${frontmatter.title}\n${articleUrl}`;
      await postToX(tweetText);
      frontmatter.posted_to_x = true;
    }

    fs.writeFileSync(filePath, serialize(frontmatter, body));
    changed = true;
  }

  if (changed) {
    console.log("::set-output name=changed::true");
    fs.writeFileSync(
      path.resolve(".publish-changed"),
      "1"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
