export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    ready: true,
    timestamp: Date.now(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
