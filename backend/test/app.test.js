import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

const server = http.createServer(app);
let port;

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('serves the unversioned health endpoint', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});

test('serves the versioned API health endpoint', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});
