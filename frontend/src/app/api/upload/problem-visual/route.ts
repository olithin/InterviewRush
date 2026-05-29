import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const MAX_BYTES = 2_500_000;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

function extFor(file: File, fallbackName: string): string {
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg" || file.type === "image/jpg") return ".jpg";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  if (file.type === "image/svg+xml") return ".svg";
  const m = fallbackName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  if (m && /^\.(png|jpe?g|gif|webp|svg)$/.test(m[1])) {
    return m[1] === ".jpeg" ? ".jpg" : m[1];
  }
  return ".bin";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const problemId = String(form.get("problemId") ?? "").trim() || "0";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A non-empty file is required" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WebP, GIF, or SVG images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 2.5 MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFor(file, file.name);
  const safe = `problem-${problemId}-${Date.now()}${ext}`;

  const publicDir = path.join(process.cwd(), "public", "images", "problems", "uploads");
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, safe), buf);

  const publicPath = `/images/problems/uploads/${safe}`;
  return NextResponse.json({ publicPath });
}
