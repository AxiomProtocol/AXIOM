import { requireInternalKeyApp } from '@/lib/middleware/internalKeyAuth';

export async function POST(request) {
  try {
    // Internal Auth Check
    await requireInternalKeyApp(request);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: error.status });
    }
    return new Response('Service Unavailable', { status: 503 });
  }

  // Existing business logic remains unchanged
  // ... your existing code 
}