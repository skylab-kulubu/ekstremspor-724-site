import { NextResponse, type NextRequest } from "next/server";
import { submitRemoteActivity } from "@/lib/actions/activities";

// Multipart upload endpoint for the remote-activity form.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const result = await submitRemoteActivity(form);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
