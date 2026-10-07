/**
 * Netlify Functions (v2) uchun ko'prik: Web Request -> Express ilovasi -> Web Response.
 * Express'ni serverless muhitda ishlatish uchun serverless-http'dan foydalanamiz.
 */
'use strict';

process.env.PROTEACH_RUNTIME = 'netlify';

const serverless = require('serverless-http');
const { createApp } = require('../app');

let handler = null;

function getHandler() {
  // Ilova bir marta yaratiladi va funksiya "issiq" turgan paytda qayta ishlatiladi
  if (!handler) handler = serverless(createApp(), { binary: true });
  return handler;
}

/**
 * @param {Request} request
 * @param {{ ip?: string }} context  Netlify kontekst obyekti
 * @returns {Promise<Response>}
 */
async function handle(request, context = {}) {
  const url = new URL(request.url);
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);

  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const ip = context.ip || headers['x-nf-client-connection-ip'] || '';
  headers['x-forwarded-for'] = ip;
  headers['x-forwarded-proto'] = url.protocol.replace(':', '');
  headers.host = url.host;

  const event = {
    version: '2.0',
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ''),
    headers,
    body,
    isBase64Encoded: false,
    requestContext: { http: { method: request.method, sourceIp: ip }, requestId: headers['x-nf-request-id'] || '' },
  };

  const result = await getHandler()(event, {});

  const out = new Headers();
  for (const [key, value] of Object.entries(result.headers || {})) {
    if (value !== '' && value != null) out.set(key, String(value));
  }
  for (const cookie of result.cookies || []) out.append('set-cookie', cookie);

  const status = result.statusCode || 200;
  const noBody = request.method === 'HEAD' || status === 204 || status === 304;
  const payload = !noBody && result.body ? Buffer.from(result.body, result.isBase64Encoded ? 'base64' : 'utf8') : null;
  return new Response(payload, { status, headers: out });
}

module.exports = { handle };
