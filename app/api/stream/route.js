import { eventListeners } from '../../../lib/globals.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stream
 * Server-Sent Events stream for real-time updates
 */
export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Create listener function
      const listener = (message) => {
        controller.enqueue(encoder.encode(message));
      };

      // Add to listeners set
      eventListeners.add(listener);

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Cleanup on close
      return () => {
        eventListeners.delete(listener);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

