import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, canManage } from '../lib/auth/redirect.ts';
test('OAuth redirects accept only known local destinations', () => {
  for (const path of ['/account','/admin','/admin/events/abc/appearance','/e/discoveries-2026/claim','/scan/main-entrance']) assert.equal(safeNext(path),path);
  for (const path of [null,[],{},'https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/admin/../auth/callback','/account?next=https://evil.test','/login','/auth/callback','/account\n']) assert.equal(safeNext(path),'/account');
});
test('Only trusted organizer roles manage the dashboard', () => {
  for (const role of ['owner','admin']) assert.equal(canManage(role),true);
  for (const role of ['staff','visitor','ADMIN','', 'administrator']) assert.equal(canManage(role),false);
});
