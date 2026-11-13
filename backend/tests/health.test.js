import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

/**
 * Helper: start the app on a random port, run callback(port), then close.
 */
function withServer(fn) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', async () => {
      const { port } = server.address();
      try {
        await fn(port);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

/**
 * Helper: make a GET request and return { statusCode, body }.
 */
function get(port, path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let body;
        try { body = JSON.parse(raw); } catch { body = raw; }
        resolve({ statusCode: res.statusCode, body });
      });
    }).on('error', reject);
  });
}

test('GET /api/health returns 200', async () => {
  await withServer(async (port) => {
    const { statusCode } = await get(port, '/api/health');
    assert.equal(statusCode, 200);
  });
});

test('GET /api/health response body has status: "ok"', async () => {
  await withServer(async (port) => {
    const { body } = await get(port, '/api/health');
    assert.equal(body.status, 'ok');
  });
});

test('GET /unknown-route returns 404', async () => {
  await withServer(async (port) => {
    const { statusCode } = await get(port, '/unknown-route');
    assert.equal(statusCode, 404);
  });
});
