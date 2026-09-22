const ZALO_PROFILE_URL = 'https://graph.zalo.me/v2.0/me?fields=id,name,picture';
const ZALO_PROFILE_RELAY_PATH = '/zalo/profile';
const ZALO_PROFILE_RELAY_SECRET_HEADER = 'x-zalo-profile-relay-secret';
const REQUEST_TIMEOUT_MS = 10000;

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, x-zalo-profile-relay-secret, access_token',
      ...headers,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'Content-Type, x-zalo-profile-relay-secret, access_token',
          'access-control-max-age': '86400',
        },
      });
    }

    if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
      return jsonResponse({
        status: 'ok',
        service: 'eco-oil-zalo-profile-relay',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname !== ZALO_PROFILE_RELAY_PATH) {
      return jsonResponse({ error: 'NOT_FOUND' }, 404);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    const expectedSecret = env?.ZALO_PROFILE_RELAY_SECRET || 'eco_oil_zalo_profile_relay_secret_2026_vn';
    const suppliedSecret = request.headers.get(ZALO_PROFILE_RELAY_SECRET_HEADER);

    if (!suppliedSecret) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    if (suppliedSecret !== expectedSecret) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403);
    }

    let accessToken;
    try {
      const body = await request.json();
      if (typeof body?.access_token === 'string') {
        accessToken = body.access_token.trim();
      }
    } catch {
      return jsonResponse({ error: 'INVALID_INPUT' }, 400);
    }

    if (!accessToken) {
      return jsonResponse({ error: 'INVALID_INPUT', message: 'access_token is required' }, 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const upstream = await fetch(ZALO_PROFILE_URL, {
        method: 'GET',
        headers: { access_token: accessToken },
        signal: controller.signal,
      });

      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return jsonResponse({ error: 'UPSTREAM_INVALID_RESPONSE' }, 502);
      }

      const upstreamBody = await upstream.json();
      return jsonResponse(upstreamBody, upstream.ok ? 200 : upstream.status);
    } catch (err) {
      return jsonResponse(
        {
          error: 'UPSTREAM_UNAVAILABLE',
          details: err instanceof Error ? err.message : String(err),
        },
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};

