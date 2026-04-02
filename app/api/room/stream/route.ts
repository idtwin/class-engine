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
      let intervalId: NodeJS.Timeout;
      
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL || "",
          token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
        });

        // Loop execution 1s tick
        intervalId = setInterval(async () => {
          try {
            const room = await redis.get(`room:${code}`);
            if (room) {
              controller.enqueue(`data: ${JSON.stringify(room)}\n\n`);
            } else {
              controller.enqueue(`data: {"status": "ended", "error": "Room Destroyed or Expired"}\n\n`);
            }
          } catch (pollError) {
             console.error("Redis SSR Polling Internal Block:", pollError);
             // Ignore transient block
          }
        }, 1000);

      } catch (e: any) {
        controller.enqueue(`data: {"error": "${e.message}"}\n\n`);
        controller.close();
        return;
      }

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
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
