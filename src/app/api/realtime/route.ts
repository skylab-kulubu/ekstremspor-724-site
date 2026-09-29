import { type NextRequest } from "next/server";
import { REALTIME_CHANNELS, subscribe } from "@/lib/realtime/listener";

// One SSE connection per browser tab, multiplexing every change channel.
// Each NOTIFY is emitted as `event: <channel>\ndata: <payload>`.
//
// We use Node runtime because @vercel/edge can't load pg; force-dynamic
// stops Next from trying to cache the stream.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(`: connected ${Date.now()}\n\n`);

      const unsubs = await Promise.all(
        REALTIME_CHANNELS.map((ch) =>
          subscribe(ch, (payload) => {
            safeEnqueue(`event: ${ch}\ndata: ${payload}\n\n`);
          }),
        ),
      );

      const ping = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 25_000);

      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        for (const u of unsubs) u();
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      req.signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
