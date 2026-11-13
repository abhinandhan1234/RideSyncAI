import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

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

test('GET /api/admin/analytics returns 200 and schema with totalRides and activeDrivers', async () => {
  await withServer(async (port) => {
    const { statusCode, body } = await get(port, '/api/admin/analytics');
    assert.equal(statusCode, 200);
    assert.equal(body.period, 'today');
    assert.ok(body.summary, 'body should have summary');
    assert.equal(typeof body.summary.totalRides, 'number');
    assert.equal(typeof body.summary.activeDrivers, 'number');
    assert.equal(typeof body.summary.completedRides, 'number');
    assert.equal(typeof body.summary.cancelledRides, 'number');
    assert.ok(Array.isArray(body.drivers), 'drivers should be an array');
    assert.ok(Array.isArray(body.recentRides), 'recentRides should be an array');
  });
});
