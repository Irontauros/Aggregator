const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 10;
const REQUEST_TIMEOUT = 30000;

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

function slugify(name) {
  const slug = name
    .toString()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug || "video-" + Date.now();
}

function getExtensionFromContentType(contentType) {
  if (!contentType) return ".jpg";

  const type = contentType.split(";")[0].trim().toLowerCase();

  if (type === "image/jpeg") return ".jpg";
  if (type === "image/jpg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "image/avif") return ".avif";
  if (type === "image/svg+xml") return ".svg";
  if (type === "image/bmp") return ".bmp";
  if (type === "image/tiff") return ".tiff";

  return ".jpg";
}

function validateUrl(url) {
  if (!url) throw new Error("Thumbnail URL is missing.");

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Thumbnail URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Thumbnail URL must use HTTP or HTTPS.");
  }

  const pathname = parsed.pathname.toLowerCase();

  if (/\.(mp4|webm|mov|m4v)$/.test(pathname)) {
    throw new Error("Thumbnail URL is a video (MP4/WebM/MOV). Only image URLs are allowed.");
  }
}

function buildHeaders(referer) {
  const headers = {
    "User-Agent": BROWSER_UA,
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
  };

  if (referer) headers.Referer = referer;

  return headers;
}

async function downloadImage(url, folder, name, pageUrl = null) {
  if (!url) throw new Error("Thumbnail URL is missing.");

  ensureFolder(folder);

  const safeName = slugify(name);

  if (url.startsWith("data:image")) {
    return saveBase64Image(url, folder, safeName);
  }

  validateUrl(url);

  const result = await requestImage(url, pageUrl, 0);
  const contentType = result.contentType;

  if (!contentType || !contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Invalid thumbnail: URL returned "${contentType || "unknown content type"}" instead of an image.`);
  }

  const ext = getExtensionFromContentType(contentType);
  const filename = `${safeName}${ext}`;
  const localPath = path.join(folder, filename);

  if (fs.existsSync(localPath)) {
    return buildPublicPath(folder, filename);
  }

  try {
    fs.writeFileSync(localPath, result.buffer);
  } catch (err) {
    throw new Error(`File write error: ${err.message}`);
  }

  return buildPublicPath(folder, filename);
}

function requestImage(url, pageUrl, redirectCount) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error("Too many thumbnail redirects."));
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error("Invalid thumbnail URL."));
    }

    const client = parsed.protocol === "https:" ? https : http;

    const request = client.get(
      url,
      { headers: buildHeaders(pageUrl), timeout: REQUEST_TIMEOUT },
      res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectedUrl = new URL(res.headers.location, url).href;

          try {
            validateUrl(redirectedUrl);
          } catch (err) {
            res.resume();
            return reject(err);
          }

          res.resume();

          return requestImage(redirectedUrl, pageUrl, redirectCount + 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Thumbnail download failed (HTTP ${res.statusCode})`));
        }

        const contentType = (res.headers["content-type"] || "").toLowerCase();

        if (!contentType.startsWith("image/")) {
          res.resume();
          return reject(new Error(`Invalid thumbnail: URL returned "${contentType || "unknown"}" instead of an image.`));
        }

        const chunks = [];
        let totalSize = 0;
        const MAX_IMAGE_SIZE = 25 * 1024 * 1024;

        res.on("data", chunk => {
          totalSize += chunk.length;

          if (totalSize > MAX_IMAGE_SIZE) {
            request.destroy();
            return;
          }

          chunks.push(chunk);
        });

        res.on("end", () => {
          if (totalSize > MAX_IMAGE_SIZE) {
            return reject(new Error("Thumbnail is larger than 25 MB."));
          }

          const buffer = Buffer.concat(chunks);

          if (buffer.length === 0) {
            return reject(new Error("Thumbnail response was empty."));
          }

          if (!looksLikeImageBuffer(buffer, contentType)) {
            return reject(new Error("Downloaded data does not appear to be a valid image."));
          }

          resolve({ buffer, contentType });
        });

        res.on("error", err => {
          reject(new Error(`Thumbnail response error: ${err.message}`));
        });
      }
    );

    request.on("error", err => {
      reject(new Error(`Request error: ${err.message}`));
    });

    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy();
      reject(new Error("Thumbnail download timed out."));
    });
  });
}

function looksLikeImageBuffer(buffer, contentType) {
  if (!buffer || buffer.length < 4) return false;

  const type = contentType.split(";")[0].trim().toLowerCase();

  if (type === "image/jpeg" || type === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (type === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  if (type === "image/gif") {
    const signature = buffer.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }

  if (type === "image/webp") {
    if (buffer.length < 12) return false;
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }

  if (type === "image/svg+xml") {
    const beginning = buffer.subarray(0, Math.min(buffer.length, 500)).toString("utf8").trim().toLowerCase();
    return beginning.includes("<svg") || beginning.includes("<?xml");
  }

  return true;
}

function saveBase64Image(url, folder, safeName) {
  try {
    const matches = url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);

    if (!matches) throw new Error("Invalid base64 image format.");

    const mimeType = matches[1];
    const base64Data = matches[2];
    const ext = getExtensionFromContentType(mimeType);
    const filename = `${safeName}${ext}`;
    const localPath = path.join(folder, filename);

    if (fs.existsSync(localPath)) {
      return buildPublicPath(folder, filename);
    }

    const buffer = Buffer.from(base64Data, "base64");

    if (!buffer.length) throw new Error("Base64 image is empty.");

    fs.writeFileSync(localPath, buffer);

    return buildPublicPath(folder, filename);
  } catch (err) {
    throw new Error(`Base64 image error: ${err.message}`);
  }
}

function buildPublicPath(folder, filename) {
  return `/images/${path.basename(folder)}/${filename}`;
}

module.exports = { downloadImage, slugify, ensureFolder };