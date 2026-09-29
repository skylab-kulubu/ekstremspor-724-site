import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink, readFile, stat } from "node:fs/promises";
import path from "node:path";

function uploadsRoot(): string {
  const root = process.env.UPLOADS_DIR ?? "./uploads";
  return path.resolve(root);
}

export type StoredFile = {
  relativePath: string;
  absolutePath: string;
};

export async function saveEvidence(
  userId: string,
  file: File,
): Promise<StoredFile> {
  const root = uploadsRoot();
  const userDir = path.join(root, userId);
  await mkdir(userDir, { recursive: true });

  const ext = guessExtension(file.type, file.name);
  const stamp = Date.now();
  const rand = randomBytes(4).toString("hex");
  const filename = `${stamp}-${rand}${ext}`;
  const abs = path.join(userDir, filename);
  const rel = path.posix.join(userId, filename);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buf);

  return { relativePath: rel, absolutePath: abs };
}

export async function removeEvidence(relativePath: string): Promise<void> {
  const abs = resolveSafe(relativePath);
  if (!abs) return;
  await unlink(abs).catch(() => {});
}

export async function readEvidence(
  relativePath: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const abs = resolveSafe(relativePath);
  if (!abs) return null;
  try {
    await stat(abs);
  } catch {
    return null;
  }
  const bytes = await readFile(abs);
  return { bytes, contentType: contentTypeFromPath(abs) };
}

// Reject any path that escapes the uploads root via traversal.
function resolveSafe(relativePath: string): string | null {
  const root = uploadsRoot();
  const cleaned = path.posix.normalize(relativePath).replace(/^\/+/, "");
  const abs = path.resolve(root, cleaned);
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

function guessExtension(mime: string, originalName: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/heic" || mime === "image/heif") return ".heic";
  const guess = path.extname(originalName).toLowerCase();
  if (/^\.(jpg|jpeg|png|webp|heic|heif)$/.test(guess)) return guess;
  return ".bin";
}

function contentTypeFromPath(abs: string): string {
  const ext = path.extname(abs).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".heic" || ext === ".heif") return "image/heic";
  return "application/octet-stream";
}
