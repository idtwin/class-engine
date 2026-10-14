import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) return new Response("Missing code parameter", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;
      const encoder = new TextEncoder();
      const supabase = createAdminClient();

      req.signal.addEventListener('abort', () => {
        isActive = false;
        try { controller.close(); } catch (e) {}
      });

      while (isActive) {
        try {
          const { data } = await supabase.from('live_rooms').select('state').eq('code', code).single();
          if (data) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data.state)}\n\n`));
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
