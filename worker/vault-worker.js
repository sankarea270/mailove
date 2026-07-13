// vault-worker.js — Cloudflare Worker: candado por contraseña + almacenamiento R2 privado.
//
// Este Worker va delante de tu bucket R2 y solo deja pasar a quien conoce la
// contraseña. La contraseña NO vive en el código del navegador: es un secreto
// del Worker.
//
// Necesita (se configuran en el panel de Cloudflare — ver worker/README.md):
//   • R2 bucket binding llamado   VIDEOS          → tu bucket de R2
//   • Secret                      VAULT_PASSWORD  → la contraseña que ella escribe
//   • Secret                      AUTH_SECRET     → una cadena larga aleatoria (firma los tokens)
//   • Variable (texto)            ALLOWED_ORIGIN  → https://sankarea270.github.io  (opcional)

const enc = new TextEncoder();

function corsHeaders(env) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeToken(env) {
  const exp = Date.now() + 7 * 24 * 3600 * 1000; // válido 7 días
  const payload = String(exp);
  return payload + '.' + await hmac(env.AUTH_SECRET, payload);
}

async function verifyToken(env, token) {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (Number(payload) < Date.now()) return false;
  return sig === await hmac(env.AUTH_SECRET, payload);
}

function getToken(req, url) {
  const auth = req.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return url.searchParams.get('token') || '';
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(env);

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      // ── LOGIN: contraseña → token ────────────────────────────────────────
      if (url.pathname === '/login' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        if (!body.password || body.password !== env.VAULT_PASSWORD) {
          return json({ error: 'invalid' }, 401, cors);
        }
        return json({ token: await makeToken(env) }, 200, cors);
      }

      // Todo lo demás exige token válido
      if (!(await verifyToken(env, getToken(req, url)))) {
        return json({ error: 'unauthorized' }, 401, cors);
      }

      // ── LIST: lista de videos ────────────────────────────────────────────
      if (url.pathname === '/list' && req.method === 'GET') {
        const listed = await env.VIDEOS.list();
        const items = listed.objects
          .map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }))
          .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
        return json({ items }, 200, cors);
      }

      // ── MEDIA: reproduce el video (con soporte de Range para adelantar) ──
      if (url.pathname === '/media' && req.method === 'GET') {
        const key = url.searchParams.get('key');
        if (!key) return json({ error: 'no key' }, 400, cors);

        const range = req.headers.get('Range');
        const headers = new Headers(cors);
        headers.set('Accept-Ranges', 'bytes');

        if (range) {
          const m = /bytes=(\d+)-(\d*)/.exec(range);
          const offset = m ? Number(m[1]) : 0;
          const end = m && m[2] ? Number(m[2]) : undefined;
          const rangeOpt = { offset };
          if (end !== undefined) rangeOpt.length = end - offset + 1;

          const obj = await env.VIDEOS.get(key, { range: rangeOpt });
          if (!obj) return json({ error: 'not found' }, 404, cors);

          const total = obj.size;
          const realEnd = end !== undefined ? end : total - 1;
          obj.writeHttpMetadata(headers);
          headers.set('Content-Range', `bytes ${offset}-${realEnd}/${total}`);
          headers.set('Content-Length', String(realEnd - offset + 1));
          return new Response(obj.body, { status: 206, headers });
        }

        const obj = await env.VIDEOS.get(key);
        if (!obj) return json({ error: 'not found' }, 404, cors);
        obj.writeHttpMetadata(headers);
        headers.set('Content-Length', String(obj.size));
        return new Response(obj.body, { status: 200, headers });
      }

      // ── UPLOAD: sube un clip (por el navegador; límite ~100 MB) ──────────
      if (url.pathname === '/upload' && req.method === 'POST') {
        const name = url.searchParams.get('name') || ('video-' + Date.now());
        const safe = name.replace(/[^\w.\-]/g, '_');
        const key = Date.now() + '-' + safe;
        await env.VIDEOS.put(key, req.body, {
          httpMetadata: { contentType: req.headers.get('Content-Type') || 'video/mp4' },
        });
        return json({ ok: true, key }, 200, cors);
      }

      // ── DELETE: borra un video ───────────────────────────────────────────
      if (url.pathname === '/media' && req.method === 'DELETE') {
        const key = url.searchParams.get('key');
        if (!key) return json({ error: 'no key' }, 400, cors);
        await env.VIDEOS.delete(key);
        return json({ ok: true }, 200, cors);
      }

      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500, cors);
    }
  },
};
