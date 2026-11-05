
import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VIDEO_DIRECTORY = path.join(
  process.env.HOME,
  "Videos",
  "apex-steward"
);

const HOST = "127.0.0.1";
const PORT = 4001;
const ALLOWED_ORIGIN = "http://localhost:3000";

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
};

const server = http.createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Range, Accept-Ranges, Content-Length"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  let filename;

  try {
    const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);
    filename = decodeURIComponent(requestUrl.pathname.slice(1));
  } catch {
    res.writeHead(400);
    res.end("Invalid request");
    return;
  }

  if (
    !filename ||
    filename !== path.basename(filename) ||
    filename.includes("\\") ||
    filename.startsWith(".")
  ) {
    res.writeHead(400);
    res.end("Invalid filename");
    return;
  }

  const extension = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[extension];

  if (!contentType) {
    res.writeHead(415);
    res.end("Unsupported video format");
    return;
  }

  const filePath = path.join(VIDEO_DIRECTORY, filename);

  let fileStats;

  try {
    fileStats = statSync(filePath);
  } catch {
    res.writeHead(404);
    res.end("Video not found");
    return;
  }

  if (!fileStats.isFile()) {
    res.writeHead(404);
    res.end("Video not found");
    return;
  }

  const fileSize = fileStats.size;
  const range = req.headers.range;

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
    });

    if (req.method === "HEAD") {
      res.end();
    } else {
      createReadStream(filePath).pipe(res);
    }

    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);

  if (!match) {
    res.writeHead(416, {
      "Content-Range": `bytes */${fileSize}`,
    });
    res.end();
    return;
  }

  let start;
  let end;

  if (match[1] === "") {
    const suffixLength = Number(match[2]);

    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      res.writeHead(416, {
        "Content-Range": `bytes */${fileSize}`,
      });
      res.end();
      return;
    }

    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? fileSize - 1 : Number(match[2]);
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= fileSize ||
    end < start
  ) {
    res.writeHead(416, {
      "Content-Range": `bytes */${fileSize}`,
    });
    res.end();
    return;
  }

  end = Math.min(end, fileSize - 1);

  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Content-Length": chunkSize,
  });

  if (req.method === "HEAD") {
    res.end();
  } else {
    createReadStream(filePath, { start, end }).pipe(res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`APEX STEWARD video server running at http://${HOST}:${PORT}`);
  console.log(`Video folder: ${VIDEO_DIRECTORY}`);
});
