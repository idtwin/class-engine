import { Redis } from "@upstash/redis";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;
      const encoder = new TextEncoder();

      req.signal.addEventListener('abort', () => {
        isActive = false;
        try { controller.close(); } catch (e) {}
      });

      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL || "",
          token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
        });

        // Edge Runtime compliant async-blocking loop
        while (isActive) {
          try {
            const room = await redis.get(`room:${code}`);
            if (room) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(room)}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: {"status": "ended", "error": "Room Destroyed or Expired"}\n\n`));
            }
          } catch (pollError) {
             console.error("Redis SSR Polling Internal Block:", pollError);
          }
          await new Promise(r => setTimeout(r, 1000));
        }

      } catch (e: any) {
        if (isActive) {
          controller.enqueue(encoder.encode(`data: {"error": "${e.message}"}\n\n`));
          try { controller.close(); } catch(err) {}
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
