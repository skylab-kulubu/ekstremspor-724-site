import { NextResponse, type NextRequest } from "next/server";
import { readEvidence } from "@/lib/storage/files";
import { getCurrentUser } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { path } = await params;
  const rel = path.join("/");

  // Users can view their own evidence; admins can view anyone's.
  if (user.role !== "admin") {
    // Ensure the evidence row belongs to this user.
    const owns = await one(
      "select 1 from activities where user_id = $1 and evidence_url = $2 limit 1",
      [user.id, rel],
    );
    if (!owns) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const file = await readEvidence(rel);
  if (!file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=60",
    },
  });
}
