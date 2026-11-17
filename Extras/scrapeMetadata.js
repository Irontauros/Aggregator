const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

const HTML_FETCH_TIMEOUT_MS = 10000;
const IMAGE_TEST_TIMEOUT_MS = 5000;
const MAX_THUMBNAIL_CANDIDATES = 20;

async function scrapeMetadata(url) {
  const result = { title: "", thumbnail: "" };

  if (!url) return result;

  try {
    const html = await fetchHtml(url);
    if (!html) return result;

    result.title = extractTitle(html);
    result.thumbnail = await extractThumbnail(html, url);
  } catch (err) {
    console.error("scrapeMetadata failed for", url, "-", err.message);
  }

  return result;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(HTML_FETCH_TIMEOUT_MS)
  });

  if (!response.ok) return null;
  return response.text();
}

function extractTitle(html) {
  return (
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    extractMetaContent(html, "twitter:text:title") ||
    extractTitleTag(html) ||
    ""
  );
}

async function extractThumbnail(html, pageUrl) {
  const candidates = [];

  function addCandidate(value) {
    if (!value) return;
    const resolved = resolveUrl(value, pageUrl);
    if (!resolved) return;
    if (looksLikeVideoExtension(resolved)) return;
    if (isProbablyInvalidUrl(resolved)) return;
    if (!candidates.includes(resolved)) candidates.push(resolved);
  }

  addCandidate(extractMetaContent(html, "og:image"));
  addCandidate(extractMetaContent(html, "og:image:secure_url"));
  addCandidate(extractMetaContent(html, "og:image:url"));
  addCandidate(extractMetaContent(html, "twitter:image"));
  addCandidate(extractMetaContent(html, "twitter:image:src"));
  addCandidate(extractLinkHref(html, "image_src"));

  for (const candidate of extractAllJsonLdThumbnails(html)) addCandidate(candidate);
  for (const candidate of extractAllVideoPosters(html)) addCandidate(candidate);
  for (const candidate of extractImageSources(html)) addCandidate(candidate);

  const candidatesToTest = candidates.slice(0, MAX_THUMBNAIL_CANDIDATES);

  for (const candidate of candidatesToTest) {
    try {
      const valid = await testImageUrl(candidate, pageUrl);
      if (valid) return candidate;
    } catch {
      // try next candidate
    }
  }

  return candidates[0] || "";
}

async function testImageUrl(imageUrl, pageUrl) {
  const headers = {
    "User-Agent": BROWSER_UA,
    "Accept": IMAGE_ACCEPT,
    "Accept-Language": "en-US,en;q=0.9"
  };

  if (pageUrl) headers.Referer = pageUrl;

  try {
    const headResponse = await fetch(imageUrl, {
      method: "HEAD",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(IMAGE_TEST_TIMEOUT_MS)
    });

    if (headResponse.ok) {
      const contentType = headResponse.headers.get("content-type") || "";
      if (contentType.toLowerCase().startsWith("image/")) return true;
    }
  } catch {
    // fall through to GET
  }

  try {
    const getResponse = await fetch(imageUrl, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-1023" },
      redirect: "follow",
      signal: AbortSignal.timeout(IMAGE_TEST_TIMEOUT_MS)
    });

    if (!getResponse.ok) return false;

    const contentType = getResponse.headers.get("content-type") || "";
    return contentType.toLowerCase().startsWith("image/");
  } catch {
    return false;
  }
}

function resolveUrl(candidate, pageUrl) {
  if (!candidate) return null;

  try {
    candidate = candidate.trim();

    if (
      candidate.startsWith("javascript:") ||
      candidate.startsWith("#") ||
      candidate.startsWith("blob:")
    ) {
      return null;
    }

    return new URL(candidate, pageUrl).href;
  } catch {
    return null;
  }
}

function isProbablyInvalidUrl(url) {
  return (
    url.startsWith("javascript:") ||
    url.startsWith("data:text") ||
    url.startsWith("about:")
  );
}

function looksLikeVideoExtension(url) {
  try {
    return VIDEO_EXTENSIONS.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function extractMetaContent(html, key) {
  const escapedKey = key.replace(/:/g, "\\:");

  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedKey}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedKey}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1].trim());
  }

  return null;
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractLinkHref(html, rel) {
  const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(`<link[^>]+rel=["']${escapedRel}["'][^>]+href=["']([^"']+)["']`, "i"),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${escapedRel}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1].trim());
  }

  return null;
}

function extractAllJsonLdThumbnails(html) {
  const results = [];

  const blocks = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  ];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      walkJsonForImages(parsed, results);
    } catch {
      // invalid JSON-LD, skip
    }
  }

  return results;
}

function walkJsonForImages(value, results) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) walkJsonForImages(item, results);
    return;
  }

  if (typeof value !== "object") return;

  const possibleFields = ["thumbnailUrl", "thumbnail", "image", "contentUrl"];

  for (const field of possibleFields) {
    const valueForField = value[field];

    if (typeof valueForField === "string") {
      results.push(valueForField);
    } else if (Array.isArray(valueForField)) {
      for (const item of valueForField) {
        if (typeof item === "string") results.push(item);
        else if (item && typeof item === "object" && typeof item.url === "string") results.push(item.url);
      }
    } else if (valueForField && typeof valueForField === "object" && typeof valueForField.url === "string") {
      results.push(valueForField.url);
    }
  }

  for (const key of Object.keys(value)) {
    walkJsonForImages(value[key], results);
  }
}

function extractAllVideoPosters(html) {
  const results = [];
  const regex = /<video[^>]+poster=["']([^"']+)["']/gi;

  for (const match of html.matchAll(regex)) {
    results.push(decodeHtmlEntities(match[1].trim()));
  }

  return results;
}

function extractImageSources(html) {
  const results = [];
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];

  for (const match of imgTags) {
    const tag = match[0];
    const attributes = ["src", "data-src", "data-original", "data-lazy-src", "data-image"];

    for (const attribute of attributes) {
      const value = extractAttribute(tag, attribute);
      if (value) results.push(decodeHtmlEntities(value.trim()));
    }

    const srcset = extractAttribute(tag, "srcset");

    if (srcset) {
      const entries = srcset.split(",").map(x => x.trim()).filter(Boolean);

      for (const entry of entries) {
        const url = entry.split(/\s+/)[0];
        if (url) results.push(decodeHtmlEntities(url));
      }
    }
  }

  return results;
}

function extractAttribute(tag, attribute) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}=["']([^"']+)["']`, "i");
  const match = tag.match(pattern);
  return match ? match[1] : null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/");
}

module.exports = { scrapeMetadata };